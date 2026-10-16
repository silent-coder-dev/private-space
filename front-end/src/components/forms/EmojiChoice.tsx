import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";

/** A row of emoji buttons where one can be picked. */
export function EmojiChoice({
  options,
  value,
  onChange,
  id,
}: {
  options: readonly string[];
  value: string;
  onChange: (emoji: string) => void;
  id: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((emoji) => {
        const active = emoji === value;
        return (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={emoji}
            onClick={() => onChange(emoji)}
            className="relative grid h-10 w-10 place-items-center rounded-xl text-xl transition-transform hover:scale-110"
          >
            {active && (
              <motion.span
                layoutId={`emoji-choice-${id}`}
                transition={SPRING}
                className="absolute inset-0 rounded-xl bg-primary/20 ring-1 ring-primary/60"
              />
            )}
            <span className="relative">{emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
