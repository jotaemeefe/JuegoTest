# Plan 03b-01 Summary — Wave 1: Race-critical fixes

**Date:** 2026-07-05
**Status:** COMPLETE — 10/10 automated checks + natural-race regression, zero JS errors.

## What shipped (`game.js`)

- **`SPINE_CUMLEN` / `SPINE_TOTAL_LEN` / `FINISH_ARC`**: arc-length prefix table over
  ROAD_SPINE (circuit measures 5499px; the stripe sits at arc 300).
- **`trackProgress(car)`**: continuous progress = lapEff × circuit length + arc relative to
  the stripe. Handles the two seams: the grid starts *behind* the line (first crossing arms
  lap 1 via `car.startCrossed`, no lap counted → `lapEff = lap - 1` until then), and a car
  shoved backward over a credited stripe reads "just behind", not a lap ahead. Cached once
  per frame as `car.progress`.
- **`crossedFinish(car)`** (fixes "ganaste sin llegar a la meta"): segment-intersection of
  the car's movement (prev→current, captured in `updateCar`/`updateAI`) against the stripe
  at x=500 (±ROAD_HALF_W band), eastbound only. `checkCheckpoints()` rewritten around it;
  the old CP0 radius (which fired at x=300) is gone.
- **Gates**: `CPS[1..3].r` 200/220 → 100; CP2 moved from `[528,602]` to the apex exit
  `[575,598]` (it used to fire on the hairpin approach, 213px < 220).
- **Overtake engine** (fixes "LO PASÉ cualquiera"): rank by `car.progress`; a rank change
  must persist **600ms** to confirm, with a **3s per-direction cooldown**. Flash targets the
  actual car involved.
- **Real gaps**: HUD gap = Δprogress / max(playerSpeed, 100) seconds — replaces the
  checkpoint-count × 1.4s guess.
- **Consumers migrated off `cpScore`** (deleted): `carAhead` (DRS), damage-out winner
  fallback. Multiplayer: remote car's `startCrossed` armed by the same crossing test over
  its packet-to-packet segment in `onMsg`.

## Verification (headless Chromium, scripted)

| Check | Result |
|---|---|
| Win fires at the stripe: `doneAtX = 505` (old code: ~300) | PASS |
| CP2 silent on approach `[535,815]`, fires at apex exit `[575,598]` | PASS |
| 3s of side-by-side ±2px flip-flop → **0** overtake messages | PASS |
| One real pass → exactly **1** ¡LO PASÉ!, no repeat after cooldown | PASS |
| DRS available at 40px behind, not at 500px (progress-based carAhead) | PASS |
| Both cars arm `startCrossed` at race start, lap stays 0 | PASS |
| Natural 25s race: AI clears all shrunken gates + stripe (lap=1) | PASS |
| Page errors across all scenarios | 0 |

## Next

03b-02 — contact & wall physics (anti-stick tangential slide, wall grinding, lateral grip,
camera smoothing).
