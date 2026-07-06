# Plan 03b-04 — Wave 4: ARCADE PIVOT — nitro, a rival worth racing, and a Monaco worth seeing

**Rewritten (2nd time):** 2026-07-05 after the user rejected the sim-flavored proposals.
This wave commits the game to an ARCADE identity. Supersedes both prior 03b-04 drafts;
research: 03b-04-RESEARCH.md (incl. addendum with measurements).

**User direction (verbatim intent):** "No es ni un simulador ni un arcade… la IA es muy
tonta, se choca sola, es muy fácil todo, tanto que aburre… nada que evolucione el juego."
Plus: "el DRS no aparece nunca" and "la pista parece un juego de 1980".

## Design decision — the arcade loop

**Drive clean & drift → earn NITRO → spend it to attack/defend a fast, clean, relentless
rival.** DRS (invisible sim rule, measured 0% availability) is REMOVED, replaced by a
nitro meter that is always on screen, always earnable, always tactical.

## Tasks

### T1 — NITRO system (replaces DRS wholesale)
- `car.nitro` 0–100. Earn: +8/s driving clean on track; +25/s while drifting
  (|velAngle−angle| > 0.06); +15/s in slipstream (≤2s behind the rival). Nothing while
  wall-grinding.
- Spend: HOLD ↑ / W / Shift or the on-screen button — boost while held and meter > 0
  (needs ≥25 to ignite), ×1.35 top speed, drain 40/s. Flames + speed lines while active.
- HUD: nitro bar on canvas (bottom-left) + button shows fill state, pulses when ready.
- AI uses the same meter (earns clean/drift) and fires it to attack when close behind
  the player or to respond after being passed.
- Delete: DRS_RANGE/DRS_DURATION/DRS_BOOST, drsAvailableFor, activateDRS, drsLap,
  DRS HUD text. Rename button to NITRO.

### T2 — A rival worth racing (fix "tonta / se choca sola / fácil")
- **No random crashes**: pressure mistakes become a LIFT + wide line for ~1s (visible,
  exploitable) — never a steering flinch at speed (that was the wall-crash source).
- **Traffic sanity**: avoidance swerve suppressed for the first 1.5s after GO (grid
  launch) and scaled down within 25px of a track edge — the AI never swerves into walls.
- **No leader-nerf**: rubber ×0.96 removed. Catch-up boost (≤1.05, capped) stays.
- **Pace up**: global AI_PACE 1.06 multiplier + cornering cap relaxed (0.42 → 0.30
  brake-strength speed cut). Target: ÉLITE laps ≤ ~14s (was 15.4) — at or above player
  raw pace, beatable via nitro + racecraft. MEDIO tier stays gentle (ladder preserved).

### T3 — Monaco visual layer (fix "1980")
- `buildEnvCanvas()` offscreen 1600×2000, rendered once per race; per-frame world =
  one drawImage. Contents: Mediterranean sea gradient + harbour with boats & pier (SE),
  city blocks with drop shadows (Casino/Mirabeau + waterfront), parks, Loews hotel arc,
  armco barriers, layered tarmac (edge shadow → body → inner highlight), kerbs,
  centerline, arrows, start grid slots, META. Tunnel roof overlay (over cars) per frame.
- **Dynamics**: skid marks ring buffer (drift/brake/grind, fade with age, under cars);
  spark particles on hard wall hits & impacts; boost flames behind boosting cars;
  speed lines while boosting; wall-scrape SFX gated by `wallContact`.
- Car sprite: wheels ×4, halo, nose taper.
- Delete dead off-track damage/vignette branch (BUG-3B-05).

## Verification
1. Nitro loop: meter fills while driving (>0 after 3s), drift fills faster, boost drains
   and raises top speed ×1.35, button reflects state. AI fires nitro when chasing.
2. Rival quality: Verstappen alone — lap ≤ 14.2s, wall frames 0%; in traffic (parked
   player on line) — passes with ≤1 hard contact and **0 wall-contact frames** during
   the maneuver; race start — no wall contact in the first 3s.
3. Visual: screenshot sweep (straight/Casino/Loews/tunnel/harbour) vs old flat-grey
   baseline; skid marks after a drift; sparks on a crash.
4. Perf: p95 frame delta < 20ms over 25s with env layer + particles.
5. Regressions: W1/W2/W3 suites green (W3 rubber expectation updated: ahead → 1.0).
