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

export type GameId = "ttt" | "tod" | "memory" | "wyr" | "c4" | "rps" | "nhie" | "quiz";

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
  /** Flattened x,y pairs. Version 2: canvas units (the width is 1000, the height grows). Old: 0–1000 of a 4:3 board. */
  pts: number[];
  v?: 2;
}

export interface Sticker {
  id: string;
  by: Sender;
  at: number;
  kind: "emoji" | "image";
  value: string;
  /** Centre and size. Version 2: canvas units (the width is 1000). Old: a share (0–1) of a 4:3 board. */
  x: number;
  y: number;
  w: number;
  h: number;
  v?: 2;
}

/** Connect Four: 7 columns × 6 rows, top row first. */
export interface C4Doc {
  board: (Sender | null)[];
  turn: Sender;
  starter: Sender;
  round: number;
  wins: { me: number; partner: number };
  draws: number;
}

/** Rock Paper Scissors: secret picks (0 rock, 1 paper, 2 scissors) and every finished round. */
export interface RpsDoc {
  round: number;
  picks: { me: number | null; partner: number | null };
  history: { me: number; partner: number }[];
}

/** Never Have I Ever: both answer secretly, then see each other's answer. */
export interface NhieDoc {
  index: number;
  seed: number;
  answers: { me: boolean | null; partner: boolean | null };
  haves: { me: number; partner: number };
}

/** How Well Do You Know Me: the "subject" answers about themselves, the other one guesses. */
export interface QuizDoc {
  index: number;
  seed: number;
  subject: Sender;
  answer: number | null;
  guess: number | null;
  points: { me: number; partner: number };
}
