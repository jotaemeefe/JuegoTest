---
phase: 01-foundation
fixed_at: 2026-06-26T00:00:00Z
review_path: .planning/phases/01-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 7
skipped: 2
status: partial
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-06-26
**Source review:** .planning/phases/01-foundation/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (4 Critical + 5 Warning; WR-06 and WR-07 were pre-marked skip)
- Fixed: 7
- Skipped: 2 (WR-06 and WR-07, as instructed)

## Fixed Issues

### CR-01: finish guard threshold is off by one

**Files modified:** `game.js`
**Commit:** f66d25a
**Applied fix:** Changed `if (remote.lap < TOTAL_LAPS - 1) return;` to `if (remote.lap < TOTAL_LAPS) return;` at line 1007. A remote peer with `remote.lap === 2` can no longer claim a win before completing lap 3.

---

### CR-02: dead lapStartTime else branch

**Files modified:** `game.js`
**Commit:** 8a236fe
**Applied fix:** Removed the unreachable `else { lapStartTime = performance.now(); }` block from `checkCheckpoints()`. Since `lapStartTime` is always set by the racing-phase transition before CP0 can be hit, the else branch was permanently dead code.

---

### CR-03: innerHTML with style values from RIVALS creates XSS path

**Files modified:** `game.js`
**Commit:** 0fd5345
**Applied fix:** Replaced the `card.innerHTML` template literal in `buildRivalGrid()` with `createElement` + `textContent` / `style` property assignments. All DOM values — band colors (`r.body`, `r.accent`), name, number, team, difficulty label, and badge — are now set via safe DOM properties. The unused `badge` string variable was also removed.

---

### CR-04: remote car angle is entirely unconstrained in pos validation

**Files modified:** `game.js`
**Commit:** ef4f945
**Applied fix:** Added angle normalization immediately after the `!isFinite(angle)` check using `((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI`. The result is stored in `normalizedAngle` and assigned to `remote.angle` instead of the raw received value.

---

### WR-01: lap floating text shows wrong lap number

**Files modified:** `game.js`
**Commit:** 8d33531
**Applied fix:** Changed the guard from `lapNum <= TOTAL_LAPS` to `lapNum < TOTAL_LAPS` and the displayed number from `lapNum` to `lapNum + 1`. When crossing CP0 the text now reads "VUELTA N+1 / N" (the lap starting), and no text is shown when crossing the finish on the final lap.

---

### WR-02: AI lap bonus references remote.lap instead of car.lap

**Files modified:** `game.js`
**Commit:** 67718a6
**Applied fix:** Changed `Math.min(remote.lap, 2)` to `Math.min(car.lap, 2)` in `updateAI()` so the lap bonus is derived from the car parameter rather than the hardcoded global `remote`.

---

### WR-03: guest restart calls startResultPoll too early

**Files modified:** `game.js`
**Commit:** 1cbbb9e
**Applied fix:** Moved `startResultPoll()` calls inside their respective branches. The host and solo paths call it after `beginCountdown()`. The guest path no longer calls it — the poll starts when the host responds with `'start'` via `onMsg`, which already calls `startResultPoll()`.

---

### WR-04: canvas width/height HTML attributes are dead

**Files modified:** `index.html`
**Commit:** 8054a62
**Applied fix:** Removed `width="480"` and `height="640"` attributes from the `<canvas id="game">` element. The DPR IIFE in `game.js` immediately overwrites these, making the HTML attributes misleading dead code.

---

### WR-05: formatTime guard conflates zero and negative

**Files modified:** `game.js`
**Commit:** 2683842
**Applied fix:** Changed `ms <= 0` to `ms < 0` in `formatTime()`. An exact zero elapsed time now formats correctly as `'0:00.0'` via the normal formatting path rather than being returned as the early-exit sentinel.

---

## Skipped Issues

### WR-06: checkCheckpoints race condition in P2P

**File:** `game.js:599–607`
**Reason:** Design-level P2P race condition with no fixable code change, as noted in the review itself and confirmed by the fix instructions.
**Original issue:** Simultaneous finish messages from both peers; network message order determines winner — inherent to P2P design.

---

### WR-07: buildRivalGrid rebinds onclick without cleaning card listeners

**File:** `game.js:1245–1262`
**Reason:** Code smell only, no fix needed per review and fix instructions. Fresh card elements created via `grid.innerHTML = ''` automatically detach old listeners; `prevBtn.onclick` assignment correctly replaces the prior handler.
**Original issue:** Minor code quality note about multiple `querySelectorAll` calls and animation timer ordering.

---

_Fixed: 2026-06-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
