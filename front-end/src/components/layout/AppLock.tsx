import { AnimatePresence, motion } from "framer-motion";
import { Delete, Lock, LogOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { AppLockContext, checkPin, LOCK_KEY, MAX_TRIES, readFails, useLockSettings, WAIT_MS, writeFails, type LockSettings } from "@/lib/pin";
import { readStore } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Optional PIN lock for this phone.
 * • Locks when the app opens, and the INSTANT you switch tabs, minimise the browser or lock the phone.
 * • The app keeps running underneath (calls and music don't stop) but can't be seen or touched.
 * • Opening a photo picker or the camera from inside the app doesn't count as leaving.
 * Without a PIN, the app still blurs itself in the app switcher.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const [settings] = useLockSettings();
  const [locked, setLocked] = useState(() => !!readStore<LockSettings | null>(LOCK_KEY, null));
  const content = useRef<HTMLDivElement>(null);
  /** Until when leaving the page is expected (a file picker / camera the app opened itself). */
  const pickerUntil = useRef(0);
  const isLocked = !!settings && locked;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.type === "file") pickerUntil.current = Date.now() + 120_000;
    };
    const done = () => {
      pickerUntil.current = 0;
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("focus", done);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("focus", done);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      document.documentElement.classList.toggle("privacy-blur", hidden);
      if (!hidden || !settings) return;
      if (Date.now() < pickerUntil.current) return;
      // Commit right away, so the app switcher's snapshot already shows the lock screen.
      flushSync(() => setLocked(true));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [settings]);

  // Behind the lock nothing can be focused, read by screen readers, or shown as a pop-up.
  useEffect(() => {
    content.current?.toggleAttribute("inert", isLocked);
    document.documentElement.classList.toggle("app-locked", isLocked);
  }, [isLocked]);

  const lockNow = useCallback(() => {
    if (settings) setLocked(true);
  }, [settings]);
  const api = useMemo(() => ({ enabled: !!settings, lockNow }), [settings, lockNow]);

  return (
    <AppLockContext.Provider value={api}>
      <div ref={content} className="contents" aria-hidden={isLocked || undefined}>
        {children}
      </div>
      <AnimatePresence>{isLocked && settings && <LockScreen key="lock" settings={settings} onUnlock={() => setLocked(false)} />}</AnimatePresence>
    </AppLockContext.Provider>
  );
}

/** A phone-style number pad with dots. Unlocks as soon as the last digit is typed (when the length is known). */
export function PinPad({
  length,
  onComplete,
  disabled,
  error,
}: {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  /** Change this number to shake the dots and clear them (wrong PIN). */
  error?: number;
}) {
  const [pin, setPinState] = useState("");
  const pinRef = useRef("");
  const max = length ?? 8;
  const setPin = useCallback((next: string) => {
    pinRef.current = next;
    setPinState(next);
  }, []);

  useEffect(() => setPin(""), [error, setPin]);

  const press = useCallback(
    (digit: string) => {
      const current = pinRef.current;
      if (disabled || current.length >= max) return;
      const next = current + digit;
      setPin(next);
      // A short pause so the last dot is seen filling in.
      if (length && next.length === length) setTimeout(() => onComplete(next), 80);
    },
    [disabled, max, length, onComplete, setPin],
  );
  const back = useCallback(() => setPin(pinRef.current.slice(0, -1)), [setPin]);
  const submit = useCallback(() => {
    if (!disabled && pin.length >= 4) onComplete(pin);
  }, [disabled, pin, onComplete]);

  // Typing on a keyboard works too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter" && !length) submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back, submit, length]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="space-y-6">
      <motion.div
        key={error}
        animate={error ? { x: [0, -12, 12, -8, 8, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="flex h-4 items-center justify-center gap-3"
        role="status"
        aria-label={`${pin.length} digits entered`}
      >
        {Array.from({ length: Math.max(length ?? 4, pin.length) }, (_, i) => (
          <span key={i} className={cn("h-3.5 w-3.5 rounded-full transition-all duration-150", i < pin.length ? "scale-110 gradient-primary" : "bg-white/15")} />
        ))}
      </motion.div>
      <div className="mx-auto grid w-fit grid-cols-3 gap-3">
        {keys.map((k) => (
          <PadKey key={k} label={k} onClick={() => press(k)} disabled={disabled} />
        ))}
        {length ? <span /> : <PadKey label="OK" onClick={submit} disabled={disabled || pin.length < 4} small />}
        <PadKey label="0" onClick={() => press("0")} disabled={disabled} />
        <button type="button" onClick={back} aria-label="Delete last digit" className="grid h-16 w-16 place-items-center rounded-full text-muted-foreground hover:text-foreground">
          <Delete className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

function PadKey({ label, onClick, disabled, small }: { label: string; onClick: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.06] font-heading font-semibold backdrop-blur transition active:scale-90 active:bg-primary/30 disabled:opacity-40",
        small ? "text-sm" : "text-2xl",
      )}
    >
      {label}
    </button>
  );
}

function LockScreen({ settings, onUnlock }: { settings: LockSettings; onUnlock: () => void }) {
  const { leaveRoom } = useRoom();
  const { profile } = useSpace();
  const [error, setError] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(readFails);
  const [now, setNow] = useState(Date.now);
  const [forgot, setForgot] = useState(false);
  const waiting = fails.until > now;

  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waiting]);

  const tryPin = async (pin: string) => {
    if (busy || waiting) return;
    setBusy(true);
    const ok = await checkPin(pin, settings);
    setBusy(false);
    if (ok) {
      writeFails({ count: 0, until: 0 });
      return onUnlock();
    }
    const count = fails.count + 1;
    const next = { count, until: count % MAX_TRIES === 0 ? Date.now() + WAIT_MS : 0 };
    writeFails(next);
    setFails(next);
    setNow(Date.now());
    setError((e) => e + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-background px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="UsSpace is locked"
    >
      <div className="pointer-events-none absolute inset-0 gradient-soft opacity-50" />
      <div className="relative w-full max-w-xs space-y-7 text-center">
        <div className="space-y-3">
          <div className="relative mx-auto w-fit">
            <UserAvatar who="me" size="xl" />
            <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full gradient-primary ring-4 ring-background">
              <Lock className="h-4 w-4 text-white" />
            </span>
          </div>
          <p className="font-heading text-xl font-bold">Hi {profile.me}, UsSpace is locked</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {waiting
              ? `Too many tries. Try again in ${Math.ceil((fails.until - now) / 1000)} s.`
              : fails.count > 0
                ? "That PIN isn't right. Try again."
                : "Enter your PIN"}
          </p>
        </div>

        <PinPad length={settings.length} onComplete={(pin) => void tryPin(pin)} disabled={busy || waiting} error={error} />

        {forgot ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-muted-foreground">
            <p>Forgot your PIN? Log out of this phone: its copy is deleted, and you can join again with your secret code.</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => setForgot(false)} className="rounded-lg px-3 py-1.5 hover:text-foreground">
                Cancel
              </button>
              <button type="button" onClick={leaveRoom} className="rounded-lg bg-destructive/90 px-3 py-1.5 font-semibold text-white">
                Log out
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setForgot(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="h-3 w-3" /> Forgot PIN?
          </button>
        )}
      </div>
    </motion.div>
  );
}
