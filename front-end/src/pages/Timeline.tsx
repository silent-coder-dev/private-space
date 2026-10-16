import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Clock, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmojiChoice } from "@/components/forms/EmojiChoice";
import { FormDialog } from "@/components/forms/FormDialog";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSpace } from "@/context/space";
import { fireHearts } from "@/lib/burst";
import { MEMORY_EMOJIS } from "@/lib/content";
import { EASE_OUT } from "@/lib/motion";
import { uid } from "@/lib/storage";
import { daysBetween, formatDate, parseLocalDate, toDateInput } from "@/lib/time";
import type { Milestone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedList } from "@/sync/hooks";

const Timeline = () => {
  const { profile } = useSpace();
  const [milestones, story] = useSyncedList<Milestone>("milestones");
  const [params, setParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(params.get("new") === "1");
  const listRef = useRef<HTMLOListElement>(null);
  // The app scrolls inside <main id="main">, so the line follows that scroll area.
  const containerRef = useRef<HTMLElement | null>(typeof document !== "undefined" ? document.getElementById("main") : null);

  useEffect(() => {
    if (params.get("new") === "1") setParams({}, { replace: true });
  }, [params, setParams]);

  const sorted = useMemo(() => [...milestones].sort((a, b) => a.date.localeCompare(b.date)), [milestones]);
  const start = parseLocalDate(profile.since);

  const { scrollYProgress } = useScroll({
    target: listRef,
    container: containerRef.current ? containerRef : undefined,
    offset: ["start 80%", "end 60%"],
  });
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  const addMilestone = (m: Milestone) => {
    story.upsert(m);
    setDialogOpen(false);
    fireHearts({ count: 16, emojis: [m.emoji, "✨", "💖"] });
    toast.success(`${m.emoji} “${m.title}” added to your story`);
  };

  const removeMilestone = (m: Milestone) => {
    story.remove(m.id);
    toast(`Removed “${m.title}”`, {
      action: { label: "Undo", onClick: () => story.upsert(m) },
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Clock}
        title="Our Timeline"
        subtitle="The milestones of your love story"
        actions={
          <Button variant="gradient" onClick={() => setDialogOpen(true)}>
            <Plus /> Add memory
          </Button>
        }
      />

      {sorted.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 text-center"
        >
          {[
            { value: sorted.length, label: sorted.length === 1 ? "memory" : "memories" },
            { value: formatDate(sorted[0].date, { weekday: undefined, day: undefined }), label: "first memory" },
            { value: Math.max(0, daysBetween(start, new Date())).toLocaleString(), label: "days of us" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 sm:p-4">
              <p className="truncate font-heading text-lg font-bold text-gradient sm:text-2xl">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          emoji="📸"
          title="Your story starts here"
          text="Add the moments that matter — the first hello, the first trip, the big yes."
          action={
            <Button variant="gradient" onClick={() => setDialogOpen(true)}>
              <Plus /> Add the first memory
            </Button>
          }
        />
      ) : (
        <div className="relative">
          {/* Base line + the glowing line that draws as you scroll */}
          <div className="absolute bottom-0 left-6 top-0 -ml-px w-0.5 rounded-full bg-white/10 md:left-1/2" />
          <motion.div
            style={{ scaleY: lineScale }}
            className="absolute bottom-0 left-6 top-0 -ml-px w-0.5 origin-top rounded-full gradient-primary shadow-[0_0_12px_hsl(var(--primary))] md:left-1/2"
          />

          <ol ref={listRef} className="relative space-y-8 py-4">
            <AnimatePresence initial={false}>
              {sorted.map((m, i) => {
                const left = i % 2 === 0;
                const day = daysBetween(start, parseLocalDate(m.date)) + 1;
                return (
                  <motion.li
                    key={m.id}
                    layout
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative md:grid md:grid-cols-2"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="absolute left-6 top-5 z-10 -ml-6 grid h-12 w-12 place-items-center rounded-full bg-card text-xl ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.4)] md:left-1/2"
                    >
                      {m.emoji}
                    </motion.span>
                    <motion.div
                      initial={{ opacity: 0, x: left ? -40 : 40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                      className={cn("pl-16 md:pl-0", left ? "md:col-start-1 md:pr-12" : "md:col-start-2 md:pl-12")}
                    >
                      <SpotlightCard className={cn("group p-5", left && "md:text-right")}>
                        <div className={cn("flex items-center gap-2", left && "md:flex-row-reverse")}>
                          <p className="text-xs font-semibold text-primary">{formatDate(m.date, { weekday: undefined })}</p>
                          {day > 0 && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">Day {day.toLocaleString()}</span>}
                        </div>
                        <p className="mt-1 font-heading text-lg font-semibold">{m.title}</p>
                        {m.desc && <p className="text-sm text-muted-foreground">{m.desc}</p>}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMilestone(m)}
                          aria-label={`Remove ${m.title}`}
                          className={cn(
                            "!absolute top-2 h-8 w-8 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                            left ? "right-2 md:left-2 md:right-auto" : "right-2",
                          )}
                        >
                          <Trash2 />
                        </Button>
                      </SpotlightCard>
                    </motion.div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative flex flex-col items-start gap-3 pl-16 pt-4 md:items-center md:pl-0"
          >
            <span className="absolute left-6 top-4 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full gradient-primary text-xl glow-primary md:hidden">
              💞
            </span>
            <span className="hidden text-3xl md:block">💞</span>
            <p className="font-script text-2xl text-muted-foreground">…and the story continues</p>
            <Button variant="glass" onClick={() => setDialogOpen(true)}>
              <Plus /> Add the next chapter
            </Button>
          </motion.div>
        </div>
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Add a memory" description="A moment you never want to forget.">
        <MilestoneForm onSave={addMilestone} />
      </FormDialog>
    </div>
  );
};

function MilestoneForm({ onSave }: { onSave: (m: Milestone) => void }) {
  const today = toDateInput(new Date());
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState(MEMORY_EMOJIS[0]);
  const valid = !!title.trim() && !!date;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: uid(), title: title.trim(), date, desc: desc.trim(), emoji });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="m-title">What happened?</Label>
        <Input id="m-title" autoFocus value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Our first concert" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-date">When?</Label>
        <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Pick an emoji</Label>
        <EmojiChoice id="memory" options={MEMORY_EMOJIS} value={emoji} onChange={setEmoji} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-desc">A few words (optional)</Label>
        <Textarea id="m-desc" rows={3} value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} placeholder="We sang every single song…" />
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={!valid}>
        Save memory
      </Button>
    </form>
  );
}

export default Timeline;
