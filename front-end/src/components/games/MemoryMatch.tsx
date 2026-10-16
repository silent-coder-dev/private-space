import { motion } from "framer-motion";
import { Heart, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpace } from "@/context/space";
import { fireFrom } from "@/lib/burst";
import { MEMORY_SYMBOLS } from "@/lib/content";
import { shuffle } from "@/lib/games";
import type { MemoryDoc, Sender } from "@/lib/types";
import { cn } from "@/lib/utils";
import { swap } from "@/sync/engine";
import { useSyncedDoc } from "@/sync/hooks";

export const newMemory = (turn: Sender = "me", round = 1): MemoryDoc => ({
  deck: shuffle([...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS]),
  flipped: [],
  matched: [],
  turn,
  points: { me: 0, partner: 0 },
  round,
});
const EMPTY: MemoryDoc = { deck: [], flipped: [], matched: [], turn: "me", points: { me: 0, partner: 0 }, round: 0 };

/** Two-player memory: take turns flipping two cards. A pair scores and keeps your turn. */
export function MemoryMatch() {
  const { profile } = useSpace();
  const [game, setGame] = useSyncedDoc<MemoryDoc>("memory", "doc", EMPTY);
  const gridRef = useRef<HTMLDivElement>(null);
  const resolving = useRef<ReturnType<typeof setTimeout>>();
  const myTurn = game.turn === "me";
  const done = game.deck.length > 0 && game.matched.length * 2 === game.deck.length;
  const names: Record<Sender, string> = { me: "You", partner: profile.partner };

  // The player whose turn it is settles two open cards (so it happens exactly once).
  useEffect(() => {
    if (game.flipped.length !== 2 || !myTurn) return;
    const [a, b] = game.flipped.map((i) => game.deck[i]);
    resolving.current = setTimeout(
      () =>
        setGame((g) =>
          a === b
            ? { ...g, flipped: [], matched: [...g.matched, a], points: { ...g.points, me: g.points.me + 1 } }
            : { ...g, flipped: [], turn: swap(g.turn) },
        ),
      a === b ? 500 : 1000,
    );
    return () => clearTimeout(resolving.current);
  }, [game.flipped, game.deck, myTurn, setGame]);

  const celebrated = useRef(done);
  useEffect(() => {
    if (done && !celebrated.current) fireFrom(gridRef.current, { count: 30 });
    celebrated.current = done;
  }, [done]);

  const flip = (i: number) => {
    if (!myTurn || game.flipped.length >= 2 || game.flipped.includes(i) || game.matched.includes(game.deck[i])) return;
    setGame({ ...game, flipped: [...game.flipped, i] });
  };

  if (game.deck.length === 0) {
    return (
      <div className="text-center">
        <Button variant="gradient" onClick={() => setGame(newMemory("me"))}>
          Deal the cards
        </Button>
      </div>
    );
  }

  const winner = game.points.me === game.points.partner ? null : game.points.me > game.points.partner ? "me" : "partner";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="grid grid-cols-2 gap-2 text-center">
        {(["me", "partner"] as const).map((who) => (
          <div key={who} className={cn("rounded-2xl bg-white/5 p-3 ring-1", game.turn === who && !done ? "ring-2 ring-primary" : "ring-white/10")}>
            <p className="text-xs text-muted-foreground">{names[who]}</p>
            <p className="font-heading text-2xl font-bold">{game.points[who]}</p>
          </div>
        ))}
      </div>
      <p className="text-center font-heading font-semibold">
        {done ? (winner ? `🏆 ${names[winner]} ${winner === "me" ? "win" : "wins"}!` : "🤝 It's a tie!") : myTurn ? "Your turn — flip two cards" : `${profile.partner}'s turn…`}
      </p>

      <div ref={gridRef} className="grid grid-cols-4 gap-2 sm:gap-3">
        {game.deck.map((symbol, i) => {
          const isMatched = game.matched.includes(symbol);
          const faceUp = isMatched || game.flipped.includes(i);
          return (
            <button key={i} type="button" onClick={() => flip(i)} aria-label={faceUp ? symbol : "Hidden card"} className={cn("aspect-square [perspective:800px]", !myTurn && "cursor-wait")}>
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0, scale: isMatched ? 0.94 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <div className="absolute inset-0 grid place-items-center rounded-2xl gradient-primary shadow-lg [backface-visibility:hidden]">
                  <Heart className="h-6 w-6 fill-white/30 text-white/60" />
                </div>
                <div
                  className={cn(
                    "absolute inset-0 grid place-items-center rounded-2xl bg-card text-3xl ring-1 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-4xl",
                    isMatched ? "ring-2 ring-success/70" : "ring-white/15",
                  )}
                >
                  {symbol}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      {done && (
        <div className="flex flex-col items-center gap-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-gold" /> {game.points.me} – {game.points.partner}
          </p>
          <Button variant="gradient" onClick={() => setGame(newMemory(swap(game.turn), game.round + 1))}>
            <RotateCcw /> Play again
          </Button>
        </div>
      )}
    </div>
  );
}
