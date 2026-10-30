import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SpaceContext, type SpaceContextValue } from "./space";
import { DEFAULT_COUPLE, DEFAULT_ME, DEFAULT_PARTNER } from "@/lib/seed";
import type { CoupleDoc, MemberDoc, Profile } from "@/lib/types";
import { useSyncedDoc } from "@/sync/hooks";

/** Joins "my" profile, "my partner's" profile and our shared details into one easy object. */
export function SpaceProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useSyncedDoc<MemberDoc>("member", "me", DEFAULT_ME);
  const [partner] = useSyncedDoc<MemberDoc>("member", "partner", DEFAULT_PARTNER);
  const [couple, setCouple] = useSyncedDoc<CoupleDoc>("couple", "doc", DEFAULT_COUPLE);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [thumbKissOpen, setThumbKissOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const profile = useMemo<Profile>(
    () => ({
      me: me.name || DEFAULT_ME.name,
      partner: partner.name || DEFAULT_PARTNER.name,
      myPhoto: me.photo || undefined,
      partnerPhoto: partner.photo || undefined,
      since: couple.since || DEFAULT_COUPLE.since,
      mood: me.mood,
      status: me.status,
      away: !!me.away,
      partnerMood: partner.mood,
      partnerStatus: partner.status,
      partnerAway: !!partner.away,
    }),
    [me, partner, couple],
  );

  const updateProfile = useCallback<SpaceContextValue["updateProfile"]>(
    (patch) => {
      const member: Partial<MemberDoc> = {};
      if (patch.me !== undefined) member.name = patch.me;
      if (patch.mood !== undefined) member.mood = patch.mood;
      if (patch.status !== undefined) member.status = patch.status;
      if (patch.away !== undefined) member.away = patch.away;
      if (patch.photo !== undefined) member.photo = patch.photo ?? undefined;
      if (Object.keys(member).length > 0) setMe((prev) => ({ ...DEFAULT_ME, ...prev, ...member }));
      if (patch.since) setCouple((prev) => ({ ...prev, since: patch.since as string }));
    },
    [setMe, setCouple],
  );

  const value = useMemo(
    () => ({ profile, updateProfile, logoutOpen, setLogoutOpen, thumbKissOpen, setThumbKissOpen, commandOpen, setCommandOpen }),
    [profile, updateProfile, logoutOpen, thumbKissOpen, commandOpen],
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}
