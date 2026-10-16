const PATH = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.8 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z";

/** A real 3D heart: many thin layers stacked in depth, slowly turning. Pure CSS — no 3D library. */
export function Heart3D({ size = 180, layers = 16 }: { size?: number; layers?: number }) {
  return (
    <div aria-hidden className="relative grid place-items-center [perspective:900px]" style={{ width: size, height: size }}>
      <div className="absolute inset-[15%] rounded-full bg-primary/30 blur-3xl" />
      <div className="relative h-full w-full animate-spin-y [transform-style:preserve-3d]">
        {Array.from({ length: layers }, (_, i) => {
          const front = i === layers - 1;
          const depth = (i - (layers - 1) / 2) * (size / 90);
          return (
            <svg key={i} viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" style={{ transform: `translateZ(${depth}px)` }}>
              {front && (
                <defs>
                  <linearGradient id="heart3d" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FF85C2" />
                    <stop offset="0.5" stopColor="#FF4D6D" />
                    <stop offset="1" stopColor="#9650DC" />
                  </linearGradient>
                </defs>
              )}
              <path d={PATH} fill={front || i === 0 ? "url(#heart3d)" : `hsl(${340 - i * 2} 75% ${28 + i * 1.6}%)`} />
              {front && <path d="M7 7.5c-1.6.4-2.6 2-2.2 3.6" stroke="white" strokeOpacity="0.7" strokeWidth="1.1" fill="none" strokeLinecap="round" />}
            </svg>
          );
        })}
      </div>
    </div>
  );
}
