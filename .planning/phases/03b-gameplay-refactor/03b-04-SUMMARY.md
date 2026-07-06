# Plan 03b-04 Summary — Wave 4: ARCADE PIVOT

**Date:** 2026-07-05
**Status:** COMPLETE — 10/10 W4 checks + W1 (10/10), W2 (10/10), W3 (6/6) regressions, zero JS errors.

## The foundational discovery

While verifying the nitro boost, the test exposed that **the game's speed caps were never
reachable**: the old model (constant accel 400 − proportional friction 1.1×v) has a terminal
velocity of **364 px/s**, below `MAX_SPD_ON=450`. Every cap-based mechanic — MAX_SPD, DRS's
1.28×, the W3 rubber-band, the new AI_PACE — had been *decorative*. This is why the game felt
slow, flat and easy: everyone converged to the same 364 px/s.

**Fix:** arcade approach model — `speed += (cap − speed) × ACCEL_RATE(2.0) × dt`. Caps and
boosts are now real. Verified: player 450 base / 557+ boosting; Verstappen laps went
15.4s → **11.2s**.

## What shipped

### NITRO (replaces DRS wholesale — the arcade loop)
Earn by driving: +8/s clean, +25/s drifting, +15/s slipstreaming (≤2s behind); nothing while
grinding. Spend by HOLDING ↑/W/Shift or the on-screen button (≥25 ignites, 40/s drain,
×1.35 top speed) with flames, speed lines, ignition whoosh. Meter always visible (canvas bar
+ the button itself is the meter). The AI earns/spends by the same rules, attacks in battle
range, and never boosts while boxed. All DRS code deleted.

### A rival worth racing ("tonta / se choca sola / fácil")
- Pace: AI_PACE 1.06 + cornering cap 0.42→0.30 + real caps → ÉLITE ~11.5s laps, genuinely
  faster than the player's raw pace; MEDIO tier still gentle.
- **Predictive avoidance by time-to-contact** (replaces fixed-range): arriving hot swerves
  and lifts much earlier; same-pace chases barely react (slipstream preserved). Boxed →
  lift toward the obstacle's pace + real traffic braking after nitro runs.
- Traffic verification: passes a car parked ON its racing line with **0 contacts and 0 wall
  frames** (was: glued with 4-5 hits in W3's first attempt, 2 after fixes).
- Grid-launch swerve gate scoped to the actual grid zone (time+progress) — the time-only
  gate blinded the AI anywhere on track for 1.5s.
- Mistakes are a lift + wide line (visible window), never a steering flinch (the flinch was
  the wall-crash source). No leader-nerf; catch-up only.

### Monaco visual layer ("parece de 1980")
`buildEnvCanvas()` — offscreen 1600×2000 static world rendered once: sea gradients +
harbour with yachts/pier/quay, hillside with trees, city blocks with shadows + lit windows,
skyline, gardens median, armco barriers, 3-layer tarmac, kerbs, grid slots, META, tunnel
entry shadows. Per frame: one drawImage + dynamics — **skid marks** (drift/brake/grind,
fading ring buffer), **sparks** (crashes/impacts), **tunnel roof overlay** (dims cars
beneath), **nitro flames**, wall-scrape SFX. Car sprites got wheels + halo. Dead off-track
damage/vignette branch removed (BUG-3B-05). p95 frame delta 17.6ms.

## Verification
W4 suite 10/10 (nitro loop, ÉLITE pace ≤14.4s → 11.2s, clean launch, clean traffic pass,
env layer, skids, perf) + screenshot sweep (straight/casino/tunnel/harbour) + full W1/W2/W3
regression. Zero page errors throughout.

## Phase 3b status: ALL 4 WAVES COMPLETE.
