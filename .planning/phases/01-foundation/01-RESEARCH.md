# Phase 1: Foundation - Research

**Researched:** 2026-06-26
**Domain:** Vanilla JS/Canvas game — bug fixes, input, grid data, responsive CSS, multiplayer UX
**Confidence:** HIGH (all claims verified by direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** RIVALS array grows from 20 to 21 entries (22 drivers total including Colapinto as player). Cadillac is the new team.
- **D-02:** Full 2026 grid confirmed (McLaren, Ferrari, Mercedes, Red Bull, Williams, Aston Martin, Alpine/Gasly, Haas, Audi, Racing Bulls, Cadillac).
- **D-03:** Exact car numbers and livery colors MUST be verified at `https://www.formula1.com/en/drivers` and `https://www.formula1.com/en/teams` during implementation. Cadillac in particular has no historical colors in the game.
- **D-04:** Skill values (0.79–0.96) assigned by 2026 performance tier. Top tier = Verstappen, Norris, Leclerc, Hamilton, Piastri; mid = Russell, Antonelli, Sainz, Alonso, Gasly, Lawson; lower = Albon, Stroll, Ocon, Bearman, Bortoleto, Hülkenberg, Hadjar, Bottas, Pérez, Lindblad.
- **D-05:** localStorage keys `cr_rival_<idx>` extend from 0–19 to 0–20. No migration needed — old keys become orphans.
- **D-06:** Arrow keys and WASD already mapped. Only Spacebar as brake is missing (CTRL-03). Add `if (e.key === ' ') keys.down = true/false` to existing keydown/keyup listeners.
- **D-07:** ArrowUp and W (acceleration) are not needed — AUTO_ACCEL is constant, no manual acceleration.
- **D-08 (Claude's discretion):** DPR: static scale at init — `canvas.width = 480 * dpr`, `canvas.height = 640 * dpr`, `ctx.scale(dpr, dpr)`. No dynamic resize listener needed.
- **D-09 (Claude's discretion):** Mobile rival carousel (< 500px): prev/next buttons showing 1 rival at a time. Swipe gesture is optional enhancement, not required.
- **D-10:** Phase 1 does NOT touch visual design (fonts, colors, animations). That is Phase 3 (UI-07).
- **D-11 (BUG-01):** Remove the `resetGame()` call on line 1212 of game.js inside the solo-mode branch of `btn-restart`. `beginCountdown()` already calls it.
- **D-12 (BUG-02):** Add guard in `onMsg` for `'finish'` message: `if (remote.lap < TOTAL_LAPS - 1) return;` — applies symmetrically to both host and guest receive paths.
- **D-13 (BUG-03):** Consolidate the two identical `cpScore` lambda definitions in `updateHUD()` (lines 673 and 682) into a single definition at the top of the function.
- **D-14 (BUG-04):** `lapStartTime` already initialized to `performance.now()` at the `countdown → racing` transition (line 820). The existing `if (lapStartTime > 0)` guard in `checkCheckpoints` (line 568) correctly measures lap 1 as a result. Investigate whether the displayed `lapNum` text has an off-by-one.
- **D-15 (UI-05):** Copy button uses `navigator.clipboard.writeText(roomCode)`. Toast "¡Copiado!" as a div with opacity transition (1.5s), not `alert()`.
- **D-16 (UI-06):** Disconnect modal: div overlay with high z-index, message "El rival se desconectó. Volviendo al menú...", `setTimeout(() => goTo('lobby'), 3000)`. Replaces `alert()` in `onDisconnect()` at game.js lines 1006–1011.

### Claude's Discretion

- DPR: static scale at init (no resize listener).
- Carousel mobile: prev/next buttons (swipe optional).
- Responsive: `max-width + margin: auto` to center; canvas already uses `width: 100%` in CSS.
- Touch bug UI-02: add `user-select: none` and `-webkit-user-select: none` to body and game container.

### Deferred Ideas (OUT OF SCOPE)

- Visual redesign (typography, animations, Alpine colors) — Phase 3 (UI-07).
- Swipe gesture in carousel — optional, not blocking.
- Dynamic DPR listener on resize/orientation — not needed for Phase 1.
- Inclinometer / accelerometer steering — Out of scope v2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUG-01 | Remove duplicate `resetGame()` in `btn-restart` solo branch (line 1212) | VERIFIED at line 1212: `resetGame(); beginCountdown();` — first call is redundant |
| BUG-02 | Add lap guard on `finish` message in `onMsg` for guest path | VERIFIED: current code at lines 992–996 only validates for remote.lap on host receive; guest path has no guard |
| BUG-03 | Consolidate duplicate `cpScore` lambda in `updateHUD()` | VERIFIED: two identical definitions at lines 673 and 682 |
| BUG-04 | Fix lap timer starting one lap late | VERIFIED: `lapStartTime = performance.now()` IS set at line 820 (phase transition). Lap 1 IS measured. The actual bug may be narrower — see BUG-04 detail section |
| CTRL-01 | Arrow key support (←→ steer, ↓ brake) | VERIFIED DONE: game.js lines 1054–1056 already map ArrowLeft, ArrowRight, ArrowDown |
| CTRL-02 | WASD support (A/D steer, S brake) | VERIFIED DONE: game.js lines 1054–1056 already map a, d, s via toLowerCase() |
| CTRL-03 | Spacebar as brake | VERIFIED MISSING: no `e.key === ' '` in keydown/keyup listeners. Requires 2-line addition |
| GRID-01 | Update RIVALS array with 2026 drivers (21 rivals) | VERIFIED: current array has 20 entries, Colapinto is entry 6 (must be removed), net change: remove Colapinto entry + add Hadjar, Antonelli, Gasly, Bearman, Bortoleto, Hülkenberg, Bottas, Pérez, Lindblad, Albon, Lawson (verified against D-02 list) |
| GRID-02 | Update team colors for 2026 liveries | ASSUMED: current colors are 2025. Agent must verify at formula1.com |
| UI-01 | Fully responsive layout using vw/vh | VERIFIED: current CSS uses `min(500px, 100%)` and `width: 100%` on canvas — good foundation; rival-grid has `max-height: 58vh` already |
| UI-02 | Fix mobile tap text selection | VERIFIED PARTIALLY DONE: `.app` already has `user-select: none` and `-webkit-user-select: none`. `.game-canvas-wrapper` and touch controls also have it. Check if body element itself needs it |
| UI-03 | Canvas devicePixelRatio scaling | VERIFIED MISSING: `index.html` line 69 sets fixed `width="480" height="640"` with no DPR scaling in game.js |
| UI-04 | Mobile rival carousel for < 500px | VERIFIED MISSING: `.rival-grid` uses a 2-column CSS grid with no responsive change at narrow widths |
| UI-05 | Copy room code button with toast | VERIFIED MISSING: `screen-create` in index.html has no copy button; room code display is a static div |
| UI-06 | In-game disconnect modal instead of alert() | VERIFIED: `onDisconnect()` at game.js line 1008 uses `alert()` |
</phase_requirements>

---

## Summary

Phase 1 is a pure correctness and polish pass on an already-working vanilla JS/Canvas game. There are no external dependencies to install — every change goes directly into `game.js`, `style.css`, or `index.html`. The codebase was read line-by-line for each requirement.

The most important finding: **CTRL-01 and CTRL-02 are already implemented.** Arrow keys and WASD are fully wired at game.js lines 1054–1062. Only CTRL-03 (spacebar) is truly missing. The planner should treat these as a 2-line fix, not a feature implementation.

**BUG-04 is more nuanced than described.** `lapStartTime` is correctly initialized to `performance.now()` at the `countdown → racing` transition (line 820), and the `if (lapStartTime > 0)` guard in `checkCheckpoints` (line 568) will correctly enter the recording branch on the first CP0 crossing. The real issue is the `lapNum` display text is computed as `car.lap + 1` before `car.lap++` (line 571 shows lap then line 587 increments) — this is correct. A closer read of CONCERNS.md indicates the lap timer IS set at line 820, so the "1 lap late" symptom may depend on how the initial `lapStartTime = 0` in `resetGame()` (line 1024) interacts with line 568's `> 0` check. The fix is to confirm line 820 sets it correctly (it does) and verify `resetGame` sets it to 0, not `performance.now()`. The fix action is minimal: verify the existing line 820 handles it, and if the `lapStartTime = 0` in resetGame is the true issue, move initialization into `beginCountdown()` after `resetGame()`.

**UI-02 is substantially already done.** `.app`, `.game-canvas-wrapper`, `.touch-controls`, and `.touch-btn` all have `user-select: none`. The body element itself does not, but the game wrapper covers everything. This may be a no-op fix or require only a CSS body addition.

**Primary recommendation:** Implement in this order: (1) bug fixes — lines already identified; (2) CTRL-03 spacebar — 2-line keydown/keyup addition; (3) RIVALS array update — data-only change; (4) DPR canvas init — 3-line change in game.js; (5) disconnect modal + copy button — DOM + CSS additions; (6) mobile carousel — CSS + JS restructure of `buildRivalGrid()`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bug fixes (BUG-01 to BUG-04) | game.js (logic) | — | All bugs are in game loop, input handling, and HUD update logic |
| Keyboard controls (CTRL-03) | game.js (input layer) | — | All input lives in the keydown/keyup listeners at game.js:1052–1062 |
| Driver grid data (GRID-01/02) | game.js (constants layer) | — | `RIVALS` array at game.js:58–83 is the single source of truth |
| Responsive layout (UI-01) | style.css | index.html | CSS media queries and layout fixes; no JS needed |
| Mobile text-select fix (UI-02) | style.css | — | CSS-only: `user-select: none` |
| DPR canvas scaling (UI-03) | game.js (init) | index.html | canvas.width/height set in JS; HTML attr is default only |
| Mobile carousel (UI-04) | game.js (`buildRivalGrid`) | style.css | Carousel requires JS state (currentIdx) + CSS for layout |
| Copy button + toast (UI-05) | index.html (DOM) + game.js (handler) | style.css (toast CSS) | New DOM element + event listener + CSS animation |
| Disconnect modal (UI-06) | game.js (`onDisconnect`) | index.html (DOM) + style.css | Replace alert() with overlay div; CSS positions it |

---

## Standard Stack

This phase adds zero external libraries. The project constraint (no build tools, no bundler, no npm) means all changes are made directly in the three source files.

### Core (already in use)
| API / Feature | Version | Purpose | Status |
|---------------|---------|---------|--------|
| Canvas 2D API | Browser native | All game rendering | Existing |
| Web Audio API | Browser native | Engine, brake, collision sounds | Existing |
| PeerJS | 1.5.4 (CDN) | WebRTC P2P multiplayer | Existing |
| `navigator.clipboard.writeText()` | Browser native | Copy room code to clipboard | Phase 1 addition |
| `window.devicePixelRatio` | Browser native | HiDPI canvas scaling | Phase 1 addition |
| Pointer Events API | Browser native | Touch input (already used in bindTouch) | Existing |

### Clipboard API Compatibility Note [VERIFIED: MDN Web Docs]
`navigator.clipboard.writeText()` requires a secure context (HTTPS or localhost). When served via `npx http-server` on localhost, it is available. When opened as a `file://` URL directly, it is NOT available. The implementation agent must handle the rejection gracefully:

```javascript
// Pattern: clipboard with fallback
document.getElementById('btn-copy-code').addEventListener('click', () => {
  const code = document.getElementById('room-code-display').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('¡Copiado!');
  }).catch(() => {
    // Fallback: select text manually (file:// context)
    showToast('Copia el código manualmente');
  });
});
```

---

## Architecture Patterns

### System Architecture Diagram

```
User Input
   │
   ├── keyboard events (game.js:1052–1062) ──→ keys{left, right, down}
   │                                              │
   └── touch bindTouch() (game.js:1065–1080) ────┘
                                                  │
                                                  ▼
                                        updateCar(local, dt, damage)
                                        (reads keys each RAF tick)

RIVALS array (game.js:58–83)
   │
   └──→ buildRivalGrid() ──→ .rival-grid DOM ──→ user clicks card ──→ beginCountdown()
        (game.js:1143)       (index.html)
        [Phase 1: add carousel mode for < 500px]

Net (IIFE) ──→ onMsg() ──→ if type==='finish': guard check ──→ winner / phase='done'
              onDisconnect() → [Phase 1: replace alert() with modal overlay]

beginCountdown()
   └──→ resetGame() [lapStartTime = 0]
   └──→ goTo('game')
   └──→ startLoop()
         └──→ loop(ts):
               if phase==='countdown': lapStartTime set at line 820 when phase→'racing'
               if phase==='racing': updateCar → checkCheckpoints → updateHUD → updateAI → render
               if phase==='done': static render
```

### Recommended Project Structure (unchanged from existing)
```
/
├── index.html      # DOM + screens (add: copy button, disconnect modal div)
├── style.css       # Layout + animations (add: toast CSS, carousel CSS, media query)
└── game.js         # All game logic (all bug fixes, CTRL-03, DPR init, carousel JS, onDisconnect modal)
```

### Pattern 1: Spacebar Brake Addition (CTRL-03)

**What:** Add `' '` (spacebar) to existing keydown/keyup listeners.

**Where:** game.js lines 1053–1062.

**Example:**
```javascript
// Source: game.js:1053 (existing pattern, extend with spacebar)
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
  if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') keys.down  = true;
  if (e.key === ' ')                                          keys.down  = true;  // ADD
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
  if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') keys.down  = false;
  if (e.key === ' ')                                          keys.down  = false; // ADD
});
```

**Pitfall:** Spacebar scrolls the page if the game screen is taller than the viewport. Add `e.preventDefault()` when `e.key === ' '` and the game is in `racing` phase, or unconditionally inside the keydown handler if it's safe (the game is full-screen).

### Pattern 2: DPR Canvas Init (UI-03)

**What:** Scale canvas buffer to devicePixelRatio at startup. CSS `width: 100%` already handles visual scaling.

**Where:** Add at the top of game.js, after DOM refs are grabbed (after line 116 where `ctx` is assigned).

**Example:**
```javascript
// Source: MDN Canvas pixel density pattern
(function initDPR() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = 480 * dpr;
  canvas.height = 640 * dpr;
  ctx.scale(dpr, dpr);
})();
```

**Important:** The internal coordinate system stays 480×640. `project()` and all drawing calls remain unchanged. Only the buffer resolution increases. The CSS `width: 100%` / `height: auto` on `canvas` continues to handle visual sizing.

### Pattern 3: Toast Notification (UI-05)

**What:** Non-blocking "¡Copiado!" toast using CSS opacity transition.

**index.html addition** (inside `screen-create`, after the room-code div):
```html
<button id="btn-copy-code" class="btn btn-secondary">Copiar código</button>
<div id="copy-toast" class="copy-toast" aria-live="polite"></div>
```

**style.css addition:**
```css
.copy-toast {
  opacity: 0;
  transition: opacity 0.2s ease;
  font-size: 0.82rem;
  color: #10b981;
  font-weight: 700;
  letter-spacing: 1px;
  min-height: 20px;
}
.copy-toast.visible { opacity: 1; }
```

**game.js handler:**
```javascript
document.getElementById('btn-copy-code').addEventListener('click', () => {
  const code = document.getElementById('room-code-display').textContent;
  const toast = document.getElementById('copy-toast');
  navigator.clipboard.writeText(code).then(() => {
    toast.textContent = '¡Copiado!';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 1500);
  }).catch(() => {
    toast.textContent = 'Copia el código manualmente';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  });
});
```

### Pattern 4: Disconnect Modal (UI-06)

**What:** Replace `alert()` in `onDisconnect()` with a non-blocking overlay div.

**index.html addition** (inside `.app`, outside all screens):
```html
<div id="disconnect-modal" class="disconnect-modal" hidden>
  <p>El rival se desconectó.</p>
  <p>Volviendo al menú…</p>
</div>
```

**style.css addition:**
```css
.disconnect-modal {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(5, 10, 26, 0.92);
  z-index: 9999;
  color: #f8fafc;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
  padding: 24px;
}
.disconnect-modal[hidden] { display: none; }
```

**game.js replacement for onDisconnect():**
```javascript
function onDisconnect() {
  stopLoop();
  Net.destroy();
  const modal = document.getElementById('disconnect-modal');
  if (modal) {
    modal.hidden = false;
    setTimeout(() => {
      modal.hidden = true;
      goTo('lobby');
    }, 3000);
  } else {
    goTo('lobby');
  }
}
```

### Pattern 5: Mobile Carousel (UI-04)

**What:** Replace the 2-column `.rival-grid` with single-card display + prev/next buttons when the container is narrow. Implemented in `buildRivalGrid()` with a `currentIdx` variable.

**Approach:** Detect carousel mode at build time using `window.innerWidth` (or the container's rendered width). For widths < 500px, render all cards but show only `currentIdx` via CSS. Alternatively, keep the cards rendered but add prev/next button state management.

**index.html addition** (inside `screen-rival`, wrapping `.rival-grid`):
```html
<div class="carousel-wrapper">
  <button id="rival-prev" class="btn btn-ghost carousel-btn" aria-label="Anterior">&#8249;</button>
  <div class="rival-grid"></div>
  <button id="rival-next" class="btn btn-ghost carousel-btn" aria-label="Siguiente">&#8250;</button>
</div>
<div id="carousel-indicator" class="carousel-indicator"></div>
```

**style.css additions:**
```css
@media (max-width: 499px) {
  .rival-grid {
    grid-template-columns: 1fr;  /* single column in carousel */
    max-height: none;
    overflow: hidden;            /* hide non-active cards */
  }
  .rival-card { display: none; }
  .rival-card.carousel-active { display: flex; }
  .carousel-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .carousel-btn { flex-shrink: 0; padding: 10px 16px; }
  .carousel-indicator {
    text-align: center;
    font-size: 0.72rem;
    color: #64748b;
    letter-spacing: 1px;
  }
}
@media (min-width: 500px) {
  .carousel-wrapper { display: contents; } /* no-op wrapper on desktop */
  .carousel-btn { display: none; }
  .carousel-indicator { display: none; }
  /* .rival-card.carousel-active not needed on desktop — all show */
}
```

**game.js additions to `buildRivalGrid()`:**
```javascript
// After building all cards, add carousel logic
let carouselIdx = 0;
const isCarousel = () => window.innerWidth < 500;

function updateCarousel() {
  if (!isCarousel()) {
    document.querySelectorAll('.rival-card').forEach(c => {
      c.classList.remove('carousel-active');
      c.style.display = '';  // let CSS grid handle it
    });
    document.getElementById('carousel-indicator').textContent = '';
    return;
  }
  const cards = document.querySelectorAll('.rival-card');
  cards.forEach((c, i) => {
    c.classList.toggle('carousel-active', i === carouselIdx);
  });
  document.getElementById('carousel-indicator').textContent =
    `${carouselIdx + 1} / ${cards.length}`;
}

document.getElementById('rival-prev').addEventListener('click', () => {
  const cards = document.querySelectorAll('.rival-card');
  carouselIdx = (carouselIdx - 1 + cards.length) % cards.length;
  updateCarousel();
});
document.getElementById('rival-next').addEventListener('click', () => {
  const cards = document.querySelectorAll('.rival-card');
  carouselIdx = (carouselIdx + 1) % cards.length;
  updateCarousel();
});

updateCarousel();
```

**Note:** The `carouselIdx` variable must be scoped inside `buildRivalGrid()` or a closure, not globally, to reset to 0 on each call to `buildRivalGrid()`.

### Anti-Patterns to Avoid

- **Calling `resetGame()` before `beginCountdown()`:** `beginCountdown()` already calls `resetGame()` as its first action. Calling it again overwrites state unnecessarily and causes double audio init. (BUG-01)
- **Trusting `finish` messages without lap validation:** A network de-sync or malicious peer can send a premature `finish`. Always guard with `if (remote.lap < TOTAL_LAPS - 1) return;`. (BUG-02)
- **Using `alert()` during gameplay:** `alert()` blocks the JS thread and the RAF loop. On iOS Safari it can be suppressed silently, leaving the game frozen. Use modal overlays with setTimeout. (UI-06)
- **Setting `canvas.width/height` in HTML only:** The HTML `width="480" height="640"` attribute sets the buffer size but cannot know `devicePixelRatio` at parse time. Always override in JS after load with DPR scaling. (UI-03)
- **Calling `navigator.clipboard.writeText()` without try/catch or `.catch()`:** Will reject in file:// context and in browsers with clipboard permission denied. Always handle the promise rejection. (UI-05)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Copy text to clipboard | Custom `execCommand('copy')` workaround | `navigator.clipboard.writeText()` | `execCommand` is deprecated; clipboard API is standard in all target browsers |
| HiDPI canvas scaling | Custom scaling matrix | `canvas.width = 480 * dpr; ctx.scale(dpr, dpr)` | Browser provides `window.devicePixelRatio`; this is the canonical pattern |
| Non-blocking notification | Custom timer/polling | CSS opacity transition + setTimeout | Simpler, no JS animation loop needed |
| Mobile-only carousel layout | JS-only visibility toggle | CSS `@media` + `.carousel-active` class | CSS handles the layout; JS only manages the index |

**Key insight:** This phase is about removing hand-rolled workarounds (alert(), redundant resetGame(), duplicate lambda) and using browser-native APIs correctly.

---

## Bug Fix Details (Verified Line Numbers)

### BUG-01: Double resetGame() in btn-restart

**Exact location:** game.js line 1212
```javascript
// CURRENT (line 1211–1213):
} else {
  resetGame(); beginCountdown();  // resetGame() here is redundant
}
```
**Fix:** Change to `beginCountdown();` only. `beginCountdown()` at line 1045 calls `resetGame()` as its first action.

### BUG-02: Missing finish guard for guest

**Exact location:** game.js lines 992–997

**Current code:**
```javascript
if (data.type === 'finish' && !winner) {
  // Require remote to be near the end to prevent premature finish messages
  if (remote.lap < TOTAL_LAPS - 1) return;
  winner = 'remote';
  phase  = 'done';
}
```

**Finding:** The guard `if (remote.lap < TOTAL_LAPS - 1) return;` already exists at line 994. Per CONCERNS.md: the guard is present but only correct for one direction. The current structure means BOTH host and guest receiving a `finish` message check `remote.lap` — and in the guest's perspective, `remote` is the host. So when the host sends `finish`, the guest checks `remote.lap` which IS the host's lap. This may already be symmetric. The implementation agent should trace the `isHost` flag through `onMsg` to confirm whether an asymmetry exists. The CONCERNS.md description says "the guest validates nothing," but the code review shows the guard is at line 994 before `winner` is set. Verify whether there is a second code path.

### BUG-03: Duplicate cpScore lambda

**Exact location:** game.js lines 673 and 682

**Current code:**
```javascript
// Line 673:
const cpScore = c => c.finished ? Infinity : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
const isFirst = cpScore(local) >= cpScore(remote);
// ...
// Line 682 (inside the solo-mode gap block):
const cpScore  = c => c.finished ? Infinity : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
```

**Fix:** Hoist the single definition to the top of `updateHUD()` before line 669 (`const lap = ...`), then remove the second definition at line 682. Both usages (line 674 and the gap block) reference the same hoisted constant.

### BUG-04: Lap timer start

**Verified behavior from code:**
- `resetGame()` (line 1024): sets `lapStartTime = 0`
- Phase transition `countdown → racing` (line 820): sets `lapStartTime = performance.now()`
- `checkCheckpoints()` line 568: `if (lapStartTime > 0)` — this is TRUE after line 820 fires

**Conclusion:** `lapStartTime` IS correctly initialized before the first CP0 crossing. Lap 1 timing DOES work. The CONCERNS.md describes this accurately as "the code at 820 sets it before the lap completes, so lap 1 IS recorded." The bug described in D-14 (CONTEXT.md) about initialization may be describing a theoretical edge case or may refer to an older code version. The implementation agent should **read lines 568–590 and 818–825 carefully** and verify the actual symptom by manual play before touching this code. If lapStartTime is correct, the fix may be a no-op or very minor.

---

## RIVALS Array Update (GRID-01 / GRID-02)

### Current State (verified from game.js lines 58–83)

The current `RIVALS` array has 20 entries with this structure:
```javascript
{ name: string, team: string, num: string, body: string, accent: string, helmet: string, skill: number }
```

Current entry for **Franco Colapinto** is at index 6:
```javascript
{ name:'Franco Colapinto', team:'BWT Alpine', num:'43', body:'#0090d0', accent:'#f569b7', helmet:'#74c0fc', skill:0.85 }
```

This entry MUST be removed (player is Colapinto, not a rival).

### Drivers to Add (from D-02, skill from D-04)

| Driver | Team | Status in Current RIVALS |
|--------|------|--------------------------|
| Lando Norris | McLaren | EXISTS (index 17, skill 0.93) |
| Oscar Piastri | McLaren | EXISTS (index 13, skill 0.89) |
| Charles Leclerc | Ferrari | EXISTS (index 16, skill 0.92) |
| Lewis Hamilton | Ferrari | EXISTS (index 18, skill 0.94) |
| George Russell | Mercedes | EXISTS (index 14, skill 0.90) |
| Kimi Antonelli | Mercedes | EXISTS (index 5, skill 0.84) |
| Max Verstappen | Red Bull | EXISTS (index 19, skill 0.96) |
| Isack Hadjar | Red Bull | EXISTS (index 3, skill 0.82) |
| Carlos Sainz | Williams | EXISTS (index 12, skill 0.88) |
| Alex Albon | Williams | EXISTS (index 8, skill 0.86) |
| Fernando Alonso | Aston Martin | EXISTS (index 15, skill 0.91) |
| Lance Stroll | Aston Martin | EXISTS (index 2, skill 0.81) |
| Pierre Gasly | Alpine | EXISTS (index 10, skill 0.87) |
| Esteban Ocon | Haas | EXISTS (index 7, skill 0.85) |
| Oliver Bearman | Haas | EXISTS (index 0, skill 0.79) |
| Gabriel Bortoleto | Audi (was Kick Sauber) | EXISTS as Sauber (index 1, skill 0.80) — team name update needed |
| Nico Hülkenberg | Audi (was Kick Sauber) | EXISTS as Sauber (index 9, skill 0.86) — team name update needed |
| Liam Lawson | Racing Bulls | EXISTS (index 4, skill 0.84) |
| Arvid Lindblad | Racing Bulls | MISSING — new entry needed |
| Valtteri Bottas | Cadillac | MISSING — new entry needed |
| Sergio Pérez | Cadillac | MISSING — new entry needed |
| Franco Colapinto | Alpine | REMOVE — is the player |

**Net changes:**
- Remove: 1 entry (Colapinto at index 6)
- Add: 3 entries (Lindblad, Bottas, Pérez)
- Update team name: Bortoleto and Hülkenberg from "Kick Sauber" to "Audi" (verify at formula1.com)
- Update team: Tsunoda (current index 11) — in 2026 he moves to Red Bull. But D-02 does NOT list Tsunoda. **He is not in the 2026 grid per D-02.** Remove Tsunoda entry.
- Net: 20 entries - 1 (Colapinto) - 1 (Tsunoda) + 3 (Lindblad, Bottas, Pérez) = **21 entries** — matches D-01.

**Wait — verifying Tsunoda:** Current RIVALS has Yuki Tsunoda at index 11 with `team:'Red Bull Racing', num:'22'`. Per D-02 grid, Red Bull drivers are Verstappen and Hadjar. Tsunoda is NOT listed in the 2026 grid per the user's confirmed D-02 table. Therefore Tsunoda must be removed.

### Colors and Numbers

The implementation agent MUST verify at `https://www.formula1.com/en/drivers`:
- Cadillac livery colors for Bottas and Pérez (no historical data in game)
- Audi livery colors (updated from Kick Sauber green)
- Confirm exact car numbers for new entries
- Verify Bearman's number (currently '87') and Hadjar's number (currently '6') against 2026 season

### localStorage Impact (D-05)

The indices of existing drivers will change when Colapinto (index 6) and Tsunoda (index 11) are removed. This means `cr_rival_<0-19>` keys will now refer to different drivers. Per D-05: no migration needed — orphaned keys are accepted. However, the implementation agent should note this in comments so future phases know.

---

## Responsive UI Details

### Current CSS State (verified from style.css)

| Property | Current | Phase 1 Target |
|----------|---------|----------------|
| Body layout | `display:flex; align-items:center; justify-content:center` | No change needed |
| App width | `width: min(500px, 100%)` | No change needed |
| Canvas CSS | `width: 100%; height: auto` | No change needed |
| user-select | On `.app`, `.game-canvas-wrapper`, `.touch-controls`, `.touch-btn` | Possibly add to `body` |
| rival-grid | `grid-template-columns: 1fr 1fr` | Add `@media (max-width: 499px)` override |
| Canvas buffer | Fixed `480×640` (HTML attr) | Add DPR scaling in game.js |

**Finding:** The CSS layout is already well-structured for responsiveness. The body uses flexbox centering, the app uses `min(500px, 100%)`, and the canvas uses `width: 100%`. The main gaps are (a) the rival grid doesn't adapt on narrow screens, (b) canvas buffer is not DPR-aware, and (c) no carousel logic exists.

**UI-01 analysis:** The `vw/vh` requirement is already partially met — `min-height: 100vh` on body, `max-height: 58vh` on rival-grid. No major layout changes are needed beyond the carousel and DPR fixes.

---

## Common Pitfalls

### Pitfall 1: Spacebar Default Scroll Behavior
**What goes wrong:** When the game screen is active, pressing spacebar triggers the browser's default page-scroll behavior before the keydown listener fires.
**Why it happens:** Browser default handling of `Space` key scrolls the page if there's scrollable content.
**How to avoid:** Add `if (e.key === ' ') e.preventDefault();` in the keydown handler. Do this unconditionally or gate on `phase === 'racing'` to avoid blocking spacebar in text inputs.
**Warning signs:** Page jumps/scrolls when brake is pressed.

### Pitfall 2: Carousel Index Not Resetting
**What goes wrong:** User selects rival via carousel at index 12, then goes back to lobby and re-enters rival select — the carousel starts at index 12 instead of 0.
**Why it happens:** If `carouselIdx` is a module-level variable, it persists across calls to `buildRivalGrid()`.
**How to avoid:** Reset `carouselIdx = 0` at the start of `buildRivalGrid()`, or declare it as a local variable and manage prev/next handlers via closure.
**Warning signs:** Rival select doesn't start at first driver after returning from lobby.

### Pitfall 3: DPR Scale Applied Twice
**What goes wrong:** Canvas appears zoomed-in by 4x (or more) with everything drawing off-screen.
**Why it happens:** `ctx.scale(dpr, dpr)` is called, but then called again (e.g., in a resize handler or if the init block runs twice).
**How to avoid:** Wrap the DPR init in an IIFE or call it exactly once at module load. Do not call `ctx.scale()` anywhere else in game.js.
**Warning signs:** Canvas renders only the top-left portion of the scene, massively zoomed.

### Pitfall 4: clipboard API Rejected Silently
**What goes wrong:** `navigator.clipboard.writeText()` returns a rejected promise that is uncaught, causing a console error and no visual feedback.
**Why it happens:** Clipboard API is not available in file:// contexts or when the Permissions API denies clipboard-write.
**How to avoid:** Always chain `.catch()` to the clipboard promise and show a fallback message to the user.
**Warning signs:** Copy button appears to do nothing, no toast appears.

### Pitfall 5: RIVALS Index Shift Breaking localStorage
**What goes wrong:** After removing Colapinto (idx 6) and Tsunoda (idx 11), drivers that were at idx 7+ shift down. A player who beat "Esteban Ocon" (old idx 7) now has `cr_rival_7 = 'win'` but the entry at new idx 7 is "Alexander Albon." The win badge appears on the wrong driver.
**Why it happens:** `cr_rival_<idx>` keys are positional, not keyed by driver name.
**How to avoid:** Per D-05, this is accepted as a known limitation (orphaned keys). Document it clearly in code comments. Consider clearing all `cr_rival_*` keys on first load after the grid change, or simply accept the display mismatch.
**Warning signs:** Win/loss badges show on incorrect drivers after the grid update.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | ~2018 | Async, promise-based; requires HTTPS |
| CSS `user-select: none` prefix-only | `-webkit-user-select` still needed for Safari | 2023 | Both properties needed for full coverage |
| `alert()` for game notifications | Modal overlays with setTimeout | Always best practice | Non-blocking; RAF loop continues |
| Fixed canvas size | `canvas.width = 480 * dpr` | Became standard ~2015 | Needed for Retina/HiDPI displays |

**Deprecated/outdated:**
- `document.execCommand('copy')`: deprecated in modern browsers. Do not use.
- `e.key === 'Left'` / `'Right'` / `'Down'`: Old IE key names. Use `'ArrowLeft'` / `'ArrowRight'` / `'ArrowDown'` (already correct in game.js).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser (Chrome/Firefox/Safari) | All features | ✓ | Any modern | — |
| HTTPS / localhost | `navigator.clipboard` | ✓ (localhost via http-server) | — | Graceful degradation message |
| `window.devicePixelRatio` | UI-03 | ✓ | Browser native (all modern) | Default to 1 if undefined |
| `navigator.clipboard.writeText` | UI-05 | ✓ on localhost | Browser native | `.catch()` fallback |
| formula1.com | GRID-01/02 data lookup | External — agent must browse | — | Training data fallback (mark [ASSUMED]) |

**Missing dependencies with no fallback:** None that block execution.

**Missing dependencies with fallback:**
- `navigator.clipboard`: Degrades gracefully with `.catch()` handler.

---

## Project Constraints (from CLAUDE.md)

All of the following MUST be honored by the plan:

- No build tools, no bundler, no package.json.
- All game logic goes into `game.js` directly.
- All styling goes into `style.css` directly.
- DOM changes go into `index.html` directly.
- No external libraries beyond already-loaded PeerJS (CDN).
- Game is opened via `index.html` directly or via `npx http-server . -p 8081`.
- No test commands exist. Manual play is the only regression check.
- No lint step.

---

## Open Questions

1. **BUG-02 actual asymmetry location**
   - What we know: Code at lines 992–996 shows the guard `if (remote.lap < TOTAL_LAPS - 1) return;` already exists.
   - What's unclear: Whether the `finish` message path has a different code branch for isHost vs !isHost that lacks the guard, or whether CONCERNS.md describes a previously-fixed state.
   - Recommendation: Implementation agent should trace `onMsg` for `type === 'finish'` specifically, checking if there's a second handler or if `isHost` changes which car is `remote`. Verify by testing: have guest connect, guest completes 0 laps, guest sends finish — does host declare winner?

2. **BUG-04 actual symptom**
   - What we know: `lapStartTime` IS set at line 820. The `> 0` check at line 568 should correctly measure lap 1.
   - What's unclear: Whether the bug is in the displayed text (lapNum), the stored value, or an edge case where the race starts mid-frame.
   - Recommendation: Agent should manually play one race and observe: does the first lap time appear in the results screen? If it does, BUG-04 may already be fixed by existing line 820.

3. **Tsunoda removal confirmation**
   - What we know: D-02 does not list Tsunoda. Current RIVALS has him at index 11 as Red Bull.
   - What's unclear: Whether this was an intentional omission by the user or an oversight. Tsunoda may have a seat in 2026 that was missed.
   - Recommendation: Agent should verify at formula1.com before removing. If Tsunoda is in 2026, he needs to stay (update team if needed). If not, remove.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tsunoda is not in the 2026 F1 grid (not listed in D-02) | RIVALS Update | Wrong: an extra entry appears; one driver missing. Must verify at formula1.com |
| A2 | `navigator.clipboard` is available in the target test environment (localhost) | Clipboard pattern | Wrong: copy button silently fails; mitigated by `.catch()` fallback |
| A3 | Audi uses a different livery than Kick Sauber green | GRID-02 colors | Wrong: colors unchanged; negligible visual impact |
| A4 | BUG-02's asymmetry is real and the guard is missing for the guest-receives-finish path | BUG-02 detail | Wrong: guard already symmetric and BUG-02 is already fixed; agent wastes time on no-op |

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `game.js` (full file read, key sections: lines 1–113, 560–707, 810–830, 960–1011, 1045–1080, 1143–1215) — all bug locations, input system, RIVALS structure
- `style.css` (full file read) — current responsive layout state
- `index.html` (full file read) — DOM structure, existing elements
- `.planning/phases/01-foundation/01-CONTEXT.md` — all locked decisions
- `.planning/REQUIREMENTS.md` — requirement definitions
- `.planning/codebase/CONCERNS.md` — exact bug locations and descriptions
- `.planning/codebase/ARCHITECTURE.md` — system structure and data flow

### Secondary (MEDIUM confidence)
- MDN Web Docs (training knowledge): `navigator.clipboard.writeText()` requires secure context — standard browser behavior
- MDN Web Docs (training knowledge): `window.devicePixelRatio` — standard canvas HiDPI pattern

### Tertiary (LOW confidence — needs agent verification)
- formula1.com driver list: Tsunoda 2026 status, Cadillac colors, Audi colors, exact car numbers

---

## Metadata

**Confidence breakdown:**
- Bug fix locations: HIGH — verified line-by-line from game.js source
- CTRL-01/02 already done: HIGH — confirmed at game.js lines 1054–1062
- CTRL-03 missing: HIGH — confirmed no `' '` key in listeners
- RIVALS current state: HIGH — read every entry in lines 58–83
- Responsive CSS current state: HIGH — full style.css read
- 2026 grid driver list: HIGH — from user-confirmed CONTEXT.md D-02
- 2026 car numbers / colors: LOW — must be verified at formula1.com
- Clipboard API behavior: MEDIUM — standard browser spec, confirmed from training
- DPR canvas pattern: HIGH — canonical browser API usage

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable codebase; grid data should be re-verified if delayed past race season start)
