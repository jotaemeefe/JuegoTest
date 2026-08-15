---
phase: 02b-monaco-overhaul
plan: "01"
subsystem: game-constants
tags: [geometry, physics, ai-navigation, constants]
dependency_graph:
  requires: []
  provides: [world-space-geometry, physics-constants, ai-waypoints, tunnel-zone]
  affects: [game.js]
tech_stack:
  added: []
  patterns: [world-space-constant-replacement]
key_files:
  created: []
  modified:
    - game.js
decisions:
  - "ROAD_SPINE: 52-point clockwise Monaco circuit in 1600×2000 world space — replaces 34-pt 480×640 oval"
  - "Loews hairpin designed with spine radius ~100px (avoids track overlap at ROAD_HALF_W=80)"
  - "AI_WP_REACH=80 rather than naive 3.5x=105 — tighter for corner precision"
  - "drawTunnelRoof() removed entirely; car.inTunnel setter extracted inline to racing phase"
metrics:
  duration: "12 min"
  completed: "2026-06-29"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 02b Plan 01: World-Space Geometry Constants Summary

**One-liner:** Replaced all world-space geometry with Monaco 3.5x-scale redesign: 52-pt ROAD_SPINE (1600×2000), tuned physics constants (MAX_SPD_ON=650), 43-pt AI_WAYPOINTS, inline car.inTunnel setter.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace physics constants, ROAD_SPINE, CPS, START, TUNNEL_ZONE | 1431c6f | game.js |
| 2 | Replace AI_WAYPOINTS and AI_WP_REACH, extract inTunnel setter, remove drawTunnelRoof | c350cb2 | game.js |

## What Was Done

### Task 1: Physics Constants + Geometry Arrays

Replaced all world-space constant declarations in game.js:

**Physics constants** (3.5x scale per D-13, D-14, D-15):
- `MAX_SPD_ON`: 190 → 650 px/s
- `MAX_SPD_OFF`: 72 → 250 px/s
- `AUTO_ACCEL`: 160 → 550 px/s²
- `BRAKE_FORCE`: 350 → 1200 px/s²
- `CAR_RADIUS`: 14 → 18 px
- `TURN_RATE`: 4.5 → 3.8 rad/s (independent tuning per D-14)
- `ROAD_HALF_W`: 28 → 80 px (D-07)
- `FRICTION_K`: 1.1 (unchanged — D-15)

**ROAD_SPINE**: 34-pt 480×640 oval → 52-pt 1600×2000 Monaco circuit. Clockwise from [200, 1820] (Meta/main straight) covering all key sections: Sainte-Dévote, Beau Rivage, Massenet, Casino, Mirabeau, Loews hairpin (U-turn with spine radius ~100px to avoid track overlap at ROAD_HALF_W=80), Portier, Tunnel, Nouvelle Chicane, Tabac, Swimming Pool, Rascasse, Antony Noghès. Closes back to [200, 1820].

**CPS**: 4 new checkpoints in new world space:
- CP0 (META): x:520, y:1820, r:200
- CP1 (Casino): x:900, y:1000, r:200
- CP2 (Loews apex): x:360, y:550, r:220
- CP3 (Tunnel): x:1050, y:860, r:220

**START**: 4 positions on new main straight at y≈1820, staggered 2×2 formation. Min separation P1↔P2 ≈ 61px > CAR_RADIUS×2=36px (no collision at start).

**TUNNEL_ZONE**: {x1:318,y1:282,x2:452,y2:325} → {x1:730,y1:720,x2:1180,y2:920} (covers Portier exit through Nouvelle Chicane entry in new world space).

### Task 2: AI Navigation + inTunnel Extraction

**AI_WAYPOINTS**: 24-pt old Monaco → 43-pt new 1600×2000 layout. Starts at [520, 1820] (main straight). Dense coverage at Loews hairpin: 5 waypoints (WP 15-19) spaced ~40px for corner precision.

**AI_WP_REACH**: 30 → 80 px. Intentionally less than naive 3.5×=105 to maintain precision at tight corners.

**drawTunnelRoof() removal**: The function (which combined visual polygon drawing + car.inTunnel setter) was removed entirely. Visual tunnel overlay deferred to Phase 3 per D-22.

**car.inTunnel inline setter**: Extracted as a `cars.forEach()` loop placed in the racing phase of `loop()`, just before `drawTrack()`. This ensures the Phase 3 audio system can read `car.inTunnel` reliably each frame.

Both `drawTunnelRoof()` call sites removed: racing phase (after drawCar calls) and done phase.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. These are data constants — no UI rendering or data source wiring involved.

## Threat Flags

None. Pure constant/array replacement in client-side game.js with no external input, network calls, or trust boundaries.

## Self-Check: PASSED

- game.js modified: confirmed (2 commits)
- Commits exist: 1431c6f (Task 1), c350cb2 (Task 2) — both in git log
- All acceptance criteria verified via node checks:
  - MAX_SPD_ON=650, MAX_SPD_OFF=250, AUTO_ACCEL=550, BRAKE_FORCE=1200, CAR_RADIUS=18, TURN_RATE=3.8, ROAD_HALF_W=80
  - ROAD_SPINE: 52 pts, starts+ends [200,1820]
  - CPS[0]: x:520, y:1820
  - START[0]: x:580, y:1826
  - TUNNEL_ZONE: x1:730, y1:720, x2:1180, y2:920
  - AI_WAYPOINTS: 43 entries, starts [520, 1820]
  - AI_WP_REACH = 80
  - "drawTunnelRoof()" does NOT appear anywhere in game.js
  - "car.inTunnel = (car.x >= TUNNEL_ZONE.x1" appears in racing phase of loop()
