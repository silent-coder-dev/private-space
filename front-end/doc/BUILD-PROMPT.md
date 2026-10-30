# BUILD-PROMPT — Rebuild UsSpace from scratch

> Give this whole file to a coding agent. It describes the **exact** UsSpace website: product, design, architecture,
> protocol, every screen, every rule, limits, tests and deployment. Follow it step by step and check each phase before the next.

---

## 0. The prompt (copy from here)

You are building **UsSpace**: a private, end-to-end encrypted web app for **two people per room** ("a private little world for two").
Any number of couples can use the same website; each couple creates its **own room** with a secret code, and each room holds **exactly two devices**.
When a room is **closed, everything is deleted** — on the server and on both phones. This is the most important promise.

**Hard rules**

1. The website must **never** mention AI, "vibe coding", Lovable, Claude, GPT or how it was built. It talks only about love and privacy.
2. Everything lives in **one folder `front-end/`**: the React website (`src/`) and the small Node server (`server/`). No separate back-end folder.
3. It must run **free**: Render free web service (512 MB RAM, sleeps after 15 min, no disk). Optional add-ons must also be free tiers.
4. The server never sees content: messages, photos, videos, drawings, names, call set-up and backup-call audio/video are all encrypted on the phone.
5. Write all docs in **easy English** (short sentences, tables).
6. Quality bar: `typecheck` clean, `lint` 0 errors, unit + page + server tests, **two-browser Playwright tests including real calls**, production build. Look at every screen in a real browser on desktop (1440×900) and phone (390×844) before calling it done.

---

## 1. Tech stack (use these)

| Area | Choice |
| --- | --- |
| App | **React 18.3 + TypeScript 5.8 + Vite 5.4** (`@vitejs/plugin-react-swc`), React Router 6 (lazy pages) |
| UI | **Tailwind 3.4** + `tailwindcss-animate`, **shadcn/ui** (Radix) components, `lucide-react` icons, `sonner` toasts, `cmdk` command menu, `qrcode` |
| Motion | **framer-motion 12** + CSS 3D |
| Crypto | `@noble/ciphers` 1.3 (XChaCha20-Poly1305) + `@noble/hashes` 1.8 (HKDF, HMAC, SHA-256, PBKDF2) |
| Server | Node ≥ 18.18 (20 recommended), **`ws` 8.18**, plain ESM `.mjs` with JSDoc types (no build step) |
| Phone storage | **IndexedDB** (fallback localStorage) |
| Calls | WebRTC + AudioWorklet backup path |
| Tests | **Vitest 3** + jsdom + Testing Library; **Playwright** (Chromium, fake camera/mic) |

Scripts: `dev` (vite, port 8080), `build`, `start` (`node server/index.mjs`), `test` (vitest run), `test:e2e` (playwright), `typecheck` (`tsc -p tsconfig.app.json --noEmit`), `lint` (eslint).

---

## 2. Design system

**Idea:** "A warm light in a night sky, just for two." One **dark** theme. Glass cards, rose→violet gradient, aurora light, floating hearts, gentle 3D.

**Colour tokens** (CSS variables in `src/index.css`, used via Tailwind names):

| Token | HSL | Hex |
| --- | --- | --- |
| `--background` | 236 36% 6% | #0A0B15 |
| `--card` | 236 30% 12% | #151728 (used at 60% + blur) |
| `--popover` | 236 32% 10% | #111222 |
| `--sidebar-background` | 236 34% 8% | #0D0E1B |
| `--muted` / `--accent` | 236 22% 18% / 236 24% 18% | |
| `--border` | 236 22% 20% | #28293E |
| `--foreground` / `--muted-foreground` | | #F8F8FC / #B2B2C7 |
| `--primary` (rose) | 349 100% 65% | #FF4D6D |
| `--secondary` (violet) | 270 67% 59% | #9650DC |
| `--blush` | 330 100% 76% | #FF85C2 |
| `--gold` | 42 100% 66% | #FFCB52 |
| `--success` (mint) | 152 69% 52% | #30D98A |
| `--destructive` | 0 84% 60% | #EF4343 |

- **Brand gradient** `.gradient-primary`: 135° `#FF4D6D → #EC51EC → #9650DC`; `.gradient-soft` same at 18%; `.text-gradient`, `.text-gradient-animated` (rose→pink→violet→gold, 8 s), `.glow-primary`, `.border-beam`, `.shine`.
- **Glass** `.glass-card`: `rounded-2xl`, 1 px `white/7%` border, card colour at 60% + `backdrop-blur(24px)` from `md` up; on phones 75% + `blur(12px)` (much cheaper to draw). Inset top light + soft drop shadow. The aurora only moves from `md` up (still on phones).
- **Fonts (Google):** headings **Sora** 400–800, body **Plus Jakarta Sans** 300–700, handwriting **Caveat** 500/700 (love note). Codes in monospace, letter-spaced, gradient.
- Radius `--radius: 1rem`. Page padding 16/24/32 px. Content max 1152 px.
- **Motion:** ease `cubic-bezier(0.16,1,0.3,1)`; springs `stiffness 380, damping 32`; page change = **no exit animation** (the old page is removed at once) and the new page fades + rises 8 px in 0.18 s, keyed by path, scroll reset in a layout effect; buttons scale 0.97 on press; **call buttons never move on hover**; respect `prefers-reduced-motion`.
- **3D:** `Heart3D` = 16 stacked SVG hearts in depth (`translateZ`), spinning `rotateY` 9 s; tilting `SpotlightCard` (≤ 9°, mouse light); flip cards; Connect Four hearts fall with a spring.
- **Avatars:** `InitialAvatar({name, photo, size: xs|sm|md|lg|xl|2xl, online})` shows the photo (round, `object-cover`, `alt` = name) or the first letter on the gradient; `UserAvatar({who: "me"|"partner"})` picks from the profile. Use it everywhere (top bar, sidebar, chat, calls, music, Home, Profile, lock screen).
- **Effects components:** AuroraBackground, FloatingParticles (dots + tiny hearts), SpotlightCard, NumberTicker, SlotNumber, WordReveal, Marquee, Meteors, OrbitingIcons, ProgressRing, Equalizer, Reveal, BurstLayer (`fireHearts()` / `fireFrom(el)` heart bursts).
- **App icon:** white-highlighted gradient heart on the night background (SVG favicon + PNG 192/512/maskable 512/apple-touch 180).

**Layout:** desktop = collapsible sidebar (groups Us: Home, Chat · Create: Gallery, Canvas · Play: Games, Music; footer = **profile card** linking to `/profile` with both avatars, "{me} with {partner}", days together + anniversary progress, and a **Log out** button) + top bar (page title, connection pill, search `Ctrl K`, 🎵, 💖, and **both avatars as the account-menu button** `aria-label="Your profile and account"`: header with your photo, name, "With {partner} · N days", then Profile & settings, Lock now (only with a PIN), Log out). Phone (< 768 px) = top bar + **floating bottom dock** (Home, Chat, Gallery, Games, More). Under 440 px wide the top bar shows only the heart logo (no word) so 🔍 🎵 💖 and the avatars fit.

---

## 3. Security & crypto (implement exactly)

- **Secret code:** 16 random chars from Crockford base32 `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (80 bits), displayed `XXXX-XXXX-XXXX-XXXX`. Normalise input: upper-case, strip non-alphanumerics, `O→0`, `I/L→1`, `U→V`.
- **Keys (HKDF-SHA256, salt `"usspace/v1"`, ikm = normalised code):** `room-id` → 16 B hex = **roomId**; `auth` → 32 B = **authKey** (hex), server stores only **verifier = sha256(authKey)**; `e2e-encryption` → 32 B **encKey**; `item-key` → 32 B **macKey**.
- `itemKey(col,id)` = first 32 hex of `HMAC-SHA256(macKey, col + "\0" + id)` (opaque labels so the server can keep "newest per item").
- `seal(value)` = base64(nonce24 ‖ XChaCha20-Poly1305(encKey, nonce, AAD = utf8(roomId)).encrypt(utf8(JSON)))`; `open()` returns null on tamper. `sealBytes / openBytes` = same without JSON/base64 (call frames).
- **2-device lock:** a room accepts exactly two device ids (random 16 B hex per phone). A third device gets `full`, even with the code.
- **Anti-guessing:** per-IP token buckets — connections 40 burst / 1 s⁻¹, auth tries 15 / 0.2 s⁻¹ (only wrong guesses or creates use a try; correct reconnects are free); a room locks after 10 wrong tries in 15 min.
- **PIN lock (optional, per phone, `src/lib/pin.ts` + `AppLock.tsx`):** 4–8 digits → PBKDF2-SHA256 (`pbkdf2Async`), 150 000 rounds, 32 B, random 16 B salt; store `{salt, hash, length}` under room key `app-lock` (so it disappears with the room). Locked when the app opens. **Locks instantly** on `visibilitychange` → hidden (tab switch, minimise, home screen, phone lock) using `flushSync(() => setLocked(true))` so the app-switcher snapshot already shows the lock. Exception: a click on an `input[type=file]` inside the app sets a 120 s grace (cleared on window `focus`) so the photo picker / camera don't lock it. The app **stays mounted** behind the lock: its wrapper gets `inert` and `<html>` gets `.app-locked` (which hides the sonner toaster). Wrong tries are stored (`app-lock-fails`): 5 wrong → wait 30 s, survives reloads. `useAppLock()` → `{enabled, lockNow}`. **Privacy blur** (`filter: blur(28px)` on `#root`) while the page is hidden.
- **Profile photos without a database:** `avatarFromFile(file, 320)` centre-crops to a square, JPEG 0.82, stored as a data URL in your shared `member` doc (`photo`), so it is end-to-end encrypted, synced to the partner, forgotten by the server once both have it, and deleted on close room / log out.
- **Server headers:** CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' ws://HOST wss://HOST; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY`, HSTS when `x-forwarded-proto: https`.

---

## 4. Shared-data engine (phone side, `src/sync/engine.ts`)

- Everything shared is an **item** in a **column**. A change is a **Put** `{col, id, data | null, ts, by}` (null = delete).
- **Last writer wins** by `(ts, by)`; `ts` = server-synced clock; local puts use `max(now, prev.ts + 1)`.
- **Tombstones** remembered 60 days. Lists keep time order; `messages` keeps the newest 600.
- **Written in the author's words:** puts from the partner are **flipped** (`me ↔ partner`) per column.
- Columns: lists `messages (flip sender)`, `photos (flip from)`, `strokes (flip by)`, `stickers (flip by)`; docs `member` (id me/partner flipped), `read` (id flipped), `couple`, `player`, `tod`, `game (flip by)`, `gview (flip by)`, `ttt (board cells, turn, starter)`, `scores (swap me/partner)`, `memory (turn, points)`, `wyr (picks)`, `c4 (board, turn, starter, wins)`, `rps (picks, history[])`, `nhie (answers, haves)`, `quiz (subject, points)`, `daily` (id me/partner flipped: `{answers: {"YYYY-MM-DD": {text, at}}}`), `note` (id me/partner flipped: `{text, at}`), `meet` (`{at: number|null, label}`). The `member` doc also carries `photo?` (data URL).
- **Persistence:** IndexedDB db `usspace`, store `kv`, key prefix `r:<first 16 of roomId>:`; keys `item:<col>/<id>`, `doc:<key>`, `local:<key>`, `sync-meta`. Save **one item at a time**, debounced 300 ms, but every flush writes **all dirty keys + meta in ONE transaction** and resolves `true` only when committed. Also flush on `pagehide` and when the page becomes hidden. `put()` queues the outbox entry **before** flushing so item + outbox are saved together. Fallback to localStorage (prefix `usspace:v1:`) when IndexedDB is missing (tests).
- React hooks: `useSyncedList(col)`, `useSyncedDoc(col, id, fallback)`, `usePendingIds(col)`, `useEngine()` (useSyncExternalStore).

---

## 5. Relay server (`server/relay.mjs` + `store.mjs`)

WebSocket at **`/ws`** (noServer + `handleUpgrade`), attached to the Vite dev/preview server by a plugin and to `server/index.mjs` in production. `maxPayload` **16 MB**, no compression. Every connection handles text messages **one at a time in order** (async queue); binary frames bypass the queue.

**Client → server**

| Message | Meaning |
| --- | --- |
| `create {v:1, room, verifier, device}` | New room (fails `closed` / `exists`). New random 16-hex **epoch**. |
| `join {v:1, room, auth, device, since, epoch?}` | Checks: valid → not closed → IP tries → room (memory, else DB record) → room not locked out → `sha256(auth) == verifier` (constant-time) → member or free seat. If `epoch` differs from the room's, send **everything** (since = 0). If `since < room.floor`, ask the other phone to **resync**. |
| `put {ref, key, e}` | Store (newest per key) + forward as `event`. Errors carry `ref`: `rate_limited`, `busy` (memory cap), `bad_request`, `not_found`. |
| `seen {seq}` | Phone has **safely saved** up to seq. When both members have, drop all events ≤ that seq (`floor`). |
| `signal {e}` | Forward only (typing, heart, nudge, call). Max 64 KB, 120 burst / 20 s⁻¹. |
| `ice {ref}` | Reply `ice {ref, servers}` (STUN + TURN) — members only. |
| binary frame | Encrypted call audio/video: forward to the partner's sockets, never store. Max 96 KB, 1 MB burst / 300 KB s⁻¹ per connection; skip peers with > 1 MB buffered. |
| `leave` | Free this seat (delete room if empty), close other tabs of this device. |
| `close` | **Delete the room**, remember "closed" (memory 180 d + DB), send `closed` to every socket, close them. |
| `ping` | → `pong {now}` |

**Server → client:** `welcome {room, epoch, now, head, members, partnerOnline, partnerSeen}`, `batch {events:[{seq,e}], done}` (split by 200 events or 4 MB), `event {seq,e}`, `ack {ref,seq,at}`, `presence {members, partnerOnline, partnerSeen}`, `signal {e}`, `ice`, `resync`, `closed`, `error {code, message, ref?}` (codes: not_found, full, denied, rate_limited, bad_request, exists, left, closed, busy).

**Store:** memory only by default (`USSPACE_DATA_DIR` optionally mirrors to disk with temp-file + rename). Limits: 6000 events/room, **80 MB/room**, **320 MB total** (`append` returns null → `busy`), rooms untouched for 60 days are dropped (phones re-create them). Heartbeat ping every 30 s, auth timeout 10 s, max 8 sockets per room.

**Optional free database (`server/kv.mjs`, Upstash Redis REST):** env `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`; POST JSON arrays (`["SET",k,v,"EX",ttl]`), 2 attempts, 4 s timeout. Keys: `usspace:closed:<roomId>` = "1" (180 days) and `usspace:room:<roomId>` = `{verifier, createdAt, members:[device ids]}` (90 days, refreshed daily, deleted on close / last leave). Only consulted when a room is not in memory. **Never store content.** After a restart a room is restored from its record with a **new epoch** and no events (both phones re-upload).

**TURN (`server/ice.mjs`):** always STUN `stun:stun.cloudflare.com:3478`, `stun:stun.l.google.com:19302`. If `CLOUDFLARE_TURN_KEY_ID` + `CLOUDFLARE_TURN_API_TOKEN`: `POST https://rtc.live.cloudflare.com/v1/turn/keys/<id>/credentials/generate-ice-servers` with `Bearer` token and `{"ttl":86400}`, drop `:53` URLs, cache 12 h. Else static `TURN_URLS` (comma list) + `TURN_USERNAME` + `TURN_CREDENTIAL`. Log the mode at start-up.

**Production server (`server/index.mjs`):** serves `dist/` (immutable cache for `/assets/`, `no-cache` otherwise), gzip for text types, **HTTP Range** (206/416) for audio, `/music/manifest.json` (lists `dist/music`), `/healthz`, SPA fallback to `index.html`, only GET/HEAD. Env: `PORT` (8080), `HOST`, `TRUST_PROXY=1` (use X-Forwarded-For), `ALLOWED_ORIGINS`, `USSPACE_DATA_DIR`, plus the optional DB/TURN vars.

---

## 6. Sync client (`src/sync/client.ts`)

- One WebSocket per room; `binaryType = "arraybuffer"`; reconnect with jittered backoff 0.5 s → 15 s, reconnect at once on `online` / page visible.
- **Outbox** (saved in engine local `sync-outbox`): every local put is sealed + queued; **≤ 20 in flight and ≤ 16 MB**; next ones go as acks return; errors with `ref` → retry after 2 s (15 s for `busy`); `bad_request` drops the item.
- **Catch-up:** join with `since = sync-seq`; `sync-seq` and `sync-epoch` are saved **in the same IndexedDB transaction** as received items.
- **Epochs:** if the welcome epoch differs from the stored one → reset seq to 0 and **re-upload the whole local snapshot** after catch-up. On `not_found` with a saved room → switch to `create` (re-create from this phone); `exists` → back to `join`.
- **seen:** 800 ms after new events, await `engine.flush()`; if true, send `seen {seq}`.
- Server clock offset from `welcome.now`; `serverNow()` is the engine clock.
- API: `sendSignal`, `sendMedia(bytes)` (sealed; dropped if not ready or > 384 KB buffered), `iceServers()` (4 s timeout), `closeRoom()` → **false when offline**, `leave()`, `backlog`.

---

## 7. Pages & features

Routes: `/` landing · `/start` · private (guarded by `RequireRoom` → `/start`): `/dashboard`, `/chat`, `/gallery`, `/canvas`, `/games`, `/music`, `/profile` · `/home` → `/dashboard` · `*` → playful 404. Provider order for private pages: `RequireRoom > SpaceProvider > AppLock > CallProvider > MusicProvider > AppLayout`, all in **`src/PrivateArea.tsx`, lazy-loaded** (the landing is lazy too; main chunk ≈ 160 KB). Pre-load the private area and every page when the browser is idle. Server sends **Brotli** (quality 11) or gzip, cached in memory per file + encoding.

### Landing (`/`)
Sticky blurred nav (logo, Features, How it works, FAQ, "Open UsSpace"). Hero: badge "A private little world for two", headline **"Where two hearts feel at home."** (second line animated gradient), sub-text: "UsSpace is a private room for you and your person, opened only with your secret code. Chat with photos and videos, call each other, share a gallery, draw together, play games and listen to your songs in sync." CTAs "Enter our space" (→ /dashboard if in a room, else /start) + "See what's inside". Trust row: End-to-end encrypted · Locked to 2 devices · Live on both phones. Right: orbiting icons around a beating heart (chat, video, music / image, games, palette, phone, camera), meteors, cursor spotlight. Then: marquee of 12 feature chips; 4 stat tiles (rooms, **8** games, prompt count, love-note count); feature bento of 7 tilting cards **with tiny live demos** (chat bubbles + typing dots; call card with rolling timer; close-room items vanishing; mini Tic-Tac-Toe; music card with equalizer; 3 photos + self-drawing heart; heart flying between two avatars); "How it works" 3 steps with a drawn connector line; FAQ accordion (free? how to connect? who can read? code found? calls? closing? offline?); final CTA "Create our room — it's free"; footer.

### Start (`/start`)
Choose (two tilting cards: **Create a room** ✨ / **Join a room** 🔑, green security strip) → Create form (Your name, Together since date ≤ today, spinner "Creating a secure room…") → **Secret code** card (border beam, big gradient code, Copy · Share (Web Share) · QR (qrcode, white tile; link carries the code after `#`), pulsing "Waiting for your partner…" then "💞 Kabir joined!", "Enter our space") → Join form (self-formatting code field `XXXX-XXXX-XXXX-XXXX`, 16/16 counter, name, red `role="alert"` errors with friendly text per error code).

### Home (`/dashboard`)
Invite banner until the partner joins (→ `/profile`). **Hero** `SpotlightCard`: both avatars joined by 💞 (partner with online dot), greeting by time of day + name, partner status, **days together** (number ticker) + "days together", chips: years (gold), "Anniversary in N days", next **milestone** (`MILESTONES = [100,200,300,500,750,1000,1500,2000,2500,3000,3650,4000,5000,7500,10000]`, "✨ 1,500 days in 147"; heart burst once on the day, remembered in storage), **3D heart** (hidden on phones). Four equal action buttons (`grid-cols-4`; icon above label on phones): gradient **Missing you** (`aria-label` "Tell {partner} you're missing them"), glass **Thumb kiss**, **Video call**, **Voice call**. Then a `lg:grid-cols-3 items-start` grid with **two independent columns** (no stretched cards): left (`col-span-2`) = **Question of the day** + **mood picker** (8 moods with labels: 🥰 Loved, 😊 Happy, 🤗 Cuddly, 😴 Sleepy, 🥺 Missing you, 🔥 Excited, 😌 Calm, 🤒 Not great — shared live; partner chip "{partner} · {emoji} {label}"); right = **Next time together** + **Notes for each other**. Then the **love note of the day** in handwriting (20 notes, rotate daily) with "Send to {partner}", and "Your rooms" cards (2 per row on phones, 5 on laptops) with live info.

**Question of the day** (`QuestionCard`): 50 questions in `DAILY_QUESTIONS`; index = UTC day number (`floor(serverNow / 86 400 000)`) mod 50, key `YYYY-MM-DD`. Form (Textarea `aria-label="Your answer"`, Enter shares, max 280) with hint "{partner} answered ✓ — answer to see it" or "{partner} sees your answer once they answer too". After answering: chat-like bubbles "You" and "{partner}" (or "Waiting for {partner}'s answer…"), "Edit my answer", "Past answers" dialog (last 14 days). Keep 60 days.

**Next time together** (`MeetCard`, shared `meet` doc): empty state "When do you see each other next?" + **Set a date** dialog (`When` datetime-local, `What (optional)` label) → **Start countdown**; shows the label, four glass tiles (days, hrs, min, sec, ticking each second), the full date; "Together today!" within 24 h; edit / remove. Partner gets "📅 {name} set your next time together".

**Notes for each other** (`NoteCard`, `note` doc per person): partner's note as a gold→blush sticky note in handwriting ("From {partner}", time ago) or "No note from {partner} yet."; your current note with ✕; input "Leave a note for {partner}" + **Leave** (max 120). Partner gets "📝 {name} left you a note".

**Thumb kiss** (`ThumbKiss`, global in `AppLayout`, opened from Home / Ctrl K): full-screen pad (`aria-label` "Touch pad — put your thumb here", close button "Close thumb kiss"); `touch` signals: `{invite:true}` on open, `{x,y}` (0–1) every 70 ms while pressed + keep-alive 500 ms, `{up:true}` on release. Your thumb = rose fingerprint glow, partner = violet; partner's fades 1.5 s after the last signal. Distance < 0.12 → "Thumb kiss! 💞" + 💋 + `vibrate` every 600 ms + heart bursts. When the pad is closed, an invite shows a toast "👆 {partner} wants a thumb kiss" with **Join** (and a notification in the background).

### Chat (`/chat`)
Header: partner avatar + online dot, "Online now" / "typing…" / last seen, voice + video call, 💖, menu (clear chat for both). Encrypted notice. Messages grouped by sender (5 min), day separators, my bubbles gradient, partner glass; photos (JPEG ≤ 1280 px, q 0.8) open full screen; videos inline. Ticks 🕓 sending / ✓ sent / ✓✓ seen (partner's `read` doc). Reactions bar on hover (❤️ 😂 😮 🥺 🔥) + **double-click = ❤️** (clear the text selection). Emoji picker (32 emoji). Typing signal at most every 2.5 s (only marked sent if it really went out), shown 4 s. Show newest 80, "Show 80 earlier messages". **Opens at the newest message** (layout effect) and stays pinned while media loads (ResizeObserver) unless the user scrolled up; then a floating **"↓ Latest messages"** pill. Enter sends, Shift+Enter new line, IME-safe. Messages with "love/❤/💕/💖" fire a small heart burst.
**Camera sheet:** live preview, Photo/Video switch, flip camera, record with a timer **up to 2:00** (`MediaRecorder` 400 kbps video + 48 kbps audio, timeslice 250 ms, auto-stop at 95% of **8 MB**), preview → Retake / Send. Picked videos ≤ 8 MB ("Record up to 2 minutes with the camera button, or pick a shorter clip").

### Calls (global, `src/call/`)
- Start only if the partner has joined and is online (else friendly toast: calls ring when UsSpace is open on their phone; send a 💖). Create + resume the **AudioContext inside the tap** (iOS). Get mic (+camera 1280×720 ideal) and routes (`iceServers()`) in parallel.
- Signals (all encrypted `call` signals with a random call id): `ring` every 3 s for 45 s (ringtone 660/880 Hz beeps + vibration; "didn't answer" after 45 s) → `accept` / `decline` / `busy` → caller `offer` immediately → `answer` → **trickle** `ice {c: candidates[]}` batched every 120 ms (buffer candidates until the remote description is set). Glare: if both ring, the phone with the smaller device id answers the other call. `end` from either side; missed call toast + notification; hang up on `pagehide`.
- **Repair:** `disconnected` for 5 s → caller does one ICE restart (`createOffer({iceRestart:true})`, `restart:true`); callee waits.
- **Backup path:** if not `connected` within **15 s** (callee 18 s), or failed after repair → send `relay` and both switch: close the peer connection, start `RelayMedia`:
  - AudioWorklet file `public/call-audio-worklet.js`: `usspace-capture` (average-downsample mic to 16 kHz, Int16, 640-sample = 40 ms chunks) and `usspace-player` (32k ring buffer, start after 100 ms, skip ahead if > 500 ms behind, linear-interpolation resample).
  - Packet = 1 type byte (1 audio, 2 video) + payload; audio = **G.711 μ-law** of the 640 samples; video = JPEG of the camera (max side 360 px, quality 0.6) every 125 ms, skipped when > 96 KB is buffered; frames > 90 KB dropped. Each packet `sealBytes` → binary WS. Draw received JPEGs on a canvas (newest only); "remote video on" = a frame in the last 1.5 s.
  - Chip "🛡️ Connected through UsSpace · encrypted".
- Test hooks: `localStorage["usspace:call-path"]` = `"relay"` (skip WebRTC) or `"no-direct"` (`iceTransportPolicy: "relay"` → watchdog fallback); `window.__usspaceCallStats()`.
- **Call UI:** full screen; video = partner fills screen + my mirrored tile top-right; voice = avatar with ripples, name, timer **centred**, "🛡️ End-to-end encrypted"; round 56 px buttons (mute, camera off, switch camera, minimise, red end) that don't move on hover; incoming = Decline (red) + Accept (green, ripple glow *behind* it, `z-index` above). Remote audio in a hidden `<audio>`; call `play()` explicitly and show **"Tap to hear {partner}"** if blocked. Minimised = floating glass pill (avatar, timer, mute, open, end) above the phone dock.

### Missing you
Tap 💖 (top bar, Home, Ctrl K): 22-heart burst from the button; partner online → live `heart` signal → partner gets a 30-heart burst + toast "💖 {name} is missing you" (+ notification in background); offline → a "💖 I'm missing you" chat message.

### Gallery (`/gallery`)
Add many photos (each JPEG ≤ 1600 px, q 0.8), masonry 2/3/4 columns of tilting cards (hover caption *inside* the image wrapper), full-screen viewer (arrows, swipe), **Show {partner}** (shared `gview {id, by, at}` → opens on the partner's screen, or a toast "👀 wants to show you a photo · Look"), save, delete with Undo, **Voice chat** button (audio call, minimised).

### Canvas (`/canvas`)
Board measured in **units**: width 1000; height = `max(750, ceil((lowest drawing + 350)/250)*250 + extra)`, capped 5000. Canvas pixels per unit = `min(1.2, √(6000/height))`. Layers: background (cream `#FFF8F0` paper, faint violet line each 750 units, stickers + photos), ink (strokes in order; eraser = `destination-out`, only ink), live stroke. Tools: Pen, Neon (glow + white core), Eraser (2.5× size), Stickers (16 emoji: ❤️ 💖 😘 🥰 😂 🌹 ⭐ 🌙 ☀️ 🐱 🐶 🧸 🎈 🍕 👑 💍, 90 units), **✋ Scroll** (touch-action pan-y; other tools touch-none). 9 colours (#FF4D6D #FF85C2 #9650DC #4D9FFF #30D98A #FFCB52 #FF8A3D #FFFFFF #111222) + any-colour picker, 4 sizes (0.004–0.03 of width). Photo button (JPEG ≤ 900 px, ≤ 600 units, placed in the middle of what you see). **Sticky glass toolbar**. Undo (my newest stroke/sticker/photo), Save (whole board PNG), Clear for both (confirm). "↓ More space" button. Items carry `v: 2`; convert older 4:3 items (y × 0.75 for strokes; x×1000, y/h×750, w×1000 for stickers). **No cartoon filter.**

### Games (`/games`) — 8 two-player games
Shared `game {game, status: "invited"|"playing", by, at}`. Card grid (`max-w-6xl`, 2 per row on tablets, 3 on laptops, 4 on wide screens; compact cards: 48 px emoji tile, title `leading-tight`, 40 ms stagger) → **Invite {partner}** → "Waiting for {partner} to join…" (Cancel) → partner gets a 15 s toast "🎮 {name} invites you to play X" + **Join game** (`/games?join=1`), or a notification → joiner resets the game doc so **the inviter moves first** → "End game". "Games need two players" if the partner hasn't joined. Celebrate wins with heart bursts on both phones.

| Game | Rules |
| --- | --- |
| ❤️ Tic-Tac-Toe | ❤️ vs 💜, 3 in a row, scoreboard (`scores` doc), the other person starts the next round |
| 🔴 Connect Four | 7×6 board, 💖 vs 💜 drop to the lowest free row, 4 in a row across/down/both diagonals, winning slots glow gold, wins + draws, alternate starter |
| 💘 How Well Do You Know Me? | 26 questions × 4 answers; the *subject* picks the true answer in secret, the other guesses; reveal (green answer / red wrong guess); right guess = +1 for the guesser; roles swap |
| ✂️ Rock Paper Scissors | secret picks (🪨 📄 ✂️), face-down cards flip on reveal, score from the round history, **first to 3** wins the match |
| 🙋 Never Have I Ever | 36 gentle prompts; both answer "🙋 I have" / "🙅 Never" in secret; reveal + tally |
| 🎲 Truth or Dare | ~15 truths, ~14 dares, Surprise; the drawn card flips on both phones; never the same twice in a row |
| 🧠 Memory Match | 8 pairs (💖 🌹 🧸 💌 🍫 🎵 🌙 💍), take turns flipping 2; a pair scores and keeps the turn |
| 🤔 Would You Rather | ~15 pairs; both pick in secret; "💞 You both picked the same!" or "talk about it" |

Question order is the **same on both phones**: shuffle with a shared seed (LCG `s = (s*1103515245+12345) % 2^31`).

### Music (`/music` + global)
`public/music/` holds the user's own songs (`.mp3 .m4a .aac .ogg .oga .opus .wav .flac .webm`; a `PUT-YOUR-SONGS-HERE.txt` note). Server/dev plugin list them at `/music/manifest.json` → `{songs:[{id, url:"/music/"+encodeURIComponent(name), title}]}` (title = file name without extension, `_` → space, sorted A–Z); the build writes it into `dist/music`. **One `MusicProvider`** for the whole private area with a single `new Audio()` (`preload = "metadata"`), shared doc `player {songId, playing, position, at, shuffle, repeat: "off"|"all"|"one"}`; position now = `position + (now − at)` if playing; correct drift > 1.5 s; on end: repeat one / stop at last / next (random with shuffle); volume per phone; `play()` blocked → "Tap to hear it here"; **MediaSession** metadata + play/pause/next/prev/seek. Music page: tipped 3D vinyl spinning while playing, title, "Song X of N", "Listening together" + equalizer, progress slider, shuffle/prev/play/next/repeat, volume, **searchable playlist** with sliding highlight, "Add your songs" empty state. **🎵 top-bar popover** on every page (equalizer icon while playing; aria-label "Now playing: {title}").

### Profile (`/profile`, no settings dialog)
Header card: gradient banner; only the **2xl photo** overlaps it (`-mt-14 sm:-mt-16`), with a round camera button (no photo → opens the picker, `aria-label` "Add a profile photo"; with a photo → small menu "Choose a new photo" / "Remove photo", `aria-label` "Change or remove your photo"); name (h1) + "Together with {partner} since {date}" below the banner; partner chip (photo, online / away / not joined); 3 stats (days together, years, days to anniversary). Cards (2 columns on laptops): **Your details** (Your name, Together since ≤ today, "Save changes" → "✓ Saved"), **Your private room** (status pill, code hidden/reveal/copy, share link `/start#join=CODE`, lock/encryption notes), **PIN lock** (Set a PIN → keypad new → confirm; then Lock now / Change (current → new → confirm) / Turn off (current)), **Notifications on this phone** (Turn on/off; iPhone hint; "Blocked"). **Your account on this phone**: "Log out of this phone" (opens the global log-out dialog) + red **Close room & delete everything** (confirm; offline → error "connect to close the room"). Footer: "🔒 Your photo, name and date are shared only with {partner}, end-to-end encrypted, and kept on your two phones — never in a database."

### Log out (global `LogoutDialog`)
Opened from the sidebar, account menu, Profile, Ctrl K, or "Forgot PIN?". "Log out of this phone?" + "Save your secret code first" (code + Copy) + **Stay** / **Log out** (`leave` → frees the seat, wipes this phone, back to the landing; the partner keeps everything).

### Lock screen
Full screen (`role="dialog"`, `aria-label` "UsSpace is locked"): your photo with a gradient lock badge, "Hi {me}, UsSpace is locked", "Enter your PIN" / "That PIN isn't right. Try again." / "Too many tries. Try again in N s.", 4–8 dots, **`PinPad`** (round 64 px keys 1–9, 0, delete; keyboard digits / Backspace / Enter; auto-submit 80 ms after the last digit when the length is known, else an OK key), dots shake red on a wrong PIN, "Forgot PIN?" → Log out confirm.

### Close room flow
Online only → `close` → server deletes room, stores closed record → `closed` to both → each phone wipes IndexedDB + local storage + session → toast "🔒 The room was closed. Everything was deleted." → landing. Offline partner gets `closed` on reconnect (also after restarts when the DB is on) and wipes.

### Notifications + install (PWA)
`public/manifest.webmanifest` (name/short_name UsSpace, start_url `/dashboard`, standalone, colours #0A0B15, icons incl. maskable), apple meta tags. `public/sw.js`: **no caching**; `install → skipWaiting`, `activate → clients.claim`, `notificationclick` → focus an open window and `postMessage({t:"open", url})` (app navigates) or `openWindow(url)`. Register at start-up (secure context). Show notifications **only when the page is hidden**, never with message text: "📞 {name} is calling…" (sticky, tag `call`, cleared on answer/end), "📞 Missed call", "💬 {name} — New message", "🖼️ Added a photo", "💖 {name} is missing you", "🎮 invites you to play X", "👀 Wants to show you a photo". Preference key `usspace:notifications`.

### Other
Quick search `Ctrl/⌘ K` (rooms + Profile + actions: I'm missing you, Thumb kiss, Video call, Voice call, Add photos, Draw together, Invite to a game, "Profile, photo, room code & settings", Lock now (with a PIN), Log out of this phone, Open the welcome page; empty text "Try “chat” or “music”"). Connection pill: mint "{partner} is here", rose "Live", gold "Waiting for partner", gold pulsing "Connecting…", grey "Offline · changes saved" (`role="status"`). In-app toasts for partner messages (not on /chat), photos, game invites, "show photo", new notes, a new meeting date, thumb-kiss invites.

---

## 8. Accessibility & tone

Contrast ≥ WCAG AA; every icon button has an `aria-label` ("Tell Kabir you're missing them", "Your profile and account", "Add a profile photo", "Close thumb kiss", "Accept", "End call", "Drop in column 4", "Play square 5", "Undo my last stroke", "Play Kesariya"…); quiz answers in `role="group" aria-label="Answers"`; `aria-current`, `aria-pressed`; focus rings; keyboard everywhere; reduced motion. Tone: warm, short, playful, honest ("Offline · changes saved").

---

## 9. Tests (must pass)

- **Unit/page/server (Vitest, 99):** crypto (codes, keys, tamper), engine (LWW, ties, tombstones, flips, snapshot, **one-write saving**), relay (create/join/deny/full/live events/catch-up/leave/rate limit, **forget after both seen**, **resync**, **epoch → full catch-up**, ice for members only, binary frames forwarded, **DB: lock survives restart + closed room can't come back**, `busy` when full, Upstash request shape, Cloudflare TURN caching + port 53 drop), dates, game rules (TTT, Connect Four, RPS, seeded order, μ-law round trip), storage, routing, every page inside a room, game invite/join/moves, Connect Four drop, new games open, canvas grows, **question of the day hidden until you answer**, **Profile (name save, photo / PIN / log out buttons)**, **instant PIN lock** (locked on open, wrong PIN message, right PIN unlocks, a hidden page locks inside the same tick). Mock `HTMLMediaElement.play/pause` and `HTMLCanvasElement.getContext` in the test setup.
- **Playwright (Chromium, desktop + Pixel 7, fake camera/mic, prod build on :8080, 90 s timeout):** landing → start, private pages locked, **two partners connect + live chat + typing + seen + reload keeps messages**, wrong code + full room, every room opens without errors, **game invite + direct video call**, **call through the server (voice both ways + video frames)**, **automatic switch when no direct line works**, **profile photo reaches the partner + question of the day + thumb kiss (both thumbs → "Thumb kiss! 💞") + set a PIN and a hidden page locks at once**. `expect` timeout 10 s (many browsers at once).

---

## 10. Docs to write (easy English, `front-end/doc/`)

`01-problem-and-solution.md`, `02-approaches.md` (incl. the build approach, security, sync, calls, the optional DB, bugs fixed, tests), `03-design.md` (tokens, fonts, motion, 3D, components, 82 template patterns, screen by screen), `04-flowcharts.md` (Mermaid for every flow), `05-directory-map.md` (tree + tables), `screenshots/` (real screenshots of every screen, desktop + phone). Root `README.md` (what it is, features, screenshots, security, quick start, music, **Render deploy**, optional free extras, commands, structure).

---

## 11. Deploy (Render free)

New Web Service from GitHub → Root Directory `front-end` → Build `npm ci && npm run build` → Start `npm start` → Free. Env: `TRUST_PROXY=1`, `NODE_VERSION=20`; optional `UPSTASH_REDIS_REST_URL/_TOKEN` (closed rooms + lock survive restarts), `CLOUDFLARE_TURN_KEY_ID/_API_TOKEN` (or `TURN_URLS/_USERNAME/_CREDENTIAL`). Also ship a `Dockerfile` and `.env.example`.

---

## 12. Build order (check each phase)

1. Scaffold Vite + React + TS + Tailwind + shadcn; tokens, fonts, glass, layout (sidebar, top bar, dock), landing, 404.
2. Crypto + engine + IndexedDB + hooks (unit tests).
3. Relay + store + production server + Vite plugin (relay tests); sync client; Start page; RoomProvider; RequireRoom; first two-browser e2e.
4. Home (+ question of the day, countdown, notes, milestones, thumb kiss), Chat (+ camera), Gallery, Profile (photo, details, code, PIN, log out, close room), instant lock, notifications/PWA.
5. Calls: direct → repair → backup path (+ e2e for all three).
6. Canvas (growing), 8 games, music (global provider + manifest + Range).
7. Optional DB + TURN modules; memory caps; epochs; seen/forget; resync.
8. Speed: lazy landing + private area, idle pre-loading, instant page change, lighter phone blur, Brotli. Measure a page switch in the browser (old page gone in < 40 ms, new page fully visible in ≤ 0.3 s).
9. Polish every screen on desktop + phone with screenshots; accessibility pass; docs + README; final full test run.

**Done means:** all tests green, every screen checked on desktop and phone, the site never mentions how it was built, and closing a room deletes everything.
