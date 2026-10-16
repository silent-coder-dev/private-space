import { createContext, useContext } from "react";
import type { PlayerDoc, Song } from "@/lib/types";

export interface MusicApi {
  /** null while the song list is loading. */
  songs: Song[] | null;
  song: Song | undefined;
  index: number;
  playing: boolean;
  duration: number;
  /** True when the browser blocked sound until you tap once. */
  needsTap: boolean;
  volume: number;
  shuffle: boolean;
  repeat: PlayerDoc["repeat"];
  /** Where the shared song is right now (seconds). */
  positionNow: () => number;
  toggle: () => void;
  playAt: (index: number) => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  /** Start the sound after the browser asked for a tap. */
  unlock: () => void;
}

export const MusicContext = createContext<MusicApi | null>(null);

export function useMusic(): MusicApi {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside <MusicProvider>");
  return ctx;
}
