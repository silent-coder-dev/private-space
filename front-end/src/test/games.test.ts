import { describe, expect, it } from "vitest";
import { decodeMuLaw, encodeMuLaw } from "@/call/relay-media";
import { C4_COLS, connectFourWinner, createMemoryDeck, dropRow, getWinner, isBoardFull, pickRandom, rpsResult, seededOrder, shuffle, type Cell } from "@/lib/games";

const board = (cells: string): Cell[] =>
  cells.split("").map((c) => (c === "x" ? "me" : c === "o" ? "partner" : null));

describe("tic-tac-toe", () => {
  it("finds a winning row, column and diagonal", () => {
    expect(getWinner(board("xxx......"))).toEqual({ player: "me", line: [0, 1, 2] });
    expect(getWinner(board(".o..o..o."))).toEqual({ player: "partner", line: [1, 4, 7] });
    expect(getWinner(board("x...x...x"))).toEqual({ player: "me", line: [0, 4, 8] });
  });

  it("returns null when nobody has won", () => {
    expect(getWinner(board("xo.......") )).toBeNull();
  });

  it("knows when the board is full (a draw)", () => {
    const full = board("xoxxoooxx");
    expect(getWinner(full)).toBeNull();
    expect(isBoardFull(full)).toBe(true);
    expect(isBoardFull(board("xox......"))).toBe(false);
  });
});

describe("helpers", () => {
  it("shuffle keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(shuffle(items).sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("memory deck has two of each symbol", () => {
    const deck = createMemoryDeck(["a", "b", "c"]);
    expect(deck).toHaveLength(6);
    expect(deck.map((c) => c.id)).toEqual([0, 1, 2, 3, 4, 5]);
    ["a", "b", "c"].forEach((s) => expect(deck.filter((c) => c.symbol === s)).toHaveLength(2));
  });

  it("pickRandom avoids repeating the previous item", () => {
    for (let i = 0; i < 20; i++) expect(pickRandom(["a", "b"], "a")).toBe("b");
    expect(pickRandom(["only"], "only")).toBe("only");
  });
});

describe("connect four", () => {
  const empty = (): Cell[] => Array(42).fill(null);
  const put = (b: Cell[], row: number, col: number, who: Cell) => (b[row * C4_COLS + col] = who);

  it("drops into the lowest free row and knows when a column is full", () => {
    const b = empty();
    expect(dropRow(b, 3)).toBe(5);
    put(b, 5, 3, "me");
    expect(dropRow(b, 3)).toBe(4);
    for (let r = 0; r < 6; r++) put(b, r, 0, "partner");
    expect(dropRow(b, 0)).toBe(-1);
  });

  it("finds four in a row across, down and on both diagonals", () => {
    const across = empty();
    for (let c = 1; c <= 4; c++) put(across, 5, c, "me");
    expect(connectFourWinner(across)?.player).toBe("me");

    const down = empty();
    for (let r = 2; r <= 5; r++) put(down, r, 6, "partner");
    expect(connectFourWinner(down)).toMatchObject({ player: "partner", line: [20, 27, 34, 41] });

    const diagonal = empty();
    for (let k = 0; k < 4; k++) put(diagonal, 2 + k, k, "me");
    expect(connectFourWinner(diagonal)?.player).toBe("me");

    const other = empty();
    for (let k = 0; k < 4; k++) put(other, 5 - k, k, "partner");
    expect(connectFourWinner(other)?.player).toBe("partner");
  });

  it("three in a row is not a win", () => {
    const b = empty();
    for (let c = 0; c < 3; c++) put(b, 5, c, "me");
    expect(connectFourWinner(b)).toBeNull();
  });
});

describe("rock paper scissors", () => {
  it("rock beats scissors, scissors beat paper, paper beats rock", () => {
    expect(rpsResult(0, 2)).toBe(1);
    expect(rpsResult(2, 1)).toBe(1);
    expect(rpsResult(1, 0)).toBe(1);
    expect(rpsResult(0, 1)).toBe(-1);
    expect(rpsResult(2, 2)).toBe(0);
  });
});

describe("shared question order", () => {
  it("is the same on both phones for the same seed, and uses every question once", () => {
    expect(seededOrder(30, 42)).toEqual(seededOrder(30, 42));
    expect([...seededOrder(30, 42)].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect(seededOrder(30, 42)).not.toEqual(seededOrder(30, 43));
  });
});

describe("call voice encoding (server path)", () => {
  it("keeps speech close to the original after μ-law encoding", () => {
    const samples = Int16Array.from({ length: 640 }, (_, i) => Math.round(Math.sin(i / 8) * 12000));
    const back = decodeMuLaw(encodeMuLaw(samples));
    expect(back).toHaveLength(640);
    for (let i = 0; i < samples.length; i++) expect(Math.abs(back[i] * 32768 - samples[i])).toBeLessThan(Math.abs(samples[i]) * 0.07 + 40);
  });
});
