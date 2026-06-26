# Codebase Structure

**Analysis Date:** 2026-06-26

## Directory Layout

```
JuegoTest/                    # Repo root — served directly as static site
├── index.html                # All screens (DOM), loads PeerJS CDN + game.js
├── style.css                 # All styling — screen layout, buttons, HUD, animations
├── game.js                   # All game logic (~1300 lines, single file)
├── CLAUDE.md                 # Agent instructions and architecture notes
├── README.md                 # Project overview
├── .claude/
│   └── agents/               # Custom subagent prompts
│       ├── arquitecto.md
│       ├── disenador-juegos.md
│       ├── revisor-codigo.md
│       └── tester-jugabilidad.md
└── .planning/
    └── codebase/             # GSD analysis documents (generated)
```

## Directory Purposes

**Root (`/`):**
- Purpose: Everything served at the root URL. No subdirectories for source code.
- Contains: The three core files: `index.html`, `style.css`, `game.js`
- Key files: `index.html` (entry point), `game.js` (all logic), `style.css` (all styles)

**`.claude/agents/`:**
- Purpose: Custom Claude subagent system prompts for specialized review tasks
- Contains: Markdown prompt files for arquitecto, disenador-juegos, revisor-codigo, tester-jugabilidad
- These are invoked via `/agent:<name>` in Claude Code sessions

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents written by the mapping agent
- Contains: ARCHITECTURE.md, STRUCTURE.md, and other analysis docs
- Generated: Yes
- Committed: Yes (part of planning workflow)

## Key File Locations

**Entry Point (browser):**
- `index.html`: HTML shell with 6 screen `<div>` elements, HUD elements, canvas, touch buttons. Loads PeerJS from CDN then `game.js`.

**All Styling:**
- `style.css`: CSS variables, screen show/hide (`.screen` / `.screen.active`), buttons, HUD bar, canvas wrapper, touch controls, rival grid cards, result banner, shake animation.

**All Game Logic (single file, organized by section):**
- `game.js:1-112` — Constants: physics tuning, track geometry (`ROAD_SPINE`), checkpoints (`CPS`), starting grid (`START`), driver data (`RIVALS`), AI waypoints (`AI_WAYPOINTS`)
- `game.js:114-181` — DOM refs (`SCR`, HUD elements, canvas) + all mutable state variables
- `game.js:184-231` — `Net` IIFE (PeerJS WebRTC wrapper)
- `game.js:234-322` — Audio: engine oscillators, brake noise, collision, go-sound
- `game.js:324-354` — Helpers: `formatTime`, `updateLobbyRecord`, `project` (isometric)
- `game.js:356-421` — Track drawing: `drawSpinePath`, `drawTrack`
- `game.js:423-520` — Car drawing: `carStyle`, `drawCar`, `remoteRenderPos`
- `game.js:522-557` — Collision geometry: `ptSegDist2`, `isOnTrack`, `resolveCarCollision`
- `game.js:560-597` — Checkpoint/lap: `checkCheckpoints`
- `game.js:600-665` — Physics: `updateCar`, `updateAI`
- `game.js:667-801` — HUD/overlay drawing: `updateHUD`, `drawCountdown`, `drawWin`, `drawOffTrackVignette`, `drawDamageBar`, `addFloatingText`, `drawFloatingTexts`
- `game.js:804-955` — Main game loop: `loop`, `startLoop`, `stopLoop`
- `game.js:957-1011` — Network message handler: `onMsg`, `onDisconnect`
- `game.js:1013-1050` — Lifecycle: `resetGame`, `beginCountdown`
- `game.js:1052-1080` — Keyboard + touch input binding
- `game.js:1082-1281` — Screen routing (`goTo`), all UI button listeners, `buildRivalGrid`, `pollResults`

## Naming Conventions

**Files:**
- Lowercase with no prefix convention: `game.js`, `index.html`, `style.css`
- Agent prompt files: kebab-case, descriptive: `revisor-codigo.md`, `disenador-juegos.md`

**Functions (in `game.js`):**
- camelCase verbs: `updateCar`, `drawTrack`, `checkCheckpoints`, `startLoop`, `beginCountdown`, `buildRivalGrid`
- Prefixed by action type: `draw*` for rendering, `update*` for simulation, `start*/stop*` for lifecycle

**Variables:**
- Module-level state: camelCase (`lapStartTime`, `localDamage`, `loopRunning`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_SPD_ON`, `ROAD_HALF_W`, `TOTAL_LAPS`)
- Data arrays: SCREAMING_SNAKE_CASE (`RIVALS`, `AI_WAYPOINTS`, `ROAD_SPINE`, `CPS`)
- DOM refs object: `SCR` (short for screens) with lowercase string keys matching screen `id` suffixes

**CSS:**
- BEM-lite: `.screen`, `.screen.active`, `.game-hud`, `.hud-item`, `.rival-card`, `.rival-card.show`
- Element IDs: kebab-case matching function (`btn-solo`, `hud-lap`, `room-code-display`, `touch-left`)
- CSS variables: `--blue`, `--sky`, `--white`, `--dark`, `--mid` (defined in `:root`)

## Where to Add New Code

**New game mechanic (physics or AI):**
- Add the function in the physics section of `game.js` near `updateCar` (around line 600)
- Call it from the `racing` branch of `loop()` at `game.js:826`

**New screen:**
- Add the `<div id="screen-<name>" class="screen">` to `index.html` in the `.app` container
- Add `<name>: document.getElementById('screen-<name>')` to the `SCR` object at `game.js:118-125`
- Call `goTo('<name>')` from the appropriate UI event listener
- Add screen-specific CSS to `style.css` with a comment header matching the existing pattern

**New UI button:**
- Add the `<button id="btn-<name>">` to the appropriate screen `<div>` in `index.html`
- Add `document.getElementById('btn-<name>').addEventListener('click', ...)` in the UI listeners section of `game.js` (around line 1090+)

**New constant/tuning value:**
- Add to the constants block at the top of `game.js` (lines 3-50), with a comment describing units and effect

**New driver in RIVALS:**
- Add an entry to the `RIVALS` array at `game.js:58-83`
- Follow the shape: `{ name, team, num, body, accent, helmet, skill }`
- `skill` range: 0.79 (easiest) to 0.96 (hardest); update difficulty comment groups accordingly
- The `selectedRivalIdx` stable key is array index — inserting in the middle shifts all subsequent `localStorage` keys (`cr_rival_<idx>`)

**New network message type:**
- Add `send` call at the appropriate point in the game loop or lifecycle
- Add a handler branch in `onMsg` at `game.js:958-1004`

**New audio sound:**
- Add a function following the `play*/start*/stop*` naming pattern in the audio section (`game.js:234-322`)
- Always wrap in `try/catch(_){}` and call `getAudioCtx()` at the start

**New HUD element:**
- Add the element to `#screen-game > .game-hud` in `index.html`
- Grab a DOM ref alongside the existing HUD refs at `game.js:127-134`
- Update it inside `updateHUD()` at `game.js:668` or directly in the `racing` branch of `loop()`

**Tests (Playwright):**
- The `tester-jugabilidad` agent (`/.claude/agents/tester-jugabilidad.md`) handles Playwright tests
- Tests run against `http://localhost:8081` (started with `npx http-server . -p 8081`)
- No test file directory exists yet — tests would be added at the repo root or a `/tests/` directory

## Special Directories

**`.claude/agents/`:**
- Purpose: Custom subagent system prompts for Claude Code
- Generated: No (hand-authored)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents (codebase maps, phase plans)
- Generated: Yes (by GSD agents)
- Committed: Yes

---

*Structure analysis: 2026-06-26*
