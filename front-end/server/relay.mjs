// The UsSpace real-time relay.
//
// • Rooms are identified by a hash of the secret code — the code itself never reaches the server.
// • Joining needs proof of the code (a key derived from it). Wrong guesses are rate-limited and locked out.
// • A room accepts exactly two devices. After that it is locked, even if the code leaks.
// • Every event is end-to-end encrypted by the browsers. The server stores and forwards
//   opaque ciphertext and can never read messages, names, photos or drawings.
// • Events are kept only until BOTH phones have saved them (each phone keeps its own copy).
// • Calls: set-up messages are relayed as encrypted signals. If two phones can't connect directly,
//   the (encrypted) call audio/video is passed through here as binary frames — never stored.
// • Optional free database (see kv.mjs): remembers closed rooms and each room's two devices across restarts.

import { createHash, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import { RoomStore } from "./store.mjs";

export const LIMITS = {
  /** Biggest message: a 2-minute video (8 MB), encrypted. */
  maxPayload: 16 * 1024 * 1024,
  maxSignal: 64 * 1024,
  /** Biggest live call frame (one video picture or a little audio). */
  maxMediaFrame: 96 * 1024,
  maxMembers: 2,
  maxSocketsPerRoom: 8,
  authTimeoutMs: 10_000,
  heartbeatMs: 30_000,
  batchSize: 200,
  /** Catch-up messages are split so a few big videos don't make one giant message. */
  batchBytes: 4 * 1024 * 1024,
  messages: { burst: 200, perSec: 40 },
  signals: { burst: 120, perSec: 20 },
  /** Call audio/video passed through the server, in bytes. */
  media: { burst: 1_000_000, perSec: 300_000 },
  ipConnections: { burst: 40, perSec: 1 },
  ipAuth: { burst: 15, perSec: 0.2 },
  roomFailures: { max: 10, windowMs: 15 * 60_000 },
};

const HEX32 = /^[0-9a-f]{32}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const EPOCH = /^[0-9a-f]{16}$/;
const REF = /^[\w-]{1,64}$/;
const DAY = 24 * 60 * 60;
const CLOSED_TTL = 180 * DAY;
const RECORD_TTL = 90 * DAY;
const DEFAULT_ICE = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

/** A simple token bucket: `burst` tokens, refilled at `perSec`. */
class Bucket {
  /** @param {{ burst: number, perSec: number }} rate @param {() => number} now */
  constructor(rate, now) {
    this.rate = rate;
    this.now = now;
    this.tokens = rate.burst;
    this.last = now();
  }
  refill() {
    const t = this.now();
    this.tokens = Math.min(this.rate.burst, this.tokens + ((t - this.last) / 1000) * this.rate.perSec);
    this.last = t;
  }
  /** Is there a token left? (doesn't use it) */
  has() {
    this.refill();
    return this.tokens >= 1;
  }
  take(n = 1) {
    this.refill();
    if (this.tokens < n) return false;
    this.tokens -= n;
    return true;
  }
}

/**
 * @typedef {import("ws").WebSocket} WebSocket
 * @typedef {import("./store.mjs").Room} Room
 * @typedef {import("./kv.mjs").Kv} Kv
 * @typedef {{ ws: WebSocket, ip: string, roomId: string | null, device: string | null, alive: boolean,
 *   msgs: Bucket, sigs: Bucket, media: Bucket, queue: Promise<void> }} Conn
 */

/**
 * @param {{ dataDir?: string | null, allowedOrigins?: string[], trustProxy?: boolean, path?: string,
 *   now?: () => number, limits?: Partial<typeof LIMITS>, storeLimits?: object, kv?: Kv | null,
 *   ice?: { get(): Promise<object[]> } | null }} [options]
 */
export function createRelay(options = {}) {
  const { dataDir = null, allowedOrigins = [], trustProxy = false, path = "/ws", now = Date.now, kv = null, ice = null } = options;
  const L = { ...LIMITS, ...options.limits };
  const store = new RoomStore({ dir: dataDir, now, limits: options.storeLimits });
  const wss = new WebSocketServer({ noServer: true, maxPayload: L.maxPayload, perMessageDeflate: false });
  /** @type {Map<string, Set<Conn>>} */
  const roomSockets = new Map();
  /** Rooms closed by their owners: never re-created, so an offline phone can't bring one back. */
  /** @type {Map<string, number>} */
  const closedRooms = new Map();
  /** When each room's record was last written to the database. @type {Map<string, number>} */
  const recordSaved = new Map();
  /** @type {Map<string, { conn: Bucket, auth: Bucket, last: number }>} */
  const ips = new Map();

  const logKv = (/** @type {unknown} */ err) => console.error("[usspace] database:", err instanceof Error ? err.message : err);

  const ipState = (/** @type {string} */ ip) => {
    let state = ips.get(ip);
    if (!state) {
      state = { conn: new Bucket(L.ipConnections, now), auth: new Bucket(L.ipAuth, now), last: now() };
      ips.set(ip, state);
    }
    state.last = now();
    return state;
  };

  const send = (/** @type {WebSocket} */ ws, /** @type {object} */ msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  const fail = (/** @type {Conn} */ conn, /** @type {string} */ code, /** @type {string} */ message, /** @type {object} */ extra = {}) =>
    send(conn.ws, { t: "error", code, message, ...extra });

  const sockets = (/** @type {string} */ roomId) => [...(roomSockets.get(roomId) ?? [])];
  const peers = (/** @type {Conn} */ conn) => sockets(/** @type {string} */ (conn.roomId)).filter((c) => c !== conn);

  // ---------- the optional database ----------

  /** Remember which two devices own the room (survives restarts). @param {Room} room */
  const saveRecord = (room) => {
    if (!kv) return;
    recordSaved.set(room.id, now());
    const record = { verifier: room.verifier, createdAt: room.createdAt, members: room.members.map((m) => m.device) };
    kv.set(`usspace:room:${room.id}`, JSON.stringify(record), RECORD_TTL).catch(logKv);
  };

  /** Closed rooms: in memory, then in the database (only needed when the room isn't loaded). @param {string} id */
  const isClosed = async (id) => {
    if (closedRooms.has(id)) return true;
    if (!kv || store.get(id)) return false;
    try {
      if (await kv.get(`usspace:closed:${id}`)) {
        closedRooms.set(id, now());
        return true;
      }
    } catch (err) {
      logKv(err);
    }
    return false;
  };

  /** The room from memory/disk, or restored from its database record after a restart. @param {string} id */
  const loadRoom = async (id) => {
    const room = store.get(id);
    if (room || !kv) return room;
    try {
      const raw = await kv.get(`usspace:room:${id}`);
      if (!raw) return null;
      return store.get(id) ?? store.restore(id, JSON.parse(raw));
    } catch (err) {
      logKv(err);
      return null;
    }
  };

  // ---------- presence ----------

  /** Presence as seen by `conn`: is the *other* member connected right now? @param {Conn} conn */
  const presenceFor = (conn) => {
    const room = store.get(/** @type {string} */ (conn.roomId));
    const partner = room?.members.find((m) => m.device !== conn.device) ?? null;
    const partnerOnline = !!partner && sockets(/** @type {string} */ (conn.roomId)).some((c) => c.device === partner.device);
    return { members: room?.members.length ?? 0, partnerOnline, partnerSeen: partner?.seen || null };
  };

  const broadcastPresence = (/** @type {string} */ roomId) => {
    for (const c of sockets(roomId)) send(c.ws, { t: "presence", ...presenceFor(c) });
  };

  /** @param {Conn} conn @param {Room} room @param {string} device */
  const attach = (conn, room, device) => {
    if (conn.ws.readyState !== conn.ws.OPEN) return false;
    const set = roomSockets.get(room.id) ?? new Set();
    if (set.size >= L.maxSocketsPerRoom) {
      fail(conn, "rate_limited", "Too many open windows for this room.");
      return false;
    }
    set.add(conn);
    roomSockets.set(room.id, set);
    conn.roomId = room.id;
    conn.device = device;
    const member = room.members.find((m) => m.device === device);
    if (member) member.seen = now();
    store.touch(room);
    if (kv && now() - (recordSaved.get(room.id) ?? 0) > DAY * 1000) saveRecord(room);
    send(conn.ws, { t: "welcome", room: room.id, epoch: room.epoch, now: now(), head: room.head, ...presenceFor(conn) });
    broadcastPresence(room.id);
    return true;
  };

  const detach = (/** @type {Conn} */ conn) => {
    if (!conn.roomId) return;
    const set = roomSockets.get(conn.roomId);
    set?.delete(conn);
    if (set && set.size === 0) roomSockets.delete(conn.roomId);
    const room = store.get(conn.roomId);
    const member = room?.members.find((m) => m.device === conn.device);
    if (room && member) {
      member.seen = now();
      store.touch(room);
    }
    broadcastPresence(conn.roomId);
    conn.roomId = null;
  };

  /** @param {Conn} conn @param {Room} room @param {number} since */
  const sendBacklog = (conn, room, since) => {
    const events = store.since(room, since);
    if (events.length === 0) return send(conn.ws, { t: "batch", events: [], done: true });
    /** @type {{ seq: number, e: string }[]} */
    let chunk = [];
    let bytes = 0;
    events.forEach((ev, i) => {
      chunk.push({ seq: ev.seq, e: ev.e });
      bytes += ev.e.length;
      const last = i === events.length - 1;
      if (last || chunk.length >= L.batchSize || bytes >= L.batchBytes) {
        send(conn.ws, { t: "batch", events: chunk, done: last });
        chunk = [];
        bytes = 0;
      }
    });
  };

  /**
   * A device is missing events the server already forgot (a new phone after "leave", or a phone
   * whose copy was lost). Ask the other device to send everything it has again.
   * @param {Room} room @param {string} needs
   */
  const requestResync = (room, needs) => {
    const providers = sockets(room.id).filter((c) => c.device !== needs);
    if (providers.length === 0) {
      room.resyncFor = needs;
      store.touch(room);
      return;
    }
    for (const c of providers) send(c.ws, { t: "resync" });
    room.resyncFor = null;
  };

  const verify = (/** @type {string} */ auth, /** @type {string} */ verifier) => {
    const digest = createHash("sha256").update(Buffer.from(auth, "hex")).digest();
    const expected = Buffer.from(verifier, "hex");
    return expected.length === digest.length && timingSafeEqual(digest, expected);
  };

  /** @param {Conn} conn @param {any} msg */
  const handle = async (conn, msg) => {
    if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return fail(conn, "bad_request", "Unknown message.");

    switch (msg.t) {
      case "create": {
        if (conn.roomId) return fail(conn, "bad_request", "Already in a room.");
        if (!HEX32.test(msg.room) || !HEX64.test(msg.verifier) || !HEX32.test(msg.device))
          return fail(conn, "bad_request", "Invalid room details.");
        if (await isClosed(msg.room)) return fail(conn, "closed", "This room was closed and everything in it was deleted.");
        if (!ipState(conn.ip).auth.take()) return fail(conn, "rate_limited", "Too many attempts. Please wait a minute.");
        if (await loadRoom(msg.room)) return fail(conn, "exists", "A room with this code already exists.");
        const room = store.create(msg.room, msg.verifier, msg.device);
        saveRecord(room);
        if (attach(conn, room, msg.device)) send(conn.ws, { t: "batch", events: [], done: true });
        return;
      }

      case "join": {
        if (conn.roomId) return fail(conn, "bad_request", "Already in a room.");
        if (!HEX32.test(msg.room) || !HEX64.test(msg.auth) || !HEX32.test(msg.device))
          return fail(conn, "bad_request", "Invalid room details.");
        const since = Number.isSafeInteger(msg.since) && msg.since >= 0 ? msg.since : 0;
        if (await isClosed(msg.room)) return fail(conn, "closed", "This room was closed and everything in it was deleted.");
        // Only wrong guesses use up this IP's tries, so reconnecting is always free.
        const tries = ipState(conn.ip).auth;
        if (!tries.has()) return fail(conn, "rate_limited", "Too many attempts. Please wait a minute.");
        const room = await loadRoom(msg.room);
        if (!room) {
          tries.take();
          return fail(conn, "not_found", "No room found with that code.");
        }

        const windowStart = now() - L.roomFailures.windowMs;
        room.failures = room.failures.filter((t) => t > windowStart);
        if (room.failures.length >= L.roomFailures.max)
          return fail(conn, "rate_limited", "This room is temporarily locked after too many wrong attempts.");
        if (!verify(msg.auth, room.verifier)) {
          tries.take();
          room.failures.push(now());
          return fail(conn, "denied", "That code is not right.");
        }

        if (!room.members.some((m) => m.device === msg.device)) {
          if (room.members.length >= L.maxMembers) return fail(conn, "full", "This room already has two people.");
          room.members.push({ device: msg.device, joinedAt: now(), seen: now(), acked: 0 });
          store.touch(room);
          saveRecord(room);
        }
        // A different epoch means the server lost this room since the phone was last here: send everything.
        const from = typeof msg.epoch === "string" && EPOCH.test(msg.epoch) && msg.epoch !== room.epoch ? 0 : since;
        if (!attach(conn, room, msg.device)) return;
        sendBacklog(conn, room, from);
        if (from < room.floor) requestResync(room, msg.device);
        else if (room.resyncFor && room.resyncFor !== msg.device) {
          send(conn.ws, { t: "resync" });
          room.resyncFor = null;
        }
        return;
      }

      case "put": {
        if (!conn.roomId) return fail(conn, "denied", "Join a room first.");
        const ref = REF.test(msg.ref) ? msg.ref : undefined;
        if (!conn.msgs.take()) return fail(conn, "rate_limited", "Slow down a little.", { ref });
        if (!ref || !HEX32.test(msg.key) || typeof msg.e !== "string" || msg.e.length > L.maxPayload)
          return fail(conn, "bad_request", "Invalid event.", { ref });
        const room = store.get(conn.roomId);
        if (!room) return fail(conn, "not_found", "This room no longer exists.", { ref });
        const event = store.append(room, msg.key, msg.e);
        if (!event) return fail(conn, "busy", "The server is busy. Trying again soon.", { ref });
        send(conn.ws, { t: "ack", ref, seq: event.seq, at: event.at });
        for (const peer of peers(conn)) send(peer.ws, { t: "event", seq: event.seq, e: msg.e });
        return;
      }

      case "seen": {
        // The phone has safely saved everything up to `seq`.
        if (!conn.roomId || !conn.device) return;
        const room = store.get(conn.roomId);
        if (room) store.acknowledge(room, conn.device, Number(msg.seq));
        return;
      }

      case "signal": {
        if (!conn.roomId) return fail(conn, "denied", "Join a room first.");
        if (!conn.sigs.take()) return;
        if (typeof msg.e !== "string" || msg.e.length > L.maxSignal) return fail(conn, "bad_request", "Invalid signal.");
        for (const peer of peers(conn)) if (peer.device !== conn.device) send(peer.ws, { t: "signal", e: msg.e });
        return;
      }

      case "ice": {
        // Network routes for calls (TURN credentials stay server-side until a room member asks).
        if (!conn.roomId) return fail(conn, "denied", "Join a room first.");
        if (!REF.test(msg.ref) || !conn.sigs.take()) return;
        const servers = ice ? await ice.get() : DEFAULT_ICE;
        return send(conn.ws, { t: "ice", ref: msg.ref, servers });
      }

      case "leave": {
        if (!conn.roomId) return;
        const roomId = conn.roomId;
        const room = store.get(roomId);
        if (room) {
          room.members = room.members.filter((m) => m.device !== conn.device);
          if (room.members.length === 0) {
            store.delete(roomId);
            kv?.del(`usspace:room:${roomId}`).catch(logKv);
          } else {
            store.touch(room);
            saveRecord(room);
          }
        }
        for (const peer of peers(conn)) {
          if (peer.device === conn.device) {
            send(peer.ws, { t: "error", code: "left", message: "You left this room on another tab." });
            peer.ws.close(1000);
          }
        }
        detach(conn);
        conn.ws.close(1000);
        return;
      }

      case "close": {
        // Delete the room and everything in it, for both people, right now — and never let it come back.
        if (!conn.roomId) return;
        const roomId = conn.roomId;
        closedRooms.set(roomId, now());
        store.delete(roomId);
        if (kv) {
          const results = await Promise.allSettled([kv.set(`usspace:closed:${roomId}`, "1", CLOSED_TTL), kv.del(`usspace:room:${roomId}`)]);
          for (const r of results) if (r.status === "rejected") logKv(r.reason);
        }
        for (const c of sockets(roomId)) {
          send(c.ws, { t: "closed" });
          c.roomId = null;
          c.ws.close(1000);
        }
        roomSockets.delete(roomId);
        return;
      }

      case "ping":
        return send(conn.ws, { t: "pong", now: now() });

      default:
        return fail(conn, "bad_request", "Unknown message.");
    }
  };

  /** Live call audio/video (already encrypted by the phones): pass it on, never keep it. @param {Conn} conn @param {Buffer} data */
  const relayMedia = (conn, data) => {
    if (!conn.roomId || !conn.device) return;
    if (data.length > L.maxMediaFrame || !conn.media.take(data.length)) return;
    for (const peer of peers(conn)) {
      if (peer.device === conn.device || peer.ws.readyState !== peer.ws.OPEN) continue;
      // A slow connection: drop frames instead of piling them up (live calls can't wait).
      if (peer.ws.bufferedAmount > 1_000_000) continue;
      peer.ws.send(data, { binary: true });
    }
  };

  wss.on("connection", (/** @type {WebSocket} */ ws, /** @type {string} */ ip) => {
    /** @type {Conn} */
    const conn = {
      ws,
      ip,
      roomId: null,
      device: null,
      alive: true,
      msgs: new Bucket(L.messages, now),
      sigs: new Bucket(L.signals, now),
      media: new Bucket(L.media, now),
      queue: Promise.resolve(),
    };
    const authTimer = setTimeout(() => {
      if (!conn.roomId) ws.close(4001, "Authentication timeout");
    }, L.authTimeoutMs);

    ws.on("pong", () => {
      conn.alive = true;
    });
    ws.on("message", (/** @type {Buffer} */ data, isBinary) => {
      if (isBinary) return relayMedia(conn, data);
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return fail(conn, "bad_request", "Invalid JSON.");
      }
      // One message at a time per connection, in order (some steps wait for the database).
      conn.queue = conn.queue
        .then(() => handle(conn, msg))
        .catch((err) => {
          console.error("[usspace] relay error:", err);
          fail(conn, "bad_request", "Something went wrong.");
        });
    });
    ws.on("close", () => {
      clearTimeout(authTimer);
      detach(conn);
    });
    ws.on("error", () => ws.terminate());
    // @ts-expect-error -- attach the connection for the heartbeat loop
    ws.conn = conn;
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      // @ts-expect-error -- set in the connection handler
      const conn = /** @type {Conn} */ (ws.conn);
      if (!conn.alive) {
        ws.terminate();
        continue;
      }
      conn.alive = false;
      ws.ping();
    }
  }, L.heartbeatMs);

  const flusher = setInterval(() => {
    try {
      store.flush();
    } catch (err) {
      console.error("[usspace] could not save rooms:", err);
    }
  }, 1000);

  const janitor = setInterval(() => {
    store.evictIdle((id) => roomSockets.has(id));
    const cutoff = now() - 30 * 60_000;
    for (const [ip, state] of ips) if (state.last < cutoff) ips.delete(ip);
    const closedCutoff = now() - CLOSED_TTL * 1000;
    for (const [id, at] of closedRooms) if (at < closedCutoff) closedRooms.delete(id);
    for (const id of recordSaved.keys()) if (!store.rooms.has(id)) recordSaved.delete(id);
  }, 60_000);

  for (const timer of [heartbeat, flusher, janitor]) timer.unref?.();

  const clientIp = (/** @type {import("node:http").IncomingMessage} */ req) => {
    const forwarded = trustProxy ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "";
    return forwarded || req.socket.remoteAddress || "unknown";
  };

  /**
   * Hand a raw HTTP upgrade to the relay. Returns false if the URL is not ours,
   * so other WebSocket servers (like Vite's live reload) can handle it.
   * @param {import("node:http").IncomingMessage} req @param {import("node:stream").Duplex} socket @param {Buffer} head
   */
  const handleUpgrade = (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname !== path) return false;
    const reject = (/** @type {string} */ status) => {
      socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    const origin = req.headers.origin;
    if (allowedOrigins.length > 0 && (!origin || !allowedOrigins.includes(origin))) {
      reject("403 Forbidden");
      return true;
    }
    const ip = clientIp(req);
    if (!ipState(ip).conn.take()) {
      reject("429 Too Many Requests");
      return true;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, ip));
    return true;
  };

  const close = () => {
    clearInterval(heartbeat);
    clearInterval(flusher);
    clearInterval(janitor);
    store.flush();
    for (const ws of wss.clients) ws.terminate();
    wss.close();
  };

  return { handleUpgrade, close, store };
}
