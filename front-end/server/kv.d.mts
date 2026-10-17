import type { Kv } from "./relay.mjs";

export declare function createKv(env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Kv | null;
export declare function memoryKv(): Kv & { data: Map<string, string> };
