# Phase 3-B Research — Root Cause Analysis

**Date:** 2026-07-05
**Method:** static analysis of `game.js` + geometry verification (computed distances against
`ROAD_SPINE`/`CPS` constants). All three user complaints reproduce from the code as written.

---

## BUG-3B-01 — Win declared before reaching the META (CONFIRMED)

**Symptom:** "no llegás a la meta y te considera como que ganaste."

**Root cause (`game.js:64` CPS, `game.js:868` checkCheckpoints):** the finish "line" is a
**circle** — `CPS[0] = {x:500, y:1500, r:200}` — and `checkCheckpoints()` counts the lap the
moment the car center enters it. Driving east along the main straight the circle is entered
at **x = 300**, while the visual META stripe is drawn at **x = 500**. The lap (and on lap 3,
`car.finished` → `winner`) registers **200px early ≈ 0.44s at top speed**, with the stripe
still clearly ahead on screen. The AI benefits from the same early trigger.

**Aggravator — checkpoint radii overlap the wrong track sections:**
- `CPS[2]` (Loews apex, r=220) is **213px** from hairpin-approach spine point `[535,815]` —
  the checkpoint fires on the *approach*, before the car has taken the hairpin at all.
- `CPS[1]` (Casino, r=200) is 173px from Mirabeau descent point `[790,940]` — fires late
  into the next section rather than at Casino.

**Fix direction:** finish = **segment-crossing test** (did the car's movement segment
prev→current cross the stripe segment `x=500, y∈[1420,1580]` heading east?). Checkpoint
radii reduced to ~`ROAD_HALF_W + 20` (≈100px) so they only trigger on their own passage.

---

## BUG-3B-02 — Collision sticking with the rival (CONFIRMED)

**Symptom:** "es muy frecuente que te trabes con el otro jugador."

**Root causes (`game.js:804` resolveCarCollision, `game.js:949` wall snap):**

1. **No tangential escape.** Resolution reduces each car's *scalar* speed (restitution 0.65)
   along the contact normal but never deflects headings or adds lateral separation velocity.
   Both cars drive the same racing line (AI follows the spine; the player drives the spine),
   so contact is head-to-tail on the same axis; with `AUTO_ACCEL=400` re-closing the gap
   every frame, the player rams → loses speed → re-accelerates → rams, indefinitely. That
   *is* the "trabado": a stable ram-loop, not an overlap bug.
2. **Double separation.** Each car is displaced by the FULL overlap (`overlap * 1.02` each,
   ≈2× total) → visible position pops that read as jank.
3. **Wall double-penalty.** If the separation pushes a car past the track edge,
   `updateCar()`'s wall snap fires and cuts speed a further **78%** (`speed *= 0.22`). A
   side-by-side brush near a wall ≈ full stop.
4. **AI has no awareness of the player.** `updateAI()` steers at waypoints only; when the
   player is on its line the AI drives *through* them, feeding the ram-loop from the other
   side.

**Fix direction:** 50/50 split separation; impulse with a tangential component so cars slide
around each other (arcade bump-and-run); collision-induced wall contact scrubs speed
proportionally to impact angle instead of ×0.22; AI lateral avoidance offset when within
~90px of another car.

---

## BUG-3B-03 — Overtake messages fire "cuando quieren" (CONFIRMED)

**Symptom:** ¡LO PASÉ! / ¡TE PASARON! appear at moments where no pass happened, and spam
during side-by-side racing.

**Root cause (`game.js:1020` updateHUD):** rank is computed from `cpScore` — a **discrete**
value that jumps only when a car enters a checkpoint circle — with a per-frame euclidean
`distToCP` tiebreak:

- When the rival enters a checkpoint circle first, its score jumps +1 and the rank flips →
  **"¡TE PASARON!" fires at the checkpoint boundary**, even if it had been physically ahead
  for ten seconds (and vice-versa for "¡LO PASÉ!"). Messages correlate with checkpoint
  crossings, not with passes.
- With equal scores, the `distToCP` tiebreak **flip-flops every frame** when the cars run
  side-by-side → alternating message spam. There is no hysteresis and no cooldown.

**Fix direction:** derive rank from the continuous progress metric (below); fire an overtake
event only when the progress ordering has been stable for ≥0.6s, with a ≥3s per-direction
cooldown.

---

## Load-bearing refactor — continuous track progress

BUG-01 ordering, BUG-03 events, and the **fake gap indicator** (`updateHUD` scales
checkpoint-count differences by a magic `1.4s`) all need the same primitive:

```
trackProgress(car) = car.lap * SPINE_LENGTH + arcLengthAlongSpine(nearest point to car)
```

`nearestSpinePoint()` (`game.js:787`) already finds the nearest segment — it needs to also
return the segment index + `t`, and a prefix-sum table of segment lengths makes arc-length
O(1) on top of it. Rank = sort by `trackProgress`; gap = `Δprogress / playerSpeed` (real
seconds); overtakes = sign changes of `Δprogress` with hysteresis; finish ordering =
progress at the crossing frame. Checkpoints stay solely as anti-shortcut gates for lap
validity.

**Edge case to handle:** arc-length wraps at the finish line — compare progress using lap ×
spine-length so the wrap is monotonic (the lap increments exactly at the stripe crossing).

---

## Feel audit (complaint 4 — "muy básico, no cierra")

| Aspect | Today | Why it reads cheap |
|---|---|---|
| Walls | Snap-back to 88% half-width + flat ×0.22 speed | Any graze = near-stop; no slide, no glance |
| Cornering | Heading-only rotation, zero lateral velocity | Car pivots like a token, no weight/drift |
| Camera | Rigid lock on car, zero smoothing/lookahead | Every twitch of input shakes the whole world |
| Contact | Scalar speed cuts | No shove, no counter-steer moment |
| Track | Tarmac + kerbs on flat grey | Empty world, no Monaco identity |
| AI | Line-follower, blind to opponent | No battles, just a moving obstacle |

These are the Wave 2–4 targets; exact tuning values are implementation-time discretion.
