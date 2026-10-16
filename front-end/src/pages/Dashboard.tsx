import { motion } from "framer-motion";
import { ArrowUpRight, Heart, KeyRound, Phone, Quote, Send, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Heart3D } from "@/components/fx/Heart3D";
import { NumberTicker } from "@/components/fx/NumberTicker";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { useCall } from "@/call/call";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { useMissYou } from "@/hooks/use-miss-you";
import { useNow } from "@/hooks/use-now";
import { GAME_NAMES, LOVE_NOTES, MOODS, moodLabel } from "@/lib/content";
import { SPRING, staggerContainer, staggerItem } from "@/lib/motion";
import { NAV_ITEMS } from "@/lib/nav";
import { DEFAULT_PLAYER } from "@/lib/seed";
import { uid } from "@/lib/storage";
import { dayOfYear, daysBetween, greeting, nextAnniversary, parseLocalDate, relativeTime, yearsTogether } from "@/lib/time";
import type { ChatMessage, GameSession, Photo, PlayerDoc, Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncedDoc, useSyncedList } from "@/sync/hooks";

const NO_GAME: GameSession | null = null;

const Dashboard = () => {
  const { profile, updateProfile } = useSpace();
  const { session, presence, engine } = useRoom();
  const call = useCall();
  const missYou = useMissYou();
  const navigate = useNavigate();
  const now = useNow(60_000);
  const today = new Date(now);
  const partnerHere = presence.members >= 2 || !!session?.partnerJoined;

  const [messages, chat] = useSyncedList<ChatMessage>("messages");
  const [photos] = useSyncedList<Photo>("photos");
  const [strokes] = useSyncedList<Stroke>("strokes");
  const [game] = useSyncedDoc<GameSession | null>("game", "doc", NO_GAME);
  const [player] = useSyncedDoc<PlayerDoc>("player", "doc", DEFAULT_PLAYER);

  const daysTogether = Math.max(0, daysBetween(parseLocalDate(profile.since), today));
  const daysToAnniversary = daysBetween(today, nextAnniversary(profile.since, today));
  const years = yearsTogether(profile.since, today);
  const hello = greeting(today.getHours());
  const note = LOVE_NOTES[dayOfYear(today) % LOVE_NOTES.length];
  const last = messages[messages.length - 1];

  const roomInfo: Record<string, string> = {
    "/chat": last ? `${last.sender === "me" ? "You" : profile.partner}: ${last.text ?? (last.video ? "🎥 Video" : "📷 Photo")}` : "Say hello 👋",
    "/gallery": `${photos.length} shared photo${photos.length === 1 ? "" : "s"}`,
    "/canvas": strokes.length ? `${strokes.length} strokes so far` : "A blank page, waiting for you two",
    "/games": game ? (game.status === "invited" ? (game.by === "me" ? `Waiting for ${profile.partner}…` : `🎮 ${profile.partner} invited you!`) : `Playing ${GAME_NAMES[game.game]}`) : "Invite your partner to play",
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
            <Link to="/start">
              <KeyRound /> Show my code
            </Link>
          </Button>
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <SpotlightCard tilt className="overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 gradient-soft opacity-60" data-spot />
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="space-y-4 text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                {hello.text}, <span className="font-semibold text-foreground">{profile.me}</span> {hello.emoji}
              </p>
              <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
                <NumberTicker value={daysTogether} className="text-gradient" /> <span className="text-2xl font-bold sm:text-4xl">days</span>
                <br />
                <span className="text-xl font-semibold text-muted-foreground sm:text-2xl">of you & {profile.partner} 💞</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {years >= 1 && <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold">🏆 {years} {years === 1 ? "year" : "years"}</span>}
                {daysToAnniversary === 0 ? "🎉 Happy anniversary!" : `${daysToAnniversary} days to your anniversary`}
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                <Button variant="gradient" className="shine" onClick={(e) => missYou(e.currentTarget)}>
                  <Heart className="fill-white" /> I'm missing you
                </Button>
                <Button variant="glass" onClick={() => call.start("video")} disabled={call.phase !== "idle"}>
                  <Video /> Video call
                </Button>
                <Button variant="glass" onClick={() => call.start("audio")} disabled={call.phase !== "idle"}>
                  <Phone /> Voice
                </Button>
              </div>
            </div>
            <Heart3D size={190} />
          </div>
        </SpotlightCard>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-3">
        <motion.div variants={staggerItem} className="glass-card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">How are you feeling?</h2>
              <p className="text-xs text-muted-foreground">{profile.partner} sees your mood live.</p>
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
                  onClick={() => pickMood(m.emoji)}
                  aria-pressed={active}
                  aria-label={m.label}
                  title={m.label}
                  className="relative grid aspect-square place-items-center rounded-2xl text-2xl transition-transform hover:-translate-y-1 hover:scale-110 active:scale-95"
                >
                  {active && <motion.span layoutId="mood-active" transition={SPRING} className="absolute inset-0 rounded-2xl bg-primary/20 ring-1 ring-primary/50" />}
                  <span className="relative">{m.emoji}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Link to="/chat" className="glass-card group flex h-full items-center gap-4 p-5 transition-colors hover:bg-card/80">
            <InitialAvatar name={profile.partner} size="lg" variant="secondary" online={partnerHere ? presence.partnerOnline && !profile.partnerAway : undefined} />
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold">
                {profile.partner} <span className="ml-1">{profile.partnerMood}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {presence.partnerOnline ? "Online now" : presence.partnerSeen ? `Last seen ${relativeTime(presence.partnerSeen, now)}` : profile.partnerStatus}
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        </motion.div>
      </div>

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

      <motion.div variants={staggerItem}>
        <h2 className="mb-3 font-heading text-lg font-semibold">Your rooms</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.filter((item) => item.url !== "/dashboard").map((item, i) => (
            <Link key={item.url} to={item.url} className={cn("block", i === 0 && "lg:col-span-2")}>
              <SpotlightCard tilt className="group flex h-full items-start gap-4 p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary shadow-[0_6px_0_0_hsl(330_70%_30%)] transition-transform group-hover:-translate-y-1 group-hover:rotate-6">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading font-semibold">{item.title}</p>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:text-primary group-hover:opacity-100" />
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
