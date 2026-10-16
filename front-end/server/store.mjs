// Room storage for the UsSpace relay.
// The server only ever stores *encrypted* events. It never sees the room code,
// names, messages or any other content — just opaque blobs, sequence numbers and sizes.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const STORE_LIMITS = {
  /** Events kept per room. Older ones are dropped first (clients keep their own copy). */
  maxEvents: 6000,
  /** Total encrypted bytes kept per room. */
  maxBytes: 40 * 1024 * 1024,
  /** Rooms nobody has opened for this long are deleted. */
  roomTtlMs: 180 * 24 * 60 * 60 * 1000,
  /** Rooms with no open connection are dropped from memory after this long. */
  idleEvictMs: 10 * 60 * 1000,
};

const ROOM_ID = /^[0-9a-f]{32}$/;

/**
 * @typedef {{ device: string, joinedAt: number, seen: number }} Member
 * @typedef {{ seq: number, key: string, e: string, at: number }} StoredEvent
 * @typedef {{ id: string, verifier: string, createdAt: number, touchedAt: number, head: number,
 *   bytes: number, members: Member[], events: Map<string, StoredEvent>, failures: number[] }} Room
 */

export class RoomStore {
  /** @param {{ dir?: string | null, now?: () => number }} [options] */
  constructor({ dir = null, now = Date.now } = {}) {
    this.dir = dir;
    this.now = now;
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Set<string>} */
    this.dirty = new Set();
    /** @type {Set<string>} */
    this.deleted = new Set();
    if (dir) {
      mkdirSync(dir, { recursive: true });
      this.removeExpired();
    }
  }

  /** @param {string} id */
  file(id) {
    return join(/** @type {string} */ (this.dir), `${id}.json`);
  }

  /** @param {string} id @returns {Room | null} */
  get(id) {
    if (!ROOM_ID.test(id)) return null;
    const cached = this.rooms.get(id);
    if (cached) return cached;
    if (!this.dir || !existsSync(this.file(id))) return null;
    try {
      const raw = JSON.parse(readFileSync(this.file(id), "utf8"));
      /** @type {Room} */
      const room = {
        id,
        verifier: raw.verifier,
        createdAt: raw.createdAt,
        touchedAt: raw.touchedAt,
        head: raw.head,
        bytes: 0,
        members: raw.members ?? [],
        events: new Map(),
        failures: [],
      };
      for (const ev of raw.events ?? []) {
        room.events.set(ev.key, ev);
        room.bytes += ev.e.length;
      }
      this.rooms.set(id, room);
      return room;
    } catch {
      return null;
    }
  }

  /** @param {string} id @param {string} verifier @param {string} device */
  create(id, verifier, device) {
    const now = this.now();
    /** @type {Room} */
    const room = {
      id,
      verifier,
      createdAt: now,
      touchedAt: now,
      head: 0,
      bytes: 0,
      members: [{ device, joinedAt: now, seen: now }],
      events: new Map(),
      failures: [],
    };
    this.rooms.set(id, room);
    this.deleted.delete(id);
    this.touch(room);
    return room;
  }

  /** @param {Room} room */
  touch(room) {
    room.touchedAt = this.now();
    this.dirty.add(room.id);
  }

  /**
   * Store an encrypted event. Events with the same `key` replace each other
   * (only the newest version of each item is kept), so storage stays small.
   * @param {Room} room @param {string} key @param {string} e
   */
  append(room, key, e) {
    const previous = room.events.get(key);
    if (previous) {
      room.events.delete(key);
      room.bytes -= previous.e.length;
    }
    const event = { seq: ++room.head, key, e, at: this.now() };
    room.events.set(key, event);
    room.bytes += e.length;
    while (room.events.size > STORE_LIMITS.maxEvents || room.bytes > STORE_LIMITS.maxBytes) {
      const oldestKey = room.events.keys().next().value;
      if (oldestKey === undefined) break;
      room.bytes -= /** @type {StoredEvent} */ (room.events.get(oldestKey)).e.length;
      room.events.delete(oldestKey);
    }
    this.touch(room);
    return event;
  }

  /** Events newer than `seq`, oldest first. @param {Room} room @param {number} seq */
  since(room, seq) {
    /** @type {StoredEvent[]} */
    const out = [];
    for (const ev of room.events.values()) if (ev.seq > seq) out.push(ev);
    return out;
  }

  /** @param {string} id */
  delete(id) {
    this.rooms.delete(id);
    this.dirty.delete(id);
    this.deleted.add(id);
  }

  /** Write changed rooms to disk (atomic: write a temp file, then rename). */
  flush() {
    if (!this.dir) {
      this.dirty.clear();
      this.deleted.clear();
      return;
    }
    for (const id of this.deleted) {
      try {
        rmSync(this.file(id), { force: true });
      } catch {
        /* already gone */
      }
    }
    this.deleted.clear();
    for (const id of this.dirty) {
      const room = this.rooms.get(id);
      if (!room) continue;
      const data = {
        verifier: room.verifier,
        createdAt: room.createdAt,
        touchedAt: room.touchedAt,
        head: room.head,
        members: room.members,
        events: [...room.events.values()],
      };
      const tmp = `${this.file(id)}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, this.file(id));
    }
    this.dirty.clear();
  }

  /** Forget rooms from memory that nobody is using (they stay on disk). @param {(id: string) => boolean} isActive */
  evictIdle(isActive) {
    if (!this.dir) return;
    const cutoff = this.now() - STORE_LIMITS.idleEvictMs;
    for (const [id, room] of this.rooms) {
      if (!isActive(id) && !this.dirty.has(id) && room.touchedAt < cutoff) this.rooms.delete(id);
    }
  }

  removeExpired() {
    if (!this.dir) return;
    const cutoff = this.now() - STORE_LIMITS.roomTtlMs;
    for (const name of readdirSync(this.dir)) {
      if (!name.endsWith(".json")) continue;
      try {
        const raw = JSON.parse(readFileSync(join(this.dir, name), "utf8"));
        if ((raw.touchedAt ?? 0) < cutoff) rmSync(join(this.dir, name), { force: true });
      } catch {
        rmSync(join(this.dir, name), { force: true });
      }
    }
  }
}
