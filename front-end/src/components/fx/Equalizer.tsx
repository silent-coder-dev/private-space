import { cn } from "@/lib/utils";

/** Bouncing music bars. They freeze in place while `playing` is false. */
export function Equalizer({ playing, bars = 4, className }: { playing: boolean; bars?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-4 items-end gap-[3px]", className)}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="h-full w-[3px] origin-bottom animate-equalizer rounded-full bg-current"
          style={{
            animationDelay: `${i * -0.23}s`,
            animationDuration: `${0.8 + (i % 3) * 0.22}s`,
            animationPlayState: playing ? "running" : "paused",
          }}
        />
      ))}
    </span>
  );
}
