import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Heart,
  KeyRound,
  Loader2,
  Lock,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import FloatingParticles from "@/components/fx/FloatingParticles";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { useRoom } from "@/context/room";
import { fireHearts } from "@/lib/burst";
import { EASE_OUT } from "@/lib/motion";
import { DEFAULT_PARTNER } from "@/lib/seed";
import { toDateInput } from "@/lib/time";
import type { MemberDoc } from "@/lib/types";
import { CODE_LENGTH, formatCode, isValidCode, normalizeCode } from "@/sync/crypto";
import { useSyncedDoc } from "@/sync/hooks";

type Step = "choose" | "create" | "join";

const inviteLink = (code: string) => `${window.location.origin}/start#join=${normalizeCode(code)}`;

/** Read a code shared as a link (…/start#join=CODE), then remove it from the address bar. */
function codeFromLink(): string {
  const match = /join=([0-9A-Za-z-]+)/.exec(window.location.hash);
  if (!match) return "";
  window.history.replaceState(null, "", window.location.pathname);
  return formatCode(match[1]);
}

const Start = () => {
  const { session } = useRoom();
  const [linkCode] = useState(codeFromLink);
  const [step, setStep] = useState<Step>(linkCode ? "join" : "choose");
  const showShare = !!session && session.role === "creator" && (!session.partnerJoined || step === "create");

  return (
    <div className="relative min-h-svh overflow-x-clip bg-background">
      <AuroraBackground />
      <FloatingParticles count={16} />

      <header className="relative z-10 mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Back to the welcome page">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary glow-primary">
            <Heart className="h-5 w-5 animate-heartbeat fill-white text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-gradient">UsSpace</span>
        </Link>
        <span className="glass hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> End-to-end encrypted
        </span>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col items-center justify-center px-4 pb-16 sm:px-6">
        <AnimatePresence mode="wait">
          {showShare ? (
            <Panel key="share">
              <ShareCode />
            </Panel>
          ) : session ? (
            <Panel key="inside">
              <AlreadyInside />
            </Panel>
          ) : step === "choose" ? (
            <Panel key="choose">
              <Choose onPick={setStep} />
            </Panel>
          ) : step === "create" ? (
            <Panel key="create">
              <CreateForm onBack={() => setStep("choose")} />
            </Panel>
          ) : (
            <Panel key="join">
              <JoinForm initialCode={linkCode} onBack={() => setStep("choose")} />
            </Panel>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

function Choose({ onPick }: { onPick: (step: Step) => void }) {
  const options = [
    {
      step: "create" as const,
      icon: Sparkles,
      title: "Create a room",
      text: "Start a new private space. You'll get a secret code to send to your partner.",
      cta: "Create",
    },
    {
      step: "join" as const,
      icon: KeyRound,
      title: "Join a room",
      text: "Your partner already made one? Enter the secret code they gave you.",
      cta: "Join",
    },
  ];
  return (
    <div className="space-y-10 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Your private room <span className="text-gradient-animated">for two</span>
        </h1>
        <p className="mx-auto max-w-lg text-muted-foreground">
          Only the two of you can get in. Everything you share is locked with your secret code before it leaves your phone.
        </p>
      </div>
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {options.map((o, i) => (
          <motion.button
            key={o.step}
            type="button"
            onClick={() => onPick(o.step)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="text-left"
          >
            <SpotlightCard tilt className="group flex h-full flex-col gap-4 p-6 sm:p-7">
              <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-lg shadow-primary/30 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <o.icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold">{o.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{o.text}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {o.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </SpotlightCard>
          </motion.button>
        ))}
      </div>
      <SecurityStrip />
    </div>
  );
}

function SecurityStrip() {
  const items = [
    { icon: Lock, text: "End-to-end encrypted" },
    { icon: Users, text: "Locked to 2 devices" },
    { icon: ShieldCheck, text: "The server can't read anything" },
  ];
  return (
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-1.5">
          <item.icon className="h-4 w-4 text-success" /> {item.text}
        </li>
      ))}
    </ul>
  );
}

function FormShell({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="glass-card mx-auto w-full max-w-md space-y-6 p-6 sm:p-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function CreateForm({ onBack }: { onBack: () => void }) {
  const { createRoom } = useRoom();
  const today = toDateInput(new Date());
  const [name, setName] = useState("");
  const [since, setSince] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = name.trim().length > 0 && !!since && since <= today;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await createRoom(name.trim(), since);
      fireHearts({ count: 24 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the room.");
      setBusy(false);
    }
  };

  return (
    <FormShell title="Create your room" subtitle="We'll make a secret code just for the two of you." onBack={onBack}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="create-name">Your name</Label>
          <Input id="create-name" autoFocus maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-since">Together since</Label>
          <Input id="create-since" type="date" max={today} value={since} onChange={(e) => setSince(e.target.value)} />
          <p className="text-xs text-muted-foreground">Used for your days-together counter and anniversary countdown.</p>
        </div>
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" variant="gradient" size="lg" className="shine w-full" disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy ? "Creating a secure room…" : "Create our room"}
        </Button>
      </form>
    </FormShell>
  );
}

function JoinForm({ initialCode, onBack }: { initialCode: string; onBack: () => void }) {
  const { joinRoom } = useRoom();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const codeOk = isValidCode(code);
  const valid = codeOk && name.trim().length > 0;

  const onCode = (value: string) => setCode(formatCode(value.slice(0, CODE_LENGTH + 6)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await joinRoom(code, name.trim());
      fireHearts({ count: 30 });
      toast.success("You're in! 💞 Say hello to your partner.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the room.");
      setBusy(false);
    }
  };

  return (
    <FormShell title="Join your partner" subtitle="Type the secret code they shared with you." onBack={onBack}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="join-code">Secret code</Label>
          <Input
            id="join-code"
            autoFocus={!initialCode}
            value={code}
            onChange={(e) => onCode(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            className="h-12 text-center font-mono text-lg tracking-[0.2em]"
            aria-invalid={code.length > 0 && !codeOk}
          />
          <p className="text-xs text-muted-foreground">
            {normalizeCode(code).length}/{CODE_LENGTH} characters · letters and numbers only
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="join-name">Your name</Label>
          <Input id="join-name" autoFocus={!!initialCode} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kabir" />
        </div>
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" variant="gradient" size="lg" className="shine w-full" disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {busy ? "Joining securely…" : "Join room"}
        </Button>
      </form>
    </FormShell>
  );
}

function ShareCode() {
  const { session, presence } = useRoom();
  const navigate = useNavigate();
  const [partner] = useSyncedDoc<MemberDoc>("member", "partner", DEFAULT_PARTNER);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const joined = presence.members >= 2 || !!session?.partnerJoined;
  const code = session?.code ?? "";

  useEffect(() => {
    if (!showQr || qr || !code) return;
    import("qrcode")
      .then((QR) => QR.toDataURL(inviteLink(code), { margin: 1, width: 480, color: { dark: "#0A0B15", light: "#FFFFFF" } }))
      .then(setQr)
      .catch(() => toast.error("Couldn't make the QR code."));
  }, [showQr, qr, code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Please select the code and copy it.");
    }
  };

  const share = async () => {
    const text = `Join our private UsSpace 💞\nSecret code: ${code}\n${inviteLink(code)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join our UsSpace", text });
      } catch {
        /* closed the share sheet */
      }
    } else {
      await navigator.clipboard?.writeText(text).catch(() => undefined);
      toast.success("Invite copied — paste it to your partner 💌");
    }
  };

  return (
    <div className="glass-card border-beam mx-auto w-full max-w-lg space-y-6 p-6 text-center sm:p-8">
      <div className="space-y-2">
        <motion.div
          className="mx-auto w-fit text-5xl"
          animate={joined ? { scale: [1, 1.2, 1] } : { rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
        >
          {joined ? "💞" : "🔐"}
        </motion.div>
        <h1 className="text-2xl font-bold sm:text-3xl">{joined ? `${partner.name} joined!` : "Your room is ready"}</h1>
        <p className="text-sm text-muted-foreground">
          {joined
            ? "Your room is now locked to your two devices. Nobody else can get in."
            : "Send this secret code to your partner. Only share it with them — once they join, the room locks."}
        </p>
      </div>

      <div className="rounded-2xl bg-background/60 p-4 ring-1 ring-white/10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Secret code</p>
        <p className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-[0.15em] text-gradient sm:text-3xl" data-testid="room-code">
          {code}
        </p>
      </div>

      {!joined && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="glass" onClick={copy}>
            {copied ? <Check className="text-success" /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="glass" onClick={share}>
            <Share2 /> Share
          </Button>
          <Button variant="glass" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
            <QrCode /> QR
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showQr && !joined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              {qr ? (
                <img src={qr} alt="QR code to join the room" className="h-48 w-48" />
              ) : (
                <div className="grid h-48 w-48 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-background" />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Your partner can scan this with their phone camera.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-2 text-sm">
        {joined ? (
          <span className="inline-flex items-center gap-2 text-success">
            <Check className="h-4 w-4" /> Both of you are in
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/70" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Waiting for your partner to join…
          </span>
        )}
      </div>

      <Button variant="gradient" size="lg" className="shine w-full" onClick={() => navigate("/dashboard")}>
        Enter our space <ArrowRight />
      </Button>
      {!joined && <p className="text-xs text-muted-foreground">You can go in now — the code is also in your profile settings.</p>}
    </div>
  );
}

function AlreadyInside() {
  return (
    <div className="glass-card mx-auto w-full max-w-md space-y-5 p-8 text-center">
      <div className="text-5xl">🏡</div>
      <h1 className="text-2xl font-bold">You're already in your room</h1>
      <p className="text-sm text-muted-foreground">This device is connected to your private space.</p>
      <Button variant="gradient" size="lg" asChild className="w-full">
        <Link to="/dashboard">
          Go to our space <ArrowRight />
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">To use a different room, leave this one from your profile settings first.</p>
    </div>
  );
}

export default Start;
