import { MotionConfig } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BurstLayer } from "@/components/fx/BurstLayer";
import { PageLoader } from "@/components/layout/PageLoader";
import { RoomProvider } from "@/context/RoomProvider";
import NotFound from "./pages/NotFound";

// Each page (and the private app shell) is its own small file, loaded on demand.
const pageLoaders = {
  index: () => import("./pages/Index"),
  privateArea: () => import("./PrivateArea"),
  profile: () => import("./pages/Profile"),
  start: () => import("./pages/Start"),
  dashboard: () => import("./pages/Dashboard"),
  chat: () => import("./pages/Chat"),
  gallery: () => import("./pages/Gallery"),
  canvas: () => import("./pages/Canvas"),
  games: () => import("./pages/Games"),
  music: () => import("./pages/MusicPlayer"),
};

const Index = lazy(pageLoaders.index);
const PrivateArea = lazy(pageLoaders.privateArea);
const Profile = lazy(pageLoaders.profile);
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

const App = () => {
  usePreloadPages();

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={200}>
        <Sonner position="top-center" closeButton />
        <BrowserRouter>
          <RoomProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Index />
                  </Suspense>
                }
              />
              <Route
                path="/start"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Start />
                  </Suspense>
                }
              />
              <Route
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PrivateArea />
                  </Suspense>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/canvas" element={<Canvas />} />
                <Route path="/games" element={<Games />} />
                <Route path="/music" element={<MusicPlayer />} />
                <Route path="/profile" element={<Profile />} />
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
