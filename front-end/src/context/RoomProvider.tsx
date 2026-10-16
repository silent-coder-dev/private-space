import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLoader } from "@/components/layout/PageLoader";
import { fireHearts } from "@/lib/burst";
import { GAME_NAMES } from "@/lib/content";
import { DEFAULT_ME, DEFAULT_PARTNER } from "@/lib/seed";
import { clearStore, setStorageScope } from "@/lib/storage";
import type { ChatMessage, GameSession, MemberDoc } from "@/lib/types";
import { relayUrl, SyncClient, type ConnectionStatus, type Presence, type RoomErrorCode, type Signal } from "@/sync/client";
import { deriveKeys, formatCode, generateCode, isValidCode, randomId } from "@/sync/crypto";
import { docKey, openPersistence, SyncEngine, type Put } from "@/sync/engine";
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

async function openEngine(session: RoomSession): Promise<SyncEngine> {
  setStorageScope(session.roomId);
  const { persist, data } = await openPersistence(session.roomId);
  return new SyncEngine(session.device, Date.now, persist, data);
}

/** Delete everything this device knows about the room, then go back to the start. */
async function wipeDevice(engine: SyncEngine | null) {
  await engine?.wipe();
  clearStore();
  clearSession();
  setStorageScope(null);
}

export function RoomProvider({ children, autoConnect = true }: { children: ReactNode; autoConnect?: boolean }) {
  const [saved] = useState(loadSession);
  const [live, setLive] = useState<Live | null>(null);
  const [hydrated, setHydrated] = useState(!saved);
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [presence, setPresence] = useState<Presence>(() => ({ members: saved?.partnerJoined ? 2 : 1, partnerOnline: false, partnerSeen: null }));
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [problem, setProblem] = useState<RoomContextValue["problem"]>(null);
  const clientRef = useRef<SyncClient | null>(null);
  const liveRef = useRef<Live | null>(null);
  liveRef.current = live;
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const signalListeners = useRef(new Set<(s: Signal) => void>());
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // Load the saved room (from IndexedDB) before any private page renders.
  useEffect(() => {
    if (!saved) return;
    let cancelled = false;
    openEngine(saved).then((engine) => {
      if (cancelled) return;
      setLive({ session: saved, engine });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  const partnerName = (engine: SyncEngine) => engine.get<MemberDoc>(docKey("member", "partner"), DEFAULT_PARTNER).name;

  const onClosed = useCallback(async () => {
    clientRef.current?.stop();
    clientRef.current = null;
    await wipeDevice(liveRef.current?.engine ?? null);
    toast("🔒 The room was closed. Everything was deleted.");
    window.location.assign("/");
  }, []);

  /** Gentle notifications when your partner does something (only once live, not while catching up). */
  const notify = useCallback(
    (engine: SyncEngine, put: Put, created: boolean) => {
      if (put.data === null || !clientRef.current?.live) return;
      const name = partnerName(engine);
      const where = pathRef.current;
      if (put.col === "messages" && created && where !== "/chat") {
        const m = put.data as ChatMessage;
        toast(`💬 ${name}`, {
          description: m.text ? m.text.slice(0, 80) : m.video ? "🎥 Sent a video" : "📷 Sent a photo",
          action: { label: "Reply", onClick: () => navigate("/chat") },
        });
      } else if (put.col === "photos" && created && where !== "/gallery") {
        toast(`🖼️ ${name} added a photo to your gallery`, { action: { label: "See", onClick: () => navigate("/gallery") } });
      } else if (put.col === "game") {
        const g = put.data as GameSession;
        if (g.status === "invited" && g.by === "partner") {
          toast(`🎮 ${name} invites you to play ${GAME_NAMES[g.game] ?? "a game"}`, {
            duration: 15_000,
            action: { label: "Join game", onClick: () => navigate(`/games?join=1`) },
          });
        } else if (g.status === "playing" && g.by === "me" && where !== "/games") {
          toast(`🎮 ${name} joined your game!`, { action: { label: "Play", onClick: () => navigate("/games") } });
        }
      } else if (put.col === "gview" && where !== "/gallery") {
        toast(`👀 ${name} wants to show you a photo`, { action: { label: "Look", onClick: () => navigate("/gallery?look=1") } });
      }
    },
    [navigate],
  );

  const handleSignal = useCallback((engine: SyncEngine, signal: Signal) => {
    const name = partnerName(engine);
    if (signal.type === "typing") {
      setPartnerTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPartnerTyping(false), 4000);
    } else if (signal.type === "heart") {
      fireHearts({ count: 30 });
      toast(`💖 ${name} is missing you`, { description: "Send one back?" });
    } else if (signal.type === "nudge") {
      fireHearts({ count: 18, emojis: ["💭", "💗", "✨"] });
      toast(`💭 ${name} is thinking of you`);
    }
    signalListeners.current.forEach((listener) => listener(signal));
  }, []);

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
          signal: (s) => handleSignal(engine, s),
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
          closed: () => void onClosed(),
        },
        mode,
        allowRecreate,
      );
      engine.onRemote = (put, created) => notify(engine, put, created);
      clientRef.current = client;
      client.start();
      return client;
    },
    [notify, handleSignal, onClosed],
  );

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

  // Reconnect to a saved room. It keeps retrying in the background; everything still works offline.
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
      const engine = await openEngine(session);
      try {
        await connectOnce(session, engine, mode);
      } catch (err) {
        clientRef.current?.stop();
        clientRef.current = null;
        await wipeDevice(engine);
        throw err;
      }
      saveSession(session);
      afterConnect(engine);
      setLive({ session, engine });
    },
    [connectOnce],
  );

  const newSession = (code: string, role: RoomSession["role"]): RoomSession => ({
    v: 1,
    code,
    roomId: deriveKeys(code).roomId,
    device: randomId(),
    role,
    createdAt: Date.now(),
    lastSeq: 0,
    partnerJoined: role === "joiner",
  });

  const createRoom = useCallback(
    (name: string, since: string) =>
      begin(newSession(generateCode(), "creator"), "create", (engine) => {
        engine.put("member", "me", { ...DEFAULT_ME, name });
        engine.put("couple", "doc", { since });
      }),
    [begin],
  );

  const joinRoom = useCallback(
    async (input: string, name: string) => {
      if (!isValidCode(input)) throw new RoomError("denied");
      return begin(newSession(formatCode(input), "joiner"), "join", (engine) => {
        const mine = engine.get<MemberDoc>(docKey("member", "me"), DEFAULT_ME);
        engine.put("member", "me", { ...mine, name });
      });
    },
    [begin],
  );

  const leaveRoom = useCallback(async () => {
    clientRef.current?.leave();
    clientRef.current = null;
    await wipeDevice(liveRef.current?.engine ?? null);
    window.location.assign("/");
  }, []);

  const closeRoom = useCallback(async () => {
    clientRef.current?.closeRoom();
    // If we're offline the server can't be told — still wipe here; the room stays closed for us.
    setTimeout(() => void onClosed(), 400);
  }, [onClosed]);

  const signal = useCallback((type: Signal["type"], data?: unknown) => clientRef.current?.sendSignal(type, data) ?? false, []);
  const onSignal = useCallback((listener: (s: Signal) => void) => {
    signalListeners.current.add(listener);
    return () => void signalListeners.current.delete(listener);
  }, []);

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
      leaveRoom: () => void leaveRoom(),
      closeRoom: () => void closeRoom(),
      signal,
      onSignal,
    }),
    [live, status, presence, partnerTyping, problem, createRoom, joinRoom, leaveRoom, closeRoom, signal, onSignal],
  );

  if (!hydrated) return <PageLoader />;
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
