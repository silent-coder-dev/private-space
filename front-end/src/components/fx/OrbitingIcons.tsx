import type { CSSProperties } from "react";
import { Heart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ring {
  radius: number;
  duration: number;
  icons: LucideIcon[];
  reverse?: boolean;
}

/** A beating heart with feature icons circling around it on two rings. */
export function OrbitingIcons({ rings, className }: { rings: Ring[]; className?: string }) {
  const size = Math.max(...rings.map((r) => r.radius)) * 2 + 64;

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: size, height: size }} aria-hidden>
      {rings.map((ring) => (
        <div
          key={ring.radius}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
          style={{ width: ring.radius * 2, height: ring.radius * 2 }}
        />
      ))}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 animate-ripple rounded-full bg-primary/30" />
        <span className="absolute inset-0 animate-ripple rounded-full bg-primary/20 [animation-delay:1.2s]" />
        <div className="relative grid h-24 w-24 place-items-center rounded-full gradient-primary glow-primary">
          <Heart className="h-11 w-11 animate-heartbeat fill-white text-white" />
        </div>
      </div>

      {rings.flatMap((ring) =>
        ring.icons.map((Icon, i) => (
          <div
            key={`${ring.radius}-${i}`}
            className={cn(
              "absolute left-1/2 top-1/2 -ml-6 -mt-6 grid h-12 w-12 animate-orbit place-items-center rounded-2xl glass shadow-lg",
              ring.reverse && "[animation-direction:reverse]",
            )}
            style={
              {
                "--orbit-radius": `${ring.radius}px`,
                "--orbit-duration": `${ring.duration}s`,
                animationDelay: `-${(ring.duration / ring.icons.length) * i}s`,
              } as CSSProperties
            }
          >
            <Icon className="h-5 w-5 text-blush" />
          </div>
        )),
      )}
    </div>
  );
}
