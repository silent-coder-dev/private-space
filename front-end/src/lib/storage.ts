import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

/**
 * Everything UsSpace saves lives in this browser's localStorage under this prefix.
 * Bump the version if the saved shapes ever change in a breaking way.
 */
export const STORAGE_PREFIX = "usspace:v1:";
const LOCAL_EVENT = "usspace:store";

/**
 * Each room keeps its own data ("usspace:v1:r:<room>:messages"), so leaving a room
 * or joining another never mixes things up. Set once, when the room session starts.
 */
let scope = "";

export function setStorageScope(roomId: string | null): void {
  scope = roomId ? `r:${roomId.slice(0, 16)}:` : "";
}

const fullKey = (key: string) => STORAGE_PREFIX + scope + key;

type Initial<T> = T | (() => T);

const resolve = <T,>(initial: Initial<T>): T =>
  typeof initial === "function" ? (initial as () => T)() : initial;

function safeParse<T>(raw: string | null, fallback: () => T): T {
  if (raw == null) return fallback();
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(fullKey(key));
  } catch {
    return null;
  }
}

let lastWarning = 0;

function writeRaw(key: string, raw: string): boolean {
  try {
    window.localStorage.setItem(fullKey(key), raw);
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { key, raw } }));
    return true;
  } catch {
    // Storage can be full (big photos) or blocked (private mode). Warn, but at most once a minute.
    if (Date.now() - lastWarning > 60_000) {
      lastWarning = Date.now();
      toast.error("Couldn't save to this device", {
        description: "Storage may be full or blocked. Try removing a few photos.",
      });
    }
    return false;
  }
}

export function readStore<T>(key: string, fallback: Initial<T>): T {
  return safeParse(readRaw(key), () => resolve(fallback));
}

export function writeStore<T>(key: string, value: T): boolean {
  return writeRaw(key, JSON.stringify(value));
}

export function removeStore(key: string): void {
  try {
    window.localStorage.removeItem(fullKey(key));
  } catch {
    /* nothing to remove */
  }
}

/** Read a list from storage, change it, and save it back (for writes from other pages). */
export function updateStore<T>(key: string, fallback: Initial<T>, update: (value: T) => T): boolean {
  return writeStore(key, update(readStore(key, fallback)));
}

/** Remove everything saved for the current room (or every UsSpace key when no room is set). */
export function clearStore(): void {
  try {
    const prefix = STORAGE_PREFIX + scope;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* nothing to clear */
  }
}

/**
 * useState that is saved to localStorage.
 * It stays in sync with other components and other open tabs that use the same key.
 */
export function usePersistentState<T>(key: string, initial: Initial<T>): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initial);
  const lastRaw = useRef<string | null>(null);

  const [value, setValue] = useState<T>(() => {
    const raw = readRaw(key);
    lastRaw.current = raw;
    return safeParse(raw, () => resolve(initialRef.current));
  });

  useEffect(() => {
    const raw = JSON.stringify(value);
    if (raw === lastRaw.current) return;
    lastRaw.current = raw;
    writeRaw(key, raw);
  }, [key, value]);

  const sync = useCallback((raw: string | null) => {
    if (raw === lastRaw.current) return;
    lastRaw.current = raw;
    setValue(safeParse(raw, () => resolve(initialRef.current)));
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === fullKey(key)) sync(e.newValue);
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; raw: string }>).detail;
      if (detail?.key === key) sync(detail.raw);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }, [key, sync]);

  return [value, setValue];
}

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
