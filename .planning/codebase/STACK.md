# Technology Stack

**Analysis Date:** 2026-06-26

## Languages

**Primary:**
- JavaScript (ES2015+ strict mode) - All game logic in `game.js` (1281 lines)
- HTML5 - Structure and DOM in `index.html`
- CSS3 - Layout, animations, and theming in `style.css`

**Secondary:**
- None

## Runtime

**Environment:**
- Browser (any modern browser supporting Canvas 2D, Web Audio API, WebRTC)
- No server-side runtime required — static files only
- iOS/Safari compatible (Web Audio unlock on first gesture at `game.js:1276`)

**Package Manager:**
- None — no `package.json`, no `node_modules`, no lockfile
- Lockfile: Not applicable

## Frameworks

**Core:**
- None — vanilla HTML/CSS/JS with no framework
- Screen routing is a custom CSS `.active` class toggle via `goTo()` in `game.js`

**Testing:**
- Playwright (external, via `tester-jugabilidad` agent at port 8081) — not bundled in repo

**Build/Dev:**
- No build step — files served as-is
- Development server: `npx http-server . -p 8081` (or any static server)

## Key Dependencies

**Critical:**
- `peerjs@1.5.4` — WebRTC P2P networking for multiplayer
  - Loaded from CDN: `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` (`index.html:8`)
  - No local copy or lockfile; pinned to exact version via URL

**Infrastructure:**
- None beyond PeerJS CDN script

## Browser APIs Used (no external library)

- **Canvas 2D API** — all game rendering via `canvas.getContext('2d')` (`game.js:116`)
- **Web Audio API** — engine sound (oscillators), brake squeal (noise), collision (impulse)
  - `AudioContext` / `webkitAudioContext` fallback (`game.js:240`)
  - Created lazily on first user gesture for iOS/Safari compatibility
- **requestAnimationFrame** — game loop at `game.js:942`, `game.js:949`
- **localStorage** — persistent best lap time (`cr_best_lap_ms`) and per-rival win/loss results (`cr_rival_<idx>`)
  - Keys read at startup (`game.js:167`) and written on lap completion (`game.js:579`) and race end (`game.js:1244`)
- **performance.now()** — high-resolution lap timing (`game.js:166`, `game.js:569`)
- **Touch events** — on-screen steering buttons for mobile (`index.html:71–75`)

## Configuration

**Environment:**
- No environment variables
- No `.env` file
- All configuration is compile-time constants at the top of `game.js` (lines 4–15)

**Key tunable constants in `game.js`:**
- `TURN_RATE = 3.5` — steering sharpness (rad/s)
- `AUTO_ACCEL = 160` — acceleration (px/s²)
- `MAX_SPD_ON = 190` — top speed on-track (px/s)
- `BRAKE_FORCE = 350` — braking deceleration (px/s²)
- `ROAD_HALF_W = 60` — track half-width (px)
- `CAR_RADIUS = 14` — collision radius (px)
- `NET_MS = 50` — multiplayer position broadcast interval (ms)
- `TOTAL_LAPS = 3` — race length

**Build:**
- No build config files (no webpack, vite, rollup, parcel, esbuild, tsconfig, babel)

## Platform Requirements

**Development:**
- Any static HTTP server (e.g., `npx http-server . -p 8081`)
- Modern browser with Canvas 2D + Web Audio API + WebRTC

**Production:**
- Any static file hosting (GitHub Pages, Netlify, S3, Nginx, etc.)
- No server-side processing required
- PeerJS signaling server is provided by PeerJS cloud (baked into the CDN library)

---

*Stack analysis: 2026-06-26*
