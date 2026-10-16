import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { MemoryMatch } from "@/components/games/MemoryMatch";
import { TicTacToe } from "@/components/games/TicTacToe";
import { TruthOrDare } from "@/components/games/TruthOrDare";
import { WouldYouRather } from "@/components/games/WouldYouRather";
import { PageHeader } from "@/components/layout/PageHeader";
import { EASE_OUT, SPRING } from "@/lib/motion";
import { usePersistentState } from "@/lib/storage";
import { cn } from "@/lib/utils";

const GAMES = [
  { id: "ttt", title: "Tic-Tac-Toe", emoji: "❤️", Component: TicTacToe },
  { id: "tod", title: "Truth or Dare", emoji: "🎲", Component: TruthOrDare },
  { id: "memory", title: "Memory Match", emoji: "🧠", Component: MemoryMatch },
  { id: "wyr", title: "Would You Rather", emoji: "🤔", Component: WouldYouRather },
];

const Games = () => {
  const [tab, setTab] = usePersistentState("games-tab", "ttt");
  const active = GAMES.find((g) => g.id === tab) ?? GAMES[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader icon={Gamepad2} title="Games" subtitle="Little games for the two of you" />

      <div role="tablist" aria-label="Games" className="glass grid grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-4">
        {GAMES.map((g) => {
          const selected = g.id === active.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(g.id)}
              className={cn(
                "relative rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                selected ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selected && (
                <motion.span layoutId="game-tab" transition={SPRING} className="absolute inset-0 rounded-xl gradient-primary shadow-lg shadow-primary/25" />
              )}
              <span className="relative">
                {g.emoji} {g.title}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={active.id}
          role="tabpanel"
          aria-label={active.title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="glass-card p-5 sm:p-8"
        >
          <active.Component />
        </motion.section>
      </AnimatePresence>
    </div>
  );
};

export default Games;
