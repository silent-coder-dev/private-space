import { motion } from "framer-motion";
import { Bell, CalendarHeart, Camera, Check, Copy, Eye, EyeOff, ImagePlus, KeyRound, Lock, LogOut, Share2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinPad } from "@/components/layout/AppLock";
import { ConnectionPill } from "@/components/layout/ConnectionPill";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";
import { avatarFromFile } from "@/lib/media";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { notificationsOn, notificationsSupported, turnOffNotifications, turnOnNotifications } from "@/lib/notify";
import { checkPin, makeLock, useAppLock, useLockSettings } from "@/lib/pin";
import { daysBetween, formatDate, nextAnniversary, parseLocalDate, toDateInput, yearsTogether } from "@/lib/time";

/** You, your partner and your room: photo, name, your date, the secret code, privacy and logging out. */
const Profile = () => {
  const { profile, updateProfile, setLogoutOpen } = useSpace();
  const { presence, session } = useRoom();
  const today = new Date();
  const days = Math.max(0, daysBetween(parseLocalDate(profile.since), today));
  const years = yearsTogether(profile.since, today);
  const toAnniversary = daysBetween(today, nextAnniversary(profile.since, today));
  const partnerHere = presence.members >= 2 || !!session?.partnerJoined;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Who you are */}
      <motion.section variants={staggerItem} className="glass-card relative overflow-hidden">
        <div className="h-24 gradient-primary opacity-80 sm:h-32" />
        <div className="relative flex flex-col items-center gap-4 px-5 pb-6 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
          <div className="-mt-14 shrink-0 sm:-mt-16">
            <PhotoPicker />
          </div>
          <div className="min-w-0 flex-1 space-y-1 sm:pt-4">
            <h1 className="truncate font-heading text-2xl font-bold sm:text-3xl">{profile.me}</h1>
            <p className="text-sm text-muted-foreground">
              Together with <span className="font-semibold text-foreground">{profile.partner}</span> since {formatDate(profile.since, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/40 px-3 py-2 sm:mt-4">
            <UserAvatar who="partner" size="md" online={partnerHere ? presence.partnerOnline : undefined} />
            <div className="text-left">
              <p className="text-sm font-semibold">{profile.partner}</p>
              <p className="text-xs text-muted-foreground">{partnerHere ? (presence.partnerOnline ? "Online now" : "Away") : "Not joined yet"}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/5 text-center">
          <Stat value={days.toLocaleString()} label="days together" />
          <Stat value={String(years)} label={years === 1 ? "year" : "years"} />
          <Stat value={toAnniversary === 0 ? "🎉" : String(toAnniversary)} label={toAnniversary === 0 ? "anniversary today" : "days to anniversary"} />
        </div>
      </motion.section>

      <div className="grid gap-5 lg:grid-cols-2">
        <motion.div variants={staggerItem}>
          <DetailsCard />
        </motion.div>
        <motion.div variants={staggerItem}>
          <RoomCard />
        </motion.div>
        <motion.div variants={staggerItem}>
          <SecurityCard />
        </motion.div>
        <motion.div variants={staggerItem}>
          <NotificationsCard />
        </motion.div>
      </div>

      {/* Leaving */}
      <motion.section variants={staggerItem} className="glass-card space-y-4 p-5">
        <CardTitle icon={UserRound} title="Your account on this phone" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-semibold">Log out</p>
            <p className="text-xs text-muted-foreground">Removes UsSpace from this phone only. {profile.partner} keeps everything, and you can come back with your secret code.</p>
            <Button variant="glass" className="w-full" onClick={() => setLogoutOpen(true)}>
              <LogOut /> Log out of this phone
            </Button>
          </div>
          <CloseRoom />
        </div>
      </motion.section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        🔒 Your photo, name and date are shared only with {profile.partner}, end-to-end encrypted, and kept on your two phones — never in a database. Closing the room deletes them.
      </p>
    </motion.div>
  );

};

/** Your profile photo: add, change or remove. */
function PhotoPicker() {
  const { profile, updateProfile } = useSpace();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      updateProfile({ photo: await avatarFromFile(file) });
      toast.success(`New photo — ${profile.partner} sees it too 📸`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      setBusy(false);
    }
  };
  const choose = () => input.current?.click();
  const cameraButton = (
    <button
      type="button"
      onClick={profile.myPhoto ? undefined : choose}
      disabled={busy}
      aria-label={profile.myPhoto ? "Change or remove your photo" : "Add a profile photo"}
      className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full gradient-primary text-white shadow-lg ring-4 ring-background transition active:scale-90"
    >
      <Camera className="h-4 w-4" />
    </button>
  );
  return (
    <div className="relative">
      <UserAvatar who="me" size="2xl" className="[&>*]:ring-4" />
      {profile.myPhoto ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{cameraButton}</DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-48 rounded-2xl border-white/10 bg-popover/95 p-1.5 backdrop-blur-xl">
            <DropdownMenuItem onSelect={choose} className="gap-2 rounded-lg py-2">
              <ImagePlus className="h-4 w-4" /> Choose a new photo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => updateProfile({ photo: null })} className="gap-2 rounded-lg py-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Remove photo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        cameraButton
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4">
      <p className="font-heading text-xl font-bold text-gradient sm:text-2xl">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CardTitle({ icon: Icon, title, extra }: { icon: typeof Lock; title: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-heading font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-xl gradient-soft ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        {title}
      </h2>
      {extra}
    </div>
  );
}

/** Your name and the date you got together (shared). */
function DetailsCard() {
  const { profile, updateProfile } = useSpace();
  const [me, setMe] = useState(profile.me);
  const [since, setSince] = useState(profile.since);
  const today = toDateInput(new Date());
  const errors = {
    me: !me.trim() ? "Please add your name." : "",
    since: !since ? "Pick a date." : since > today ? "This date is in the future." : "",
  };
  const changed = me.trim() !== profile.me || since !== profile.since;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.me || errors.since || !changed) return;
    updateProfile({ me: me.trim(), since });
    toast.success(`Saved — ${profile.partner} sees it too 💾`);
  };

  return (
    <form onSubmit={save} className="glass-card h-full space-y-4 p-5">
      <CardTitle icon={CalendarHeart} title="Your details" />
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Your name</Label>
        <Input id="profile-name" value={me} maxLength={24} onChange={(e) => setMe(e.target.value)} aria-invalid={!!errors.me} autoComplete="nickname" />
        {errors.me && <p className="text-xs text-destructive">{errors.me}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-since">Together since</Label>
        <Input id="profile-since" type="date" value={since} max={today} onChange={(e) => setSince(e.target.value)} aria-invalid={!!errors.since} />
        <p className="text-xs text-muted-foreground">{errors.since || `Shared with ${profile.partner}: your days-together counter and anniversary use it.`}</p>
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={!changed || !!errors.me || !!errors.since}>
        {changed ? "Save changes" : <><Check /> Saved</>}
      </Button>
    </form>
  );
}

/** The secret code and who is in the room. */
function RoomCard() {
  const { profile } = useSpace();
  const { session, presence } = useRoom();
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = session?.code ?? "";
  const full = Math.max(presence.members, session?.partnerJoined ? 2 : 1) >= 2;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the code.");
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: "Join me on UsSpace 💞", text: `Our secret code: ${code}`, url: `${location.origin}/start#join=${code}` });
    } catch {
      /* closed the share sheet */
    }
  };

  return (
    <section className="glass-card h-full space-y-4 p-5">
      <CardTitle icon={ShieldCheck} title="Your private room" extra={<ConnectionPill compact />} />
      <div>
        <p className="text-xs text-muted-foreground">Secret code</p>
        <div className="mt-1 flex items-center gap-1.5">
          <code className="flex-1 select-all break-all rounded-xl bg-background/60 px-3 py-2.5 font-mono text-sm tracking-widest">{reveal ? code : code.replace(/[0-9A-Z]/g, "•")}</code>
          <Button type="button" variant="ghost" size="icon" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Hide code" : "Show code"}>
            {reveal ? <EyeOff /> : <Eye />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => void copy()} aria-label="Copy code">
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {full ? "🔒 Both seats are taken — the room is locked to your two phones." : `⏳ One seat is free. Send the code to ${profile.partner} only.`}
      </p>
      {!full && typeof navigator !== "undefined" && "share" in navigator && (
        <Button variant="glass" className="w-full" onClick={() => void share()}>
          <Share2 /> Share the code
        </Button>
      )}
      <p className="text-xs text-muted-foreground">Everything is encrypted on your phone with this code. The server only passes along locked boxes it can't open.</p>
    </section>
  );
}

type PinFlow = null | "set" | "change" | "off";

/** The PIN lock: set, change or turn off (changing or turning off asks for the current PIN). */
function SecurityCard() {
  const [lock, setLock] = useLockSettings();
  const { lockNow } = useAppLock();
  const [flow, setFlow] = useState<PinFlow>(null);
  const [step, setStep] = useState<"current" | "new" | "confirm">("new");
  const [first, setFirst] = useState("");
  const [error, setError] = useState(0);
  const [hint, setHint] = useState("");

  const open = (f: Exclude<PinFlow, null>) => {
    setFlow(f);
    setStep(f === "set" ? "new" : "current");
    setFirst("");
    setHint("");
  };

  const onPin = async (pin: string) => {
    if (step === "current") {
      if (!lock || !(await checkPin(pin, lock))) {
        setHint("That PIN isn't right.");
        return setError((e) => e + 1);
      }
      if (flow === "off") {
        setLock(null);
        setFlow(null);
        return toast("PIN lock is off");
      }
      setHint("");
      return setStep("new");
    }
    if (step === "new") {
      setFirst(pin);
      setHint("");
      return setStep("confirm");
    }
    if (pin !== first) {
      setHint("The PINs didn't match. Start again.");
      setFirst("");
      setStep("new");
      return setError((e) => e + 1);
    }
    setLock(await makeLock(pin));
    setFlow(null);
    toast.success("PIN lock is on 🔒", { description: "UsSpace locks the moment you leave it." });
  };

  const title = step === "current" ? "Enter your current PIN" : step === "new" ? "Choose a 4–8 digit PIN" : "Enter it again";

  return (
    <section className="glass-card h-full space-y-4 p-5">
      <CardTitle icon={Lock} title="PIN lock" extra={lock ? <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">On</span> : undefined} />
      <p className="text-sm text-muted-foreground">
        {lock
          ? "UsSpace locks instantly when you switch tabs, minimise the app or lock your phone, and when it opens."
          : "Add a PIN so nobody else can open UsSpace on this phone. It locks the moment you leave."}
      </p>
      {lock ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="gradient" onClick={lockNow}>
            <Lock /> Lock now
          </Button>
          <Button variant="glass" onClick={() => open("change")}>
            <KeyRound /> Change
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => open("off")}>
            Turn off
          </Button>
        </div>
      ) : (
        <Button variant="gradient" className="w-full" onClick={() => open("set")}>
          <Lock /> Set a PIN
        </Button>
      )}

      <Dialog open={flow !== null} onOpenChange={(o) => !o && setFlow(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-popover/95">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="font-heading">{title}</DialogTitle>
            <DialogDescription aria-live="polite">{hint || "Only a scrambled version of your PIN is saved, on this phone."}</DialogDescription>
          </DialogHeader>
          {flow && <PinPad key={`${flow}-${step}`} length={step === "current" ? lock?.length : step === "confirm" ? first.length : undefined} onComplete={(pin) => void onPin(pin)} error={error} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Phone notifications for calls, messages and hearts while UsSpace is in the background. */
function NotificationsCard() {
  const [on, setOn] = useState(notificationsOn);
  const supported = notificationsSupported();
  const blocked = supported && Notification.permission === "denied";
  const isIphone = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent);

  const enable = async () => {
    const result = await turnOnNotifications();
    setOn(result === "granted");
    if (result === "granted") toast.success("Notifications are on 🔔");
    else if (result === "denied") toast.error("Notifications are blocked", { description: "Allow them for this site in your browser settings." });
  };
  const disable = () => {
    turnOffNotifications();
    setOn(false);
  };

  return (
    <section className="glass-card h-full space-y-4 p-5">
      <CardTitle icon={Bell} title="Notifications" extra={on ? <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">On</span> : undefined} />
      <p className="text-sm text-muted-foreground">
        {!supported
          ? isIphone
            ? "On iPhone: tap Share → Add to Home Screen, open UsSpace from there, then turn this on."
            : "This browser can't show notifications."
          : blocked
            ? "Notifications are blocked in your browser settings for this site."
            : "Calls, messages and hearts reach you even when UsSpace is in the background. They never show what a message says."}
      </p>
      {supported &&
        (on ? (
          <Button variant="ghost" className="w-full" onClick={disable}>
            Turn off
          </Button>
        ) : (
          <Button variant="gradient" className="w-full" disabled={blocked} onClick={() => void enable()}>
            <Bell /> Turn on
          </Button>
        ))}
    </section>
  );
}

function CloseRoom() {
  const { profile } = useSpace();
  const { closeRoom } = useRoom();
  return (
    <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-4">
      <p className="font-semibold text-destructive">Close room</p>
      <p className="text-xs text-muted-foreground">Deletes every message, photo, video and drawing — for both of you — and the code stops working.</p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="w-full bg-destructive/90 hover:bg-destructive">
            <Trash2 /> Close room & delete everything
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close the room for both of you?</AlertDialogTitle>
            <AlertDialogDescription>
              Every message, photo, video, drawing and game is deleted from the server, from your phone and from {profile.partner}'s phone. The secret code stops working.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep our room</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (closeRoom()) toast.loading("Closing the room and deleting everything…");
                else toast.error("You're offline", { description: "Connect to the internet to close the room — the server must delete it for both of you." });
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Close & delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Profile;
