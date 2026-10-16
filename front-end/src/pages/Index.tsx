import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock,
  Gamepad2,
  Heart,
  Lock,
  Mail,
  MessageCircleHeart,
  Music,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import FloatingParticles from "@/components/fx/FloatingParticles";
import { Marquee } from "@/components/fx/Marquee";
import { Meteors } from "@/components/fx/Meteors";
import { NumberTicker } from "@/components/fx/NumberTicker";
import { OrbitingIcons } from "@/components/fx/OrbitingIcons";
import { Reveal } from "@/components/fx/Reveal";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { WordReveal } from "@/components/fx/WordReveal";
import {
  ChatDemo,
  CountdownDemo,
  GameDemo,
  LockDemo,
  MusicDemo,
  PresenceDemo,
  TimelineDemo,
} from "@/components/landing/FeatureDemos";
import { DARES, FEATURE_MARQUEE, LOVE_NOTES, TRUTHS, WOULD_YOU_RATHER } from "@/lib/content";
import { NAV_ITEMS } from "@/lib/nav";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { loadSession } from "@/sync/session";

const FEATURES: { icon: LucideIcon; title: string; text: string; demo: ReactNode; className?: string }[] = [
  {
    icon: MessageCircleHeart,
    title: "Private chat",
    text: "Real-time messages, photos, reactions, typing and seen ticks — end-to-end encrypted, just for the two of you.",
    demo: <ChatDemo />,
    className: "md:col-span-2",
  },
  { icon: Mail, title: "Time-locked letters", text: "Write today. They open on the day you choose.", demo: <LockDemo /> },
  { icon: Calendar, title: "Shared planner", text: "Plan dates and watch the live countdown tick.", demo: <CountdownDemo /> },
  { icon: Gamepad2, title: "Games for two", text: "Tic-tac-toe, truth or dare, memory match and more.", demo: <GameDemo /> },
  { icon: Music, title: "Our playlist", text: "Keep every song that tells your story.", demo: <MusicDemo /> },
  {
    icon: Clock,
    title: "Memory timeline",
    text: "First date, first trip, first home — every milestone in one beautiful line.",
    demo: <TimelineDemo />,
    className: "md:col-span-2",
  },
  { icon: Users, title: "Moods & presence", text: "Share how you feel with a single tap.", demo: <PresenceDemo /> },
];

const STEPS = [
  { emoji: "🔐", title: "Create a room", text: "Add your name and the day your story began. No email, no password." },
  { emoji: "🔑", title: "Share the secret code", text: "Send the code (or QR) to your partner. Once they join, the room locks." },
  { emoji: "💞", title: "Live, together", text: "Chat, plan, play and remember — every change shows up on both phones instantly." },
];

const FAQ = [
  {
    q: "Is UsSpace free?",
    a: "Yes. Every feature is free to use, with no ads.",
  },
  {
    q: "How do we connect?",
    a: "One of you creates a room and gets a secret code. The other enters that code (or scans the QR). That's it — you're connected, and everything syncs live.",
  },
  {
    q: "Who can read our messages?",
    a: "Only the two of you. Everything is encrypted on your phone with your secret code before it's sent. Our server just passes along locked boxes it can't open.",
  },
  {
    q: "What if someone else finds our code?",
    a: "A room holds exactly two devices. As soon as your partner joins, it's locked — nobody else can get in, even with the code.",
  },
  {
    q: "What if one of us is offline?",
    a: "No problem. Messages, letters and plans wait safely (still encrypted) and arrive the moment your partner is back online.",
  },
];

const PrimaryCta = ({ children, className }: { children: ReactNode; className?: string }) => (
  <Link
    to={loadSession() ? "/dashboard" : "/start"}
    className={cn(
      "shine group inline-flex h-12 items-center gap-2 rounded-2xl px-7 font-heading font-semibold text-white gradient-primary shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-primary/50 active:translate-y-0",
      className,
    )}
  >
    {children}
    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
  </Link>
);

const Index = () => {
  const heroRef = useRef<HTMLElement>(null);
  const promptCount = TRUTHS.length + DARES.length + WOULD_YOU_RATHER.length;

  const moveSpotlight = (e: React.PointerEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--hero-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--hero-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <AuroraBackground grid />
      <FloatingParticles />

      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/50 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="UsSpace">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary glow-primary">
              <Heart className="h-5 w-5 animate-heartbeat fill-white text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-gradient">UsSpace</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </div>
          <Link
            to={loadSession() ? "/dashboard" : "/start"}
            className="glass inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-white/10"
          >
            Open <span className="hidden sm:inline">UsSpace</span> <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section
          ref={heroRef}
          onPointerMove={moveSpotlight}
          className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
            style={{
              background:
                "radial-gradient(500px circle at var(--hero-x, 30%) var(--hero-y, 40%), hsl(var(--primary) / 0.10), transparent 60%)",
            }}
          />
          <Meteors count={10} />

          <div className="space-y-7 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="border-beam glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium sm:text-sm"
            >
              <Sparkles className="h-4 w-4 text-gold" />
              A private little world for two
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.05 }}
              className="text-4xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl"
            >
              Where two hearts <br className="hidden sm:block" />
              <span className="text-gradient-animated">feel at home.</span>
            </motion.h1>

            <WordReveal
              delay={0.3}
              className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0"
              text="UsSpace is a private room for you and your person, opened only with your secret code. Chat in real time, play, plan dates, share songs, write letters that unlock later, and keep every memory together."
            />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            >
              <PrimaryCta>Enter our space</PrimaryCta>
              <a
                href="#features"
                className="glass inline-flex h-12 items-center rounded-2xl px-6 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                See what's inside
              </a>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm lg:justify-start"
            >
              <li className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" /> End-to-end encrypted</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Locked to 2 devices</li>
              <li className="flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary" /> Live on both phones</li>
            </motion.ul>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
            className="-my-10 flex justify-center sm:my-0"
          >
            <OrbitingIcons
              className="scale-[0.8] sm:scale-100"
              rings={[
                { radius: 95, duration: 22, icons: [MessageCircleHeart, Mail, Music] },
                { radius: 165, duration: 34, icons: [Calendar, Gamepad2, Clock, Users, Sparkles], reverse: true },
              ]}
            />
          </motion.div>
        </section>

        {/* Marquee */}
        <section aria-label="Highlights" className="py-6">
          <Marquee duration="45s">
            {FEATURE_MARQUEE.map((label) => (
              <span key={label} className="glass whitespace-nowrap rounded-full px-5 py-2 text-sm text-muted-foreground">
                {label}
              </span>
            ))}
          </Marquee>
        </section>

        {/* Numbers */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { value: NAV_ITEMS.length, label: "cosy spaces" },
              { value: 4, label: "games to play" },
              { value: promptCount, label: "conversation prompts" },
              { value: LOVE_NOTES.length, label: "daily love notes" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08} className="glass-card p-5 text-center">
                <p className="font-heading text-4xl font-extrabold text-gradient">
                  <NumberTicker value={stat.value} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features bento */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Everything you share</p>
            <h2 className="text-3xl font-bold sm:text-5xl">
              Eight little rooms, <span className="text-gradient">one big love.</span>
            </h2>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08} className={f.className}>
                <SpotlightCard tilt className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl gradient-soft ring-1 ring-primary/20">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                  <div className="mt-auto">{f.demo}</div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="text-3xl font-bold sm:text-5xl">Three steps to your own world</h2>
          </Reveal>
          <div className="relative grid gap-6 md:grid-cols-3">
            <motion.div
              aria-hidden
              className="absolute left-[16%] right-[16%] top-10 hidden h-0.5 origin-left gradient-primary md:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.15} className="relative text-center">
                <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl glass text-4xl shadow-xl">
                  {step.emoji}
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full gradient-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
          <Reveal className="mb-8 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Good questions</h2>
          </Reveal>
          <Reveal>
            <Accordion type="single" collapsible className="glass-card divide-y divide-white/5 px-5">
              {FAQ.map((item, i) => (
                <AccordionItem key={item.q} value={`q${i}`} className="border-0">
                  <AccordionTrigger className="text-left font-heading hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
          <Reveal>
            <div className="border-beam glass-card relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
              <div className="absolute inset-0 -z-10 gradient-soft" />
              <motion.div
                className="mx-auto mb-5 w-fit text-5xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              >
                💌
              </motion.div>
              <h2 className="text-3xl font-bold sm:text-5xl">Ready to build your little world?</h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                Create your room in seconds, send the secret code, and start sharing the little things — live.
              </p>
              <PrimaryCta className="mt-8">Create our room — it's free</PrimaryCta>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} UsSpace · Made with <Heart className="inline h-4 w-4 fill-primary text-primary" /> for
          the ones you love
        </p>
      </footer>
    </div>
  );
};

export default Index;
