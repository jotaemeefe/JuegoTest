# Plan 03b-03 Summary — Wave 3: AI racecraft

**Date:** 2026-07-05
**Status:** COMPLETE — 6/6 behavioral checks + W1/W2 regression suites green, zero JS errors.

## What shipped (`game.js`)

### Opponent awareness / avoidance (W3-T1)
- A car ahead inside a 160px / ±44° cone bends the AI's steering target around it via an
  **angular bias** (±0.6 rad max) — unlike a waypoint offset, its strength doesn't dilute
  with waypoint distance.
- The swerve side is **sticky** (`car.avoidActive`/`avoidSide`): held until the obstacle is
  genuinely *behind* (release cone 0.15), because re-picking per frame let collision nudges
  cancel the swerve, and releasing while merely alongside let the waypoint pull the AI back
  into the opponent's side.
- **Boxed detection**: within 110px directly behind something much slower, the AI lifts to
  `max(120, obstacleSpeed + 60)` and uses the swerve to pass instead of plowing in.

### Collision escape-side fix (amends W2)
`resolveCarCollision` now staggers/nudges **each car toward its own lean side** (`aSide`/
`bSide` from each heading). The W2 version pushed `b` opposite to `a`'s side — which
cancelled an AI's mid-swerve escape and re-formed the glue, and bulldozed a slow car
forward like a shopping cart (the "treadmill"). Found via frame-by-frame tracing.

### Defensive one-move block (W3-T1)
A `defensive` rival with the player closing within 80px from behind covers the player's
side once: 14px lane shift for 2s, then a 6s cooldown (F1 one-move rule). Aggressive and
consistent rivals hold their line.

### Rubber-band (W3-T2)
From the continuous-progress gap: leading the player by >4s → ×0.96 top speed; trailing by
>4s → boost capped at an effective skill of 1.02. Exposed as `car.rubber` for testing.

### Pressure mistakes (W3-T3)
Player within 1s behind for 3s+ → mistake chance 0.25/s (×2 for aggressive): steering
flinch + 15% lift — a real overtaking window. `car.pressureTime`/`car.mistakeCount`.

## Verification (headless Chromium)

| Check | Result |
|---|---|
| AI drives around a player parked on its line and continues (Δprogress +530) | PASS |
| At most 1 hard contact while passing (was: glued with 4-5 hits) | PASS |
| Defensive rival triggers the one-move block when tailed | PASS |
| Rubber 0.96 when >4s ahead, 1.05 when >4s behind | PASS |
| ≥1 pressure mistake within 10s of sustained 1s-gap pressure | PASS |
| Natural 25s race still laps | PASS |
| W1 suite (finish/overtakes/gates) 10/10 · W2 suite (ram/walls/mobile) 10/10 | PASS |

## Next

03b-04 — presentation: Monaco environment blocks, skid marks, wall sparks, scrape SFX,
HUD micro-polish.
