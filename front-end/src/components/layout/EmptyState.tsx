import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** A friendly message shown when a list has nothing in it yet. */
export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center"
    >
      <motion.span
        className="text-5xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {emoji}
      </motion.span>
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="pt-2">{action}</div>}
    </motion.div>
  );
}
