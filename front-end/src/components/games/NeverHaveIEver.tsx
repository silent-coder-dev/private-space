import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpace } from "@/context/space";
import { NEVER_HAVE_I_EVER } from "@/lib/content";
import { seededOrder } from "@/lib/games";
import type { NhieDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc } from "@/sync/hooks";
import { newNhie } from "./new-game";

function Badge({ who, have }: { who: string; have: boolean | null }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", have ? "gradient-primary text-white" : "bg-white/10 text-muted-foreground")}>
      {who}: {have ? "🙋 I have" : "🙅 Never"}
    </span>
  );
}

const EMPTY = newNhie(1);

/** "Never have I ever…": both answer in secret, then you see each other's answer. */
export function NeverHaveIEver() {
  const { profile } = useSpace();
  const [game, setGame] = useSyncedDoc<NhieDoc>("nhie", "doc", EMPTY);
  const order = seededOrder(NEVER_HAVE_I_EVER.length, game.seed);
  const prompt = NEVER_HAVE_I_EVER[order[game.index % order.length]];
  const mine = game.answers.me;
  const theirs = game.answers.partner;
  const reveal = mine !== null && theirs !== null;

  const answer = (have: boolean) => mine === null && setGame((g) => ({ ...g, answers: { ...g.answers, me: have } }));
  const next = () =>
    setGame((g) => {
      if (g.answers.me === null || g.answers.partner === null) return g;
      return {
        ...g,
        index: g.index + 1,
        answers: { me: null, partner: null },
        haves: { me: g.haves.me + (g.answers.me ? 1 : 0), partner: g.haves.partner + (g.answers.partner ? 1 : 0) },
      };
    });

  const verdict = !reveal
    ? mine === null
      ? "Answer honestly — it stays hidden until you've both answered."
      : `Waiting for ${profile.partner}…`
    : mine && theirs
      ? "You've BOTH done it 😏"
      : !mine && !theirs
        ? "Neither of you — so innocent 😇"
        : mine
          ? `Only you have! ${profile.partner} wants the story 👀`
          : `Only ${profile.partner} has! Ask for the story 👀`;

  return (
    <div className="mx-auto max-w-xl space-y-5 text-center">
      <p className="text-xs text-muted-foreground">
        "I have" so far — you: <b className="text-foreground">{game.haves.me}</b> · {profile.partner}: <b className="text-foreground">{game.haves.partner}</b>
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={game.index}
          initial={{ opacity: 0, rotateY: -40, scale: 0.95 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: 40, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          style={{ transformPerspective: 1200 }}
          className="glass-card border-beam space-y-3 p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Never have I ever…</p>
          <p className="font-heading text-2xl font-bold leading-snug">{prompt}</p>
        </motion.div>
      </AnimatePresence>

      <p className={cn("font-heading font-semibold", reveal && "text-gradient")}>{verdict}</p>

      {reveal ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Badge who="You" have={mine} />
          <Badge who={profile.partner} have={theirs} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { have: true, label: "🙋 I have" },
            { have: false, label: "🙅 Never" },
          ].map((o) => (
            <motion.button
              key={o.label}
              type="button"
              onClick={() => answer(o.have)}
              disabled={mine !== null}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "rounded-2xl p-4 font-heading text-lg font-semibold ring-1 transition-colors disabled:opacity-60",
                mine === o.have ? "gradient-primary text-white ring-transparent" : "glass ring-white/10 hover:ring-primary/40",
              )}
            >
              {o.label}
            </motion.button>
          ))}
        </div>
      )}

      <Button variant={reveal ? "gradient" : "ghost"} onClick={next} disabled={!reveal}>
        Next one <ArrowRight />
      </Button>
    </div>
  );
}
