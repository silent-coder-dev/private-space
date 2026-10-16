import { motion } from "framer-motion";
import { Heart, Lock } from "lucide-react";
import { Equalizer } from "@/components/fx/Equalizer";
import { SlotNumber } from "@/components/fx/SlotNumber";
import { useNow } from "@/hooks/use-now";
import { getCountdown } from "@/lib/time";

/** Small looping previews shown inside the landing page feature cards. */

export function ChatDemo() {
  const bubbles = [
    { me: false, text: "Good morning, love ☀️" },
    { me: true, text: "Morning! Coffee date later? ☕" },
    { me: false, text: "Always yes 🥰" },
  ];
  return (
    <div className="space-y-2">
      {bubbles.map((b, i) => (
        <motion.div
          key={b.text}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 + i * 0.35, duration: 0.4 }}
          className={`flex ${b.me ? "justify-end" : "justify-start"}`}
        >
          <span
            className={`rounded-2xl px-3 py-1.5 text-xs ${
              b.me ? "rounded-br-md gradient-primary text-white" : "rounded-bl-md border border-white/10 bg-white/5"
            }`}
          >
            {b.text}
          </span>
        </motion.div>
      ))}
      <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function LockDemo() {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10"
        animate={{ rotate: [0, -6, 6, -3, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
      >
        <Lock className="h-6 w-6 text-blush" />
      </motion.div>
      <div>
        <p className="text-xs text-muted-foreground">Opens in</p>
        <p className="font-heading text-lg font-bold text-gradient">12d 4h</p>
      </div>
    </div>
  );
}

export function CountdownDemo() {
  const now = useNow(1000);
  // Always counts down to the next Saturday at 8pm.
  const target = new Date(now);
  target.setDate(target.getDate() + ((6 - target.getDay() + 7) % 7 || 7));
  target.setHours(20, 0, 0, 0);
  const c = getCountdown(target.getTime(), now);
  const parts = [
    { v: c.days, l: "days" },
    { v: c.hours, l: "hrs" },
    { v: c.minutes, l: "min" },
    { v: c.seconds, l: "sec" },
  ];
  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="flex-1 rounded-xl bg-white/5 py-2 text-center ring-1 ring-white/10">
          <SlotNumber value={p.v} className="font-heading text-lg font-bold" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.l}</p>
        </div>
      ))}
    </div>
  );
}

export function GameDemo() {
  const board = ["❤️", "", "💜", "", "❤️", "", "💜", "", "❤️"];
  return (
    <div className="grid w-28 grid-cols-3 gap-1.5">
      {board.map((cell, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 * i, type: "spring", stiffness: 300, damping: 18 }}
          className={`grid aspect-square place-items-center rounded-lg text-sm ring-1 ${
            i % 4 === 0 ? "bg-primary/20 ring-primary/40" : "bg-white/5 ring-white/10"
          }`}
        >
          {cell}
        </motion.div>
      ))}
    </div>
  );
}

export function MusicDemo() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="grid h-10 w-10 animate-spin-slow place-items-center rounded-full gradient-primary">
        <span className="h-2.5 w-2.5 rounded-full bg-background" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Perfect</p>
        <p className="truncate text-xs text-muted-foreground">Ed Sheeran</p>
      </div>
      <Equalizer playing className="text-primary" />
    </div>
  );
}

export function TimelineDemo() {
  const items = ["💫", "☕", "❤️", "✈️", "🏠"];
  return (
    <div className="relative flex items-center justify-between px-2">
      <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/10" />
      <motion.div
        className="absolute inset-x-4 top-[calc(50%-1px)] h-0.5 origin-left rounded-full gradient-primary"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      {items.map((emoji, i) => (
        <motion.span
          key={emoji}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.3, type: "spring", stiffness: 260, damping: 14 }}
          className="relative grid h-9 w-9 place-items-center rounded-full bg-card text-base ring-2 ring-primary/50"
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}

export function PresenceDemo() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-center">
        <div className="grid h-11 w-11 place-items-center rounded-full gradient-primary font-heading font-bold text-white">A</div>
        <p className="mt-1 text-sm">🥰</p>
      </div>
      <div className="relative h-px flex-1 bg-white/10">
        <motion.span
          className="absolute -top-2 text-primary"
          animate={{ left: ["0%", "88%", "0%"] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart className="h-4 w-4 fill-primary" />
        </motion.span>
      </div>
      <div className="text-center">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-secondary to-blush font-heading font-bold text-white">
          B
        </div>
        <p className="mt-1 text-sm">🤗</p>
      </div>
    </div>
  );
}
