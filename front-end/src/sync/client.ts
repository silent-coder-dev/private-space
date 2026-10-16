import { readStore, writeStore } from "@/lib/storage";
import { itemKey, open, randomId, seal, type RoomKeys } from "./crypto";
import type { Put, SyncEngine } from "./engine";
import { saveSession, type RoomSession } from "./session";

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface Presence {
  members: number;
  partnerOnline: boolean;
  partnerSeen: number | null;
}

export type SignalType = "typing" | "heart" | "nudge";
export interface Signal {
  type: SignalType;
  by: string;
  at: number;
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
  | "network";

export interface ClientHandlers {
  status: (status: ConnectionStatus) => void;
  presence: (presence: Presence) => void;
  signal: (signal: Signal) => void;
  /** Welcome received and all missed events applied. */
  ready: () => void;
  /** Something that stops the connection for good (wrong code, room full…). */
  fatal: (code: RoomErrorCode, message: string) => void;
}

interface OutboxItem {
  ref: string;
  key: string;
  e: string;
  col: string;
  id: string;
}

const OUTBOX_KEY = "sync-outbox";
const FATAL: RoomErrorCode[] = ["full", "denied", "left", "bad_request"];

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
  private stopped = false;
  private offset = 0;
  private outbox: OutboxItem[];
  private inFlight = new Set<string>();
  private resendSnapshot = false;
  private ready = false;
  private status: ConnectionStatus = "offline";

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
    this.outbox = readStore<OutboxItem[]>(OUTBOX_KEY, []);
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
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close(1000);
    this.ws = null;
    this.engine.flush();
  }

  /** Tell the server this device leaves the room (frees the seat for a new device). */
  leave() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "leave" }));
    this.stop();
  }

  sendSignal(type: SignalType) {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return;
    const signal: Signal = { type, by: this.session.device, at: this.serverNow() };
    this.ws.send(JSON.stringify({ t: "signal", e: seal(this.keys, signal) }));
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
    this.ws = ws;

    ws.onopen = () => {
      const { roomId, verifier, authKey } = this.keys;
      const hello =
        this.mode === "create"
          ? { t: "create", v: 1, room: roomId, verifier, device: this.session.device }
          : { t: "join", v: 1, room: roomId, auth: authKey, device: this.session.device, since: this.session.lastSeq };
      ws.send(JSON.stringify(hello));
    };
    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      this.onMessage(msg);
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.inFlight.clear();
      this.ready = false;
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

  // ---------- messages from the server ----------

  private onMessage(msg: Record<string, unknown>) {
    switch (msg.t) {
      case "welcome": {
        this.offset = Number(msg.now) - Date.now();
        this.attempts = 0;
        if (this.mode === "create") {
          this.mode = "join";
          this.resendSnapshot = this.allowRecreate;
        } else if (Number(msg.head) < this.session.lastSeq) {
          // The server's copy is older than ours (it was reset). Start over and re-upload.
          this.session.lastSeq = 0;
          this.resendSnapshot = true;
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
          writeStore(OUTBOX_KEY, this.outbox);
          if (!this.outbox.some((o) => o.col === item.col && o.id === item.id)) this.engine.setPending(item.col, item.id, false);
        }
        this.advance(Number(msg.seq));
        return;
      }

      case "presence":
        this.handlers.presence(msg as unknown as Presence);
        return;

      case "signal": {
        const signal = open<Signal>(this.keys, String(msg.e));
        if (signal && signal.by !== this.session.device) this.handlers.signal(signal);
        return;
      }

      case "error": {
        const code = msg.code as RoomErrorCode;
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
      saveSession(this.session);
    }
  }

  private onCaughtUp() {
    this.ready = true;
    this.setStatus("online");
    if (this.resendSnapshot) {
      this.resendSnapshot = false;
      for (const put of this.engine.snapshot()) this.enqueue(put, false);
    }
    this.flushOutbox();
    this.handlers.ready();
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
    writeStore(OUTBOX_KEY, this.outbox);
    this.engine.setPending(put.col, put.id, true);
    if (sendNow) this.flushOutbox();
  }

  private flushOutbox() {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return;
    for (const item of this.outbox) {
      if (this.inFlight.has(item.ref)) continue;
      this.inFlight.add(item.ref);
      this.ws.send(JSON.stringify({ t: "put", ref: item.ref, key: item.key, e: item.e }));
    }
  }
}
