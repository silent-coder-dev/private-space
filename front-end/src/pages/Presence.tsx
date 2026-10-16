import { motion } from "framer-motion";
import { Eye, EyeOff, Heart, MessageCircleHeart, Smile, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { fireFrom } from "@/lib/burst";
import { moodLabel, STATUS_IDEAS } from "@/lib/content";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePersistentState } from "@/lib/storage";
import { formatDate, relativeTime, toDateInput } from "@/lib/time";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedList } from "@/sync/hooks";

const Presence = () => {
  const { profile, updateProfile } = useSpace();
  const { presence, signal } = useRoom();
  const [messages] = useSyncedList<ChatMessage>("messages");
  const [status, setStatus] = useState(profile.status);
  const [nudges, setNudges] = usePersistentState("nudges", { day: "", count: 0 });
  const now = useNow(30_000);
  const today = toDateInput(new Date(now));
  const nudgesToday = nudges.day === today ? nudges.count : 0;

  const lastFromPartner = useMemo(
    () => messages.reduce<ChatMessage | undefined>((last, m) => (m.sender === "partner" && (!last || m.at > last.at) ? m : last), undefined),
    [messages],
  );
  const partnerJoined = presence.members >= 2;
  const partnerOnline = partnerJoined && presence.partnerOnline && !profile.partnerAway;

  const saveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const value = status.trim();
    if (!value) return;
    updateProfile({ status: value });
    toast.success("Status updated ✨");
  };

  const nudge = (e: React.MouseEvent<HTMLButtonElement>) => {
    setNudges({ day: today, count: nudgesToday + 1 });
    fireFrom(e.currentTarget, { count: 22, emojis: ["💭", "❤️", "💗", "✨"] });
    signal("nudge");
    toast.success(`${profile.partner} knows you're thinking of them 💭`);
  };

  const people = [
    {
      name: profile.me,
      label: "You",
      mood: profile.mood,
      status: profile.status,
      online: !profile.away,
      variant: "primary" as const,
    },
    {
      name: profile.partner,
      label: "Your person",
      mood: profile.partnerMood,
      status: partnerJoined ? profile.partnerStatus : "Hasn't joined yet",
      online: partnerOnline,
      variant: "secondary" as const,
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader icon={Users} title="Presence" subtitle="Moods, status and little nudges" />

      {/* The two of you */}
      <motion.div variants={staggerItem}>
        <SpotlightCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2 sm:gap-6">
            {people.map((p, i) => (
              <div key={p.label} className={cn("flex flex-1 flex-col items-center gap-3 text-center", i === 1 && "order-3")}>
                <div className="relative">
                  {p.online && (
                    <>
                      <span className="absolute inset-0 animate-ripple rounded-full bg-primary/25" />
                      <span className="absolute inset-0 animate-ripple rounded-full bg-primary/15 [animation-delay:1.2s]" />
                    </>
                  )}
                  <InitialAvatar name={p.name} size="xl" variant={p.variant} online={p.online} />
                  <motion.span
                    key={p.mood}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full bg-card text-xl ring-2 ring-background"
                  >
                    {p.mood}
                  </motion.span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{p.label}</p>
                  <p className="font-heading text-lg font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.status}</p>
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
                      p.online ? "bg-success/10 text-success ring-success/30" : "bg-muted text-muted-foreground ring-white/10",
                    )}
                  >
                    {p.online ? "Online" : i === 0 ? "Away" : "Offline"} · {moodLabel(p.mood)}
                  </span>
                </div>
              </div>
            ))}

            {/* Animated link between you */}
            <div className="order-2 hidden flex-1 flex-col items-center gap-2 sm:flex">
              <div className="relative h-8 w-full">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-primary/60 via-blush/60 to-secondary/60" />
                <div className="absolute top-1/2 -translate-y-1/2 animate-travel">
                  <Heart className="h-5 w-5 fill-primary text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{partnerOnline ? "Together right now 💞" : partnerJoined ? "Connected in your space" : "Waiting for your partner"}</p>
            </div>
          </div>
        </SpotlightCard>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Your status */}
        <motion.div variants={staggerItem} className="glass-card space-y-4 p-5 lg:col-span-3">
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Your status</h2>
          </div>
          <form onSubmit={saveStatus} className="flex gap-2">
            <Input
              value={status}
              maxLength={60}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="What are you up to?"
              aria-label="Your status"
            />
            <Button type="submit" variant="gradient" disabled={!status.trim() || status.trim() === profile.status}>
              Save
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {STATUS_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setStatus(idea)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              {profile.away ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-success" />}
              <div>
                <p className="text-sm font-medium">Show me as online</p>
                <p className="text-xs text-muted-foreground">Turn off when you need quiet time.</p>
              </div>
            </div>
            <Switch checked={!profile.away} onCheckedChange={(on) => updateProfile({ away: !on })} aria-label="Show me as online" />
          </div>
          <p className="text-xs text-muted-foreground">
            Want to change your mood? Pick one on the{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              home page
            </Link>
            .
          </p>
        </motion.div>

        {/* Thinking of you */}
        <motion.div variants={staggerItem} className="glass-card flex flex-col items-center justify-center gap-4 p-6 text-center lg:col-span-2">
          <p className="font-heading text-lg font-semibold">Thinking of you</p>
          <div className="relative">
            <span className="absolute inset-0 animate-ripple rounded-full bg-primary/30" />
            <motion.button
              type="button"
              onClick={nudge}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.9 }}
              className="relative grid h-24 w-24 place-items-center rounded-full gradient-primary glow-primary"
              aria-label={`Send a nudge to ${profile.partner}`}
            >
              <Heart className="h-10 w-10 animate-heartbeat fill-white text-white" />
            </motion.button>
          </div>
          <p className="text-sm text-muted-foreground">
            Tap to let {profile.partner} know they're on your mind.
          </p>
          <p className="text-xs text-muted-foreground">
            Nudges sent today: <span className="font-semibold text-foreground">{nudgesToday}</span>
          </p>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <h2 className="font-heading text-lg font-semibold">Recent activity</h2>
        </div>
        <ul className="divide-y divide-white/5 text-sm">
          {lastFromPartner && (
            <li className="flex items-center gap-3 py-3">
              <MessageCircleHeart className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">
                {profile.partner} said “{lastFromPartner.text ?? "📷 a photo"}”
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(lastFromPartner.at, now)}</span>
            </li>
          )}
          <li className="flex items-center gap-3 py-3">
            <span className="w-4 text-center">{profile.mood}</span>
            <span className="flex-1">You're feeling {moodLabel(profile.mood).toLowerCase()}</span>
          </li>
          <li className="flex items-center gap-3 py-3">
            <Heart className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">Together since {formatDate(profile.since, { weekday: undefined })}</span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
};

export default Presence;
