import { AnimatePresence, motion } from "framer-motion";
import { Fingerprint, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { fireHearts } from "@/lib/burst";
import { notify } from "@/lib/notify";

type Point = { x: number; y: number };
const SEND_EVERY = 70;
const KEEP_ALIVE = 500;
/** How close (as a share of the pad) two thumbs must be to "kiss". */
const KISS_DISTANCE = 0.12;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Thumb kiss: you both put a thumb on the pad. You see where your partner is touching, and when
 * your thumbs meet, both phones buzz and hearts fly. Touches travel as live encrypted signals (never stored).
 */
export function ThumbKiss() {
  const { thumbKissOpen: open, setThumbKissOpen, profile } = useSpace();
  const { signal, onSignal, presence } = useRoom();
  const [mine, setMine] = useState<Point | null>(null);
  const [theirs, setTheirs] = useState<Point | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const lastSent = useRef(0);
  const lastInvite = useRef(0);
  const pad = useRef<HTMLDivElement>(null);

  const kissing = !!mine && !!theirs && Math.hypot(mine.x - theirs.x, mine.y - theirs.y) < KISS_DISTANCE;

  // Your partner's thumb (and their invitation when your pad is closed).
  useEffect(
    () =>
      onSignal((s) => {
        if (s.type !== "touch") return;
        const d = (s.data ?? {}) as { x?: number; y?: number; up?: boolean };
        if (typeof d.x === "number" && typeof d.y === "number") setTheirs({ x: clamp(d.x), y: clamp(d.y) });
        else if (d.up) setTheirs(null);
        if (!openRef.current && Date.now() - lastInvite.current > 15_000) {
          lastInvite.current = Date.now();
          toast(`👆 ${profile.partner} wants a thumb kiss`, { duration: 10_000, action: { label: "Join", onClick: () => setThumbKissOpen(true) } });
          void notify(`👆 ${profile.partner} wants a thumb kiss`, "Put your thumb on the screen", { tag: "touch" });
        }
      }),
    [onSignal, profile.partner, setThumbKissOpen],
  );

  // A thumb that stops sending (lifted, or the network dropped) fades away.
  useEffect(() => {
    if (!theirs) return;
    const id = setTimeout(() => setTheirs(null), 1500);
    return () => clearTimeout(id);
  }, [theirs]);

  // While you hold still, keep telling your partner where you are.
  useEffect(() => {
    if (!mine) return;
    const id = setInterval(() => signal("touch", mine), KEEP_ALIVE);
    return () => clearInterval(id);
  }, [mine, signal]);

  // Opening the pad invites your partner.
  useEffect(() => {
    if (open) signal("touch", { invite: true });
    else {
      setMine(null);
      setTheirs(null);
    }
  }, [open, signal]);

  // Buzz while your thumbs meet.
  useEffect(() => {
    if (!kissing) return;
    fireHearts({ count: 24, emojis: ["💋", "💖", "✨"] });
    const buzz = () => {
      try {
        navigator.vibrate?.(90);
      } catch {
        /* not allowed */
      }
    };
    buzz();
    const id = setInterval(buzz, 600);
    return () => clearInterval(id);
  }, [kissing]);

  const pointFrom = (e: React.PointerEvent): Point | null => {
    const rect = pad.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  };
  const move = (e: React.PointerEvent) => {
    if (!e.isPrimary || (e.type === "pointermove" && !mine)) return;
    const p = pointFrom(e);
    if (!p) return;
    setMine(p);
    if (Date.now() - lastSent.current > SEND_EVERY) {
      lastSent.current = Date.now();
      signal("touch", p);
    }
  };
  const lift = () => {
    setMine(null);
    signal("touch", { up: true });
  };

  const close = () => {
    lift();
    setThumbKissOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="thumb-kiss"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[96] flex flex-col bg-background/95 backdrop-blur-xl"
          role="dialog"
          aria-label="Thumb kiss"
        >
          <div className="flex items-center gap-3 p-4">
            <UserAvatar who="partner" size="md" online={presence.partnerOnline} />
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold">Thumb kiss with {profile.partner}</p>
              <p className="text-xs text-muted-foreground">
                {presence.partnerOnline ? (theirs ? `${profile.partner} is touching 💓` : `Waiting for ${profile.partner}'s thumb…`) : `${profile.partner} isn't in the app — they'll get your invite when they're back`}
              </p>
            </div>
            <button type="button" onClick={close} aria-label="Close thumb kiss" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={pad}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              move(e);
            }}
            onPointerMove={move}
            onPointerUp={lift}
            onPointerCancel={lift}
            className="relative mx-4 mb-[calc(1rem+env(safe-area-inset-bottom))] flex-1 touch-none select-none overflow-hidden rounded-[2rem] border border-white/10 gradient-soft"
            aria-label="Touch pad — put your thumb here"
          >
            <div className="absolute inset-0 bg-dots opacity-40" />
            {!mine && !theirs && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
                <div className="space-y-3">
                  <Fingerprint className="mx-auto h-16 w-16 animate-heartbeat text-primary/70" />
                  <p className="font-heading text-lg font-semibold">Hold your thumb anywhere</p>
                  <p className="text-sm text-muted-foreground">When your thumbs meet, both phones buzz 💓</p>
                </div>
              </div>
            )}
            {theirs && <Thumb point={theirs} tone="partner" />}
            {mine && <Thumb point={mine} tone="me" />}
            <AnimatePresence>
              {kissing && mine && (
                <motion.div
                  key="kiss"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-6xl"
                  style={{ left: `${mine.x * 100}%`, top: `${mine.y * 100}%` }}
                >
                  💋
                </motion.div>
              )}
            </AnimatePresence>
            {kissing && <p className="pointer-events-none absolute inset-x-0 top-6 text-center font-heading text-2xl font-bold text-gradient">Thumb kiss! 💞</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Thumb({ point, tone }: { point: Point; tone: "me" | "partner" }) {
  return (
    <motion.span
      layout
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="pointer-events-none absolute grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
      style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
    >
      <span className={`absolute inset-0 animate-ripple rounded-full ${tone === "me" ? "bg-primary/40" : "bg-secondary/40"}`} />
      <span className={`absolute inset-3 rounded-full blur-md ${tone === "me" ? "bg-primary/60" : "bg-secondary/60"}`} />
      <Fingerprint className="relative h-10 w-10 text-white/90" />
    </motion.span>
  );
}
