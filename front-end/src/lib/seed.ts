import { toDateInput } from "./time";
import type { CoupleDoc, GameScores, MemberDoc, PlayerDoc, ReadDoc, TodDoc, TttDoc } from "./types";

/** Defaults used until real values exist (module-level constants: the sync hooks need stable fallbacks). */
export const DEFAULT_ME: MemberDoc = { name: "Me", mood: "🥰", status: "Feeling loved 💕", away: false };
export const DEFAULT_PARTNER: MemberDoc = { name: "Your partner", mood: "💗", status: "Not here yet", away: false };
export const DEFAULT_COUPLE: CoupleDoc = { since: toDateInput(new Date()) };
export const DEFAULT_READ: ReadDoc = { chat: 0 };
export const DEFAULT_PLAYER: PlayerDoc = { songId: null, playing: false, position: 0, at: 0, shuffle: false, repeat: "all" };
export const EMPTY_SCORES: GameScores = { me: 0, partner: 0, draws: 0 };
export const NEW_TTT: TttDoc = { board: Array(9).fill(null), turn: "me", starter: "me", round: 1 };
export const NO_TOD: TodDoc | null = null;
