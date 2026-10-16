# 3 · Design: Fonts, Colours, Motion, 3D, Templates and Everything Else

This is the **design guide** for UsSpace. It explains the look and feel, and exactly which fonts, colours, sizes, effects and templates we use.

**Contents**

- [3.1 The design idea](#31-the-design-idea)
- [3.2 Colours](#32-colours)
- [3.3 Gradients and glows](#33-gradients-and-glows)
- [3.4 Fonts (typography)](#34-fonts-typography)
- [3.5 Shapes, spacing and surfaces](#35-shapes-spacing-and-surfaces)
- [3.6 Icons and emoji](#36-icons-and-emoji)
- [3.7 Motion and 3D](#37-motion-and-3d)
- [3.8 Building blocks (components)](#38-building-blocks-components)
- [3.9 Screen by screen](#39-screen-by-screen)
- [3.10 Template inspiration (60+ patterns)](#310-template-inspiration-60-patterns)
- [3.11 Layout and screen sizes](#311-layout-and-screen-sizes)
- [3.12 Accessibility](#312-accessibility)
- [3.13 Words and tone](#313-words-and-tone)
- [3.14 How to change the look](#314-how-to-change-the-look)

---

## 3.1 The design idea

> **"A warm light in a night sky, just for two."**

| Mood word | How it shows up |
| --- | --- |
| 🌙 **Night** | Deep navy background, like a quiet evening together. |
| 💗 **Love** | A rose-pink to violet gradient on everything important. |
| 🫧 **Soft** | Frosted-glass cards, big rounded corners, gentle shadows. |
| ✨ **Alive** | Moving aurora light, floating hearts, a turning 3D heart, 3D page turns. |
| ✍️ **Personal** | A handwriting font for the love note of the day. |

There is one theme, a **dark theme**. It is easy on the eyes at night, when couples often talk.

---

## 3.2 Colours

All colours are **CSS variables** in [`front-end/src/index.css`](../src/index.css) and are used through Tailwind names (for example `bg-primary` or `text-muted-foreground`).

### Brand colours

| Token | HSL | Hex | Used for |
| --- | --- | --- | --- |
| `--primary` | `349 100% 65%` | **#FF4D6D** (rose) | Main buttons, active items, hearts, links |
| `--secondary` | `270 67% 59%` | **#9650DC** (violet) | "Dare" button, partner avatar, gradient end |
| `--blush` | `330 100% 76%` | **#FF85C2** (pink) | Typing text, seen ticks, soft highlights |
| `--gold` | `42 100% 66%` | **#FFCB52** (gold) | "Waiting for partner", trophies, sparkles |
| `--success` | `152 69% 52%` | **#30D98A** (mint) | Online dot, Accept call, matched cards |
| `--destructive` | `0 84% 60%` | **#EF4343** (red) | End call, delete, close room |

### Surface colours

| Token | HSL | Hex | Used for |
| --- | --- | --- | --- |
| `--background` | `236 36% 6%` | **#0A0B15** | Page background (night sky) |
| `--card` | `236 30% 12%` | **#151728** | Cards (shown at 60% with blur, "glass") |
| `--popover` | `236 32% 10%` | **#111222** | Dialogs, menus, toasts, the music pop-up |
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

### Canvas colours

The canvas has 9 quick colours plus a "pick any colour" button: rose `#FF4D6D`, pink `#FF85C2`, violet `#9650DC`, blue `#4D9FFF`, mint `#30D98A`, gold `#FFCB52`, orange `#FF8A3D`, white and ink `#111222`.

---

## 3.3 Gradients and glows

| Name | Recipe | Where |
| --- | --- | --- |
| **Brand gradient** (`.gradient-primary`) | `135°: #FF4D6D → #EC51EC → #9650DC` | Buttons, active tabs, my chat bubbles, avatars, progress, the play button |
| **Soft gradient** (`.gradient-soft`) | Same colours at 18% | Hero card wash, icon tiles, call background |
| **Moving text gradient** (`.text-gradient-animated`) | Rose → pink → violet → gold, sliding over 8 s | Landing headline, Start page, 404 |
| **Static text gradient** (`.text-gradient`) | Brand gradient clipped to text | Logo, numbers, the secret code |
| **Glow** (`.glow-primary`) | `0 0 24px rose @30%` | Main buttons, winning squares |
| **Blush glow** (`.glow-accent`) | `0 0 36px pink @35%` | Soft highlights |
| **Aurora** | 3 big radial lights (rose, violet, pink) drifting over 22 s | Behind the whole app |
| **Heart glow** | A blurred rose circle behind the 3D heart and the record | Home, Music |

---

## 3.4 Fonts (typography)

All fonts are free **Google Fonts**, loaded in [`index.html`](../index.html) with `preconnect` for speed.

| Role | Font | Weights | Why |
| --- | --- | --- | --- |
| **Headings** (`font-heading`) | **Sora** | 400–800 | Modern, round and friendly, and strong at large sizes |
| **Body** (`font-body`) | **Plus Jakarta Sans** | 300–700 | Very readable and a little warmer than Inter |
| **Handwriting** (`font-script`) | **Caveat** | 500, 700 | Makes the love note feel hand-written |

Fallbacks: Poppins / Inter / system UI, then `cursive` for Caveat.

**Secret codes** use the system **monospace** font, upper-case and widely letter-spaced, in the brand gradient, so every character is easy to read and copy. **Times** (call timer, song time) use `tabular-nums` so the digits don't jump.

### Type scale

| Use | Tailwind class | Size (desktop) |
| --- | --- | --- |
| Landing headline | `text-7xl font-extrabold` | 72 px |
| Section titles (landing) | `text-5xl font-bold` | 48 px |
| Big numbers (days together) | `text-4xl–5xl font-extrabold` | 36–48 px |
| Page titles | `text-3xl font-bold` | 30 px |
| Song title on the player | `text-2xl font-bold` | 24 px |
| Card titles | `text-lg font-semibold` | 18 px |
| Body text | `text-sm`–`text-base` | 14–16 px |
| Labels, timestamps | `text-xs` / `text-[11px]` | 11–12 px |
| Love note | `font-script text-3xl–4xl` | 30–36 px |

---

## 3.5 Shapes, spacing and surfaces

| Thing | Value |
| --- | --- |
| Base radius `--radius` | `1rem` (16 px) |
| Cards | `rounded-2xl` (16 px) to `rounded-3xl` (24 px) |
| Buttons | `rounded-xl` (12 px); big buttons `rounded-2xl` |
| Chips, avatars, dock, call buttons | Fully round (`rounded-full`) |
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
- **Canvas paper**: a soft cream sheet (`#FFF8F0`), so drawings look like a real notebook.

---

## 3.6 Icons and emoji

- **Icons:** [lucide-react](https://lucide.dev), thin 2 px line icons, sized 16–24 px.
- Each room has one icon: Home `LayoutDashboard` · Chat `MessageCircleHeart` · Gallery `Image` · Canvas `Palette` · Games `Gamepad2` · Music `Music`.
- Call icons: `Phone`, `Video`, `PhoneOff`, `Mic` / `MicOff`, `Camera` / `CameraOff`, `SwitchCamera`, `Minimize2`.
- **Emoji** add warmth: moods (🥰 😊 🤗 😴 🥺 🔥 😌 🤒), canvas stickers (❤️ 💖 😘 🥰 😂 🌹 ⭐ 🌙 ☀️ 🐱 🐶 🧸 🎈 🍕 👑 💍) and game pieces (❤️ vs 💜).
- **Logo:** a white heart inside a rounded square with the brand gradient ([`public/favicon.svg`](../public/favicon.svg)).

---

## 3.7 Motion and 3D

### Rules

1. **Fast in, gentle stop.** Most motion uses the easing curve `cubic-bezier(0.16, 1, 0.3, 1)` (`EASE_OUT` in [`lib/motion.ts`](../src/lib/motion.ts)).
2. **Springs for things you touch.** Sliding pills use `stiffness 380, damping 32`.
3. **Slow loops for the background** (20–40 s), so it never distracts.
4. **Celebrate real moments only:** missing you, winning, a partner joining.
5. **Buttons you must hit stay still.** Call buttons don't move on hover; they only shrink a little when pressed.
6. **Reduced motion is respected** everywhere (`MotionConfig reducedMotion="user"` plus a CSS media query).

### The 3D effects (all pure CSS + Framer Motion, no 3D library)

| Effect | How it's made | Where |
| --- | --- | --- |
| **3D heart** | 16 heart shapes stacked in depth (`translateZ`) and turning (`rotateY`, 9 s) | Home |
| **3D page turn** | Each page enters tipped back (`rotateX 7°`) and stands up | Every page |
| **3D tilt cards** | Cards follow the mouse up to 9°, with a light spot | Feature, room and game cards, gallery photos |
| **3D record** | The vinyl tips back (`rotateX 8° → 18°` while playing) and spins | Music |
| **3D flip cards** | Cards turn over (`rotateY 180°`) | Truth or Dare, Memory Match |
| **Drifting hearts** | Tiny hearts float slowly across the background | Behind the whole app |

### Timing table

| Animation | Duration | Where |
| --- | --- | --- |
| Page change (3D turn + fade + rise) | 0.34 s | Every page |
| List items appearing (staggered) | 0.5 s each, 70 ms apart | Home, gallery, lists |
| Active pill slide | spring | Sidebar, dock, tabs, moods, canvas tools, playlist |
| Button press | scale 0.97 | All buttons |
| 3D heart turn | 9 s loop | Home |
| Heart burst (22 on your screen, 30 on your partner's) | 1.4 s | Missing you, wins |
| Drifting background hearts | 10–14 s loops | Background |
| New chat message pop | spring | Chat |
| Heartbeat | 2.2 s loop | Logo, heart buttons |
| Shine sweep | 3.2 s loop | Main buttons |
| Ripple rings | 2.4 s loop | Online avatars, incoming call |
| Equalizer bars | ~1 s loop | Music, the 🎵 top-bar button |
| Vinyl spin | 12 s loop (pauses in place) | Music |
| Aurora | 22 s loop | Background |
| Marquee, orbit, meteors | 6–45 s loops | Landing |

---

## 3.8 Building blocks (components)

### Effects ([`components/fx/`](../src/components/fx))

| Component | What it does |
| --- | --- |
| `Heart3D` | The layered, turning 3D heart |
| `AuroraBackground` | Moving coloured light + dot/grid pattern |
| `FloatingParticles` | Drifting dots and tiny hearts |
| `SpotlightCard` | Glass card with a light that follows the mouse, a glowing edge and optional 3D tilt |
| `NumberTicker` | Counts up to a number when seen |
| `SlotNumber` | Digits that roll when they change |
| `WordReveal` | Text appears word by word from a blur |
| `Marquee` · `Meteors` · `OrbitingIcons` | Landing page effects |
| `FeatureDemos` (in `components/landing/`) | Tiny live demos on the landing cards: chat, call timer, close room, game, music, gallery + self-drawing heart, flying heart |
| `ProgressRing` | Gradient ring for "days to anniversary" |
| `Equalizer` | Bouncing music bars |
| `Reveal` | Fade-up when scrolled into view |
| `BurstLayer` | Draws heart bursts fired by `fireHearts()` |

### Layout ([`components/layout/`](../src/components/layout))

`AppLayout` (3D page turns) · `AppSidebar` · `Topbar` (🎵 music, 💖 missing you, calls, connection) · `MobileNav` · `CommandMenu` · `SettingsDialog` · `AppLock` (PIN screen + privacy blur) · `ConnectionPill` · `RequireRoom` · `PageHeader` · `EmptyState` · `InitialAvatar` · `PageLoader`

### Feature parts

| Part | Where |
| --- | --- |
| `CameraCapture`: live camera, photo / video switch, record ring, flip camera | [`components/chat/`](../src/components/chat) |
| `CallOverlay`: ringing screen, full-screen call, floating call bar | [`call/`](../src/call) |
| `MusicProgress`, `MusicButtons`, `MusicVolume`, `TopbarMusic` | [`music/MusicControls.tsx`](../src/music/MusicControls.tsx) |
| `TicTacToe`, `TruthOrDare`, `MemoryMatch`, `WouldYouRather` | [`components/games/`](../src/components/games) |

### Base UI ([`components/ui/`](../src/components/ui))

shadcn/ui parts (dialog, alert dialog, popover, dropdown menu, switch, slider, command, sidebar, sheet, tooltip…), restyled with our tokens. Extra button variants: **`gradient`** and **`glass`**.

---

## 3.9 Screen by screen

Real screenshots of every screen are in [`screenshots/`](screenshots) (desktop and phone).

| Home | Chat | Music + 🎵 pop-up |
| --- | --- | --- |
| ![Home](screenshots/dashboard.jpg) | ![Chat](screenshots/chat.jpg) | ![Music pop-up](screenshots/music-popover.jpg) |
| **Gallery** | **Canvas** | **Games** |
| ![Gallery](screenshots/gallery.jpg) | ![Canvas](screenshots/canvas.jpg) | ![Games](screenshots/games.jpg) |

| Screen | Look |
| --- | --- |
| **Start · Choose** | Big heading "Your private room *for two*" (moving gradient), two tilting cards (**Create a room** ✨ / **Join a room** 🔑) and a green security strip. |
| **Start · Secret code** | A card with a travelling border beam, the big gradient code, **Copy · Share · QR**, a pulsing "Waiting for your partner…", then "💞 Kabir joined!". |
| **Home** | The 3D heart over the days-together number, the mood picker, the love note in handwriting, a big **I'm missing you** button, video / voice call buttons and live room cards. |
| **Chat** | Gradient bubbles for me, glass bubbles for my partner. Photos and videos sit inside bubbles. A camera sheet with a round record button and a red progress ring. Call buttons in the header. |
| **Call** | Full screen. The partner's video fills the screen, and my own video is a small rounded tile in the corner. Round buttons at the bottom: mute, camera, switch, minimise, and a red end button. Incoming calls show ripple rings and a green **Accept** button. Minimised, it becomes a small glass pill with the timer. |
| **Gallery** | A masonry grid (2 → 4 columns) of tilting photos. Full-screen viewer with arrows and swipe, **Show Kabir**, save, delete, and a **Voice chat** button in the header. |
| **Canvas** | A floating glass toolbar (pen, neon, eraser, stickers, colours, sizes, cartoon switch), with undo / save / clear on top, and a cream paper sheet underneath. |
| **Games** | Four tilting game cards with an **Invite** button. Inviting shows a spinner, "Waiting for Kabir to join…". Your partner sees "Riya invites you to play…" with **Join game**. |
| **Music** | A tipped 3D vinyl record with a heart label and a pink glow, the song title, "Listening together", a progress bar, a gradient play button, volume, and a searchable playlist with a sliding highlight. |
| **🎵 top-bar pop-up** | Now playing, the progress bar, all controls and volume in a small glass pop-up on every page. The icon becomes bouncing bars while music plays. |
| **PIN lock** | A glass card with a glowing gradient lock tile, "UsSpace is locked" and a PIN field. The card shakes on a wrong PIN. |
| **Settings** | Name, together-since date, secret code (hidden until you tap), PIN lock switch, and a red **Close room & delete everything** button. |

### Connection pill colours

| State | Colour | Text |
| --- | --- | --- |
| Partner online | Mint (`--success`), pulsing dot | "Kabir is here" |
| Connected | Rose (`--primary`) | "Live" |
| Partner not joined yet | Gold (`--gold`) | "Waiting for partner" |
| Connecting | Gold, pulsing dot | "Connecting…" |
| Offline | Grey (`--muted`) | "Offline · changes saved" |

### Chat ticks

🕓 *Sending* (grey clock) → ✓ *Sent* (grey check) → ✓✓ *Seen* (blush double check).

---

## 3.10 Template inspiration (60+ patterns)

We studied many popular free UI libraries and templates, including **Aceternity UI**, **Magic UI**, **shadcn/ui blocks**, **Cruip** and **Velora UI**, and the design language of apps like **Linear, Vercel, Stripe, Apple (FaceTime, Photos, Music), Spotify, iMessage, WhatsApp, Pinterest and Excalidraw**. We did **not** copy any template's code. We re-built each idea by hand to fit UsSpace's romantic style.

| # | Pattern | Inspired by | Where in UsSpace |
| --- | --- | --- | --- |
| 1 | Aurora background | Aceternity "Aurora Background" | Behind the whole app |
| 2 | Dot pattern | Magic UI "Dot Pattern" | App background |
| 3 | Grid pattern | Magic UI "Grid Pattern" | Landing background |
| 4 | Radial edge fade mask | Magic UI pattern demos | Backgrounds |
| 5 | Cursor spotlight | Aceternity "Spotlight" | Landing hero |
| 6 | Glowing-edge card | Magic UI "Magic Card" | `SpotlightCard` |
| 7 | 3D tilt card | Aceternity "3D Card Effect" | Feature, room, game cards, photos |
| 8 | Bento grid | Aceternity / Magic UI "Bento Grid" | Landing features, Home rooms |
| 9 | Border beam | Magic UI "Border Beam" | Secret code card, love note |
| 10 | Shine / shimmer button | Magic UI "Shimmer Button" | Main buttons |
| 11 | Animated gradient text | Magic UI "Animated Gradient Text" | Headline, 404 |
| 12 | Text generate effect | Aceternity "Text Generate Effect" | Hero sub-text |
| 13 | Meteors | Aceternity / Magic UI "Meteors" | Landing hero |
| 14 | Orbiting circles | Magic UI "Orbiting Circles" | Landing hero |
| 15 | Marquee | Magic UI "Marquee" | Highlights strip |
| 16 | Number ticker | Magic UI "Number Ticker" | Days together |
| 17 | Floating particles | Magic UI "Particles", Aceternity "Sparkles" | Background |
| 18 | Ripple rings | Magic UI "Ripple" | Online avatars, incoming call |
| 19 | Confetti burst | Magic UI "Confetti" / "Cool Mode" | Heart bursts |
| 20 | Floating dock | Aceternity "Floating Dock" | Phone bottom bar |
| 21 | Command palette | shadcn/ui "Command", Linear, Raycast | `Ctrl + K` search |
| 22 | Glassmorphism | Apple visionOS | All cards |
| 23 | Sliding active pill | Vercel / Linear tabs | Sidebar, dock, tools, playlist |
| 24 | Collapsible icon sidebar | shadcn/ui "Sidebar" blocks | Desktop navigation |
| 25 | 3D page transitions | Framer site templates | Every page |
| 26 | Scroll reveal sections | Cruip templates | Landing |
| 27 | Layered 3D object | CSS 3D demos (stacked layers) | 3D heart |
| 28 | Progress ring | Apple Fitness rings | Anniversary ring |
| 29 | 3D flip card | Card-flip demos | Truth or Dare, Memory Match |
| 30 | Chat bubbles + typing dots | iMessage, WhatsApp | Chat |
| 31 | Quick reactions bar | iMessage tapbacks, Slack | Chat |
| 32 | Emoji picker popover | Slack, Discord | Chat |
| 33 | Sending / sent / seen ticks | WhatsApp | Chat |
| 34 | Camera sheet with record ring | Instagram / Snapchat camera | Chat camera |
| 35 | Full-screen video call | FaceTime, WhatsApp | Calls |
| 36 | Picture-in-picture self view | FaceTime | Calls |
| 37 | Round call controls | iOS call screen | Calls |
| 38 | Incoming call with ripples | iOS / Android ringing screen | Calls |
| 39 | Floating "on call" pill | iOS green call pill, Google Meet PiP | Minimised call |
| 40 | Masonry photo grid | Pinterest | Gallery |
| 41 | Full-screen photo viewer | Apple / Google Photos | Gallery |
| 42 | "Show on other device" | AirPlay / Chromecast "cast" | Show Kabir |
| 43 | Floating drawing toolbar | Excalidraw, tldraw | Canvas |
| 44 | Colour swatches + custom picker | Procreate, Figma | Canvas |
| 45 | Neon brush | Glow-pen drawing apps | Canvas |
| 46 | Sticker stamping | Instagram Stories stickers | Canvas |
| 47 | Cartoon photo filter | Prisma / ToonMe style apps | Canvas |
| 48 | Game invite card | Xbox / Discord activity invites | Games |
| 49 | Vinyl record player | Dribbble music concepts | Music |
| 50 | Equalizer "now playing" | Spotify | Playlist, top bar |
| 51 | Mini player pop-up | Spotify / YouTube Music mini player | 🎵 top bar |
| 52 | Search-in-playlist | Spotify, Apple Music | Music |
| 53 | Lock-screen media controls | Media Session (Android / iOS) | Music |
| 54 | Toast with action | Gmail, sonner demos | "Join game", "Look", Undo |
| 55 | Friendly empty states | Notion, Linear | Empty chat, gallery, music |
| 56 | FAQ accordion | Cruip, Velora | Landing |
| 57 | Steps with connector line | SaaS landing templates | "How it works" |
| 58 | Sticky blurred navbar | Vercel, Linear | Landing + top bar |
| 59 | Hero with two CTAs + trust row | Stripe, Cruip | Landing hero |
| 60 | Avatar stack | Magic UI "Avatar Circles" | Top bar, music |
| 61 | Pulsing online dot | Slack, Discord | Avatars |
| 62 | Mood picker | Daylio-style mood trackers | Home |
| 63 | Keyboard hint chip (`Ctrl K`) | Linear, Vercel | Search button |
| 64 | Pairing code + QR | WhatsApp Web, Signal linking | Secret code screen |
| 65 | Live status pill | Linear, Slack, Discord | Connection pill |
| 66 | PIN lock screen | iOS passcode, banking apps | App lock |
| 67 | Blur in app switcher | Banking apps | Privacy blur |
| 68 | Danger zone | GitHub settings | Close room |
| 69 | Pulsing heart loader | Brand loaders | Page loading |
| 70 | Playful 404 | Many SaaS templates | Not-found page |

---

## 3.11 Layout and screen sizes

| Screen | Width | Layout |
| --- | --- | --- |
| Phone | < 768 px | Top bar + **floating bottom dock** (Home, Chat, Gallery, Games, More). Single column. |
| Tablet | ≥ 768 px (`md`) | **Sidebar** appears (groups: Us · Create · Play). Cards become 2 columns. |
| Laptop | ≥ 1024 px (`lg`) | Up to 4 columns in the gallery, playlist beside the player. |
| Wide | ≥ 1280 px | Content is centred and capped at 1152 px. |

- On phones narrower than 440 px, the top bar shows only the heart logo (no "UsSpace" word), so 🔍, 🎵, 💖 and the profile button always fit.
- The sidebar can collapse to icons (`Ctrl + B` or the panel button).
- The chat and the call fill the screen. Other pages scroll inside the main area.
- The canvas keeps the same shape on every screen (coordinates 0–1000), so drawings match on both phones.
- Safe areas on phones with notches are respected (`env(safe-area-inset-bottom)`). The floating call pill sits above the dock.

---

## 3.12 Accessibility

- ✅ Colour contrast above WCAG AA.
- ✅ Every icon-only button has an `aria-label` ("Tell Kabir you're missing them", "Accept", "End call", "Undo my last stroke", "Play Kesariya", "Now playing: …").
- ✅ Dialogs and pop-ups have titles (visible or screen-reader only).
- ✅ Keyboard: Tab through everything, `Enter`/`Space` to press, `Esc` to close, plus shortcuts (`Ctrl + K`, `Ctrl + B`).
- ✅ Focus rings use the brand colour (`:focus-visible`).
- ✅ `aria-current="page"` on the active link, and `aria-pressed` on toggles and canvas tools.
- ✅ Reduced motion: animations shorten, and the turning heart, particles and big bursts calm down.
- ✅ The connection pill is a polite live region (`role="status"`), so changes are announced.
- ✅ Chat ticks say "Sending", "Sent" or "Seen" to screen readers.
- ✅ Tic-tac-toe squares are named ("Play square 5", "Square 5, Kabir").
- ✅ Errors use `role="alert"`.

---

## 3.13 Words and tone

- **Warm, short, playful.** "Say hello 👋", "💖 Riya is missing you", "Kabir invites you to play Tic-Tac-Toe!".
- **Talk to the couple.** Use "you" and their real names.
- **Honest.** We say "End-to-end encrypted" only because it's true, we show "Offline · changes saved" when it's offline, and "Close room" clearly says it deletes everything for both of you.
- **Never about how the site was built.** The website talks only about love, not about tools.

---

## 3.14 How to change the look

| I want to… | Change this |
| --- | --- |
| Change the main colour | `--primary` in `src/index.css` |
| Change the gradient | `--gradient-primary` in `src/index.css` |
| Change fonts | The Google Fonts link in `index.html` + `fontFamily` in `tailwind.config.ts` |
| Make corners rounder | `--radius` in `src/index.css` |
| Slow down or speed up loops | `keyframes` / `animation` in `tailwind.config.ts` |
| Change the 3D heart | `size` / `layers` in `src/components/fx/Heart3D.tsx` |
| Change canvas colours or stickers | `COLORS` / `STICKERS` in `src/pages/Canvas.tsx` |
| Change words, love notes or game prompts | `src/lib/content.ts` |
| Change the sidebar / dock items | `src/lib/nav.ts` |

**Back:** [← 2 · Approaches](02-approaches.md) · **Next:** [4 · Flowcharts →](04-flowcharts.md)
