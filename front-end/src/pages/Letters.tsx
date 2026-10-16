import { AnimatePresence, motion } from "framer-motion";
import { Lock, Mail, MailOpen, PenLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/forms/FormDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { fireHearts } from "@/lib/burst";
import { SPRING, staggerContainer, staggerItem } from "@/lib/motion";
import { uid } from "@/lib/storage";
import { daysFromToday, formatCountdownShort, formatDate, getCountdown, nextAnniversary, parseLocalDate, toDateInput } from "@/lib/time";
import type { Letter } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedList } from "@/sync/hooks";

type Filter = "all" | "ready" | "locked";

const unlockTime = (l: Letter) => parseLocalDate(l.unlockOn).getTime();

const Letters = () => {
  const { profile } = useSpace();
  const [letters, mail] = useSyncedList<Letter>("letters");
  const [params, setParams] = useSearchParams();
  const [composeOpen, setComposeOpen] = useState(params.get("compose") === "1");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const now = useNow(30_000);

  useEffect(() => {
    if (params.get("compose") === "1") setParams({}, { replace: true });
  }, [params, setParams]);

  const sorted = useMemo(() => [...letters].sort((a, b) => unlockTime(a) - unlockTime(b)), [letters]);
  const isLocked = (l: Letter) => unlockTime(l) > now;
  const counts = {
    all: letters.length,
    ready: letters.filter((l) => !isLocked(l)).length,
    locked: letters.filter(isLocked).length,
  };
  const visible = sorted.filter((l) => filter === "all" || (filter === "locked" ? isLocked(l) : !isLocked(l)));
  const opened = letters.find((l) => l.id === openId) ?? null;

  const openLetter = (letter: Letter) => {
    if (isLocked(letter)) {
      toast(`🔒 Opens in ${formatCountdownShort(getCountdown(unlockTime(letter), now))}`, {
        description: `Unlocks on ${formatDate(letter.unlockOn)}. No peeking!`,
      });
      return;
    }
    setOpenId(letter.id);
    // Only opening a letter written *to you* marks it as read (your partner sees "Read").
    if (!letter.readAt && letter.from === "partner") {
      mail.upsert({ ...letter, readAt: Date.now() });
      fireHearts({ count: 20, emojis: ["💌", "❤️", "✨"] });
    }
  };

  const saveLetter = (letter: Letter) => {
    mail.upsert(letter);
    setComposeOpen(false);
    fireHearts({ count: 16, emojis: ["💌", "💖"] });
    toast.success(
      letter.unlockOn <= toDateInput(new Date()) ? "Letter sent 💌" : `Letter sealed until ${formatDate(letter.unlockOn)} 🔒`,
    );
  };

  const deleteLetter = (letter: Letter) => {
    mail.remove(letter.id);
    setOpenId(null);
    toast(`Deleted “${letter.title}”`, {
      action: { label: "Undo", onClick: () => mail.upsert(letter) },
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Mail}
        title="Love Letters"
        subtitle="Write today, open on the perfect day"
        actions={
          <Button variant="gradient" onClick={() => setComposeOpen(true)}>
            <PenLine /> Write a letter
          </Button>
        }
      />

      <div className="glass inline-flex gap-1 rounded-2xl p-1" role="tablist" aria-label="Filter letters">
        {(["all", "ready", "locked"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "relative rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors",
              filter === f ? "text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filter === f && <motion.span layoutId="letter-filter" transition={SPRING} className="absolute inset-0 rounded-xl gradient-primary" />}
            <span className="relative">
              {f} <span className="opacity-70">({counts[f]})</span>
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          emoji="💌"
          title={filter === "locked" ? "No sealed letters" : filter === "ready" ? "Nothing to open yet" : "No letters yet"}
          text="Write something sweet and choose the day it can be opened."
          action={
            <Button variant="gradient" onClick={() => setComposeOpen(true)}>
              <PenLine /> Write one now
            </Button>
          }
        />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((letter) => {
              const locked = isLocked(letter);
              const unread = !locked && !letter.readAt && letter.from === "partner";
              return (
                <motion.button
                  key={letter.id}
                  layout
                  variants={staggerItem}
                  exit={{ opacity: 0, scale: 0.9 }}
                  type="button"
                  onClick={() => openLetter(letter)}
                  whileHover={{ y: -6, rotate: locked ? 0 : -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "glass-card group relative flex flex-col overflow-hidden p-5 text-left",
                    unread && "border-beam",
                  )}
                >
                  {/* Envelope flap */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 top-0 block h-16 [clip-path:polygon(0_0,100%_0,50%_100%)]",
                      locked ? "bg-white/[0.04]" : "bg-gradient-to-b from-primary/25 to-secondary/10",
                    )}
                  />
                  <span className="relative mb-5 flex items-start justify-between">
                    <motion.span
                      className={cn(
                        "grid h-12 w-12 place-items-center rounded-2xl ring-1",
                        locked ? "bg-muted ring-white/10" : "gradient-primary ring-transparent glow-primary",
                      )}
                      animate={locked ? undefined : { rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 0.8, repeat: unread ? Infinity : 0, repeatDelay: 2 }}
                    >
                      {locked ? <Lock className="h-5 w-5 text-muted-foreground" /> : <MailOpen className="h-5 w-5 text-white" />}
                    </motion.span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        locked ? "bg-white/5 text-muted-foreground" : unread ? "bg-primary/20 text-primary" : "bg-success/10 text-success",
                      )}
                    >
                      {locked
                        ? `Opens in ${formatCountdownShort(getCountdown(unlockTime(letter), now))}`
                        : unread
                          ? "New ✨"
                          : letter.from === "me"
                            ? letter.readAt
                              ? `Read by ${profile.partner} ✓`
                              : "Delivered"
                            : "Read"}
                    </span>
                  </span>
                  <span className="relative block font-heading font-semibold">{letter.title}</span>
                  <span className="relative block text-xs text-muted-foreground">
                    From {letter.from === "me" ? profile.me : profile.partner} · {locked ? "unlocks" : "opened"}{" "}
                    {formatDate(letter.unlockOn, { weekday: undefined })}
                  </span>
                  <span
                    aria-hidden={locked}
                    className={cn(
                      "relative mt-3 line-clamp-2 font-script text-xl leading-snug text-foreground/80",
                      locked && "select-none blur-[5px]",
                    )}
                  >
                    {locked ? "This letter is sealed until its special day. No peeking, my love." : letter.content}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Reading a letter */}
      <Dialog open={!!opened} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-w-xl overflow-hidden border-0 bg-transparent p-0 shadow-none [&>button]:right-3 [&>button]:top-3 [&>button]:text-slate-700">
          {opened && (
            <motion.div
              initial={{ y: 60, rotateX: 25, opacity: 0 }}
              animate={{ y: 0, rotateX: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="paper max-h-[80svh] overflow-y-auto rounded-2xl p-7 shadow-2xl sm:p-9"
              style={{ transformPerspective: 1000 }}
            >
              <DialogTitle className="font-script text-4xl text-slate-800">{opened.title}</DialogTitle>
              <DialogDescription className="mb-5 text-sm text-slate-500">
                From {opened.from === "me" ? profile.me : profile.partner} · {formatDate(opened.unlockOn)}
              </DialogDescription>
              <p className="whitespace-pre-wrap font-script text-2xl leading-8 text-slate-800">{opened.content}</p>
              <div className="mt-8 flex items-center justify-between">
                <span className="font-script text-2xl text-rose-500">♥</span>
                <Button variant="ghost" size="sm" onClick={() => deleteLetter(opened)} className="text-slate-500 hover:bg-rose-100 hover:text-rose-600">
                  <Trash2 /> Delete
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      <FormDialog open={composeOpen} onOpenChange={setComposeOpen} title="Write a love letter" description="Seal it until a special day, or let them read it now.">
        <LetterForm since={profile.since} partner={profile.partner} onSave={saveLetter} />
      </FormDialog>
    </div>
  );
};

function LetterForm({ since, partner, onSave }: { since: string; partner: string; onSave: (letter: Letter) => void }) {
  const today = toDateInput(new Date());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [unlockOn, setUnlockOn] = useState(today);
  const valid = !!title.trim() && !!content.trim() && !!unlockOn && unlockOn >= today;

  const quick = [
    { label: "Now", value: today },
    { label: "Tomorrow", value: daysFromToday(1) },
    { label: "In a week", value: daysFromToday(7) },
    { label: "In a month", value: daysFromToday(30) },
    { label: "Our anniversary", value: toDateInput(nextAnniversary(since)) },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: uid(), title: title.trim(), content: content.trim(), unlockOn, createdAt: Date.now(), from: "me" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="letter-title">Title</Label>
        <Input id="letter-title" autoFocus value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={`For ${partner}`} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="letter-content">Your letter</Label>
        <Textarea
          id="letter-content"
          rows={6}
          value={content}
          maxLength={4000}
          onChange={(e) => setContent(e.target.value)}
          placeholder="My dearest…"
          className="font-script text-xl leading-7"
        />
        <p className="text-right text-[11px] text-muted-foreground">{content.length} / 4000</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="letter-date">Can be opened on</Label>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setUnlockOn(q.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs ring-1 transition-colors",
                unlockOn === q.value ? "bg-primary/20 text-foreground ring-primary/50" : "text-muted-foreground ring-white/10 hover:text-foreground",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        <Input id="letter-date" type="date" min={today} value={unlockOn} onChange={(e) => setUnlockOn(e.target.value)} />
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={!valid}>
        {unlockOn > today ? <Lock /> : <Mail />} {unlockOn > today ? "Seal the letter" : "Send the letter"}
      </Button>
    </form>
  );
}

export default Letters;
