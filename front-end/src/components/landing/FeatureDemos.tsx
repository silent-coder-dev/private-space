import { motion } from "framer-motion";
import { Heart, Mic, PhoneOff, Video } from "lucide-react";
import { Equalizer } from "@/components/fx/Equalizer";
import { SlotNumber } from "@/components/fx/SlotNumber";
import { useNow } from "@/hooks/use-now";

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

/** A tiny call screen with a timer that keeps rolling. */
export function CallDemo() {
  const now = useNow(1000);
  const secs = Math.floor(now / 1000) % 600;
  return (
    <div className="relative overflow-hidden rounded-2xl p-3 ring-1 ring-white/10 gradient-soft">
      <div className="flex items-center gap-3">
        <div className="relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-secondary to-blush font-heading font-bold text-white">
          B
          <span className="absolute inset-0 animate-ripple rounded-full ring-2 ring-primary/50" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Video call</p>
          <p className="flex items-baseline text-xs tabular-nums text-muted-foreground">
            {Math.floor(secs / 60)}:<SlotNumber value={secs % 60} />
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {[Mic, Video].map((Icon, i) => (
          <span key={i} className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
            <Icon className="h-4 w-4" />
          </span>
        ))}
        <span className="grid h-8 w-8 place-items-center rounded-full bg-destructive">
          <PhoneOff className="h-4 w-4 text-white" />
        </span>
      </div>
    </div>
  );
}

/** Everything you shared disappears when the room is closed. */
export function CloseRoomDemo() {
  const items = ["💬", "🖼️", "🎨", "🎵"];
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {items.map((emoji, i) => (
          <motion.span
            key={emoji}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-base ring-1 ring-white/10"
            animate={{ scale: [1, 1, 0, 0, 1], opacity: [1, 1, 0, 0, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.35 + i * 0.05, 0.55 + i * 0.05, 0.85, 1] }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Close room → <span className="font-semibold text-foreground">all gone</span>
      </p>
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
        <p className="truncate text-sm font-semibold">Our song</p>
        <p className="truncate text-xs text-muted-foreground">Playing on both phones</p>
      </div>
      <Equalizer playing className="text-primary" />
    </div>
  );
}

/** Three shared photos and a heart that draws itself. */
export function GalleryCanvasDemo() {
  const tiles = ["from-[#ff7e5f] to-[#feb47b]", "from-[#8e2de2] to-[#4a00e0]", "from-[#11998e] to-[#38ef7d]"];
  return (
    <div className="flex items-center gap-3">
      {tiles.map((t, i) => (
        <motion.div
          key={t}
          initial={{ opacity: 0, y: 12, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: (i - 1) * 6 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.2, type: "spring", stiffness: 220, damping: 16 }}
          className={`h-14 w-12 rounded-lg bg-gradient-to-br shadow-lg ring-2 ring-white/20 ${t}`}
        />
      ))}
      <div className="ml-auto grid h-16 w-20 place-items-center rounded-xl bg-[#FFF8F0]">
        <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
          <motion.path
            d="M12 20s-7-4.4-8.8-8.6C1.9 8.3 3.7 5 7 5c2 0 3.3 1 5 3 1.7-2 3-3 5-3 3.3 0 5.1 3.3 3.8 6.4C19 15.6 12 20 12 20z"
            fill="none"
            stroke="#FF4D6D"
            strokeWidth={1.8}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, delay: 0.6, ease: "easeInOut" }}
          />
        </svg>
      </div>
    </div>
  );
}

/** A heart flying from one of you to the other. */
export function HeartDemo() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-center">
        <div className="grid h-11 w-11 place-items-center rounded-full gradient-primary font-heading font-bold text-white">A</div>
        <p className="mt-1 text-sm">🥺</p>
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
        <p className="mt-1 text-sm">🥰</p>
      </div>
    </div>
  );
}
