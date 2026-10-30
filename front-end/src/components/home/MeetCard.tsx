import { CalendarHeart, Pencil, Plane } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlotNumber } from "@/components/fx/SlotNumber";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { NO_MEET } from "@/lib/seed";
import { getCountdown } from "@/lib/time";
import type { MeetDoc } from "@/lib/types";
import { useSyncedDoc } from "@/sync/hooks";

const pad = (n: number) => String(n).padStart(2, "0");
/** A timestamp as the value of a "datetime-local" input (local time). */
const toLocalInput = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "Next time together": a shared countdown either of you can set. */
export function MeetCard() {
  const { profile } = useSpace();
  const [meet, setMeet] = useSyncedDoc<MeetDoc>("meet", "doc", NO_MEET);
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [label, setLabel] = useState("");
  const upcoming = !!meet.at && meet.at > Date.now();
  const now = useNow(upcoming ? 1000 : 60_000);
  const left = meet.at ? getCountdown(meet.at, now) : null;
  const togetherToday = !!meet.at && meet.at <= now && now - meet.at < 24 * 3_600_000;

  const edit = () => {
    setWhen(meet.at && meet.at > Date.now() ? toLocalInput(meet.at) : "");
    setLabel(meet.label);
    setOpen(true);
  };
  const save = () => {
    const at = new Date(when).getTime();
    if (!Number.isFinite(at) || at <= Date.now()) return toast.error("Pick a time in the future.");
    setMeet({ at, label: label.trim().slice(0, 40) });
    setOpen(false);
    toast.success(`Countdown set — ${profile.partner} sees it too ⏳`);
  };

  return (
    <section className="glass-card relative flex h-full flex-col gap-3 overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl" />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <CalendarHeart className="h-4 w-4" /> Next time together
        </p>
        {(upcoming || togetherToday) && (
          <button type="button" onClick={edit} aria-label="Change the date" className="text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {upcoming && left ? (
        <>
          <p className="truncate font-heading text-lg font-semibold">{meet.label || `Seeing ${profile.partner}`}</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: left.days, l: "days" },
              { v: left.hours, l: "hrs" },
              { v: left.minutes, l: "min" },
              { v: left.seconds, l: "sec" },
            ].map((p) => (
              <div key={p.l} className="rounded-xl bg-white/[0.06] py-2 text-center ring-1 ring-white/10">
                <SlotNumber value={p.v} className="font-heading text-xl font-bold" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-auto text-xs text-muted-foreground">{new Date(meet.at as number).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
        </>
      ) : togetherToday ? (
        <div className="my-auto space-y-1 text-center">
          <p className="text-4xl">💞</p>
          <p className="font-heading text-lg font-semibold">Together today!</p>
          <p className="text-xs text-muted-foreground">{meet.label || "Enjoy every minute."}</p>
        </div>
      ) : (
        <div className="my-auto space-y-3 text-center">
          <Plane className="mx-auto h-9 w-9 text-primary/80" />
          <p className="text-sm text-muted-foreground">When do you see each other next? Start a countdown you both can watch.</p>
          <Button variant="gradient" size="sm" onClick={edit}>
            <CalendarHeart /> Set a date
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-popover/95">
          <DialogHeader>
            <DialogTitle className="font-heading">Next time together</DialogTitle>
            <DialogDescription>{profile.partner} sees the same countdown.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="meet-when">When</Label>
              <Input id="meet-when" type="datetime-local" value={when} min={toLocalInput(Date.now())} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meet-label">What (optional)</Label>
              <Input id="meet-label" value={label} maxLength={40} placeholder="Dinner date in Goa ✈️" onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {meet.at && (
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setMeet(NO_MEET);
                  setOpen(false);
                }}
              >
                Remove
              </Button>
            )}
            <Button variant="gradient" onClick={save} disabled={!when}>
              Start countdown
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
