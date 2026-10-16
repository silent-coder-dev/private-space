import { AnimatePresence, motion } from "framer-motion";
import { Heart, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectionPill } from "@/components/layout/ConnectionPill";
import { InitialAvatar } from "@/components/layout/InitialAvatar";
import { useSpace } from "@/context/space";
import { useMissYou } from "@/hooks/use-miss-you";
import { TopbarMusic } from "@/music/MusicControls";
import { findNavItem } from "@/lib/nav";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Topbar() {
  const { pathname } = useLocation();
  const item = findNavItem(pathname);
  const { profile, setCommandOpen, setSettingsOpen } = useSpace();
  const missYou = useMissYou();
  const sendHeart = (e: React.MouseEvent<HTMLButtonElement>) => missYou(e.currentTarget);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-background/50 px-4 backdrop-blur-xl md:px-6">
      <SidebarTrigger className="hidden text-muted-foreground hover:text-foreground md:inline-flex" />

      <Link to="/dashboard" className="flex items-center gap-2 md:hidden" aria-label="Go to home">
        <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
          <Heart className="h-4 w-4 fill-white text-white" />
        </div>
        {/* On narrow phones the heart logo is enough — it leaves room for the music, heart and profile buttons. */}
        <span className="hidden font-heading text-lg font-bold text-gradient min-[440px]:inline">UsSpace</span>
      </Link>

      <div className="hidden h-5 w-px bg-border md:block" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="hidden items-baseline gap-2 md:flex"
        >
          <span className="font-heading text-sm font-semibold">{item?.title ?? "UsSpace"}</span>
          {item && <span className="text-xs text-muted-foreground">{item.description}</span>}
        </motion.div>
      </AnimatePresence>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden lg:inline-flex">
          <ConnectionPill />
        </span>
        <span className="lg:hidden">
          <ConnectionPill compact />
        </span>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="glass hidden h-9 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          <Search className="h-4 w-4" />
          <span className="pr-6">Search…</span>
          <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-body text-[10px] font-semibold">
            {isMac ? "⌘ K" : "Ctrl K"}
          </kbd>
        </button>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setCommandOpen(true)} aria-label="Search">
          <Search />
        </Button>

        <TopbarMusic />

        <Button
          variant="ghost"
          size="icon"
          onClick={sendHeart}
          aria-label={`Tell ${profile.partner} you're missing them`}
          className="text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Heart className="fill-primary" />
        </Button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Profile and settings"
          className="flex items-center rounded-full p-0.5 transition-transform hover:scale-105"
        >
          <InitialAvatar name={profile.me} size="sm" />
          <InitialAvatar name={profile.partner} size="sm" variant="secondary" className="-ml-2.5" />
        </button>
      </div>
    </header>
  );
}
