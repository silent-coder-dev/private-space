import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Browser-only setup (the relay tests run in a plain Node environment).
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  // jsdom doesn't ship these browser APIs; the app uses them for animations and sliders.
  class MockObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  /** A WebSocket that never connects, so page tests stay offline and quiet. */
  class OfflineWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readonly OPEN = 1;
    readyState = 0;
    onopen: (() => void) | null = null;
    onmessage: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(readonly url: string) {}
    send() {}
    close() {
      this.readyState = 3;
    }
  }

  Object.assign(window, {
    IntersectionObserver: MockObserver,
    ResizeObserver: MockObserver,
    WebSocket: OfflineWebSocket,
  });
  Object.assign(globalThis, { WebSocket: OfflineWebSocket });

  Element.prototype.scrollTo = function scrollTo() {};
  Element.prototype.scrollIntoView = function scrollIntoView() {};
  Element.prototype.hasPointerCapture = () => false;

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });
}
