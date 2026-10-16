import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_PLAYER } from "@/lib/seed";
import { readStore, writeStore } from "@/lib/storage";
import type { PlayerDoc, Song } from "@/lib/types";
import { useEngine, useSyncedDoc } from "@/sync/hooks";
import { MusicContext, type MusicApi } from "./music";

/** Songs come from the "music" folder (public/music), listed by the server. */
function useSongs() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  useEffect(() => {
    fetch("/music/manifest.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : { songs: [] }))
      .then((data: { songs?: Song[] }) => setSongs(data.songs ?? []))
      .catch(() => setSongs([]));
  }, []);
  return songs;
}

/**
 * One music player for the whole app, so the song keeps playing while you chat, draw or play.
 *
 * The player is a shared timeline: { song, playing, position at time T }. Both phones work out
 * "where are we now?" from the same server clock and play their own copy of the file.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const engine = useEngine();
  const songs = useSongs();
  const [player, setPlayer] = useSyncedDoc<PlayerDoc>("player", "doc", DEFAULT_PLAYER);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [volume, setVolumeState] = useState(() => readStore("music-volume", 0.9));

  const list = useMemo(() => songs ?? [], [songs]);
  const song = list.find((s) => s.id === player.songId) ?? list[0];
  const index = song ? list.indexOf(song) : -1;
  const playing = player.playing && !!song;

  const positionAt = useCallback(
    (at: number) => {
      if (!song || player.songId !== song.id) return 0;
      const pos = Math.max(0, player.position + (player.playing ? (at - player.at) / 1000 : 0));
      return duration ? Math.min(duration, pos) : pos;
    },
    [song, player, duration],
  );
  const positionNow = useCallback(() => positionAt(engine.now()), [positionAt, engine]);

  /** Change the shared timeline (song / play state / position) — stamped with the shared clock. */
  const setTimeline = useCallback(
    (patch: Partial<Pick<PlayerDoc, "songId" | "playing" | "position">>) => {
      const at = engine.now();
      setPlayer((prev) => ({ ...DEFAULT_PLAYER, ...prev, songId: song?.id ?? null, position: positionAt(at), ...patch, at }));
    },
    [engine, setPlayer, song, positionAt],
  );

  const playAt = useCallback((i: number) => list[i] && setTimeline({ songId: list[i].id, position: 0, playing: true }), [list, setTimeline]);
  const next = useCallback(() => {
    if (!list.length) return;
    let i = (index + 1) % list.length;
    if (player.shuffle && list.length > 1) while (i === index) i = Math.floor(Math.random() * list.length);
    setTimeline({ songId: list[i].id, position: 0 });
  }, [list, index, player.shuffle, setTimeline]);
  const prev = useCallback(() => {
    if (!list.length) return;
    if (positionNow() > 3) return setTimeline({ position: 0 });
    setTimeline({ songId: list[(index - 1 + list.length) % list.length].id, position: 0 });
  }, [list, index, positionNow, setTimeline]);
  const toggle = useCallback(() => song && setTimeline({ playing: !playing }), [song, playing, setTimeline]);
  const seek = useCallback((seconds: number) => setTimeline({ position: Math.max(0, seconds) }), [setTimeline]);

  // The real <audio> element lives for the whole session.
  // "metadata" fetches just enough for the song length — the rest streams only while playing (saves phone data).
  useEffect(() => {
    const el = new Audio();
    el.preload = "metadata";
    audio.current = el;
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", onMeta);
      el.src = "";
    };
  }, []);

  // Keep the audio in step with the shared timeline.
  useEffect(() => {
    const el = audio.current;
    if (!el || !song) return;
    if (!el.src.endsWith(song.url)) {
      el.src = song.url;
      setDuration(0);
    }
    const target = positionAt(engine.now());
    if (Number.isFinite(target) && Math.abs(el.currentTime - target) > 1.5) el.currentTime = target;
    if (playing) {
      el.play()
        .then(() => setNeedsTap(false))
        .catch(() => setNeedsTap(true));
    } else el.pause();
  }, [song, playing, player.position, player.at, positionAt, engine]);

  // When a song ends: repeat one, stop at the end, or go to the next one.
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const onEnded = () => {
      if (player.repeat === "one") return setTimeline({ position: 0, playing: true });
      if (player.repeat === "off" && index === list.length - 1 && !player.shuffle) return setTimeline({ playing: false, position: 0 });
      next();
    };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [player.repeat, player.shuffle, index, list.length, next, setTimeline]);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
    writeStore("music-volume", volume);
  }, [volume]);

  // Lock-screen / notification / headphone controls on phones and computers.
  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms || !song) return;
    ms.metadata = new MediaMetadata({ title: song.title, artist: "UsSpace · playing together", artwork: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] });
    ms.playbackState = playing ? "playing" : "paused";
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => setTimeline({ playing: true })],
      ["pause", () => setTimeline({ playing: false })],
      ["nexttrack", next],
      ["previoustrack", prev],
      ["seekto", (d) => d.seekTime !== undefined && seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* not supported here */
      }
    }
  }, [song, playing, next, prev, seek, setTimeline]);

  const api = useMemo<MusicApi>(
    () => ({
      songs,
      song,
      index,
      playing,
      duration,
      needsTap,
      volume,
      shuffle: player.shuffle,
      repeat: player.repeat,
      positionNow,
      toggle,
      playAt,
      next,
      prev,
      seek,
      setVolume: (v) => setVolumeState(Math.min(1, Math.max(0, v))),
      toggleShuffle: () => setPlayer((p) => ({ ...p, shuffle: !p.shuffle })),
      cycleRepeat: () => setPlayer((p) => ({ ...p, repeat: p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off" })),
      unlock: () => void audio.current?.play().then(() => setNeedsTap(false)).catch(() => undefined),
    }),
    [songs, song, index, playing, duration, needsTap, volume, player.shuffle, player.repeat, positionNow, toggle, playAt, next, prev, seek, setPlayer],
  );

  return <MusicContext.Provider value={api}>{children}</MusicContext.Provider>;
}
