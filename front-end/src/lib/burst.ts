/**
 * A tiny event bus for the "heart burst" celebration.
 * Any part of the app can call `fireHearts()`; the <BurstLayer /> mounted at the root draws it.
 */
export interface BurstOptions {
  x?: number;
  y?: number;
  count?: number;
  emojis?: string[];
}

export type BurstEvent = Required<BurstOptions>;

type Listener = (event: BurstEvent) => void;

const listeners = new Set<Listener>();

export function onBurst(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const DEFAULT_BURST_EMOJIS = ["❤️", "💖", "💕", "💗", "✨", "💘"];

export function fireHearts(options: BurstOptions = {}): void {
  const event: BurstEvent = {
    x: options.x ?? window.innerWidth / 2,
    y: options.y ?? window.innerHeight / 2,
    count: options.count ?? 18,
    emojis: options.emojis ?? DEFAULT_BURST_EMOJIS,
  };
  listeners.forEach((listener) => listener(event));
}

/** Burst from the centre of an element (for example the button that was clicked). */
export function fireFrom(element: Element | null, options: Omit<BurstOptions, "x" | "y"> = {}): void {
  if (!element) return fireHearts(options);
  const rect = element.getBoundingClientRect();
  fireHearts({ ...options, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
}
