import { useMemo } from "react";

/** Shooting stars that streak across a section now and then. */
export function Meteors({ count = 12 }: { count?: number }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 40 - 10}%`,
        delay: `${Math.random() * 8}s`,
        duration: `${5 + Math.random() * 6}s`,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {meteors.map((m, i) => (
        <span
          key={i}
          className="absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-white shadow-[0_0_0_1px_#ffffff10,0_0_12px_2px_hsl(var(--primary)/0.5)] before:absolute before:top-1/2 before:h-px before:w-[70px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-white/80 before:to-transparent before:content-['']"
          style={{ left: m.left, top: m.top, animationDelay: m.delay, animationDuration: m.duration }}
        />
      ))}
    </div>
  );
}
