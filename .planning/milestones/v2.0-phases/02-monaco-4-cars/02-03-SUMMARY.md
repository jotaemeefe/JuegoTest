---
phase: 02-monaco-4-cars
plan: "03"
subsystem: track-visuals
tags: [monaco, environment, tunnel-overlay, canvas2d, bug-fix, render-order]

requires:
  - phase: 02-monaco-4-cars/02-02
    provides: ROAD_SPINE (34 pts), CPS, START, AI_WAYPOINTS — Monaco geometry base
provides:
  - Monaco environment colour blocks in drawTrack() (harbour, casino, hairpin, pit lane)
  - TUNNEL_ZONE constant and drawTunnelRoof() function
  - car.inTunnel boolean per car (for Phase 3 audio)
  - BUG-OFFTRACK fixed: off-track vignette drawn before cars, not after
affects: [game.js, 02-04-PLAN, phase-03]

tech-stack:
  added: []
  patterns:
    - "Environment drawing: colour blocks drawn in drawTrack() BEFORE tarmac spine so spine paints over them"
    - "Tunnel overlay: polygon roof drawn AFTER all drawCar() calls via drawTunnelRoof()"
    - "Render order: track → vignette (if off-track) → cars → tunnel roof → HUD"

key-files:
  created: []
  modified:
    - game.js

key-decisions:
  - "TUNNEL_ZONE world-space x1:295 y1:255 x2:450 y2:330 — covers Portier→Nouvelle Chicane segment of ROAD_SPINE"
  - "drawTunnelRoof() uses polygon roof approach (not per-car overlay) — simpler and darkens all cars simultaneously"
  - "BUG-OFFTRACK root cause: vignette rendered AFTER drawCar() calls; fix: moved before drawCar() calls"
  - "car.inTunnel boolean set in drawTunnelRoof() each frame for Phase 3 audio use"
  - "Ground changed from green (#1a4a10) to Monaco city grey (#3a3a4a)"

patterns-established:
  - "Render order: drawTrack (environment blocks + tarmac) → optional vignette → drawCar x N → drawTunnelRoof → HUD overlays"
  - "Environment blocks: project() isometric polygon for world-space rectangles, drawn before tarmac"

requirements-completed: [TRACK-02, TRACK-03]

duration: 12min
completed: 2026-06-27
---

# Phase 2 Plan 03: Monaco Environment Drawing + Tunnel Overlay + BUG-OFFTRACK Summary

**Monaco city grey ground with harbour/casino/pit colour blocks, dark tunnel polygon overlay rendered after all cars, and off-track vignette moved before drawCar() to guarantee all cars always visible.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-27T23:20:00Z
- **Completed:** 2026-06-27T23:32:00Z
- **Tasks:** 2 (both committed in single diff — changes were interdependent in same file edit)
- **Files modified:** 1 (game.js)

## Accomplishments

- Monaco visual environment: ground changed to city grey (#3a3a4a), 4 colour blocks added (harbour water, Casino/Mirabeau building plateau, hairpin inner dark block, pit lane strip)
- `TUNNEL_ZONE` constant (world-space bounding box) and `drawTunnelRoof()` function implemented — dark polygon (alpha 0.68) drawn after all `drawCar()` calls in both `racing` and `done` phases
- `car.inTunnel` boolean updated per frame by `drawTunnelRoof()` for Phase 3 audio
- BUG-OFFTRACK root cause identified and corrected: `drawOffTrackVignette()` was being called after `drawCar()`, meaning the vignette gradient painted over the cars when the player was off-track in high-alpha zones; fix is to render the vignette before all car draws

## Task Commits

Both tasks modified game.js in one contiguous editing session and were captured in a single commit:

1. **Task 1 + Task 2: Monaco env + tunnel roof + BUG-OFFTRACK fix** - `d88b67b` (feat(02-03))

**Plan metadata:** (included in SUMMARY + state commits below)

## Files Created/Modified

- `game.js` — drawTrack() refactored with colour blocks; TUNNEL_ZONE constant; drawTunnelRoof() added; loop() render order corrected (vignette before cars, tunnelRoof after cars)

## Decisions Made

- **Tunnel polygon roof (not per-car check):** drawTunnelRoof() draws one polygon covering the whole tunnel zone and darkens any car beneath it. Simpler than per-car alpha overlays and handles all 4 cars automatically.
- **TUNNEL_ZONE bounds:** x1:295 y1:255 x2:450 y2:330 — derived from ROAD_SPINE tunnel segment (Portier [310,265] → [320,295] → [370,310] → [420,315] → Nouvelle Chicane [440,305]) plus margin.
- **Render order established:** `drawTrack` → `drawOffTrackVignette` (if off-track) → `drawCar×N` → `drawTunnelRoof()` → HUD. This guarantees: (a) cars always render over vignette; (b) tunnel roof renders over all cars.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Enhancement] Task 1 and Task 2 combined in same commit**
- **Found during:** Task 1 + 2 execution
- **Issue:** Both tasks modify the same function area of game.js (the loop render section). The off-track vignette placement fix (Task 2) was made in the same editing pass as the tunnel roof integration (Task 1). Splitting into two commits would have required reverting and re-editing.
- **Fix:** Single commit d88b67b captures all changes. Both tasks are fully implemented and verified.
- **Impact:** Minor — all success criteria met; no functional regression.

---

**Total deviations:** 1 (procedural — single commit for two tasks)
**Impact on plan:** No scope creep. All acceptance criteria met for both tasks.

## BUG-OFFTRACK Root Cause and Fix

**Root cause:** In the `racing` phase render section, `drawOffTrackVignette(0.55)` was called AFTER all `drawCar()` calls. The vignette is a radial gradient (transparent at centre, rgba(180,0,0,0.55) at edges). When the player drives off-track, the gradient painted over the already-drawn car sprite. If the off-track position was near a high-alpha zone of the gradient, the car appeared dimmed or obscured.

**Fix:** Moved `drawOffTrackVignette(0.55)` to BEFORE all `drawCar()` calls. The vignette is now part of the background layer. Car sprites always render on top of it. Damage accumulation and shake logic remain in the same position after the render block.

**Candidates investigated and ruled out:**
- No guard in `drawCar()` based on `isOnTrack` (confirmed by automated check)
- Coordinates not exceeding canvas bounds (ROAD_HALF_W=60 keeps off-track cars within world-space)
- Tunnel overlay not involved (was being added, not pre-existing)

**Verified:** Automated test confirms `drawCar()` has no off-track guard; render order test confirms vignette position < first drawCar position < drawTunnelRoof position.

## Known Stubs

None — all environment blocks, tunnel overlay, and render order fixes are fully implemented.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes.

## Self-Check

Files exist:
- game.js: FOUND (modified in place)
- .planning/phases/02-monaco-4-cars/02-03-SUMMARY.md: FOUND (this file)

Commits exist:
- d88b67b: FOUND (feat(02-03): Monaco environment colours + tunnel overlay in drawTrack/drawTunnelRoof)

Verifications passed:
- `function drawTunnelRoof` present: YES
- `TUNNEL_ZONE` constant present: YES (x1:295 y1:255 x2:450 y2:330)
- drawTunnelRoof called after drawCar in racing phase: YES (positions: vignette=2130, drawCar=2317, tunnelRoof=2659)
- drawCar has no isOnTrack guard: YES
- Ground colour not #1a4a10 (green): YES (changed to #3a3a4a)
- Harbour water #1a4a7a: YES
- Casino block #c8c8c4: YES
- Pit lane #1a1a1a: YES
- car.inTunnel set: YES
- node --check game.js: SYNTAX OK

## Self-Check: PASSED

---
*Phase: 02-monaco-4-cars*
*Completed: 2026-06-27*
