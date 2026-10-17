// Network routes ("ICE servers") for voice and video calls.
//
// STUN (free, always on) lets most phones find each other. On strict mobile networks a direct
// connection is impossible, so a TURN server relays the call. Set ONE of these on the server
// (no rebuild needed — e.g. in Render → Environment):
//
//   CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN   Cloudflare Realtime TURN (1,000 GB / month free)
//   TURN_URLS + TURN_USERNAME + TURN_CREDENTIAL           any TURN service with fixed credentials
//                                                        (comma-separated URLs, e.g. Metered, ExpressTURN, coturn)
//
// Without TURN, calls still work: if a direct connection fails, the app sends the call through
// the UsSpace server itself (encrypted, lower video quality).

const STUN = { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] };
const CACHE_MS = 12 * 60 * 60 * 1000;

/** @param {Record<string, string | undefined>} [env] @param {typeof fetch} [fetchImpl] */
export function createIceProvider(env = process.env, fetchImpl = globalThis.fetch) {
  const cfKey = env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const cfToken = env.CLOUDFLARE_TURN_API_TOKEN?.trim();
  const urls = (env.TURN_URLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const staticTurn = urls.length ? [{ urls, username: env.TURN_USERNAME ?? "", credential: env.TURN_CREDENTIAL ?? "" }] : [];
  const cloudflare = Boolean(cfKey && cfToken);

  /** @type {{ servers: object[], until: number } | null} */
  let cache = null;
  /** @type {Promise<object[]> | null} */
  let pending = null;

  const fromCloudflare = async () => {
    const res = await fetchImpl(`https://rtc.live.cloudflare.com/v1/turn/keys/${cfKey}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 86_400 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    /** @type {{ urls: string | string[], username?: string, credential?: string }[]} */
    const list = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
    // Browsers block port 53, so drop those routes instead of waiting for them to time out.
    return list
      .map((s) => ({ ...s, urls: [s.urls].flat().filter((u) => !/:53(\?|$)/.test(u)) }))
      .filter((s) => s.urls.length > 0);
  };

  return {
    /** "cloudflare", "static" or "off" — shown in the server log. */
    mode: cloudflare ? "cloudflare" : staticTurn.length ? "static" : "off",
    /** @returns {Promise<object[]>} */
    async get() {
      if (!cloudflare) return [STUN, ...staticTurn];
      if (cache && cache.until > Date.now()) return cache.servers;
      pending ??= fromCloudflare()
        .then((servers) => {
          cache = { servers: [...servers, ...staticTurn], until: Date.now() + CACHE_MS };
          return cache.servers;
        })
        .catch((err) => {
          console.error("[usspace] could not get TURN credentials from Cloudflare:", err.message);
          return [STUN, ...staticTurn];
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
  };
}
