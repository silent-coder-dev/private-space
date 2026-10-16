import { useMemo } from "react";

/**
 * Little glowing dots and hearts that drift up and down in the background.
 * Pure CSS animation (no JavaScript per frame), so it costs almost nothing.
 * The global reduced-motion rule in index.css stops it for people who ask for less motion.
 */
const FloatingParticles = ({ count = 26 }: { count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1.5,
        heart: i % 6 === 0,
        duration: Math.random() * 8 + 7,
        delay: -Math.random() * 10,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden">
      {particles.map((p) =>
        p.heart ? (
          <span
            key={p.id}
            className="absolute animate-drift-heart select-none text-primary/30 will-change-transform"
            style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size * 3, animationDuration: `${p.duration * 1.4}s`, animationDelay: `${p.delay}s` }}
          >
            ♥
          </span>
        ) : (
          <span
            key={p.id}
            className="absolute animate-drift rounded-full bg-primary/25 shadow-[0_0_8px_hsl(var(--primary)/0.6)] will-change-transform"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
          />
        ),
      )}
    </div>
  );
};

export default FloatingParticles;
