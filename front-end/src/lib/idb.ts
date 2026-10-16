/** A tiny IndexedDB key-value store. Much bigger than localStorage, so photos and videos fit. */
const DB_NAME = "usspace";
const STORE = "kv";
let dbPromise: Promise<IDBDatabase> | null = null;

export const idbAvailable = () => typeof indexedDB !== "undefined";

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

const done = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const store = async (mode: IDBTransactionMode) => (await db()).transaction(STORE, mode).objectStore(STORE);
const range = (prefix: string) => IDBKeyRange.bound(prefix, `${prefix}￿`);

/** Everything saved under a prefix, keyed without the prefix. */
export async function idbLoadPrefix(prefix: string): Promise<Record<string, unknown>> {
  const s = await store("readonly");
  const [keys, values] = await Promise.all([done(s.getAllKeys(range(prefix))), done(s.getAll(range(prefix)))]);
  const out: Record<string, unknown> = {};
  keys.forEach((key, i) => (out[String(key).slice(prefix.length)] = values[i]));
  return out;
}

/** Save and delete many keys in ONE transaction: either all of it is stored, or none of it. */
export async function idbWrite(puts: [string, unknown][], removes: string[]) {
  const tx = (await db()).transaction(STORE, "readwrite");
  const s = tx.objectStore(STORE);
  for (const [key, value] of puts) s.put(value, key);
  for (const key of removes) s.delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

export async function idbClearPrefix(prefix: string) {
  await done((await store("readwrite")).delete(range(prefix)));
}
