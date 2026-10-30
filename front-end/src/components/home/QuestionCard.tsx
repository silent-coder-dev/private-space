import { AnimatePresence, motion } from "framer-motion";
import { History, MessageCircleQuestion, Pencil, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useSpace } from "@/context/space";
import { DAILY_QUESTIONS } from "@/lib/content";
import { EMPTY_DAILY } from "@/lib/seed";
import { utcDayKey, utcDayNumber } from "@/lib/time";
import type { DailyDoc } from "@/lib/types";
import { useEngine, useSyncedDoc } from "@/sync/hooks";

const KEEP_DAYS = 60;
const questionFor = (day: number) => DAILY_QUESTIONS[day % DAILY_QUESTIONS.length];

/**
 * Question of the day: the same question on both phones (by UTC date). You each answer;
 * your partner's answer shows only after you've answered too.
 */
export function QuestionCard() {
  const { profile } = useSpace();
  const engine = useEngine();
  const [mine, setMine] = useSyncedDoc<DailyDoc>("daily", "me", EMPTY_DAILY);
  const [theirs] = useSyncedDoc<DailyDoc>("daily", "partner", EMPTY_DAILY);
  const day = utcDayNumber(engine.now());
  const key = utcDayKey(day);
  const myAnswer = mine.answers?.[key];
  const theirAnswer = theirs.answers?.[key];
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    setMine((prev) => {
      const answers = { ...(prev.answers ?? {}), [key]: { text, at: engine.now() } };
      // Keep only the last couple of months.
      for (const k of Object.keys(answers).sort().slice(0, -KEEP_DAYS)) delete answers[k];
      return { answers };
    });
    setEditing(false);
    toast.success(theirAnswer ? `Answer shared — read ${profile.partner}'s 💬` : `Answer shared — ${profile.partner} sees it once they answer`);
  };

  const showForm = !myAnswer || editing;
  const pastDays = Array.from({ length: 14 }, (_, i) => day - 1 - i).filter((d) => mine.answers?.[utcDayKey(d)]);

  return (
    <section className="glass-card flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <MessageCircleQuestion className="h-4 w-4" /> Question of the day
        </p>
        {pastDays.length > 0 && (
          <button type="button" onClick={() => setHistory(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <History className="h-3.5 w-3.5" /> Past answers
          </button>
        )}
      </div>
      <p className="font-heading text-xl font-bold leading-snug sm:text-2xl">{questionFor(day)}</p>

      <AnimatePresence mode="wait" initial={false}>
        {showForm ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="mt-auto space-y-2"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 280))}
              placeholder="Your answer…"
              aria-label="Your answer"
              rows={2}
              className="resize-none rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  save();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {theirAnswer ? `${profile.partner} answered ✓ — answer to see it` : `${profile.partner} sees your answer once they answer too`}
              </p>
              <Button type="submit" variant="gradient" size="sm" disabled={!draft.trim()}>
                <Send /> Share
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="answers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-auto space-y-2.5">
            <Answer who="me" name="You" text={myAnswer?.text} />
            <Answer who="partner" name={profile.partner} text={theirAnswer?.text} waiting={`Waiting for ${profile.partner}'s answer…`} />
            <button
              type="button"
              onClick={() => {
                setDraft(myAnswer?.text ?? "");
                setEditing(true);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" /> Edit my answer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent className="max-h-[85svh] max-w-lg overflow-y-auto border-white/10 bg-popover/95">
          <DialogHeader>
            <DialogTitle className="font-heading">Past answers</DialogTitle>
            <DialogDescription>The last two weeks of questions you answered.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pastDays.map((d) => {
              const k = utcDayKey(d);
              return (
                <div key={k} className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] text-muted-foreground">{new Date(d * 86_400_000).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="font-semibold">{questionFor(d)}</p>
                  <Answer who="me" name="You" text={mine.answers?.[k]?.text} />
                  <Answer who="partner" name={profile.partner} text={theirs.answers?.[k]?.text} waiting="No answer that day" />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Answer({ who, name, text, waiting }: { who: "me" | "partner"; name: string; text?: string; waiting?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <UserAvatar who={who} size="sm" />
      <div className={`min-w-0 flex-1 rounded-2xl px-3 py-2 text-sm ${who === "me" ? "bg-primary/15" : "bg-white/[0.06]"}`}>
        <p className="text-[11px] font-semibold text-muted-foreground">{name}</p>
        <p className={text ? "whitespace-pre-wrap break-words" : "italic text-muted-foreground"}>{text ?? waiting}</p>
      </div>
    </div>
  );
}
