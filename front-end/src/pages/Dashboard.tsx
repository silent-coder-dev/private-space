import { motion } from "framer-motion";
import { ArrowUpRight, Fingerprint, Heart, KeyRound, Phone, Quote, Send, Video, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Heart3D } from "@/components/fx/Heart3D";
import { NumberTicker } from "@/components/fx/NumberTicker";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { MeetCard } from "@/components/home/MeetCard";
import { NoteCard } from "@/components/home/NoteCard";
import { QuestionCard } from "@/components/home/QuestionCard";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useCall } from "@/call/call";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { useMissYou } from "@/hooks/use-miss-you";
import { useNow } from "@/hooks/use-now";
import { fireHearts } from "@/lib/burst";
import { GAME_NAMES, LOVE_NOTES, MOODS, moodLabel } from "@/lib/content";
import { SPRING, staggerContainer, staggerItem } from "@/lib/motion";
import { NAV_ITEMS } from "@/lib/nav";
import { DEFAULT_PLAYER } from "@/lib/seed";
import { readStore, uid, writeStore } from "@/lib/storage";
import { dayOfYear, daysBetween, greeting, milestone, nextAnniversary, parseLocalDate, relativeTime, yearsTogether } from "@/lib/time";
import type { ChatMessage, GameSession, Photo, PlayerDoc, Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc, useSyncedList } from "@/sync/hooks";

const NO_GAME: GameSession | null = null;

/** Home: you two at a glance, one-tap actions, today's question, your countdown, moods and notes. */
const Dashboard = () => {
  const { profile, updateProfile, setThumbKissOpen } = useSpace();
  const { session, presence, engine } = useRoom();
  const call = useCall();
  const missYou = useMissYou();
  const navigate = useNavigate();
  const now = useNow(60_000);
  const today = new Date(now);
  const partnerHere = presence.members >= 2 || !!session?.partnerJoined;
  const partnerOnline = partnerHere ? presence.partnerOnline && !profile.partnerAway : undefined;

  const [messages, chat] = useSyncedList<ChatMessage>("messages");
  const [photos] = useSyncedList<Photo>("photos");
  const [strokes] = useSyncedList<Stroke>("strokes");
  const [game] = useSyncedDoc<GameSession | null>("game", "doc", NO_GAME);
  const [player] = useSyncedDoc<PlayerDoc>("player", "doc", DEFAULT_PLAYER);

  const daysTogether = Math.max(0, daysBetween(parseLocalDate(profile.since), today));
  const daysToAnniversary = daysBetween(today, nextAnniversary(profile.since, today));
  const years = yearsTogether(profile.since, today);
  const mark = milestone(daysTogether);
  const hello = greeting(today.getHours());
  const note = LOVE_NOTES[dayOfYear(today) % LOVE_NOTES.length];
  const last = messages[messages.length - 1];

  // A big round number (100, 500, 1000 days…) gets a celebration once.
  useEffect(() => {
    if (!mark.today) return;
    const key = `milestone-${daysTogether}`;
    if (readStore(key, false)) return;
    writeStore(key, true);
    fireHearts({ count: 40, emojis: ["🎉", "💖", "✨"] });
  }, [mark.today, daysTogether]);

  const roomInfo: Record<string, string> = {
    "/chat": last ? `${last.sender === "me" ? "You" : profile.partner}: ${last.text ?? (last.video ? "🎥 Video" : "📷 Photo")}` : "Say hello 👋",
    "/gallery": `${photos.length} shared photo${photos.length === 1 ? "" : "s"}`,
    "/canvas": strokes.length ? `${strokes.length} strokes so far` : "A blank page, waiting for you two",
    "/games": game ? (game.status === "invited" ? (game.by === "me" ? `Waiting for ${profile.partner}…` : `🎮 ${profile.partner} invited you!`) : `Playing ${GAME_NAMES[game.game]}`) : "8 games — invite your partner",
    "/music": player.songId ? `♪ ${player.songId.replace(/\.[^.]+$/, "")}` : "Play your songs together",
  };

  const pickMood = (emoji: string) => {
    updateProfile({ mood: emoji });
    toast(`Mood shared: ${moodLabel(emoji)} ${emoji}`);
  };

  const sendNote = () => {
    chat.upsert({ id: uid(), sender: "me", text: `💌 "${note}"`, at: engine?.now() ?? Date.now(), reactions: [] });
    toast.success("Love note sent", { action: { label: "Open chat", onClick: () => navigate("/chat") } });
  };

  const busy = call.phase !== "idle";
  const actions: { label: string; aria?: string; icon: LucideIcon; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; primary?: boolean; disabled?: boolean }[] = [
    { label: "Missing you", aria: `Tell ${profile.partner} you're missing them`, icon: Heart, onClick: (e) => missYou(e.currentTarget), primary: true },
    { label: "Thumb kiss", icon: Fingerprint, onClick: () => setThumbKissOpen(true) },
    { label: "Video call", icon: Video, onClick: () => call.start("video"), disabled: busy },
    { label: "Voice call", icon: Phone, onClick: () => call.start("audio"), disabled: busy },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      {!partnerHere && (
        <motion.div variants={staggerItem} className="border-beam glass-card flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
          <span className="text-4xl">💌</span>
          <div className="flex-1">
            <p className="font-heading font-semibold">Invite your partner</p>
            <p className="text-sm text-muted-foreground">Send them your secret code. When they join, everything here syncs live between your two phones.</p>
          </div>
          <Button variant="gradient" asChild>
            <Link to="/profile">
              <KeyRound /> Show my code
            </Link>
          </Button>
        </motion.div>
      )}

      {/* You two */}
      <motion.div variants={staggerItem}>
        <SpotlightCard className="overflow-hidden p-5 sm:p-8">
          <div className="absolute inset-0 gradient-soft opacity-60" data-spot />
          <div className="flex items-center gap-6">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <UserAvatar who="me" size="lg" />
                  <span className="z-10 -mx-2 grid h-7 w-7 place-items-center rounded-full bg-background text-sm">💞</span>
                  <UserAvatar who="partner" size="lg" online={partnerOnline} />
                </div>
                <p className="min-w-0 text-sm text-muted-foreground">
                  {hello.text}, <span className="font-semibold text-foreground">{profile.me}</span> {hello.emoji}
                  <br />
                  <span className="text-xs">
                    {partnerOnline ? `${profile.partner} is here` : presence.partnerSeen ? `${profile.partner} · seen ${relativeTime(presence.partnerSeen, now)}` : profile.partner}
                  </span>
                </p>
              </div>
              <h1 className="text-4xl font-extrabold leading-none sm:text-5xl">
                <NumberTicker value={daysTogether} className="text-gradient" /> <span className="text-2xl font-bold sm:text-3xl">days together</span>
              </h1>
              <div className="flex flex-wrap gap-2 text-xs">
                {years >= 1 && <span className="rounded-full bg-gold/15 px-2.5 py-1 font-semibold text-gold">🏆 {years} {years === 1 ? "year" : "years"}</span>}
                <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-muted-foreground">
                  {daysToAnniversary === 0 ? "🎉 Happy anniversary!" : `💍 Anniversary in ${daysToAnniversary} days`}
                </span>
                <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-muted-foreground">
                  {mark.today ? `🎉 ${daysTogether.toLocaleString()} days today!` : `✨ ${mark.next.toLocaleString()} days in ${mark.inDays}`}
                </span>
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Heart3D size={170} />
            </div>
          </div>

          {/* One tap for the things you do most */}
          <div className="relative mt-6 grid grid-cols-4 gap-2 sm:gap-3">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                aria-label={a.aria}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50 sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm",
                  a.primary ? "gradient-primary text-white shadow-lg shadow-primary/30" : "border border-white/10 bg-white/[0.06] hover:bg-white/10",
                )}
              >
                <a.icon className={cn("h-5 w-5", a.primary && "fill-white")} />
                <span className="leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Today: two columns that grow on their own, so no card is stretched to match its neighbour */}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <motion.div variants={staggerItem}>
            <QuestionCard />
          </motion.div>
          <motion.section variants={staggerItem} className="glass-card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-semibold">How are you feeling?</h2>
                <p className="text-xs text-muted-foreground">{profile.partner} sees your mood live.</p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-muted-foreground">
                <UserAvatar who="partner" size="xs" /> {profile.partner} · {profile.partnerMood} {moodLabel(profile.partnerMood)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {MOODS.map((m) => {
                const active = profile.mood === m.emoji;
                return (
                  <button
                    key={m.emoji}
                    type="button"
                    onClick={() => pickMood(m.emoji)}
                    aria-pressed={active}
                    aria-label={m.label}
                    title={m.label}
                    className="relative flex flex-col items-center gap-1 rounded-2xl py-2 text-2xl transition-transform active:scale-95 sm:hover:-translate-y-1"
                  >
                    {active && <motion.span layoutId="mood-active" transition={SPRING} className="absolute inset-0 rounded-2xl bg-primary/20 ring-1 ring-primary/50" />}
                    <span className="relative">{m.emoji}</span>
                    <span className="relative text-[10px] text-muted-foreground">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </div>
        <div className="flex flex-col gap-5">
          <motion.div variants={staggerItem}>
            <MeetCard />
          </motion.div>
          <motion.div variants={staggerItem}>
            <NoteCard />
          </motion.div>
        </div>
      </div>

      {/* Love note of the day */}
      <motion.div variants={staggerItem} className="border-beam glass-card relative overflow-hidden p-5 sm:p-6">
        <Quote className="absolute -left-2 -top-2 h-20 w-20 text-primary/10" />
        <div className="relative flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">💌 Love note of the day</p>
            <p className="font-script text-2xl leading-snug sm:text-3xl">“{note}”</p>
          </div>
          <Button variant="glass" onClick={sendNote} className="shrink-0">
            <Send /> Send to {profile.partner}
          </Button>
        </div>
      </motion.div>

      {/* Rooms */}
      <motion.section variants={staggerItem}>
        <h2 className="mb-3 font-heading text-lg font-semibold">Your rooms</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {NAV_ITEMS.filter((item) => item.url !== "/dashboard").map((item) => (
            <Link key={item.url} to={item.url} className="group glass-card flex flex-col gap-3 p-4 transition-colors hover:bg-card/80">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl gradient-primary shadow-[0_5px_0_0_hsl(330_70%_30%)] transition-transform group-hover:-translate-y-0.5">
                  <item.icon className="h-5 w-5 text-white" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-semibold">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{roomInfo[item.url]}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Dashboard;
