# 5 · Directory Map (Every Folder, Explained with Pictures)

This page is a **map of the whole project**. It shows every folder, what lives in it, and how the parts talk to each other.

**Contents**

- [5.1 The project at a glance](#51-the-project-at-a-glance)
- [5.2 Mind map](#52-mind-map)
- [5.3 Full folder tree](#53-full-folder-tree)
- [5.4 How the folders depend on each other](#54-how-the-folders-depend-on-each-other)
- [5.5 Folder by folder](#55-folder-by-folder)
- [5.6 Which file do I open to…?](#56-which-file-do-i-open-to)
- [5.7 Generated folders (not saved in the project)](#57-generated-folders-not-saved-in-the-project)

---

## 5.1 The project at a glance

```
usspace-your-private-haven/
├── 📄 README.md          ← start here
└── 🖥️ front-end/         ← everything: the website AND its small real-time server
    ├── 📚 doc/           ← the 5 guides (you are reading one)
    ├── ✨ src/           ← the website (React)
    ├── 🛰️ server/        ← the relay + production server (Node.js)
    ├── 🎵 public/music/  ← YOUR songs (played in sync on both phones)
    └── 🧪 e2e/           ← real-browser tests (two browsers, real video call)
```

| Folder | In one line |
| --- | --- |
| `front-end/src/` | Everything you see and use in the browser, plus encryption, live sync, calls and music |
| `front-end/server/` | The tiny relay that passes encrypted updates between the two phones, and the production web server |
| `front-end/public/music/` | Drop your downloaded songs here. They appear in the Music room automatically |
| `front-end/doc/` | Easy-English guides: problem, approaches, design, flowcharts, this map |
| `front-end/e2e/` | Playwright tests that use two real browsers |

---

## 5.2 Mind map

```mermaid
mindmap
  root((UsSpace))
    front-end
      doc
        1 Problem & solution
        2 Approaches
        3 Design
        4 Flowcharts
        5 Directory map
      server
        relay
        room store
        music list
        production server
      public
        music folder
      src
        pages
          Landing
          Start create or join
          Home
          Chat
          Gallery
          Canvas
          Games
          Music
          404
        sync
          crypto
          engine
          client
          hooks
          session
        call
          WebRTC calls
          call screen
        music
          one global player
          controls
        components
          fx effects + 3D heart
          layout + PIN lock
          chat camera
          games
          landing
          ui kit
        context
          room
          space
        lib
          IndexedDB
          media
          storage
          time
          games
          content
        test
      e2e
      Dockerfile
```

---

## 5.3 Full folder tree

```
usspace-your-private-haven/
│
├── README.md                         Main guide for the whole project
│
└── front-end/                        🖥️ The website + its relay server
    ├── doc/                          📚 Five easy-English guides
    │   ├── 01-problem-and-solution.md    What problem, what website, which users
    │   ├── 02-approaches.md              How it was built, security, sync, calls, music, bugs fixed
    │   ├── 03-design.md                  Fonts, colours, motion, 3D, 70 template patterns
    │   ├── 04-flowcharts.md              Diagrams of every flow
    │   ├── 05-directory-map.md           This map
    │   └── screenshots/                  Pictures used in the README
    │
    ├── index.html                    The one HTML page: title, meta tags, fonts
    ├── package.json                  Scripts (dev, build, start, test, test:e2e…) and libraries
    ├── package-lock.json             Exact library versions (npm)
    ├── vite.config.ts                Dev server (port 8080): relay on /ws + music list
    ├── vitest.config.ts              Unit-test settings
    ├── playwright.config.ts          Browser-test settings (desktop + phone, fake camera)
    ├── playwright-fixture.ts         Shared Playwright helpers
    ├── tailwind.config.ts            Fonts, colours, keyframe animations (incl. 3D spin)
    ├── postcss.config.js             Runs Tailwind + Autoprefixer
    ├── eslint.config.js              Code-style rules (app + server)
    ├── tsconfig*.json                TypeScript settings
    ├── components.json               shadcn/ui settings
    ├── Dockerfile                    Build + run the site and relay in one container
    ├── .dockerignore                 Files Docker should skip
    ├── .env.example                  Optional VITE_SYNC_URL and TURN settings for calls
    ├── .gitignore                    Files git should skip
    ├── README.md                     Short front-end guide
    │
    ├── server/                       🛰️ Plain Node.js, no build step
    │   ├── relay.mjs                 Rooms, 2-device lock, auth check, rate limits, live events, close room
    │   ├── store.mjs                 Encrypted events per room (memory only, unless USSPACE_DATA_DIR)
    │   ├── music.mjs                 Lists the songs in the music folder
    │   ├── index.mjs                 Production server: dist/ + /ws + music + security headers + gzip
    │   ├── relay.d.mts               Type hints for the relay
    │   └── music.d.mts               Type hints for the music list
    │
    ├── public/                       Files served as they are
    │   ├── music/                    🎵 YOUR songs (61 right now) + PUT-YOUR-SONGS-HERE.txt
    │   ├── favicon.svg               Heart logo
    │   ├── placeholder.svg           Spare image
    │   └── robots.txt                Rules for search engines
    │
    ├── e2e/
    │   └── smoke.spec.ts             Two browsers: create, join, live chat, wrong code, full room,
    │                                 every room opens, game invite + a real video call
    │
    └── src/                          ✨ The app
        ├── main.tsx                  Starts React
        ├── App.tsx                   Providers, routes, room guard, lazy pages
        ├── index.css                 Design tokens + glass, gradient, beam effects, privacy blur
        ├── vite-env.d.ts             Type hints for Vite
        │
        ├── pages/                    One file per screen
        │   ├── Index.tsx             Landing page
        │   ├── Start.tsx             Create a room · Join a room · Secret code + QR
        │   ├── Dashboard.tsx         Home: 3D heart, days together, mood, love note, missing you, calls
        │   ├── Chat.tsx              Live chat: typing, ticks, photos, videos, camera, reactions, calls
        │   ├── Gallery.tsx           Shared photos, full-screen viewer, "Show Kabir", voice chat
        │   ├── Canvas.tsx            Draw together, stickers, photos, cartoon filter, save PNG
        │   ├── Games.tsx             Invite → partner joins → play
        │   ├── MusicPlayer.tsx       Vinyl, shared controls, searchable playlist
        │   └── NotFound.tsx          Friendly 404
        │
        ├── sync/                     🔐 Encryption + live sync
        │   ├── crypto.ts             Secret codes, key derivation, encrypt / decrypt
        │   ├── engine.ts             Shared data: newest wins, deletes, me ↔ partner, IndexedDB saving
        │   ├── client.ts             WebSocket: reconnect, outbox, catch-up, clock sync, signals, close
        │   ├── hooks.ts              useSyncedList / useSyncedDoc / usePendingIds / useEngine
        │   └── session.ts            Which room this phone is in
        │
        ├── call/                     📞 Voice and video calls
        │   ├── call.ts               useCall() + call state shape
        │   ├── CallProvider.tsx      Ring, accept, offer / answer (WebRTC), mute, camera, flip, ringtone
        │   └── CallOverlay.tsx       Ringing screen, full-screen call, floating call bar
        │
        ├── music/                    🎵 One music player for the whole app
        │   ├── music.ts              useMusic() + what the player can do
        │   ├── MusicProvider.tsx     Song list, shared timeline, audio element, lock-screen controls
        │   └── MusicControls.tsx     Progress bar, buttons, volume, the 🎵 top-bar pop-up
        │
        ├── context/                  🌐 Shared React state
        │   ├── room.ts               useRoom() + friendly room errors
        │   ├── RoomProvider.tsx      Create, join, leave, close, status, presence, signals, pop-ups
        │   ├── space.ts              useSpace()
        │   └── SpaceProvider.tsx     Me + partner + couple → one easy profile
        │
        ├── components/
        │   ├── fx/                   ✨ Animated effects (14 files, incl. Heart3D)
        │   ├── layout/               🧱 App frame (13 files, incl. AppLock, ConnectionPill, RequireRoom)
        │   ├── chat/                 📷 CameraCapture (photos + video clips)
        │   ├── games/                🎮 The four two-player games
        │   ├── landing/              🌌 Mini demos for landing cards
        │   └── ui/                   🧩 shadcn/ui base parts (49 files)
        │
        ├── hooks/
        │   ├── use-miss-you.ts       💖 "I'm missing you" (live or as a chat message)
        │   ├── use-now.ts            Current time that refreshes
        │   ├── use-mobile.tsx        Is this a phone-size screen?
        │   └── use-toast.ts          shadcn toast helper
        │
        ├── lib/                      🧠 Plain logic
        │   ├── idb.ts                Small IndexedDB helper (big storage for photos and videos)
        │   ├── media.ts              Shrink photos, read videos, cartoon filter, best video format
        │   ├── storage.ts            Per-room local storage + usePersistentState
        │   ├── time.ts               Local dates, countdowns, anniversaries
        │   ├── games.ts              Winner check, shuffle, memory deck
        │   ├── content.ts            All words: love notes, prompts, moods, game names
        │   ├── seed.ts               Starting values (names, player, boards)
        │   ├── types.ts              Shapes of shared data
        │   ├── nav.ts                Menu items + phone dock
        │   ├── burst.ts              Heart-burst event bus
        │   ├── motion.ts             Shared animation timings
        │   └── utils.ts              cn() class helper
        │
        └── test/                     🧪 79 Vitest tests
            ├── setup.ts              Browser mocks (incl. an offline WebSocket)
            ├── crypto.test.ts        Codes, keys, encryption (12)
            ├── engine.test.ts        Newest-wins, deletes, me ↔ partner, all-or-nothing saving (11)
            ├── relay.test.ts         The real relay server, incl. close room (9)
            ├── pages.test.tsx        Every page inside a room, game invites (13)
            ├── routing.test.tsx      Room guard, layout, 404 (5)
            ├── time.test.ts          Dates and anniversaries (17)
            ├── games.test.ts         Winner check, decks (6)
            └── storage.test.tsx      Per-room storage (6)
```

---

## 5.4 How the folders depend on each other

Arrows mean "uses". Pages sit at the top. The phones talk to the server only through `sync/client.ts`, and to each other directly only for calls.

```mermaid
flowchart TD
    App["App.tsx"] --> Context["context/<br/>RoomProvider · SpaceProvider"]
    App --> Call["call/<br/>CallProvider"]
    App --> Music["music/<br/>MusicProvider"]
    App --> Pages["pages/"]
    Pages --> Layout["components/layout/"]
    Pages --> FX["components/fx/"]
    Pages --> Games["components/games/"]
    Pages --> Cam["components/chat/"]
    Pages --> UI["components/ui/"]
    Pages --> Media["lib/media.ts"]
    Pages --> Hooks["sync/hooks.ts"]
    Games --> Hooks
    Music --> Hooks
    Call --> Context
    Context --> Hooks
    Hooks --> Engine["sync/engine.ts"]
    Context --> Client["sync/client.ts"]
    Client --> Crypto["sync/crypto.ts"]
    Client --> Engine
    Engine --> IDB["lib/idb.ts"]
    IDB --> DB[("IndexedDB<br/>per room")]
    Client <-->|"WebSocket /ws<br/>encrypted"| Relay["server/relay.mjs"]
    Relay --> Store["server/store.mjs<br/>(memory)"]
    Music -->|"/music/manifest.json<br/>+ song files"| Prod
    Prod["server/index.mjs"] --> Relay
    Prod --> MusicList["server/music.mjs"]
    MusicList --> Songs[("public/music")]
    Vite["vite.config.ts (dev)"] --> Relay
    Vite --> MusicList
    Call <-.->|"WebRTC<br/>phone to phone"| Peer["📱 Partner"]
    Tests["src/test/"] -.-> Crypto
    Tests -.-> Engine
    Tests -.-> Relay
    E2E["e2e/"] -.-> App
```

---

## 5.5 Folder by folder

### `front-end/server/`: the relay and production server

| File | Job |
| --- | --- |
| `relay.mjs` | Accepts WebSocket connections on `/ws`. Handles **create**, **join** (auth hash check, 2-device lock), **put** (store + forward), **signal** (forward only: typing, hearts, call set-up), **leave**, and **close** (delete the room, tell both phones, remember it as closed for 30 days). Rate limits, lockout after wrong codes, heartbeats. |
| `store.mjs` | Keeps each room's **encrypted** events, only the newest per item, max 60 MB per room. **Memory only** by default. With `USSPACE_DATA_DIR` it also saves to disk (safe write: temp file + rename). |
| `music.mjs` | Reads the music folder and returns `{ songs: [{ id, url, title }] }`, sorted A–Z. The title is the file name without `.mp3` (underscores become spaces). |
| `index.mjs` | Production: serves `dist/` with a strict Content-Security-Policy and other security headers, gzip, long-term caching, **partial (Range) answers for music**, `/music/manifest.json`, a `/healthz` check, plus the relay. |

### `front-end/src/sync/`: encryption and live sync

| File | Main exports |
| --- | --- |
| `crypto.ts` | `generateCode`, `formatCode`, `normalizeCode`, `isValidCode`, `deriveKeys`, `seal`, `open`, `itemKey`, `randomId` |
| `engine.ts` | `SyncEngine` (`put`, `receive`, `get`, `subscribe`, `snapshot`, `getLocal`, `setLocal`, `wipe`), `COLUMNS`, `swap`, `openPersistence` |
| `client.ts` | `SyncClient` (connect, reconnect, outbox, catch-up, `sendSignal`, `closeRoom`), `relayUrl` |
| `hooks.ts` | `useSyncedList`, `useSyncedDoc`, `usePendingIds`, `useEngine` |
| `session.ts` | `loadSession`, `saveSession`, `clearSession` |

**Shared columns** (in `engine.ts`): `messages`, `photos`, `strokes`, `stickers` (lists) · `member`, `read`, `couple`, `player`, `game`, `gview`, `ttt`, `tod`, `memory`, `wyr`, `scores` (single items).

### `front-end/src/pages/`: the screens

| File | Route | What you see |
| --- | --- | --- |
| `Index.tsx` | `/` | Hero, highlights, feature bento, 3 steps, FAQ, final CTA |
| `Start.tsx` | `/start` | Create / Join cards → forms → secret code with Copy / Share / QR → "partner joined" |
| `Dashboard.tsx` | `/dashboard` | Invite card (until your partner joins), 3D heart, days together, anniversary ring, mood, love note, missing you, call buttons, live room cards |
| `Chat.tsx` | `/chat` | Header with online / typing / last seen and call buttons, messages with ticks, photos, videos, camera, emoji |
| `Gallery.tsx` | `/gallery` | Upload many photos, masonry grid, viewer, "Show Kabir", voice chat |
| `Canvas.tsx` | `/canvas` | Toolbar (pen, neon, eraser, stickers, colours, sizes, cartoon), shared drawing area |
| `Games.tsx` | `/games` | Game cards with Invite → waiting → playing → End game |
| `MusicPlayer.tsx` | `/music` | Vinyl, shared controls, volume, searchable playlist, "Add your songs" help |
| `NotFound.tsx` | anything else | Broken-heart 404 |

### `front-end/src/call/` and `front-end/src/music/`

| File | Job |
| --- | --- |
| `call/CallProvider.tsx` | Every call message travels as an encrypted room signal: ring → accept → offer → answer (or decline / busy / end). Handles calling at the same time, ring timeout (40 s), ringtone and vibration. |
| `call/CallOverlay.tsx` | The ringing screen, the full-screen call (big partner video, small self view) and the floating mini bar. |
| `music/MusicProvider.tsx` | Loads the song list, keeps **one** audio element for the whole app, follows the shared timeline, and connects lock-screen / headphone buttons. |
| `music/MusicControls.tsx` | `MusicProgress`, `MusicButtons`, `MusicVolume` and `TopbarMusic` (the 🎵 pop-up). |

### `front-end/src/components/layout/`: the app frame

| File | Job |
| --- | --- |
| `AppLayout.tsx` | Puts everything together, 3D page turns, scroll reset |
| `RequireRoom.tsx` | No room → `/start`. Also shows a dialog if the room can't be used anymore |
| `AppLock.tsx` | Optional PIN lock screen + privacy blur in the background |
| `ConnectionPill.tsx` | "Kabir is here" / "Live" / "Waiting for partner" / "Connecting…" / "Offline · changes saved" |
| `AppSidebar.tsx` | Desktop sidebar (and the phone "More" menu) |
| `Topbar.tsx` | Page title, connection pill, search, 🎵 music, 💖 missing you, avatars |
| `MobileNav.tsx` | Floating bottom dock |
| `CommandMenu.tsx` | `Ctrl + K` quick search and actions |
| `SettingsDialog.tsx` | Name, shared date, secret code, PIN lock, close room, leave on this phone |
| `PageHeader.tsx`, `EmptyState.tsx`, `InitialAvatar.tsx`, `PageLoader.tsx` | Small shared pieces |

### `front-end/src/components/fx/`, `chat/`, `games/`, `landing/`, `ui/`

- **fx/**: `Heart3D`, `AuroraBackground`, `FloatingParticles` (pure CSS), `SpotlightCard`, `NumberTicker`, `SlotNumber`, `WordReveal`, `Marquee`, `Meteors`, `OrbitingIcons`, `ProgressRing`, `Equalizer`, `Reveal`, `BurstLayer`.
- **chat/**: `CameraCapture` (live preview, photo / video, 20 s clips, flip camera).
- **games/**: `TicTacToe`, `TruthOrDare`, `MemoryMatch`, `WouldYouRather`, all shared and two-player.
- **landing/**: `FeatureDemos`.
- **ui/**: 49 shadcn/ui parts. We changed `button` (gradient and glass styles), `slider` (brand colours), `sonner` (always dark), `command` and `sidebar` (screen-reader titles), and `textarea` (lint fix).

---

## 5.6 Which file do I open to…?

| I want to… | Open |
| --- | --- |
| **Add or remove songs** | Put files in `front-end/public/music/` (then restart `npm run dev`, or redeploy) |
| Change words, love notes or game prompts | `front-end/src/lib/content.ts` |
| Change colours or the glass style | `front-end/src/index.css` |
| Change fonts or animation speeds | `front-end/tailwind.config.ts` + `front-end/index.html` |
| Change canvas colours or stickers | `front-end/src/pages/Canvas.tsx` (`COLORS`, `STICKERS`) |
| Change video length or size limits | `src/components/chat/CameraCapture.tsx` (`MAX_SECONDS`) + `src/lib/media.ts` (`MAX_VIDEO_BYTES`) |
| Make calls work on every network | Set `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` (see `.env.example`) |
| Change how long the phone stays unlocked | `src/components/layout/AppLock.tsx` (`LOCK_AFTER_MS`) |
| Add a new shared feature | Add a column in `src/sync/engine.ts` (`COLUMNS`), then use `useSyncedList` / `useSyncedDoc` |
| Add a new room (page) | `src/pages/MyRoom.tsx` + a route in `src/App.tsx` + a menu item in `src/lib/nav.ts` |
| Change rate limits or message size | `front-end/server/relay.mjs` (`LIMITS`) and `server/store.mjs` (`STORE_LIMITS`) |
| Change security headers | `front-end/server/index.mjs` |
| Host the relay somewhere else | Set `VITE_SYNC_URL` (see `.env.example`) |
| Add a test | `front-end/src/test/` (unit) or `front-end/e2e/` (browser) |

---

## 5.7 Generated folders (not saved in the project)

| Folder | Made by | Safe to delete? |
| --- | --- | --- |
| `front-end/node_modules/` | `npm install` | Yes, run `npm install` again |
| `front-end/dist/` | `npm run build` (includes a copy of the music folder) | Yes, run the build again |
| `USSPACE_DATA_DIR` folder | The relay, **only if you set it** | ⚠️ Deleting it removes rooms from the server. Phones still keep their copy and re-create the room on their next connection |
| `front-end/test-results/`, `playwright-report/` | `npm run test:e2e` | Yes |

**Back:** [← 4 · Flowcharts](04-flowcharts.md) · **Home:** [README](../../README.md)
