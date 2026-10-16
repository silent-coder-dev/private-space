import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRoom } from "@/context/room";
import { docKey, type Column, type ListColumn, type SyncEngine } from "./engine";

const EMPTY: never[] = [];
const NO_IDS = new Set<string>();

export function useEngine(): SyncEngine {
  const { engine } = useRoom();
  if (!engine) throw new Error("This page needs a room. Wrap it in <RequireRoom>.");
  return engine;
}

export interface ListActions<T> {
  /** Add a new item or replace the one with the same id. */
  upsert: (item: T) => void;
  remove: (id: string) => void;
  removeAll: () => void;
}

/** A shared list (messages, plans, letters…). Changes sync to your partner instantly. */
export function useSyncedList<T extends { id: string }>(col: ListColumn): [T[], ListActions<T>] {
  const engine = useEngine();
  const subscribe = useCallback((cb: () => void) => engine.subscribe(col, cb), [engine, col]);
  const items = useSyncExternalStore(subscribe, () => engine.get<T[]>(col, EMPTY));
  const actions = useMemo<ListActions<T>>(
    () => ({
      upsert: (item) => engine.put(col, item.id, item),
      remove: (id) => engine.put(col, id, null),
      removeAll: () => engine.get<T[]>(col, EMPTY).forEach((item) => engine.put(col, item.id, null)),
    }),
    [engine, col],
  );
  return [items, actions];
}

/**
 * A shared single value (the music player, the couple's details, your profile…).
 * `fallback` must be stable (a module-level constant), it's returned until a value exists.
 */
export function useSyncedDoc<T>(col: Column, id: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const engine = useEngine();
  const key = docKey(col, id);
  const subscribe = useCallback((cb: () => void) => engine.subscribe(key, cb), [engine, key]);
  const value = useSyncExternalStore(subscribe, () => engine.get<T>(key, fallback));
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(engine.get<T>(key, fallback)) : next;
      engine.put(col, id, resolved);
    },
    [engine, col, id, key, fallback],
  );
  return [value, set];
}

/** Ids in a list that are saved on this device but not yet confirmed by the server. */
export function usePendingIds(col: ListColumn): Set<string> {
  const engine = useEngine();
  const key = `pending:${col}`;
  const subscribe = useCallback((cb: () => void) => engine.subscribe(key, cb), [engine, key]);
  return useSyncExternalStore(subscribe, () => engine.pendingIds(col) ?? NO_IDS);
}
