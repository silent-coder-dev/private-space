// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { createRelay, type Relay } from "../../server/relay.mjs";
import { deriveKeys, generateCode, randomId } from "@/sync/crypto";

type Msg = Record<string, unknown> & { t: string };

let server: http.Server;
let relay: Relay;
let url = "";

beforeAll(async () => {
  relay = createRelay({
    dataDir: null,
    limits: { ipAuth: { burst: 1000, perSec: 100 }, ipConnections: { burst: 1000, perSec: 100 } },
  });
  server = http.createServer((_, res) => res.writeHead(404).end());
  server.on("upgrade", (req, socket, head) => {
    if (!relay.handleUpgrade(req, socket, head)) socket.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`;
});

afterAll(() => {
  relay.close();
  server.close();
});

/** A tiny test client that queues incoming messages. */
async function connect() {
  const ws = new WebSocket(url);
  const inbox: Msg[] = [];
  const waiters: ((m: Msg) => void)[] = [];
  ws.on("message", (data) => {
    const msg = JSON.parse(String(data)) as Msg;
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
    close: () => ws.close(),
  };
}

function newRoom() {
  const keys = deriveKeys(generateCode());
  return { keys, a: randomId(), b: randomId() };
}

async function createRoom() {
  const room = newRoom();
  const creator = await connect();
  creator.send({ t: "create", v: 1, room: room.keys.roomId, verifier: room.keys.verifier, device: room.a });
  const welcome = await creator.until("welcome");
  await creator.until("batch");
  return { ...room, creator, welcome };
}

const join = (keys: ReturnType<typeof deriveKeys>, device: string, since = 0) => ({
  t: "join",
  v: 1,
  room: keys.roomId,
  auth: keys.authKey,
  device,
  since,
});

describe("relay server", () => {
  it("creates a room for one device", async () => {
    const { welcome, creator } = await createRoom();
    expect(welcome).toMatchObject({ t: "welcome", members: 1, partnerOnline: false, head: 0 });
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
});
