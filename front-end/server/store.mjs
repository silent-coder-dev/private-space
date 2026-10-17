// Room storage for the UsSpace relay.
// The server only ever stores *encrypted* events. It never sees the room code,
// names, messages or any other content — just opaque blobs, sequence numbers and sizes.
//
// The server is a relay, not an archive: both phones keep their own copy, so once BOTH devices
// have saved an event, the server forgets it ("compaction"). It only holds what is still on its way.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const STORE_LIMITS = {
  /** Events kept per room. Older ones are dropped first (clients keep their own copy). */
  maxEvents: 6000,
  /** Encrypted bytes kept per room (photos and 2-minute videos waiting for your partner). */
  maxBytes: 80 * 1024 * 1024,
  /** Encrypted bytes kept for ALL rooms together (keeps a small free server healthy). */
  maxTotalBytes: 320 * 1024 * 1024,
  /** Rooms nobody has opened for this long are deleted (phones re-create them if they come back). */
  roomTtlMs: 60 * 24 * 60 * 60 * 1000,
  /** Rooms with no open connection are dropped from memory after this long (disk mode). */
  idleEvictMs: 10 * 60 * 1000,
};

const ROOM_ID = /^[0-9a-f]{32}$/;
const newEpoch = () => randomBytes(8).toString("hex");

/**
 * @typedef {{ device: string, joinedAt: number, seen: number, acked: number }} Member
 * @typedef {{ seq: number, key: string, e: string, at: number }} StoredEvent
 * @typedef {{ id: string, verifier: string, epoch: string, createdAt: number, touchedAt: number, head: number,
 *   floor: number, bytes: number, members: Member[], events: Map<string, StoredEvent>, failures: number[],
 *   resyncFor: string | null }} Room
 */

export class RoomStore {
  /** @param {{ dir?: string | null, now?: () => number, limits?: Partial<typeof STORE_LIMITS> }} [options] */
  constructor({ dir = null, now = Date.now, limits = {} } = {}) {
    this.dir = dir;
    this.now = now;
    this.limits = { ...STORE_LIMITS, ...limits };
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Set<string>} */
    this.dirty = new Set();
    /** @type {Set<string>} */
    this.deleted = new Set();
    this.totalBytes = 0;
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
        epoch: raw.epoch ?? newEpoch(),
        createdAt: raw.createdAt,
        touchedAt: raw.touchedAt,
        head: raw.head,
        floor: raw.floor ?? 0,
        bytes: 0,
        members: (raw.members ?? []).map((/** @type {Member} */ m) => ({ ...m, acked: m.acked ?? 0 })),
        events: new Map(),
        failures: [],
        resyncFor: raw.resyncFor ?? null,
      };
      for (const ev of raw.events ?? []) {
        room.events.set(ev.key, ev);
        room.bytes += ev.e.length;
      }
      this.totalBytes += room.bytes;
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
      epoch: newEpoch(),
      createdAt: now,
      touchedAt: now,
      head: 0,
      floor: 0,
      bytes: 0,
      members: [{ device, joinedAt: now, seen: now, acked: 0 }],
      events: new Map(),
      failures: [],
      resyncFor: null,
    };
    this.rooms.set(id, room);
    this.deleted.delete(id);
    this.touch(room);
    return room;
  }

  /**
   * Bring back a room whose events were lost (server restart) from its saved record.
   * It gets a NEW epoch, so both phones notice and re-upload what they have.
   * @param {string} id @param {{ verifier: string, createdAt?: number, members?: string[] }} record
   */
  restore(id, record) {
    const now = this.now();
    /** @type {Room} */
    const room = {
      id,
      verifier: record.verifier,
      epoch: newEpoch(),
      createdAt: record.createdAt ?? now,
      touchedAt: now,
      head: 0,
      floor: 0,
      bytes: 0,
      members: (record.members ?? []).slice(0, 2).map((device) => ({ device, joinedAt: now, seen: 0, acked: 0 })),
      events: new Map(),
      failures: [],
      resyncFor: null,
    };
    this.rooms.set(id, room);
    this.touch(room);
    return room;
  }

  /** @param {Room} room */
  touch(room) {
    room.touchedAt = this.now();
    this.dirty.add(room.id);
  }

  /** @param {Room} room @param {StoredEvent} ev */
  drop(room, ev) {
    room.events.delete(ev.key);
    room.bytes -= ev.e.length;
    this.totalBytes -= ev.e.length;
  }

  /**
   * Store an encrypted event. Events with the same `key` replace each other
   * (only the newest version of each item is kept), so storage stays small.
   * Returns null when the server is too full right now (the phone simply retries later).
   * @param {Room} room @param {string} key @param {string} e
   */
  append(room, key, e) {
    const previous = room.events.get(key);
    const freed = previous ? previous.e.length : 0;
    if (this.totalBytes - freed + e.length > this.limits.maxTotalBytes) return null;
    if (previous) this.drop(room, previous);
    const event = { seq: ++room.head, key, e, at: this.now() };
    room.events.set(key, event);
    room.bytes += e.length;
    this.totalBytes += e.length;
    while (room.events.size > this.limits.maxEvents || room.bytes > this.limits.maxBytes) {
      const oldest = room.events.values().next().value;
      if (!oldest) break;
      this.drop(room, oldest);
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

  /**
   * A device says it has safely saved everything up to `seq`.
   * When both devices have an event, the server forgets it.
   * @param {Room} room @param {string} device @param {number} seq
   */
  acknowledge(room, device, seq) {
    const member = room.members.find((m) => m.device === device);
    if (!member || !Number.isSafeInteger(seq)) return;
    member.acked = Math.max(member.acked, Math.min(seq, room.head));
    if (room.members.length < 2) return;
    const floor = Math.min(...room.members.map((m) => m.acked));
    if (floor <= room.floor) return;
    room.floor = floor;
    for (const ev of [...room.events.values()]) if (ev.seq <= floor) this.drop(room, ev);
    this.touch(room);
  }

  /** @param {string} id */
  delete(id) {
    const room = this.rooms.get(id);
    if (room) this.totalBytes -= room.bytes;
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
        epoch: room.epoch,
        createdAt: room.createdAt,
        touchedAt: room.touchedAt,
        head: room.head,
        floor: room.floor,
        members: room.members,
        resyncFor: room.resyncFor,
        events: [...room.events.values()],
      };
      const tmp = `${this.file(id)}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, this.file(id));
    }
    this.dirty.clear();
  }

  /**
   * Housekeeping. Disk mode: forget idle rooms from memory (they stay on disk).
   * Memory mode: delete rooms nobody has opened for a long time (the phones still have everything
   * and re-create the room when they come back).
   * @param {(id: string) => boolean} isActive
   */
  evictIdle(isActive) {
    const now = this.now();
    for (const [id, room] of this.rooms) {
      if (isActive(id)) continue;
      if (this.dir) {
        if (!this.dirty.has(id) && room.touchedAt < now - this.limits.idleEvictMs) {
          this.totalBytes -= room.bytes;
          this.rooms.delete(id);
        }
      } else if (room.touchedAt < now - this.limits.roomTtlMs) {
        this.delete(id);
      }
    }
  }

  removeExpired() {
    if (!this.dir) return;
    const cutoff = this.now() - this.limits.roomTtlMs;
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
