export type Sender = "me" | "partner";

/** The combined view of both people that pages use (built from the synced docs below). */
export interface Profile {
  me: string;
  partner: string;
  /** The day you got together, as "yyyy-mm-dd". */
  since: string;
  mood: string;
  status: string;
  away: boolean;
  partnerMood: string;
  partnerStatus: string;
  partnerAway: boolean;
}

/** Each person's own details. Synced as member/me → shows on the other phone as member/partner. */
export interface MemberDoc {
  name: string;
  mood: string;
  status: string;
  away: boolean;
}

/** Details the two of you share. */
export interface CoupleDoc {
  since: string;
}

/** When each person last read the chat (for "Seen" ticks). */
export interface ReadDoc {
  chat: number;
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text?: string;
  /** A small, compressed data URL. */
  image?: string;
  /** A short video clip (data URL). */
  video?: string;
  at: number;
  reactions: string[];
}

/** The shared music player: both phones show the same song at the same second. */
export interface Song {
  /** File name in the music folder. */
  id: string;
  url: string;
  title: string;
}

export interface PlayerDoc {
  songId: string | null;
  playing: boolean;
  /** Position in seconds at the moment `at` (server time, ms). */
  position: number;
  at: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
}

export interface GameScores {
  me: number;
  partner: number;
  draws: number;
}

/** Shared tic-tac-toe game. */
export interface TttDoc {
  board: (Sender | null)[];
  turn: Sender;
  starter: Sender;
  round: number;
}

/** The truth-or-dare card both of you see. */
export interface TodDoc {
  kind: "truth" | "dare";
  text: string;
  n: number;
}

export type GameId = "ttt" | "tod" | "memory" | "wyr";

/** The game invitation / session both of you share. */
export interface GameSession {
  game: GameId;
  status: "invited" | "playing";
  /** Who sent the invite. */
  by: Sender;
  at: number;
}

/** Shared memory match: you take turns; a pair keeps your turn. */
export interface MemoryDoc {
  deck: string[];
  flipped: number[];
  matched: string[];
  turn: Sender;
  points: { me: number; partner: number };
  round: number;
}

/** Shared would-you-rather: both pick, then both answers are revealed. */
export interface WyrDoc {
  index: number;
  seed: number;
  picks: { me: number | null; partner: number | null };
}

export interface Photo {
  id: string;
  src: string;
  at: number;
  from: Sender;
}

/** "Look at this one!" — the photo one of you is showing the other. */
export interface GalleryView {
  id: string;
  by: Sender;
  at: number;
}

export interface Stroke {
  id: string;
  by: Sender;
  at: number;
  tool: "pen" | "neon" | "eraser";
  color: string;
  /** Width as a share of the canvas width (0–1). */
  size: number;
  /** Flattened x,y pairs, 0–1000. */
  pts: number[];
}

export interface Sticker {
  id: string;
  by: Sender;
  at: number;
  kind: "emoji" | "image";
  value: string;
  /** Centre and size as a share of the canvas (0–1). */
  x: number;
  y: number;
  w: number;
  h: number;
}
