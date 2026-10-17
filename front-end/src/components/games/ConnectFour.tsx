import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpace } from "@/context/space";
import { fireFrom } from "@/lib/burst";
import { C4_COLS, C4_ROWS, connectFourWinner, dropRow } from "@/lib/games";
import { SPRING } from "@/lib/motion";
import type { C4Doc, Sender } from "@/lib/types";
import { cn } from "@/lib/utils";
import { swap } from "@/sync/engine";
import { useSyncedDoc } from "@/sync/hooks";
import { newC4 } from "./new-game";

const DISC: Record<Sender, string> = { me: "💖", partner: "💜" };
const CELLS = C4_COLS * C4_ROWS;

const EMPTY = newC4();

/** Connect Four: drop hearts in turn — four in a row (across, down or diagonal) wins. */
export function ConnectFour() {
  const { profile } = useSpace();
  const [game, setGame] = useSyncedDoc<C4Doc>("c4", "doc", EMPTY);
  const boardRef = useRef<HTMLDivElement>(null);
  const names: Record<Sender, string> = { me: profile.me, partner: profile.partner };
  const board = game.board?.length === CELLS ? game.board : EMPTY.board;
  const win = connectFourWinner(board);
  const full = board.every(Boolean);
  const over = !!win || full;
  const myTurn = game.turn === "me" && !over;

  // Celebrate on both phones when someone wins.
  const resultId = win ? `${game.round}-${win.line.join(",")}` : "";
  const celebrated = useRef(resultId);
  useEffect(() => {
    if (!resultId || !win || celebrated.current === resultId) return;
    celebrated.current = resultId;
    fireFrom(boardRef.current, { count: 30, emojis: [DISC[win.player], "✨", "🎉"] });
  }, [resultId, win]);

  const drop = (col: number) => {
    if (!myTurn) return;
    const row = dropRow(board, col);
    if (row < 0) return;
    const next = [...board];
    next[row * C4_COLS + col] = "me";
    const won = connectFourWinner(next);
    const isFull = next.every(Boolean);
    setGame({
      ...game,
      board: next,
      turn: won || isFull ? game.turn : "partner",
      wins: won ? { ...game.wins, me: game.wins.me + 1 } : game.wins,
      draws: !won && isFull ? game.draws + 1 : game.draws,
    });
  };

  // Take turns starting each round so it stays fair.
  const newRound = () => {
    const starter = swap(game.starter);
    setGame({ ...game, board: Array(CELLS).fill(null), turn: starter, starter, round: game.round + 1 });
  };

  const status = win
    ? `🎉 ${names[win.player]} got four in a row!`
    : full
      ? "The board is full — it's a draw 🤝"
      : myTurn
        ? `Your move ${DISC.me} — tap a column`
        : `Waiting for ${names.partner}… ${DISC.partner}`;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        {(["me", "draws", "partner"] as const).map((key) => {
          const isTurn = !over && key === game.turn;
          const value = key === "draws" ? game.draws : game.wins[key];
          return (
            <div key={key} className="relative rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              {isTurn && <motion.span layoutId="c4-turn" transition={SPRING} className="absolute inset-0 rounded-2xl ring-2 ring-primary" />}
              <p className="truncate text-xs text-muted-foreground">{key === "draws" ? "Draws" : `${DISC[key]} ${names[key]}`}</p>
              <motion.p key={value} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-heading text-2xl font-bold">
                {value}
              </motion.p>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={cn("text-center font-heading text-lg font-semibold", over && "text-gradient")}>
          {status}
        </motion.p>
      </AnimatePresence>

      <div ref={boardRef} className="rounded-3xl bg-gradient-to-b from-primary/25 to-secondary/25 p-2 shadow-2xl ring-1 ring-white/10 [perspective:900px] sm:p-3">
        <motion.div initial={{ rotateX: 18 }} animate={{ rotateX: 0 }} transition={{ duration: 0.6 }} className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: C4_COLS }, (_, col) => {
            const open = dropRow(board, col) >= 0;
            return (
              <button
                key={col}
                type="button"
                onClick={() => drop(col)}
                disabled={!myTurn || !open}
                aria-label={`Drop in column ${col + 1}`}
                className={cn("grid gap-1.5 rounded-xl p-0.5 transition-colors sm:gap-2", myTurn && open && "hover:bg-white/10", "disabled:cursor-default")}
              >
                {Array.from({ length: C4_ROWS }, (_, row) => {
                  const i = row * C4_COLS + col;
                  const cell = board[i];
                  const winning = win?.line.includes(i);
                  return (
                    <span
                      key={row}
                      className={cn("relative grid aspect-square place-items-center rounded-full bg-background/80 shadow-inner ring-1 ring-white/10", winning && "ring-2 ring-gold glow-primary")}
                    >
                      <AnimatePresence>
                        {cell && (
                          <motion.span
                            key={`${game.round}-${i}`}
                            initial={{ y: -36 * (row + 1), opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 420, damping: 22 }}
                            className="text-lg leading-none sm:text-2xl"
                          >
                            {DISC[cell]}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  );
                })}
              </button>
            );
          })}
        </motion.div>
      </div>

      {over && (
        <div className="flex justify-center">
          <Button variant="gradient" onClick={newRound}>
            <RotateCcw /> New round
          </Button>
        </div>
      )}
    </div>
  );
}
