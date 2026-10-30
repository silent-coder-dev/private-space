import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { createContext, useContext } from "react";
import { randomId } from "@/sync/crypto";
import { readStore, usePersistentState, writeStore } from "./storage";

/**
 * The optional PIN lock for this phone. Only a slow hash of the PIN is saved (PBKDF2-SHA256, 150 000 rounds),
 * in this room's storage on this phone — so it disappears with the room.
 */
export interface LockSettings {
  salt: string;
  hash: string;
  /** Number of digits (so the keypad can unlock as soon as the last digit is typed). */
  length?: number;
}

export const LOCK_KEY = "app-lock";
const FAILS_KEY = "app-lock-fails";
const ITERATIONS = 150_000;
/** After this many wrong PINs in a row, wait before trying again. */
export const MAX_TRIES = 5;
export const WAIT_MS = 30_000;

export const hashPin = async (pin: string, salt: string) => bytesToHex(await pbkdf2Async(sha256, pin, hexToBytes(salt), { c: ITERATIONS, dkLen: 32 }));

export const makeLock = async (pin: string): Promise<LockSettings> => {
  const salt = randomId(16);
  return { salt, hash: await hashPin(pin, salt), length: pin.length };
};

export const checkPin = async (pin: string, settings: LockSettings) => (await hashPin(pin, settings.salt)) === settings.hash;

export function useLockSettings() {
  return usePersistentState<LockSettings | null>(LOCK_KEY, null);
}

/** Wrong tries survive a reload, so reloading the page can't skip the wait. */
export const readFails = () => readStore<{ count: number; until: number }>(FAILS_KEY, { count: 0, until: 0 });
export const writeFails = (value: { count: number; until: number }) => writeStore(FAILS_KEY, value);

export interface AppLockApi {
  /** A PIN is set on this phone. */
  enabled: boolean;
  /** Lock right now (e.g. before handing the phone to someone). */
  lockNow: () => void;
}

export const AppLockContext = createContext<AppLockApi>({ enabled: false, lockNow: () => undefined });
export const useAppLock = () => useContext(AppLockContext);
