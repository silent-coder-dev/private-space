import { motion, type HTMLMotionProps } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  delay = 0,
  y = 24,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
      {...props}
    />
  );
}
