import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { describe, expect, it } from "vitest";
import { deriveKeys, formatCode, generateCode, isValidCode, itemKey, normalizeCode, open, seal } from "@/sync/crypto";

describe("secret codes", () => {
  it("look like XXXX-XXXX-XXXX-XXXX with no confusing letters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
      expect(code).not.toMatch(/[ILOU]/);
      expect(isValidCode(code)).toBe(true);
    }
  });

  it("are different every time (80 bits of randomness)", () => {
    const codes = new Set(Array.from({ length: 200 }, generateCode));
    expect(codes.size).toBe(200);
  });

  it("forgive typing mistakes: case, spaces, dashes and look-alikes", () => {
    expect(normalizeCode("kx7p 9m2q-abcd efgh")).toBe("KX7P9M2QABCDEFGH");
    expect(normalizeCode("O0iIlLuU")).toBe("001111VV");
    expect(formatCode("kx7p9m2qabcdefgh")).toBe("KX7P-9M2Q-ABCD-EFGH");
  });

  it("rejects codes that are too short or too long", () => {
    expect(isValidCode("KX7P-9M2Q")).toBe(false);
    expect(isValidCode("KX7P-9M2Q-ABCD-EFGH-J")).toBe(false);
  });
});

describe("key derivation", () => {
  it("gives the same keys for the same code, however it was typed", () => {
    const a = deriveKeys("KX7P-9M2Q-ABCD-EFGH");
    const b = deriveKeys("kx7p9m2q abcd efgh");
    expect(a.roomId).toBe(b.roomId);
    expect(a.authKey).toBe(b.authKey);
    expect(bytesToHex(a.encKey)).toBe(bytesToHex(b.encKey));
  });

  it("gives completely different keys for different codes", () => {
    const a = deriveKeys(generateCode());
    const b = deriveKeys(generateCode());
    expect(a.roomId).not.toBe(b.roomId);
    expect(bytesToHex(a.encKey)).not.toBe(bytesToHex(b.encKey));
  });

  it("keeps every key separate, and the server only gets a hash of the auth key", () => {
    const k = deriveKeys(generateCode());
    expect(k.roomId).toMatch(/^[0-9a-f]{32}$/);
    expect(k.verifier).toBe(bytesToHex(sha256(hexToBytes(k.authKey))));
    const all = [k.roomId, k.authKey, bytesToHex(k.encKey), bytesToHex(k.macKey)];
    expect(new Set(all).size).toBe(4);
  });
});

describe("end-to-end encryption", () => {
  const keys = deriveKeys(generateCode());

  it("round-trips any JSON value", () => {
    const value = { col: "messages", id: "1", data: { text: "I love you 💕" }, ts: 1, by: "x" };
    const sealed = seal(keys, value);
    expect(sealed).not.toContain("love");
    expect(open(keys, sealed)).toEqual(value);
  });

  it("uses a fresh nonce every time", () => {
    expect(seal(keys, "same")).not.toBe(seal(keys, "same"));
  });

  it("rejects tampered data", () => {
    const sealed = seal(keys, { hello: "world" });
    const bytes = atob(sealed).split("");
    bytes[30] = String.fromCharCode(bytes[30].charCodeAt(0) ^ 1);
    expect(open(keys, btoa(bytes.join("")))).toBeNull();
  });

  it("can't be opened with another room's code", () => {
    const other = deriveKeys(generateCode());
    expect(open(other, seal(keys, "secret"))).toBeNull();
  });

  it("makes stable, opaque item keys", () => {
    expect(itemKey(keys, "messages", "a")).toBe(itemKey(keys, "messages", "a"));
    expect(itemKey(keys, "messages", "a")).not.toBe(itemKey(keys, "messages", "b"));
    expect(itemKey(keys, "messages", "a")).toMatch(/^[0-9a-f]{32}$/);
  });
});
