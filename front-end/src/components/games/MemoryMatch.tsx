import { motion } from "framer-motion";
import { Heart, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { fireFrom } from "@/lib/burst";
import { MEMORY_SYMBOLS } from "@/lib/content";
import { createMemoryDeck, type MemoryCard } from "@/lib/games";
import { usePersistentState } from "@/lib/storage";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";

export function MemoryMatch() {
  const [deck, setDeck] = useState<MemoryCard[]>(() => createMemoryDeck(MEMORY_SYMBOLS));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [best, setBest] = usePersistentState<number | null>("memory-best", null);
  const gridRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  const won = matched.length === MEMORY_SYMBOLS.length;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!won || finishedAt) return;
    setFinishedAt(Date.now());
    if (best === null || moves < best) setBest(moves);
    fireFrom(gridRef.current, { count: 30 });
  }, [won, finishedAt, best, moves, setBest]);

  const flip = (card: MemoryCard) => {
    if (flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.symbol)) return;
    if (!startedAt) setStartedAt(Date.now());
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next.map((id) => deck[id]);
    timer.current = window.setTimeout(
      () => {
        if (a.symbol === b.symbol) setMatched((m) => [...m, a.symbol]);
        setFlipped([]);
      },
      a.symbol === b.symbol ? 420 : 900,
    );
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setDeck(createMemoryDeck(MEMORY_SYMBOLS));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setStartedAt(null);
    setFinishedAt(null);
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Moves", value: moves },
          { label: "Time", value: <Elapsed startedAt={startedAt} finishedAt={finishedAt} /> },
          { label: "Best", value: best ?? "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-heading text-xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div ref={gridRef} className="grid grid-cols-4 gap-2 sm:gap-3">
        {deck.map((card) => {
          const isMatched = matched.includes(card.symbol);
          const faceUp = isMatched || flipped.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card)}
              aria-label={faceUp ? card.symbol : "Hidden card"}
              className="aspect-square [perspective:800px]"
            >
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
                  {card.symbol}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        {won && (
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 font-heading text-lg font-semibold text-gradient"
          >
            <Trophy className="h-5 w-5 text-gold" /> All pairs found in {moves} moves!
          </motion.p>
        )}
        <Button variant={won ? "gradient" : "ghost"} onClick={restart}>
          <RotateCcw /> {won ? "Play again" : "Shuffle & restart"}
        </Button>
      </div>
    </div>
  );
}

/** The game clock lives in its own tiny component, so only it re-draws every second. */
function Elapsed({ startedAt, finishedAt }: { startedAt: number | null; finishedAt: number | null }) {
  const now = useNow(startedAt && !finishedAt ? 1000 : 60_000);
  const seconds = startedAt ? Math.floor(((finishedAt ?? now) - startedAt) / 1000) : 0;
  return <>{formatDuration(Math.max(0, seconds))}</>;
}
