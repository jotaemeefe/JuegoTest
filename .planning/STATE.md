# Project State

## Current Status

**Active phase:** None — project initialized, ready to start Phase 1
**Last action:** v2.0 project initialized with 35 requirements across 3 phases
**Resumed:** 2026-06-26

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-26)

**Core value:** Una carrera tensa y satisfactoria contra rivales con personalidad propia, en el mítico circuito de Mónaco, que se juega bien tanto en desktop como en celular.
**Current focus:** Phase 1 — Foundation

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | Foundation | Game runs cleanly with no known bugs, expanded keyboard controls, correct 2026 grid, and responsive layout on any device | ○ Pending |
| 2 | Monaco + 4 Cars | Races take place on Monaco circuit with 4 cars on track simultaneously — player plus 3 AI opponents with distinct personalities | ○ Pending |
| 3 | AI, Audio & Polish | Racing feels tense and dramatic: AI brakes for corners, background music builds atmosphere, VFX celebrate overtakes and communicate damage | ○ Pending |

## Performance Metrics

- Requirements total: 35
- Requirements completed: 0
- Phases completed: 0 / 3

## Accumulated Context

### Key Decisions
- 4 cars = 1 player + 3 AIs (not 4 humans) — multiplayer mesh is v3+
- Monaco replaces the oval entirely — no track selector until v3
- Build order is mandatory: Foundation → Monaco+Cars → AI+Polish (each phase unblocks the next)
- `local`/`remote` must be refactored to `cars[]` array before anything else in Phase 2 touches AI or rendering

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

## Resume Instructions

To continue: `/gsd:discuss-phase 1`

---
*State initialized: 2026-06-26*
