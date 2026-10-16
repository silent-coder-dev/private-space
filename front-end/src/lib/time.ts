const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Parse a "yyyy-mm-dd" string as *local* midnight.
 * `new Date("2025-02-14")` is read as UTC, which shifts the day in many time zones.
 */
export function parseLocalDate(value: string, time?: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a date as "yyyy-mm-dd" in local time (the value an <input type="date"> uses). */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysFromToday(offset: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return toDateInput(d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from `from` to `to` (safe across daylight-saving changes). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  done: boolean;
}

export function getCountdown(target: number, now: number = Date.now()): Countdown {
  const totalMs = Math.max(0, target - now);
  return {
    days: Math.floor(totalMs / DAY),
    hours: Math.floor((totalMs % DAY) / HOUR),
    minutes: Math.floor((totalMs % HOUR) / MINUTE),
    seconds: Math.floor((totalMs % MINUTE) / SECOND),
    totalMs,
    done: totalMs === 0,
  };
}

/** "3d 4h", "5h 12m", "12m" or "now". */
export function formatCountdownShort(c: Countdown): string {
  if (c.done) return "now";
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  return `${Math.max(1, c.minutes)}m`;
}

/** The next time the month/day of `since` comes round (today counts). */
export function nextAnniversary(since: string, now: Date = new Date()): Date {
  const start = parseLocalDate(since);
  const today = startOfDay(now);
  const build = (year: number) => {
    const d = new Date(year, start.getMonth(), start.getDate());
    // 29 Feb in a non-leap year rolls into March — keep it in February instead.
    if (d.getMonth() !== start.getMonth()) return new Date(year, start.getMonth() + 1, 0);
    return d;
  };
  const thisYear = build(today.getFullYear());
  // The first anniversary is one full year after you got together (not the same day).
  return thisYear >= today && thisYear > start ? thisYear : build(today.getFullYear() + 1);
}

export function yearsTogether(since: string, now: Date = new Date()): number {
  const start = parseLocalDate(since);
  let years = now.getFullYear() - start.getFullYear();
  const passed =
    now.getMonth() > start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate());
  if (!passed) years -= 1;
  return Math.max(0, years);
}

/** 225 → "3:45" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** "3:45" → 225, "200" → 200, anything else → null */
export function parseDuration(value: string): number | null {
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(v);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function relativeTime(at: number, now: number = Date.now()): string {
  const diff = now - at;
  if (diff < 45 * SECOND) return "just now";
  if (diff < HOUR) return `${Math.round(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)}h ago`;
  const days = daysBetween(new Date(at), new Date(now));
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "Today", "Yesterday" or "Mon, 12 Oct" — used for chat day separators. */
export function formatDayLabel(at: number, now: number = Date.now()): string {
  const days = daysBetween(new Date(at), new Date(now));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseLocalDate(value).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function greeting(hour: number = new Date().getHours()): { text: string; emoji: string } {
  if (hour < 5) return { text: "Sweet dreams", emoji: "🌙" };
  if (hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (hour < 21) return { text: "Good evening", emoji: "🌆" };
  return { text: "Good night", emoji: "🌙" };
}

export function dayOfYear(date: Date = new Date()): number {
  return daysBetween(new Date(date.getFullYear(), 0, 1), date);
}

/** "in 3 days", "tomorrow", "today", "2 days ago" */
export function dayDistance(value: string, now: Date = new Date()): string {
  const days = daysBetween(now, parseLocalDate(value));
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
