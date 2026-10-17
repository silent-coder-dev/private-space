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

// ---------- Connect Four ----------

export const C4_COLS = 7;
export const C4_ROWS = 6;

/** The lowest free row in a column, or -1 when it's full. Cells go row by row, top row first. */
export function dropRow(board: readonly Cell[], col: number): number {
  for (let row = C4_ROWS - 1; row >= 0; row--) if (!board[row * C4_COLS + col]) return row;
  return -1;
}

/** Four in a row — across, down or diagonal: who won and which four cells. */
export function connectFourWinner(board: readonly Cell[]): { player: Sender; line: number[] } | null {
  const at = (r: number, c: number) => (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS ? board[r * C4_COLS + c] : null);
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const player = at(r, c);
      if (!player) continue;
      for (const [dr, dc] of directions) {
        const line = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
        if (line.every(([rr, cc]) => at(rr, cc) === player)) return { player, line: line.map(([rr, cc]) => rr * C4_COLS + cc) };
      }
    }
  }
  return null;
}

// ---------- Rock Paper Scissors ----------

/** 0 = rock, 1 = paper, 2 = scissors. Returns 1 when `a` wins, -1 when `b` wins, 0 for a draw. */
export function rpsResult(a: number, b: number): -1 | 0 | 1 {
  if (a === b) return 0;
  return (a - b + 3) % 3 === 1 ? 1 : -1;
}

// ---------- shared helpers ----------

/** The same shuffled order on both phones, worked out from a shared seed. */
export function seededOrder(length: number, seed: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  let s = Math.abs(Math.floor(seed)) || 1;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
