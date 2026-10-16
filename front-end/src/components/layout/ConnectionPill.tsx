import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { cn } from "@/lib/utils";

/** Live status: are we connected, and is your partner here right now? */
export function ConnectionPill({ compact = false }: { compact?: boolean }) {
  const { status, presence } = useRoom();
  const { profile } = useSpace();

  const state =
    status === "online"
      ? presence.members < 2
        ? { tone: "wait", label: "Waiting for partner", short: "Waiting" }
        : presence.partnerOnline && !profile.partnerAway
          ? { tone: "together", label: `${profile.partner} is here`, short: "Together" }
          : { tone: "live", label: "Live", short: "Live" }
      : status === "connecting"
        ? { tone: "connecting", label: "Connecting…", short: "Connecting" }
        : { tone: "offline", label: "Offline · changes saved", short: "Offline" };

  return (
    <span
      role="status"
      aria-live="polite"
      title={state.label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors",
        state.tone === "together" && "bg-success/10 text-success ring-success/30",
        state.tone === "live" && "bg-primary/10 text-blush ring-primary/30",
        state.tone === "wait" && "bg-gold/10 text-gold ring-gold/30",
        state.tone === "connecting" && "bg-gold/10 text-gold ring-gold/30",
        state.tone === "offline" && "bg-muted text-muted-foreground ring-white/10",
      )}
    >
      <span className="relative flex h-2 w-2">
        {(state.tone === "together" || state.tone === "connecting") && (
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative h-2 w-2 rounded-full bg-current" />
      </span>
      {compact ? state.short : state.label}
    </span>
  );
}
