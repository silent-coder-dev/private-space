import { readStore, removeStore, writeStore } from "@/lib/storage";
import type { Sender } from "@/lib/types";

/**
 * The shared-data engine.
 *
 * Everything the two of you share is stored as small "entities" (one chat message, one plan,
 * your profile, the music player…). Each change is a `Put`: the newest version of one entity.
 *
 * • Last writer wins: every put carries a timestamp + device id, so both phones always agree,
 *   no matter in which order changes arrive.
 * • Deletes are remembered ("tombstones") so a deleted item can't come back from an old copy.
 * • Data is written from each author's point of view ("me"). When a put arrives from the
 *   partner, "me" and "partner" are swapped, so "my message" shows on their side as "theirs".
 * • Values live in memory for instant reads; they are written to this device's storage in batches.
 */

export interface Put {
  col: string;
  id: string;
  data: unknown | null;
  ts: number;
  by: string;
}

type Flip = (data: never) => unknown;

interface ColumnSpec {
  kind: "list" | "doc";
  flip?: Flip;
  /** For docs whose id is "me"/"partner" (each person's own doc). */
  flipId?: boolean;
}

export const swap = (who: Sender): Sender => (who === "me" ? "partner" : "me");
const swapCell = (cell: Sender | null) => (cell ? swap(cell) : cell);

export const COLUMNS = {
  messages: { kind: "list", flip: ((m: { sender: Sender }) => ({ ...m, sender: swap(m.sender) })) as Flip },
  events: { kind: "list" },
  letters: { kind: "list", flip: ((l: { from: Sender }) => ({ ...l, from: swap(l.from) })) as Flip },
  milestones: { kind: "list" },
  songs: { kind: "list" },
  member: { kind: "doc", flipId: true },
  read: { kind: "doc", flipId: true },
  couple: { kind: "doc" },
  player: { kind: "doc" },
  tod: { kind: "doc" },
  ttt: {
    kind: "doc",
    flip: ((g: { board: (Sender | null)[]; turn: Sender; starter: Sender }) => ({
      ...g,
      board: g.board.map(swapCell),
      turn: swap(g.turn),
      starter: swap(g.starter),
    })) as Flip,
  },
  scores: {
    kind: "doc",
    flip: ((s: { me: number; partner: number }) => ({ ...s, me: s.partner, partner: s.me })) as Flip,
  },
} satisfies Record<string, ColumnSpec>;

export type Column = keyof typeof COLUMNS;
export type ListColumn = { [K in Column]: (typeof COLUMNS)[K]["kind"] extends "list" ? K : never }[Column];

/** Where a doc is kept in storage: "couple" or "member:me". */
export const docKey = (col: string, id: string) => (id === "doc" ? col : `${col}:${id}`);

type Meta = Record<string, [ts: number, by: string, deleted: 0 | 1]>;

const META_KEY = "sync-meta";
const MAX_MESSAGES = 500;
const TOMBSTONE_TTL = 60 * 24 * 60 * 60 * 1000;

const isNewer = (ts: number, by: string, prev?: Meta[string]) =>
  !prev || ts > prev[0] || (ts === prev[0] && by > prev[1]);

export class SyncEngine {
  /** Called with every local change so it can be encrypted and sent. */
  sender: ((put: Put) => void) | null = null;
  /** Called after a change from the partner has been applied (for notifications). */
  onRemote: ((put: Put, created: boolean) => void) | null = null;

  private cache = new Map<string, unknown>();
  private listeners = new Map<string, Set<() => void>>();
  private dirty = new Set<string>();
  private pending = new Map<string, Set<string>>();
  private meta: Meta;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly device: string,
    private clock: () => number = Date.now,
  ) {
    this.meta = readStore<Meta>(META_KEY, {});
    this.pruneTombstones();
    if (typeof window !== "undefined") window.addEventListener("pagehide", () => this.flush());
  }

  now = () => this.clock();

  setClock(clock: () => number) {
    this.clock = clock;
  }

  // ---------- reading ----------

  /** Current value (callers should pass a stable `fallback`, e.g. a module constant). */
  get<T>(key: string, fallback: T): T {
    if (!this.cache.has(key)) this.cache.set(key, readStore<T | undefined>(key, undefined));
    const value = this.cache.get(key);
    return value === undefined ? fallback : (value as T);
  }

  subscribe(key: string, listener: () => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  }

  /** Ids in a column that are saved here but not yet confirmed by the server. */
  pendingIds(col: string): Set<string> {
    let set = this.pending.get(col);
    if (!set) {
      set = new Set();
      this.pending.set(col, set);
    }
    return set;
  }

  setPending(col: string, id: string, isPending: boolean) {
    const before = this.pendingIds(col);
    if (before.has(id) === isPending) return;
    const next = new Set(before);
    if (isPending) next.add(id);
    else next.delete(id);
    this.pending.set(col, next);
    this.notify(`pending:${col}`);
  }

  // ---------- writing ----------

  /** Change something locally and share it with your partner. `data = null` deletes. */
  put(col: Column, id: string, data: unknown | null) {
    const prev = this.meta[`${col}/${id}`];
    // Never go backwards in time, even if this device's clock is behind the partner's.
    const ts = Math.max(this.clock(), prev ? prev[0] + 1 : 0);
    const put: Put = { col, id, data, ts, by: this.device };
    if (this.apply(put)) {
      this.flush();
      this.sender?.(put);
    }
  }

  /** Apply a change that came from the server (yours from another tab, or your partner's). */
  receive(put: Put): boolean {
    if (!put || typeof put.col !== "string" || !(put.col in COLUMNS) || typeof put.id !== "string") return false;
    if (typeof put.ts !== "number" || typeof put.by !== "string") return false;
    const local = put.by === this.device ? put : this.flipPut(put);
    const existed = this.exists(local.col, local.id);
    const changed = this.apply(local);
    if (changed) {
      this.scheduleFlush();
      if (put.by !== this.device) this.onRemote?.(local, !existed);
    }
    return changed;
  }

  private exists(col: string, id: string): boolean {
    const spec = COLUMNS[col as Column] as ColumnSpec;
    if (spec.kind === "list") return this.get<{ id: string }[]>(col, []).some((item) => item?.id === id);
    return this.get<unknown>(docKey(col, id), undefined) !== undefined;
  }

  /** Everything this device knows, in each author's own point of view (to re-upload after a server reset). */
  snapshot(): Put[] {
    const puts: Put[] = [];
    for (const [mk, [ts, by, deleted]] of Object.entries(this.meta)) {
      const slash = mk.indexOf("/");
      const col = mk.slice(0, slash) as Column;
      const id = mk.slice(slash + 1);
      const spec = COLUMNS[col] as ColumnSpec | undefined;
      if (!spec) continue;
      let data: unknown = null;
      if (!deleted) {
        data =
          spec.kind === "list"
            ? this.get<{ id: string }[]>(col, []).find((item) => item?.id === id) ?? null
            : this.get<unknown>(docKey(col, id), null);
        if (data === null) continue;
      }
      const local: Put = { col, id, data, ts, by };
      puts.push(by === this.device ? local : this.flipPut(local));
    }
    return puts.sort((a, b) => a.ts - b.ts);
  }

  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    for (const key of this.dirty) {
      const value = this.cache.get(key);
      if (value === undefined) removeStore(key);
      else writeStore(key, value);
    }
    if (this.dirty.size > 0) writeStore(META_KEY, this.meta);
    this.dirty.clear();
  }

  // ---------- internals ----------

  private flipPut(put: Put): Put {
    const spec = COLUMNS[put.col as Column] as ColumnSpec;
    const id = spec.flipId && (put.id === "me" || put.id === "partner") ? swap(put.id) : put.id;
    const data = put.data !== null && spec.flip ? spec.flip(put.data as never) : put.data;
    return { ...put, id, data };
  }

  private apply(put: Put): boolean {
    const mk = `${put.col}/${put.id}`;
    if (!isNewer(put.ts, put.by, this.meta[mk])) return false;
    this.meta[mk] = [put.ts, put.by, put.data === null ? 1 : 0];

    const spec = COLUMNS[put.col as Column] as ColumnSpec;
    if (spec.kind === "list") {
      const list = this.get<{ id: string }[]>(put.col, []);
      const index = list.findIndex((item) => item?.id === put.id);
      let next = list;
      if (put.data === null) {
        if (index >= 0) next = list.filter((_, i) => i !== index);
      } else if (index >= 0) {
        next = list.slice();
        next[index] = put.data as { id: string };
      } else {
        next = [...list, put.data as { id: string }];
        if (put.col === "messages" && next.length > MAX_MESSAGES) next = next.slice(next.length - MAX_MESSAGES);
      }
      if (next !== list) this.setValue(put.col, next);
      else this.dirty.add(put.col);
    } else {
      this.setValue(docKey(put.col, put.id), put.data === null ? undefined : put.data);
    }
    return true;
  }

  private setValue(key: string, value: unknown) {
    this.cache.set(key, value);
    this.dirty.add(key);
    this.notify(key);
  }

  private notify(key: string) {
    this.listeners.get(key)?.forEach((listener) => listener());
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), 300);
  }

  private pruneTombstones() {
    const cutoff = this.clock() - TOMBSTONE_TTL;
    for (const [mk, entry] of Object.entries(this.meta)) if (entry[2] === 1 && entry[0] < cutoff) delete this.meta[mk];
  }
}
