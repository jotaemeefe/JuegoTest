# External Integrations

**Analysis Date:** 2026-06-26

## APIs & External Services

**P2P Networking:**
- PeerJS v1.5.4 — WebRTC peer-to-peer connection for two-player multiplayer
  - SDK/Client: CDN script `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` (loaded in `index.html:8`)
  - Auth: None — anonymous peer connections
  - Signaling: PeerJS public cloud server (baked into library defaults)
  - Wrapped in a self-contained IIFE `Net` object at `game.js:184`
  - Host creates a 6-character alphanumeric room code used as the PeerJS peer ID (`game.js:206`)
  - Guest connects via `peer.connect(code, { reliable: false, serialization: 'json' })` (`game.js:217`)
  - Position packets sent every 50ms (`NET_MS` constant, `game.js:11`)
  - Message types: `ready`, `start`, `pos`, `finish`, `restart`
  - Incoming `pos` data is range-validated before applying (`game.js` validation logic)
  - Remote car position uses interpolation between last two received frames to smooth 50ms jitter (`remoteRenderPos()`)

## Data Storage

**Databases:**
- None — no backend database

**Browser Storage (localStorage):**
- `cr_best_lap_ms` — best lap time in milliseconds, persisted across sessions (`game.js:167`, `game.js:579`)
- `cr_rival_<idx>` — per-rival win/loss result for each of the 20 RIVALS entries (`game.js:1148`, `game.js:1244`)
  - Written on race end; victories persist permanently; losses only written if no prior result exists

**File Storage:**
- Local filesystem only (static assets: `index.html`, `style.css`, `game.js`)

**Caching:**
- None — no service worker, no Cache API, no CDN layer controlled by the app

## Authentication & Identity

**Auth Provider:**
- None — no user accounts, no login, no sessions

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar

**Logs:**
- `console.warn('peer', err)` at `game.js:210` for PeerJS peer errors
- `console.warn('conn', e)` at `game.js:200` for PeerJS connection errors
- No structured logging

## CI/CD & Deployment

**Hosting:**
- Any static file host (no specific platform detected in repo)
- Repo is a plain GitHub repository (`JuegoTest`)

**CI Pipeline:**
- None detected — no GitHub Actions, no CI config files

## Environment Configuration

**Required env vars:**
- None — the app has no environment variable requirements

**Secrets location:**
- None — no secrets, no API keys stored anywhere in the project

## Webhooks & Callbacks

**Incoming:**
- None — no server endpoints

**Outgoing:**
- None — the only external communication is the PeerJS WebRTC signaling handshake (UDP/WebRTC after connection)

## Browser API Surface (non-library integrations)

These are native browser integrations that behave like external dependencies:

**Web Audio API:**
- Engine sound: two oscillators (sawtooth + square) routed through a lowpass filter and gain node (`game.js:248–254`)
- Brake squeal: white noise buffer looped through a bandpass filter (`game.js:279–285`)
- Collision: short decaying noise impulse (`game.js:299–307`)
- AudioContext initialized lazily on first user gesture (`game.js:240`) — required by iOS/Safari policy
- Fallback: `window.webkitAudioContext` for older Safari (`game.js:240`)

**Canvas 2D API:**
- Single `<canvas id="game" width="480" height="640">` element (`index.html:69`)
- All game rendering (track, cars, HUD overlays, floating text) drawn each frame via `ctx` (`game.js:116`)

**localStorage API:**
- Read at module load time for best lap and rival records (`game.js:167`)
- Written on lap completion and race end (no quota guard; data is small)

---

*Integration audit: 2026-06-26*
