import { useCallback } from "react";
import { toast } from "sonner";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { fireFrom } from "@/lib/burst";
import { uid } from "@/lib/storage";

/**
 * "I'm missing you" 💖 — your partner gets hearts + a pop-up right away if they're online,
 * or a 💖 message waiting in the chat if they're not.
 */
export function useMissYou() {
  const { signal, presence, engine } = useRoom();
  const { profile } = useSpace();
  return useCallback(
    (from?: Element | null) => {
      fireFrom(from ?? null, { count: 22 });
      const live = presence.partnerOnline && signal("heart");
      if (!live && engine) {
        const id = uid();
        engine.put("messages", id, { id, sender: "me", text: "💖 I'm missing you", at: engine.now(), reactions: [] });
      }
      toast.success(live ? `${profile.partner} knows you're missing them 💖` : `${profile.partner} will see your 💖 as soon as they're back`);
    },
    [signal, presence.partnerOnline, engine, profile.partner],
  );
}
