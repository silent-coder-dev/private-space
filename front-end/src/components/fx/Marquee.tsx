import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** An endless, smoothly scrolling row. Pauses when hovered. */
export function Marquee({
  children,
  className,
  duration = "40s",
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  duration?: string;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn("group flex gap-[--gap] overflow-hidden mask-fade-x [--gap:1rem]", className)}
      style={{ "--marquee-duration": duration } as CSSProperties}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn(
            "flex shrink-0 animate-marquee items-center gap-[--gap] group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
