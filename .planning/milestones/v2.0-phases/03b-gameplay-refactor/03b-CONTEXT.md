# Phase 3-B Context — Gameplay Refactor ("el juego debe cerrar")

**Date:** 2026-07-05
**Trigger:** User feedback after playing the Phase 3 build (PR #3).

---

## User complaints (verbatim intent)

1. **"Es muy frecuente que te trabes con el otro jugador"** — collision contact with the
   rival locks you in place; you can't slide around, you just lose all speed and stay glued.
2. **"No llegás a la meta y te considera como que ganaste"** — the win is declared while the
   META stripe is still visibly ahead of the car. Feels broken/fake.
3. **"Los mensajes de LO PASÉ son cualquiera, funcionan cuando quieren y mal"** — overtake
   messages fire at random moments (not when an actual pass happens) and spam when racing
   side-by-side.
4. **"El juego es muy básico… la jugabilidad es pésima, no cierra"** — beyond the bugs, the
   moment-to-moment feel (walls, contact, cornering) reads as cheap. Overall quality bar
   must go up: this phase is a *refactor for feel*, not a feature drop.

## Goal

After 3-B, the game must *cerrar*: racing contact feels physical (bump and slide, never
glue), the finish line is the finish line, race feedback (position, gaps, overtake events)
matches what the player sees on screen, and the track presentation stops feeling empty.

## Root architectural insight (drives the whole phase)

Complaints 2 and 3 (and the fake gap indicator) share one root cause: **all race progress is
derived from 4 discrete checkpoint circles with 200-220px radii**. Rank jumps when someone
enters a circle; the finish "line" is a circle you enter 200px early; gaps are guessed from
checkpoint counts. The load-bearing fix is a **continuous progress function** (arc-length
along ROAD_SPINE) that rank, gaps, overtake detection and finish ordering all read from.
Checkpoints remain only as anti-shortcut gates.

## Decisions taken (Claude's discretion, user can override)

- **Keep auto-acceleration** (no throttle button). The control scheme stays
  steer+brake+DRS; feel improvements come from grip/wall/collision physics, not new inputs.
- **Finish = segment crossing test** of the META stripe, not a radius.
- **Walls become slide-along surfaces** (speed scrub proportional to impact angle) instead
  of snap-back + flat 78% speed cut.
- **AI gets racecraft** (avoidance offset so it never parks on the player's nose) as part of
  the anti-stick work — collision sticking is half physics, half AI driving through you.
- Presentation upgrade (environment blocks, skid marks, wall sparks) goes in the final wave
  so the playability waves land first.

## Out of scope for 3-B

- Multiplayer physics changes beyond what the shared `updateCar()` gives for free.
- New game modes, championship, tracks (Release 3+).
- Sound redesign (only a wall-scrape SFX is added).
