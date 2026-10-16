import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Heart,
  ListMusic,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormDialog } from "@/components/forms/FormDialog";
import { Equalizer } from "@/components/fx/Equalizer";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { SPRING } from "@/lib/motion";
import { DEFAULT_PLAYER, songSearchLink } from "@/lib/seed";
import { uid } from "@/lib/storage";
import { formatDuration, parseDuration } from "@/lib/time";
import type { PlayerDoc, Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEngine, useSyncedDoc, useSyncedList } from "@/sync/hooks";

/**
 * The player is one shared timeline: { song, playing, position at time T }.
 * Both phones work out "where are we now?" from the same server clock,
 * so play, pause, seek and skip on one phone happen on the other too.
 */
const MusicPlayer = () => {
  const { profile } = useSpace();
  const { presence } = useRoom();
  const engine = useEngine();
  const [songs, playlist] = useSyncedList<Song>("songs");
  const [player, setPlayer] = useSyncedDoc<PlayerDoc>("player", "doc", DEFAULT_PLAYER);
  const [dialogOpen, setDialogOpen] = useState(false);

  const song = songs.find((s) => s.id === player.songId) ?? songs[0];
  const index = song ? songs.indexOf(song) : -1;
  const playing = player.playing && !!song;
  useNow(playing ? 250 : 60_000); // redraw 4× a second only while music is playing

  const positionAt = useCallback(
    (at: number) => {
      if (!song) return 0;
      const elapsed = player.playing && player.songId === song.id ? (at - player.at) / 1000 : 0;
      const base = player.songId === song.id ? player.position : 0;
      return Math.min(song.duration, Math.max(0, base + elapsed));
    },
    [song, player],
  );
  const position = positionAt(engine.now());

  /** Change timing (song / play state / position) — always stamped with the shared clock. */
  const setTimeline = useCallback(
    (patch: Partial<Pick<PlayerDoc, "songId" | "playing" | "position">>) => {
      const at = engine.now();
      setPlayer((prev) => ({ ...DEFAULT_PLAYER, ...prev, songId: song?.id ?? null, position: positionAt(at), ...patch, at }));
    },
    [engine, setPlayer, song, positionAt],
  );

  const togglePlay = useCallback(() => {
    if (song) setTimeline({ playing: !playing });
  }, [song, playing, setTimeline]);

  const goTo = useCallback(
    (i: number, autoplay = playing) => {
      const target = songs[i];
      if (target) setTimeline({ songId: target.id, position: 0, playing: autoplay });
    },
    [songs, playing, setTimeline],
  );

  const goNext = useCallback(() => {
    if (songs.length === 0) return;
    if (player.shuffle && songs.length > 1) {
      let i = index;
      while (i === index) i = Math.floor(Math.random() * songs.length);
      goTo(i);
    } else {
      goTo((index + 1) % songs.length);
    }
  }, [songs.length, player.shuffle, index, goTo]);

  const goPrev = () => {
    if (songs.length === 0) return;
    if (position > 3) return setTimeline({ position: 0 });
    goTo((index - 1 + songs.length) % songs.length);
  };

  // What happens when a song reaches the end (both phones agree, because the result is the same).
  useEffect(() => {
    if (!song || !playing || position < song.duration) return;
    if (player.repeat === "one") return setTimeline({ position: 0 });
    const isLast = index === songs.length - 1;
    if (player.repeat === "off" && isLast && !player.shuffle) return setTimeline({ playing: false, position: 0 });
    goNext();
  }, [position, song, playing, player.repeat, player.shuffle, index, songs.length, goNext, setTimeline]);

  // Space bar plays / pauses (unless you're typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.code !== "Space" || target.closest("input, textarea, button, [role=slider], [role=dialog]")) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  const addSong = (newSong: Song) => {
    playlist.upsert(newSong);
    setDialogOpen(false);
    toast.success(`Added “${newSong.title}” 🎶`);
  };

  const removeSong = (target: Song) => {
    if (target.id === song?.id) {
      const next = songs.find((s) => s.id !== target.id);
      setTimeline({ songId: next?.id ?? null, playing: false, position: 0 });
    }
    playlist.remove(target.id);
    toast(`Removed “${target.title}”`, {
      action: { label: "Undo", onClick: () => playlist.upsert(target) },
    });
  };

  // Shuffle / repeat don't touch the timeline, so the song keeps playing smoothly.
  const cycleRepeat = () =>
    setPlayer((p) => ({ ...p, repeat: p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off" }));
  const toggleShuffle = () => setPlayer((p) => ({ ...p, shuffle: !p.shuffle }));

  const listenLink = song ? song.link || songSearchLink(`${song.title} ${song.artist}`) : "#";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Music}
        title="Our Music"
        subtitle="A shared playlist for the two of you"
        actions={
          <Button variant="gradient" onClick={() => setDialogOpen(true)}>
            <Plus /> Add song
          </Button>
        }
      />

      {songs.length === 0 || !song ? (
        <EmptyState
          emoji="🎵"
          title="Your playlist is empty"
          text="Add the songs that remind you of each other."
          action={
            <Button variant="gradient" onClick={() => setDialogOpen(true)}>
              <Plus /> Add your first song
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Now playing */}
          <SpotlightCard className="space-y-6 p-6 text-center sm:p-8">
            <div className="relative mx-auto w-fit">
              <motion.div
                aria-hidden
                className="absolute -inset-6 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 65%)" }}
                animate={{ opacity: playing ? [0.5, 1, 0.5] : 0.3, scale: playing ? [1, 1.06, 1] : 1 }}
                transition={{ duration: 2.4, repeat: playing ? Infinity : 0 }}
              />
              <div
                className="relative grid h-52 w-52 animate-spin-slow place-items-center rounded-full shadow-2xl shadow-black/60 sm:h-60 sm:w-60"
                style={{
                  animationPlayState: playing ? "running" : "paused",
                  background:
                    "repeating-radial-gradient(circle, hsl(236 30% 9%) 0 2px, hsl(236 30% 13%) 2px 4px), hsl(236 30% 10%)",
                }}
              >
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,hsl(0_0%_100%/0.08)_40deg,transparent_80deg,transparent_180deg,hsl(0_0%_100%/0.08)_220deg,transparent_260deg)]" />
                <div className="relative grid h-20 w-20 place-items-center rounded-full gradient-primary ring-4 ring-background/60">
                  <Heart className="h-7 w-7 fill-white text-white" />
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-background" />
                </div>
              </div>
            </div>

            <div className="min-h-[3.5rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="font-heading text-2xl font-bold">{song.title}</p>
                  <p className="text-muted-foreground">{song.artist}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex">
                <InitialAvatar name={profile.me} size="sm" />
                <InitialAvatar name={profile.partner} size="sm" variant="secondary" className="-ml-2" />
              </div>
              <span>{playing ? (presence.partnerOnline ? "Listening together" : "Playing") : "Paused"}</span>
              <Equalizer playing={playing} className="text-primary" />
            </div>

            <div className="space-y-2">
              <Slider
                value={[Math.min(position, song.duration)]}
                max={song.duration}
                step={1}
                onValueChange={([v]) => setTimeline({ position: v })}
                aria-label="Song position"
              />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>{formatDuration(position)}</span>
                <span>-{formatDuration(song.duration - position)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                aria-pressed={player.shuffle}
                aria-label="Shuffle"
                className={cn(player.shuffle ? "text-primary" : "text-muted-foreground")}
              >
                <Shuffle />
              </Button>
              <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Previous song" className="[&_svg]:size-6">
                <SkipBack className="fill-current" />
              </Button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className="grid h-16 w-16 place-items-center rounded-full gradient-primary text-white glow-primary"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={playing ? "pause" : "play"}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    {playing ? <Pause className="h-7 w-7 fill-white" /> : <Play className="ml-1 h-7 w-7 fill-white" />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <Button variant="ghost" size="icon" onClick={goNext} aria-label="Next song" className="[&_svg]:size-6">
                <SkipForward className="fill-current" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleRepeat}
                aria-label={`Repeat: ${player.repeat}`}
                className={cn(player.repeat === "off" ? "text-muted-foreground" : "text-primary")}
              >
                {player.repeat === "one" ? <Repeat1 /> : <Repeat />}
              </Button>
            </div>

            <div className="space-y-2">
              <Button variant="glass" asChild>
                <a href={listenLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink /> Listen to this song
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground/70">
                Play, pause and skip are shared live with {profile.partner}. Tap “Listen” to hear the song itself.
              </p>
            </div>
          </SpotlightCard>

          {/* Queue */}
          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <ListMusic className="h-5 w-5 text-primary" /> Playlist
              </h2>
              <span className="text-xs text-muted-foreground">
                {songs.length} {songs.length === 1 ? "song" : "songs"} ·{" "}
                {formatDuration(songs.reduce((sum, s) => sum + s.duration, 0))}
              </span>
            </div>
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {songs.map((s, i) => {
                  const current = i === index;
                  return (
                    <motion.li
                      key={s.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group relative"
                    >
                      {current && (
                        <motion.span
                          layoutId="song-active"
                          transition={SPRING}
                          className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/30"
                        />
                      )}
                      <div className="relative flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/5">
                        <button
                          type="button"
                          onClick={() => goTo(i, true)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-label={`Play ${s.title}`}
                        >
                          <span className="grid w-6 shrink-0 place-items-center text-xs tabular-nums text-muted-foreground">
                            {current ? <Equalizer playing={playing} className="text-primary" /> : i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-medium", current && "text-primary")}>{s.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">{s.artist}</span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDuration(s.duration)}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSong(s)}
                          aria-label={`Remove ${s.title}`}
                          className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Add a song" description="A song that feels like the two of you.">
        <SongForm onSave={addSong} />
      </FormDialog>
    </div>
  );
};

function SongForm({ onSave }: { onSave: (song: Song) => void }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [length, setLength] = useState("3:30");
  const [link, setLink] = useState("");
  const duration = parseDuration(length);
  const linkOk = !link.trim() || /^https?:\/\//i.test(link.trim());
  const valid = !!title.trim() && !!artist.trim() && !!duration && duration > 0 && linkOk;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !duration) return;
    onSave({ id: uid(), title: title.trim(), artist: artist.trim(), duration, link: link.trim() || undefined });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="song-title">Song</Label>
          <Input id="song-title" autoFocus value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Perfect" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="song-artist">Artist</Label>
          <Input id="song-artist" value={artist} maxLength={60} onChange={(e) => setArtist(e.target.value)} placeholder="Ed Sheeran" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="song-length">Length</Label>
          <Input id="song-length" value={length} onChange={(e) => setLength(e.target.value)} placeholder="3:45" aria-invalid={!duration} />
          {!duration && <p className="text-xs text-destructive">Use m:ss, like 3:45</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="song-link">Link (optional)</Label>
          <Input id="song-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-invalid={!linkOk} />
          {!linkOk && <p className="text-xs text-destructive">Links should start with https://</p>}
        </div>
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={!valid}>
        Add to playlist
      </Button>
    </form>
  );
}

export default MusicPlayer;
