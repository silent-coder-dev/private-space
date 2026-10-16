import { beforeEach, describe, expect, it } from "vitest";
import { readStore, setStorageScope } from "@/lib/storage";
import { docKey, SyncEngine, type Persistence, type Put } from "@/sync/engine";

const ME = "a".repeat(32);
const PARTNER = "b".repeat(32);

let clock = 1000;
const tick = () => ++clock;

function makeEngine() {
  const sent: Put[] = [];
  const engine = new SyncEngine(ME, tick);
  engine.sender = (put) => sent.push(put);
  return { engine, sent };
}

beforeEach(() => {
  window.localStorage.clear();
  setStorageScope("c".repeat(32));
  clock = 1000;
});

describe("sync engine", () => {
  it("applies local changes instantly and sends them", () => {
    const { engine, sent } = makeEngine();
    engine.put("messages", "m1", { id: "m1", sender: "me", text: "hi", at: 1, reactions: [] });
    expect(engine.get("messages", [])).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ col: "messages", id: "m1", by: ME });
    expect(readStore("item:messages/m1", null)).toMatchObject({ id: "m1", text: "hi" });
  });

  it("swaps me ↔ partner for things your partner wrote", () => {
    const { engine } = makeEngine();
    engine.receive({ col: "messages", id: "m1", data: { id: "m1", sender: "me", text: "hey", at: 1, reactions: [] }, ts: 5000, by: PARTNER });
    expect(engine.get<{ sender: string }[]>("messages", [])[0].sender).toBe("partner");

    engine.receive({ col: "member", id: "me", data: { name: "Kabir" }, ts: 5001, by: PARTNER });
    expect(engine.get(docKey("member", "partner"), null)).toEqual({ name: "Kabir" });
    expect(engine.get(docKey("member", "me"), null)).toBeNull();
  });

  it("flips game boards and scores to your point of view", () => {
    const { engine } = makeEngine();
    engine.receive({
      col: "ttt",
      id: "doc",
      data: { board: ["me", null, null, null, null, null, null, null, null], turn: "partner", starter: "me", round: 1 },
      ts: 5000,
      by: PARTNER,
    });
    expect(engine.get(docKey("ttt", "doc"), null)).toMatchObject({ board: ["partner", null, null, null, null, null, null, null, null], turn: "me", starter: "partner" });
    engine.receive({ col: "scores", id: "doc", data: { me: 3, partner: 1, draws: 0 }, ts: 5001, by: PARTNER });
    expect(engine.get(docKey("scores", "doc"), null)).toEqual({ me: 1, partner: 3, draws: 0 });
  });

  it("keeps the newest version, whatever order changes arrive in (last writer wins)", () => {
    const { engine } = makeEngine();
    const event = (title: string, ts: number) => ({ col: "photos", id: "e1", data: { id: "e1", title, at: 1 }, ts, by: PARTNER });
    expect(engine.receive(event("new", 9000))).toBe(true);
    expect(engine.receive(event("old", 8000))).toBe(false);
    expect(engine.get<{ title: string }[]>("photos", [])[0].title).toBe("new");
  });

  it("breaks exact ties the same way on both phones", () => {
    const { engine } = makeEngine();
    engine.receive({ col: "couple", id: "doc", data: { since: "2024-01-01" }, ts: 7000, by: "1".repeat(32) });
    engine.receive({ col: "couple", id: "doc", data: { since: "2025-01-01" }, ts: 7000, by: "2".repeat(32) });
    engine.receive({ col: "couple", id: "doc", data: { since: "2023-01-01" }, ts: 7000, by: "0".repeat(32) });
    expect(engine.get(docKey("couple", "doc"), null)).toEqual({ since: "2025-01-01" });
  });

  it("remembers deletions so old copies can't bring an item back", () => {
    const { engine } = makeEngine();
    engine.receive({ col: "strokes", id: "s1", data: { id: "s1" }, ts: 2000, by: PARTNER });
    engine.receive({ col: "strokes", id: "s1", data: null, ts: 3000, by: PARTNER });
    expect(engine.get("strokes", [])).toHaveLength(0);
    expect(engine.receive({ col: "strokes", id: "s1", data: { id: "s1" }, ts: 2500, by: PARTNER })).toBe(false);
    expect(engine.get("strokes", [])).toHaveLength(0);
  });

  it("never loses a local edit to a partner clock that runs ahead", () => {
    const { engine } = makeEngine();
    engine.receive({ col: "couple", id: "doc", data: { since: "2024-01-01" }, ts: 999_999, by: PARTNER });
    engine.put("couple", "doc", { since: "2020-02-02" });
    expect(engine.get(docKey("couple", "doc"), null)).toEqual({ since: "2020-02-02" });
  });

  it("ignores unknown columns and broken data", () => {
    const { engine } = makeEngine();
    expect(engine.receive({ col: "hack", id: "x", data: {}, ts: 1, by: PARTNER })).toBe(false);
    expect(engine.receive({ col: "messages", id: 5 as unknown as string, data: {}, ts: 1, by: PARTNER })).toBe(false);
  });

  it("can rebuild everything it knows in each author's own words (for re-uploading)", () => {
    const { engine } = makeEngine();
    engine.put("messages", "mine", { id: "mine", sender: "me", text: "a", at: 1, reactions: [] });
    engine.receive({ col: "messages", id: "theirs", data: { id: "theirs", sender: "me", text: "b", at: 2, reactions: [] }, ts: 9000, by: PARTNER });
    const snapshot = engine.snapshot();
    const theirs = snapshot.find((p) => p.id === "theirs");
    expect(theirs).toMatchObject({ by: PARTNER, data: { sender: "me" } });
    expect(snapshot.find((p) => p.id === "mine")).toMatchObject({ by: ME, data: { sender: "me" } });
  });

  it("saves an item together with the outbox and the catch-up position, in one write", () => {
    const writes: string[][] = [];
    const persist: Persistence = { write: (puts) => void writes.push(puts.map(([key]) => key)), clear: async () => {} };
    const engine = new SyncEngine(ME, tick, persist, {});
    // Like the sync client: every local change is queued in the outbox.
    engine.sender = () => engine.setLocal("sync-outbox", ["queued"]);

    engine.put("messages", "m1", { id: "m1", sender: "me", text: "hi", at: 1, reactions: [] });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual(expect.arrayContaining(["item:messages/m1", "local:sync-outbox", "sync-meta"]));

    // Like the sync client: a received event and its number are saved in the same write.
    engine.receive({ col: "messages", id: "m2", data: { id: "m2", sender: "me", text: "yo", at: 2, reactions: [] }, ts: 9000, by: PARTNER });
    engine.setLocal("sync-seq", 7);
    engine.flush();
    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual(expect.arrayContaining(["item:messages/m2", "local:sync-seq", "sync-meta"]));
  });

  it("tells listeners when something changes and tracks unsent items", () => {
    const { engine } = makeEngine();
    let calls = 0;
    engine.subscribe("photos", () => calls++);
    engine.put("photos", "e1", { id: "e1" });
    expect(calls).toBe(1);
    engine.setPending("photos", "e1", true);
    expect(engine.pendingIds("photos").has("e1")).toBe(true);
    engine.setPending("photos", "e1", false);
    expect(engine.pendingIds("photos").has("e1")).toBe(false);
  });
});
