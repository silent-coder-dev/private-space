import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { fireFrom } from "@/lib/burst";
import { getWinner, isBoardFull } from "@/lib/games";
import { SPRING } from "@/lib/motion";
import { EMPTY_SCORES, NEW_TTT } from "@/lib/seed";
import type { GameScores, Sender, TttDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { swap } from "@/sync/engine";
import { useSyncedDoc } from "@/sync/hooks";

const SYMBOL: Record<Sender, string> = { me: "❤️", partner: "💜" };

/**
 * Two-player tic-tac-toe. Once your partner has joined, each of you plays on your own phone
 * and every move appears on both screens instantly. Before that, you can pass one phone around.
 */
export function TicTacToe() {
  const { profile } = useSpace();
  const { presence, session } = useRoom();
  const [game, setGame] = useSyncedDoc<TttDoc>("ttt", "doc", NEW_TTT);
  const [scores, setScores] = useSyncedDoc<GameScores>("scores", "doc", EMPTY_SCORES);
  const boardRef = useRef<HTMLDivElement>(null);

  const together = presence.members >= 2 || !!session?.partnerJoined;
  const names: Record<Sender, string> = { me: profile.me, partner: profile.partner };
  const board = game.board?.length === 9 ? game.board : NEW_TTT.board;
  const result = getWinner(board);
  const draw = !result && isBoardFull(board);
  const over = !!result || draw;
  const myTurn = !together || game.turn === "me";

  // Celebrate on both phones when a round is won (but not for a win that was already on screen).
  const winner = result?.player;
  const resultId = result ? `${game.round}-${result.line.join("")}` : "";
  const celebrated = useRef(resultId);
  useEffect(() => {
    if (!resultId || !winner || celebrated.current === resultId) return;
    celebrated.current = resultId;
    fireFrom(boardRef.current, { count: 28, emojis: [SYMBOL[winner], "✨", "🎉"] });
  }, [resultId, winner]);

  const play = (i: number) => {
    if (board[i] || over || !myTurn) return;
    const next = [...board];
    next[i] = game.turn;
    const win = getWinner(next);
    const full = isBoardFull(next);
    setGame({ ...game, board: next, turn: win || full ? game.turn : swap(game.turn) });
    if (win) setScores((s) => ({ ...s, [win.player]: s[win.player] + 1 }));
    else if (full) setScores((s) => ({ ...s, draws: s.draws + 1 }));
  };

  // Take turns starting each round so it stays fair.
  const newRound = () => {
    const starter = swap(game.starter ?? "me");
    setGame({ board: Array(9).fill(null), turn: starter, starter, round: (game.round ?? 1) + 1 });
  };

  const status = result
    ? `🎉 ${names[result.player]} won this round!`
    : draw
      ? "It's a draw 🤝"
      : together
        ? myTurn
          ? `Your move ${SYMBOL.me}`
          : `Waiting for ${names.partner}… ${SYMBOL.partner}`
        : `Next move: ${names[game.turn]} ${SYMBOL[game.turn]}`;

  return (
    <div className="grid items-start gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["me", "draws", "partner"] as const).map((key) => {
            const isTurn = !over && key === game.turn;
            return (
              <div key={key} className="relative rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                {isTurn && <motion.span layoutId="ttt-turn" transition={SPRING} className="absolute inset-0 rounded-2xl ring-2 ring-primary" />}
                <p className="truncate text-xs text-muted-foreground">{key === "draws" ? "Draws" : `${SYMBOL[key]} ${names[key]}`}</p>
                <motion.p key={scores[key]} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-heading text-2xl font-bold">
                  {scores[key]}
                </motion.p>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={cn("text-center font-heading text-lg font-semibold md:text-left", over && "text-gradient")}
          >
            {status}
          </motion.p>
        </AnimatePresence>

        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
          <Button variant="gradient" onClick={newRound}>
            New round
          </Button>
          <Button variant="ghost" onClick={() => setScores(EMPTY_SCORES)} className="text-muted-foreground">
            <RotateCcw /> Reset scores
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground md:text-left">
          {together
            ? `You're ${SYMBOL.me}, ${names.partner} is ${SYMBOL.partner}. Each move shows up on both phones instantly — the other person starts the next round.`
            : "Your partner hasn't joined yet — pass the phone and play side by side."}
        </p>
      </div>

      <div ref={boardRef} className="mx-auto grid w-full max-w-[320px] grid-cols-3 gap-3">
        {board.map((cell, i) => {
          const winning = result?.line.includes(i);
          const canPlay = !cell && !over && myTurn;
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => play(i)}
              whileHover={canPlay ? { scale: 1.05 } : undefined}
              whileTap={canPlay ? { scale: 0.92 } : undefined}
              animate={winning ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={winning ? { duration: 0.8, repeat: Infinity } : undefined}
              aria-label={cell ? `Square ${i + 1}, ${names[cell]}` : `Play square ${i + 1}`}
              aria-disabled={!canPlay}
              className={cn(
                "grid aspect-square place-items-center rounded-2xl text-4xl ring-1 transition-colors",
                winning ? "gradient-primary glow-primary ring-transparent" : "bg-white/5 ring-white/10",
                canPlay && "hover:bg-white/10 hover:ring-primary/40",
                !myTurn && !over && "cursor-wait",
                over && !winning && "opacity-50",
              )}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 14 }}>
                    {SYMBOL[cell]}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
