---
phase: 02-monaco-4-cars
plan: "01"
subsystem: game-state
tags: [refactor, cars-array, ai, multiplayer, state-management]
dependency_graph:
  requires: []
  provides: [cars-array, per-car-damage, per-car-waypoint, solo-4-cars, multi-2-cars]
  affects: [game.js]
tech_stack:
  added: []
  patterns: [per-car-state-object, cars-array-iteration, player-flag-gating]
key_files:
  created: []
  modified:
    - game.js
decisions:
  - "cars[] array initialized with length 4 in solo mode and length 2 in multi mode"
  - "wpIdx staggered at init: cars[1].wpIdx=0, cars[2].wpIdx=2, cars[3].wpIdx=4"
  - "winner stored as numeric index (0-3) or null, never string 'local'/'remote'"
  - "Task 1 and Task 2 committed as single atomic commit due to verifier interdependency"
  - "Collision extended to player vs cars[1] only in this plan; all 6 pairs deferred to 02-04"
metrics:
  duration: "35 min"
  completed: "2026-06-27"
  tasks_completed: 2
  files_modified: 1
---

# Phase 2 Plan 01: CARS-01 Refactor (local/remote → cars[]) Summary

**One-liner:** Refactor from binary local/remote car variables to a cars[] array supporting 4 cars in solo mode (player + 3 AI) and 2 in multiplayer (local + remote), with per-car damage and per-car waypoint state.

## What Was Built

Replaced the `local`/`remote` variable pair with a `cars[]` array throughout all of `game.js` (~1400 lines). The refactor touches every game system: state initialization, physics, AI navigation, checkpoint logic, collision, HUD, rendering, win detection, network messages, and results polling.

Key architectural changes:
- `makeCar(idx)` now returns `isPlayer`, `damage`, `wpIdx`, and `rivalData` fields
- `resetGame()` builds `cars[]` based on `gameMode`: 4 cars in solo, 2 in multi
- `START` expanded from 2 to 4 positions (2×2 formation on main straight)
- `winner` changed from `'local'|'remote'` string to numeric index `0-3` or `null`
- `updateAI()` uses `car.wpIdx` (per-car) instead of the shared global `aiWpIdx`
- `updateCar()` gates brake/steer on `car.isPlayer`
- `checkCheckpoints()` uses `car.isPlayer` instead of `car === local`
- `carStyle()` derives AI car styles from `car.rivalData`
- `pollResults()` uses `winner === 0` for player win detection
- `onMsg('pos')` and `onMsg('finish')` write to `cars[1]` in multi mode
- `remoteRenderPos()` reads `cars[1]` instead of `remote`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Introduce cars[] array, migrate state, init, net | ba256de | game.js |
| 2 | Migrate loop, AI, HUD, rendering, results to cars[] | ba256de | game.js |

Note: Both tasks share a single commit because the Task 1 automated verifier checked for `localDamage`/`aiWpIdx` across all code (including the loop), requiring the loop migration (Task 2) to be complete before Task 1's verification could pass.

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Adjustments

**1. [Plan intent] Task 1 and Task 2 committed atomically**
- **Found during:** Task 1 verification
- **Issue:** The Task 1 verifier checked `\blocalDamage\b` and `\baiWpIdx\b` across all non-comment code, including the game loop — which is Task 2's scope. The verifier failed until Task 2 was also complete.
- **Fix:** Executed both tasks before any commit, then committed all work in one commit with Task 1's message. Documented here as a deviation.
- **Files modified:** game.js
- **Commit:** ba256de

**2. [CARS-03 deferred] Collision kept as player vs cars[1] pair only**
- **Found during:** Task 2 implementation
- **Issue:** Plan specifies that CARS-03 (full 6-pair collision) is deferred to plan 02-04. Implemented only the player-vs-cars[1] collision pair as specified for this plan.
- **Fix:** Added comment `// CARS-03: extender a 6 pares en 02-04` in the loop.
- **Files modified:** game.js
- **Commit:** ba256de

## Known Stubs

None — the refactor is complete and functional. The following features are deferred by design (not stubs):
- All 6 collision pairs (CARS-03): deferred to 02-04 with comment
- Full P1-P4 HUD classification (CARS-04): HUD shows P1/P2 approximation with comment

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The existing `onMsg()` validation (range checks on x, y, angle, speed, lap, cp) is preserved unchanged.

## Self-Check

Files exist:
- game.js: FOUND (modified in place)
- .planning/phases/02-monaco-4-cars/02-01-SUMMARY.md: FOUND (this file)

Commits exist:
- ba256de: FOUND (feat(02-01): introduce cars[] array replacing local/remote variables)

Verifications passed:
- Task 1: `node -e "...let cars=..."` → OK estado migrado
- Task 2: `node -e "...0 refs local/remote..."` → OK loop migrado
- Syntax check: `node --check game.js` → Sintaxis OK

## Self-Check: PASSED
