import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fireHearts } from "@/lib/burst";
import { DEFAULT_ME, DEFAULT_PARTNER, starterContent } from "@/lib/seed";
import { clearStore, setStorageScope } from "@/lib/storage";
import type { ChatMessage, Letter, MemberDoc, Milestone, PlanEvent } from "@/lib/types";
import { relayUrl, SyncClient, type ConnectionStatus, type Presence, type RoomErrorCode, type Signal } from "@/sync/client";
import { deriveKeys, formatCode, generateCode, isValidCode, randomId } from "@/sync/crypto";
import { docKey, SyncEngine, type Put } from "@/sync/engine";
import { clearSession, loadSession, saveSession, type RoomSession } from "@/sync/session";
import { RoomContext, ROOM_ERRORS, type RoomContextValue } from "./room";

const CONNECT_TIMEOUT = 12_000;

class RoomError extends Error {
  constructor(readonly code: RoomErrorCode) {
    super(ROOM_ERRORS[code]);
  }
}

interface Live {
  session: RoomSession;
  engine: SyncEngine;
}

/** Loads the saved room (if any) before anything renders, so every page reads the right data. */
function restore(): Live | null {
  const session = loadSession();
  if (!session) return null;
  setStorageScope(session.roomId);
  return { session, engine: new SyncEngine(session.device) };
}

export function RoomProvider({ children, autoConnect = true }: { children: ReactNode; autoConnect?: boolean }) {
  const [live, setLive] = useState<Live | null>(restore);
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [presence, setPresence] = useState<Presence>(() => ({
    members: live?.session.partnerJoined ? 2 : 1,
    partnerOnline: false,
    partnerSeen: null,
  }));
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [problem, setProblem] = useState<RoomContextValue["problem"]>(null);
  const clientRef = useRef<SyncClient | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const partnerName = (engine: SyncEngine) => engine.get<MemberDoc>(docKey("member", "partner"), DEFAULT_PARTNER).name;

  /** Gentle notifications when your partner adds something (only once live, not while catching up). */
  const notify = useCallback(
    (engine: SyncEngine, put: Put, created: boolean) => {
      if (!created || put.data === null || !clientRef.current?.live) return;
      const name = partnerName(engine);
      const where = pathRef.current;
      if (put.col === "messages" && where !== "/chat") {
        const m = put.data as ChatMessage;
        toast(`💬 ${name}`, {
          description: m.text ? m.text.slice(0, 80) : "📷 Sent a photo",
          action: { label: "Reply", onClick: () => navigate("/chat") },
        });
      } else if (put.col === "letters" && where !== "/letters") {
        toast(`💌 ${name} wrote you a letter`, {
          description: (put.data as Letter).title,
          action: { label: "See", onClick: () => navigate("/letters") },
        });
      } else if (put.col === "events" && where !== "/planner") {
        const e = put.data as PlanEvent;
        toast(`📅 ${name} added a plan`, { description: `${e.emoji} ${e.title}`, action: { label: "See", onClick: () => navigate("/planner") } });
      } else if (put.col === "milestones" && where !== "/timeline") {
        const m = put.data as Milestone;
        toast(`🕰️ ${name} added a memory`, { description: `${m.emoji} ${m.title}` });
      }
    },
    [navigate],
  );

  const onSignal = useCallback((engine: SyncEngine, signal: Signal) => {
    const name = partnerName(engine);
    if (signal.type === "typing") {
      setPartnerTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPartnerTyping(false), 4000);
    } else if (signal.type === "heart") {
      fireHearts({ count: 26 });
      toast(`💖 ${name} sent you a heart`);
    } else if (signal.type === "nudge") {
      fireHearts({ count: 18, emojis: ["💭", "💗", "✨"] });
      toast(`💭 ${name} is thinking of you`);
    }
  }, []);

  /** Start the live connection for a room. `first` is told when it is ready or fails for the first time. */
  const startClient = useCallback(
    (
      session: RoomSession,
      engine: SyncEngine,
      mode: "create" | "join",
      allowRecreate: boolean,
      first?: { ready: () => void; fail: (code: RoomErrorCode) => void },
    ) => {
      let settled = !first;
      const client = new SyncClient(
        relayUrl(),
        deriveKeys(session.code),
        session,
        engine,
        {
          status: setStatus,
          presence: (p) => {
            setPresence(p);
            if (p.members >= 2 && !session.partnerJoined) {
              session.partnerJoined = true;
              saveSession(session);
              if (settled && session.role === "creator") {
                fireHearts({ count: 30 });
                toast.success("💞 Your partner just joined your room!");
              }
            }
          },
          signal: (s) => onSignal(engine, s),
          ready: () => {
            if (settled) return;
            settled = true;
            first?.ready();
          },
          fatal: (code) => {
            if (!settled) {
              settled = true;
              first?.fail(code);
              return;
            }
            setProblem({ code, message: ROOM_ERRORS[code] });
          },
        },
        mode,
        allowRecreate,
      );
      engine.onRemote = (put, created) => notify(engine, put, created);
      clientRef.current = client;
      client.start();
      return client;
    },
    [notify, onSignal],
  );

  /** For creating / joining: wait until connected, or fail with a friendly error. */
  const connectOnce = useCallback(
    (session: RoomSession, engine: SyncEngine, mode: "create" | "join") =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          client.stop();
          reject(new RoomError("timeout"));
        }, CONNECT_TIMEOUT);
        const client = startClient(session, engine, mode, false, {
          ready: () => {
            clearTimeout(timer);
            resolve();
          },
          fail: (code) => {
            clearTimeout(timer);
            reject(new RoomError(code));
          },
        });
      }),
    [startClient],
  );

  // Reconnect to a saved room when the app opens. It keeps retrying in the background,
  // and everything still works offline in the meantime.
  useEffect(() => {
    if (!autoConnect || !live || clientRef.current) return;
    startClient(live.session, live.engine, "join", true);
  }, [autoConnect, live, startClient]);

  useEffect(
    () => () => {
      clientRef.current?.stop();
      clearTimeout(typingTimer.current);
    },
    [],
  );

  const begin = useCallback(
    async (session: RoomSession, mode: "create" | "join", afterConnect: (engine: SyncEngine) => void) => {
      clientRef.current?.stop();
      clientRef.current = null;
      setProblem(null);
      setStorageScope(session.roomId);
      const engine = new SyncEngine(session.device);
      try {
        await connectOnce(session, engine, mode);
      } catch (err) {
        clientRef.current?.stop();
        clientRef.current = null;
        clearStore();
        setStorageScope(null);
        throw err;
      }
      saveSession(session);
      afterConnect(engine);
      setLive({ session, engine });
    },
    [connectOnce],
  );

  const createRoom = useCallback(
    (name: string, since: string) => {
      const code = generateCode();
      const session: RoomSession = {
        v: 1,
        code,
        roomId: deriveKeys(code).roomId,
        device: randomId(),
        role: "creator",
        createdAt: Date.now(),
        lastSeq: 0,
        partnerJoined: false,
      };
      return begin(session, "create", (engine) => {
        engine.put("member", "me", { ...DEFAULT_ME, name });
        engine.put("couple", "doc", { since });
        const starter = starterContent(since, () => randomId(8));
        for (const song of starter.songs) engine.put("songs", song.id, song);
        for (const m of starter.milestones) engine.put("milestones", m.id, m);
        for (const e of starter.events) engine.put("events", e.id, e);
      });
    },
    [begin],
  );

  const joinRoom = useCallback(
    async (input: string, name: string) => {
      if (!isValidCode(input)) throw new RoomError("denied");
      const code = formatCode(input);
      const session: RoomSession = {
        v: 1,
        code,
        roomId: deriveKeys(code).roomId,
        device: randomId(),
        role: "joiner",
        createdAt: Date.now(),
        lastSeq: 0,
        partnerJoined: true,
      };
      return begin(session, "join", (engine) => {
        const mine = engine.get<MemberDoc>(docKey("member", "me"), DEFAULT_ME);
        engine.put("member", "me", { ...mine, name });
      });
    },
    [begin],
  );

  const leaveRoom = useCallback(() => {
    clientRef.current?.leave();
    clientRef.current = null;
    live?.engine.flush();
    clearStore();
    clearSession();
    setStorageScope(null);
    window.location.assign("/");
  }, [live]);

  const signal = useCallback((type: Signal["type"]) => clientRef.current?.sendSignal(type), []);

  const value = useMemo<RoomContextValue>(
    () => ({
      session: live?.session ?? null,
      engine: live?.engine ?? null,
      status,
      presence,
      partnerTyping,
      problem,
      createRoom,
      joinRoom,
      leaveRoom,
      signal,
    }),
    [live, status, presence, partnerTyping, problem, createRoom, joinRoom, leaveRoom, signal],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
