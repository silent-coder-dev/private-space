import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpace } from "@/context/space";
import { fireFrom } from "@/lib/burst";
import { QUIZ_QUESTIONS } from "@/lib/content";
import { seededOrder } from "@/lib/games";
import type { QuizDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { swap } from "@/sync/engine";
import { useSyncedDoc } from "@/sync/hooks";
import { newQuiz } from "./new-game";

const EMPTY = newQuiz("me", 1);

/**
 * How well do you know me? Each round one of you answers a question about yourself (in secret)
 * and the other guesses. A right guess scores a point. Then you swap.
 */
export function CoupleQuiz() {
  const { profile } = useSpace();
  const [game, setGame] = useSyncedDoc<QuizDoc>("quiz", "doc", EMPTY);
  const ref = useRef<HTMLDivElement>(null);
  const order = seededOrder(QUIZ_QUESTIONS.length, game.seed);
  const question = QUIZ_QUESTIONS[order[game.index % order.length]];
  const aboutMe = game.subject === "me";
  const subjectName = aboutMe ? "you" : profile.partner;
  const myPick = aboutMe ? game.answer : game.guess;
  const reveal = game.answer !== null && game.guess !== null;
  const correct = reveal && game.answer === game.guess;

  const roundId = reveal ? String(game.index) : "";
  const celebrated = useRef(roundId);
  useEffect(() => {
    if (!roundId || celebrated.current === roundId) return;
    celebrated.current = roundId;
    if (correct) fireFrom(ref.current, { count: 24, emojis: ["💞", "✨", "🎯"] });
  }, [roundId, correct]);

  const choose = (i: number) => {
    if (myPick !== null) return;
    setGame((g) => (g.subject === "me" ? { ...g, answer: i } : { ...g, guess: i }));
  };

  // Score the round for whoever guessed, then swap roles.
  const next = () =>
    setGame((g) => {
      if (g.answer === null || g.guess === null) return g;
      const guesser = swap(g.subject);
      const hit = g.answer === g.guess;
      return { ...g, index: g.index + 1, subject: guesser, answer: null, guess: null, points: hit ? { ...g.points, [guesser]: g.points[guesser] + 1 } : g.points };
    });

  const hint = reveal
    ? correct
      ? aboutMe
        ? `${profile.partner} knows you so well 💞`
        : "You know them so well 💞"
      : aboutMe
        ? `Not quite — ${profile.partner} guessed something else 😄`
        : "Not quite! Now you know 😄"
    : aboutMe
      ? myPick === null
        ? `Pick your real answer — ${profile.partner} has to guess it.`
        : `Waiting for ${profile.partner} to guess…`
      : myPick === null
        ? `Guess what ${profile.partner} picks!`
        : `Waiting for ${profile.partner} to answer…`;

  return (
    <div ref={ref} className="mx-auto max-w-xl space-y-5">
      <div className="flex justify-center gap-3 text-xs text-muted-foreground">
        <span className="glass rounded-full px-3 py-1">
          You guessed right: <b className="text-foreground">{game.points.me}</b>
        </span>
        <span className="glass rounded-full px-3 py-1">
          {profile.partner}: <b className="text-foreground">{game.points.partner}</b>
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={game.index}
          initial={{ opacity: 0, rotateX: -30, y: 16 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          exit={{ opacity: 0, rotateX: 30, y: -16 }}
          transition={{ duration: 0.4 }}
          style={{ transformPerspective: 1200 }}
          className="glass-card space-y-1 p-6 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">About {subjectName}</p>
          <p className="font-heading text-2xl font-bold">{question.q}</p>
        </motion.div>
      </AnimatePresence>

      <p className={cn("text-center text-sm", reveal ? "font-heading font-semibold text-gradient" : "text-muted-foreground")}>{hint}</p>

      <div role="group" aria-label="Answers" className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const isAnswer = reveal && game.answer === i;
          const isGuess = reveal && game.guess === i;
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => choose(i)}
              disabled={myPick !== null}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex items-center justify-between gap-2 rounded-2xl p-4 text-left font-medium ring-1 transition-colors",
                !reveal && myPick === i && "gradient-primary text-white ring-transparent",
                !reveal && myPick !== i && "glass ring-white/10 hover:ring-primary/40 disabled:opacity-60",
                reveal && isAnswer && "bg-success/15 ring-2 ring-success",
                reveal && isGuess && !isAnswer && "bg-destructive/10 ring-2 ring-destructive/70",
                reveal && !isAnswer && !isGuess && "glass opacity-50 ring-white/10",
              )}
            >
              <span>{option}</span>
              {isAnswer && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Check className="h-4 w-4" /> answer
                </span>
              )}
              {isGuess && !isAnswer && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <X className="h-4 w-4" /> guess
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button variant={reveal ? "gradient" : "ghost"} onClick={next} disabled={!reveal}>
          Next question <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
