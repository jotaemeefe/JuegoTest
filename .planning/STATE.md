---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
current_plan: 2
status: in_progress
stopped_at: Completed 02b-02-PLAN.md — drawTrack() rewritten for 1600x2000 world space (large fillRect, scaled kerbs [60,60], old blocks removed, new META stripe at 520,1820)
last_updated: "2026-06-29T20:18:00.000Z"
progress:
  total_phases: 18
  completed_phases: 2
  total_plans: 12
  completed_plans: 11
  percent: 16
---

# Project State

## Current Status

**Active phase:** Phase 2-B — Monaco Gameplay Overhaul (IN PROGRESS)
**Current plan:** 2 of 5 (02b-02 complete)
**Last action:** Completed 02b-02 — drawTrack() rewritten for 1600x2000 world space: large fillRect(-4000,-4000,8000,8000), kerbs [60,60], old environment blocks removed, META stripe at project(520,1820).
**Resumed:** 2026-06-29

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-26)

**Core value:** Una carrera tensa y satisfactoria contra rivales con personalidad propia, en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.
**Current focus:** Phase 3 — AI, Audio & Polish

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | Foundation | Game runs cleanly with no known bugs, expanded keyboard controls, correct 2026 grid, and responsive layout on any device | COMPLETE |
| 2 | Monaco + 4 Cars | Races take place on Monaco circuit with 4 cars on track simultaneously — player plus 3 AI opponents with distinct personalities | COMPLETE |
| 3 | AI, Audio & Polish | Racing feels tense and dramatic: AI brakes for corners, background music builds atmosphere, VFX celebrate overtakes and communicate damage | ○ Pending |

## Performance Metrics

- Requirements total: 35
- Requirements completed: 21 (BUG-01, BUG-02, BUG-03, BUG-04, CTRL-01, CTRL-02, CTRL-03, GRID-01, GRID-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, TRACK-01, TRACK-02, TRACK-03, CARS-02, CARS-03, CARS-04)
- Phases completed: 2 / 3

| Plan | Phase | Duration | Tasks | Files |
|------|-------|----------|-------|-------|
| 01-01 | 01-foundation | 20 min | 2 | 1 |
| 01-02 | 01-foundation | 10 min | 2 | 2 |
| 01-03 | 01-foundation | 8 min | 2 | 3 |
| 01-04 | 01-foundation | 8 min | 2 | 3 |
| 02-01 | 02-monaco-4-cars | 35 min | 2 | 1 |
| 02-02 | 02-monaco-4-cars | 4 min | 1 | 1 |
| 02-03 | 02-monaco-4-cars | 12 min | 2 | 1 |
| 02-04 | 02-monaco-4-cars | 18 min | 2 | 1 |
| 02b-01 | 02b-monaco-overhaul | 12 min | 2 | 1 |
| 02b-02 | 02b-monaco-overhaul | 8 min | 1 | 1 |

## Accumulated Context

### Key Decisions

- 4 cars = 1 player + 3 AIs (not 4 humans) — multiplayer mesh is v3+
- Monaco replaces the oval entirely — no track selector until v3
- Build order is mandatory: Foundation → Monaco+Cars → AI+Polish (each phase unblocks the next)
- `local`/`remote` refactored to `cars[]` array — COMPLETED in 02-01 (ba256de)
- Monaco ROAD_SPINE (34 pts) replaces Buenos Aires oval — COMPLETED in 02-02 (290f261)
- AI_WAYPOINTS: 24-point Monaco waypoints, AI_WP_REACH=30 — COMPLETED in 02-02 (290f261)
- CPS: 4 Monaco checkpoints (Meta, Casino, Hairpin, Tunnel) — COMPLETED in 02-02 (290f261)
- START: 2x2 grid on Monaco main straight — COMPLETED in 02-02 (290f261)
- TUNNEL_ZONE world-space x1:295 y1:255 x2:450 y2:330 — derived from Portier→Nouvelle Chicane segment of ROAD_SPINE — COMPLETED in 02-03 (d88b67b)
- drawTunnelRoof() uses polygon roof approach — darkens all cars in tunnel simultaneously without per-car checks — COMPLETED in 02-03 (d88b67b)
- BUG-OFFTRACK root cause: vignette rendered AFTER drawCar() calls; fix: moved before drawCar() calls — COMPLETED in 02-03 (d88b67b)
- car.inTunnel boolean set in drawTunnelRoof() each frame for Phase 3 audio — COMPLETED in 02-03 (d88b67b)
- ROAD_SPINE redesigned 52pt in 1600x2000 world space (3.5x scale) — COMPLETED in 02b-01 (1431c6f)
- Physics constants 3.5x: MAX_SPD_ON=650, MAX_SPD_OFF=250, AUTO_ACCEL=550, BRAKE_FORCE=1200, CAR_RADIUS=18, TURN_RATE=3.8, ROAD_HALF_W=80 — COMPLETED in 02b-01 (1431c6f)
- AI_WAYPOINTS 43pt in new world space; AI_WP_REACH=80 — COMPLETED in 02b-01 (c350cb2)
- drawTunnelRoof() removed; car.inTunnel setter extracted as inline forEach in racing phase — COMPLETED in 02b-01 (c350cb2)
- drawTrack() fillRect(-4000,-4000,8000,8000): covers full rotated world space — camera-transform prerequisite — COMPLETED in 02b-02 (4bf8087)
- Kerb dash [60,60] (3.5x scale from old [18,18]); environment blocks removed (harbour, casino, hairpin, pit); META stripe at project(520,1820) — COMPLETED in 02b-02 (4bf8087)
- PERSONALITIES const: aggressive (speedMult 1.05, brakeMult 0.8, damageMult 1.5), defensive (speedMult 0.92, brakeMult 1.2, damageMult 0.8), consistent (all 1.0) — COMPLETED in 02-04 (4a4d71d)
- Personality assignment: cars[1]=aggressive, cars[2]=defensive, cars[3]=consistent every race (fixed mapping) — COMPLETED in 02-04 (4a4d71d)
- PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]] loop replaces single player-vs-cars[1] collision — COMPLETED in 02-04 (4a4d71d)
- damageMult of hitting AI scales collision damage to player (aggressive = 1.5x) — COMPLETED in 02-04 (4a4d71d)
- HUD P1-P4 with distToCP tiebreak to eliminate rank flicker when side-by-side (Pitfall 6) — COMPLETED in 02-04 (4a4d71d)
- prevIsFirst removed; prevPlayerRank replaces it for overtake detection — COMPLETED in 02-04 (4a4d71d)
- BUG-02 finish guard is symmetric for both host and guest paths through shared onMsg handler (verified, already correct)
- BUG-04 lapStartTime correctly initialized at countdown→racing transition (verified, already correct)
- Cadillac livery colors used from best available knowledge — user should verify at formula1.com
- carouselIdx declared local inside buildRivalGrid() — resets to 0 each visit, no global state leak
- prevBtn.onclick assignment (not addEventListener) prevents handler accumulation on repeated buildRivalGrid() calls
- display:contents on .carousel-wrapper at >=500px makes wrapper invisible to layout with zero desktop impact
- Net.destroy() moved before modal.hidden = false in onDisconnect() — peer torn down before 3s UI delay
- navigator.clipboard && guard used before writeText() to handle file:// context without silent failure

### Known Constraints

- Vanilla JS only — no bundler, no npm, no frameworks
- No external image assets — all track environment drawn in Canvas 2D color blocks
- 2026 driver grid must be verified by the user during Phase 1 implementation (agent knowledge cutoff August 2025)
- iOS/Safari: AudioContext must be created inside a user gesture handler (existing pattern in `getAudioCtx()`)

### Phase 1 Notes

- BUG-01/02/03/04 are all small targeted fixes with exact line references in CONCERNS.md
- CTRL-01/02/03 extend the existing `keys` object — additive change
- GRID-01/02: user must verify 2026 grid data before or during implementation
- UI-03 (devicePixelRatio) touches canvas initialization — coordinate with any canvas size changes in Phase 2

### Phase 2 Notes

- All Phase 2 requirements (TRACK-01 to TRACK-04, CARS-01 to CARS-04) implemented across plans 02-01 to 02-04
- CARS-01 was the load-bearing refactor: local/remote → cars[] (02-01)
- Monaco geometry (ROAD_SPINE, AI_WAYPOINTS, CPS, START) fully replaced in 02-02
- brakeMult in PERSONALITIES scales 0.35 base factor — NOTE: 0.35 → 0.70 upgrade is AI-01 (Phase 3)
- lineMult applied as subtle apex offset (max ±5px) to keep AI on track

### Phase 3 Notes

- AI-03 depends on CARS-02 personalities — NOW AVAILABLE (car.personality on each AI car)
- AUDIO-01 background music loop: use existing Web Audio API pattern from game.js:234-322
- VFX-03 overtake drama requires knowing relative positions of all 4 cars — NOW AVAILABLE (P1-P4 HUD)
- car.inTunnel boolean available on each car for tunnel audio effect (Phase 3 AI/audio)

### Blockers

- None currently

## Session Continuity

**Last session:** 2026-06-29
**Stopped at:** Completed 02b-02-PLAN.md — drawTrack() rewritten for new world space. Next: 02b-03 (camera transform in loop()).
**Resume file:** None — continue Phase 2-B with 02b-03

## Resume Instructions

02b-02 complete. drawTrack() is camera-transform-ready with large fillRect and scaled kerbs. Next: execute 02b-03 — add camera transform (ctx.save/translate/rotate/translate) in loop() so the view follows and rotates with the player car.

---
*State initialized: 2026-06-26*
