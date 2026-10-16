import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** A number whose digits roll like a slot machine when they change. */
export function SlotNumber({ value, pad = 2, className }: { value: number; pad?: number; className?: string }) {
  const digits = String(Math.max(0, value)).padStart(pad, "0").split("");
  return (
    <span className={cn("inline-flex overflow-hidden tabular-nums", className)} aria-label={String(value)}>
      {digits.map((digit, i) => (
        <span key={digits.length - i} aria-hidden className="relative inline-block w-[0.64em] text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={digit}
              className="inline-block"
              initial={{ y: "-90%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "90%", opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
