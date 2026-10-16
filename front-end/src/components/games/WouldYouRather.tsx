import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpace } from "@/context/space";
import { WOULD_YOU_RATHER } from "@/lib/content";
import type { WyrDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc } from "@/sync/hooks";

export const newWyr = (index = 0, seed = Math.floor(Math.random() * 1e9)): WyrDoc => ({ index, seed, picks: { me: null, partner: null } });
const EMPTY: WyrDoc = { index: 0, seed: 1, picks: { me: null, partner: null } };

/** Same shuffled order on both phones, worked out from a shared seed. */
const orderFor = (seed: number) => {
  const order = WOULD_YOU_RATHER.map((_, i) => i);
  let s = seed;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/** Both of you pick secretly; answers are shown when both have chosen. */
export function WouldYouRather() {
  const { profile } = useSpace();
  const [game, setGame] = useSyncedDoc<WyrDoc>("wyr", "doc", EMPTY);
  const order = orderFor(game.seed);
  const pair = WOULD_YOU_RATHER[order[game.index % order.length]];
  const mine = game.picks.me;
  const theirs = game.picks.partner;
  const reveal = mine !== null && theirs !== null;

  const choose = (i: number) => !reveal && setGame((g) => ({ ...g, picks: { ...g.picks, me: i } }));
  const next = () => setGame((g) => ({ ...g, index: g.index + 1, picks: { me: null, partner: null } }));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className="text-center text-sm text-muted-foreground">
        {reveal ? (mine === theirs ? "💞 You both picked the same!" : "😄 Different picks — talk about it!") : mine === null ? "Pick one. Your answer stays hidden until you both choose." : `Waiting for ${profile.partner} to choose…`}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={game.index}
          initial={{ opacity: 0, rotateY: -30, x: 40 }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          exit={{ opacity: 0, rotateY: 30, x: -40 }}
          transition={{ duration: 0.35 }}
          style={{ transformPerspective: 1200 }}
          className="relative grid gap-3 sm:grid-cols-2 sm:gap-5"
        >
          {pair.map((option, i) => {
            const chosenByMe = mine === i;
            const chosenByThem = reveal && theirs === i;
            return (
              <motion.button
                key={option}
                type="button"
                onClick={() => choose(i)}
                whileHover={!reveal ? { y: -4, rotateX: 6 } : undefined}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative grid min-h-[140px] place-items-center rounded-3xl p-6 text-center font-heading text-lg font-semibold ring-1 transition-colors",
                  chosenByMe ? "gradient-primary text-white ring-transparent glow-primary" : "glass ring-white/10 hover:ring-primary/40",
                  chosenByThem && !chosenByMe && "ring-2 ring-secondary",
                )}
              >
                <span className="absolute right-3 top-3 flex gap-1 text-xs">
                  {chosenByMe && (
                    <span className="flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5">
                      <Check className="h-3 w-3" /> You
                    </span>
                  )}
                  {chosenByThem && <span className="rounded-full bg-secondary px-2 py-0.5 text-white">{profile.partner}</span>}
                </span>
                {option}
              </motion.button>
            );
          })}
          <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-background font-heading text-xs font-bold text-muted-foreground ring-1 ring-white/15">
            OR
          </span>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-center">
        <Button variant={reveal ? "gradient" : "ghost"} onClick={next} disabled={!reveal}>
          Next question <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
