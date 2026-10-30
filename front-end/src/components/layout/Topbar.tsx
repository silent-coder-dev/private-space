import { AnimatePresence, motion } from "framer-motion";
import { Heart, Lock, LogOut, Search, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectionPill } from "@/components/layout/ConnectionPill";
import { UserAvatar } from "@/components/layout/InitialAvatar";
import { useSpace } from "@/context/space";
import { useMissYou } from "@/hooks/use-miss-you";
import { TopbarMusic } from "@/music/MusicControls";
import { findNavItem } from "@/lib/nav";
import { useAppLock } from "@/lib/pin";
import { daysBetween, parseLocalDate } from "@/lib/time";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Topbar() {
  const { pathname } = useLocation();
  const item = findNavItem(pathname);
  const { profile, setCommandOpen, setLogoutOpen } = useSpace();
  const { enabled: pinOn, lockNow } = useAppLock();
  const navigate = useNavigate();
  const days = Math.max(0, daysBetween(parseLocalDate(profile.since), new Date()));
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Your profile and account"
              className="flex items-center rounded-full p-0.5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserAvatar who="me" size="sm" />
              <UserAvatar who="partner" size="sm" className="-ml-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-2xl border-white/10 bg-popover/95 p-1.5 backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-xl p-2">
              <UserAvatar who="me" size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{profile.me}</p>
                <p className="truncate text-xs text-muted-foreground">
                  With {profile.partner} · {days.toLocaleString()} days
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/profile")} className="gap-2 rounded-lg py-2">
              <UserRound className="h-4 w-4" /> Profile & settings
            </DropdownMenuItem>
            {pinOn && (
              <DropdownMenuItem onSelect={lockNow} className="gap-2 rounded-lg py-2">
                <Lock className="h-4 w-4" /> Lock now
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLogoutOpen(true)} className="gap-2 rounded-lg py-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
