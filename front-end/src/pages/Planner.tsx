import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronDown, Clock, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmojiChoice } from "@/components/forms/EmojiChoice";
import { FormDialog } from "@/components/forms/FormDialog";
import { SlotNumber } from "@/components/fx/SlotNumber";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNow } from "@/hooks/use-now";
import { fireHearts } from "@/lib/burst";
import { EVENT_EMOJIS } from "@/lib/content";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { uid } from "@/lib/storage";
import { dayDistance, formatDate, getCountdown, parseLocalDate, startOfDay, toDateInput } from "@/lib/time";
import type { PlanEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedList } from "@/sync/hooks";

const eventTime = (e: PlanEvent) => parseLocalDate(e.date, e.time).getTime();

const Planner = () => {
  const [events, plans] = useSyncedList<PlanEvent>("events");
  const [params, setParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(params.get("new") === "1");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [showPast, setShowPast] = useState(false);
  const now = useNow(30_000);

  // Opened from quick search with ?new=1 — open the form once, then tidy the URL.
  useEffect(() => {
    if (params.get("new") === "1") setParams({}, { replace: true });
  }, [params, setParams]);

  const todayStart = startOfDay(new Date(now)).getTime();
  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort((a, b) => eventTime(a) - eventTime(b));
    return {
      upcoming: sorted.filter((e) => parseLocalDate(e.date).getTime() >= todayStart),
      past: sorted.filter((e) => parseLocalDate(e.date).getTime() < todayStart).reverse(),
    };
  }, [events, todayStart]);

  const next = upcoming.find((e) => eventTime(e) > now) ?? upcoming[0];

  const plannedDays = useMemo(() => events.map((e) => parseLocalDate(e.date)), [events]);
  const dayKey = selectedDay ? toDateInput(selectedDay) : null;
  const visibleUpcoming = dayKey ? upcoming.filter((e) => e.date === dayKey) : upcoming;

  const addEvent = (event: PlanEvent) => {
    plans.upsert(event);
    setDialogOpen(false);
    fireHearts({ count: 14, emojis: [event.emoji, "✨", "💖"] });
    toast.success(`${event.emoji} ${event.title} added`, { description: formatDate(event.date) });
  };

  const removeEvent = (event: PlanEvent) => {
    plans.remove(event.id);
    toast(`Removed “${event.title}”`, {
      action: { label: "Undo", onClick: () => plans.upsert(event) },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={CalendarIcon}
        title="Planner"
        subtitle="Dates, plans and sweet countdowns"
        actions={
          <Button variant="gradient" onClick={() => setDialogOpen(true)}>
            <Plus /> Add plan
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          {/* Countdown */}
          {next ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-beam glass-card relative overflow-hidden p-6 sm:p-8"
            >
              <div className="absolute inset-0 gradient-soft opacity-70" />
              <div className="relative space-y-5 text-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Next up</p>
                  <p className="mt-1 font-heading text-2xl font-bold">
                    {next.emoji} {next.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(next.date)}
                    {next.time && ` · ${next.time}`}
                  </p>
                </div>
                <LiveCountdown target={eventTime(next)} />
              </div>
            </motion.div>
          ) : (
            <EmptyState
              emoji="📅"
              title="Nothing planned yet"
              text="Add a date night, a call, a trip — anything you're looking forward to."
              action={
                <Button variant="gradient" onClick={() => setDialogOpen(true)}>
                  <Plus /> Plan something
                </Button>
              }
            />
          )}

          {/* Upcoming */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">
                {dayKey ? `On ${formatDate(dayKey, { year: undefined })}` : "Coming up"}
              </h2>
              {dayKey && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(undefined)}>
                  Show all
                </Button>
              )}
            </div>
            <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
              <AnimatePresence initial={false}>
                {visibleUpcoming.map((event) => (
                  <EventRow key={event.id} event={event} now={now} onRemove={() => removeEvent(event)} />
                ))}
              </AnimatePresence>
            </motion.ul>
            {visibleUpcoming.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-muted-foreground">
                {dayKey ? "Nothing on this day yet." : "No upcoming plans."}{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setDialogOpen(true)}>
                  Add one
                </button>
              </p>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && !dayKey && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-2 font-heading text-sm font-semibold text-muted-foreground hover:text-foreground"
                aria-expanded={showPast}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", showPast && "rotate-180")} />
                Past plans ({past.length})
              </button>
              <AnimatePresence initial={false}>
                {showPast && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {past.map((event) => (
                      <EventRow key={event.id} event={event} now={now} past onRemove={() => removeEvent(event)} />
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>

        {/* Calendar */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card mx-auto w-fit p-2 lg:sticky lg:top-4"
        >
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            modifiers={{ planned: plannedDays }}
            modifiersClassNames={{
              planned:
                "relative font-semibold text-primary after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
            }}
            classNames={{ day_today: "bg-white/10 text-foreground" }}
          />
          <p className="px-3 pb-2 text-center text-xs text-muted-foreground">Tap a day to see its plans</p>
        </motion.aside>
      </div>

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Add a plan" description="Something to look forward to together.">
        <EventForm defaultDate={dayKey ?? toDateInput(new Date())} onSave={addEvent} />
      </FormDialog>
    </div>
  );
};

/** Ticks every second on its own, so the rest of the page doesn't have to re-draw. */
function LiveCountdown({ target }: { target: number }) {
  const now = useNow(1000);
  const countdown = getCountdown(target, now);
  if (countdown.done) return <p className="font-heading text-3xl font-bold text-gradient">Happening today! 🎉</p>;
  return (
    <div className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label={`${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes to go`}>
      {[
        { v: countdown.days, l: "Days" },
        { v: countdown.hours, l: "Hours" },
        { v: countdown.minutes, l: "Minutes" },
        { v: countdown.seconds, l: "Seconds" },
      ].map((part) => (
        <div key={part.l} className="rounded-2xl bg-background/50 py-3 ring-1 ring-white/10">
          <SlotNumber value={part.v} className="font-heading text-3xl font-extrabold sm:text-4xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{part.l}</p>
        </div>
      ))}
    </div>
  );
}

function EventRow({ event, now, past, onRemove }: { event: PlanEvent; now: number; past?: boolean; onRemove: () => void }) {
  const isToday = event.date === toDateInput(new Date(now));
  return (
    <motion.li
      layout
      variants={staggerItem}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
      className={cn("glass-card group flex items-center gap-4 p-4", past && "opacity-60")}
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl ring-1 ring-primary/20">
        {event.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading font-semibold">{event.title}</p>
        {event.note && <p className="truncate text-sm text-muted-foreground">{event.note}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(event.date)}
          {event.time && ` · ${event.time}`}
        </p>
      </div>
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline",
          isToday ? "gradient-primary text-white" : "bg-white/5 text-muted-foreground",
        )}
      >
        {dayDistance(event.date, new Date(now))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remove ${event.title}`}
        className="shrink-0 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </motion.li>
  );
}

function EventForm({ defaultDate, onSave }: { defaultDate: string; onSave: (event: PlanEvent) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [emoji, setEmoji] = useState(EVENT_EMOJIS[0]);
  const valid = title.trim().length > 0 && !!date;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: uid(), title: title.trim(), date, time: time || undefined, note: note.trim(), emoji });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ev-title">What's the plan?</Label>
        <Input id="ev-title" autoFocus value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner date" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-date">Date</Label>
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-time">Time (optional)</Label>
          <Input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Pick an emoji</Label>
        <EmojiChoice id="event" options={EVENT_EMOJIS} value={emoji} onChange={setEmoji} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-note">Note (optional)</Label>
        <Textarea id="ev-note" rows={2} value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Book a table by the window" />
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={!valid}>
        Save plan
      </Button>
    </form>
  );
}

export default Planner;
