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
| `doc/` | The 5 project guides (problem, approaches, design, flowcharts, directory map) + screenshots |
| `src/pages/` | One file per screen (landing, start, home, chat, presence, games, planner, music, letters, timeline, 404) |
| `src/sync/` | Secret codes + encryption, the shared-data engine, the live WebSocket client, hooks |
| `src/context/` | Room (create / join / leave / presence) and space (profiles) providers |
| `src/components/fx/` | Animated effects (aurora, spotlight card, marquee, number ticker, heart burst…) |
| `src/components/layout/` | Sidebar, top bar, connection pill, phone dock, quick search, settings, room guard |
| `src/components/games/` | The four games |
| `src/lib/` | Local storage, dates, game rules, words, starter content |
| `src/test/` | Vitest tests (incl. a real relay test) |
| `server/` | `relay.mjs` (rooms, locks, limits), `store.mjs` (encrypted events), `index.mjs` (production server) |
| `e2e/` | Playwright tests |

## Settings

| Variable | Where | Use |
| --- | --- | --- |
| `PORT`, `HOST` | server | Where `npm start` listens (default `0.0.0.0:8080`) |
| `USSPACE_DATA_DIR` | server | Folder for encrypted rooms (default `.usspace-data`) |
| `ALLOWED_ORIGINS` | server | Comma-separated sites allowed to open `/ws` |
| `TRUST_PROXY=1` | server | Use `X-Forwarded-For` for rate limits behind a proxy |
| `VITE_SYNC_URL` | build | Relay address if it's hosted separately (see `.env.example`) |

See [doc/05-directory-map.md](doc/05-directory-map.md) for every file.
