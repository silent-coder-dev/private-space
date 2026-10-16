import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { MOBILE_NAV_URLS, NAV_ITEMS } from "@/lib/nav";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Floating bottom dock for phones. "More" opens the full menu. */
export function MobileNav() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const items = NAV_ITEMS.filter((item) => MOBILE_NAV_URLS.includes(item.url));
  const moreActive = !MOBILE_NAV_URLS.includes(pathname);

  const pill = (
    <motion.span
      layoutId="mobile-active"
      transition={SPRING}
      className="absolute inset-0 rounded-2xl bg-primary/15 ring-1 ring-inset ring-primary/30"
    />
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="glass-card flex items-center gap-1 rounded-3xl bg-card/80 p-1.5 shadow-2xl shadow-black/50">
        {items.map((item) => {
          const active = pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium"
            >
              {active && pill}
              <item.icon className={cn("relative h-5 w-5 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("relative", active ? "text-foreground" : "text-muted-foreground")}>{item.title}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium"
        >
          {moreActive && pill}
          <Menu className={cn("relative h-5 w-5", moreActive ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("relative", moreActive ? "text-foreground" : "text-muted-foreground")}>More</span>
        </button>
      </div>
    </nav>
  );
}
