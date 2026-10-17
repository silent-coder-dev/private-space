import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

export interface Kv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface RelayOptions {
  dataDir?: string | null;
  allowedOrigins?: string[];
  trustProxy?: boolean;
  path?: string;
  now?: () => number;
  /** Override rate limits (used by tests). */
  limits?: Record<string, unknown>;
  /** Override storage limits (used by tests). */
  storeLimits?: Record<string, number>;
  /** Optional database for closed rooms + room records (see kv.mjs). */
  kv?: Kv | null;
  /** Network routes for calls (see ice.mjs). */
  ice?: { get(): Promise<object[]> } | null;
}

export interface Relay {
  /** Returns false when the request is not for the relay's path. */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  close(): void;
  store: {
    totalBytes: number;
    rooms: Map<string, { head: number; floor: number; events: Map<string, unknown>; epoch: string }>;
  };
}

export declare const LIMITS: Record<string, unknown>;
export declare function createRelay(options?: RelayOptions): Relay;
