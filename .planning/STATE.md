---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
current_plan: Phase 3b DONE — see 03b-04-SUMMARY.md (arcade pivot)
status: Awaiting next milestone
stopped_at: Phase 3b planned (research + 4 wave plans). Implementation not started.
last_updated: "2026-08-15T19:49:41.093Z"
last_activity: 2026-08-15 — Milestone v2.0 completed and archived
progress:
  total_phases: 19
  completed_phases: 4
  total_plans: 17
  completed_plans: 16
  percent: 21
---

# Project State

## Current Status

**Active phase:** Phase 3b — Gameplay Refactor (ALL 4 WAVES COMPLETE)
**Current plan:** Phase 3b DONE — see 03b-04-SUMMARY.md (arcade pivot)
**Last action:** Shipped 03b-02: bump-and-run collisions (tangential stagger + heading nudges — ram test: player slides around a parked rival, never pinned), wall grinding via applyWallContact (20° contact keeps 90% speed; square hit = crash), micro-drift (velAngle, GRIP_ON=34), smoothed lookahead camera, and the mobile viewport fix (100dvh column, letterboxed canvas — verified 375x667 and 320x568). Previously shipped 03b-01: trackProgress() continuous progress (SPINE_CUMLEN, circuit=5499px), crossedFinish() segment test replacing the CP0 radius (win now fires at x=505, was x≈300), gates shrunk to r=100 + CP2 moved to apex exit, overtake engine with 600ms confirmation + 3s cooldown, real-seconds gaps. 10/10 automated checks + natural-race AI lap regression, zero JS errors.
**Resumed:** 2026-07-05

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-26)

**Core value:** Una carrera tensa y satisfactoria contra rivales con personalidad propia, en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.
**Current focus:** Phase 3 — AI, Audio & Polish

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | Foundation | Game runs cleanly with no known bugs, expanded keyboard controls, correct 2026 grid, and responsive layout on any device | COMPLETE |
| 2 | Monaco + 4 Cars | Races take place on Monaco circuit with 4 cars on track simultaneously — player plus 3 AI opponents with distinct personalities | COMPLETE |
| 2b | Monaco Overhaul | Rotating follow camera (car points up), Monaco at 3.5x in 1600x2000 world space, minimap, physics re-tuned | COMPLETE |
| 2c | Gameplay Fix | Non-crossing circuit redesign, Monaco walls, collision fix, wrong-way detector, physics slowed for control, VS CPU → 1v1 | COMPLETE |
| 3 | AI, Audio & Polish | Racing feels tense and dramatic: AI brakes for corners, background music builds atmosphere, VFX celebrate overtakes and communicate damage, DRS adds tactics | COMPLETE |
| 3b | Gameplay Refactor | The game *cierra*: real finish line, honest overtake events, contact that slides instead of sticking, walls you grind, AI you can battle, Monaco with identity | COMPLETE |

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
| 02b-03 | 02b-monaco-overhaul | 22 min | 2 | 1 |

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
- Rotating follow camera: ctx.save/translate(240,380)/rotate(-car.angle-PI/2)/translate(-car.x,-car.y) in all 3 loop() phases — COMPLETED in 02b-03 (59508ed)
- Camera focal point y=380 (60% from top per D-02): more forward view than rear view — COMPLETED in 02b-03 (59508ed)
- drawMinimap() 100x120px top-right, ROAD_SPINE outline + car dots, bounding-box auto-scale — COMPLETED in 02b-03 (73d5dac)
- drawOffTrackVignette() updated to screen-space center (240,380) — aligned with camera focal point D-02 — COMPLETED in 02b-03 (73d5dac)
- All screen-space overlays (drawCountdown, drawWin, cpFlash, drawFloatingTexts, drawDamageBar, drawOffTrackVignette) moved after ctx.restore() — COMPLETED in 02b-03 (59508ed)
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

### Phase 2c Pivot Decisions (2026-07-02)

- Monaco in 2D self-crosses (it's a 3D circuit) → ROAD_SPINE redesigned to a **non-crossing** 57-pt layout with guaranteed separation (Beau Rivage vs Swimming Pool 296px; main straight y=1500 vs return straight 245px) — COMPLETED in 391a1aa
- AI_WAYPOINTS grown to 55 pts following the non-crossing layout — COMPLETED in 391a1aa
- CPS: META y=1500 (500,1500), Casino/Mirabeau (950,1005), Loews apex (528,602), Tunnel mid (1190,682); START grid at y≈1500 — COMPLETED in 391a1aa
- **VS CPU reduced from 4 cars to 1v1** (player + one selected rival, personality=consistent). Multiplayer also 2 cars. cars[]/collision code unchanged, just seeded with 2 — COMPLETED in f94e7a5
- Physics slowed for control: MAX_SPD_ON 650→450, MAX_SPD_OFF→175, AUTO_ACCEL 550→400, BRAKE_FORCE 1200→900, TURN_RATE 3.8→4.5 (min turn radius 171px→100px, Loews negotiable) — COMPLETED in f94e7a5
- Monaco barrier walls: nearestSpinePoint() snaps off-track cars to 88% ROAD_HALF_W and cuts speed — walls ARE the circuit (no run-off) — COMPLETED in c92c09b/02c
- Collision sticking fixed: separation 0.55→1.02, restitution 0.35→0.65 — COMPLETED in c92c09b/02c
- Wrong-way detector: wrongWayTimer caps player speed to 100px/s + "⚠ VUELTA INCORRECTA ⚠" overlay when heading opposes spine dir — COMPLETED in c92c09b/02c
- Multiplayer pos bounds widened to x<1700 / y<2100 for the full world — COMPLETED in c92c09b/02c
- AI corner-braking landed early (Phase 3 AI-01 scope): braking when absDiff>0.65 → BRAKE_FORCE×brakeMult, speed capped 60% — present in current code

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

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-08-15:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | 01-HUMAN-UAT.md (Phase 01) | approved, 8 open scenarios |
| verification_gap | 01-VERIFICATION.md (Phase 01) | human_needed |

## Session Continuity

**Last session:** 2026-07-05
**Stopped at:** Phase 3b planned (research + 4 wave plans). Implementation not started.
**Resume file:** `.planning/phases/03b-gameplay-refactor/03b-01-PLAN.md`

## Resume Instructions

Execute Phase 3b waves in order — 03b-01 (trackProgress + real finish + honest overtakes) is
the load-bearing wave and blocks the rest. Key confirmed bugs to validate against after each
wave: (1) win must only trigger on actual META stripe crossing (was firing at x=300, stripe at
x=500); (2) head-to-tail contact must resolve into a slide, never a pinned ram-loop; (3)
overtake messages must fire once per real pass with 0.6s hysteresis. Root causes with code
anchors: 03b-RESEARCH.md.

---
*State initialized: 2026-06-26*

## Current Position

Phase: Milestone v2.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-08-15 — Milestone v2.0 completed and archived

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
