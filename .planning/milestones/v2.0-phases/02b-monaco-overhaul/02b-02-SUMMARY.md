---
phase: 02b-monaco-overhaul
plan: "02"
subsystem: rendering
tags: [canvas2d, drawtrack, world-space, kerbs, camera-prep]

# Dependency graph
requires:
  - phase: 02b-monaco-overhaul
    plan: "01"
    provides: "52-pt ROAD_SPINE in 1600x2000 world space, ROAD_HALF_W=80"
provides:
  - "drawTrack() rewritten for 1600x2000 world space"
  - "Large fillRect(-4000,-4000,8000,8000) background — camera-rotation-safe"
  - "Kerb dashes at [60,60] scale (3.5x from old [18,18])"
  - "Old 480x640 environment colour blocks removed (harbour, casino, hairpin, pit)"
  - "Watermark removed"
  - "Start/finish stripe at new CP0 position project(520,1820)"
affects: [02b-03, 02b-04, 02b-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [world-space-rendering, camera-rotation-safe-background]

key-files:
  created: []
  modified:
    - game.js

key-decisions:
  - "fillRect(-4000,-4000,8000,8000) covers entire rotated world — prerequisite for camera transform in 02b-03"
  - "Kerb lineWidth increased to ROAD_HALF_W*2+12 (was +8) to maintain visual prominence at 3.5x scale"
  - "Harbour water, casino building, hairpin inner, pit lane blocks removed — old 480x640 coords, deferred to Phase 3 per D-20"
  - "Watermark 'CIRCUIT DE MONACO' removed per RESEARCH.md open question 3 resolution"
  - "META stripe at project(520, 1820) aligned with CP0 checkpoint position"

patterns-established:
  - "Camera-rotation-safe background: fillRect covering full world space (-4000,-4000,8000,8000) drawn first in drawTrack()"

requirements-completed:
  - TRACK-01

# Metrics
duration: 8min
completed: "2026-06-29"
---

# Phase 02b Plan 02: drawTrack() Rewrite for New World Space Summary

**drawTrack() simplified for 1600x2000 Monaco: large world-fill background, 3.5x kerb dashes [60,60], old environment blocks removed, start/finish stripe at new CP0 coordinates — camera-transform-ready.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-29T20:10:00Z
- **Completed:** 2026-06-29T20:18:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced `fillRect(0,0,480,640)` with `fillRect(-4000,-4000,8000,8000)` so the background tiles the full rotated world when the camera transform (Plan 02b-03) is applied
- Updated kerb dash pattern from `[18,18]` to `[60,60]` (3.5x scale) with matching lineDashOffset=60 — kerbs remain visible at the new world scale
- Removed all four old environment colour blocks (harbour `#1a4a7a`, casino `#c8c8c4`, hairpin inner `#2a2a3a`, pit lane `#1a1a1a`) that used 480x640 coordinates — these will appear misaligned in the new world and are deferred to Phase 3 per D-20
- Removed watermark `fillText('CIRCUIT DE MONACO · MONTE CARLO')` per open question 3 resolution
- Start/finish stripe relocated to `project(520, 1820)` — aligns with CP0 checkpoint and the new main straight at y≈1820

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite drawTrack() for new world space and scale** - `4bf8087` (feat)

**Plan metadata:** (created below)

## Files Created/Modified

- `game.js` — drawTrack() body rewritten: large fillRect, scaled kerbs, old blocks removed, new stripe position

## Decisions Made

- `fillRect(-4000,-4000,8000,8000)` sized to exceed any diagonal at 1600x2000 world (diagonal ≈ 2561px < 4000px slack on each side — safe for any rotation angle)
- Kerb lineWidth increased slightly to `ROAD_HALF_W * 2 + 12` (was `+8`) to maintain visual prominence given the larger dash spacing
- drawSpinePath() left completely unchanged — it already reads from ROAD_SPINE which was replaced in 02b-01

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All removed blocks are intentionally absent per D-20 (deferred to Phase 3). The track tarmac, kerbs, racing line, and start/finish stripe all render from the new 52-pt ROAD_SPINE.

## Threat Flags

None. Pure Canvas 2D rendering constants — no external input, no trust boundaries.

## Issues Encountered

None.

## Next Phase Readiness

- drawTrack() is now camera-transform-ready: fillRect covers the full rotated world space
- Plan 02b-03 (camera transform in loop()) can now proceed — ctx.save/translate/rotate/translate block will work correctly
- Plan 02b-04 (minimap) draws in screen space after ctx.restore() — drawTrack() does not affect it
- Game is technically playable but will look odd (camera fixed) until 02b-03 adds the rotating camera

## Self-Check: PASSED

- game.js modified: confirmed (1 commit)
- Commit exists: 4bf8087 — verified in git log
- All acceptance criteria verified via node:
  - fillRect(-4000,-4000,8000,8000): true
  - no fillRect(0,0,480,640): true
  - setLineDash([60,60]): true
  - no #1a4a7a (harbour): true
  - no #c8c8c4 (casino): true
  - no #1a1a1a (pit lane): true
  - no 'CIRCUIT DE MONACO' (watermark): true
  - project(520, 1820) present: true
  - drawSpinePath() unchanged (beginPath, forEach ROAD_SPINE, project, moveTo/lineTo): true

---
*Phase: 02b-monaco-overhaul*
*Completed: 2026-06-29*
