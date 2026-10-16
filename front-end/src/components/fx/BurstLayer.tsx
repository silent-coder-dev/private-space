import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { onBurst } from "@/lib/burst";

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
}

let nextId = 0;

/** Draws the emoji "heart burst" whenever `fireHearts()` is called anywhere in the app. */
export function BurstLayer() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(
    () =>
      onBurst((event) => {
        const count = reduceMotion ? Math.min(5, event.count) : event.count;
        const created: Particle[] = Array.from({ length: count }, (_, i) => {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
          const distance = 70 + Math.random() * 130;
          return {
            id: nextId++,
            x: event.x,
            y: event.y,
            emoji: event.emojis[i % event.emojis.length],
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance - 50,
            rotate: (Math.random() - 0.5) * 120,
            scale: 0.7 + Math.random() * 0.9,
          };
        });
        const ids = new Set(created.map((p) => p.id));
        setParticles((prev) => [...prev, ...created]);
        window.setTimeout(() => setParticles((prev) => prev.filter((p) => !ids.has(p.id))), 1500);
      }),
    [reduceMotion],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute -ml-3 -mt-4 select-none text-2xl will-change-transform"
          style={{ left: p.x, top: p.y }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: [0, p.dx, p.dx * 1.1],
            y: [0, p.dy, p.dy + 140],
            scale: [0, p.scale, p.scale * 0.7],
            opacity: [1, 1, 0],
            rotate: [0, p.rotate, p.rotate * 1.4],
          }}
          transition={{ duration: 1.4, times: [0, 0.45, 1], ease: "easeOut" }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}
