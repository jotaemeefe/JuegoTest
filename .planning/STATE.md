---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Arcade Rebirth
status: "Roadmap ready — awaiting `/gsd:plan-phase 5`"
stopped_at: Phase 5 context gathered
last_updated: "2026-08-15T20:44:47.461Z"
last_activity: 2026-08-15 — ROADMAP.md and REQUIREMENTS.md traceability written for v3.0 (Phases 5-11, 19/19 requirements mapped)
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-15)

**Core value (v3.0):** Un kart de carreras F1/Colapinto se siente rápido y satisfactorio en tercera persona, en un kartódromo con identidad propia — reemplazando el sistema top-down actual.
**Current focus:** Phase 5 — Chase-Cam Renderer Foundation

## Current Position

Phase: 5 of 11 (Chase-Cam Renderer Foundation) — first phase of v3.0
Plan: TBD (not yet planned)
Status: Roadmap ready — awaiting `/gsd:plan-phase 5`
Last activity: 2026-08-15 — ROADMAP.md and REQUIREMENTS.md traceability written for v3.0 (Phases 5-11, 19/19 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Phase Overview (v3.0)

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 5 | Chase-Cam Renderer Foundation | RENDER-01..04 | Not started |
| 6 | Kart Drift Handling | DRIFT-01..03 | Not started |
| 7 | AI Port & Drift Parity | AI-01, AI-02 | Not started |
| 8 | Kartódromo Content & Kart Art | TRACK-01, TRACK-02, ART-01 | Not started |
| 9 | Progression — Best Lap, Rank & Ghost | PROGRESS-01..03 | Not started |
| 10 | Multiplayer Payload Update | MP-01, MP-02 | Not started |
| 11 | Mobile Regression & Polish Pass | MOBILE-01, MOBILE-02 | Not started |

v2.0 phase history (1, 2, 2b, 2c, 3, 3b, 4A, 4B — all complete): see
`.planning/milestones/v2.0-ROADMAP.md` and `.planning/MILESTONES.md`.

## Performance Metrics

**Velocity (v3.0):**

- Total plans completed: 0
- Average duration: — (no plans executed yet this milestone)

v2.0 velocity history archived in `.planning/milestones/v2.0-ROADMAP.md`.

## Accumulated Context

### Decisions

Full decision log lives in PROJECT.md Key Decisions table. Decisions specific to this
milestone's roadmap:

- Phase order follows research/SUMMARY.md's dependency chain: renderer before drift-tuning
  (needs a visible correct road), drift/AI-drift-parity before content (redoing content is
  expensive, redoing a throwaway harness is cheap), content before progression (nothing to
  measure without a real track), multiplayer payload late (only depends on Phase 6's
  track-space car state, no other phase blocks it), mobile regression pass last (full
  end-to-end gate) but also checked per-phase along the way.

- Ghost replay (PROGRESS-02) is in-scope this milestone (corrected from "deferred/too complex"
  in earlier PROJECT.md framing) — research found it LOW-MEDIUM complexity, simpler than the
  already-shipped AI racecraft system.

- DRS is explicitly out of scope for v3.0 — no aerodynamic justification on a kartodromo; the
  drift release-boost is this release's only boost mechanic.

- Point-to-point branching (originally the assumed v3.0 format) was dropped before requirements
  were written — closed-lap kartodromo replaces it; removes the entire branch-graph/multiplayer
  divergence risk category the original research scoping had flagged as highest-risk.

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 6 (drift feel) and Phase 8 (kartodromo content authenticity) are flagged by research as
  needing extra playtest/reference validation during planning — not pure implementation passes.
  See `.planning/research/SUMMARY.md` "Research Flags" and "Gaps to Address".

- ART-01 (new kart/pilot sprite angles) is scoped but not sized — frame count and pipeline
  integration should be resolved early in Phase 8 planning (flagged in research Gaps).

## Deferred Items

Items acknowledged and carried forward from previous milestone close (2026-08-15):

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| uat_gap | 01-HUMAN-UAT.md (Phase 01, v2.0) | approved, 8 open scenarios | v2.0 close |
| verification_gap | 01-VERIFICATION.md (Phase 01, v2.0) | human_needed | v2.0 close |

## Session Continuity

Last session: 2026-08-15T20:44:47.424Z
Stopped at: Phase 5 context gathered
created yet.
Resume file: .planning/phases/05-chase-cam-renderer-foundation/05-CONTEXT.md

---
*State reset for v3.0 milestone: 2026-08-15 (v2.0 history archived in `.planning/milestones/`)*
