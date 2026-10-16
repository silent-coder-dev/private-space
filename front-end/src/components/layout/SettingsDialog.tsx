import { Check, Copy, Eye, EyeOff, Lock, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { makeLock, useLockSettings } from "@/components/layout/AppLock";
import { ConnectionPill } from "@/components/layout/ConnectionPill";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { toDateInput } from "@/lib/time";

/** Your name, the shared "together since" date, the room code and leaving the room. */
export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen } = useSpace();
  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="glass-card max-h-[92svh] max-w-md overflow-y-auto border-white/10 bg-popover/90">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Profile & room</DialogTitle>
          <DialogDescription>Your details are shared only with your partner, end-to-end encrypted.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form always starts from the latest values. */}
        <SettingsForm onDone={() => setSettingsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ onDone }: { onDone: () => void }) {
  const { profile, updateProfile } = useSpace();
  const { session, presence, leaveRoom, closeRoom } = useRoom();
  const [me, setMe] = useState(profile.me);
  const [since, setSince] = useState(profile.since);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const today = toDateInput(new Date());
  const code = session?.code ?? "";
  const members = Math.max(presence.members, session?.partnerJoined ? 2 : 1);

  const errors = {
    me: !me.trim() ? "Please add your name." : "",
    since: !since ? "Pick a date." : since > today ? "This date is in the future." : "",
  };
  const valid = !errors.me && !errors.since;
  const changed = me.trim() !== profile.me || since !== profile.since;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    updateProfile({ me: me.trim(), since });
    toast.success("Saved — your partner sees it too 💾");
    onDone();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the code.");
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center justify-center gap-3 py-1">
        <InitialAvatar name={me || "?"} size="lg" />
        <span className="animate-heartbeat text-2xl">💞</span>
        <InitialAvatar name={profile.partner} size="lg" variant="secondary" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="me">Your name</Label>
          <Input id="me" value={me} maxLength={24} onChange={(e) => setMe(e.target.value)} aria-invalid={!!errors.me} />
          {errors.me && <p className="text-xs text-destructive">{errors.me}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Your partner</Label>
          <p className="flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-muted-foreground">
            {profile.partner}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="since">Together since (shared)</Label>
        <Input id="since" type="date" value={since} max={today} onChange={(e) => setSince(e.target.value)} />
        {errors.since && <p className="text-xs text-destructive">{errors.since}</p>}
      </div>

      <Button type="submit" variant="gradient" className="w-full" disabled={!valid || !changed}>
        Save changes
      </Button>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-heading text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-success" /> Your private room
          </p>
          <ConnectionPill compact />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Secret code</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-lg bg-background/60 px-3 py-2 font-mono text-sm tracking-widest">
              {reveal ? code : code.replace(/[0-9A-Z]/g, "•")}
            </code>
            <Button type="button" variant="ghost" size="icon" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Hide code" : "Show code"}>
              {reveal ? <EyeOff /> : <Eye />}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={copy} aria-label="Copy code">
              {copied ? <Check className="text-success" /> : <Copy />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {members >= 2
            ? "🔒 Both seats are taken. The room is locked to your two devices."
            : "⏳ One seat is free. Share the code only with your partner."}
        </p>
        <p className="text-xs text-muted-foreground">
          Everything is encrypted on your phone with this code. The server only passes along locked boxes it can't open.
        </p>
      </div>

      <PinLockSettings />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" className="w-full bg-destructive/90 hover:bg-destructive">
            <Trash2 /> Close room & delete everything
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close the room for both of you?</AlertDialogTitle>
            <AlertDialogDescription>
              Every message, photo, video, drawing and game is deleted from the server, from your phone and from {profile.partner}'s phone. The
              secret code stops working. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep our room</AlertDialogCancel>
            <AlertDialogAction onClick={closeRoom} className="bg-destructive hover:bg-destructive/90">
              Close & delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
            <LogOut /> Leave this room on this device only
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this room?</AlertDialogTitle>
            <AlertDialogDescription>
              This device leaves the room and deletes its copy of your messages, photos and drawings. Your partner keeps theirs.
              Your seat becomes free, so you can join again with the secret code — make sure you have it saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={leaveRoom} className="bg-destructive hover:bg-destructive/90">
              Leave room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

/** Optional PIN lock for this phone. */
function PinLockSettings() {
  const [lock, setLock] = useLockSettings();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = /^\d{4,8}$/.test(pin);

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setLock(await makeLock(pin));
    setBusy(false);
    setPin("");
    toast.success("PIN lock is on 🔒");
  };

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold">
        <Lock className="h-4 w-4 text-primary" /> PIN lock on this phone
      </p>
      {lock ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">On. UsSpace asks for your PIN when it opens and after 30 s away.</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setLock(null)}>
            Turn off
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="New 4–8 digit PIN"
            value={pin}
            maxLength={8}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            aria-label="New PIN"
          />
          <Button type="button" variant="gradient" disabled={!valid || busy} onClick={() => void save()}>
            Set
          </Button>
        </div>
      )}
    </div>
  );
}
