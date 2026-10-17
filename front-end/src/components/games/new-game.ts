import { MEMORY_SYMBOLS } from "@/lib/content";
import { C4_COLS, C4_ROWS, shuffle } from "@/lib/games";
import type { C4Doc, MemoryDoc, NhieDoc, QuizDoc, RpsDoc, Sender, WyrDoc } from "@/lib/types";

/** Fresh game states (used when a game starts and for "new round"). */

const randomSeed = () => Math.floor(Math.random() * 1e9);

export const newMemory = (turn: Sender = "me", round = 1): MemoryDoc => ({
  deck: shuffle([...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS]),
  flipped: [],
  matched: [],
  turn,
  points: { me: 0, partner: 0 },
  round,
});

export const newWyr = (index = 0, seed = randomSeed()): WyrDoc => ({ index, seed, picks: { me: null, partner: null } });

export const newC4 = (turn: Sender = "me"): C4Doc => ({
  board: Array(C4_COLS * C4_ROWS).fill(null),
  turn,
  starter: turn,
  round: 1,
  wins: { me: 0, partner: 0 },
  draws: 0,
});

export const newRps = (): RpsDoc => ({ round: 1, picks: { me: null, partner: null }, history: [] });

export const newNhie = (seed = randomSeed()): NhieDoc => ({
  index: 0,
  seed,
  answers: { me: null, partner: null },
  haves: { me: 0, partner: 0 },
});

/** `subject` answers about themselves first; the other one guesses. */
export const newQuiz = (subject: Sender = "me", seed = randomSeed()): QuizDoc => ({
  index: 0,
  seed,
  subject,
  answer: null,
  guess: null,
  points: { me: 0, partner: 0 },
});
