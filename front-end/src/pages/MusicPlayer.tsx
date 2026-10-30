import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, Heart, ListMusic, Music, Search, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Equalizer } from "@/components/fx/Equalizer";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useMusic } from "@/music/music";
import { MusicButtons, MusicProgress, MusicVolume } from "@/music/MusicControls";

/** The full music player: a spinning record, shared controls and your whole playlist with search. */
const MusicPlayer = () => {
  const { profile } = useSpace();
  const { presence } = useRoom();
  const music = useMusic();
  const [query, setQuery] = useState("");
  const list = useMemo(() => music.songs ?? [], [music.songs]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.map((s, i) => ({ s, i })).filter(({ s }) => !q || s.title.toLowerCase().includes(q));
  }, [list, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader icon={Music} title="Our Music" subtitle={`${list.length} songs · playing in sync with ${profile.partner}`} />

      {music.songs === null ? null : list.length === 0 ? (
        <div className="glass-card mx-auto max-w-xl space-y-3 p-8 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-primary" />
          <p className="font-heading text-lg font-semibold">Add your songs</p>
          <p className="text-sm text-muted-foreground">
            Put your downloaded music files (<code>.mp3</code>, <code>.m4a</code>, <code>.ogg</code>, <code>.wav</code>…) in the{" "}
            <code className="rounded bg-white/10 px-1.5">front-end/public/music</code> folder, then restart or redeploy. They appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
          <SpotlightCard className="space-y-6 p-6 text-center sm:p-8 lg:sticky lg:top-4">
            <div className="relative mx-auto w-fit [perspective:900px]">
              <motion.div
                aria-hidden
                className="absolute -inset-6 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 65%)" }}
                animate={{ opacity: music.playing ? [0.5, 1, 0.5] : 0.3, scale: music.playing ? [1, 1.06, 1] : 1 }}
                transition={{ duration: 2.4, repeat: music.playing ? Infinity : 0 }}
              />
              <motion.div animate={{ rotateX: music.playing ? 18 : 8 }} transition={{ duration: 0.8 }}>
                <div
                  className="relative grid h-52 w-52 animate-spin-slow place-items-center rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] sm:h-60 sm:w-60"
                  style={{
                    animationPlayState: music.playing ? "running" : "paused",
                    background: "repeating-radial-gradient(circle, hsl(236 30% 9%) 0 2px, hsl(236 30% 13%) 2px 4px), hsl(236 30% 10%)",
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,hsl(0_0%_100%/0.08)_40deg,transparent_80deg,transparent_180deg,hsl(0_0%_100%/0.08)_220deg,transparent_260deg)]" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-full gradient-primary ring-4 ring-background/60">
                    <Heart className="h-7 w-7 fill-white text-white" />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="min-h-[3.5rem]">
              <AnimatePresence mode="wait">
                <motion.p key={music.song?.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="font-heading text-2xl font-bold">
                  {music.song?.title}
                </motion.p>
              </AnimatePresence>
              <p className="text-xs text-muted-foreground">
                Song {music.index + 1} of {list.length}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex">
                <UserAvatar who="me" size="sm" />
                <UserAvatar who="partner" size="sm" className="-ml-2" />
              </div>
              <span>{music.playing ? (presence.partnerOnline ? "Listening together" : "Playing") : "Paused"}</span>
              <Equalizer playing={music.playing} className="text-primary" />
            </div>

            {music.needsTap && music.playing && (
              <Button variant="gradient" className="shine" onClick={music.unlock}>
                <Volume2 /> Tap to join the music
              </Button>
            )}

            <MusicProgress />
            <MusicButtons />
            <MusicVolume />
            <p className="text-[11px] text-muted-foreground/70">Keeps playing while you use the rest of the app — control it any time from the 🎵 button at the top.</p>
          </SpotlightCard>

          <div className="glass-card space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <ListMusic className="h-5 w-5 text-primary" /> Playlist
              </h2>
              <span className="text-xs text-muted-foreground">
                {shown.length} / {list.length}
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your songs…" aria-label="Search songs" className="pl-9" />
            </div>
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {shown.map(({ s, i }) => {
                const current = s.id === music.song?.id;
                return (
                  <li key={s.id} className="relative">
                    {current && <motion.span layoutId="song-active" transition={SPRING} className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/30" />}
                    <button type="button" onClick={() => music.playAt(i)} className="relative flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/5" aria-label={`Play ${s.title}`}>
                      <span className="grid w-7 shrink-0 place-items-center text-xs tabular-nums text-muted-foreground">{current ? <Equalizer playing={music.playing} className="text-primary" /> : i + 1}</span>
                      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", current && "text-primary")}>{s.title}</span>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No song matches "{query}"</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
