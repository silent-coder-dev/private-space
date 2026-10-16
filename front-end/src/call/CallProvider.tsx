import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { randomId } from "@/sync/crypto";
import { CallContext, iceServers, IDLE_CALL, type CallApi, type CallKind, type CallState } from "./call";
import { CallOverlay } from "./CallOverlay";

/** Call messages travel through the encrypted room connection; audio/video go phone-to-phone (WebRTC). */
type CallMsg =
  | { k: "ring"; id: string; kind: CallKind }
  | { k: "accept" | "decline" | "end" | "busy"; id: string }
  | { k: "offer" | "answer"; id: string; sdp: string };

const RING_EVERY = 3000;
const RING_TIMEOUT = 40_000;

const getMedia = (kind: CallKind, facing: "user" | "environment" = "user") =>
  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: kind === "video" ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  });

/** Wait until the connection has gathered its network routes (sent in one message instead of many). */
const gathered = (pc: RTCPeerConnection, ms = 2500) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => pc.iceGatheringState === "complete" && done();
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(done, ms);
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
    navigator.vibrate?.([300, 150, 300]);
    if (ctx) {
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
  const { signal, onSignal, presence, session } = useRoom();
  const { profile } = useSpace();
  const [state, setState] = useState<CallState>(IDLE_CALL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pc = useRef<RTCPeerConnection | null>(null);
  const facing = useRef<"user" | "environment">("user");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopRing = useRef<(() => void) | null>(null);
  const partner = profile.partner;

  const send = useCallback((msg: CallMsg) => signal("call", msg), [signal]);
  const patch = (p: Partial<CallState>) => setState((s) => ({ ...s, ...p }));

  const cleanup = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopRing.current?.();
    stopRing.current = null;
    stateRef.current.local?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    pc.current = null;
    setState(IDLE_CALL);
  }, []);

  const makePeer = useCallback(
    (local: MediaStream) => {
      const peer = new RTCPeerConnection({ iceServers: iceServers() });
      local.getTracks().forEach((track) => peer.addTrack(track, local));
      peer.ontrack = (e) => patch({ remote: e.streams[0] ?? new MediaStream([e.track]) });
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") patch({ phase: "active", startedAt: Date.now() });
        if (peer.connectionState === "failed") {
          toast.error("Couldn't connect the call", { description: "Your networks blocked a direct connection. Try Wi-Fi, or add a TURN server." });
          send({ k: "end", id: stateRef.current.id ?? "" });
          cleanup();
        }
      };
      pc.current = peer;
      return peer;
    },
    [cleanup, send],
  );

  const hangup = useCallback(() => {
    if (stateRef.current.id) send({ k: "end", id: stateRef.current.id });
    cleanup();
  }, [cleanup, send]);

  const start = useCallback<CallApi["start"]>(
    async (kind, opts) => {
      if (stateRef.current.phase !== "idle") return;
      if (presence.members < 2) return void toast.error("Your partner hasn't joined your room yet.");
      if (!presence.partnerOnline) return void toast.error(`${partner} is offline right now`, { description: "Send a 💖 instead — they'll see it when they're back." });
      let local: MediaStream;
      try {
        local = await getMedia(kind, (facing.current = "user"));
      } catch {
        return void toast.error("Please allow your camera / microphone to call.");
      }
      const id = randomId(8);
      setState({ ...IDLE_CALL, phase: "outgoing", kind, id, local, minimized: !!opts?.minimized });
      stopRing.current = startRinging();
      const ring = () => send({ k: "ring", id, kind });
      ring();
      for (let t = RING_EVERY; t < RING_TIMEOUT; t += RING_EVERY) timers.current.push(setTimeout(ring, t));
      timers.current.push(
        setTimeout(() => {
          if (stateRef.current.phase === "outgoing") {
            toast(`${partner} didn't answer`);
            hangup();
          }
        }, RING_TIMEOUT),
      );
    },
    [presence.members, presence.partnerOnline, partner, send, hangup],
  );

  const accept = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "incoming" || !s.id) return;
    stopRing.current?.();
    let local = s.local;
    if (!local) {
      try {
        local = await getMedia(s.kind);
      } catch {
        toast.error("Please allow your camera / microphone to answer.");
        send({ k: "decline", id: s.id });
        return cleanup();
      }
    }
    patch({ phase: "connecting", local });
    send({ k: "accept", id: s.id });
  }, [cleanup, send]);

  const decline = useCallback(() => {
    if (stateRef.current.id) send({ k: "decline", id: stateRef.current.id });
    cleanup();
  }, [cleanup, send]);

  // Incoming call messages.
  useEffect(
    () =>
      onSignal(async (sig) => {
        if (sig.type !== "call") return;
        const msg = sig.data as CallMsg;
        const s = stateRef.current;
        if (!msg?.id) return;

        if (msg.k === "ring") {
          if (s.phase === "idle") {
            setState({ ...IDLE_CALL, phase: "incoming", kind: msg.kind, id: msg.id });
            stopRing.current = startRinging();
          } else if (s.phase === "outgoing" && s.id !== msg.id && session && session.device < sig.by) {
            // We both called at once: this phone answers the other call instead.
            timers.current.forEach(clearTimeout);
            timers.current = [];
            setState((prev) => ({ ...prev, phase: "incoming", id: msg.id }));
            stateRef.current = { ...stateRef.current, phase: "incoming", id: msg.id };
            void accept();
          } else if (s.id !== msg.id && s.phase !== "outgoing") {
            send({ k: "busy", id: msg.id });
          }
          return;
        }
        if (msg.id !== s.id) return;

        if (msg.k === "accept" && s.phase === "outgoing" && s.local) {
          timers.current.forEach(clearTimeout);
          timers.current = [];
          stopRing.current?.();
          patch({ phase: "connecting" });
          const peer = makePeer(s.local);
          await peer.setLocalDescription(await peer.createOffer());
          await gathered(peer);
          send({ k: "offer", id: msg.id, sdp: peer.localDescription?.sdp ?? "" });
        } else if (msg.k === "offer" && s.local) {
          const peer = makePeer(s.local);
          await peer.setRemoteDescription({ type: "offer", sdp: msg.sdp });
          await peer.setLocalDescription(await peer.createAnswer());
          await gathered(peer);
          send({ k: "answer", id: msg.id, sdp: peer.localDescription?.sdp ?? "" });
        } else if (msg.k === "answer" && pc.current) {
          await pc.current.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        } else if (msg.k === "decline") {
          toast(`${partner} can't talk right now`);
          cleanup();
        } else if (msg.k === "busy") {
          toast(`${partner} is on another call`);
          cleanup();
        } else if (msg.k === "end") {
          if (s.phase === "incoming") toast(`Missed call from ${partner}`);
          else toast("Call ended");
          cleanup();
        }
      }),
    [onSignal, send, makePeer, cleanup, accept, partner, session],
  );

  // Hang up if the page closes or the partner goes offline.
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
    stateRef.current.local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    patch({ muted });
  }, []);

  const toggleCamera = useCallback(() => {
    const cameraOff = !stateRef.current.cameraOff;
    stateRef.current.local?.getVideoTracks().forEach((t) => (t.enabled = !cameraOff));
    patch({ cameraOff });
  }, []);

  const flipCamera = useCallback(async () => {
    const s = stateRef.current;
    if (s.kind !== "video" || !s.local) return;
    facing.current = facing.current === "user" ? "environment" : "user";
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current } });
      const track = fresh.getVideoTracks()[0];
      const sender = pc.current?.getSenders().find((x) => x.track?.kind === "video");
      await sender?.replaceTrack(track);
      s.local.getVideoTracks().forEach((t) => {
        t.stop();
        s.local?.removeTrack(t);
      });
      s.local.addTrack(track);
      patch({ local: new MediaStream(s.local.getTracks()) });
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
    }),
    [state, start, accept, decline, hangup, toggleMute, toggleCamera, flipCamera],
  );

  return (
    <CallContext.Provider value={api}>
      {children}
      <CallOverlay />
    </CallContext.Provider>
  );
}
