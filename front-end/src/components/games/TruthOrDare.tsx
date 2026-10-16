import { AnimatePresence, motion } from "framer-motion";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DARES, TRUTHS } from "@/lib/content";
import { pickRandom } from "@/lib/games";
import { NO_TOD } from "@/lib/seed";
import type { TodDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc } from "@/sync/hooks";

type Kind = TodDoc["kind"];

/** Truth or dare — the card you draw flips on your partner's screen too. */
export function TruthOrDare() {
  const [card, setCard] = useSyncedDoc<TodDoc | null>("tod", "doc", NO_TOD);

  const draw = (choice: Kind | "random") => {
    const kind: Kind = choice === "random" ? (Math.random() < 0.5 ? "truth" : "dare") : choice;
    const list = kind === "truth" ? TRUTHS : DARES;
    setCard((prev) => ({ kind, text: pickRandom(list, prev?.text), n: (prev?.n ?? 0) + 1 }));
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="[perspective:1200px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={card?.n ?? 0}
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={cn(
              "relative grid min-h-[220px] place-items-center overflow-hidden rounded-3xl p-8 text-center ring-1",
              !card && "glass ring-white/10",
              card?.kind === "truth" && "bg-gradient-to-br from-primary/30 to-primary/5 ring-primary/40",
              card?.kind === "dare" && "bg-gradient-to-br from-secondary/35 to-secondary/5 ring-secondary/40",
            )}
          >
            <div className="absolute inset-0 bg-dots opacity-40" />
            {card ? (
              <div className="relative space-y-4">
                <span
                  className={cn(
                    "inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white",
                    card.kind === "truth" ? "bg-primary" : "bg-secondary",
                  )}
                >
                  {card.kind}
                </span>
                <p className="font-heading text-xl font-semibold leading-snug sm:text-2xl">{card.text}</p>
                <p className="text-xs text-muted-foreground">Card #{card.n}</p>
              </div>
            ) : (
              <div className="relative space-y-3">
                <motion.p
                  className="text-6xl"
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                >
                  🎲
                </motion.p>
                <p className="font-heading text-xl font-semibold">Truth or dare?</p>
                <p className="text-sm text-muted-foreground">Take turns choosing. Be honest — and be brave.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="gradient" size="lg" onClick={() => draw("truth")}>
          Truth
        </Button>
        <Button size="lg" onClick={() => draw("dare")} className="bg-secondary font-heading font-semibold hover:bg-secondary/85">
          Dare
        </Button>
        <Button variant="glass" size="lg" onClick={() => draw("random")}>
          <Dices /> Surprise
        </Button>
      </div>
    </div>
  );
}
