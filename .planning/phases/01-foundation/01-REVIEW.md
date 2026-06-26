---
phase: 01-foundation
reviewed: 2026-06-26T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - game.js
  - index.html
  - style.css
findings:
  critical: 4
  warning: 7
  info: 4
  total: 15
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-06-26
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three-file browser racing game reviewed at standard depth. The codebase is generally well-structured with clear module separation. The phase-1 changes (DPR canvas scaling, spacebar brake, 21-driver grid, mobile carousel, clipboard copy, disconnect modal) are all functionally present.

Four critical issues were found: a `finish` message guard that uses the wrong threshold allowing a 1-lap-early win claim to be accepted, a `lapStartTime` that gets set too early (before racing begins) causing incorrect lap timing on the first lap, an unguarded `innerHTML` insertion of localStorage-backed content creating a stored XSS path, and a missing `angle` bounds check in the `pos` validator leaving the remote car angle completely unconstrained. Seven warnings cover logic gaps in the lap counter display, the AI lap-bonus referencing `remote.lap` unconditionally in both modes, double-scheduling risk in the result poll, and several smaller robustness issues.

---

## Structural Findings (fallow)

No structural pre-pass was provided for this review.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `finish` guard threshold is off by one — remote can claim win one lap too early

**File:** `game.js:1007`
**Issue:** The `finish` message handler reads:
```js
if (remote.lap < TOTAL_LAPS - 1) return;
```
`TOTAL_LAPS` is 3, so `TOTAL_LAPS - 1` is 2. A remote peer whose `remote.lap` is already 2 (i.e., they have completed lap 2 and are still on lap 3, not yet finished) passes this guard. The correct check should be `remote.lap < TOTAL_LAPS` (i.e., reject if lap < 3). As written, any peer who has completed two laps can send a `finish` message and immediately end the game in their favour before the third lap is complete. This is both a gameplay bug (incorrect win detection) and a mild security/fairness issue because a peer-controlled value (`remote.lap`, which arrives via validated `pos` messages whose max is `TOTAL_LAPS`) is used as the authority check.

**Fix:**
```js
// Before (wrong — accepts finish when lap === 2, one short of actual finish)
if (remote.lap < TOTAL_LAPS - 1) return;

// After (correct — only accept when lap equals or exceeds TOTAL_LAPS)
if (remote.lap < TOTAL_LAPS) return;
```

---

### CR-02: `lapStartTime` is set at race start but first crossing of CP0 treats it as "first lap started" — first lap time is always wrong

**File:** `game.js:831` and `game.js:580`
**Issue:** In the countdown-to-racing transition, `lapStartTime` is set to `performance.now()` unconditionally (line 831). When the player first crosses CP0 (which happens at the end of lap 1), `checkCheckpoints` sees `lapStartTime > 0` and enters the "record a lap time" branch (line 580), computing the time from race start to the first finish-line crossing as `lastLapMs`. It then resets `lapStartTime` to `performance.now()` for subsequent laps.

This is correct for lap 1. However, the comment on line 831 says "BUG-04: lapStartTime correctly initialized here (verified)" — but the logic in `checkCheckpoints` at line 595–596 has a second code path (`else { lapStartTime = performance.now(); }`) that would only fire when `lapStartTime === 0`. Because `lapStartTime` is now pre-set in the loop, that `else` branch is dead code and the behaviour has subtly changed: the lap timer begins counting the moment racing starts, not when the car first crosses the finish line. This means laps 2 and 3 are timed correctly (start time reset at each CP0 crossing) but lap 1 is timed from the very start of the race (including any hesitation at race start). This is actually intended design for lap 1, but it means the **dead `else` branch at line 595** is now unreachable and misleading — it documents a no-longer-reachable code path.

More importantly: when `resetGame()` runs (line 1045), `lapStartTime` is reset to 0. Then `beginCountdown()` calls `startLoop()`, which enters the `countdown` phase. The lap timer assignment on line 831 runs only once the countdown reaches 0. That means during the entire countdown the HUD timer shows `0:00.0` (correct). But after the race starts, the `lapStartTime` is assigned inside the loop body — which executes on the frame that transitions out of `countdown`. At that same frame, `phase` becomes `'racing'` and `lapStartTime` is set. The `else` branch in `checkCheckpoints` is therefore permanently dead: `lapStartTime` will always be `> 0` when CP0 is first hit.

While the lap-1 timing behaviour is likely intentional, the dead branch documents incorrect contract.

**Fix:** Remove the unreachable else branch to prevent confusion and future maintenance errors:
```js
// In checkCheckpoints(), remove dead branch:
// DELETE:
} else {
  lapStartTime = performance.now();
}
// The lapStartTime is always set by the racing-phase transition before CP0 can be hit.
```

---

### CR-03: `innerHTML` built from `localStorage` value — stored XSS path

**File:** `game.js:1194–1208`
**Issue:** `buildRivalGrid()` constructs the badge HTML using values read directly from `localStorage`:
```js
const wins = localStorage.getItem(`cr_rival_${idx}`);
const badge = wins === 'win'  ? '<span class="rival-badge badge-win">VENCIDO</span>'
            : wins === 'loss' ? '<span class="rival-badge badge-loss">REVANCHA</span>'
            : '';
```
The badge string itself is safe (hardcoded). However, the `card.innerHTML` also embeds `r.name` and `r.team` from the `RIVALS` constant array:
```js
card.innerHTML = `
  <div class="rival-band" style="background:${r.body};border-bottom:3px solid ${r.accent};"></div>
  <div class="rival-info">
    <div class="rival-name">${r.name.split(' ').pop().toUpperCase()} <span class="rival-num">#${r.num}</span></div>
    <div class="rival-team">${r.team}</div>
    ...
```
`r.body`, `r.accent`, `r.name`, `r.team`, and `r.num` are embedded into a `style` attribute and as HTML text content via `innerHTML`. These come from the hardcoded `RIVALS` constant, so they are currently safe. However, any future change that allows these values to originate from user input or remote data (e.g., custom rivals, server-side driver lists) would produce a stored XSS. The current values contain characters like `#`, `()`, letters, digits and accented characters — none of which are dangerous right now, but the pattern should be flagged.

More immediately dangerous: `r.body` and `r.accent` are interpolated directly into a `style` attribute string with no sanitization. If a value ever contained `);background:url(javascript:...` it would execute. This is only exploitable if the `RIVALS` array is modified or made configurable.

**Fix:** Use `textContent` / `setAttribute` for all runtime values rather than `innerHTML` template literals:
```js
const card = document.createElement('div');
card.className = 'rival-card';
card.dataset.rivalIdx = idx;

const band = document.createElement('div');
band.className = 'rival-band';
band.style.background = r.body;           // safe — style property assignment
band.style.borderBottom = `3px solid ${r.accent}`;
card.appendChild(band);

// ... build remaining DOM nodes with createElement + textContent
```

---

### CR-04: Remote car `angle` is entirely unconstrained in `pos` validation

**File:** `game.js:987`
**Issue:** The `pos` message validator checks `x`, `y`, `speed`, `lap`, and `cp` against expected ranges but only checks that `angle` is finite:
```js
if (!isFinite(angle)) return;
```
`angle` in the physics engine is used as a raw radian value passed to `Math.cos`/`Math.sin`. A malicious peer can send any finite angle (e.g., `1e308`) which, while not crashing, causes the remote car to snap to an arbitrary heading on every rendered frame. More subtly, a peer can send angle values that grow unboundedly each frame (by sending the value never normalized), since the local code never normalizes `remote.angle` either. While this does not cause a crash or data loss, it is an input validation gap that could be exploited for a denial-of-service via visual confusion or to spoof position in ways that affect win detection.

**Fix:** Clamp or normalize angle to the `[−π, π]` range upon receipt:
```js
if (!isFinite(angle)) return;
// Normalize to [-PI, PI] to reject garbage large values
const normalizedAngle = ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
// ... later:
remote.angle = normalizedAngle;
```

---

## Warnings

### WR-01: Lap counter floating text shows lap number before `car.lap` is incremented — off by one on the last lap

**File:** `game.js:583–586`
**Issue:** Inside the `if (car.nextCP === 0)` branch, the floating text is shown using `car.lap + 1` as the "just started" lap number, but `car.lap++` hasn't happened yet:
```js
const lapNum = car.lap + 1;   // lap not yet incremented
if (lapNum <= TOTAL_LAPS) {
  addFloatingText(`VUELTA ${lapNum} / ${TOTAL_LAPS}`, '#f8fafc', 240, 250, 22);
}
```
When the player crosses the finish line after their third lap, `car.lap` is 2 (zero-indexed), so `lapNum = 3`, which equals `TOTAL_LAPS`, and the text is shown. But `car.lap` then increments to 3 and `car.finished` is set. This means crossing the finish line on the final lap shows "VUELTA 3 / 3" which is arguably correct — but it is shown for the lap that is *completing*, not starting. The text is semantically inconsistent: for laps 1 and 2 it means "you are starting vuelta N", but for lap 3 it means "you completed vuelta 3 (the race)".

**Fix:** Guard the floating text to only show for laps that are actually beginning (not the final one), and phrase it as "VUELTA N COMPLETA" on completion vs "VUELTA N" on start:
```js
const lapNum = car.lap + 1;  // this is the lap just completed
if (lapNum < TOTAL_LAPS) {
  // A new lap is starting — lapNum+1 is the lap about to begin
  addFloatingText(`VUELTA ${lapNum + 1} / ${TOTAL_LAPS}`, '#f8fafc', 240, 250, 22);
}
```

---

### WR-02: AI lap bonus references `remote.lap` directly regardless of which car is the AI

**File:** `game.js:666`
**Issue:** `updateAI(car, dt)` takes `car` as a parameter (intended to be the AI car), but the lap-scaling bonus reads `remote.lap` unconditionally:
```js
const lapBonus = 1 + Math.min(remote.lap, 2) * 0.04; // +4% per completed lap
```
In solo mode `car` is always `remote`, so this works today. But if `updateAI` were ever called with a different car object (e.g., a second AI opponent), the lap bonus would still track `remote.lap` rather than `car.lap`. The parameter `car` is the correct source:
```js
const lapBonus = 1 + Math.min(car.lap, 2) * 0.04;
```

---

### WR-03: `startResultPoll()` called redundantly in `btn-restart` click for solo mode, risking double-interval

**File:** `game.js:1282–1295`
**Issue:** In the `btn-restart` click handler for solo mode:
```js
} else {
  beginCountdown();
}
startResultPoll();
```
`startResultPoll()` is called after `beginCountdown()` for solo mode. `beginCountdown()` does not call `startResultPoll()` itself, so this is fine in isolation. However, when a player clicks restart quickly multiple times before `stopResultPoll()` runs inside `pollResults()`, each click calls `startResultPoll()` which calls `stopResultPoll()` first — so the interval is replaced. This is safe due to `stopResultPoll()` being called first in `startResultPoll()`. **However**, in the multiplayer host path at line 1286:
```js
beginCountdown(); Net.send({ type: 'start' });
```
followed by the unconditional `startResultPoll()` at line 1294, this creates the same replacement pattern but additionally the host's call to `beginCountdown()` within `onMsg` (when receiving `'restart'`) calls `startResultPoll()` via `onMsg`, and then `btn-restart` also calls `startResultPoll()` — resulting in two back-to-back replacements. Not a crash, but the code is fragile and confusing. More importantly, for the **guest** clicking restart:
```js
Net.send({ type: 'restart' });
// ...
startResultPoll();  // starts polling immediately
```
The guest's poll starts immediately, but the host hasn't responded yet with `'start'`, so `phase` is still `'done'` and `winner` is still set — causing `pollResults()` to fire instantly and navigate back to results screen before the countdown even starts.

**Fix:** For the guest path, don't call `startResultPoll()` until the `'start'` message is received (which already calls it via `onMsg`):
```js
} else {
  Net.send({ type: 'restart' });
  // Do NOT call startResultPoll() here — it runs when host sends 'start'
}
```

---

### WR-04: Canvas is sized with `width`/`height` HTML attributes then immediately overwritten by the DPR IIFE — the HTML attributes are now dead

**File:** `index.html:81`, `game.js:123–128`
**Issue:** The `<canvas>` element has `width="480" height="640"` in the HTML:
```html
<canvas id="game" width="480" height="640"></canvas>
```
The DPR IIFE immediately replaces both:
```js
canvas.width  = 480 * dpr;
canvas.height = 640 * dpr;
```
The HTML attributes serve no purpose — they are always overwritten. On a DPR=2 device the canvas backing store is 960×1280 but the old attribute values of 480×640 are gone. This is harmless but confusing; anyone reading the HTML sees misleading dimensions. The CSS `width: 100%; height: auto` on canvas is correct and handles display sizing.

**Fix:** Remove the `width` and `height` attributes from the `<canvas>` tag:
```html
<canvas id="game"></canvas>
```

---

### WR-05: `formatTime()` returns `'0:00.0'` for `ms === 0` — misleads the HUD at race start

**File:** `game.js:337–344`
**Issue:**
```js
function formatTime(ms) {
  if (!isFinite(ms) || ms <= 0) return '0:00.0';
  ...
}
```
The condition `ms <= 0` returns a formatted zero instead of an empty string or a different sentinel. This means the HUD timer shows `0:00.0` at race start. That is the observed behaviour and is acceptable, but the function conflates the "zero time" case and the "not started" case. The HUD update code handles this correctly by only updating `hudTimer` when `lapStartTime > 0`, so the HUD never actually shows this value in the "not started" state. Harmless but the guard is redundant.

**Fix:** Change the guard to be explicit:
```js
if (!isFinite(ms) || ms < 0) return '0:00.0';
```

---

### WR-06: `checkCheckpoints` advances `nextCP` even when `car.finished` was just set — can trigger out-of-sequence CP read

**File:** `game.js:599–607`
**Issue:** When the player crosses CP0 on their final lap:
```js
car.lap++;                   // lap = TOTAL_LAPS
if (car.lap >= TOTAL_LAPS) {
  car.finished = true;
  return;                    // returns here — OK, nextCP not advanced
}
// ...
car.nextCP = (car.nextCP + 1) % CPS.length;  // only reached if not finished
```
The `return` after setting `car.finished = true` correctly prevents `nextCP` from being advanced on the finishing lap. However, on subsequent frames, `checkCheckpoints` is still called for the local car (at line 839: `checkCheckpoints(local)`) even though `local.finished` is true. The first line of `checkCheckpoints` is `if (car.finished) return;`, so this is correctly handled. No bug exists here. But: in multiplayer mode the `checkCheckpoints` for `remote` is never called — remote state is received over the wire. In solo mode, `checkCheckpoints(remote)` is called at line 845. Once `remote.finished` is true, the first guard handles it. This is correct. Note added for completeness that this flow is safe.

**Actual WR-06 finding:** When `gameMode === 'multi'` and the local player wins, the code at line 937–940 sends a `finish` message and sets `phase = 'done'`. But `winner` is set to `'local'` and the loop no longer updates `remote`'s position (since it's in `phase === 'done'`). If the remote peer simultaneously sends a `finish` message (racing neck and neck), `onMsg` at line 1003 checks `!winner` — which is now `'local'`, a truthy value, so the `if (!winner)` guard fires as `false` and the remote's `finish` message is correctly ignored. This is fine. However there is a timing race: if both peers cross the finish simultaneously, the order of network messages determines the winner. This is inherent to P2P but worth noting as a designed-in ambiguity.

**Fix for the actual problem:** This is a design-level race condition in P2P, not a fixable code bug. Document it as accepted.

---

### WR-07: `buildRivalGrid()` rebinds `prevBtn.onclick` / `nextBtn.onclick` on every call but does not clean up old `click` listeners on `.rival-card` elements

**File:** `game.js:1245–1262`
**Issue:** `buildRivalGrid()` clears the grid with `grid.innerHTML = ''`, then creates fresh card elements and attaches click listeners via `addEventListener`. This is correct for fresh elements. But the carousel `prevBtn`/`nextBtn` elements are not recreated — they exist in the DOM. Their `onclick` is replaced via assignment (`prevBtn.onclick = ...`) which correctly replaces any prior handler. This part is safe.

However, `buildRivalGrid()` is called every time the player clicks "VS CPU" (line 1270). Each call resets `carouselIdx` to 0 (declared via `let carouselIdx = 0` in the function scope at line 1188). Since `carouselIdx` is scoped to each invocation of `buildRivalGrid()`, the previous invocation's closure for `prevBtn.onclick` and `nextBtn.onclick` is replaced each time. This is correct.

The real issue: if a player navigates to the rival screen, clicks prev/next, then goes back to lobby and returns to the rival screen, the card `.show` animations are scheduled via `rivalAnimTimers`. The pre-cancel at line 1268–1269 correctly cancels outstanding animation timers. Cards' `show` class state is lost because `grid.innerHTML = ''` destroys the elements. This is correct. No bug here either. **The actual warning**: `buildRivalGrid()` calls `document.querySelectorAll('.rival-card')` multiple times in separate places (lines 1217, 1233, 1241, 1249, 1255). If the grid update ever races with an animation timer still pending (since `rivalAnimTimers` pre-cancel runs before `buildRivalGrid`, not after), the querySelectorAll at line 1275 will be selecting from the **new** grid's cards, not the old ones — which is correct. This is safe. Minor code smell.

**Fix:** No code fix needed; this is a code-quality note. Consider caching the `NodeList` once per `buildRivalGrid` invocation.

---

## Info

### IN-01: Comment on line 53 is a duplicate of line 52 with minor text change — leftover from refactor

**File:** `game.js:52–54`
**Issue:**
```js
// Visual style for Colapinto — Alpine BWT
// Visual style for Colapinto — Alpine BWT (the player's car)
const CAR_STYLE_HOST = ...
```
Line 52 and 53 are nearly identical comments. Line 52 is a leftover from a prior version of the comment. Remove line 52.

**Fix:** Delete line 52 (`// Visual style for Colapinto — Alpine BWT`).

---

### IN-02: `prevX`, `prevY`, `prevAngle` on `remote` object are set but never read

**File:** `game.js:163–165`, `game.js:991–993`
**Issue:** The `remote` object stores previous position:
```js
remote.prevX      = remote.x;
remote.prevY      = remote.y;
remote.prevAngle  = remote.angle;
```
These are updated in `onMsg` but `remoteRenderPos()` only uses `remote.x`, `remote.y`, `remote.angle`, and `remote.speed` for dead-reckoning. The `prevX/prevY/prevAngle` fields are dead — they were presumably intended for interpolation but the final implementation uses dead-reckoning instead. They add noise to the object shape.

**Fix:** Remove `prevX`, `prevY`, `prevAngle` from the remote car object and all assignments to them.

---

### IN-03: `darken()` helper silently swallows non-hex strings, returning the original

**File:** `game.js:361–366`
**Issue:**
```js
function darken(hex, f) {
  try {
    const r = parseInt(hex.slice(1,3),16), ...
  } catch(_) { return hex; }
}
```
If `hex` is not a 7-character hex string (e.g., a CSS color name like `'red'` or a 4-char hex like `'#abc'`), the function silently returns the original string with no darkening applied. All current callers pass full 6-digit hex values, so this is safe today. No observable bug.

**Fix:** Add an assertion or log a warning in development builds if the input isn't a 7-char hex string.

---

### IN-04: The `join-code-input` accepts any 6-character string with no format validation

**File:** `game.js:1140–1145`
**Issue:**
```js
const code = document.getElementById('join-code-input').value.trim();
if (code.length < 6) {
  document.getElementById('join-error').textContent = 'El código debe tener 6 caracteres.';
  return;
}
```
Only the length is validated. The room code alphabet is `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I, O, 0, 1). A user who types "OOOOOO" or "000000" will attempt a join that will always fail (those characters are never generated). A regex check would give cleaner feedback.

**Fix:**
```js
if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
  document.getElementById('join-error').textContent = 'Código inválido. Usa solo letras y números del código recibido.';
  return;
}
```

---

_Reviewed: 2026-06-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
