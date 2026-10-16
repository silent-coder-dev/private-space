import { motion } from "framer-motion";
import { Music, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Equalizer } from "@/components/fx/Equalizer";
import { useNow } from "@/hooks/use-now";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useMusic } from "./music";

/** Live progress bar you can drag to seek (shared with your partner). */
export function MusicProgress({ compact = false }: { compact?: boolean }) {
  const music = useMusic();
  useNow(music.playing ? 500 : 60_000);
  const position = music.positionNow();
  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      <Slider value={[Math.min(position, music.duration || 0)]} max={music.duration || 1} step={1} onValueChange={([v]) => music.seek(v)} aria-label="Song position" />
      <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{formatDuration(position)}</span>
        <span>{music.duration ? formatDuration(music.duration) : "--:--"}</span>
      </div>
    </div>
  );
}

/** Previous · play/pause · next, with shuffle and repeat. */
export function MusicButtons({ size = "lg" }: { size?: "lg" | "sm" }) {
  const music = useMusic();
  const big = size === "lg";
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-3">
      <Button variant="ghost" size="icon" onClick={music.toggleShuffle} aria-pressed={music.shuffle} aria-label="Shuffle" className={cn(music.shuffle ? "text-primary" : "text-muted-foreground")}>
        <Shuffle />
      </Button>
      <Button variant="ghost" size="icon" onClick={music.prev} aria-label="Previous song" className="[&_svg]:size-6">
        <SkipBack className="fill-current" />
      </Button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={music.toggle}
        aria-label={music.playing ? "Pause" : "Play"}
        className={cn(
          "grid place-items-center rounded-full gradient-primary text-white glow-primary shadow-[0_5px_0_0_hsl(330_70%_32%)] transition-transform active:translate-y-[3px] active:shadow-[0_2px_0_0_hsl(330_70%_32%)]",
          big ? "h-16 w-16" : "h-12 w-12",
        )}
      >
        {music.playing ? <Pause className={cn("fill-white", big ? "h-7 w-7" : "h-5 w-5")} /> : <Play className={cn("ml-0.5 fill-white", big ? "h-7 w-7" : "h-5 w-5")} />}
      </motion.button>
      <Button variant="ghost" size="icon" onClick={music.next} aria-label="Next song" className="[&_svg]:size-6">
        <SkipForward className="fill-current" />
      </Button>
      <Button variant="ghost" size="icon" onClick={music.cycleRepeat} aria-label={`Repeat: ${music.repeat}`} className={cn(music.repeat === "off" ? "text-muted-foreground" : "text-primary")}>
        {music.repeat === "one" ? <Repeat1 /> : <Repeat />}
      </Button>
    </div>
  );
}

/** Volume for this phone only. */
export function MusicVolume() {
  const music = useMusic();
  const Icon = music.volume === 0 ? VolumeX : music.volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="mx-auto flex w-full max-w-[240px] items-center gap-2">
      <button type="button" onClick={() => music.setVolume(music.volume === 0 ? 0.8 : 0)} aria-label={music.volume === 0 ? "Unmute music" : "Mute music"}>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </button>
      <Slider value={[music.volume * 100]} max={100} step={1} onValueChange={([v]) => music.setVolume(v / 100)} aria-label="Volume (this phone only)" />
    </div>
  );
}

/** The music button in the top bar: control the shared music from any page. */
export function TopbarMusic() {
  const music = useMusic();
  if (!music.songs?.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={music.playing ? `Now playing: ${music.song?.title}` : "Music controls"} className={cn("relative", music.playing && "text-primary")}>
          {music.playing ? <Equalizer playing className="text-primary" /> : <Music />}
          {music.needsTap && music.playing && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-ping rounded-full bg-gold" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass-card w-[min(22rem,calc(100vw-2rem))] space-y-4 border-white/10 bg-popover/95 p-4">
        <div className="flex items-center gap-3">
          <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full gradient-primary", music.playing && "animate-spin-slow")}>
            <span className="h-3 w-3 rounded-full bg-background" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{music.playing ? "Now playing together" : "Paused"}</p>
            <p className="truncate font-heading font-semibold">{music.song?.title}</p>
          </div>
        </div>
        {music.needsTap && music.playing && (
          <Button variant="gradient" className="w-full" onClick={music.unlock}>
            <Volume2 /> Tap to hear it here
          </Button>
        )}
        <MusicProgress compact />
        <MusicButtons size="sm" />
        <MusicVolume />
        <Button variant="glass" size="sm" className="w-full" asChild>
          <Link to="/music">Open the full player & playlist</Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
