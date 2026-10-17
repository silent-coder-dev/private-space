import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { hkdf } from "@noble/hashes/hkdf";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

/**
 * Room secrets.
 *
 * The secret code is 16 characters from a 32-letter alphabet = 80 bits of randomness.
 * Everything else is derived from it on the device:
 *   roomId   → tells the server which room (can't be turned back into the code)
 *   authKey  → proves to the server that you know the code (server only stores its hash)
 *   encKey   → encrypts every event end-to-end (never leaves the device)
 *   macKey   → makes opaque per-item keys so the server can de-duplicate without reading anything
 */

// Crockford base32: no I, L, O or U, so codes are easy to read aloud and type.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 16;
const SALT = utf8ToBytes("usspace/v1");

export function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = "";
  for (const b of bytes) raw += ALPHABET[b & 31];
  return formatCode(raw);
}

/** "kx7p9m2q…" → "KX7P-9M2Q-…" (groups of four). */
export function formatCode(code: string): string {
  return normalizeCode(code).match(/.{1,4}/g)?.join("-") ?? "";
}

/** Upper-case, drop spaces/dashes and fix look-alike letters (O→0, I/L→1, U→V). */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

export function isValidCode(input: string): boolean {
  const code = normalizeCode(input);
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}

export interface RoomKeys {
  roomId: string;
  authKey: string;
  verifier: string;
  encKey: Uint8Array;
  macKey: Uint8Array;
}

const derive = (code: string, info: string, length: number) =>
  hkdf(sha256, utf8ToBytes(normalizeCode(code)), SALT, utf8ToBytes(info), length);

export function deriveKeys(code: string): RoomKeys {
  const authKeyBytes = derive(code, "auth", 32);
  return {
    roomId: bytesToHex(derive(code, "room-id", 16)),
    authKey: bytesToHex(authKeyBytes),
    verifier: bytesToHex(sha256(authKeyBytes)),
    encKey: derive(code, "e2e-encryption", 32),
    macKey: derive(code, "item-key", 32),
  };
}

export const randomId = (bytes = 16): string => bytesToHex(randomBytes(bytes));

/** An opaque, stable key for an item ("messages" + id) that reveals nothing to the server. */
export function itemKey(keys: RoomKeys, col: string, id: string): string {
  return bytesToHex(hmac(sha256, keys.macKey, utf8ToBytes(`${col}\u0000${id}`))).slice(0, 32);
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array => {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

/** Encrypt any JSON value with XChaCha20-Poly1305 (random 24-byte nonce, room id as associated data). */
export function seal(keys: RoomKeys, value: unknown): string {
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(keys.encKey, nonce, utf8ToBytes(keys.roomId));
  const ciphertext = cipher.encrypt(utf8ToBytes(JSON.stringify(value)));
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce);
  out.set(ciphertext, nonce.length);
  return toBase64(out);
}

/** Encrypt raw bytes (live call audio/video): nonce + ciphertext, no text encoding. */
export function sealBytes(keys: RoomKeys, plain: Uint8Array): Uint8Array {
  const nonce = randomBytes(24);
  const ciphertext = xchacha20poly1305(keys.encKey, nonce, utf8ToBytes(keys.roomId)).encrypt(plain);
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce);
  out.set(ciphertext, nonce.length);
  return out;
}

/** Decrypt raw bytes. Returns null if tampered with. */
export function openBytes(keys: RoomKeys, sealed: Uint8Array): Uint8Array | null {
  try {
    return xchacha20poly1305(keys.encKey, sealed.subarray(0, 24), utf8ToBytes(keys.roomId)).decrypt(sealed.subarray(24));
  } catch {
    return null;
  }
}

/** Decrypt and verify. Returns null if the data was tampered with or uses another room's key. */
export function open<T = unknown>(keys: RoomKeys, sealed: string): T | null {
  try {
    const bytes = fromBase64(sealed);
    const cipher = xchacha20poly1305(keys.encKey, bytes.subarray(0, 24), utf8ToBytes(keys.roomId));
    const plain = cipher.decrypt(bytes.subarray(24));
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}
