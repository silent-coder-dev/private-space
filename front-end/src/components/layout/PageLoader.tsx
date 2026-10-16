import { Heart } from "lucide-react";

/** Shown for a moment while a page's code is loading. */
export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Loading">
      <div className="relative">
        <span className="absolute inset-0 animate-ripple rounded-full bg-primary/30" />
        <div className="relative grid h-14 w-14 place-items-center rounded-full gradient-primary">
          <Heart className="h-6 w-6 animate-heartbeat fill-white text-white" />
        </div>
      </div>
    </div>
  );
}
