import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { clearNotifications, notify } from "@/lib/notify";
import { randomId } from "@/sync/crypto";
import { CallContext, fallbackIceServers, IDLE_CALL, type CallApi, type CallKind, type CallState } from "./call";
import { CallOverlay } from "./CallOverlay";
import { RelayMedia } from "./relay-media";

/**
 * How a call works:
 * 1. Ringing, accepting and the connection set-up travel as encrypted room signals.
 * 2. Audio/video go straight from phone to phone (WebRTC), using STUN/TURN routes from the server.
 *    Routes are sent as soon as they're found ("trickle ICE"), and a dropped line is repaired (ICE restart).
 * 3. If no direct line works within a few seconds, the call switches to the UsSpace server
 *    (still end-to-end encrypted) — so calls work on every network, even without a TURN server.
 */
type CallMsg =
  | { k: "ring"; id: string; kind: CallKind }
  | { k: "accept" | "decline" | "end" | "busy" | "relay"; id: string }
  | { k: "offer" | "answer"; id: string; sdp: string; restart?: boolean }
  | { k: "ice"; id: string; c: RTCIceCandidateInit[] };

const RING_EVERY = 3000;
const RING_TIMEOUT = 45_000;
/** A direct line must work within this time, otherwise the call goes through the server. */
const CONNECT_TIMEOUT = 15_000;
/** A dropped direct line gets this long to come back before we repair it. */
const RECOVER_GRACE = 5000;

/**
 * For testing: localStorage["usspace:call-path"] = "relay" (always use the server) or
 * "no-direct" (direct routes are blocked, so the automatic switch to the server kicks in).
 */
const testPath = () => {
  try {
    return window.localStorage.getItem("usspace:call-path");
  } catch {
    return null;
  }
};
const forceRelay = () => testPath() === "relay";

const getMedia = (kind: CallKind, facing: "user" | "environment" = "user") =>
  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: kind === "video" ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  });

/** A soft ringing sound + vibration while a call is ringing. */
function startRinging(): () => void {
  let stopped = false;
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
  } catch {
    /* no audio */
  }
  const ring = () => {
    if (stopped) return;
    try {
      navigator.vibrate?.([300, 150, 300]);
    } catch {
      /* not allowed yet */
    }
    if (ctx) {
      void ctx.resume().catch(() => undefined);
      const t = ctx.currentTime;
      for (const [freq, start] of [
        [660, 0],
        [880, 0.18],
      ] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t + start);
        gain.gain.exponentialRampToValueAtTime(0.12, t + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + start + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + start);
        osc.stop(t + start + 0.32);
      }
    }
  };
  ring();
  const id = setInterval(ring, 2000);
  return () => {
    stopped = true;
    clearInterval(id);
    void ctx?.close().catch(() => undefined);
  };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { signal, onSignal, onMedia, sendMedia, mediaBacklog, iceServers, presence, session } = useRoom();
  const { profile } = useSpace();
  const [state, setState] = useState<CallState>(IDLE_CALL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const partner = profile.partner;

  const pc = useRef<RTCPeerConnection | null>(null);
  const relay = useRef<RelayMedia | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const local = useRef<MediaStream | null>(null);
  const routes = useRef<RTCIceServer[]>(fallbackIceServers());
  const caller = useRef(false);
  const restarted = useRef(false);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const outgoingIce = useRef<RTCIceCandidateInit[]>([]);
  const iceTimer = useRef<ReturnType<typeof setTimeout>>();
  const watchdog = useRef<ReturnType<typeof setTimeout>>();
  const recoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopRing = useRef<(() => void) | null>(null);
  const facing = useRef<"user" | "environment">("user");
  const [relayCanvas] = useState(() => (typeof document === "undefined" ? null : document.createElement("canvas")));

  const send = useCallback((msg: CallMsg) => signal("call", msg), [signal]);
  /** Update the call state; the ref is updated right away so the next step never sees old state. */
  const patch = (p: Partial<CallState>) => {
    const next = { ...stateRef.current, ...p };
    stateRef.current = next;
    setState(next);
  };

  const cleanup = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (const t of [iceTimer, watchdog, recoverTimer]) clearTimeout(t.current);
    stopRing.current?.();
    stopRing.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    pc.current?.close();
    pc.current = null;
    relay.current?.stop();
    relay.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    pendingIce.current = [];
    outgoingIce.current = [];
    restarted.current = false;
    stateRef.current = IDLE_CALL;
    setState(IDLE_CALL);
    void clearNotifications("call");
  }, []);

  /** Must run inside the tap (phones only allow sound to start from a tap). */
  const unlockAudio = () => {
    if (audioCtx.current) return;
    try {
      audioCtx.current = new AudioContext();
      void audioCtx.current.resume().catch(() => undefined);
    } catch {
      /* no Web Audio: the server path can't play sound, the direct path still works */
    }
  };

  const loadRoutes = async () => {
    const servers = await iceServers();
    if (servers?.length) routes.current = servers;
  };

  const markActive = () => {
    clearTimeout(watchdog.current);
    if (stateRef.current.phase !== "active") patch({ phase: "active", startedAt: stateRef.current.startedAt ?? Date.now() });
  };

  /** Switch the call to the server path (both phones do it: whoever notices first tells the other). */
  const switchToRelay = useCallback(
    (tellPartner: boolean) => {
      const s = stateRef.current;
      if (relay.current || s.phase === "idle" || s.phase === "incoming" || !s.id || !local.current) return;
      if (tellPartner) send({ k: "relay", id: s.id });
      clearTimeout(watchdog.current);
      clearTimeout(recoverTimer.current);
      pc.current?.close();
      pc.current = null;
      if (!audioCtx.current) unlockAudio();
      const ctx = audioCtx.current;
      if (!ctx || !relayCanvas) {
        toast.error("This browser can't make this call", { description: "Try Chrome or Safari, or Wi-Fi on both phones." });
        send({ k: "end", id: s.id });
        cleanup();
        return;
      }
      const media = new RelayMedia({
        ctx,
        local: local.current,
        video: s.kind === "video",
        send: sendMedia,
        backlog: mediaBacklog,
        canvas: relayCanvas,
        onRemoteVideo: (on) => patch({ remoteVideo: on }),
      });
      media.setMuted(s.muted);
      media.setCameraOff(s.cameraOff);
      relay.current = media;
      patch({ path: "relay", remote: null, remoteVideo: false, phase: "active", startedAt: s.startedAt ?? Date.now() });
      media.start().catch(() => {
        toast.error("Couldn't start the call audio");
      });
    },
    [send, sendMedia, mediaBacklog, relayCanvas, cleanup],
  );

  /** If the direct line isn't up in time, use the server. */
  const armWatchdog = useCallback(
    (ms = CONNECT_TIMEOUT) => {
      clearTimeout(watchdog.current);
      watchdog.current = setTimeout(() => {
        if (pc.current?.connectionState !== "connected") switchToRelay(true);
      }, ms);
    },
    [switchToRelay],
  );

  const sendCandidate = useCallback(
    (candidate: RTCIceCandidateInit) => {
      outgoingIce.current.push(candidate);
      if (iceTimer.current) return;
      // Small batches: fewer messages, still fast.
      iceTimer.current = setTimeout(() => {
        iceTimer.current = undefined;
        const id = stateRef.current.id;
        const batch = outgoingIce.current.splice(0);
        if (id && batch.length) send({ k: "ice", id, c: batch });
      }, 120);
    },
    [send],
  );

  const restartIce = useCallback(async () => {
    const peer = pc.current;
    const id = stateRef.current.id;
    if (!peer || !id || restarted.current) return false;
    restarted.current = true;
    try {
      await peer.setLocalDescription(await peer.createOffer({ iceRestart: true }));
      send({ k: "offer", id, sdp: peer.localDescription?.sdp ?? "", restart: true });
      armWatchdog(10_000);
      return true;
    } catch {
      return false;
    }
  }, [send, armWatchdog]);

  const makePeer = useCallback(
    (stream: MediaStream) => {
      const peer = new RTCPeerConnection({ iceServers: routes.current, iceTransportPolicy: testPath() === "no-direct" ? "relay" : "all" });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (e) => patch({ remote: e.streams[0] ?? new MediaStream([e.track]) });
      peer.onicecandidate = (e) => {
        if (e.candidate) sendCandidate(e.candidate.toJSON());
      };
      peer.onconnectionstatechange = () => {
        if (pc.current !== peer) return;
        const st = peer.connectionState;
        if (st === "connected") {
          clearTimeout(recoverTimer.current);
          markActive();
        } else if (st === "disconnected") {
          // Often a short network blip (e.g. Wi-Fi → mobile data): give it a moment, then repair.
          clearTimeout(recoverTimer.current);
          recoverTimer.current = setTimeout(() => {
            if (pc.current !== peer || peer.connectionState === "connected") return;
            // The caller repairs the line once; if that doesn't help, the call moves to the server.
            if (caller.current && !restarted.current) void restartIce();
            else armWatchdog(8000);
          }, RECOVER_GRACE);
        } else if (st === "failed") {
          if (caller.current && !restarted.current) {
            void restartIce().then((ok) => {
              if (!ok) switchToRelay(true);
            });
          } else if (!caller.current) armWatchdog(6000);
          else switchToRelay(true);
        }
      };
      pc.current = peer;
      return peer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendCandidate, restartIce, armWatchdog, switchToRelay],
  );

  const flushPendingIce = async (peer: RTCPeerConnection) => {
    for (const c of pendingIce.current.splice(0)) await peer.addIceCandidate(c).catch(() => undefined);
  };

  const hangup = useCallback(() => {
    if (stateRef.current.id) send({ k: "end", id: stateRef.current.id });
    cleanup();
  }, [cleanup, send]);

  const start = useCallback<CallApi["start"]>(
    async (kind, opts) => {
      if (stateRef.current.phase !== "idle") return;
      if (presence.members < 2) return void toast.error("Your partner hasn't joined your room yet.");
      if (!presence.partnerOnline)
        return void toast.error(`${partner} isn't in the app right now`, { description: "Calls ring when UsSpace is open on their phone. Send a 💖 so they know!" });
      unlockAudio();
      let stream: MediaStream;
      try {
        [stream] = await Promise.all([getMedia(kind, (facing.current = "user")), loadRoutes()]);
      } catch {
        void audioCtx.current?.close().catch(() => undefined);
        audioCtx.current = null;
        return void toast.error("Please allow your camera / microphone to call.", { description: "Check the permission in your browser's address bar." });
      }
      const id = randomId(8);
      local.current = stream;
      caller.current = true;
      const next: CallState = { ...IDLE_CALL, phase: "outgoing", kind, id, local: stream, minimized: !!opts?.minimized };
      stateRef.current = next;
      setState(next);
      stopRing.current = startRinging();
      const ring = () => {
        if (stateRef.current.phase === "outgoing" && stateRef.current.id === id) send({ k: "ring", id, kind });
      };
      ring();
      for (let t = RING_EVERY; t < RING_TIMEOUT; t += RING_EVERY) timers.current.push(setTimeout(ring, t));
      timers.current.push(
        setTimeout(() => {
          if (stateRef.current.phase === "outgoing" && stateRef.current.id === id) {
            toast(`${partner} didn't answer`);
            hangup();
          }
        }, RING_TIMEOUT),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presence.members, presence.partnerOnline, partner, send, hangup],
  );

  const accept = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "incoming" || !s.id) return;
    stopRing.current?.();
    stopRing.current = null;
    void clearNotifications("call");
    unlockAudio();
    if (!local.current) {
      try {
        [local.current] = await Promise.all([getMedia(s.kind), loadRoutes()]);
      } catch {
        toast.error("Please allow your camera / microphone to answer.");
        send({ k: "decline", id: s.id });
        return cleanup();
      }
    }
    if (stateRef.current.id !== s.id) return; // the caller hung up meanwhile
    caller.current = false;
    patch({ phase: "connecting", local: local.current });
    send({ k: "accept", id: s.id });
    if (forceRelay()) switchToRelay(true);
    else armWatchdog(CONNECT_TIMEOUT + 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, send, switchToRelay, armWatchdog]);

  const decline = useCallback(() => {
    if (stateRef.current.id) send({ k: "decline", id: stateRef.current.id });
    cleanup();
  }, [cleanup, send]);

  // Call messages from your partner.
  useEffect(
    () =>
      onSignal(async (sig) => {
        if (sig.type !== "call") return;
        const msg = sig.data as CallMsg;
        const s = stateRef.current;
        if (!msg?.id) return;

        if (msg.k === "ring") {
          if (s.phase === "idle") {
            const next: CallState = { ...IDLE_CALL, phase: "incoming", kind: msg.kind, id: msg.id };
            stateRef.current = next;
            setState(next);
            stopRing.current = startRinging();
            // UsSpace is in the background: ring with a phone notification too.
            void notify(`📞 ${partner} is calling…`, msg.kind === "video" ? "Video call — tap to answer" : "Voice call — tap to answer", {
              tag: "call",
              sticky: true,
            });
          } else if (s.phase === "outgoing" && s.id !== msg.id && session && session.device < sig.by) {
            // You both called at the same moment: this phone answers the other call instead.
            timers.current.forEach(clearTimeout);
            timers.current = [];
            patch({ phase: "incoming", id: msg.id });
            void accept();
          } else if (s.id !== msg.id && s.phase !== "outgoing") {
            send({ k: "busy", id: msg.id });
          }
          return;
        }
        if (msg.id !== s.id) return;

        switch (msg.k) {
          case "accept": {
            if (s.phase !== "outgoing" || !local.current) return;
            timers.current.forEach(clearTimeout);
            timers.current = [];
            stopRing.current?.();
            stopRing.current = null;
            patch({ phase: "connecting" });
            if (forceRelay()) return switchToRelay(true);
            const peer = makePeer(local.current);
            armWatchdog();
            await peer.setLocalDescription(await peer.createOffer());
            send({ k: "offer", id: msg.id, sdp: peer.localDescription?.sdp ?? "" });
            return;
          }
          case "offer": {
            if (!local.current || relay.current) return;
            const peer = msg.restart && pc.current ? pc.current : (pc.current ?? makePeer(local.current));
            await peer.setRemoteDescription({ type: "offer", sdp: msg.sdp });
            await flushPendingIce(peer);
            await peer.setLocalDescription(await peer.createAnswer());
            send({ k: "answer", id: msg.id, sdp: peer.localDescription?.sdp ?? "" });
            return;
          }
          case "answer": {
            const peer = pc.current;
            if (!peer || peer.signalingState !== "have-local-offer") return;
            await peer.setRemoteDescription({ type: "answer", sdp: msg.sdp });
            await flushPendingIce(peer);
            return;
          }
          case "ice": {
            const peer = pc.current;
            if (peer?.remoteDescription) for (const c of msg.c) await peer.addIceCandidate(c).catch(() => undefined);
            else pendingIce.current.push(...msg.c);
            return;
          }
          case "relay":
            return switchToRelay(false);
          case "decline":
            toast(`${partner} can't talk right now`);
            return cleanup();
          case "busy":
            toast(`${partner} is on another call`);
            return cleanup();
          case "end":
            cleanup();
            if (s.phase === "incoming") {
              toast(`Missed call from ${partner}`);
              void notify(`📞 Missed call from ${partner}`, "Call back when you're free 💕", { tag: "missed-call" });
            } else toast("Call ended");
            return;
        }
      }),
    [onSignal, send, makePeer, cleanup, accept, partner, session, switchToRelay, armWatchdog],
  );

  // The server path: your partner's audio/video.
  useEffect(() => onMedia((bytes) => relay.current?.receive(bytes)), [onMedia]);

  // Packet counters of a call through the server (only numbers — used by the browser tests).
  useEffect(() => {
    const w = window as unknown as { __usspaceCallStats?: () => RelayMedia["stats"] | null };
    w.__usspaceCallStats = () => relay.current?.stats ?? null;
    return () => void delete w.__usspaceCallStats;
  }, []);

  // Hang up if the page closes; stop ringing if the caller disappears.
  useEffect(() => {
    const onHide = () => stateRef.current.phase !== "idle" && hangup();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [hangup]);
  useEffect(() => {
    if (!presence.partnerOnline && stateRef.current.phase === "incoming") cleanup();
  }, [presence.partnerOnline, cleanup]);

  const toggleMute = useCallback(() => {
    const muted = !stateRef.current.muted;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    relay.current?.setMuted(muted);
    patch({ muted });
  }, []);

  const toggleCamera = useCallback(() => {
    const cameraOff = !stateRef.current.cameraOff;
    local.current?.getVideoTracks().forEach((t) => (t.enabled = !cameraOff));
    relay.current?.setCameraOff(cameraOff);
    patch({ cameraOff });
  }, []);

  const flipCamera = useCallback(async () => {
    const s = stateRef.current;
    const stream = local.current;
    if (s.kind !== "video" || !stream) return;
    facing.current = facing.current === "user" ? "environment" : "user";
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current } });
      const track = fresh.getVideoTracks()[0];
      track.enabled = !s.cameraOff;
      const sender = pc.current?.getSenders().find((x) => x.track?.kind === "video");
      await sender?.replaceTrack(track);
      stream.getVideoTracks().forEach((t) => {
        t.stop();
        stream.removeTrack(t);
      });
      stream.addTrack(track);
      const updated = new MediaStream(stream.getTracks());
      relay.current?.useCamera(updated);
      patch({ local: updated });
    } catch {
      toast.error("Couldn't switch camera");
    }
  }, []);

  const api = useMemo<CallApi>(
    () => ({
      ...state,
      start: (kind, opts) => void start(kind, opts),
      accept: () => void accept(),
      decline,
      hangup,
      toggleMute,
      toggleCamera,
      flipCamera: () => void flipCamera(),
      setMinimized: (minimized) => patch({ minimized }),
      relayCanvas,
    }),
    [state, start, accept, decline, hangup, toggleMute, toggleCamera, flipCamera, relayCanvas],
  );

  return (
    <CallContext.Provider value={api}>
      {children}
      <CallOverlay />
    </CallContext.Provider>
  );
}
