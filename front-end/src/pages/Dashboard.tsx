import { motion } from "framer-motion";
import { ArrowUpRight, Heart, KeyRound, MessageCircleHeart, Quote, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/fx/NumberTicker";
import { ProgressRing } from "@/components/fx/ProgressRing";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { fireFrom } from "@/lib/burst";
import { LOVE_NOTES, MOODS, moodLabel } from "@/lib/content";
import { SPRING, staggerContainer, staggerItem } from "@/lib/motion";
import { NAV_ITEMS } from "@/lib/nav";
import { DEFAULT_PLAYER, EMPTY_SCORES } from "@/lib/seed";
import { uid } from "@/lib/storage";
import {
  dayDistance,
  dayOfYear,
  daysBetween,
  greeting,
  nextAnniversary,
  parseLocalDate,
  relativeTime,
  yearsTogether,
} from "@/lib/time";
import type { ChatMessage, GameScores, Letter, Milestone, PlanEvent, PlayerDoc, Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc, useSyncedList } from "@/sync/hooks";

const Dashboard = () => {
  const { profile, updateProfile } = useSpace();
  const { session, presence, signal, engine } = useRoom();
  const navigate = useNavigate();
  const partnerHere = presence.members >= 2 || !!session?.partnerJoined;
  const now = useNow(60_000);
  const today = new Date(now);

  const daysTogether = Math.max(0, daysBetween(parseLocalDate(profile.since), today));
  const daysToAnniversary = daysBetween(today, nextAnniversary(profile.since, today));
  const years = yearsTogether(profile.since, today);
  const hello = greeting(today.getHours());
  const note = LOVE_NOTES[dayOfYear(today) % LOVE_NOTES.length];

  // Live snapshot of every room — updates the moment your partner changes something.
  const [events] = useSyncedList<PlanEvent>("events");
  const [messages, chat] = useSyncedList<ChatMessage>("messages");
  const [letters] = useSyncedList<Letter>("letters");
  const [memories] = useSyncedList<Milestone>("milestones");
  const [songs] = useSyncedList<Song>("songs");
  const [scores] = useSyncedDoc<GameScores>("scores", "doc", EMPTY_SCORES);
  const [player] = useSyncedDoc<PlayerDoc>("player", "doc", DEFAULT_PLAYER);

  const nextEvent = events
    .filter((e) => daysBetween(today, parseLocalDate(e.date)) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))[0];
  const lastMessage = messages.reduce<ChatMessage | undefined>((last, m) => (!last || m.at > last.at ? m : last), undefined);
  const readyLetters = letters.filter((l) => parseLocalDate(l.unlockOn) <= today && !l.readAt && l.from === "partner").length;
  const lockedLetters = letters.filter((l) => parseLocalDate(l.unlockOn) > today).length;
  const song = songs.find((s) => s.id === player.songId) ?? songs[0];
  const snapshot = { nextEvent, lastMessage, ready: readyLetters, locked: lockedLetters, memories: memories.length, scores, song };

  const roomInfo: Record<string, string> = {
    "/chat": snapshot.lastMessage
      ? `${snapshot.lastMessage.sender === "me" ? "You" : profile.partner}: ${snapshot.lastMessage.text ?? "📷 Photo"}`
      : "Say hello 👋",
    "/presence": `${profile.partner} is feeling ${moodLabel(profile.partnerMood).toLowerCase()} ${profile.partnerMood}`,
    "/games": `Tic-tac-toe score ${snapshot.scores.me} – ${snapshot.scores.partner}`,
    "/planner": snapshot.nextEvent
      ? `${snapshot.nextEvent.emoji} ${snapshot.nextEvent.title} · ${dayDistance(snapshot.nextEvent.date, today)}`
      : "Nothing planned yet",
    "/music": snapshot.song ? `♪ ${snapshot.song.title} — ${snapshot.song.artist}` : "Add your first song",
    "/letters": `${snapshot.ready} ready to open · ${snapshot.locked} locked`,
    "/timeline": `${snapshot.memories} memories saved`,
  };

  const sendHeart = (e: React.MouseEvent<HTMLButtonElement>) => {
    fireFrom(e.currentTarget, { count: 22 });
    signal("heart");
    toast.success(`Heart sent to ${profile.partner} 💖`);
  };

  const pickMood = (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    updateProfile({ mood: emoji });
    fireFrom(e.currentTarget, { count: 8, emojis: [emoji] });
    toast(`Mood shared: ${moodLabel(emoji)} ${emoji}`);
  };

  const sendNote = () => {
    const message: ChatMessage = { id: uid(), sender: "me", text: `💌 "${note}"`, at: engine?.now() ?? Date.now(), reactions: [] };
    chat.upsert(message);
    toast.success("Love note sent", {
      description: `${profile.partner} will find it in your chat.`,
      action: { label: "Open chat", onClick: () => navigate("/chat") },
    });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8"
    >
      {/* Until your partner joins: remind them how to invite */}
      {!partnerHere && (
        <motion.div
          variants={staggerItem}
          className="border-beam glass-card flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left"
        >
          <span className="text-4xl">💌</span>
          <div className="flex-1">
            <p className="font-heading font-semibold">Invite your partner</p>
            <p className="text-sm text-muted-foreground">
              Send them your secret code. When they join, everything here syncs live between your two phones.
            </p>
          </div>
          <Button variant="gradient" asChild>
            <Link to="/start">
              <KeyRound /> Show my code
            </Link>
          </Button>
        </motion.div>
      )}

      {/* Hero */}
      <motion.div variants={staggerItem}>
        <SpotlightCard className="overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 gradient-soft opacity-60" data-spot />
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="space-y-4 text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                {hello.text}, <span className="font-semibold text-foreground">{profile.me}</span> {hello.emoji}
              </p>
              <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
                <NumberTicker value={daysTogether} className="text-gradient" />{" "}
                <span className="text-2xl font-bold sm:text-4xl">days</span>
                <br />
                <span className="text-xl font-semibold text-muted-foreground sm:text-2xl">
                  of you & {profile.partner} 💞
                </span>
              </h1>
              {years >= 1 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold ring-1 ring-gold/30">
                  🏆 {years} {years === 1 ? "year" : "years"} strong
                </span>
              )}
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                <Button variant="gradient" onClick={sendHeart} className="shine">
                  <Heart className="fill-white" /> Send a heart
                </Button>
                <Button variant="glass" asChild>
                  <Link to="/chat">
                    <MessageCircleHeart /> Open chat
                  </Link>
                </Button>
              </div>
            </div>
            <ProgressRing value={1 - daysToAnniversary / 365} size={168} stroke={12}>
              <div>
                {daysToAnniversary === 0 ? (
                  <p className="font-heading text-2xl font-bold">🎉 Today!</p>
                ) : (
                  <>
                    <p className="font-heading text-4xl font-extrabold">{daysToAnniversary}</p>
                    <p className="text-xs text-muted-foreground">days to your</p>
                    <p className="text-xs text-muted-foreground">anniversary</p>
                  </>
                )}
              </div>
            </ProgressRing>
          </div>
        </SpotlightCard>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Mood check-in */}
        <motion.div variants={staggerItem} className="glass-card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">How are you feeling?</h2>
              <p className="text-xs text-muted-foreground">Your mood shows on the Presence page.</p>
            </div>
            <span className="text-sm text-muted-foreground">{moodLabel(profile.mood)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {MOODS.map((m) => {
              const active = profile.mood === m.emoji;
              return (
                <button
                  key={m.emoji}
                  type="button"
                  onClick={(e) => pickMood(m.emoji, e)}
                  aria-pressed={active}
                  aria-label={m.label}
                  title={m.label}
                  className="relative grid aspect-square place-items-center rounded-2xl text-2xl transition-transform hover:scale-110 active:scale-95"
                >
                  {active && (
                    <motion.span
                      layoutId="mood-active"
                      transition={SPRING}
                      className="absolute inset-0 rounded-2xl bg-primary/20 ring-1 ring-primary/50"
                    />
                  )}
                  <span className="relative">{m.emoji}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Partner */}
        <motion.div variants={staggerItem}>
          <Link to="/presence" className="glass-card group flex h-full items-center gap-4 p-5 transition-colors hover:bg-card/80">
            <InitialAvatar name={profile.partner} size="lg" variant="secondary" online={presence.partnerOnline && !profile.partnerAway} />
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold">
                {profile.partner} <span className="ml-1">{profile.partnerMood}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">{profile.partnerStatus}</p>
              {snapshot.lastMessage && (
                <p className="text-xs text-muted-foreground/70">Last message {relativeTime(snapshot.lastMessage.at, now)}</p>
              )}
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        </motion.div>
      </div>

      {/* Love note of the day */}
      <motion.div variants={staggerItem} className="border-beam glass-card relative overflow-hidden p-6 sm:p-8">
        <Quote className="absolute -left-2 -top-2 h-24 w-24 text-primary/10" />
        <div className="relative flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">💌 Love note of the day</p>
            <p className="font-script text-3xl leading-snug sm:text-4xl">“{note}”</p>
          </div>
          <Button variant="glass" onClick={sendNote} className="shrink-0">
            <Send /> Send to {profile.partner}
          </Button>
        </div>
      </motion.div>

      {/* Rooms */}
      <motion.div variants={staggerItem}>
        <h2 className="mb-3 font-heading text-lg font-semibold">Your rooms</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.filter((item) => item.url !== "/dashboard").map((item, i) => (
            <Link key={item.url} to={item.url} className={cn("block", i === 0 && "lg:col-span-2")}>
              <SpotlightCard tilt className="group flex h-full items-start gap-4 p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary shadow-lg shadow-primary/20 transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading font-semibold">{item.title}</p>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="mt-2 truncate text-sm">{roomInfo[item.url]}</p>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
