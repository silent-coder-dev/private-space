import { itemKey, open, openBytes, randomId, seal, sealBytes, type RoomKeys } from "./crypto";
import type { Put, SyncEngine } from "./engine";
import type { RoomSession } from "./session";

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface Presence {
  members: number;
  partnerOnline: boolean;
  partnerSeen: number | null;
}

export type SignalType = "typing" | "heart" | "nudge" | "call" | "touch";
export interface Signal {
  type: SignalType;
  by: string;
  at: number;
  /** Extra data (used by calls: offers, answers…). */
  data?: unknown;
}

export type RoomErrorCode =
  | "not_found"
  | "full"
  | "denied"
  | "rate_limited"
  | "bad_request"
  | "exists"
  | "left"
  | "timeout"
  | "network"
  | "closed"
  | "busy";

export interface ClientHandlers {
  status: (status: ConnectionStatus) => void;
  presence: (presence: Presence) => void;
  signal: (signal: Signal) => void;
  /** Live call audio/video from your partner (already decrypted). */
  media?: (bytes: Uint8Array) => void;
  /** Welcome received and all missed events applied. */
  ready: () => void;
  /** Something that stops the connection for good (wrong code, room full…). */
  fatal: (code: RoomErrorCode, message: string) => void;
  /** The room was closed (by either of you): everything must be wiped. */
  closed: () => void;
}

interface OutboxItem {
  ref: string;
  key: string;
  e: string;
  col: string;
  id: string;
}

const OUTBOX_KEY = "sync-outbox";
/** Last event number we have — saved together with the events themselves, so it can never run ahead of them. */
const SEQ_KEY = "sync-seq";
/** Which "life" of the room on the server we last synced with (it changes if the server lost the room). */
const EPOCH_KEY = "sync-epoch";
const FATAL: RoomErrorCode[] = ["full", "denied", "left", "bad_request"];
/** Uploads waiting for the server's answer at once (keeps a big re-upload within the server's limits). */
const MAX_IN_FLIGHT = 20;
const MAX_IN_FLIGHT_BYTES = 16 * 1024 * 1024;
/** Live call frames are dropped (not queued) when the connection is this far behind. */
const MEDIA_BACKLOG = 384 * 1024;

/** Where the relay lives: same site by default, or VITE_SYNC_URL for a separately hosted server. */
export function relayUrl(): string {
  const custom = import.meta.env.VITE_SYNC_URL as string | undefined;
  if (custom) return custom;
  const { protocol, host } = window.location;
  return `${protocol === "https:" ? "wss" : "ws"}://${host}/ws`;
}

/**
 * Keeps one WebSocket connection to the relay alive for a room:
 * reconnects with backoff, queues changes while offline (even across reloads),
 * catches up on everything missed, and encrypts / decrypts every event.
 */
export class SyncClient {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private outboxTimer: ReturnType<typeof setTimeout> | null = null;
  private seenTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private offset = 0;
  private outbox: OutboxItem[];
  /** ref → size of uploads waiting for an answer. */
  private inFlight = new Map<string, number>();
  private resendSnapshot = false;
  private ready = false;
  private status: ConnectionStatus = "offline";
  private epoch: string | null;
  private ackedSeq = 0;
  private iceWaiters = new Map<string, (servers: RTCIceServer[] | null) => void>();

  constructor(
    private url: string,
    private keys: RoomKeys,
    private session: RoomSession,
    private engine: SyncEngine,
    private handlers: ClientHandlers,
    /** "create" for a brand-new room; afterwards always "join". */
    private mode: "create" | "join",
    /** When the server has lost the room, re-create it from this device's copy. */
    private allowRecreate: boolean,
  ) {
    this.session.lastSeq = engine.getLocal<number>(SEQ_KEY, 0);
    this.epoch = engine.getLocal<string | null>(EPOCH_KEY, null);
    this.outbox = engine.getLocal<OutboxItem[]>(OUTBOX_KEY, []);
    for (const item of this.outbox) engine.setPending(item.col, item.id, true);
    engine.sender = (put) => this.enqueue(put);
    engine.setClock(this.serverNow);
  }

  /** Time agreed with the server, so both phones order things the same way. */
  serverNow = () => Date.now() + this.offset;

  /** True once connected and caught up (live updates are flowing). */
  get live() {
    return this.ready;
  }

  /** Bytes waiting to go out on the connection (calls use it to skip frames when the network is slow). */
  get backlog() {
    return this.ws?.bufferedAmount ?? 0;
  }

  start() {
    this.stopped = false;
    window.addEventListener("online", this.reconnectNow);
    document.addEventListener("visibilitychange", this.onVisible);
    this.open();
  }

  stop() {
    this.stopped = true;
    window.removeEventListener("online", this.reconnectNow);
    document.removeEventListener("visibilitychange", this.onVisible);
    for (const timer of [this.retryTimer, this.outboxTimer, this.seenTimer]) if (timer) clearTimeout(timer);
    this.retryTimer = this.outboxTimer = this.seenTimer = null;
    this.ws?.close(1000);
    this.ws = null;
    this.dropIceWaiters();
    void this.engine.flush();
  }

  /** Tell the server this device leaves the room (frees the seat for a new device). */
  leave() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "leave" }));
    this.stop();
  }

  /** Returns false when it couldn't be sent (not connected). */
  sendSignal(type: SignalType, data?: unknown): boolean {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return false;
    const signal: Signal = { type, by: this.session.device, at: this.serverNow(), data };
    this.ws.send(JSON.stringify({ t: "signal", e: seal(this.keys, signal) }));
    return true;
  }

  /** Send live call audio/video through the server (encrypted). False = dropped (offline or too slow). */
  sendMedia(plain: Uint8Array): boolean {
    const ws = this.ws;
    if (!this.ready || !ws || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > MEDIA_BACKLOG) return false;
    ws.send(sealBytes(this.keys, plain));
    return true;
  }

  /** Network routes for calls (STUN + TURN when the server has one). null if the server didn't answer. */
  iceServers(timeoutMs = 4000): Promise<RTCIceServer[] | null> {
    const ws = this.ws;
    if (!this.ready || !ws || ws.readyState !== WebSocket.OPEN) return Promise.resolve(null);
    const ref = randomId(6);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.iceWaiters.delete(ref);
        resolve(null);
      }, timeoutMs);
      this.iceWaiters.set(ref, (servers) => {
        clearTimeout(timer);
        resolve(servers);
      });
      ws.send(JSON.stringify({ t: "ice", ref }));
    });
  }

  /** Close the room for both people: the server deletes everything. Returns false when offline. */
  closeRoom(): boolean {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ t: "close" }));
    return true;
  }

  // ---------- connection ----------

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.handlers.status(status);
  }

  private open() {
    if (this.stopped || this.ws) return;
    this.setStatus("connecting");
    this.ready = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      const { roomId, verifier, authKey } = this.keys;
      const hello =
        this.mode === "create"
          ? { t: "create", v: 1, room: roomId, verifier, device: this.session.device }
          : { t: "join", v: 1, room: roomId, auth: authKey, device: this.session.device, since: this.session.lastSeq, epoch: this.epoch ?? undefined };
      ws.send(JSON.stringify(hello));
    };
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") {
        const plain = openBytes(this.keys, new Uint8Array(event.data as ArrayBuffer));
        if (plain) this.handlers.media?.(plain);
        return;
      }
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this.onMessage(msg);
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.inFlight.clear();
      this.ready = false;
      this.dropIceWaiters();
      if (this.stopped) return;
      this.setStatus("offline");
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  private scheduleReconnect() {
    if (this.stopped || this.retryTimer) return;
    const base = Math.min(15_000, 500 * 2 ** this.attempts);
    this.attempts += 1;
    this.retryTimer = setTimeout(
      () => {
        this.retryTimer = null;
        this.open();
      },
      base / 2 + Math.random() * (base / 2),
    );
  }

  private reconnectNow = () => {
    if (this.stopped || this.ws) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.attempts = 0;
    this.open();
  };

  private onVisible = () => {
    if (document.visibilityState === "visible") this.reconnectNow();
  };

  private dropIceWaiters() {
    for (const done of this.iceWaiters.values()) done(null);
    this.iceWaiters.clear();
  }

  // ---------- messages from the server ----------

  private onMessage(msg: Record<string, unknown>) {
    switch (msg.t) {
      case "welcome": {
        this.offset = Number(msg.now) - Date.now();
        this.attempts = 0;
        const epoch = typeof msg.epoch === "string" ? msg.epoch : null;
        if (this.mode === "create") {
          this.mode = "join";
          this.resendSnapshot = this.allowRecreate;
        } else if (epoch && this.epoch && epoch !== this.epoch) {
          // The server lost this room since we were last here (a restart). It sends us everything it has
          // again, and we upload everything we have, so both phones end up complete.
          this.session.lastSeq = 0;
          this.engine.setLocal(SEQ_KEY, 0);
          this.ackedSeq = 0;
          this.resendSnapshot = true;
        }
        if (epoch && epoch !== this.epoch) {
          this.epoch = epoch;
          this.engine.setLocal(EPOCH_KEY, epoch);
        }
        this.handlers.presence(msg as unknown as Presence);
        return;
      }

      case "batch": {
        for (const ev of (msg.events as { seq: number; e: string }[]) ?? []) this.applyEvent(ev.seq, ev.e);
        if (msg.done) this.onCaughtUp();
        return;
      }

      case "event":
        this.applyEvent(Number(msg.seq), String(msg.e));
        return;

      case "ack": {
        const ref = String(msg.ref);
        const item = this.outbox.find((o) => o.ref === ref);
        this.inFlight.delete(ref);
        if (item) {
          this.outbox = this.outbox.filter((o) => o.ref !== ref);
          this.engine.setLocal(OUTBOX_KEY, this.outbox);
          if (!this.outbox.some((o) => o.col === item.col && o.id === item.id)) this.engine.setPending(item.col, item.id, false);
        }
        this.advance(Number(msg.seq));
        this.flushOutbox();
        return;
      }

      case "resync":
        // A new phone (or one that lost its copy) needs everything again: upload all we have.
        if (this.ready) this.uploadSnapshot();
        else this.resendSnapshot = true;
        return;

      case "presence":
        this.handlers.presence(msg as unknown as Presence);
        return;

      case "closed":
        this.stop();
        this.handlers.closed();
        return;

      case "signal": {
        const signal = open<Signal>(this.keys, String(msg.e));
        if (signal && signal.by !== this.session.device) this.handlers.signal(signal);
        return;
      }

      case "ice": {
        const done = this.iceWaiters.get(String(msg.ref));
        if (!done) return;
        this.iceWaiters.delete(String(msg.ref));
        done(Array.isArray(msg.servers) ? (msg.servers as RTCIceServer[]) : null);
        return;
      }

      case "error": {
        const code = msg.code as RoomErrorCode;
        // An upload the server couldn't take right now: try it again a little later.
        if (typeof msg.ref === "string" && this.inFlight.has(msg.ref)) {
          this.inFlight.delete(msg.ref);
          if (code === "bad_request") this.dropFromOutbox(msg.ref);
          this.retryOutboxIn(code === "busy" ? 15_000 : 2000);
          return;
        }
        if (code === "closed") {
          this.stop();
          this.handlers.closed();
          return;
        }
        if (code === "not_found" && this.allowRecreate) {
          // Our saved room is gone from the server — rebuild it from this device.
          this.mode = "create";
          this.ws?.close();
          return;
        }
        if (code === "exists" && this.allowRecreate) {
          this.mode = "join";
          this.ws?.close();
          return;
        }
        if (FATAL.includes(code) || code === "not_found" || code === "exists") {
          this.stop();
          this.handlers.fatal(code, String(msg.message ?? ""));
          return;
        }
        if (code === "rate_limited" && !this.ready) {
          if (this.allowRecreate) {
            // A saved room: just wait a bit longer and try again.
            this.attempts = Math.max(this.attempts, 5);
            this.ws?.close();
            return;
          }
          this.stop();
          this.handlers.fatal(code, String(msg.message ?? ""));
        }
        return;
      }
    }
  }

  private applyEvent(seq: number, sealed: string) {
    const put = open<Put>(this.keys, sealed);
    if (put) this.engine.receive(put);
    this.advance(seq);
  }

  private advance(seq: number) {
    if (Number.isFinite(seq) && seq > this.session.lastSeq) {
      this.session.lastSeq = seq;
      this.engine.setLocal(SEQ_KEY, seq);
      this.scheduleSeen();
    }
  }

  /**
   * Tell the server how far this phone has SAFELY saved, so it can forget what both phones have.
   * Only sent after the data is really stored on the phone.
   */
  private scheduleSeen() {
    if (this.seenTimer) return;
    this.seenTimer = setTimeout(async () => {
      this.seenTimer = null;
      const seq = this.session.lastSeq;
      if (seq <= this.ackedSeq) return;
      const saved = await this.engine.flush();
      if (!saved || this.ws?.readyState !== WebSocket.OPEN || this.session.lastSeq < seq) return;
      this.ws.send(JSON.stringify({ t: "seen", seq }));
      this.ackedSeq = seq;
    }, 800);
  }

  private onCaughtUp() {
    this.ready = true;
    this.setStatus("online");
    if (this.resendSnapshot) {
      this.resendSnapshot = false;
      this.uploadSnapshot();
    } else this.flushOutbox();
    this.handlers.ready();
  }

  private uploadSnapshot() {
    for (const put of this.engine.snapshot()) this.enqueue(put, false);
    this.flushOutbox();
  }

  // ---------- sending ----------

  private enqueue(put: Put, sendNow = true) {
    const item: OutboxItem = {
      ref: randomId(8),
      key: itemKey(this.keys, put.col, put.id),
      e: seal(this.keys, put),
      col: put.col,
      id: put.id,
    };
    // A newer version of the same item replaces an unsent older one.
    this.outbox = this.outbox.filter((o) => o.key !== item.key || this.inFlight.has(o.ref));
    this.outbox.push(item);
    this.engine.setLocal(OUTBOX_KEY, this.outbox);
    this.engine.setPending(put.col, put.id, true);
    if (sendNow) this.flushOutbox();
  }

  private dropFromOutbox(ref: string) {
    const item = this.outbox.find((o) => o.ref === ref);
    if (!item) return;
    this.outbox = this.outbox.filter((o) => o.ref !== ref);
    this.engine.setLocal(OUTBOX_KEY, this.outbox);
    this.engine.setPending(item.col, item.id, false);
  }

  private retryOutboxIn(ms: number) {
    if (this.outboxTimer) return;
    this.outboxTimer = setTimeout(() => {
      this.outboxTimer = null;
      this.flushOutbox();
    }, ms);
  }

  /** Send queued uploads, a few at a time (the rest go as answers come back). */
  private flushOutbox() {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN || this.outboxTimer) return;
    let bytes = [...this.inFlight.values()].reduce((a, b) => a + b, 0);
    for (const item of this.outbox) {
      if (this.inFlight.size >= MAX_IN_FLIGHT) break;
      if (this.inFlight.has(item.ref)) continue;
      if (bytes > 0 && bytes + item.e.length > MAX_IN_FLIGHT_BYTES) break;
      this.inFlight.set(item.ref, item.e.length);
      bytes += item.e.length;
      this.ws.send(JSON.stringify({ t: "put", ref: item.ref, key: item.key, e: item.e }));
    }
  }
}
