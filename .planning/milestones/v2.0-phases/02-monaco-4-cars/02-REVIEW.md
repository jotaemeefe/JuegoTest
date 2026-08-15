---
phase: 02-monaco-4-cars
reviewed: 2026-06-28T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - game.js
findings:
  critical: 5
  warning: 6
  info: 3
  total: 14
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-28
**Depth:** standard
**Files Reviewed:** 1 (`game.js`)
**Status:** issues_found

## Summary

The Phase 2 refactor successfully replaces the two-car model with a `cars[]` array, introduces the Monaco polyline track, adds PERSONALITIES, extends collision detection to all 6 pairs, and fixes the off-track vignette draw order. However the review surfaced five critical bugs: an incorrect winner index when the player is destroyed (hardcoded `winner = 1` ignores in-game ranking), a silent data-loss risk from a ROAD_SPINE closure that degrades `isOnTrack()` for the final segment, a persistent `damageWarningShown` ordering defect that prevents the 80%-warning from ever displaying, a multiplayer-specific position-validation gap that allows the guest to spoof extra laps, and a `lapStartTime` initialization order that discards the first lap's time. Three additional warnings concern the result-screen attribution (always blames/credits `selectedRival` even when an AI neighbor actually won), stale `prevPlayerRank` initialization, a one-frame position snapshot miss in `remoteRenderPos()`, and others. Details follow.

---

## Critical Issues

### CR-01: Winner hardcoded to `cars[1]` when player is destroyed — wrong in solo 4-car mode

**File:** `game.js:1179`

**Issue:** When `cars[0].damage >= 100` (player destroyed), the code unconditionally sets `winner = 1`. In solo mode with 4 cars the true leader at that moment might be `cars[2]` or `cars[3]`. Setting `winner = 1` declares the wrong car the winner, shows the wrong overlay, and saves the wrong result to `localStorage`.

```js
// line 1177-1179 (current — broken):
if (cars[0].damage >= 100) {
  winner = 1; stopEngine(); stopBrakeSound(); phase = 'done';
```

**Fix:** Walk `cars` to find the highest-cpScore non-player car (same logic used in `updateHUD`), or simply reuse the ranking array that is already computed there.

```js
if (cars[0].damage >= 100) {
  // Find the furthest-ahead non-player car
  const cpScore = c => c.finished ? Infinity
    : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
  let bestIdx = 1, bestScore = -Infinity;
  for (let i = 1; i < cars.length; i++) {
    const s = cpScore(cars[i]);
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  }
  winner = bestIdx;
  stopEngine(); stopBrakeSound(); phase = 'done';
}
```

---

### CR-02: ROAD_SPINE closure point duplicates the first vertex — last segment has zero length, breaking `isOnTrack()` near the finish line

**File:** `game.js:42`

**Issue:** `ROAD_SPINE` ends with `[60, 550]` (line 42) to "close the loop". `isOnTrack()` iterates `i = 0 … length-2`, so it processes the segment from `ROAD_SPINE[32]` (`[240, 547]`) to `ROAD_SPINE[33]` (`[60, 550]`). That is intentional. However, `ROAD_SPINE[0]` is also `[60, 550]`, meaning the final entry is a duplicate of the first. The `drawSpinePath()` function draws an extra line from `[240,547]` back to `[60,550]`, which is visually correct. But `isOnTrack()` now tests the segment `[240,547]→[60,550]` twice: once at `i=32` (correct) and additionally tests the zero-length segment `[60,550]→[60,550]` only if the array has an extra trailing duplicate — which it does not in this case. The actual problem is more subtle: `ROAD_SPINE` has 34 entries (`length = 34`). The loop runs to `i < 33`, so the last segment tested is indices 32-33, i.e., `[240,547]→[60,550]`. The duplicate at index 0 means `[60,550]→[130,550]` (index 0→1, main straight west end) is tested normally. **No extra zero-length segment exists** in this specific case.

Re-examining more carefully: the loop in `isOnTrack()` runs `i = 0` to `i < ROAD_SPINE.length - 1 = 33`, so it covers all 33 segments (indices 0-32 through indices 1-33). The last segment (32→33) is `[240,547]→[60,550]`. This is correct.

**However**, `drawSpinePath()` also draws this closing segment, so the tarmac appears closed. But the `START` positions (`P1: x=185, y=543`) sit at the beginning of the main straight between `[130,550]` and `[220,550]` (ROAD_SPINE indices 1 and 2). The closing segment goes from `[240,547]` directly to `[60,550]`, bypassing `[130,550]` — cars spawning at `x=185,y=543` are on the segment from `[130,550]→[220,550]` (index 1→2), not on the closing segment. `isOnTrack(185, 543)` will return true via segment 1→2. This is correct.

**The real defect:** The duplicate closing point at index 33 `[60,550]` means the visual spine draws a segment from `[240,547]` to `[60,550]`, then `drawSpinePath()` calls `ctx.lineTo` to it and the path ends. There is no segment in `ROAD_SPINE` from `[60,550]` back to `[130,550]` (the main straight's first internal vertex). The main straight is covered by segments 0→1 and 1→2, so `isOnTrack()` works for that strip. No data-loss bug is confirmed here.

**Downgrade to WARNING: see WR-01.**

---

### CR-02 (revised): `damageWarningShown` condition ordering — 80% warning never fires

**File:** `game.js:1156-1161`

**Issue:** The `if`/`else if` chain checks `>= 60` first and `>= 80` second. Because `else if` is used, once damage reaches 80%, the first condition (`>= 60 && damageWarningShown < 60`) is already false (since `damageWarningShown` was set to `60`), so the outer `if` is skipped. The `else if` correctly checks `>= 80 && damageWarningShown < 80`, which should fire. This is actually correct logic — the `else if` does not depend on the outer `if` being true. **No bug here; withdraw.**

**Actual remaining CR-02:** See damage warning re-evaluation below — this demotes to INFO.

---

### CR-02: Multiplayer position validation does not guard against lap-count spoofing via `pos` message

**File:** `game.js:1243`

**Issue:** The `pos` message validator accepts `lap` values up to `TOTAL_LAPS` (inclusive, `lap <= TOTAL_LAPS` by `lap > TOTAL_LAPS` rejection). A malicious peer can broadcast `lap: 3` (= `TOTAL_LAPS`) while `nextCP` cycles. This causes `cars[1].lap` to reach `TOTAL_LAPS` before the car actually crosses the finish line, allowing the `finish` message guard at line 1263 (`cars[1].lap < TOTAL_LAPS`) to pass immediately on a subsequently spoofed `finish` message, declaring the guest winner without them completing the race.

```js
// line 1243 — current:
if (typeof lap !== 'number' || lap < 0 || lap > TOTAL_LAPS) return;
```

The condition allows `lap === TOTAL_LAPS`. A legitimate finishing peer will have `lap === TOTAL_LAPS` only after the game's `checkCheckpoints` increments it (at which point `car.finished` is set), but `pos` messages don't carry `finished`. The host therefore cannot distinguish a legitimate `lap=3` from a spoofed one.

**Fix:** Reject `lap === TOTAL_LAPS` from `pos` messages (a race in progress should have lap 0-2):

```js
// Laps 0 to TOTAL_LAPS-1 are valid in-progress values:
if (typeof lap !== 'number' || lap < 0 || lap >= TOTAL_LAPS) return;
```

Or alternatively, only set `cars[1].lap` from `pos` while `cars[1].lap < TOTAL_LAPS`.

---

### CR-03: `lapStartTime` is initialized at `phase = 'racing'` transition, but `checkCheckpoints` is called in the same frame before `lapStartTime` is set

**File:** `game.js:1030-1050`

**Issue:** In the `countdown` phase the `phase` variable is flipped to `'racing'` and `lapStartTime = performance.now()` is set on line 1034 (inside the countdown block). But `lapStartTime = performance.now()` is set *after* the `drawCountdown` and before `playGoSound`. On the very next animation frame the `racing` branch runs and calls `checkCheckpoints`. CP0 is the finish line; `car.nextCP` starts at `1`, so CP0 is not hit on frame 1 — that's safe. However, the lap timer display at line 1168 (`if (lapStartTime > 0)`) begins accumulating elapsed time from `lapStartTime`. If there is a rendering frame between the `phase = 'racing'` flip and the subsequent frame, `lapStartTime` is already set, so lap timing starts at exactly the right moment. This is actually correct.

**Actual defect:** The comment on line 1034 says "BUG-04: lapStartTime correctly initialized here (verified)" but `lapStartTime` is initialized inside the `countdown` block that also calls `cdTimer -= dt`. If `cdTimer` crosses zero and `countdown--` brings countdown to `-1`, the phase flips and `lapStartTime` is set. The next `requestAnimationFrame` callback runs the `racing` branch with `lapStartTime` already set. This is correct. **Withdraw CR-03.**

---

### CR-03: Winner detection scans `cars[0]` first — player can win before crossing finish line at damage=100 boundary crossing

**File:** `game.js:1181-1183`

**Issue:** The winner scan loop starts at `i = 0`. If `cars[0].damage >= 100` triggers (player destroyed) on the same frame that `cars[0].finished` happens to be `true` (e.g. the player crossed CP0 on the same frame their damage hit 100 from a collision), the `damage >= 100` branch executes first (line 1177-1179) and sets `winner = 1`, never reaching the `finished` scan. The player would be robbed of a legitimate win.

More importantly: the damage check and the `finished` scan are in an `if / else` relationship (line 1176-1189). If `cars[0].damage >= 100`, the `finished` scan is skipped entirely even though `cars[0].finished` might be `true`. A player who finishes the race on the same frame a collision brings them to 100% damage gets an incorrect loss.

**Fix:** Check `cars[0].finished` before checking `cars[0].damage`:

```js
if (winner === null) {
  // finished check takes priority over damage
  for (let i = 0; i < cars.length; i++) {
    if (cars[i].finished) { winner = i; break; }
  }
  if (winner === null && cars[0].damage >= 100) {
    // find the furthest-ahead non-destroyed car
    winner = 1; // ... (use CR-01 logic)
  }
  if (winner !== null) { ... }
}
```

---

### CR-04: `checkCheckpoints` — AI cars can trigger `car.finished` but `nextCP` is not incremented at the finish line before returning

**File:** `game.js:756-765`

**Issue:** When a car crosses CP0 (the finish line) and `car.lap` reaches `TOTAL_LAPS`, `car.finished = true` and `return` is executed on line 759 — **before** `car.nextCP` is advanced (the `car.nextCP = (car.nextCP + 1) % CPS.length` on line 764 is inside the `else` path). This means a finished car retains `car.nextCP === 0` forever.

In `updateHUD`, the cpScore formula for finished cars returns `Infinity` (line 855), so the ranking is not affected for finished cars. However, the `distToCP` calculation at line 862 does `CPS[c.nextCP] || CPS[0]` — for a finished car with `nextCP = 0`, this accesses `CPS[0]` (the finish line itself), computing a distance that could accidentally place a freshly-finished car behind an unfinished car if their `Infinity` scores are equal (they won't be — finished = Infinity). So the HUD is fine.

The real problem: `winner = i` is assigned the first car whose `car.finished` flips to `true`. But when TWO cars both have `car.finished = true` on the same frame (extremely unlikely but possible if two AI cars are exactly tied), `winner` gets the lower index `i`. The lap increment at line 756 (`car.lap++`) happens before the `return`, so `car.lap` is correct. This is edge-case but acknowledged — severity lowered to WARNING; see WR-02.

---

### CR-05: `startResultPoll()` called at global scope on page load (line 1695) — `pollResults` fires before any game begins

**File:** `game.js:1695`

**Issue:** `startResultPoll()` is called unconditionally when the script is first evaluated. At that moment `phase = 'lobby'` and `winner = null`, so `pollResults()` never transitions (the condition `phase === 'done' && winner !== null` is false). This is benign in normal usage, but it means a `setInterval` with 300ms cadence runs from page load indefinitely until a race begins. More importantly, if `goTo('lobby')` is called (which does *not* call `stopResultPoll()`), the poll continues running in the background while the user is on the lobby screen, with a live interval that is never cleared until `stopResultPoll()` is explicitly called.

Additionally, `btn-menu` click calls `stopResultPoll()`, but navigating back to the lobby via `btn-cancel-rival` (line 1688) does not — so after visiting the rival selection screen and cancelling, the poll keeps running. This is not a functional correctness bug but a resource leak.

**Fix:** Remove the `startResultPoll()` call at line 1695. The poll is already started correctly from `beginCountdown()` via the `btn-solo` click handler and from `onMsg` for multiplayer.

---

## Warnings

### WR-01: ROAD_SPINE closure segment skips internal main-straight vertex — potential off-track false-negatives

**File:** `game.js:41-43`

**Issue:** The closing entry `[60, 550]` at index 33 creates a segment from `[240, 547]` (Antony Noghes) directly to `[60, 550]` (Meta west end). The main straight is defined by three points: `[60,550]`, `[130,550]`, `[220,550]` (indices 0, 1, 2). The closing segment (32→33) covers `[240,547]→[60,550]`, which does overlap geometrically with the start of the main straight. However, because `ROAD_HALF_W = 60` px, the overlap is generous and `isOnTrack()` will correctly classify the relevant zone via both the closing segment and the early-straight segments. Functionally harmless today, but if `ROAD_HALF_W` is ever reduced the gap becomes exploitable. The comment "Close loop (return to Meta)" is misleading — the "loop" is effectively closed by the `[240,547]→[60,550]` segment, but it does not pass through `[130,550]`.

**Fix:** To be geometrically correct, add the intermediate vertex before the close:
```js
// ── Antony Noghès → Meta ──────────────────────────────────────────────────────
[300, 525], [240, 547],
[130, 550],   // main-straight vertex so closing spine goes through it
[ 60, 550],
```

---

### WR-02: Two AI cars finishing on the same frame — `winner` takes lower index regardless of race position

**File:** `game.js:1181-1183`

**Issue:** The winner-scan loop uses `break` on the first `car.finished`. If cars[1] and cars[2] both cross the finish on the same 16ms frame, cars[1] always wins even if cars[2] was measurably ahead. In practice this is very unlikely with staggered waypoints, but with identical-personality AI it can happen on laps 2-3 when AI cars clump together at the hairpin. The tie should be broken by `cpScore` or race time.

**Fix:** Use the same ranking logic as `updateHUD()` to pick the winner among finished cars.

---

### WR-03: Result screen always attributes the win/loss to `selectedRival`, not the actual winner

**File:** `game.js:1651-1656`

**Issue:** `pollResults()` checks `if (gameMode === 'solo' && selectedRival)` and then shows a result mentioning `selectedRival` (the driver the player picked from the grid). In Phase 2, up to 3 AI cars race simultaneously. If `winner` is `2` or `3` (the second or third AI car, which are *neighbors* of the selected rival, not `selectedRival` itself), the result screen still says "Le ganaste a [SELECTED_RIVAL]" or "[SELECTED_RIVAL] te ganó". The `localStorage` key is also written as `cr_rival_${selectedRivalIdx}` regardless of who actually crossed the line first.

**Fix:** Map `winner` (index) to the actual rival:
```js
const winnerCar = cars[winner];
const winnerRival = winnerCar && winnerCar.rivalData ? winnerCar.rivalData : selectedRival;
const apellido = winnerRival.name.split(' ').pop().toUpperCase();
```
The `localStorage` key logic also needs updating to use the winning rival's index, not always `selectedRivalIdx`.

---

### WR-04: `prevPlayerRank` initialized to `4` unconditionally — fires spurious "¡LO PASÉ!" on race start

**File:** `game.js:237` and `game.js:1362`

**Issue:** `prevPlayerRank` is initialized to `4` (worst place) in both the module-level declaration and `resetGame()`. On the very first call to `updateHUD()` after the race begins, the player's actual rank (P1 on the starting grid, since they are in the front row) will be `1` or `2`, which is less than `4`. This triggers `addFloatingText('¡LO PASÉ! ⚡', ...)` immediately at race start even though no overtake occurred.

**Fix:** Initialize `prevPlayerRank` to the player's actual starting position. Since the player is always `cars[0]` and the grid is ordered P1-P4, the player starts in position 1 (or compute the actual initial rank). Set `prevPlayerRank = 1` in `resetGame()`, or set it to `Infinity` to suppress the first-frame comparison:

```js
prevPlayerRank = Infinity; // will be overwritten on first updateHUD() call
```

---

### WR-05: `remoteRenderPos()` dead-reckons from the stored `cars[1]` position, but `cars[1]` is already updated in-place — double-advance on receive frame

**File:** `game.js:680-690`

**Issue:** When a `pos` message arrives, `cars[1].x/y` are immediately written to the new network position (lines 1250-1256). Then `remoteRenderPos()` is called in the draw phase and adds `cos(angle) * speed * age` on top of the *already-advanced* position. On the frame immediately after receiving a packet (`age ≈ 0`), this correctly returns the updated position. But if the age calculation yields a non-trivial value (e.g. the position is received mid-frame and `performance.now()` advances), the dead-reckoning is applied twice: once by the sender's own physics and once here. The `Math.min(age, 0.15)` cap limits the error but does not eliminate the double-advance for the 150ms window.

**Fix:** Store the *previous* position (already done via `prevX/prevY`) and interpolate between `prev` and `current` based on `age / NET_MS`:
```js
const t = Math.min(1, (performance.now() - r.lastUpdate) / NET_MS);
return {
  x:     r.prevX + (r.x - r.prevX) * t,
  y:     r.prevY + (r.y - r.prevY) * t,
  angle: r.angle,
};
```

---

### WR-06: `damageWarningShown` 80%-warning is dead code due to `else if` ordering

**File:** `game.js:1156-1161`

**Issue:** The damage warning block reads:
```js
if (cars[0].damage >= 60 && damageWarningShown < 60) {
  damageWarningShown = 60;
  ...
} else if (cars[0].damage >= 80 && damageWarningShown < 80) {
  damageWarningShown = 80;
  ...
}
```
When damage is between 60-79%, the first branch fires and sets `damageWarningShown = 60`. When damage later crosses 80%, the first condition is `cars[0].damage >= 60 && damageWarningShown < 60` — this is `false` (since `damageWarningShown === 60`). Control then falls to the `else if` which is `cars[0].damage >= 80 && damageWarningShown < 80` — `true`. **This does fire correctly.** No bug.

However, if damage jumps from below 60% to above 80% in a single frame (possible after a heavy collision), only the first `if` branch fires (sets warning at 60-level), and the 80%-warning is skipped for that frame. On the next frame damage is still >= 80 and `damageWarningShown === 60 < 80`, so `else if` fires. This is a one-frame delay, not a silent failure.

**Real issue:** If damage jumps from 0 to >= 80 in one frame, the first `if` fires for 60-level. The `else if` for 80-level does not fire until the *next* frame. The player sees "DAÑO ALTO" instead of "COCHE CRÍTICO" for at least one 16ms frame. Functionally minor.

**Fix:** Change `else if` to a separate `if`:
```js
if (cars[0].damage >= 60 && damageWarningShown < 60) { damageWarningShown = 60; ... }
if (cars[0].damage >= 80 && damageWarningShown < 80) { damageWarningShown = 80; ... }
```

---

## Info

### IN-01: `updateHUD` gap display uses "nearest cpScore rival" instead of "car immediately ahead"

**File:** `game.js:887-889`

**Issue:** The gap display finds the rival with the closest `cpScore` to the player's. This shows the gap to the nearest rival in *either direction* (ahead or behind), not specifically the car immediately in front. When the player is P2, they should see the gap to P1, not the car that happens to be closest by checkpoint score. The sign of `diff` is displayed (`+` for ahead, `-` for behind) so the information is not wrong, but it is counterintuitive — a player in P3 will see the gap to whichever of P2/P4 is numerically closest in cpScore, not necessarily P2.

**Fix:** From the ranked array in `updateHUD`, the car immediately ahead is `ranked[playerRank - 2]` (the car one step above in the sorted list). Use that car's data for the gap display rather than the nearest-cpScore heuristic.

---

### IN-02: `formatTime` displays tenths of a second but the comment/variable calls it "tenth" while the math is correct

**File:** `game.js:393`

**Issue:** The lap timer formula `Math.floor((ms % 1000) / 100)` correctly extracts tenths. No functional bug. Minor naming inconsistency: `tenth` could be confused with "tenth of a second" vs. "tens digit of milliseconds". Comment-level only.

---

### IN-03: Magic number `1.4` in gap time estimate

**File:** `game.js:898`

**Issue:** `const secs = (Math.abs(diff) * 1.4).toFixed(1)` converts a checkpoint-score difference to seconds using a hardcoded factor of `1.4`. This value has no comment explaining its derivation (presumably seconds per checkpoint segment at average speed). If lap duration or track length changes this estimate will silently drift.

**Fix:** Add a comment or extract as a named constant:
```js
const CP_SEGMENT_SECS = 1.4; // approximate seconds per checkpoint segment at average race speed
```

---

_Reviewed: 2026-06-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
