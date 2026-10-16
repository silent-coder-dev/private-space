# 3 · Design: Fonts, Colours, Motion, Templates and Everything Else

This is the **design guide** for UsSpace. It explains the look and feel, and exactly which fonts, colours, sizes, effects and templates we use.

**Contents**

- [3.1 The design idea](#31-the-design-idea)
- [3.2 Colours](#32-colours)
- [3.3 Gradients and glows](#33-gradients-and-glows)
- [3.4 Fonts (typography)](#34-fonts-typography)
- [3.5 Shapes, spacing and surfaces](#35-shapes-spacing-and-surfaces)
- [3.6 Icons and emoji](#36-icons-and-emoji)
- [3.7 Motion (animation)](#37-motion-animation)
- [3.8 Building blocks (components)](#38-building-blocks-components)
- [3.9 Template inspiration (50+ patterns)](#39-template-inspiration-50-patterns)
- [3.10 Layout and screen sizes](#310-layout-and-screen-sizes)
- [3.11 Accessibility](#311-accessibility)
- [3.12 Words and tone](#312-words-and-tone)
- [3.13 How to change the look](#313-how-to-change-the-look)

---

## 3.1 The design idea

> **"A warm light in a night sky, just for two."**

| Mood word | How it shows up |
| --- | --- |
| 🌙 **Night** | Deep navy background, like a quiet evening together. |
| 💗 **Love** | A rose-pink to violet gradient on everything important. |
| 🫧 **Soft** | Frosted-glass cards, big rounded corners, gentle shadows. |
| ✨ **Alive** | Slowly moving aurora light, floating hearts, little bursts of joy. |
| ✍️ **Personal** | Handwriting font for love notes and letters. |

There is one theme, a **dark theme**. It is easy on the eyes at night, when couples often talk.

---

## 3.2 Colours

All colours are **CSS variables** in [`front-end/src/index.css`](../src/index.css) and are used through Tailwind names (for example `bg-primary` or `text-muted-foreground`).

### Brand colours

| Token | HSL | Hex | Used for |
| --- | --- | --- | --- |
| `--primary` | `349 100% 65%` | **#FF4D6D** (rose) | Main buttons, active items, hearts, links |
| `--secondary` | `270 67% 59%` | **#9650DC** (violet) | "Dare" button, partner avatar, gradient end |
| `--blush` | `330 100% 76%` | **#FF85C2** (pink) | Icons in orbit, typing text, read ticks |
| `--gold` | `42 100% 66%` | **#FFCB52** (gold) | "Year strong" badge, trophies, sparkles |
| `--success` | `152 69% 52%` | **#30D98A** (mint) | Online dot, "Read" badge, matched cards |
| `--destructive` | `0 84% 60%` | **#EF4343** (red) | Delete and reset actions |

### Surface colours

| Token | HSL | Hex | Used for |
| --- | --- | --- | --- |
| `--background` | `236 36% 6%` | **#0A0B15** | Page background (night sky) |
| `--card` | `236 30% 12%` | **#151728** | Cards (shown at 60% with blur, "glass") |
| `--popover` | `236 32% 10%` | **#111222** | Dialogs, menus, toasts |
| `--sidebar-background` | `236 34% 8%` | **#0D0E1B** | Sidebar (75% with blur) |
| `--muted` | `236 22% 18%` | **#242538** | Progress tracks, quiet chips |
| `--accent` | `236 24% 18%` | **#232439** | Hover background for ghost buttons |
| `--border` | `236 22% 20%` | **#28293E** | Lines and outlines (often `white/7%` on glass) |

### Text colours

| Token | Hex | Used for |
| --- | --- | --- |
| `--foreground` | **#F8F8FC** | Main text |
| `--muted-foreground` | **#B2B2C7** | Secondary text, labels, timestamps |

> **Contrast:** main text on the background is about 18:1, and muted text is about 9:1. Both are well above the WCAG AA level of 4.5:1.

---

## 3.3 Gradients and glows

| Name | Recipe | Where |
| --- | --- | --- |
| **Brand gradient** (`.gradient-primary`) | `135°: #FF4D6D → #EC51EC → #9650DC` | Buttons, active tabs, my chat bubbles, avatars, progress |
| **Soft gradient** (`.gradient-soft`) | Same colours at 18% | Hero card wash, icon tiles |
| **Moving text gradient** (`.text-gradient-animated`) | Rose → pink → violet → gold, sliding over 8 s | Landing headline, 404 |
| **Static text gradient** (`.text-gradient`) | Brand gradient clipped to text | Logo, numbers, highlights |
| **Glow** (`.glow-primary`) | `0 0 24px rose @30%` | Main buttons, countdown, winning squares |
| **Blush glow** (`.glow-accent`) | `0 0 36px pink @35%` | Soft highlights |
| **Aurora** | 3 big radial lights (rose, violet, pink) drifting over 22 s | Behind the whole app |

---

## 3.4 Fonts (typography)

All fonts are free **Google Fonts**, loaded in [`index.html`](../index.html) with `preconnect` for speed.

| Role | Font | Weights | Why |
| --- | --- | --- | --- |
| **Headings** (`font-heading`) | **Sora** | 400–800 | Modern, round and friendly, and strong at large sizes |
| **Body** (`font-body`) | **Plus Jakarta Sans** | 300–700 | Very readable and a little warmer than Inter |
| **Handwriting** (`font-script`) | **Caveat** | 500, 700 | Makes love notes and letters feel hand-written |

Fallbacks: Poppins / Inter / system UI, then `cursive` for Caveat.

**Secret codes** use the system **monospace** font, upper-case and widely letter-spaced (`tracking-[0.15em]`), in the brand gradient. That way every character is easy to read and copy.

### Type scale

| Use | Tailwind class | Size (desktop) |
| --- | --- | --- |
| Landing headline | `text-7xl font-extrabold` | 72 px |
| Section titles (landing) | `text-5xl font-bold` | 48 px |
| Big numbers (days, countdown) | `text-4xl–5xl font-extrabold` | 36–48 px |
| Page titles | `text-3xl font-bold` | 30 px |
| Card titles | `text-lg font-semibold` | 18 px |
| Body text | `text-sm`–`text-base` | 14–16 px |
| Labels, timestamps | `text-xs` / `text-[11px]` | 11–12 px |
| Love notes and letters | `font-script text-2xl–4xl` | 24–36 px |

Headings use `tracking-tight`, and small caps-style labels use `uppercase tracking-[0.2em]`.

---

## 3.5 Shapes, spacing and surfaces

| Thing | Value |
| --- | --- |
| Base radius `--radius` | `1rem` (16 px) |
| Cards | `rounded-2xl` (16 px) to `rounded-3xl` (24 px) |
| Buttons | `rounded-xl` (12 px); big buttons `rounded-2xl` |
| Chips, avatars, dock pills | Fully round (`rounded-full`) |
| Page padding | 16 px phone · 24 px tablet · 32 px desktop |
| Content width | `max-w-5xl` (1024 px) to `max-w-6xl` (1152 px) |
| Gaps | 8 · 12 · 16 · 20 · 24 px (Tailwind 2 · 3 · 4 · 5 · 6) |

### The glass recipe (`.glass-card`)

```css
rounded-2xl
border: 1px solid rgba(255,255,255,0.07)
background: card colour at 60%
backdrop-filter: blur(24px)
box-shadow: inset 0 1px 0 rgba(255,255,255,0.05),   /* soft top light */
            0 10px 30px -12px rgba(2,3,10,0.6)      /* soft drop shadow */
```

### Background patterns

- **Dots** (`.bg-dots`): 1 px dots every 22 px, faded at the edges (`.mask-radial`).
- **Grid** (`.bg-grid`): 1 px lines every 44 px, used on the landing page.
- **Lined paper** (`.paper`): cream paper with pink lines every 32 px, used for opened letters.

---

## 3.6 Icons and emoji

- **Icons:** [lucide-react](https://lucide.dev), thin 2 px line icons, sized 16–24 px.
- Each room has one icon: Home `LayoutDashboard` · Chat `MessageCircleHeart` · Presence `Users` · Games `Gamepad2` · Planner `Calendar` · Music `Music` · Letters `Mail` · Timeline `Clock`.
- **Emoji** add warmth: moods (🥰 😊 🤗 😴 🥺 🔥 😌 🤒), plan stickers (🎬 🍽️ ✈️ 🎂 …), memory stickers (💫 ☕ ❤️ 🏠 …) and game pieces (❤️ vs 💜).
- **Logo:** a white heart inside a rounded square with the brand gradient ([`public/favicon.svg`](../public/favicon.svg)).

---

## 3.7 Motion (animation)

### Rules

1. **Fast in, gentle stop.** Most motion uses the easing curve `cubic-bezier(0.16, 1, 0.3, 1)` (`EASE_OUT` in [`lib/motion.ts`](../src/lib/motion.ts)).
2. **Springs for things you touch.** Sliding pills use `stiffness 380, damping 32`.
3. **Slow loops for the background** (20–40 s), so it never distracts.
4. **Celebrate real moments only:** sending love, winning, finishing, opening a letter.
5. **Reduced motion is respected** everywhere (`MotionConfig reducedMotion="user"` plus a CSS media query).

### Timing table

| Animation | Duration | Where |
| --- | --- | --- |
| Page change (fade + rise 14 px) | 0.28 s | Every room |
| List items appearing (staggered) | 0.5 s each, 70 ms apart | Dashboard, Presence, lists |
| Active pill slide | spring | Sidebar, mobile dock, tabs, mood picker |
| Button press | scale 0.97 | All buttons |
| Card tilt | up to 9° | Feature and room cards |
| Countdown digits roll | 0.45 s | Planner, landing |
| Heart burst | 1.4 s | Hearts, wins, letters, plans |
| New chat message pop | spring | Chat |
| Heartbeat | 2.2 s loop | Logo, hero heart, nudge button |
| Shine sweep | 3.2 s loop | Primary buttons, icon tiles |
| Border beam | 5 s loop | Badge, love note, unread letters, CTAs |
| Ripple rings | 2.4 s loop | Online avatars, heart buttons |
| Equalizer bars | ~1 s loop | Music |
| Vinyl spin | 12 s loop (pauses in place) | Music |
| Marquee | 45 s loop (pauses on hover) | Landing |
| Orbit | 22 s / 34 s loops | Landing hero |
| Meteors | 5–11 s each | Landing hero |
| Aurora | 22 s loop | Background |

---

## 3.8 Building blocks (components)

### Effects ([`components/fx/`](../src/components/fx))

| Component | What it does |
| --- | --- |
| `AuroraBackground` | Moving coloured light + dot/grid pattern |
| `FloatingParticles` | Drifting dots and tiny hearts |
| `SpotlightCard` | Glass card with a light that follows the mouse, a glowing edge and optional 3D tilt |
| `NumberTicker` | Counts up to a number when seen |
| `SlotNumber` | Digits that roll when they change |
| `WordReveal` | Text appears word by word from a blur |
| `Marquee` | Endless scrolling row |
| `Meteors` | Shooting stars |
| `OrbitingIcons` | Icons circling a beating heart |
| `ProgressRing` | Gradient ring for "days to anniversary" |
| `Equalizer` | Bouncing music bars |
| `Reveal` | Fade-up when scrolled into view |
| `BurstLayer` | Draws heart bursts fired by `fireHearts()` |

### Layout ([`components/layout/`](../src/components/layout))

`AppLayout` · `AppSidebar` · `Topbar` · `MobileNav` · `CommandMenu` · `SettingsDialog` · `PageHeader` · `EmptyState` · `InitialAvatar` · `PageLoader` · **`ConnectionPill`** · **`RequireRoom`**

### Room screens ([`pages/Start.tsx`](../src/pages/Start.tsx))

| Screen | Look |
| --- | --- |
| **Choose** | Big heading "Your private room *for two*" (moving gradient), two tilting spotlight cards (**Create a room** ✨ / **Join a room** 🔑), and a green security strip. |
| **Create** | A glass form: your name + "together since" date, with a shining gradient button and a spinner ("Creating a secure room…"). |
| **Secret code** | A card with a travelling border beam, a big gradient monospace code, **Copy · Share · QR** buttons, a white QR tile, a pulsing "Waiting for your partner…", then "💞 Kabir joined!". |
| **Join** | A centred, letter-spaced code field that formats itself (`XXXX-XXXX-XXXX-XXXX`), a character counter, your name, and clear red error boxes. |

### Connection pill colours

| State | Colour | Text |
| --- | --- | --- |
| Partner online | Mint (`--success`), pulsing dot | "Kabir is here" / "Together" |
| Connected | Rose (`--primary`) | "Live" |
| Partner not joined yet | Gold (`--gold`) | "Waiting for partner" |
| Connecting | Gold, pulsing dot | "Connecting…" |
| Offline | Grey (`--muted`) | "Offline · changes saved" |

### Chat ticks

🕓 *Sending* (grey clock) → ✓ *Sent* (grey check) → ✓✓ *Seen* (blush double check).

### Forms ([`components/forms/`](../src/components/forms))

`FormDialog` (shared pop-up for adding things) · `EmojiChoice` (pick-an-emoji row)

### Base UI ([`components/ui/`](../src/components/ui))

shadcn/ui parts (dialog, alert dialog, popover, dropdown menu, switch, slider, calendar, accordion, command, sidebar, sheet, tooltip…), restyled with our tokens. New button variants: **`gradient`** and **`glass`**.

---

## 3.9 Template inspiration (50+ patterns)

We studied many popular free UI libraries and landing-page templates, including **Aceternity UI**, **Magic UI**, **shadcn/ui blocks**, **Cruip** (Open React / Simple Light), **Velora UI**, and the design language of apps like **Linear, Vercel, Stripe, Apple, Spotify, iMessage and WhatsApp**. We did **not** copy any template's code. We re-built each idea by hand to fit UsSpace's romantic style.

| # | Pattern | Inspired by | Where in UsSpace |
| --- | --- | --- | --- |
| 1 | Aurora background | Aceternity "Aurora Background" | Behind the whole app |
| 2 | Dot pattern | Magic UI "Dot Pattern" | App background |
| 3 | Grid pattern | Magic UI "Grid Pattern" | Landing background |
| 4 | Radial edge fade mask | Magic UI pattern demos | Backgrounds |
| 5 | Cursor spotlight | Aceternity "Spotlight" | Landing hero |
| 6 | Glowing-edge card | Magic UI "Magic Card" | `SpotlightCard` |
| 7 | 3D tilt card | Aceternity "3D Card Effect" | Feature and room cards |
| 8 | Bento grid | Aceternity / Magic UI "Bento Grid" | Landing features, dashboard rooms |
| 9 | Border beam | Magic UI "Border Beam" | Badge, love note, unread letters, CTA |
| 10 | Shine / shimmer button | Magic UI "Shimmer Button" | Main buttons |
| 11 | Animated gradient text | Magic UI "Animated Gradient Text" | Headline, 404 |
| 12 | Text generate effect | Aceternity "Text Generate Effect" | Hero sub-text |
| 13 | Meteors | Aceternity / Magic UI "Meteors" | Landing hero |
| 14 | Orbiting circles | Magic UI "Orbiting Circles" | Landing hero |
| 15 | Marquee | Magic UI "Marquee" | Highlights strip |
| 16 | Number ticker | Magic UI "Number Ticker" | Stats, days together |
| 17 | Floating particles | Magic UI "Particles", Aceternity "Sparkles" | Background |
| 18 | Ripple rings | Magic UI "Ripple" | Online avatars, heart buttons |
| 19 | Confetti burst | Magic UI "Confetti" / "Cool Mode" | Heart bursts |
| 20 | Animated connection beam | Magic UI "Animated Beam" | Presence (you ↔ partner) |
| 21 | Floating dock | Aceternity "Floating Dock", Velora dock | Phone bottom bar |
| 22 | Command palette | shadcn/ui "Command", Linear, Raycast | `Ctrl + K` search |
| 23 | Glassmorphism | Apple visionOS, Dribbble trends | All cards |
| 24 | Sliding active pill | Vercel / Linear tabs | Sidebar, dock, tabs, moods |
| 25 | Collapsible icon sidebar | shadcn/ui "Sidebar" blocks | Desktop navigation |
| 26 | Fade-and-rise page transitions | Framer site templates | Every room |
| 27 | Scroll reveal sections | Cruip templates | Landing |
| 28 | Scroll-traced line | Aceternity "Tracing Beam" | Timeline |
| 29 | Alternating timeline | Aceternity "Timeline" | Timeline |
| 30 | Rolling countdown digits | Flip clocks, launch pages | Planner, landing demo |
| 31 | Progress ring | Apple Fitness rings | Anniversary ring |
| 32 | 3D flip card | Card-flip demos | Truth or Dare, Memory Match |
| 33 | Chat bubbles + typing dots | iMessage, WhatsApp | Chat |
| 34 | Quick reactions bar | iMessage tapbacks, Slack | Chat |
| 35 | Emoji picker popover | Slack, Discord | Chat |
| 36 | Vinyl record player | Dribbble music concepts | Music |
| 37 | Equalizer "now playing" | Spotify | Music queue |
| 38 | Envelope cards | Dribbble letter concepts | Letters |
| 39 | Lined paper letter | Invitation/wedding templates | Opened letter |
| 40 | Toast with Undo | Gmail, sonner demos | Deleting things |
| 41 | Friendly empty states | Notion, Linear | Empty lists |
| 42 | FAQ accordion | Cruip, Velora | Landing |
| 43 | Steps with connector line | SaaS landing templates | "How it works" |
| 44 | Sticky blurred navbar | Vercel, Linear | Landing + top bar |
| 45 | Hero with two CTAs + trust row | Stripe, Cruip | Landing hero |
| 46 | Stats band | SaaS templates | Landing numbers |
| 47 | Gradient-wash final CTA | Velora UI | Landing ending |
| 48 | Avatar stack | Magic UI "Avatar Circles" | Top bar, music |
| 49 | Pulsing online dot | Slack, Discord | Avatars |
| 50 | Mood picker | Daylio-style mood trackers | Dashboard |
| 51 | Calendar with event dots | Google Calendar, Fantastical | Planner |
| 52 | Big countdown hero | Event / launch pages | Planner |
| 53 | Segmented filter control | iOS segmented control | Letters filter |
| 54 | Keyboard hint chip (`Ctrl K`) | Linear, Vercel | Search button |
| 55 | Handwritten accents | Greeting-card designs | Love note, letters |
| 56 | Gradient icon tiles | iOS app icons | Page headers, rooms |
| 57 | Neon glow shadows | Magic UI "Neon Gradient Card" | Buttons, rings, dots |
| 58 | Pulsing heart loader | Brand loaders | Page loading |
| 59 | Playful 404 | Many SaaS templates | Not-found page |
| 60 | Pairing code + QR | WhatsApp Web, Signal linking | Secret code screen |
| 61 | Live status pill | Linear, Slack, Discord | Top bar connection pill |
| 62 | Sending / sent / seen ticks | WhatsApp, iMessage | Chat |
| 63 | Choose-your-path cards | Onboarding templates | Create / Join |

---

## 3.10 Layout and screen sizes

| Screen | Width | Layout |
| --- | --- | --- |
| Phone | < 768 px | Top bar + **floating bottom dock** (Home, Chat, Games, Planner, More). Single column. |
| Tablet | ≥ 768 px (`md`) | **Sidebar** appears. Cards become 2 columns. |
| Laptop | ≥ 1024 px (`lg`) | Up to 3 columns, calendar beside the planner, playlist beside the player. |
| Wide | ≥ 1280 px | Content is centred and capped at 1152 px. |

- The sidebar can collapse to icons (`Ctrl + B` or the panel button).
- The chat fills the screen and manages its own scrolling. Other pages scroll inside the main area.
- Safe areas on phones with notches are respected (`env(safe-area-inset-bottom)`).

---

## 3.11 Accessibility

- ✅ Colour contrast above WCAG AA.
- ✅ Every icon-only button has an `aria-label` ("Send a heart", "Play", "Remove …").
- ✅ Dialogs have titles (visible or screen-reader only).
- ✅ Keyboard: Tab through everything, `Enter`/`Space` to press, `Esc` to close, plus shortcuts.
- ✅ Focus rings use the brand colour (`:focus-visible`).
- ✅ `aria-current="page"` on the active link, and `aria-pressed` / `aria-selected` on toggles and tabs.
- ✅ Reduced motion: animations shorten, and particles and big bursts are removed or reduced.
- ✅ Sealed letters do not put their secret text in the page (not even for screen readers).
- ✅ The connection pill is a polite live region (`role="status"`), so changes are announced.
- ✅ Chat ticks say "Sending", "Sent" or "Seen" to screen readers.
- ✅ Tic-tac-toe squares are named ("Play square 5", "Square 5, Kabir").
- ✅ Room errors use `role="alert"`.

---

## 3.12 Words and tone

- **Warm, short, playful.** "Say hello 👋", "No peeking!", "Heart sent to Kabir 💖".
- **Talk to the couple.** Use "you" and "your person" and their real names.
- **Honest.** We say "End-to-end encrypted" only because it's true, we show "Offline · changes saved" when it's offline, and we never pretend a partner is online when they aren't.
- **Never about how the site was built.** The website talks only about love, not about tools.

---

## 3.13 How to change the look

| I want to… | Change this |
| --- | --- |
| Change the main colour | `--primary` in `src/index.css` |
| Change the gradient | `--gradient-primary` in `src/index.css` |
| Change fonts | The Google Fonts link in `index.html` + `fontFamily` in `tailwind.config.ts` |
| Make corners rounder | `--radius` in `src/index.css` |
| Slow down or speed up loops | `keyframes` / `animation` in `tailwind.config.ts` |
| Change words, love notes or game prompts | `src/lib/content.ts` |

**Back:** [← 2 · Approaches](02-approaches.md) · **Next:** [4 · Flowcharts →](04-flowcharts.md)
