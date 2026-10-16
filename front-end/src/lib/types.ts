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
  at: number;
  reactions: string[];
}

export interface PlanEvent {
  id: string;
  title: string;
  /** "yyyy-mm-dd" */
  date: string;
  /** "HH:mm" (optional) */
  time?: string;
  note: string;
  emoji: string;
}

export interface Letter {
  id: string;
  title: string;
  content: string;
  /** The letter stays locked until this day ("yyyy-mm-dd"). */
  unlockOn: string;
  createdAt: number;
  from: Sender;
  readAt?: number;
}

export interface Milestone {
  id: string;
  title: string;
  /** "yyyy-mm-dd" */
  date: string;
  desc: string;
  emoji: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Length in seconds. */
  duration: number;
  link?: string;
}

/** The shared music player: both phones show the same song at the same second. */
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
