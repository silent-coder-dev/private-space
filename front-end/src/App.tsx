import { MotionConfig } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BurstLayer } from "@/components/fx/BurstLayer";
import AppLayout from "@/components/layout/AppLayout";
import { PageLoader } from "@/components/layout/PageLoader";
import { AppLock } from "@/components/layout/AppLock";
import { RequireRoom } from "@/components/layout/RequireRoom";
import { CallProvider } from "@/call/CallProvider";
import { MusicProvider } from "@/music/MusicProvider";
import { RoomProvider } from "@/context/RoomProvider";
import { SpaceProvider } from "@/context/SpaceProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Each page is split into its own small file and loaded on demand.
const pageLoaders = {
  start: () => import("./pages/Start"),
  dashboard: () => import("./pages/Dashboard"),
  chat: () => import("./pages/Chat"),
  gallery: () => import("./pages/Gallery"),
  canvas: () => import("./pages/Canvas"),
  games: () => import("./pages/Games"),
  music: () => import("./pages/MusicPlayer"),
};

const Start = lazy(pageLoaders.start);
const Dashboard = lazy(pageLoaders.dashboard);
const Chat = lazy(pageLoaders.chat);
const Gallery = lazy(pageLoaders.gallery);
const Canvas = lazy(pageLoaders.canvas);
const Games = lazy(pageLoaders.games);
const MusicPlayer = lazy(pageLoaders.music);

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
      <AppLock>
        <CallProvider>
          <MusicProvider>
            <AppLayout />
          </MusicProvider>
        </CallProvider>
      </AppLock>
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
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/canvas" element={<Canvas />} />
                <Route path="/games" element={<Games />} />
                <Route path="/music" element={<MusicPlayer />} />
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
