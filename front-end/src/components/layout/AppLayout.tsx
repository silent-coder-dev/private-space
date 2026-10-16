import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useRef } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import FloatingParticles from "@/components/fx/FloatingParticles";
import { AppSidebar } from "./AppSidebar";
import { CommandMenu } from "./CommandMenu";
import { MobileNav } from "./MobileNav";
import { PageLoader } from "./PageLoader";
import { SettingsDialog } from "./SettingsDialog";
import { Topbar } from "./Topbar";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Pages that manage their own scrolling and fill the screen (like chat). */
const FULL_HEIGHT = new Set(["/chat"]);

const AppLayout = () => {
  const location = useLocation();
  const outlet = useOutlet();
  const mainRef = useRef<HTMLElement>(null);
  const fullHeight = FULL_HEIGHT.has(location.pathname);

  return (
    <SidebarProvider>
      <AuroraBackground />
      <FloatingParticles count={18} />
      <AppSidebar />

      <div className="relative z-10 flex h-svh min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          ref={mainRef}
          id="main"
          className={cn(
            "relative min-h-0 flex-1",
            fullHeight
              ? "overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
              : "overflow-y-auto overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12",
          )}
        >
          {/* Old page fades out, new page fades in; scroll resets once the old page has gone. */}
          <AnimatePresence mode="wait" initial={false} onExitComplete={() => mainRef.current?.scrollTo({ top: 0 })}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className={fullHeight ? "h-full" : "min-h-full"}
            >
              <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav />
      <CommandMenu />
      <SettingsDialog />
    </SidebarProvider>
  );
};

export default AppLayout;
