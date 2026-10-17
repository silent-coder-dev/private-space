import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpace } from "@/context/space";
import { fireFrom } from "@/lib/burst";
import { rpsResult } from "@/lib/games";
import type { RpsDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc } from "@/sync/hooks";
import { newRps } from "./new-game";

const MOVES = [
  { emoji: "🪨", name: "Rock" },
  { emoji: "📄", name: "Paper" },
  { emoji: "✂️", name: "Scissors" },
];
/** First to this many round wins takes the match. */
const TARGET = 3;

/** One player's card: face down until both have picked, then it flips to show the move. */
function MoveCard({ who, move, reveal }: { who: string; move: number | null; reveal: boolean }) {
  return (
    <div className="space-y-2 text-center [perspective:800px]">
      <p className="truncate text-xs text-muted-foreground">{who}</p>
      <motion.div
        initial={false}
        animate={{ rotateY: reveal ? 0 : 180 }}
        transition={{ duration: 0.5 }}
        className={cn("mx-auto grid h-28 w-24 place-items-center rounded-2xl text-5xl shadow-xl ring-1 sm:h-32 sm:w-28", reveal ? "glass ring-white/15" : "gradient-primary ring-transparent")}
      >
        {reveal && move !== null ? MOVES[move].emoji : <span className="text-3xl text-white/90">{move !== null ? "✓" : "?"}</span>}
      </motion.div>
    </div>
  );
}

const EMPTY = newRps();

/** Both pick in secret; the moves are shown together. First to 3 wins the match. */
export function RockPaperScissors() {
  const { profile } = useSpace();
  const [game, setGame] = useSyncedDoc<RpsDoc>("rps", "doc", EMPTY);
  const ref = useRef<HTMLDivElement>(null);
  const history = game.history ?? [];
  const mine = game.picks.me;
  const theirs = game.picks.partner;
  const reveal = mine !== null && theirs !== null;
  const outcome = reveal ? rpsResult(mine, theirs) : null;

  const score = useMemo(() => {
    const s = { me: 0, partner: 0 };
    for (const h of history) {
      const r = rpsResult(h.me, h.partner);
      if (r === 1) s.me++;
      if (r === -1) s.partner++;
    }
    if (outcome === 1) s.me++;
    if (outcome === -1) s.partner++;
    return s;
  }, [history, outcome]);
  const champion = score.me >= TARGET ? "me" : score.partner >= TARGET ? "partner" : null;

  const roundId = reveal ? `${game.round}` : "";
  const celebrated = useRef(roundId);
  useEffect(() => {
    if (!roundId || celebrated.current === roundId) return;
    celebrated.current = roundId;
    if (champion) fireFrom(ref.current, { count: 32, emojis: ["🏆", "🎉", "💖"] });
    else if (outcome === 1) fireFrom(ref.current, { count: 12, emojis: ["✨", "💖"] });
  }, [roundId, champion, outcome]);

  const pick = (i: number) => {
    if (mine !== null) return;
    setGame((g) => ({ ...g, picks: { ...g.picks, me: i } }));
  };

  const next = () =>
    setGame((g) => {
      const { me, partner } = g.picks;
      if (me === null || partner === null) return g;
      return { round: g.round + 1, picks: { me: null, partner: null }, history: [...(g.history ?? []), { me, partner }] };
    });

  const status = champion
    ? `🏆 ${champion === "me" ? "You win" : `${profile.partner} wins`} the match!`
    : reveal
      ? outcome === 0
        ? "Same move — it's a draw 🤝"
        : outcome === 1
          ? `You win this round! ${MOVES[mine].emoji} beats ${MOVES[theirs].emoji}`
          : `${profile.partner} wins this round! ${MOVES[theirs].emoji} beats ${MOVES[mine].emoji}`
      : mine === null
        ? "Pick your move — it stays hidden until you've both picked."
        : `Waiting for ${profile.partner} to pick…`;

  return (
    <div ref={ref} className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-center gap-6 font-heading text-3xl font-bold">
        <span>{score.me}</span>
        <span className="text-sm font-medium text-muted-foreground">first to {TARGET}</span>
        <span>{score.partner}</span>
      </div>

      <div className="flex items-start justify-center gap-6">
        <MoveCard who={`You (${profile.me})`} move={mine} reveal={reveal} />
        <span className="mt-14 font-heading text-sm font-bold text-muted-foreground">VS</span>
        <MoveCard who={profile.partner} move={theirs} reveal={reveal} />
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={cn("text-center font-heading font-semibold", (reveal || champion) && "text-gradient")}>
          {status}
        </motion.p>
      </AnimatePresence>

      {!reveal && (
        <div className="grid grid-cols-3 gap-3">
          {MOVES.map((m, i) => (
            <motion.button
              key={m.name}
              type="button"
              onClick={() => pick(i)}
              disabled={mine !== null}
              whileHover={mine === null ? { y: -4, rotateX: 8 } : undefined}
              whileTap={{ scale: 0.95 }}
              aria-label={m.name}
              className={cn(
                "glass flex flex-col items-center gap-1 rounded-2xl p-4 ring-1 transition-colors disabled:opacity-60",
                mine === i ? "ring-2 ring-primary" : "ring-white/10 hover:ring-primary/40",
              )}
            >
              <span className="text-4xl">{m.emoji}</span>
              <span className="text-xs text-muted-foreground">{m.name}</span>
            </motion.button>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        {champion ? (
          <Button variant="gradient" onClick={() => setGame(newRps())}>
            <RotateCcw /> New match
          </Button>
        ) : (
          reveal && (
            <Button variant="gradient" onClick={next}>
              Next round <ArrowRight />
            </Button>
          )
        )}
      </div>
    </div>
  );
}
