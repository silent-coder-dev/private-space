import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

export interface RelayOptions {
  dataDir?: string | null;
  allowedOrigins?: string[];
  trustProxy?: boolean;
  path?: string;
  now?: () => number;
  /** Override rate limits (used by tests). */
  limits?: Record<string, unknown>;
}

export interface Relay {
  /** Returns false when the request is not for the relay's path. */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  close(): void;
  store: unknown;
}

export declare const LIMITS: Record<string, unknown>;
export declare function createRelay(options?: RelayOptions): Relay;
