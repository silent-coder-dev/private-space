import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { motion } from "framer-motion";
import { Lock, LogOut } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoom } from "@/context/room";
import { readStore, usePersistentState } from "@/lib/storage";
import { randomId } from "@/sync/crypto";

export interface LockSettings {
  salt: string;
  hash: string;
}

const KEY = "app-lock";
const LOCK_AFTER_MS = 30_000;
const ITERATIONS = 150_000;

export const hashPin = async (pin: string, salt: string) => bytesToHex(await pbkdf2Async(sha256, pin, hexToBytes(salt), { c: ITERATIONS, dkLen: 32 }));
export const makeLock = async (pin: string): Promise<LockSettings> => {
  const salt = randomId(16);
  return { salt, hash: await hashPin(pin, salt) };
};

export function useLockSettings() {
  return usePersistentState<LockSettings | null>(KEY, null);
}

/**
 * Optional PIN lock for this phone: asked when the app opens and after 30 s in the background.
 * Also blurs the whole app while it's in the background (app switcher, screen share).
 */
export function AppLock({ children }: { children: ReactNode }) {
  const [settings] = useLockSettings();
  const [locked, setLocked] = useState(() => !!readStore<LockSettings | null>(KEY, null));
  const hiddenAt = useRef(0);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      document.documentElement.classList.toggle("privacy-blur", hidden);
      if (hidden) hiddenAt.current = Date.now();
      else if (settings && Date.now() - hiddenAt.current > LOCK_AFTER_MS) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [settings]);

  if (settings && locked) return <LockScreen settings={settings} onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

function LockScreen({ settings, onUnlock }: { settings: LockSettings; onUnlock: () => void }) {
  const { leaveRoom } = useRoom();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [shake, setShake] = useState(0);
  const waiting = waitUntil > Date.now();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || waiting || pin.length < 4) return;
    setBusy(true);
    const ok = (await hashPin(pin, settings.salt)) === settings.hash;
    setBusy(false);
    if (ok) return onUnlock();
    const n = fails + 1;
    setFails(n);
    setPin("");
    setShake((s) => s + 1);
    if (n % 5 === 0) {
      setWaitUntil(Date.now() + 30_000);
      setTimeout(() => setWaitUntil(0), 30_000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-background px-6">
      <div className="absolute inset-0 gradient-soft opacity-60" />
      <motion.form
        key={shake}
        onSubmit={submit}
        animate={shake ? { x: [0, -14, 14, -8, 8, 0] } : { opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 0.95 }}
        className="glass-card relative w-full max-w-xs space-y-5 p-7 text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-primary glow-primary">
          <Lock className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="font-heading text-xl font-bold">UsSpace is locked</p>
          <p className="text-sm text-muted-foreground">{waiting ? "Too many tries. Wait 30 seconds." : "Enter your PIN"}</p>
        </div>
        <Input
          autoFocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          aria-label="PIN"
          className="h-12 text-center text-2xl tracking-[0.5em]"
          disabled={waiting}
        />
        <Button type="submit" variant="gradient" className="w-full" disabled={busy || waiting || pin.length < 4}>
          Unlock
        </Button>
        <button type="button" onClick={leaveRoom} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
          <LogOut className="h-3 w-3" /> Forgot PIN? Leave the room on this phone
        </button>
      </motion.form>
    </div>
  );
}
