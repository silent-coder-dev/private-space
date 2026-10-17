import { idbAvailable, idbClearPrefix, idbLoadPrefix, idbWrite } from "@/lib/idb";
import { clearStore, readAllScoped, removeStore, writeStore } from "@/lib/storage";
import type { Sender } from "@/lib/types";

/**
 * The shared-data engine.
 *
 * Everything the two of you share is stored as small "entities" (one chat message, one photo,
 * one drawing stroke, the music player…). Each change is a `Put`: the newest version of one entity.
 *
 * • Last writer wins (timestamp + device id), so both phones always agree.
 * • Deletes are remembered ("tombstones") so a deleted item can't come back from an old copy.
 * • Data is written from each author's point of view ("me"). Puts from the partner are flipped.
 * • Values live in memory for instant reads and are saved one item at a time
 *   (IndexedDB when available, so photos and videos fit).
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
const swapPair = <T,>(p: { me: T; partner: T }) => ({ ...p, me: p.partner, partner: p.me });
const flipField = <K extends string>(key: K) => ((d: Record<K, Sender>) => ({ ...d, [key]: swap(d[key]) })) as Flip;

export const COLUMNS = {
  messages: { kind: "list", flip: flipField("sender") },
  photos: { kind: "list", flip: flipField("from") },
  strokes: { kind: "list", flip: flipField("by") },
  stickers: { kind: "list", flip: flipField("by") },
  member: { kind: "doc", flipId: true },
  read: { kind: "doc", flipId: true },
  couple: { kind: "doc" },
  player: { kind: "doc" },
  tod: { kind: "doc" },
  game: { kind: "doc", flip: flipField("by") },
  gview: { kind: "doc", flip: flipField("by") },
  ttt: {
    kind: "doc",
    flip: ((g: { board: (Sender | null)[]; turn: Sender; starter: Sender }) => ({
      ...g,
      board: g.board.map(swapCell),
      turn: swap(g.turn),
      starter: swap(g.starter),
    })) as Flip,
  },
  scores: { kind: "doc", flip: swapPair as Flip },
  memory: {
    kind: "doc",
    flip: ((m: { turn: Sender; points: { me: number; partner: number } }) => ({ ...m, turn: swap(m.turn), points: swapPair(m.points) })) as Flip,
  },
  wyr: {
    kind: "doc",
    flip: ((w: { picks: { me: number | null; partner: number | null } }) => ({ ...w, picks: swapPair(w.picks) })) as Flip,
  },
  c4: {
    kind: "doc",
    flip: ((g: { board: (Sender | null)[]; turn: Sender; starter: Sender; wins: { me: number; partner: number } }) => ({
      ...g,
      board: g.board.map(swapCell),
      turn: swap(g.turn),
      starter: swap(g.starter),
      wins: swapPair(g.wins),
    })) as Flip,
  },
  rps: {
    kind: "doc",
    flip: ((g: { picks: { me: number | null; partner: number | null }; history?: { me: number; partner: number }[] }) => ({
      ...g,
      picks: swapPair(g.picks),
      history: (g.history ?? []).map((h) => swapPair(h)),
    })) as Flip,
  },
  nhie: {
    kind: "doc",
    flip: ((g: { answers: { me: boolean | null; partner: boolean | null }; haves: { me: number; partner: number } }) => ({
      ...g,
      answers: swapPair(g.answers),
      haves: swapPair(g.haves),
    })) as Flip,
  },
  quiz: {
    kind: "doc",
    flip: ((g: { subject: Sender; points: { me: number; partner: number } }) => ({ ...g, subject: swap(g.subject), points: swapPair(g.points) })) as Flip,
  },
} satisfies Record<string, ColumnSpec>;

export type Column = keyof typeof COLUMNS;
export type ListColumn = { [K in Column]: (typeof COLUMNS)[K]["kind"] extends "list" ? K : never }[Column];

/** Where a doc is kept: "couple" or "member:me". */
export const docKey = (col: string, id: string) => (id === "doc" ? col : `${col}:${id}`);

type Meta = Record<string, [ts: number, by: string, deleted: 0 | 1]>;

const META = "sync-meta";
const MAX_MESSAGES = 600;
const TOMBSTONE_TTL = 60 * 24 * 60 * 60 * 1000;
const ITEM = "item:";
const DOC = "doc:";
const LOCAL = "local:";

const isNewer = (ts: number, by: string, prev?: Meta[string]) => !prev || ts > prev[0] || (ts === prev[0] && by > prev[1]);
const byTime = (a: { at?: number; id: string }, b: { at?: number; id: string }) => (a.at ?? 0) - (b.at ?? 0) || (a.id < b.id ? -1 : 1);

/** Where the engine saves things. One `write` is all-or-nothing, so items and the catch-up position never disagree. */
export interface Persistence {
  /** Resolves once the data is really stored (rejects if it couldn't be). */
  write(puts: [string, unknown][], removes: string[]): void | Promise<void>;
  clear(): Promise<void>;
}

const localPersistence: Persistence = {
  write: (puts, removes) => {
    for (const [key, value] of puts) writeStore(key, value);
    for (const key of removes) removeStore(key);
  },
  clear: async () => clearStore(),
};

/** Open this room's saved data: IndexedDB in browsers, localStorage as a fallback (and in tests). */
export async function openPersistence(roomId: string): Promise<{ persist: Persistence; data: Record<string, unknown> }> {
  if (idbAvailable()) {
    const prefix = `r:${roomId.slice(0, 16)}:`;
    try {
      const data = await idbLoadPrefix(prefix);
      const persist: Persistence = {
        write: (puts, removes) =>
          idbWrite(
            puts.map(([key, value]) => [prefix + key, value]),
            removes.map((key) => prefix + key),
          ),
        clear: () => idbClearPrefix(prefix).catch(() => undefined),
      };
      return { persist, data };
    } catch {
      /* private mode etc. — fall back */
    }
  }
  return { persist: localPersistence, data: readAllScoped() };
}

export class SyncEngine {
  /** Called with every local change so it can be encrypted and sent. */
  sender: ((put: Put) => void) | null = null;
  /** Called after a change from the partner has been applied (for notifications). */
  onRemote: ((put: Put, created: boolean) => void) | null = null;

  private cache = new Map<string, unknown>();
  private listeners = new Map<string, Set<() => void>>();
  private dirtyItems = new Set<string>();
  private dirtyKeys = new Set<string>();
  private pending = new Map<string, Set<string>>();
  private meta: Meta;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  /** true while every write so far has been stored. */
  private writing: Promise<boolean> = Promise.resolve(true);

  constructor(
    readonly device: string,
    private clock: () => number = Date.now,
    readonly persist: Persistence = localPersistence,
    data: Record<string, unknown> = readAllScoped(),
  ) {
    this.meta = (data[META] as Meta) ?? {};
    const lists = new Map<string, { id: string; at?: number }[]>();
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(ITEM)) {
        const col = key.slice(ITEM.length, key.indexOf("/"));
        if (!(col in COLUMNS)) continue;
        const list = lists.get(col) ?? [];
        list.push(value as { id: string });
        lists.set(col, list);
      } else if (key.startsWith(DOC) || key.startsWith(LOCAL)) {
        this.cache.set(key.startsWith(DOC) ? key.slice(DOC.length) : key, value);
      }
    }
    for (const [col, list] of lists) this.cache.set(col, list.sort(byTime));
    this.pruneTombstones();
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", () => this.flush());
      // Phones often close background apps without "pagehide", so save as soon as we're hidden.
      document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && this.flush());
    }
  }

  now = () => this.clock();

  setClock(clock: () => number) {
    this.clock = clock;
  }

  // ---------- reading ----------

  /** Current value (callers should pass a stable `fallback`, e.g. a module constant). */
  get<T>(key: string, fallback: T): T {
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

  /** Device-only values (the offline outbox…) saved with the room but never shared. */
  getLocal<T>(key: string, fallback: T): T {
    return this.get(LOCAL + key, fallback);
  }

  setLocal(key: string, value: unknown) {
    this.cache.set(LOCAL + key, value);
    this.dirtyKeys.add(LOCAL + key);
    this.scheduleFlush();
  }

  // ---------- writing ----------

  /** Change something locally and share it with your partner. `data = null` deletes. */
  put(col: Column, id: string, data: unknown | null) {
    const prev = this.meta[`${col}/${id}`];
    const ts = Math.max(this.clock(), prev ? prev[0] + 1 : 0);
    const put: Put = { col, id, data, ts, by: this.device };
    if (this.apply(put)) {
      // Queue it for sending first, so the item and its outbox entry are saved together.
      this.sender?.(put);
      this.flush();
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
        data = spec.kind === "list" ? this.get<{ id: string }[]>(col, []).find((i) => i?.id === id) ?? null : this.get<unknown>(docKey(col, id), null);
        if (data === null) continue;
      }
      const local: Put = { col, id, data, ts, by };
      puts.push(by === this.device ? local : this.flipPut(local));
    }
    return puts.sort((a, b) => a.ts - b.ts);
  }

  /** Save everything that changed. Resolves true once it (and every earlier save) is really stored. */
  flush(): Promise<boolean> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.dirtyItems.size === 0 && this.dirtyKeys.size === 0) return this.writing;
    const puts: [string, unknown][] = [];
    const removes: string[] = [];
    for (const mk of this.dirtyItems) {
      const slash = mk.indexOf("/");
      const item = this.get<{ id: string }[]>(mk.slice(0, slash), []).find((i) => i?.id === mk.slice(slash + 1));
      if (item) puts.push([ITEM + mk, item]);
      else removes.push(ITEM + mk);
    }
    for (const key of this.dirtyKeys) {
      const value = this.cache.get(key);
      const storeKey = key.startsWith(LOCAL) ? key : DOC + key;
      if (value === undefined) removes.push(storeKey);
      else puts.push([storeKey, value]);
    }
    puts.push([META, this.meta]);
    this.dirtyItems.clear();
    this.dirtyKeys.clear();
    let write: Promise<void>;
    try {
      write = Promise.resolve(this.persist.write(puts, removes));
    } catch (err) {
      write = Promise.reject(err);
    }
    const before = this.writing;
    this.writing = Promise.all([before, write.then(() => true, () => false)]).then(([a, b]) => a && b);
    return this.writing;
  }

  /** Delete everything this device saved for the room. */
  async wipe() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.dirtyItems.clear();
    this.dirtyKeys.clear();
    this.cache.clear();
    await this.persist.clear();
  }

  // ---------- internals ----------

  private exists(col: string, id: string): boolean {
    const spec = COLUMNS[col as Column] as ColumnSpec;
    if (spec.kind === "list") return this.get<{ id: string }[]>(col, []).some((i) => i?.id === id);
    return this.cache.get(docKey(col, id)) !== undefined;
  }

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
      const list = this.get<{ id: string; at?: number }[]>(put.col, []);
      const index = list.findIndex((item) => item?.id === put.id);
      let next = list;
      if (put.data === null) {
        if (index >= 0) next = list.filter((_, i) => i !== index);
      } else if (index >= 0) {
        next = list.slice();
        next[index] = put.data as { id: string };
      } else {
        next = [...list, put.data as { id: string; at?: number }];
        // Keep lists in time order even when items arrive out of order.
        if (next.length > 1 && byTime(next[next.length - 2], next[next.length - 1]) > 0) next.sort(byTime);
        if (put.col === "messages" && next.length > MAX_MESSAGES) {
          for (const old of next.slice(0, next.length - MAX_MESSAGES)) this.dirtyItems.add(`messages/${old.id}`);
          next = next.slice(next.length - MAX_MESSAGES);
        }
      }
      this.dirtyItems.add(mk);
      if (next !== list) {
        this.cache.set(put.col, next);
        this.notify(put.col);
      }
    } else {
      const key = docKey(put.col, put.id);
      this.cache.set(key, put.data === null ? undefined : put.data);
      this.dirtyKeys.add(key);
      this.notify(key);
    }
    return true;
  }

  private notify(key: string) {
    this.listeners.get(key)?.forEach((listener) => listener());
  }

  private scheduleFlush(ms = 300) {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), ms);
  }

  private pruneTombstones() {
    const cutoff = this.clock() - TOMBSTONE_TTL;
    for (const [mk, entry] of Object.entries(this.meta)) if (entry[2] === 1 && entry[0] < cutoff) delete this.meta[mk];
  }
}
