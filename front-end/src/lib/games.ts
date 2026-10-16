import type { Sender } from "./types";

export type Cell = Sender | null;

export const WIN_LINES: readonly number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function getWinner(board: Cell[]): { player: Sender; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a] as Sender, line };
    }
  }
  return null;
}

export function isBoardFull(board: Cell[]): boolean {
  return board.every(Boolean);
}

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface MemoryCard {
  id: number;
  symbol: string;
}

export function createMemoryDeck(symbols: readonly string[], rand: () => number = Math.random): MemoryCard[] {
  return shuffle([...symbols, ...symbols], rand).map((symbol, id) => ({ id, symbol }));
}

/** Pick a random item, avoiding `previous` when there is another choice. */
export function pickRandom<T>(list: readonly T[], previous?: T, rand: () => number = Math.random): T {
  const pool = list.length > 1 ? list.filter((item) => item !== previous) : list;
  return pool[Math.floor(rand() * pool.length)];
}
