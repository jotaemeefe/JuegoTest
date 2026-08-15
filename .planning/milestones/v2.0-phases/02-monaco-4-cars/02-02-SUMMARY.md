---
phase: 02-monaco-4-cars
plan: "02"
subsystem: track-geometry
tags: [monaco, road-spine, ai-waypoints, checkpoints, starting-grid]
dependency_graph:
  requires: [02-01]
  provides: [monaco-road-spine, monaco-checkpoints, monaco-ai-waypoints, monaco-start-grid]
  affects: [game.js]
tech_stack:
  added: []
  patterns: [polyline-track, per-segment-isOnTrack, waypoint-navigation]
key_files:
  created: []
  modified:
    - game.js
decisions:
  - "ROAD_SPINE closed at [60,550] — first and last point identical (loop integrity)"
  - "34-point polyline chosen (> 28 from research) to better define tight corners (Hairpin, Portier, Rascasse)"
  - "AI_WP_REACH reduced from 45 to 30px for Monaco tight corner fidelity"
  - "24 AI waypoints with extra density at Grand Hotel Hairpin (6 points) for smooth AI navigation"
  - "Checkpoint radii kept at 65-80px to match ROAD_HALF_W=60 tolerance"
  - "START grid at y=543/553 (not y=550 spine center) to give 2x2 lateral separation within track width"
  - "Checkpoint auto-approve activated per orchestrator instruction (human-verify skipped)"
metrics:
  duration: "4 min"
  completed: "2026-06-27"
  tasks_completed: 1
  files_modified: 1
---

# Phase 2 Plan 02: Monaco Circuit Geometry (TRACK-01 + TRACK-04) Summary

**One-liner:** 34-point Monaco clockwise polyline replacing the Buenos Aires oval, with 4 Monaco checkpoints, 2x2 starting grid on main straight, and 24 AI waypoints with hairpin-dense coverage.

## What Was Built

Replaced all oval (Buenos Aires) geometry constants in `game.js` with Monaco Circuit equivalents:

**ROAD_SPINE (34 points, clockwise):** Polyline tracing the Monaco circuit from the main straight (bottom), up Sainte-Dévote, through the Casino plateau, around the Grand Hotel Hairpin (U-turn), down through Portier, through the Tunnel, along the harbour via Tabac and Swimming Pool, and back via Rascasse and Antony Noghès. Loop closes at [60,550]. All points verified within world-space bounds [0,480]×[0,640].

**CPS (4 Monaco checkpoints):**
- CP0 META: `{x:130, y:550, r:80}` — main straight finish line
- CP1: `{x:365, y:265, r:70}` — Casino/Mirabeau plateau
- CP2: `{x:400, y:185, r:65}` — Grand Hotel Hairpin apex
- CP3: `{x:415, y:312, r:70}` — Tunnel exit

**START (2x2 grid on main straight):** Four positions at y=543/553 (lateral spread), x=155/185 (longitudinal stagger), angle=0 (pointing east). All 4 positions verified `isOnTrack()`.

**AI_WAYPOINTS (24 points):** Following Monaco clockwise with dense coverage at the Grand Hotel Hairpin (6 waypoints for the U-turn, points 9-14) and at Rascasse. `AI_WP_REACH` reduced from 45 to 30px.

**drawTrack() updates:**
- Finish line stripe moved to Monaco CP0 position `project(130, 550±ROAD_HALF_W)`
- Watermark changed from "CIRCUITO COLAPINTO · BUENOS AIRES" to "CIRCUIT DE MONACO · MONTE CARLO"
- Countdown overlay text updated to "CIRCUIT DE MONACO" / "MONTE CARLO · MÓNACO"

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace ROAD_SPINE, CPS, START, AI_WAYPOINTS with Monaco geometry | 290f261 | game.js |
| checkpoint | human-verify (auto-approved per orchestrator) | — | — |

## Deviations from Plan

### Scope Adjustments

**1. [Rule 2 - Enhancement] 34-point ROAD_SPINE instead of 28**
- **Found during:** Task 1 design
- **Issue:** The 28-point research polyline closed at [200,550] instead of [60,550] (the start of the main straight), producing a truncated main straight and a poorly-defined Rascasse/Noghès area.
- **Fix:** Designed a 34-point polyline that starts and closes at [60,550], adds intermediate points in the Portier/Tunnel entry area, and defines Rascasse/Noghès with more fidelity.
- **Files modified:** game.js
- **Commit:** 290f261

**2. [Auto-approved] Checkpoint human-verify skipped**
- **Found during:** Task 2 (checkpoint)
- **Issue:** Orchestrator activated AUTO_MODE with instruction to auto-approve the `checkpoint:human-verify` task.
- **Fix:** Implemented Monaco geometry as first-pass approximation from research coordinates, committed, and continued without waiting for human visual confirmation. The checkpoint notes that 2-3 rounds of visual iteration may be needed.
- **Impact:** Geometry is functionally correct (loop closes, all points in bounds, all START positions on-track, all CPS on-track) but visual resemblance to real Monaco may need tuning in a follow-up iteration.

## Known Stubs

None — all geometry constants are fully implemented. The following is a known first-pass approximation:
- Monaco polyline coordinates are estimated from circuit description ([ASSUMED] per research). Visual verification in browser is still recommended to confirm recognizable Monaco shape (Open Question 1 of research: budget 2-3 visual iterations).

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. Changes are limited to static geometry constants.

## Self-Check

Files exist:
- game.js: FOUND (modified in place)
- .planning/phases/02-monaco-4-cars/02-02-SUMMARY.md: FOUND (this file)

Commits exist:
- 290f261: FOUND (feat(02-02): replace oval geometry with Monaco circuit polyline)

Verifications passed:
- `node -e "...ROAD_SPINE..."` → OK ROAD_SPINE cerrado y en bounds, 34 puntos
- ROAD_SPINE loop closed: SI
- CPS entries: 4, radios [80,70,65,70] all in 65-80 range: SI
- START entries: 4, all verified isOnTrack(): SI
- AI_WAYPOINTS: 24 (in range 22-25): SI
- AI_WP_REACH: 30: SI
- Watermark Monaco: SI
- node --check game.js: Sintaxis OK

## Self-Check: PASSED
