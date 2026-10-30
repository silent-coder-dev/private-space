import { createContext, useContext } from "react";
import type { Profile } from "@/lib/types";

export interface SpaceContextValue {
  /** Both people's details, combined from the shared room data. */
  profile: Profile;
  /**
   * Change your own details (name, mood, status, away, photo — null removes it)
   * or the shared "together since" date.
   */
  updateProfile: (patch: Partial<Pick<Profile, "me" | "mood" | "status" | "away" | "since">> & { photo?: string | null }) => void;
  /** The "Log out of this phone" dialog. */
  logoutOpen: boolean;
  setLogoutOpen: (open: boolean) => void;
  /** The thumb-kiss pad. */
  thumbKissOpen: boolean;
  setThumbKissOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

export const SpaceContext = createContext<SpaceContextValue | null>(null);

export function useSpace(): SpaceContextValue {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used inside <SpaceProvider>");
  return ctx;
}
