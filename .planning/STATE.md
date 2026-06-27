---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
current_plan: 3
status: in_progress
stopped_at: Completed 02-02-PLAN.md — Monaco circuit geometry (ROAD_SPINE, AI_WAYPOINTS, CPS, START)
last_updated: "2026-06-27T23:17:00.000Z"
progress:
  total_phases: 17
  completed_phases: 1
  total_plans: 8
  completed_plans: 6
  percent: 15
---

# Project State

## Current Status

**Active phase:** Phase 2 — Monaco + 4 Cars (IN PROGRESS)
**Current plan:** 3
**Last action:** Completed 02-02-PLAN.md — Monaco circuit geometry: ROAD_SPINE (34 pts), AI_WAYPOINTS (24 pts), CPS, START
**Resumed:** 2026-06-27

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-26)

**Core value:** Una carrera tensa y satisfactoria contra rivales con personalidad propia, en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.
**Current focus:** Phase 2 — Monaco + 4 Cars

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | Foundation | Game runs cleanly with no known bugs, expanded keyboard controls, correct 2026 grid, and responsive layout on any device | ◐ Planned (4 plans) |
| 2 | Monaco + 4 Cars | Races take place on Monaco circuit with 4 cars on track simultaneously — player plus 3 AI opponents with distinct personalities | ○ Pending |
| 3 | AI, Audio & Polish | Racing feels tense and dramatic: AI brakes for corners, background music builds atmosphere, VFX celebrate overtakes and communicate damage | ○ Pending |

## Performance Metrics

- Requirements total: 35
- Requirements completed: 15 (BUG-01, BUG-02, BUG-03, BUG-04, CTRL-01, CTRL-02, CTRL-03, GRID-01, GRID-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06)
- Phases completed: 1 / 3

| Plan | Phase | Duration | Tasks | Files |
|------|-------|----------|-------|-------|
| 01-01 | 01-foundation | 20 min | 2 | 1 |
| 01-02 | 01-foundation | 10 min | 2 | 2 |
| 01-03 | 01-foundation | 8 min | 2 | 3 |
| 01-04 | 01-foundation | 8 min | 2 | 3 |
| 02-01 | 02-monaco-4-cars | 35 min | 2 | 1 |
| 02-02 | 02-monaco-4-cars | 4 min | 1 | 1 |

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

- CARS-01 is the load-bearing refactor: `local`/`remote` → `cars[]`; every other Phase 2 requirement depends on it
- TRACK-01 replaces `ROAD_SPINE` and `AI_WAYPOINTS` wholesale — do not attempt to port incrementally
- TRACK-04 (new checkpoints) must be designed alongside TRACK-01 geometry
- CARS-03 collision pairs: 4 cars = 6 pairs (0-1, 0-2, 0-3, 1-2, 1-3, 2-3)

### Phase 3 Notes

- AI-03 depends on CARS-02 personalities being defined in Phase 2
- AUDIO-01 background music loop: use existing Web Audio API pattern from `game.js:234-322`
- VFX-03 overtake drama requires knowing relative positions of all 4 cars — depends on CARS-04 classification HUD

### Blockers

- None currently

## Session Continuity

**Last session:** 2026-06-27
**Stopped at:** Completed 02-02-PLAN.md — Monaco geometry (ROAD_SPINE, AI_WAYPOINTS, CPS, START)
**Resume file:** None — proceed to 02-03-PLAN.md (TRACK-02+03: Monaco environment drawing + tunnel overlay)

## Resume Instructions

Phase 2 in progress. Next: execute 02-03-PLAN.md — Monaco environment drawing (harbour, casino, armco) and tunnel overlay.

---
*State initialized: 2026-06-26*
