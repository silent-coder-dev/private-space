import { createContext, useContext } from "react";
import type { ConnectionStatus, Presence, RoomErrorCode, Signal, SignalType } from "@/sync/client";
import type { SyncEngine } from "@/sync/engine";
import type { RoomSession } from "@/sync/session";

export interface RoomContextValue {
  /** null until this device has created or joined a room. */
  session: RoomSession | null;
  engine: SyncEngine | null;
  status: ConnectionStatus;
  presence: Presence;
  partnerTyping: boolean;
  /** Set when the room can't be used any more (removed, full, wrong code…). */
  problem: { code: RoomErrorCode; message: string } | null;
  createRoom: (name: string, since: string) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  /** Delete this room's data from this device only. */
  leaveRoom: () => void;
  /** Close the room for BOTH of you: the server and both phones delete everything. */
  closeRoom: () => void;
  /** Send a live signal to your partner. Returns false if you're offline. */
  signal: (type: SignalType, data?: unknown) => boolean;
  /** Listen to live signals (calls use this). */
  onSignal: (listener: (signal: Signal) => void) => () => void;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}

/** Friendly words for every room problem. */
export const ROOM_ERRORS: Record<RoomErrorCode, string> = {
  not_found: "We couldn't find a room with that code. Check it and try again.",
  full: "This room already has two people in it.",
  denied: "That code isn't right. Please check it.",
  rate_limited: "Too many tries. Please wait a minute and try again.",
  bad_request: "Something went wrong. Please refresh and try again.",
  exists: "That room already exists. Try creating it again.",
  left: "You left this room in another window.",
  timeout: "Can't reach the UsSpace server right now. Check your internet and try again.",
  network: "Can't reach the UsSpace server right now. Check your internet and try again.",
  closed: "This room was closed and everything in it was deleted.",
};
