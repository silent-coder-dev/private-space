import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { clearStore, readStore, STORAGE_PREFIX, updateStore, usePersistentState, writeStore } from "@/lib/storage";

describe("storage helpers", () => {
  it("writes and reads JSON under the app prefix", () => {
    writeStore("demo", { a: 1 });
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}demo`)).toBe('{"a":1}');
    expect(readStore("demo", null)).toEqual({ a: 1 });
  });

  it("falls back when the value is missing or broken", () => {
    expect(readStore("missing", () => 42)).toBe(42);
    window.localStorage.setItem(`${STORAGE_PREFIX}broken`, "{not json");
    expect(readStore("broken", "ok")).toBe("ok");
  });

  it("updateStore changes a saved list", () => {
    updateStore<number[]>("list", [], (l) => [...l, 1]);
    updateStore<number[]>("list", [], (l) => [...l, 2]);
    expect(readStore("list", [])).toEqual([1, 2]);
  });

  it("clearStore only removes UsSpace keys", () => {
    writeStore("x", 1);
    window.localStorage.setItem("other-app", "keep");
    clearStore();
    expect(readStore("x", null)).toBeNull();
    expect(window.localStorage.getItem("other-app")).toBe("keep");
  });
});

describe("usePersistentState", () => {
  it("saves changes and loads them next time", () => {
    const first = renderHook(() => usePersistentState("count", 0));
    act(() => first.result.current[1](5));
    expect(readStore("count", 0)).toBe(5);

    const second = renderHook(() => usePersistentState("count", 0));
    expect(second.result.current[0]).toBe(5);
  });

  it("keeps two components with the same key in sync", () => {
    const a = renderHook(() => usePersistentState("shared", "hello"));
    const b = renderHook(() => usePersistentState("shared", "hello"));
    act(() => a.result.current[1]("hi there"));
    expect(b.result.current[0]).toBe("hi there");
  });
});
