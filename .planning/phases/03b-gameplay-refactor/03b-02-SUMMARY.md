# Plan 03b-02 Summary — Wave 2: Contact & wall physics

**Date:** 2026-07-05
**Status:** COMPLETE — 10/10 automated checks (physics + mobile layout), zero JS errors.

## What shipped (`game.js`, `style.css`, `CLAUDE.md`)

### Collision anti-stick (fixes "te trabás con el otro jugador")
`resolveCarCollision()` rewritten as arcade bump-and-run:
- 50/50 separation (was full overlap displacement on EACH car — visible pops),
- restitution on the closing component only (0.45),
- **tangential stagger** (up to 8px, each car toward the side it already leans to) and
  **heading nudges** (0.08–0.22 rad, accumulating over sustained contact) so the
  AUTO_ACCEL ram-loop can never re-form — cars rotate around each other,
- returns `{impact, aVn, bVn}`; grazes (closing < 60 px/s) cost no damage and make no
  noise, so wheel-to-wheel racing is viable. Damage/sound/shake block deduplicated.

### Wall grinding (kills the "family game" walls)
`applyWallContact()` replaces snap+`speed *= 0.22`:
- shallow contact **grinds**: heading peels toward the wall tangent (≤2.4 rad/s), speed
  scrubs at 0.45/s — verified 90%+ of speed kept after 1s at 20°,
- square hit (> ~57° into the wall) is a **crash**: one-time 65% speed cut on first
  contact frame + `triggerShake()` + 1.5 damage (player).

### Micro-drift (R3B-06)
`moveCar()` (shared player/AI): velocity direction `car.velAngle` lags heading at
`GRIP_ON=34` / `GRIP_OFF=10` rad/s (≈7° lag at full steering) with a small drift scrub.
Controls unchanged; the car now has weight through corners.

### Camera smoothing (W2-T4)
`updateCamera()`: `camX/camY` lerp (7/s) toward the car plus speed lookahead (≤70px along
`velAngle`). All three render phases use the smoothed camera; it freezes on 'done'.
CLAUDE.md corrected: the camera is translate-only north-up (the "rotating camera" text was
stale — rotation was removed in 719ae97).

### Mobile layout fix (user report: "se oculta parte de la pista y los botones")
`style.css`: on small viewports (`max-width: 520px` or `max-height: 780px`) the game
screen becomes a `100dvh` column — HUD and touch controls pinned, canvas letterboxed in
the remaining space (`max-width/max-height: 100%` against its 480×640 backing store).
Verified at 375×667 and 320×568: HUD, full canvas and buttons all inside the viewport,
zero page scroll.

## Verification (headless Chromium)

| Check | Result |
|---|---|
| Ram parked rival 5s → player slides around and passes (progress 6558 > 5897) | PASS |
| Never pinned: min speed in seconds 2–5 of constant ramming = 47 px/s > 40 | PASS |
| 20° wall contact for 1s → 361/400 px/s kept, car advanced 365px along wall | PASS |
| Square wall hit → damage registered (7.6), crash penalty applied | PASS |
| Smoothed camera stays within lookahead of the car | PASS |
| Natural 25s race: AI with drift + wall physics completes a lap | PASS |
| Mobile 375×667 and 320×568: HUD + canvas + buttons all visible, no scroll | PASS |
| Page errors | 0 |

## Next

03b-03 — AI racecraft (avoidance, defensive/aggressive moves, rubber-band, pressure
mistakes). Note: W2's collision nudges already reduce AI-parks-on-your-nose; 03b-03 makes
the AI actively avoid.
