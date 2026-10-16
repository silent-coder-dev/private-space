import { createContext, useContext } from "react";

export type CallKind = "audio" | "video";
export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "active";

export interface CallState {
  phase: CallPhase;
  kind: CallKind;
  id: string | null;
  startedAt: number | null;
  muted: boolean;
  cameraOff: boolean;
  minimized: boolean;
  local: MediaStream | null;
  remote: MediaStream | null;
}

export interface CallApi extends CallState {
  start: (kind: CallKind, opts?: { minimized?: boolean }) => void;
  accept: () => void;
  decline: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  flipCamera: () => void;
  setMinimized: (minimized: boolean) => void;
}

export const IDLE_CALL: CallState = {
  phase: "idle",
  kind: "audio",
  id: null,
  startedAt: null,
  muted: false,
  cameraOff: false,
  minimized: false,
  local: null,
  remote: null,
};

export const CallContext = createContext<CallApi | null>(null);

export function useCall(): CallApi {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}

/** Free public STUN servers + an optional TURN server (needed on some strict mobile networks). */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turn) {
    servers.push({
      urls: turn.split(",").map((s) => s.trim()),
      username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
    });
  }
  return servers;
}
