<!-- refreshed: 2026-06-26 -->
# Architecture

**Analysis Date:** 2026-06-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     index.html (DOM / Screens)               │
│   lobby · create · join · rival · game · results            │
└───────────────┬───────────────────────────┬─────────────────┘
                │ goTo(name)                │ DOM refs (SCR, HUD)
                ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        game.js                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Game Loop   │  │  UI Events   │  │  Net (IIFE)      │  │
│  │  loop(ts)    │  │  btn-*       │  │  Net.create/join │  │
│  │  startLoop() │  │  listeners   │  │  Net.send        │  │
│  │  stopLoop()  │  │              │  │  onMsg handler   │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────┘  │
│         │                                                    │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │  Phase State Machine: countdown → racing → done      │    │
│  │  updateCar()  updateAI()  checkCheckpoints()         │    │
│  │  resolveCarCollision()   remoteRenderPos()           │    │
│  └──────┬───────────────────────────────────────────────┘    │
│         │                                                    │
│  ┌──────▼───────────────────────────────────────────────┐   │
│  │  Rendering  drawTrack() · drawCar() · drawHUD        │   │
│  │  project()  (isometric) · drawFloatingTexts()        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
               ┌───────────▼──────────┐
               │    External / Store   │
               │  PeerJS CDN (WebRTC) │
               │  localStorage        │
               │  Web Audio API       │
               └──────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Screen System | Shows/hides screens via `.active` CSS class | `game.js:1083-1087`, `index.html` |
| Phase State Machine | Branches game loop on `phase` variable | `game.js:809-943` |
| Game Loop | `requestAnimationFrame` tick, guarded by `loopRunning` | `game.js:804-955` |
| Physics (`updateCar`) | Auto-accel, friction, braking, steering, clamping | `game.js:600-623` |
| AI Driver (`updateAI`) | Waypoint navigation, skill-scaled speed and noise | `game.js:628-665` |
| Net (IIFE) | PeerJS WebRTC wrapper — create, join, send, destroy | `game.js:184-231` |
| Audio | Web Audio API engine/brake/collision synth, lazy init | `game.js:234-322` |
| Rendering | Canvas 2D — track, cars, HUD overlays (isometric) | `game.js:356-801` |
| Checkpoint/Lap | Ordered CP detection, lap counting, localStorage record | `game.js:560-597` |
| Input | Keyboard + Pointer Events touch buttons → `keys` object | `game.js:1052-1080` |
| UI Events | Button listeners: create/join room, rival select, restart | `game.js:1090-1226` |
| Result Poll | 300ms interval detects `phase==='done'` → results screen | `game.js:1229-1271` |

## Pattern Overview

**Overall:** Single-file procedural game loop with IIFE-encapsulated networking

**Key Characteristics:**
- All mutable game state is module-level variables in `game.js` — no classes or explicit state objects
- Rendering is pure Canvas 2D with isometric projection applied in `project()` at `game.js:344-347`
- Screen routing is CSS-only: `goTo(name)` adds/removes `.active` class on screen `<div>` elements
- The `Net` IIFE is the only encapsulated sub-module; everything else is flat top-level scope

## Layers

**Constants Layer:**
- Purpose: Tuning values, track geometry, car data, AI waypoints
- Location: `game.js:3-112`
- Contains: `TOTAL_LAPS`, `MAX_SPD_ON`, `ROAD_SPINE` (35-point polyline), `CPS` (4 checkpoints), `AI_WAYPOINTS` (18-point nav mesh), `RIVALS` (20 drivers), `CAR_STYLE_HOST`
- Depends on: Nothing
- Used by: All layers below

**State Layer:**
- Purpose: All mutable runtime variables
- Location: `game.js:114-181`
- Contains: `phase`, `gameMode`, `isHost`, `local`, `remote`, `keys`, `countdown`, `winner`, `localDamage`, `aiWpIdx`, `floatingTexts`, `lapStartTime`, `bestLapMs`
- Depends on: Constants layer
- Used by: Game loop, physics, AI, network, UI events

**Network Layer (`Net`):**
- Purpose: Wraps PeerJS WebRTC P2P connection behind a minimal API
- Location: `game.js:184-231`
- Contains: `Net.create`, `Net.join`, `Net.send`, `Net.destroy`
- Depends on: PeerJS 1.5.4 loaded from CDN (`index.html:8`)
- Used by: UI event listeners, `onMsg`, `onDisconnect`, game loop broadcast

**Audio Layer:**
- Purpose: Web Audio API synthesizer — engine tone, brake squeal, collision, go-signal
- Location: `game.js:234-322`
- Contains: `startEngine`, `stopEngine`, `updateEnginePitch`, `startBrakeSound`, `stopBrakeSound`, `playCollisionSound`, `playGoSound`
- Depends on: `getAudioCtx()` — lazy-init required for iOS/Safari
- Used by: Game loop (during `racing` phase), lifecycle functions

**Physics/Simulation Layer:**
- Purpose: Per-frame car movement, collision, off-track detection, AI navigation
- Location: `game.js:522-665`
- Contains: `updateCar`, `updateAI`, `resolveCarCollision`, `isOnTrack`, `ptSegDist2`, `checkCheckpoints`
- Depends on: Constants, State
- Used by: Game loop

**Rendering Layer:**
- Purpose: All Canvas 2D drawing — track, cars, HUD, overlays
- Location: `game.js:341-801`
- Contains: `project` (isometric), `drawTrack`, `drawCar`, `drawCountdown`, `drawWin`, `drawOffTrackVignette`, `drawDamageBar`, `drawFloatingTexts`, `remoteRenderPos`, `updateHUD`
- Depends on: State, Constants, DOM refs (`canvas`, `ctx`, HUD elements)
- Used by: Game loop

**Game Lifecycle Layer:**
- Purpose: Loop control, game reset, countdown begin, result transition
- Location: `game.js:944-1050`
- Contains: `startLoop`, `stopLoop`, `resetGame`, `beginCountdown`, `pollResults`, `startResultPoll`, `stopResultPoll`
- Depends on: All layers
- Used by: UI event listeners, `onMsg`

**UI / Input Layer:**
- Purpose: Screen routing, button event listeners, touch binding, rival grid builder
- Location: `game.js:1052-1281`
- Contains: `goTo`, `bindTouch`, `buildRivalGrid`, all `addEventListener` calls
- Depends on: All layers
- Used by: User interaction

## Data Flow

### VS CPU (Solo) Race Flow

1. User clicks `btn-solo` → `buildRivalGrid()` populates `RIVALS` cards (`game.js:1143-1183`)
2. User clicks rival card → sets `selectedRival`, `gameMode='solo'`, calls `beginCountdown()` (`game.js:1173-1180`)
3. `beginCountdown()` → `resetGame()` → `goTo('game')` → `startLoop()` → `startEngine()` (`game.js:1045-1050`)
4. Each RAF tick: `loop(ts)` checks `phase`:
   - `countdown`: draws track + cars + countdown overlay; advances `countdown` each second (`game.js:809-825`)
   - `racing`: `updateCar(local)` → `checkCheckpoints(local)` → `updateAI(remote)` → `checkCheckpoints(remote)` → `resolveCarCollision` → audio → render (`game.js:826-933`)
   - `done`: static render + `drawWin()` overlay (`game.js:934-940`)
5. `pollResults()` (300ms interval) detects `phase==='done'` → populates result screen → `goTo('results')` (`game.js:1230-1263`)

### Multiplayer Flow

1. Host clicks `btn-create` → `Net.create(...)` → PeerJS creates peer with 6-char ID → displays room code (`game.js:1090-1104`)
2. Guest clicks `btn-join-screen` → enters code → `Net.join(code)` → sends `{type:'ready'}` on open (`game.js:1117-1136`)
3. Host `onMsg` receives `ready` → sends `{type:'start'}` → both call `beginCountdown()` (`game.js:961-970`)
4. During `racing`: every 50ms (`NET_MS`) host/guest broadcast `{type:'pos', x,y,angle,speed,lap,cp}` (`game.js:835-843`)
5. `onMsg` receives `pos` → validates all fields → updates `remote` state → `remoteRenderPos()` dead-reckons for smooth render (`game.js:972-990`)
6. When local car finishes: sends `{type:'finish'}` → remote sets `winner='remote'` (`game.js:928-929`, `game.js:992-996`)

### State Management

- All game state is module-level variables in `game.js` — no store, no reactive system
- `phase` is the primary branch variable: `'lobby'|'creating'|'waiting'|'joining'|'countdown'|'racing'|'done'`
- `winner` is set exactly once per race; `resetGame()` nulls it to start fresh
- Persistence: `localStorage` keys `cr_best_lap_ms` (best lap) and `cr_rival_<idx>` (win/loss per rival)

## Key Abstractions

**`local` / `remote` car objects:**
- Shape: `{ x, y, angle, speed, lap, nextCP, finished }`
- Remote adds: `{ prevX, prevY, prevAngle, lastUpdate }` for interpolation
- Created by `makeCar(idx)` at `game.js:144-147`

**`keys` object:**
- Shape: `{ left: bool, right: bool, down: bool }`
- Written by keyboard events and `bindTouch()`; read by `updateCar()` each tick

**`Net` IIFE:**
- Public API: `Net.create`, `Net.join`, `Net.send`, `Net.destroy`
- Internal state: `peer`, `conn`, `msgCb`, `closeCb` — all private to the IIFE closure
- Location: `game.js:184-231`

**Isometric projection (`ISO`):**
- Config object: `{ cx, cy, wx, wy, sx, sy }` at `game.js:342`
- `project(wx, wy)` converts world coords to canvas screen coords
- All track and car drawing passes through `project()`

**`RIVALS` array:**
- 20 entries with `{ name, team, num, body, accent, helmet, skill }`
- `skill` (0.79–0.96) directly scales AI max speed in `updateAI()`
- Indexed by position in array; `localStorage` key is `cr_rival_<idx>`

## Entry Points

**Browser Load:**
- `index.html` parsed → `style.css` applied → PeerJS CDN loaded → `game.js` executed
- `game.js` top-level: DOM refs grabbed, state initialized, event listeners bound
- Last two calls: `startResultPoll()` and `updateLobbyRecord()` at `game.js:1280-1281`

**Game Start (Solo):**
- `beginCountdown()` at `game.js:1045` — the single entry into active gameplay

**Game Start (Multi):**
- Host: `onMsg` receives `'ready'` → `beginCountdown()` at `game.js:963`
- Guest: `onMsg` receives `'start'` → `beginCountdown()` at `game.js:967`

**Loop:**
- `startLoop()` at `game.js:945` — schedules first `requestAnimationFrame(loop)`
- `loop(ts)` at `game.js:804` — self-scheduling; bails if `!loopRunning`

## Architectural Constraints

- **Single thread:** Browser main thread only. No workers. Heavy frame logic (physics + AI + render) all runs synchronously in the RAF callback.
- **Global state:** All game variables are module-level (file-scope) in `game.js`. No encapsulation beyond the `Net` IIFE. Concurrency is not a concern (single-threaded JS), but any function can read/write any state.
- **No build step:** Files served as-is. `game.js` is one ~1300-line file. No modules, no imports, no bundler.
- **Canvas size:** Fixed at 480×640 px (`index.html:69`). CSS `width:100%` scales it responsively but internal coordinate system is always 480×640.
- **PeerJS dependency:** Loaded from `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js`. Multiplayer fails if CDN is unreachable. No local fallback.
- **Audio:** `AudioContext` must be created inside a user gesture handler. `getAudioCtx()` is called lazily; called early in `btn-solo` click to warm up on iOS.

## Anti-Patterns

### Double `resetGame()` call on host restart

**What happens:** `btn-restart` for host calls `resetGame(); beginCountdown()` in solo mode (`game.js:1212-1213`), but `beginCountdown()` already calls `resetGame()` internally — resulting in two resets per restart.

**Why it's wrong:** State is zeroed twice unnecessarily; the first `resetGame()` call is wasted work and creates a subtle maintenance trap.

**Do this instead:** Call only `beginCountdown()` (which calls `resetGame()` internally), matching the pattern used in the rival-card click handler at `game.js:1178`.

### Shared `keys` object checked inside physics

**What happens:** `updateCar()` at `game.js:611-618` directly reads the module-level `keys` object. The AI path `updateAI()` does not use `keys` but shares the same function signature slot.

**Why it's wrong:** `updateCar()` cannot be unit-tested or called for replay/ghost cars without the live keyboard state leaking in.

**Do this instead:** Pass input state as a parameter `updateCar(car, dt, damage, input)` where `input = keys` for the player and `input = {left:false,right:false,down:false}` for other uses.

## Error Handling

**Strategy:** Fail-silent with `try/catch` around audio and optional DOM operations; alert on network disconnect.

**Patterns:**
- Audio functions (`startEngine`, `playCollisionSound`, etc.) are all wrapped in `try/catch(_){}` — audio failure never crashes the game
- Network disconnect triggers `alert()` + `goTo('lobby')` + `Net.destroy()` in `onDisconnect()` at `game.js:1006-1011`
- Incoming `pos` messages are range-validated before being applied to `remote` (`game.js:974-979`)
- `finish` messages require `remote.lap >= TOTAL_LAPS - 1` to prevent premature wins (`game.js:994`)

## Cross-Cutting Concerns

**Logging:** `console.warn()` for PeerJS peer/conn errors only (`game.js:201`, `game.js:218`). No structured logging.

**Validation:** Network input only — `pos` message fields checked for `isFinite` and range bounds at `game.js:974-979`.

**Authentication:** None. Room code (6-char alphanumeric) is the only access control for multiplayer rooms.

**Persistence:** `localStorage` only. Two key namespaces: `cr_best_lap_ms` (single value) and `cr_rival_<0-19>` (per-rival win/loss string).

---

*Architecture analysis: 2026-06-26*
