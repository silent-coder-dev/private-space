// Optional free database: Upstash Redis (free tier, no credit card), used through its REST API.
//
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on the server to turn it on.
// It keeps only the tiny facts that must survive a server restart:
//   • "this room was closed"  → a closed room can never come back, even if a phone was offline;
//   • "these two devices own this room" → the 2-device lock survives restarts.
// Never any messages, photos, names or other content. Closing a room deletes its record.

/**
 * @typedef {{ get(key: string): Promise<string | null>, set(key: string, value: string, ttlSec: number): Promise<unknown>,
 *   del(key: string): Promise<unknown> }} Kv
 */

/** @param {Record<string, string | undefined>} [env] @param {typeof fetch} [fetchImpl] @returns {Kv | null} */
export function createKv(env = process.env, fetchImpl = globalThis.fetch) {
  const url = env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  /** @param {(string | number)[]} command */
  const call = async (command) => {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(command),
          signal: AbortSignal.timeout(4000),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        return data.result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };

  return {
    get: (key) => call(["GET", key]),
    set: (key, value, ttlSec) => call(["SET", key, value, "EX", ttlSec]),
    del: (key) => call(["DEL", key]),
  };
}

/** An in-memory stand-in with the same shape (tests). @returns {Kv & { data: Map<string, string> }} */
export function memoryKv() {
  const data = new Map();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => void data.set(key, value),
    del: async (key) => void data.delete(key),
  };
}
