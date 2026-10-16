/** Shared animation settings so every page moves the same way. */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

/** Container + item variants for staggered lists. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};
