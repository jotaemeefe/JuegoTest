---
phase: 02b-monaco-overhaul
plan: "03"
subsystem: rendering
tags: [canvas2d, camera-transform, rotating-camera, minimap, screen-space]

# Dependency graph
requires:
  - phase: 02b-monaco-overhaul
    plan: "01"
    provides: "52-pt ROAD_SPINE in 1600x2000 world space, physics constants 3.5x"
  - phase: 02b-monaco-overhaul
    plan: "02"
    provides: "drawTrack() with fillRect(-4000,-4000,8000,8000) — camera-rotation-safe"
provides:
  - "Rotating follow camera active in loop() — player car always points up (D-01)"
  - "ctx.save/translate(240,380)/rotate(-angle-PI/2)/translate(-car.x,-car.y) in all three phases"
  - "drawMinimap() function — 100x120px top-right minimap with circuit outline and car dots"
  - "drawOffTrackVignette() updated to screen-space center (240, 380)"
  - "All screen-space draws (drawCountdown, drawWin, cpFlash, drawFloatingTexts, drawDamageBar, drawOffTrackVignette) moved after ctx.restore()"
affects: [02b-04, 02b-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [rotating-follow-camera, screen-space-after-restore, minimap-bounding-box-scale]

key-files:
  created: []
  modified:
    - game.js

key-decisions:
  - "Camera transform applied identically in all three loop() phases (countdown, racing, done) for consistency"
  - "Countdown render block placed as second if (not else-if) after the main phase chain — allows physics/timer to run in the first if block and render in the second block without code duplication"
  - "onTrk computed in physics section (before world block) so value is available in screen-space section after ctx.restore()"
  - "drawOffTrackVignette() center hardcoded to (240, 380) — camera focal point per D-02, not world-space project(240,310)"
  - "drawMinimap() uses bounding-box auto-scaling from ROAD_SPINE — works with any circuit geometry without hardcoded transforms"
  - "All transform stacks balanced: 3 ctx.save() in loop() match 3 ctx.restore(); drawMinimap() has its own balanced save/restore pair"

patterns-established:
  - "World-space draw block: ctx.save → camera transform → drawTrack → drawCar(s) → ctx.restore"
  - "Screen-space block after ctx.restore(): drawMinimap, then phase-specific overlays"
  - "Physics/game-state computed before render block; render-only calls after camera transform"

requirements-completed:
  - TRACK-01

# Metrics
duration: 22min
completed: "2026-06-29"
---

# Phase 02b Plan 03: Rotating Follow Camera + Minimap Summary

**Rotating follow camera active: player car always points up on screen. World rotates around the car via ctx.save/translate/rotate/translate in loop(). drawMinimap() added for circuit awareness. All screen-space overlays moved after ctx.restore().**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-29T20:18:00Z
- **Completed:** 2026-06-29T20:40:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

### Task 1: Camera Transform in loop()

Restructured all three phases (countdown, racing, done) to apply the same 4-step canvas transform before world-space draws:

```javascript
ctx.save();
ctx.translate(240, 380);                    // camera focal point (D-02: 60% from top)
ctx.rotate(-cars[0].angle - Math.PI / 2);  // world rotates so car points up (D-01)
ctx.translate(-cars[0].x, -cars[0].y);     // center world on car position
```

Moved 6 screen-space elements to after ctx.restore():
- `drawCountdown(countdown)` — countdown phase
- `drawWin(winner === 0)` — done phase
- `drawOffTrackVignette(0.55)` — racing phase (if !onTrk)
- cpFlash `ctx.strokeRect(5, 5, 470, 630)` — racing phase
- `drawFloatingTexts(dt)` — racing phase
- `drawDamageBar(cars[0].damage)` — racing phase

All physics/game-state updates (updateCar, updateAI, checkCheckpoints, PAIRS collisions, Net.send, updateHUD, engine audio, inTunnel setter, damage logic) remain unchanged in the racing physics section before the render block.

`onTrk` is computed in the physics section (before the world block) and referenced in the screen-space section after ctx.restore() for `drawOffTrackVignette`.

`drawMinimap()` called after ctx.restore() in all three phases (as a stub in Task 1, implemented in Task 2).

### Task 2: drawMinimap() + drawOffTrackVignette() Update

**drawMinimap()** — new function inserted before the loop() function, grouped with other rendering helpers:
- 100x120px dark (#0d0d1a, 75% alpha) rectangle at MAP_X=374, MAP_Y=6 (top-right corner)
- ROAD_SPINE circuit outline: `rgba(255,255,255,0.4)` polyline, lineWidth=2
- Car dots: player (i=0) = white #ffffff r=3, AI = car.rivalData?.body or #888 r=2
- Auto-scaling from ROAD_SPINE bounding box: `scale = Math.min((W-PAD*2)/rangeX, (H-PAD*2)/rangeY)`
- Wrapped in ctx.save()/ctx.restore() — balanced transform stack

**drawOffTrackVignette()** updated:
- Removed `const center = project(240, 310)` and `center.x/center.y` references
- Changed to `ctx.createRadialGradient(240, 380, 100, 240, 380, 280)` — screen-space, camera focal point
- `ctx.fillRect(0, 0, 480, 640)` unchanged — correct for screen-space draw after ctx.restore()

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rotating follow camera transform to loop()** - `59508ed` (feat)
2. **Task 2: Add drawMinimap() and update drawOffTrackVignette()** - `73d5dac` (feat)

## Files Created/Modified

- `game.js` — loop() restructured with camera transform, drawMinimap() added, drawOffTrackVignette() updated

## Decisions Made

- Camera transform applied in all three phases (countdown, racing, done) for visual consistency — even the countdown grid view rotates to show the starting angle correctly
- Countdown render block structured as a second `if (phase === 'countdown')` (not else-if) after the main physics chain — allows the timer/phase-transition logic to run first, then render runs on the same frame if phase hasn't changed
- drawMinimap() placed just before the loop() function — keeps rendering helpers grouped together
- Optional camera smoothing (lerp) deferred per D-DISCRETION — lock direct camera implemented first

## Deviations from Plan

None - plan executed exactly as written. The camera transform order, minimap dimensions, and vignette center coordinates all match the specifications in D-03, D-17, D-18, D-19, and D-02.

## Known Stubs

None. All functions are fully implemented. drawMinimap() connects to live ROAD_SPINE and cars[] data. drawOffTrackVignette() correctly centers on the camera focal point.

## Threat Flags

None. Pure Canvas 2D rendering changes — no new network endpoints, auth paths, file access, or trust boundaries introduced. Camera transform is render-only; Net.send() still broadcasts raw world coordinates (verified: unchanged).

## Threat Model Verification (T-02b03-01)

ctx.save/restore balance verified:
- `drawMinimap()`: 1 save, 1 restore — balanced
- `loop()` camera blocks: 3 saves (one per phase), 3 restores — balanced
- The fourth "restore" found in automated checks was inside a comment string, not executable code

## Self-Check: PASSED

- game.js modified: confirmed (2 commits: 59508ed, 73d5dac)
- Syntax check: `node --check game.js` → OK, no errors
- All must_haves artifacts verified via node:
  - ctx.translate(240, 380): true
  - ctx.rotate(-cars[0].angle - Math.PI / 2): true
  - function drawMinimap(): true
  - createRadialGradient(240, 380,): true
- All Task 1 acceptance criteria verified:
  - hasSave, hasTranslate240, hasRotate, hasRestore, hasMinimap: all true
  - drawCountdown/drawWin/cpFlash/drawFloatingTexts/drawDamageBar/drawOffTrackVignette all after restore: all true
  - Physics/game-state unchanged in position: confirmed
- All Task 2 acceptance criteria verified:
  - MAP_W=100, MAP_H=120, MAP_X=374, MAP_Y=6: true
  - ROAD_SPINE iteration, cars.forEach, save/restore: all true
  - vignette createRadialGradient(240,380,...), no project() call: true

---
*Phase: 02b-monaco-overhaul*
*Completed: 2026-06-29*
