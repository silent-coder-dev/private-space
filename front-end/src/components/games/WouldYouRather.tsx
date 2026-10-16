import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WOULD_YOU_RATHER } from "@/lib/content";
import { shuffle } from "@/lib/games";
import { cn } from "@/lib/utils";

export function WouldYouRather() {
  const [order, setOrder] = useState(() => shuffle(WOULD_YOU_RATHER));
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<0 | 1 | null>(null);
  const pair = order[index];

  const next = () => {
    setChoice(null);
    if (index + 1 >= order.length) {
      setOrder(shuffle(WOULD_YOU_RATHER));
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className="text-center text-sm text-muted-foreground">
        Question {index + 1} of {order.length} — answer, then ask your person why.
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="relative grid gap-3 sm:grid-cols-2 sm:gap-5"
        >
          {pair.map((option, i) => {
            const chosen = choice === i;
            const other = choice !== null && !chosen;
            return (
              <motion.button
                key={option}
                type="button"
                onClick={() => setChoice(i as 0 | 1)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                animate={{ scale: chosen ? 1.03 : 1, opacity: other ? 0.45 : 1 }}
                className={cn(
                  "relative grid min-h-[140px] place-items-center rounded-3xl p-6 text-center font-heading text-lg font-semibold ring-1 transition-colors",
                  chosen ? "gradient-primary text-white ring-transparent glow-primary" : "glass ring-white/10 hover:ring-primary/40",
                )}
              >
                {chosen && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/25"
                  >
                    <Check className="h-4 w-4" />
                  </motion.span>
                )}
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
        <Button variant={choice === null ? "ghost" : "gradient"} onClick={next}>
          {choice === null ? "Skip" : "Next question"} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
