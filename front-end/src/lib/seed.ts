import { nextAnniversary, toDateInput } from "./time";
import type {
  CoupleDoc,
  GameScores,
  MemberDoc,
  Milestone,
  PlanEvent,
  PlayerDoc,
  ReadDoc,
  Song,
  TodDoc,
  TttDoc,
} from "./types";

/**
 * Defaults used until real values exist. They are module-level constants on purpose:
 * the sync hooks need stable fallbacks.
 */
export const DEFAULT_ME: MemberDoc = { name: "Me", mood: "🥰", status: "Feeling loved 💕", away: false };
export const DEFAULT_PARTNER: MemberDoc = { name: "Your partner", mood: "💗", status: "Not here yet", away: false };
export const DEFAULT_COUPLE: CoupleDoc = { since: toDateInput(new Date()) };
export const DEFAULT_READ: ReadDoc = { chat: 0 };
export const DEFAULT_PLAYER: PlayerDoc = { songId: null, playing: false, position: 0, at: 0, shuffle: false, repeat: "all" };
export const EMPTY_SCORES: GameScores = { me: 0, partner: 0, draws: 0 };
export const NEW_TTT: TttDoc = { board: Array(9).fill(null), turn: "me", starter: "me", round: 1 };
export const NO_TOD: TodDoc | null = null;

const search = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
export const songSearchLink = search;

const STARTER_SONGS: Omit<Song, "id">[] = [
  { title: "Perfect", artist: "Ed Sheeran", duration: 263, link: search("Perfect Ed Sheeran") },
  { title: "Until I Found You", artist: "Stephen Sanchez", duration: 177, link: search("Until I Found You Stephen Sanchez") },
  { title: "All of Me", artist: "John Legend", duration: 269, link: search("All of Me John Legend") },
  { title: "Tum Hi Ho", artist: "Arijit Singh", duration: 262, link: search("Tum Hi Ho Arijit Singh") },
  { title: "Lover", artist: "Taylor Swift", duration: 221, link: search("Lover Taylor Swift") },
];

/** A few gentle things the person who creates the room starts with (shared with the partner). */
export function starterContent(since: string, makeId: () => string) {
  const today = toDateInput(new Date());
  const songs: Song[] = STARTER_SONGS.map((s) => ({ ...s, id: makeId() }));
  const milestones: Milestone[] = [
    { id: makeId(), title: "We created our space", date: today, desc: "The first day of UsSpace together", emoji: "🔐" },
  ];
  if (since < today) {
    milestones.unshift({ id: makeId(), title: "Our story began", date: since, desc: "The day everything changed", emoji: "💫" });
  }
  const events: PlanEvent[] = [
    {
      id: makeId(),
      title: "Our Anniversary",
      date: toDateInput(nextAnniversary(since)),
      note: "Our special day!",
      emoji: "💕",
    },
  ];
  return { songs, milestones, events };
}
