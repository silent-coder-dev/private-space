# UsSpace · Front end

The UsSpace website **and** its small real-time relay server: a private, end-to-end encrypted room for two, opened with a secret code.

👉 For the full project guide, see the main [README](../README.md) and the [doc](doc) folder.

## Run it

```bash
npm install
npm run dev        # http://localhost:8080 — website + relay (/ws) together
```

Create a room in one browser window and join it from a private window (or a second phone on the same Wi-Fi) to see everything sync live.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload + relay |
| `npm run build` | Production build into `dist/` |
| `npm start` | Production server (`server/index.mjs`): `dist/` + relay + security headers |
| `npm run preview` | Preview the production build with Vite (relay included) |
| `npm test` | Unit, page and relay tests (Vitest) |
| `npm run test:e2e` | Two-browser Playwright tests (run `npx playwright install chromium` once first) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (app + server) |

## Where things live

| Folder | What's inside |
| --- | --- |
| `public/music/` | 🎵 Put your own songs here. They show up in the Music room |
| `public/` | Also: app icons, `manifest.webmanifest` (install on the home screen), `sw.js` (notifications only, caches nothing), `call-audio-worklet.js` (call audio for the backup path) |
| `doc/` | The 5 project guides (problem, approaches, design, flowcharts, directory map) + screenshots |
| `src/pages/` | One file per screen (landing, start, home, chat, gallery, canvas, games, music, 404) |
| `src/sync/` | Secret codes + encryption, the shared-data engine (saved in IndexedDB, all-or-nothing), the live WebSocket client, hooks |
| `src/call/` | Voice & video calls: WebRTC with live route sharing and repair, plus the encrypted backup path through the server |
| `src/music/` | One music player for the whole app, synced on both phones, + the 🎵 top-bar controls |
| `src/context/` | Room (create / join / leave / close / presence / pop-ups / notifications) and space (profiles) providers |
| `src/components/fx/` | Animated effects (3D heart, aurora, spotlight card, marquee, number ticker, heart burst…) |
| `src/components/chat/` | Camera for live photos and videos up to 2 minutes |
| `src/components/layout/` | Sidebar, top bar, connection pill, phone dock, quick search, settings (PIN lock, notifications, close room), room guard |
| `src/components/games/` | The 8 games + `new-game.ts` (fresh game states) |
| `src/lib/` | IndexedDB + local storage, photos / videos, notifications, dates, game rules, words |
| `src/test/` | Vitest tests (incl. the real relay server) |
| `server/` | `relay.mjs` (rooms, locks, limits, close room, call backup), `store.mjs` (encrypted events in memory until both phones have them), `ice.mjs` (call routes / TURN), `kv.mjs` (optional free database), `music.mjs` (song list), `index.mjs` (production server) |
| `e2e/` | Playwright tests (two browsers, real calls) |

## Settings

All server settings are optional and can be changed without rebuilding (e.g. Render → Environment).

| Variable | Where | Use |
| --- | --- | --- |
| `PORT`, `HOST` | server | Where `npm start` listens (default `0.0.0.0:8080`) |
| `TRUST_PROXY=1` | server | Use `X-Forwarded-For` for rate limits behind a proxy (Render: yes) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server | Free database: closed rooms stay closed and the 2-device lock survives restarts (no content stored) |
| `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | server | Cloudflare TURN for calls on strict mobile networks (first 1,000 GB / month free) |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | server | …or any other TURN service with fixed credentials |
| `USSPACE_DATA_DIR` | server | Also save encrypted rooms to a folder (default: memory only — nothing on disk) |
| `ALLOWED_ORIGINS` | server | Comma-separated sites allowed to open `/ws` |
| `VITE_SYNC_URL` | build | Relay address if it's hosted separately (see `.env.example`) |
| `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` | build | Old way to add TURN (only used if the server can't be asked) |

See [doc/05-directory-map.md](doc/05-directory-map.md) for every file.
