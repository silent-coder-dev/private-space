import { motion, useMotionValue, useReducedMotion, useSpring, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
  /** Gently tilt the card in 3D towards the pointer. */
  tilt?: boolean;
}

/**
 * A glass card with a soft light that follows the pointer, a glowing edge,
 * and an optional 3D tilt.
 */
export function SpotlightCard({ className, children, tilt = false, style, ...props }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 220, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 22 });
  const canTilt = tilt && !reduceMotion;

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--spot-x", `${x}px`);
    el.style.setProperty("--spot-y", `${y}px`);
    if (canTilt && e.pointerType === "mouse") {
      rotateY.set((x / rect.width - 0.5) * 9);
      rotateX.set(-(y / rect.height - 0.5) * 9);
    }
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={canTilt ? { rotateX: springX, rotateY: springY, transformPerspective: 900, ...style } : style}
      className={cn(
        "group/spot glass-card relative overflow-hidden [&>*:not([data-spot])]:relative [&>*:not([data-spot])]:z-[1]",
        className,
      )}
      {...props}
    >
      <div
        data-spot
        aria-hidden
        className="pointer-events-none absolute -inset-px z-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(380px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--primary) / 0.14), transparent 45%)",
        }}
      />
      <div
        data-spot
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] p-px opacity-0 transition-opacity duration-500 [-webkit-mask-composite:xor] [mask-composite:exclude] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(260px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--primary) / 0.7), hsl(var(--secondary) / 0.4) 40%, transparent 70%)",
        }}
      />
      {children}
    </motion.div>
  );
}
