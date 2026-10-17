import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Mic, MicOff, Minimize2, Phone, PhoneOff, ShieldCheck, SwitchCamera, Video, VideoOff, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useCall } from "./call";

function MediaView({ stream, muted, className, mirror }: { stream: MediaStream | null; muted?: boolean; className?: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={cn(className, mirror && "-scale-x-100")} />;
}

/** Your partner's video in a call that goes through the server (drawn picture by picture). */
function RelayVideo({ canvas }: { canvas: HTMLCanvasElement }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    canvas.className = "h-full w-full object-cover";
    el.appendChild(canvas);
    return () => {
      if (canvas.parentNode === el) el.removeChild(canvas);
    };
  }, [canvas]);
  return <div ref={box} className="absolute inset-0" data-testid="relay-video" />;
}

function Timer({ since }: { since: number | null }) {
  const now = useNow(1000);
  return <span className="tabular-nums">{since ? formatDuration((now - since) / 1000) : "00:00"}</span>;
}

const RoundButton = ({ onClick, label, tone = "glass", children }: { onClick: () => void; label: string; tone?: "glass" | "red" | "green" | "on"; children: ReactNode }) => (
  <motion.button
    type="button"
    // No movement on hover (a moving target is hard to tap); a press gives feedback instead.
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "relative z-[1] grid h-14 w-14 place-items-center rounded-full text-white shadow-xl [&_svg]:h-6 [&_svg]:w-6",
      "transition-[filter,background-color] hover:brightness-110",
      tone === "glass" && "bg-white/15 backdrop-blur-xl hover:bg-white/25",
      tone === "on" && "bg-white text-background",
      tone === "red" && "bg-destructive shadow-destructive/40",
      tone === "green" && "bg-success shadow-success/40",
    )}
  >
    {children}
  </motion.button>
);

/** Ringing, calling, the live call and the small floating call bar. */
export function CallOverlay() {
  const call = useCall();
  const { profile } = useSpace();
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  // The partner's voice always plays here, even when the call window is minimised.
  // Some phones block sound that didn't start from a tap — then we show a "Tap to hear" button.
  useEffect(() => {
    const el = remoteAudio.current;
    if (!el) return;
    if (el.srcObject !== call.remote) el.srcObject = call.remote;
    if (!call.remote) return setNeedsTap(false);
    el.play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
  }, [call.remote]);

  const hear = () => {
    void remoteAudio.current?.play().then(() => setNeedsTap(false)).catch(() => undefined);
  };

  const video = call.kind === "video";
  const relayed = call.path === "relay";
  const showRemoteVideo = video && call.phase === "active" && (relayed ? call.remoteVideo : true);
  const label =
    call.phase === "incoming"
      ? `Incoming ${video ? "video" : "voice"} call…`
      : call.phase === "outgoing"
        ? "Calling…"
        : call.phase === "connecting"
          ? "Connecting…"
          : null;

  return (
    <>
      <audio ref={remoteAudio} autoPlay playsInline className="hidden" />
      <AnimatePresence>
        {call.phase !== "idle" && call.minimized && call.phase !== "incoming" && (
          <motion.div
            key="mini"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="glass-card fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[90] flex items-center gap-3 rounded-full bg-card/90 p-2 pr-3 shadow-2xl md:bottom-6"
          >
            <span className="relative">
              <span className="absolute inset-0 animate-ripple rounded-full bg-success/40" />
              <InitialAvatar name={profile.partner} size="sm" variant="secondary" />
            </span>
            <span className="text-sm">
              {label ?? (
                <>
                  {video ? "🎥" : "📞"} <Timer since={call.startedAt} />
                </>
              )}
            </span>
            <button type="button" onClick={call.toggleMute} aria-label={call.muted ? "Unmute" : "Mute"} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
              {call.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => call.setMinimized(false)} aria-label="Open call" className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
              <Maximize2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={call.hangup} aria-label="End call" className="grid h-9 w-9 place-items-center rounded-full bg-destructive">
              <PhoneOff className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {call.phase !== "idle" && (!call.minimized || call.phase === "incoming") && (
          <motion.div
            key="full"
            role="dialog"
            aria-label="Call"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="fixed inset-0 z-[95] overflow-hidden bg-background"
          >
            {video && call.phase === "active" && relayed && call.relayCanvas && <RelayVideo canvas={call.relayCanvas} />}
            {video && call.phase === "active" && !relayed ? (
              <MediaView stream={call.remote} muted className="absolute inset-0 h-full w-full object-cover" />
            ) : video && call.phase === "active" && call.remoteVideo ? null : (
              <div className="absolute inset-0 gradient-soft">
                <div className="absolute inset-0 bg-dots opacity-40" />
              </div>
            )}
            {video && call.phase !== "active" && call.local && (
              <MediaView stream={call.local} muted mirror className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm" />
            )}

            <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-16 text-center">
              {!showRemoteVideo && (
                // Centred in the free space, like a phone call screen.
                <div className="flex flex-1 items-center">
                  <div className="space-y-4 [perspective:800px]">
                    <motion.div animate={{ rotateY: [0, 12, -12, 0] }} transition={{ duration: 5, repeat: Infinity }} className="relative mx-auto w-fit">
                      <span className="absolute inset-0 animate-ripple rounded-full bg-primary/40" />
                      <span className="absolute inset-0 animate-ripple rounded-full bg-secondary/30 [animation-delay:1.2s]" />
                      <InitialAvatar name={profile.partner} size="xl" variant="secondary" />
                    </motion.div>
                    <p className="font-heading text-3xl font-bold">{profile.partner}</p>
                    <p className="text-muted-foreground">{label ?? <Timer since={call.startedAt} />}</p>
                    {video && call.phase === "active" && <p className="text-xs text-muted-foreground">{profile.partner}'s camera is off or the network is slow</p>}
                    {call.phase !== "incoming" && !relayed && (
                      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                        <ShieldCheck className="h-3.5 w-3.5 text-success" /> End-to-end encrypted
                      </p>
                    )}
                  </div>
                </div>
              )}
              {showRemoteVideo && (
                <p className="glass rounded-full px-4 py-1.5 text-sm">
                  {profile.partner} · <Timer since={call.startedAt} />
                </p>
              )}
              {call.phase === "active" && (relayed || needsTap) && (
                <div className="flex flex-col items-center gap-2">
                  {relayed && (
                    <p className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground" title="A direct line wasn't possible on this network, so the call goes through UsSpace — still end-to-end encrypted.">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" /> Connected through UsSpace · encrypted
                    </p>
                  )}
                  {needsTap && (
                    <button type="button" onClick={hear} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
                      <Volume2 className="h-4 w-4 text-primary" /> Tap to hear {profile.partner}
                    </button>
                  )}
                </div>
              )}

              {video && call.local && call.phase === "active" && (
                <MediaView
                  stream={call.local}
                  muted
                  mirror
                  className="absolute right-4 top-4 h-40 w-28 rounded-2xl border border-white/20 object-cover shadow-2xl sm:h-48 sm:w-36"
                />
              )}

              {call.phase === "incoming" ? (
                <div className="flex gap-16">
                  <RoundButton onClick={call.decline} label="Decline" tone="red">
                    <PhoneOff />
                  </RoundButton>
                  {/* The button stays still (easy to tap); a glow pulses behind it. */}
                  <div className="relative">
                    <span className="absolute inset-0 animate-ripple rounded-full bg-success/50" />
                    <RoundButton onClick={call.accept} label="Accept" tone="green">
                      {video ? <Video /> : <Phone />}
                    </RoundButton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <RoundButton onClick={call.toggleMute} label={call.muted ? "Unmute" : "Mute"} tone={call.muted ? "on" : "glass"}>
                    {call.muted ? <MicOff /> : <Mic />}
                  </RoundButton>
                  {video && (
                    <>
                      <RoundButton onClick={call.toggleCamera} label={call.cameraOff ? "Camera on" : "Camera off"} tone={call.cameraOff ? "on" : "glass"}>
                        {call.cameraOff ? <VideoOff /> : <Video />}
                      </RoundButton>
                      <RoundButton onClick={call.flipCamera} label="Switch camera">
                        <SwitchCamera />
                      </RoundButton>
                    </>
                  )}
                  <RoundButton onClick={() => call.setMinimized(true)} label="Minimise">
                    <Minimize2 />
                  </RoundButton>
                  <RoundButton onClick={call.hangup} label="End call" tone="red">
                    <PhoneOff />
                  </RoundButton>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
