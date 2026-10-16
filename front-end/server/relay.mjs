// The UsSpace real-time relay.
//
// • Rooms are identified by a hash of the secret code — the code itself never reaches the server.
// • Joining needs proof of the code (a key derived from it). Wrong guesses are rate-limited and locked out.
// • A room accepts exactly two devices. After that it is locked, even if the code leaks.
// • Every event is end-to-end encrypted by the browsers. The server stores and forwards
//   opaque ciphertext and can never read messages, names, plans or letters.

import { createHash, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import { RoomStore } from "./store.mjs";

export const LIMITS = {
  maxPayload: 768 * 1024,
  maxSignal: 8 * 1024,
  maxMembers: 2,
  maxSocketsPerRoom: 8,
  authTimeoutMs: 10_000,
  heartbeatMs: 30_000,
  batchSize: 200,
  messages: { burst: 80, perSec: 8 },
  signals: { burst: 40, perSec: 5 },
  ipConnections: { burst: 40, perSec: 1 },
  ipAuth: { burst: 15, perSec: 0.2 },
  roomFailures: { max: 10, windowMs: 15 * 60_000 },
};

const HEX32 = /^[0-9a-f]{32}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const REF = /^[\w-]{1,64}$/;

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
  take() {
    this.refill();
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

/**
 * @typedef {import("ws").WebSocket} WebSocket
 * @typedef {{ ws: WebSocket, ip: string, roomId: string | null, device: string | null, alive: boolean,
 *   msgs: Bucket, sigs: Bucket }} Conn
 */

/**
 * @param {{ dataDir?: string | null, allowedOrigins?: string[], trustProxy?: boolean,
 *   path?: string, now?: () => number, limits?: Partial<typeof LIMITS> }} [options]
 */
export function createRelay(options = {}) {
  const { dataDir = null, allowedOrigins = [], trustProxy = false, path = "/ws", now = Date.now } = options;
  const L = { ...LIMITS, ...options.limits };
  const store = new RoomStore({ dir: dataDir, now });
  const wss = new WebSocketServer({ noServer: true, maxPayload: L.maxPayload, perMessageDeflate: false });
  /** @type {Map<string, Set<Conn>>} */
  const roomSockets = new Map();
  /** @type {Map<string, { conn: Bucket, auth: Bucket, last: number }>} */
  const ips = new Map();

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

  const fail = (/** @type {Conn} */ conn, /** @type {string} */ code, /** @type {string} */ message) =>
    send(conn.ws, { t: "error", code, message });

  const peers = (/** @type {Conn} */ conn) => [...(roomSockets.get(/** @type {string} */ (conn.roomId)) ?? [])].filter((c) => c !== conn);

  /** Presence as seen by `conn`: is the *other* member connected right now? @param {Conn} conn */
  const presenceFor = (conn) => {
    const room = store.get(/** @type {string} */ (conn.roomId));
    const sockets = roomSockets.get(/** @type {string} */ (conn.roomId)) ?? new Set();
    const partner = room?.members.find((m) => m.device !== conn.device) ?? null;
    const partnerOnline = !!partner && [...sockets].some((c) => c.device === partner.device);
    return { members: room?.members.length ?? 0, partnerOnline, partnerSeen: partner?.seen ?? null };
  };

  const broadcastPresence = (/** @type {string} */ roomId) => {
    for (const c of roomSockets.get(roomId) ?? []) send(c.ws, { t: "presence", ...presenceFor(c) });
  };

  const attach = (/** @type {Conn} */ conn, /** @type {import("./store.mjs").Room} */ room, /** @type {string} */ device) => {
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
    send(conn.ws, { t: "welcome", room: room.id, now: now(), head: room.head, ...presenceFor(conn) });
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

  const sendBacklog = (/** @type {Conn} */ conn, /** @type {import("./store.mjs").Room} */ room, /** @type {number} */ since) => {
    const events = store.since(room, since).map(({ seq, e }) => ({ seq, e }));
    if (events.length === 0) return send(conn.ws, { t: "batch", events: [], done: true });
    for (let i = 0; i < events.length; i += L.batchSize) {
      send(conn.ws, { t: "batch", events: events.slice(i, i + L.batchSize), done: i + L.batchSize >= events.length });
    }
  };

  const verify = (/** @type {string} */ auth, /** @type {string} */ verifier) => {
    const digest = createHash("sha256").update(Buffer.from(auth, "hex")).digest();
    const expected = Buffer.from(verifier, "hex");
    return expected.length === digest.length && timingSafeEqual(digest, expected);
  };

  /** @param {Conn} conn @param {any} msg */
  const handle = (conn, msg) => {
    if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return fail(conn, "bad_request", "Unknown message.");

    switch (msg.t) {
      case "create": {
        if (conn.roomId) return fail(conn, "bad_request", "Already in a room.");
        if (!HEX32.test(msg.room) || !HEX64.test(msg.verifier) || !HEX32.test(msg.device))
          return fail(conn, "bad_request", "Invalid room details.");
        if (!ipState(conn.ip).auth.take()) return fail(conn, "rate_limited", "Too many attempts. Please wait a minute.");
        if (store.get(msg.room)) return fail(conn, "exists", "A room with this code already exists.");
        attach(conn, store.create(msg.room, msg.verifier, msg.device), msg.device);
        return send(conn.ws, { t: "batch", events: [], done: true });
      }

      case "join": {
        if (conn.roomId) return fail(conn, "bad_request", "Already in a room.");
        if (!HEX32.test(msg.room) || !HEX64.test(msg.auth) || !HEX32.test(msg.device))
          return fail(conn, "bad_request", "Invalid room details.");
        const since = Number.isSafeInteger(msg.since) && msg.since >= 0 ? msg.since : 0;
        // Only wrong guesses use up this IP's tries, so reconnecting is always free.
        const tries = ipState(conn.ip).auth;
        if (!tries.has()) return fail(conn, "rate_limited", "Too many attempts. Please wait a minute.");
        const room = store.get(msg.room);
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
          room.members.push({ device: msg.device, joinedAt: now(), seen: now() });
          store.touch(room);
        }
        if (attach(conn, room, msg.device)) sendBacklog(conn, room, since);
        return;
      }

      case "put": {
        if (!conn.roomId) return fail(conn, "denied", "Join a room first.");
        if (!conn.msgs.take()) return fail(conn, "rate_limited", "Slow down a little.");
        if (!REF.test(msg.ref) || !HEX32.test(msg.key) || typeof msg.e !== "string" || msg.e.length > L.maxPayload)
          return fail(conn, "bad_request", "Invalid event.");
        const room = store.get(conn.roomId);
        if (!room) return fail(conn, "not_found", "This room no longer exists.");
        const event = store.append(room, msg.key, msg.e);
        send(conn.ws, { t: "ack", ref: msg.ref, seq: event.seq, at: event.at });
        for (const peer of peers(conn)) send(peer.ws, { t: "event", seq: event.seq, e: msg.e });
        return;
      }

      case "signal": {
        if (!conn.roomId) return fail(conn, "denied", "Join a room first.");
        if (!conn.sigs.take()) return;
        if (typeof msg.e !== "string" || msg.e.length > L.maxSignal) return fail(conn, "bad_request", "Invalid signal.");
        for (const peer of peers(conn)) if (peer.device !== conn.device) send(peer.ws, { t: "signal", e: msg.e });
        return;
      }

      case "leave": {
        if (!conn.roomId) return;
        const roomId = conn.roomId;
        const room = store.get(roomId);
        if (room) {
          room.members = room.members.filter((m) => m.device !== conn.device);
          if (room.members.length === 0) store.delete(roomId);
          else store.touch(room);
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

      case "ping":
        return send(conn.ws, { t: "pong", now: now() });

      default:
        return fail(conn, "bad_request", "Unknown message.");
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
    };
    const authTimer = setTimeout(() => {
      if (!conn.roomId) ws.close(4001, "Authentication timeout");
    }, L.authTimeoutMs);

    ws.on("pong", () => {
      conn.alive = true;
    });
    ws.on("message", (data, isBinary) => {
      if (isBinary) return fail(conn, "bad_request", "Text messages only.");
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return fail(conn, "bad_request", "Invalid JSON.");
      }
      handle(conn, msg);
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
