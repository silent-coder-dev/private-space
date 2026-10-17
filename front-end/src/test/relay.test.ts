// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { createIceProvider } from "../../server/ice.mjs";
import { createKv, memoryKv } from "../../server/kv.mjs";
import { createRelay, type Relay, type RelayOptions } from "../../server/relay.mjs";
import { deriveKeys, generateCode, randomId } from "@/sync/crypto";

type Msg = Record<string, unknown> & { t: string };

const OPEN_LIMITS = { ipAuth: { burst: 1000, perSec: 100 }, ipConnections: { burst: 1000, perSec: 100 } };

/** Start a relay on a free port. */
async function startRelay(options: RelayOptions = {}) {
  const relay = createRelay({ dataDir: null, ...options, limits: { ...OPEN_LIMITS, ...options.limits } });
  const server = http.createServer((_, res) => res.writeHead(404).end());
  server.on("upgrade", (req, socket, head) => {
    if (!relay.handleUpgrade(req, socket, head)) socket.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    relay,
    url: `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`,
    close: () => {
      relay.close();
      server.close();
    },
  };
}

let main: Awaited<ReturnType<typeof startRelay>>;
let relay: Relay;
let url = "";

beforeAll(async () => {
  main = await startRelay({ ice: { get: async () => [{ urls: "turn:turn.example.com:3478", username: "u", credential: "c" }] } });
  relay = main.relay;
  url = main.url;
});

afterAll(() => main.close());

/** A tiny test client that queues incoming messages (binary call frames arrive as { t: "binary" }). */
async function connect(to = url) {
  const ws = new WebSocket(to);
  const inbox: Msg[] = [];
  const waiters: ((m: Msg) => void)[] = [];
  ws.on("message", (data, isBinary) => {
    const msg = (isBinary ? { t: "binary", data } : JSON.parse(String(data))) as Msg;
    const waiter = waiters.shift();
    if (waiter) waiter(msg);
    else inbox.push(msg);
  });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  return {
    send: (msg: object) => ws.send(JSON.stringify(msg)),
    next: (): Promise<Msg> =>
      inbox.length
        ? Promise.resolve(inbox.shift() as Msg)
        : new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("no message")), 2000);
            waiters.push((m) => {
              clearTimeout(timer);
              resolve(m);
            });
          }),
    /** Skip messages until one of type `t` arrives. */
    async until(t: string): Promise<Msg> {
      for (;;) {
        const m = await this.next();
        if (m.t === t) return m;
      }
    },
    sendBinary: (bytes: Uint8Array) => ws.send(bytes),
    close: () => ws.close(),
  };
}

function newRoom() {
  const keys = deriveKeys(generateCode());
  return { keys, a: randomId(), b: randomId() };
}

async function createRoom(to = url) {
  const room = newRoom();
  const creator = await connect(to);
  creator.send({ t: "create", v: 1, room: room.keys.roomId, verifier: room.keys.verifier, device: room.a });
  const welcome = await creator.until("welcome");
  await creator.until("batch");
  return { ...room, creator, welcome };
}

const join = (keys: ReturnType<typeof deriveKeys>, device: string, since = 0, epoch?: string) => ({
  t: "join",
  v: 1,
  room: keys.roomId,
  auth: keys.authKey,
  device,
  since,
  epoch,
});

/** Creator + partner, both connected. */
async function pairedRoom(to = url) {
  const room = await createRoom(to);
  const partner = await connect(to);
  partner.send(join(room.keys, room.b));
  const partnerWelcome = await partner.until("welcome");
  await partner.until("batch");
  await room.creator.until("presence");
  return { ...room, partner, partnerWelcome };
}

describe("relay server", () => {
  it("creates a room for one device", async () => {
    const { welcome, creator } = await createRoom();
    expect(welcome).toMatchObject({ t: "welcome", members: 1, partnerOnline: false, head: 0 });
    expect(welcome.epoch).toMatch(/^[0-9a-f]{16}$/);
    creator.close();
  });

  it("refuses a code it has never seen", async () => {
    const stranger = await connect();
    const keys = deriveKeys(generateCode());
    stranger.send(join(keys, randomId()));
    expect(await stranger.next()).toMatchObject({ t: "error", code: "not_found" });
    stranger.close();
  });

  it("refuses someone who knows the room id but not the code", async () => {
    const { keys, creator } = await createRoom();
    const attacker = await connect();
    attacker.send({ ...join(keys, randomId()), auth: "0".repeat(64) });
    expect(await attacker.next()).toMatchObject({ t: "error", code: "denied" });
    attacker.close();
    creator.close();
  });

  it("lets the partner join, tells the creator, and relays events live", async () => {
    const { keys, b, creator } = await createRoom();
    const partner = await connect();
    partner.send(join(keys, b));
    expect(await partner.until("welcome")).toMatchObject({ members: 2, partnerOnline: true });
    expect(await creator.until("presence")).toMatchObject({ members: 2, partnerOnline: true });

    creator.send({ t: "put", ref: "r1", key: "1".repeat(32), e: "ciphertext-1" });
    expect(await creator.until("ack")).toMatchObject({ ref: "r1", seq: 1 });
    expect(await partner.until("event")).toMatchObject({ seq: 1, e: "ciphertext-1" });

    partner.send({ t: "signal", e: "typing-blob" });
    expect(await creator.until("signal")).toMatchObject({ e: "typing-blob" });
    creator.close();
    partner.close();
  });

  it("locks the room to two devices", async () => {
    const { keys, b, creator } = await createRoom();
    const partner = await connect();
    partner.send(join(keys, b));
    await partner.until("welcome");
    const third = await connect();
    third.send(join(keys, randomId()));
    expect(await third.next()).toMatchObject({ t: "error", code: "full" });
    third.close();
    creator.close();
    partner.close();
  });

  it("delivers missed events on reconnect and keeps only the newest version of each item", async () => {
    const { keys, a, b, creator } = await createRoom();
    const key = "2".repeat(32);
    creator.send({ t: "put", ref: "x1", key, e: "v1" });
    await creator.until("ack");
    creator.send({ t: "put", ref: "x2", key, e: "v2" });
    await creator.until("ack");
    creator.send({ t: "put", ref: "x3", key: "3".repeat(32), e: "other" });
    const last = await creator.until("ack");

    const partner = await connect();
    partner.send(join(keys, b, 0));
    await partner.until("welcome");
    const batch = await partner.until("batch");
    expect(batch.done).toBe(true);
    expect((batch.events as { e: string }[]).map((ev) => ev.e)).toEqual(["v2", "other"]);
    partner.close();

    const again = await connect();
    again.send(join(keys, a, Number(last.seq)));
    await again.until("welcome");
    expect(await again.until("batch")).toMatchObject({ events: [], done: true });
    again.close();
    creator.close();
  });

  it("frees the seat when a device leaves", async () => {
    const { keys, b, creator } = await createRoom();
    const partner = await connect();
    partner.send(join(keys, b));
    await partner.until("welcome");
    await creator.until("presence");
    partner.send({ t: "leave" });
    expect(await creator.until("presence")).toMatchObject({ members: 1, partnerOnline: false });

    const newPhone = await connect();
    newPhone.send(join(keys, randomId()));
    expect(await newPhone.until("welcome")).toMatchObject({ members: 2 });
    newPhone.close();
    creator.close();
  });

  it("rejects bad input and anything before joining", async () => {
    const c = await connect();
    c.send({ t: "put", ref: "r", key: "1".repeat(32), e: "x" });
    expect(await c.next()).toMatchObject({ t: "error", code: "denied" });
    c.send({ t: "create", v: 1, room: "not-hex", verifier: "x", device: "y" });
    expect(await c.next()).toMatchObject({ t: "error", code: "bad_request" });
    c.close();
  });

  it("slows down people guessing codes", async () => {
    const { keys, creator } = await createRoom();
    const attacker = await connect();
    const codes: string[] = [];
    for (let i = 0; i < 16; i++) {
      attacker.send({ ...join(keys, randomId()), auth: i.toString(16).padStart(64, "0") });
      codes.push(String((await attacker.until("error")).code));
    }
    expect(codes).toContain("rate_limited");
    attacker.close();
    creator.close();
  });

  it("forgets events once BOTH phones have saved them", async () => {
    const { keys, creator, partner, b } = await pairedRoom();
    creator.send({ t: "put", ref: "p1", key: "4".repeat(32), e: "photo" });
    const ack = await creator.until("ack");
    await partner.until("event");
    creator.send({ t: "seen", seq: ack.seq });
    partner.send({ t: "seen", seq: ack.seq });
    await new Promise((r) => setTimeout(r, 50));
    const stored = relay.store.rooms.get(keys.roomId);
    expect(stored?.events.size).toBe(0);
    expect(stored?.floor).toBe(ack.seq);

    // A phone that comes back up to date gets nothing extra.
    partner.close();
    const again = await connect();
    again.send(join(keys, b, Number(ack.seq), stored?.epoch));
    await again.until("welcome");
    expect(await again.until("batch")).toMatchObject({ events: [], done: true });
    again.close();
    creator.close();
  });

  it("asks the other phone to send everything again when a new phone takes the free seat", async () => {
    const { keys, creator, partner } = await pairedRoom();
    creator.send({ t: "put", ref: "q1", key: "5".repeat(32), e: "message" });
    const ack = await creator.until("ack");
    await partner.until("event");
    creator.send({ t: "seen", seq: ack.seq });
    partner.send({ t: "seen", seq: ack.seq });
    await new Promise((r) => setTimeout(r, 50));
    partner.send({ t: "leave" });
    await creator.until("presence");

    const newPhone = await connect();
    newPhone.send(join(keys, randomId()));
    await newPhone.until("welcome");
    expect(await creator.until("resync")).toMatchObject({ t: "resync" });
    newPhone.close();
    creator.close();
  });

  it("sends everything again to a phone from an older life of the room (different epoch)", async () => {
    const { keys, a, creator } = await createRoom();
    creator.send({ t: "put", ref: "e1", key: "6".repeat(32), e: "one" });
    const ack = await creator.until("ack");
    creator.close();
    const back = await connect();
    back.send(join(keys, a, Number(ack.seq), "0".repeat(16)));
    await back.until("welcome");
    expect(((await back.until("batch")).events as { e: string }[]).map((ev) => ev.e)).toEqual(["one"]);
    back.close();
  });

  it("gives room members the call routes (TURN) and nobody else", async () => {
    const stranger = await connect();
    stranger.send({ t: "ice", ref: "i0" });
    expect(await stranger.next()).toMatchObject({ t: "error", code: "denied" });
    stranger.close();
    const { creator } = await createRoom();
    creator.send({ t: "ice", ref: "i1" });
    const answer = await creator.until("ice");
    expect(answer).toMatchObject({ ref: "i1", servers: [{ urls: "turn:turn.example.com:3478", username: "u" }] });
    creator.close();
  });

  it("passes live call frames to the partner without storing them", async () => {
    const { creator, partner } = await pairedRoom();
    creator.sendBinary(new Uint8Array([1, 2, 3, 4]));
    const frame = await partner.until("binary");
    expect([...new Uint8Array(frame.data as Buffer)]).toEqual([1, 2, 3, 4]);
    creator.close();
    partner.close();
  });

  it("with the database: the 2-device lock survives a restart and a closed room never comes back", async () => {
    const kv = memoryKv();
    const first = await startRelay({ kv });
    const { keys, a, b, creator } = await createRoom(first.url);
    const partner = await connect(first.url);
    partner.send(join(keys, b));
    const welcome = await partner.until("welcome");
    await new Promise((r) => setTimeout(r, 20));
    first.close();

    // A "restart": a brand-new server with empty memory, same database.
    const second = await startRelay({ kv });
    const intruder = await connect(second.url);
    intruder.send(join(keys, randomId()));
    expect(await intruder.until("error")).toMatchObject({ code: "full" });
    const back = await connect(second.url);
    back.send(join(keys, a, 5, String(welcome.epoch)));
    const again = await back.until("welcome");
    expect(again.members).toBe(2);
    expect(again.epoch).not.toBe(welcome.epoch);

    back.send({ t: "close" });
    expect(await back.until("closed")).toMatchObject({ t: "closed" });
    second.close();

    const third = await startRelay({ kv });
    const ghost = await connect(third.url);
    ghost.send(join(keys, b));
    expect(await ghost.until("error")).toMatchObject({ code: "closed" });
    const ghost2 = await connect(third.url);
    ghost2.send({ t: "create", v: 1, room: keys.roomId, verifier: keys.verifier, device: b });
    expect(await ghost2.until("error")).toMatchObject({ code: "closed" });
    expect([...kv.data.keys()].some((k) => k.startsWith("usspace:room:"))).toBe(false);
    for (const c of [intruder, back, ghost, ghost2, creator, partner]) c.close();
    third.close();
  });

  it("tells a phone to retry later when the server is full", async () => {
    const small = await startRelay({ storeLimits: { maxTotalBytes: 10 } });
    const { creator } = await createRoom(small.url);
    creator.send({ t: "put", ref: "big", key: "7".repeat(32), e: "x".repeat(50) });
    expect(await creator.until("error")).toMatchObject({ code: "busy", ref: "big" });
    creator.close();
    small.close();
  });
});

describe("optional services", () => {
  it("talks to Upstash with JSON commands and a bearer token", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(createKv({}, fake)).toBeNull();
    const kv = createKv({ UPSTASH_REDIS_REST_URL: "https://db.upstash.io/", UPSTASH_REDIS_REST_TOKEN: "secret" }, fake);
    await kv?.set("usspace:closed:x", "1", 60);
    expect(calls[0].url).toBe("https://db.upstash.io");
    expect(JSON.parse(String(calls[0].init.body))).toEqual(["SET", "usspace:closed:x", "1", "EX", 60]);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
  });

  it("gets Cloudflare TURN routes once, drops port 53 and caches them", async () => {
    let requests = 0;
    const fake = (async () => {
      requests++;
      return new Response(
        JSON.stringify({
          iceServers: [
            { urls: ["stun:stun.cloudflare.com:3478"] },
            { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "c" },
          ],
        }),
        { status: 201 },
      );
    }) as unknown as typeof fetch;
    const ice = createIceProvider({ CLOUDFLARE_TURN_KEY_ID: "k", CLOUDFLARE_TURN_API_TOKEN: "t" }, fake);
    expect(ice.mode).toBe("cloudflare");
    const servers = await ice.get();
    await ice.get();
    expect(requests).toBe(1);
    expect(JSON.stringify(servers)).not.toContain(":53");
    expect(servers[1]).toMatchObject({ username: "u", credential: "c" });
    expect(createIceProvider({}).mode).toBe("off");
    expect(createIceProvider({ TURN_URLS: "turn:a.example:3478, turns:a.example:443", TURN_USERNAME: "x", TURN_CREDENTIAL: "y" }).mode).toBe("static");
  });
});
