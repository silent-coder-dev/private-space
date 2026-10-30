import { motion } from "framer-motion";
import { StickyNote, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpace } from "@/context/space";
import { useNow } from "@/hooks/use-now";
import { NO_NOTE } from "@/lib/seed";
import { relativeTime } from "@/lib/time";
import type { NoteDoc } from "@/lib/types";
import { useEngine, useSyncedDoc } from "@/sync/hooks";

/** A little note you leave on your partner's Home screen — and the one they left for you. */
export function NoteCard() {
  const { profile } = useSpace();
  const engine = useEngine();
  const [mine, setMine] = useSyncedDoc<NoteDoc | null>("note", "me", NO_NOTE);
  const [theirs] = useSyncedDoc<NoteDoc | null>("note", "partner", NO_NOTE);
  const [draft, setDraft] = useState("");
  const now = useNow(60_000);

  const leave = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMine({ text, at: engine.now() });
    setDraft("");
    toast.success(`Note left on ${profile.partner}'s Home 📝`);
  };

  return (
    <section className="glass-card flex h-full flex-col gap-3 p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        <StickyNote className="h-4 w-4" /> Notes for each other
      </p>

      <motion.div
        initial={{ rotate: -1.5 }}
        animate={{ rotate: theirs ? [-1.5, 1, -1.5] : -1.5 }}
        transition={{ duration: 6, repeat: theirs ? Infinity : 0 }}
        className="rounded-2xl bg-gradient-to-br from-gold/90 to-blush/90 p-4 text-background shadow-xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">From {profile.partner}</p>
        <p className={theirs ? "font-script text-2xl leading-snug" : "text-sm opacity-70"}>{theirs ? theirs.text : `No note from ${profile.partner} yet.`}</p>
        {theirs && <p className="mt-1 text-[11px] opacity-70">{relativeTime(theirs.at, now)}</p>}
      </motion.div>

      {mine && (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">
            Your note: <span className="text-foreground">{mine.text}</span>
          </span>
          <button type="button" onClick={() => setMine(null)} aria-label="Remove my note" className="hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={leave} className="mt-auto flex gap-2">
        <Input value={draft} maxLength={120} onChange={(e) => setDraft(e.target.value)} placeholder={`Leave a note for ${profile.partner}…`} aria-label={`Leave a note for ${profile.partner}`} />
        <Button type="submit" variant="gradient" disabled={!draft.trim()}>
          Leave
        </Button>
      </form>
    </section>
  );
}
