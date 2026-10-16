import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ["Sora", "Poppins", "system-ui", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
        script: ["Caveat", "cursive"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
        blush: "hsl(var(--blush))",
        gold: "hsl(var(--gold))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%": { transform: "scale(1)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "15%": { transform: "scale(1.18)" },
          "30%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.12)" },
        },
        aurora: {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(6%, -8%, 0) scale(1.12)" },
          "66%": { transform: "translate3d(-6%, 6%, 0) scale(0.94)" },
          "100%": { transform: "translate3d(0, 0, 0) scale(1)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "60%, 100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap, 1rem)))" },
        },
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "rotate(215deg) translateX(-600px)", opacity: "0" },
        },
        orbit: {
          from: { transform: "rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg)" },
          to: { transform: "rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg)" },
        },
        ripple: {
          "0%": { transform: "scale(1)", opacity: "0.55" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        equalizer: {
          "0%, 100%": { transform: "scaleY(0.25)" },
          "50%": { transform: "scaleY(1)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)", opacity: "0.15" },
          "50%": { transform: "translate3d(0, -60px, 0)", opacity: "0.8" },
        },
        "drift-heart": {
          "0%": { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: "0" },
          "50%": { transform: "translate3d(0, -80px, 0) rotate(12deg)", opacity: "0.7" },
          "100%": { transform: "translate3d(0, 0, 0) rotate(-8deg)", opacity: "0" },
        },
        "spin-y": {
          from: { transform: "rotateX(12deg) rotateY(0deg)" },
          to: { transform: "rotateX(12deg) rotateY(360deg)" },
        },
        travel: {
          "0%, 100%": { left: "0%" },
          "50%": { left: "calc(100% - 1.25rem)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "bounce-dot": "bounce-dot 1.4s infinite ease-in-out both",
        heartbeat: "heartbeat 2.2s ease-in-out infinite",
        aurora: "aurora 22s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        shine: "shine 3.2s ease-in-out infinite",
        marquee: "marquee var(--marquee-duration, 40s) linear infinite",
        meteor: "meteor 6s linear infinite",
        orbit: "orbit var(--orbit-duration, 24s) linear infinite",
        ripple: "ripple 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
        equalizer: "equalizer 1s ease-in-out infinite",
        "spin-slow": "spin 12s linear infinite",
        wiggle: "wiggle 0.6s ease-in-out",
        travel: "travel 4s ease-in-out infinite",
        "spin-y": "spin-y 9s linear infinite",
        drift: "drift 10s ease-in-out infinite",
        "drift-heart": "drift-heart 14s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
