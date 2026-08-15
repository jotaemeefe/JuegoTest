# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Colapinto F1 Racer

**Shipped:** 2026-08-15
**Phases:** 8 (1, 2, 2b, 2c, 3, 3b, 4A, 4B) | **Plans:** 21

### What Was Built
- Monaco circuit from scratch, redesigned as a non-crossing 57-point spine with a rotating follow camera and minimap.
- A physics model rebuilt around exponential speed-approach so speed caps and multipliers are real (fixing a terminal-velocity bug that made them decorative).
- Racecraft AI: predictive traffic avoidance, defensive blocking, catch-up rubber-band, visible pressure mistakes.
- Honest race feedback: real segment-crossing finish line, continuous track-progress ranking, real-second gaps, one-shot overtake events.
- Audio/VFX/DRS layer and an Alpine-branded UI redesign.
- R4A/R4B pixel-art evolution: 22-car five-lap Grand Prix, 135%-scale widened circuit, native tile/palette pixel-art pipeline, intentional prop/crowd placement, clean-racing mastery score.

### What Worked
- Correction phases (2c, 3b) driven by actual playtest/automated visual testing caught real playability bugs (terminal velocity, collision sticking, early finish line) that spec review alone would have missed.
- Splitting "make it work" from "make it fun" (Phase 2 vs 2b/2c) kept each phase's scope reviewable.
- The project's own `PLAN.md` + `RELEASE.md` pattern (mandated in CLAUDE.md) captured 4A/4B scope, decisions, and validation gates well enough to reconstruct milestone history without SUMMARY.md.

### What Was Inefficient
- 4A and 4B shipped complete (verified, RELEASE.md marked COMPLETE) but sat uncommitted in the working tree for over a month, and `STATE.md`/`ROADMAP.md`/`REQUIREMENTS.md` were never synced to reflect them — this milestone close required manual reconciliation (stale traceability table, missing Phase Details sections, `missing_phase_details: ["4A","4B","2c"]` in `roadmap.analyze`).
- No `MILESTONES.md` existed despite the project being well past v1 — this was the first formal milestone close, done retroactively rather than as each phase landed.
- REQUIREMENTS.md checkboxes for Phase 3 (AUDIO/VFX/DRS/UI-07) and Phase 2 (TRACK-02/03) were left unchecked for weeks after the features actually shipped, verified against `game.js` only at milestone-close time.

### Patterns Established
- Custom release docs (`PLAN.md` + `RELEASE.md` under `.planning/phases/`) are this project's accepted alternative to GSD's `SUMMARY.md` — future milestone-close passes should check both patterns, not just `*-SUMMARY.md`.
- Pixel-art assets (`assets/*.png`) are now an accepted part of the stack — the original "no external images" constraint from v1/v2 is retired.

### Key Lessons
1. When a phase finishes work outside the standard GSD artifact pattern (e.g., `RELEASE.md` instead of `SUMMARY.md`), update `ROADMAP.md`'s Phase Details/Progress Table in the same commit — otherwise `gsd-sdk query roadmap.analyze` silently drops it from tracking.
2. Uncommitted "done" work is a recurring risk on this project — commit at the RELEASE.md checkpoint, not at some later batch point.
3. REQUIREMENTS.md traceability drifts fast once a phase ships; reconcile it against the actual codebase (not just the checklist) before trusting it at milestone close.

### Cost Observations
- Sessions: retroactive close spanning multiple work sessions (2026-06-26 → 2026-08-15).
- Notable: the milestone-close audit (`audit-open`) caught real, if minor, leftover debt (Phase 01 UAT/verification gaps) that had gone unnoticed since the earliest phase.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.0 | multiple | 8 | First formal milestone close; established RELEASE.md as an accepted alternative to SUMMARY.md for this project |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|--------------------|
| v2.0 | 2 automated smoke suites (`tests/r4a-smoke.test.js`, `tests/r4b-release.test.js`) + manual screenshot references | Not formally measured (no build/test tooling — vanilla JS) | 0 (PeerJS CDN only, unchanged) |

### Top Lessons (Verified Across Milestones)

1. Commit at the phase-completion checkpoint, not in a later batch — uncommitted "done" work is invisible to every tracking tool.
