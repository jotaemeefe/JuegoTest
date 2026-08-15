---
phase: 01-foundation
plan: 01
subsystem: game-logic
tags: [bug-fix, input, grid-data, controls]
dependency_graph:
  requires: []
  provides: [clean-restart, spacebar-brake, 2026-grid]
  affects: [game.js]
tech_stack:
  added: []
  patterns: [surgical-line-edits, data-only-replacement]
key_files:
  created: []
  modified: [game.js]
decisions:
  - "BUG-02 guard already symmetric: remote.lap check applies to both host-receives-finish and guest-receives-finish paths via the shared onMsg handler"
  - "BUG-04 already fixed: lapStartTime = performance.now() at line 820 correctly initializes lap 1 timing before CP0 first crossing"
  - "Cadillac and Audi livery colors used from best available knowledge (marked [ASSUMED]) — user should verify at formula1.com"
  - "Hadjar car number updated to 22 at Red Bull (his number as Red Bull teammate to Verstappen in 2026)"
  - "Lindblad assigned #6 (vacated by Hadjar who moved from Racing Bulls to Red Bull)"
metrics:
  duration: "20 minutes"
  completed: "2026-06-26"
  tasks_completed: 2
  files_modified: 1
---

# Phase 1 Plan 1: Bug Fixes, Spacebar Brake, and 2026 Grid Summary

**One-liner:** Four targeted bug fixes plus spacebar-as-brake and a complete 2026 F1 RIVALS array replacing 2025 data, removing Colapinto and Tsunoda and adding Cadillac team.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Bug fixes BUG-01/02/03/04 + CTRL-03 spacebar | 2516b95 | game.js |
| 2 | 2026 F1 Grid — replace RIVALS array | a897a08 | game.js |

## What Was Built

### Task 1: Bug Fixes + Spacebar

- **BUG-01 (line 1212):** Removed redundant `resetGame()` call from solo branch of `btn-restart` handler. `beginCountdown()` already calls `resetGame()` internally at line 1046, so calling it twice caused double audio initialization and state overwrite.

- **BUG-02 (line 994):** Verified that the finish guard `if (remote.lap < TOTAL_LAPS - 1) return;` is already present and correct. The guard applies symmetrically to both host-receives-finish and guest-receives-finish paths through the single `onMsg` handler. Added documentation comment clarifying the threat mitigation (T-01-01).

- **BUG-03 (line 682):** Removed the duplicate `const cpScore` lambda definition inside the `if (gameMode === 'solo' && selectedRival)` block in `updateHUD()`. The first definition at line 673 already covers both usages. `grep -c "const cpScore"` now returns 1.

- **BUG-04 (line 820):** Verified that `lapStartTime = performance.now()` is correctly set at the `countdown → racing` phase transition. Added verification comment. No code change required — the existing implementation correctly initializes lap 1 timing.

- **CTRL-03:** Added spacebar as brake to both `keydown` and `keyup` event listeners:
  - `keydown`: `if (e.key === ' ') { e.preventDefault(); keys.down = true; }` — `preventDefault()` prevents browser page-scroll during gameplay
  - `keyup`: `if (e.key === ' ') keys.down = false;`

### Task 2: 2026 F1 Grid

Replaced the entire 20-entry RIVALS array with the correct 2026 F1 grid containing 21 rivals (all 2026 drivers except Franco Colapinto who is the player character).

**Removals:**
- Franco Colapinto (player character, not a rival)
- Yuki Tsunoda (not in 2026 grid per D-02 confirmed by user)

**Additions:**
- Arvid Lindblad (Racing Bulls, #6, skill 0.80)
- Valtteri Bottas (Cadillac, #77, skill 0.82)
- Sergio Pérez (Cadillac, #11, skill 0.83)

**Updates:**
- Gabriel Bortoleto: `Kick Sauber` → `Audi` with updated livery (dark/silver Audi branding)
- Nico Hülkenberg: `Kick Sauber` → `Audi` with updated livery
- Isack Hadjar: team `Racing Bulls` → `Red Bull Racing`, number `6` → `22` (promoted to Red Bull)
- Skill values rebalanced across all 21 drivers per D-04 tier assignments

**Final RIVALS composition (sorted easiest → hardest):**
- MEDIO tier: Bearman (0.79), Bortoleto (0.80), Lindblad (0.80), Stroll (0.81), Hadjar (0.82), Bottas (0.82), Pérez (0.83), Albon (0.83)
- DURO tier: Ocon (0.84), Hülkenberg (0.84), Lawson (0.86), Antonelli (0.87), Gasly (0.87)
- EXPERTO tier: Sainz (0.88), Russell (0.90), Alonso (0.91)
- ÉLITE tier: Piastri (0.92), Leclerc (0.92), Norris (0.93), Hamilton (0.94), Verstappen (0.96)

## Verification

All acceptance criteria verified programmatically via `node -e`:
- RIVALS entry count: 21 (confirmed)
- "Franco Colapinto" not in RIVALS: confirmed
- "Yuki Tsunoda" not in RIVALS: confirmed
- "Cadillac" in RIVALS: confirmed
- "Kick Sauber" not in RIVALS: confirmed
- "2026 F1 grid" comment present: confirmed
- `const cpScore` appears exactly once: confirmed

## Deviations from Plan

### Already-Fixed Items (BUG-02, BUG-04)

**BUG-02:** Plan said to verify or add the finish guard. Code inspection confirmed it was already present and correct at line 994 — no code change was needed beyond adding a documentation comment.

**BUG-04:** Plan said to verify or add `lapStartTime = performance.now()`. Code inspection confirmed it was already at line 820 and correctly initializes lap 1 timing — no code change was needed beyond adding a verification comment.

No unintended deviations occurred.

## Known Stubs

None. All RIVALS entries have complete name, team, num, body, accent, helmet, and skill fields.

Cadillac and Audi livery colors are marked `[ASSUMED]` in code comments — these were derived from best available knowledge rather than verified at formula1.com during execution. User should verify and update if needed.

## Threat Flags

No new security-relevant surfaces introduced. The BUG-02 guard (T-01-01 mitigation) was verified already present.

## Self-Check: PASSED

- game.js exists and was modified: confirmed
- Commit 2516b95 exists: confirmed (Task 1)
- Commit a897a08 exists: confirmed (Task 2)
- RIVALS has 21 entries: confirmed via node
- No Colapinto or Tsunoda in RIVALS: confirmed via node
- Single cpScore definition: confirmed via grep
