# Coding Conventions

**Analysis Date:** 2026-06-26

## Naming Patterns

**Constants:**
- SCREAMING_SNAKE_CASE for all tuning/config values: `TOTAL_LAPS`, `MAX_SPD_ON`, `ROAD_HALF_W`, `BRAKE_FORCE`
- Grouped at top of `game.js` with aligned column spacing for readability
- Inline comments document units and derived equations: `// px/s² constant push (eq speed ≈ 145 px/s)`

**Variables:**
- camelCase for all mutable state: `lapStartTime`, `loopRunning`, `localDamage`, `aiWpIdx`
- Short abbreviations accepted in tight scopes: `dt`, `ts`, `ac`, `wp`, `nx`, `ny`, `dx`, `dy`
- Booleans follow `is`/`was`/`has` prefix pattern: `isHost`, `wasOnTrack`, `loopRunning`, `engineRunning`
- Timer IDs use `Id` suffix: `rafId`, `resultPollId`, `shakeTimer`

**Functions:**
- camelCase verbs: `updateCar()`, `drawTrack()`, `startEngine()`, `resolveCarCollision()`
- Prefixes communicate intent:
  - `draw*` — renders to canvas (`drawCar`, `drawTrack`, `drawCountdown`, `drawWin`)
  - `update*` — mutates game state (`updateCar`, `updateAI`, `updateHUD`, `updateEnginePitch`)
  - `start*` / `stop*` — paired lifecycle functions (`startEngine/stopEngine`, `startLoop/stopLoop`, `startBrakeSound/stopBrakeSound`)
  - `begin*` — triggers a transition: `beginCountdown()`
  - `on*` — event handlers: `onMsg()`, `onDisconnect()`
  - `get*` — lazy initializers: `getAudioCtx()`
  - `build*` — DOM construction: `buildRivalGrid()`
  - `check*` — boolean/update checks: `checkCheckpoints()`
  - `poll*` / `reset*` / `go*` / `format*` — utility verbs

**Objects/Data:**
- Plain objects for car state: `{ x, y, angle, speed, lap, nextCP, finished }`
- Configuration objects use lowercase keys matching CSS naming where applicable: `{ body, stripe, cockpit, helmet, num }`
- Named constants for DOM element lookup: `SCR`, `hudLap`, `hudTimer`, `hudPos`, `hudRole`

**CSS Classes:**
- kebab-case: `.rival-card`, `.game-hud`, `.touch-controls`, `.btn-ghost`
- BEM-influenced modifier pattern: `.rival-card.show`, `.hud-timer.record`, `.touch-btn.pressed`, `.btn-primary`
- State classes toggled by JS: `.active` (screen visibility), `.shake` (haptic feedback), `.show` (entrance animation)

**CSS Custom Properties:**
- `--blue`, `--sky`, `--white`, `--dark`, `--mid` — defined in `:root` in `style.css`

**IDs:**
- kebab-case matching screen names: `screen-lobby`, `screen-game`, `screen-results`
- HUD elements: `hud-lap`, `hud-timer`, `hud-pos`, `hud-role`
- Buttons: `btn-solo`, `btn-create`, `btn-connect`, `btn-restart`, `btn-menu`

## Code Style

**Formatting:**
- No automated formatter — code is hand-formatted
- Constants block uses vertical alignment with spaces for column alignment: `MAX_SPD_ON    = 190`
- Single-line arrow functions used for brevity in event handlers and array callbacks
- Multi-statement lines separated with semicolons (not newlines) in tight audio/DOM setup code
- 2-space indentation throughout

**Strict Mode:**
- `'use strict';` at top of `game.js` (line 1) — enforced globally

**Module Pattern:**
- `Net` is an IIFE returning a public API object — the only module-like encapsulation in the codebase
- All other code is flat top-level scope inside `game.js`

**Section Headers:**
- Consistent banner comment style separates logical sections throughout `game.js`:
  ```js
  // ── Section Name ─────────────────────────────────────────────────────────────
  ```
  Sections include: Constants, DOM refs, Mutable state, Network, Audio, Helpers, Isometric projection, Track drawing, Car drawing, Remote car interpolation, Track collision, Checkpoint/lap logic, Physics update, AI driver, HUD update, Countdown overlay, Win overlay, Off-track vignette, Damage bar, Floating text feedback, Main game loop, Network message handler, Game lifecycle, Input: keyboard, Input: touch buttons, Screen management, UI event listeners, Rival selection screen

## Import Organization

**No import statements** — this is a no-bundler, no-module project. All code is global scope. Load order in `index.html`:
1. `style.css` (via `<link>`)
2. `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` (external CDN script, synchronous)
3. `game.js` (bottom of `<body>`, after DOM is parsed)

PeerJS global `Peer` is accessed directly as a global in `game.js`.

## Error Handling

**Patterns:**
- Audio API calls wrapped in `try/catch(_){}` — silently swallowed (iOS/Safari compatibility): `playCollisionSound()`, `playGoSound()`, `startEngine()`, `getAudioCtx()`
- WebRTC lifecycle errors: `catch (_) {}` — silent for expected API exceptions (e.g., `AudioBufferSourceNode.stop()` after already stopped)
- Network errors surface to UI via callback params: `onErr` passed to `Net.create()`/`Net.join()`, displayed in `waitingMsg` or `join-error` DOM elements
- Input validation on network data: explicit `isFinite()` and range checks before applying received `pos` messages (see `onMsg()`, lines 973–979)
- `darken()` helper: `try/catch` returns original hex on parse error
- Disconnect: `onDisconnect()` shows `alert()` and navigates to lobby — not silent

**What is NOT caught:**
- DOM query failures (assumes `index.html` structure is stable)
- `localStorage` access errors (no try/catch around `getItem`/`setItem`)
- `canvas.getContext('2d')` failure

**Guard patterns:**
- Early-return guards at top of functions: `if (car.finished) return;`, `if (!loopRunning) return;`, `if (engineRunning) return;`
- Null checks via short-circuit: `if (conn && conn.open) conn.send(msg)`
- `loopRunning` boolean guards the RAF loop to prevent double-scheduling

## Logging

**Framework:** `console.warn()` only — no `console.log()` or `console.error()` in production paths

**Where used:**
- `console.warn('conn', e)` — WebRTC data channel errors (`game.js:200`)
- `console.warn('peer', err)` — PeerJS peer errors (`game.js:210`)
- No debug/info logging anywhere in the codebase

## Comments

**When to Comment:**
- Inline units on every numeric constant: `// px/s`, `// px/s²`, `// rad/s`, `// px`
- Mathematical derivations in-place: `// eq speed ≈ 145 px/s`, `// min radius at eq speed = 145/(3.5×0.87)≈48px`
- Coordinate data explained: numbered waypoint comments on `AI_WAYPOINTS` and `ROAD_SPINE` entries
- Non-obvious logic explained inline: `// pointerleave fires when finger slides off the button, fixing stuck-key bug`
- Phase/mode decisions explained where order matters: `// beginCountdown() calls resetGame() internally — don't call it twice`
- Spanish comments appear only in UI-facing strings (text content), not in code logic

**No JSDoc/TSDoc** — plain JavaScript with no type annotations.

## Function Design

**Size:** Functions are focused on single responsibilities. The main `loop()` function (lines 804–943) is the largest at ~140 lines; it branches on `phase` (countdown/racing/done). All other functions are under 40 lines.

**Parameters:**
- Car physics functions take `(car, dt)` — car object + delta time
- Draw functions take `(car, styleIdx)` or similar simple typed arguments
- Default parameters used: `updateCar(car, dt, damage = 0)`, `addFloatingText(text, color, x = 240, y = 260, size = 16)`

**Return Values:**
- `resolveCarCollision()` returns a boolean (collision occurred)
- `isOnTrack()` returns a boolean
- Pure draw functions return nothing
- `project()` returns `{ x, y }` object
- `remoteRenderPos()` returns a position object

## Module Design

**No exports** — the project uses no ES modules. All functions and variables are global.

**Barrel files:** Not applicable.

**Encapsulation:**
- `Net` IIFE pattern is the only encapsulated module: exposes `{ create, join, send, destroy }`
- All audio state (`audioCtx`, `engineOsc`, etc.) is module-level mutable vars, not encapsulated

---

*Convention analysis: 2026-06-26*
