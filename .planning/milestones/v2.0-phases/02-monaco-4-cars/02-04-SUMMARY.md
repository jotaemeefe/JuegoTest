---
phase: 02-monaco-4-cars
plan: "04"
subsystem: ai-personalities-collision-hud
tags: [personalities, ai, collision-pairs, hud-classification, cars-02, cars-03, cars-04]

requires:
  - phase: 02-monaco-4-cars/02-03
    provides: tunnel overlay, render order, car.inTunnel boolean

provides:
  - PERSONALITIES constant (aggressive/defensive/consistent) with speedMult, lineMult, noiseAmp, brakeMult, damageMult
  - car.personality assignment per AI car in resetGame()
  - updateAI() using personality multipliers to modulate speed, braking, noise, line
  - PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]] — all 6 collision pairs
  - Racing loop iterating all 6 pairs with damageMult scaling per AI personality
  - updateHUD() with P1/P2/P3/P4 ranking and tiebreak by distToCP
  - prevPlayerRank replacing prevIsFirst for overtake detection

affects: [game.js, phase-03]

tech-stack:
  added: []
  patterns:
    - "Personality system: const PERSONALITIES object with 3 named archetypes; car.personality assigned at resetGame()"
    - "6-pair collision: const PAIRS = [[0,1]...]; PAIRS.forEach([i,j]) => resolveCarCollision in solo racing phase"
    - "HUD ranking: .map(cpScore).sort with secondary key distToCP to eliminate P1/P2 flicker when side-by-side"
    - "Overtake detection: prevPlayerRank (replaces prevIsFirst); triggers floating text when playerRank improves"

key-files:
  created: []
  modified:
    - game.js

key-decisions:
  - "PERSONALITIES values follow 02-RESEARCH.md exactly (A4 assumption — require playtesting)"
  - "Personality assignment: cars[1]=aggressive, cars[2]=defensive, cars[3]=consistent every race (fixed mapping)"
  - "lineMult applied as lateral apex offset (max 5px world-space) to avoid pushing AI off track"
  - "brakeMult scales 0.35 base factor; 0.70 upgrade deferred to Phase 3 AI-01"
  - "PAIRS loop inside solo-only block; multi remains implicit 2-car (no explicit collision needed)"
  - "damageMult of the AI car that hits the player scales collision damage (aggressive = 1.5x)"
  - "Tiebreak by euclidean distToCP stabilises ranking when two cars share cpScore (Pitfall 6)"
  - "prevIsFirst removed; prevPlayerRank initialized to 4 (last place) in resetGame()"

requirements-completed: [CARS-02, CARS-03, CARS-04]

duration: 18min
completed: 2026-06-27
---

# Phase 2 Plan 04: AI Personalities + 6-Pair Collision + HUD P1-P4 Summary

**Three AI personalities with distinct multipliers, full 6-pair collision detection with personality-modulated damage, and live P1/P2/P3/P4 HUD classification with stable tiebreak. Phase 2 complete.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-27T23:35:00Z
- **Completed:** 2026-06-27T23:53:00Z
- **Tasks:** 2 (combined in single commit — same file, interdependent changes)
- **Files modified:** 1 (game.js)

## Accomplishments

### Task 1: AI Personalities (CARS-02) + 6-Pair Collision (CARS-03)

- `PERSONALITIES` constant defined with `aggressive`, `defensive`, `consistent` archetypes, each providing `speedMult`, `lineMult`, `noiseAmp`, `brakeMult`, `damageMult`, `style`
- `PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]` constant added near game constants
- `resetGame()` assigns `car.personality` to each of the 3 AI cars: cars[1]=aggressive, cars[2]=defensive, cars[3]=consistent
- `updateAI()` updated to use personality multipliers:
  - `pers.speedMult` applied to `aiMaxSpd` (aggressive=5% faster, defensive=8% slower)
  - `pers.brakeMult` scales the 0.35 brake factor (aggressive brakes less, defensive brakes more)
  - `pers.noiseAmp` replaces the skill-derived noise calculation
  - `pers.lineMult` applies a subtle apex offset (max ±5px lateral in world-space) to steering target
- Racing phase (solo mode) replaced single player-vs-cars[1] collision with `PAIRS.forEach` loop covering all 6 pairs
- Collision damage scales by `car.personality.damageMult` of the AI that hits the player (aggressive = 1.5x base damage)
- Multi mode unaffected (PAIRS block is inside `if (gameMode === 'solo')`)

### Task 2: HUD P1/P2/P3/P4 (CARS-04)

- `updateHUD()` now ranks all cars in `cars[]` using `cpScore` with euclidean `distToCP` as tiebreak key
- `hudPos.textContent = \`P${playerRank}\`` replaces old `'1°' / '2°'` logic
- `prevIsFirst` variable and references fully removed
- `prevPlayerRank` declared as mutable state variable (initialized to 4) and reset in `resetGame()`
- Overtake detection: `playerRank < prevPlayerRank` triggers `addFloatingText('¡LO PASÉ! ⚡', ...)`
- Gap display (`hudRole`) adapted to work with 4-car array, finds nearest rival by cpScore proximity

## Task Commits

1. **Task 1 + Task 2: AI Personalities, 6-pair collision, HUD P1-P4** - `4a4d71d` (feat(02-04))

## Files Created/Modified

- `game.js` — PERSONALITIES const; PAIRS const; resetGame personality assignment; updateAI multipliers; PAIRS.forEach collision loop; updateHUD P1-P4 with tiebreak; prevPlayerRank replacing prevIsFirst

## Decisions Made

- **Fixed personality assignment order:** cars[1]=aggressive, cars[2]=defensive, cars[3]=consistent each race. Simple and predictable; shuffle can be added in Phase 3 if desired.
- **lineMult as lateral apex offset:** Applied as a proportional lateral offset to the waypoint target vector (max ±5px world-space). Aggressive takes tighter line, defensive wider. Small value prevents AI from leaving track bounds.
- **0.35 base brake factor unchanged:** The plan explicitly notes that raising 0.35 → 0.70 is AI-01 (Phase 3). brakeMult scales the existing 0.35 factor only.
- **Tiebreak by distToCP:** When two cars share the same cpScore (same lap/checkpoint segment), the one physically closer to the next checkpoint ranks higher. Eliminates P1/P2 flicker when cars run side-by-side (Pitfall 6 from RESEARCH.md).
- **PAIRS inside solo block only:** Multi mode has only 2 cars and no AI, so no collision pairs needed in that path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Enhancement] Task 1 and Task 2 combined in single commit**
- **Found during:** Implementation
- **Issue:** Both tasks modify the same functions (resetGame, updateAI, updateHUD, loop) in overlapping edit regions. Splitting into two commits would require reverting and re-editing the same file sections.
- **Fix:** Single commit 4a4d71d captures all changes. Both tasks fully implemented and verified.
- **Impact:** Minor procedural — all acceptance criteria met for both tasks.

---

**Total deviations:** 1 (procedural)
**Impact on plan:** No scope creep. All acceptance criteria met.

## Known Stubs

None — PERSONALITIES, PAIRS, and HUD P1-P4 are fully implemented. All 3 AI cars receive distinct personalities each race.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

Files exist:
- game.js: FOUND (modified in place)
- .planning/phases/02-monaco-4-cars/02-04-SUMMARY.md: FOUND (this file)

Commits exist:
- 4a4d71d: FOUND (feat(02-04): PERSONALITIES, 6-pair collision loop, HUD P1-P4)

Verifications passed:
- `PERSONALITIES` with aggressive/defensive/consistent: YES
- `PAIRS` with exactly 6 pairs: YES
- `car.personality` assigned in resetGame(): YES
- `updateAI` uses `pers.speedMult` and `pers.brakeMult`: YES
- `hudPos.textContent = \`P${playerRank}\``: YES
- `prevPlayerRank` present; `prevIsFirst` absent from non-comment code: YES
- `distToCP` tiebreak in updateHUD(): YES
- `node --check game.js`: SYNTAX OK

## Self-Check: PASSED

---
*Phase: 02-monaco-4-cars*
*Completed: 2026-06-27*
