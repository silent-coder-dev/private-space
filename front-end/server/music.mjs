// Lists the songs you put in the "music" folder (public/music in development, dist/music when built).
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

/** @param {string} dir */
export function listMusic(dir) {
  if (!existsSync(dir)) return { songs: [] };
  const songs = readdirSync(dir)
    .filter((name) => AUDIO.test(name) && statSync(join(dir, name)).isFile())
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      id: name,
      url: `/music/${encodeURIComponent(name)}`,
      title: name.replace(AUDIO, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim(),
    }));
  return { songs };
}
