import { MotionConfig } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BurstLayer } from "@/components/fx/BurstLayer";
import AppLayout from "@/components/layout/AppLayout";
import { PageLoader } from "@/components/layout/PageLoader";
import { RequireRoom } from "@/components/layout/RequireRoom";
import { RoomProvider } from "@/context/RoomProvider";
import { SpaceProvider } from "@/context/SpaceProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Each page is split into its own small file and loaded on demand.
const pageLoaders = {
  start: () => import("./pages/Start"),
  dashboard: () => import("./pages/Dashboard"),
  chat: () => import("./pages/Chat"),
  presence: () => import("./pages/Presence"),
  games: () => import("./pages/Games"),
  planner: () => import("./pages/Planner"),
  music: () => import("./pages/MusicPlayer"),
  letters: () => import("./pages/Letters"),
  timeline: () => import("./pages/Timeline"),
};

const Start = lazy(pageLoaders.start);
const Dashboard = lazy(pageLoaders.dashboard);
const Chat = lazy(pageLoaders.chat);
const Presence = lazy(pageLoaders.presence);
const Games = lazy(pageLoaders.games);
const Planner = lazy(pageLoaders.planner);
const MusicPlayer = lazy(pageLoaders.music);
const Letters = lazy(pageLoaders.letters);
const Timeline = lazy(pageLoaders.timeline);

/** Quietly download every page once the browser is idle, so switching pages feels instant. */
function usePreloadPages() {
  useEffect(() => {
    const preload = () => Object.values(pageLoaders).forEach((load) => void load().catch(() => undefined));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(preload);
    } else {
      const id = window.setTimeout(preload, 1500);
      return () => window.clearTimeout(id);
    }
  }, []);
}

/** The private part of the app: only reachable once this device is in a room. */
const PrivateArea = () => (
  <RequireRoom>
    <SpaceProvider>
      <AppLayout />
    </SpaceProvider>
  </RequireRoom>
);

const App = () => {
  usePreloadPages();

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={200}>
        <Sonner position="top-center" closeButton />
        <BrowserRouter>
          <RoomProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/start"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Start />
                  </Suspense>
                }
              />
              <Route element={<PrivateArea />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/presence" element={<Presence />} />
                <Route path="/games" element={<Games />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/music" element={<MusicPlayer />} />
                <Route path="/letters" element={<Letters />} />
                <Route path="/timeline" element={<Timeline />} />
              </Route>
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RoomProvider>
        </BrowserRouter>
        <BurstLayer />
      </TooltipProvider>
    </MotionConfig>
  );
};

export default App;
