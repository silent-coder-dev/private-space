import { describe, expect, it } from "vitest";
import { createMemoryDeck, getWinner, isBoardFull, pickRandom, shuffle, type Cell } from "@/lib/games";

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
