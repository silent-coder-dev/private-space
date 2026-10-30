import { cn } from "@/lib/utils";

/**
 * Slow-moving coloured light behind the whole app ("aurora").
 * Uses soft radial gradients instead of CSS blur so it stays cheap on phones, and only drifts on larger
 * screens (a still background means glass cards don't have to re-blur on every frame while you scroll).
 */
export function AuroraBackground({ className, grid = false }: { className?: string; grid?: boolean }) {
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}>
      <div
        className="absolute -left-[20%] -top-[30%] h-[70vmax] w-[70vmax] md:animate-aurora rounded-full"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.22), transparent 62%)" }}
      />
      <div
        className="absolute -right-[25%] top-[10%] h-[65vmax] w-[65vmax] md:animate-aurora rounded-full [animation-delay:-8s]"
        style={{ background: "radial-gradient(circle, hsl(var(--secondary) / 0.22), transparent 62%)" }}
      />
      <div
        className="absolute -bottom-[35%] left-[15%] h-[60vmax] w-[60vmax] md:animate-aurora rounded-full [animation-delay:-15s]"
        style={{ background: "radial-gradient(circle, hsl(var(--blush) / 0.12), transparent 62%)" }}
      />
      <div className={cn("absolute inset-0 mask-radial opacity-70", grid ? "bg-grid" : "bg-dots")} />
    </div>
  );
}
