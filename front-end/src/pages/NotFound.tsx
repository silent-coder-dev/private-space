import { motion } from "framer-motion";
import { ArrowLeft, HeartCrack, House } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import FloatingParticles from "@/components/fx/FloatingParticles";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-background px-6">
      <AuroraBackground />
      <FloatingParticles count={16} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md space-y-6 text-center"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0], y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
          className="mx-auto grid h-24 w-24 place-items-center rounded-3xl glass"
        >
          <HeartCrack className="h-12 w-12 text-primary" />
        </motion.div>
        <h1 className="font-heading text-7xl font-extrabold text-gradient-animated">404</h1>
        <div className="space-y-2">
          <p className="font-heading text-xl font-semibold">This page wandered off</p>
          <p className="text-sm text-muted-foreground">
            We couldn't find <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">{location.pathname}</code>. Let's get you
            back to your space.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="gradient" size="lg" asChild>
            <Link to="/dashboard">
              <House /> Go to my space
            </Link>
          </Button>
          <Button variant="glass" size="lg" asChild>
            <Link to="/">
              <ArrowLeft /> Welcome page
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
