# Plan 03b-01 — Wave 1: Race-critical fixes (progress refactor + finish + overtakes)

**Requirements:** R3B-01 (real finish line), R3B-02 (continuous progress), R3B-04 (honest
overtake events)
**Files:** `game.js`
**Blocking:** everything else — Wave 2+ builds on `trackProgress()`.

## Tasks

### T1 — `trackProgress()` primitive
- Build `SPINE_CUMLEN[]` prefix-sum of ROAD_SPINE segment lengths at load (module constant).
- Extend `nearestSpinePoint(x,y)` to also return `{segIdx, t}`.
- `trackProgress(car)` = `car.lap * SPINE_TOTAL_LEN + SPINE_CUMLEN[segIdx] + t * segLen`.
- Handle wrap: progress is monotonic because `car.lap` increments exactly at the stripe
  crossing (T2). Near the stripe, clamp arc-length jitter: if arc-length is in the last 10%
  of the spine but `nextCP === 1` (lap already counted), treat as lap start (progress 0).

### T2 — Real finish line (fixes "ganaste sin llegar")
- Store `car.prevX/prevY` before the move in `updateCar()`/`updateAI()`.
- `crossedFinish(car)`: segment intersection between (prev→current) and the stripe
  `x=500, y ∈ [1500-ROAD_HALF_W, 1500+ROAD_HALF_W]`, requiring eastward heading
  (`cos(angle) > 0`) — replaces the CP0 radius check inside `checkCheckpoints()`.
- Lap counts only if all gates were hit (`nextCP === 0` as today).
- Shrink gate radii: `CPS[1..3].r` → 100 (they are now anti-shortcut gates only). Move
  CP2 to the true apex exit `[575,598]` so it cannot fire from the approach.

### T3 — Rank / gap / overtakes from progress
- `updateHUD()`: rank by `trackProgress` (finished cars keep `Infinity`).
- Gap indicator: `Δprogress / max(playerSpeed, 60)` seconds, shown as before.
- Overtake event engine: track `rankStableSince`; fire ¡LO PASÉ!/¡TE PASARON! (+flash,
  +sound) only when the new ordering has persisted **0.6s**, with a **3s cooldown** per
  direction. Flash only the car actually involved.
- Delete the `cpScore`-based rank path (keep `cpScore` only if the damage-win fallback needs
  it — otherwise replace that too with `trackProgress`).

## Verification (Playwright)
1. Drive the main straight on the final lap: the win overlay must not appear while
   `cars[0].x < 500`. Assert via `page.evaluate` sampling: `phase==='done'` implies
   crossing happened (prev.x < 500 ≤ x).
2. Teleport cars side-by-side, same progress ±5px, run 3s: **zero** overtake texts fired.
3. Script a real pass (boost player past AI): exactly one ¡LO PASÉ! within 1s of the
   progress ordering flip.
4. Gate check: teleport onto the hairpin approach `[535,815]` with `nextCP=2` — CP2 must NOT
   fire; at apex exit `[575,598]` it must.
