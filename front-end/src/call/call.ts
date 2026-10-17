import { createContext, useContext } from "react";

export type CallKind = "audio" | "video";
export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "active";
/** "direct": phone to phone (WebRTC). "relay": through the UsSpace server, when a direct line is impossible. */
export type CallPath = "direct" | "relay";

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
  path: CallPath;
  /** In a relayed video call: are pictures from your partner arriving? */
  remoteVideo: boolean;
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
  /** Where a relayed call draws your partner's video. */
  relayCanvas: HTMLCanvasElement | null;
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
  path: "direct",
  remoteVideo: true,
};

export const CallContext = createContext<CallApi | null>(null);

export function useCall(): CallApi {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}

/**
 * Used only when the server doesn't answer: free public STUN servers, plus a TURN server
 * baked into the build (VITE_TURN_*). Normally the server provides the routes (see server/ice.mjs).
 */
export function fallbackIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
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
