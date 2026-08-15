# Plan 03b-04 Research — Current-build bug review + visual audit

**Date:** 2026-07-05
**Method:** instrumented headless-Chromium runs against main (post 03b-03) + code analysis.
**Trigger:** user playtest — "el DRS no aparece nunca" and "la pista visualmente es
horrible, parece un juego de 1980".

---

## BUG-3B-04 — DRS never appears (CONFIRMED, measured)

**Symptom:** the player never sees "DRS DISPONIBLE" in normal racing.

**Measurement:** simulated a competitive chase pinning the player **150px behind** the AI
(median real gap 0.45s — genuinely glued) for 30s / 1774 frames:
`drsAvailableFor(cars[0])` fired on **0.0% of frames**.

**Root cause (`drsAvailableFor`, game.js):** availability requires euclidean distance to
the car ahead `< DRS_RANGE = 60px`. A car is ~44px long and collision contact happens at
36px — the "window" is a 24px sliver you can only occupy while ramming. Real-F1 DRS uses a
**1.0s time gap** at a detection point; 60px at race speed is 0.13s — ~8× too strict.
Compounding factors: as P1 (common case early) there is no car ahead so DRS can never
appear; and since Wave 3 the AI actively swerves/lifts, making sub-60px following even
rarer.

**Fix direction (F1-authentic, fits the 1v1):**
- Availability = **progress time-gap to the car ahead ≤ 1.2s** (Δprogress / speed), not
  euclidean px.
- **DRS zones** like real Monaco: the main straight (y≈1500 band) and the return straight
  (y≈1750 band). Predictable cadence — every lap you're close, you get the tool.
- One use per lap (existing `drsLap`), same 3s / 1.28× boost, same inputs. AI plays by the
  same rules.
- Visual: painted DRS zone markers on the tarmac + existing HUD indicator/button.

## BUG-3B-05 — Off-track damage/vignette is dead code (minor, code health)

Since the 2c walls, `updateCar` snaps a car back on-track within the same frame, so the
loop's `!onTrk` branch (off-track damage, vignette at 0.28, shake) can never fire. Wall
feedback now lives in `applyWallContact` (W2). Action: delete the dead branch and the
vignette call, or repoint the vignette to wall-grind feedback. Low risk either way.

## Visual audit — "parece un juego de 1980"

Current world rendering is: flat grey void (`#3a3a4a`), one dark tarmac stroke, red/white
kerb dashes, dashed yellow centerline, faint direction arrows, a 5px META stripe. There is
literally **nothing else in the world**. The Phase-2 environment blocks were removed in
02b-02 ("jugabilidad primero") and never returned; Monaco has zero identity.

What "not 1980" means within the repo constraints (Canvas 2D, zero image assets):

| Element | Today | Target |
|---|---|---|
| World | flat grey infinite void | Mediterranean: sea gradient + harbour SE, city blocks, parks, beach line |
| Tarmac | 1 flat stroke | layered strokes (edge shadow, body, inner highlight) = depth |
| Barriers | none visible | continuous armco line outside the kerbs |
| Landmarks | none | harbour boats, Loews hotel arc, Casino block, tunnel roof with entry shadows |
| Track paint | center dashes | + DRS zone chevrons, start grid slots, sector kerb accents |
| Dynamics | nothing | skid marks (drift/brake/grind), wall sparks, collision dust |
| Cars | flat rects | wheels, halo, nose cone — 5 shapes more per car |

**Performance architecture:** all static environment renders once into an **offscreen
canvas (1600×2000)** at race start; the per-frame cost becomes one `drawImage` — cheaper
than today's multi-stroke redraw, leaving budget for particles/marks.

## Additional improvement proposals (aligned with the phase goal)

Candidates surfaced during W3 testing, for user selection:

1. **Slipstream (rebufo)**: within ~1.5s directly behind on straights → +5% top speed.
   Complements DRS; makes catching feasible against equal-pace rivals.
2. **Battle feedback**: rival-proximity glow on the gap HUD + ▲/▼ closing-trend arrow —
   surfaces the W3 racecraft (blocks, mistakes) that is currently invisible to the player.
3. **AI mistake telegraph**: brief smoke puff + skid mark when the AI commits a pressure
   mistake, so the overtaking window is *visible*, not statistical.
4. **Minimap upgrade**: rival dot in team color + DRS zone ticks (cheap, orientation).

---

## Addendum (post user direction): "ni simulador ni arcade" — identity findings

**User verdict on the proposals:** rejected all four — "estás proponiendo mejoras como si
fuera un simulador real y no un juego de arcade. La IA es muy tonta, se choca sola, es muy
fácil todo, tanto que aburre… nada que evolucione el juego."

### Measured: the best rival is clean when alone, but slow — and dirty in traffic

Verstappen (skill 0.96) driving alone for 45s: **0.0% wall-contact frames**, lap 15.4s,
avg 330 px/s, min 241. Conclusions:

1. **"Se choca sola" happens in traffic, not alone.** Suspects (code-level): the W3
   pressure-mistake random steering flinch (±0.25 rad at speed next to a wall = crash),
   and the avoidance swerve firing at the start grid / near walls with no track-edge
   awareness.
2. **"Es muy fácil" is quantified:** the hardest rival gives away ~2s/lap to a competent
   player (15.4s vs ~13.6s theoretical). Lower tiers are far slower. The leader ease-off
   (rubber ×0.96) makes it worse.
3. **DRS-as-simulation is the wrong tool for this game** — even fixed, it is an invisible
   rule. An arcade racer needs a visible, earnable, always-relevant mechanic.

### Direction for Wave 4 (arcade pivot)
Commit to ARCADE identity: NITRO meter (earned by clean/drift/slipstream driving, spent
on demand) replaces DRS entirely; the rival becomes fast and clean (no random crashes,
no leader-nerf, corner pace up, traffic-aware steering guards); Monaco gets the full
visual layer. Difficulty ladder: MEDIO stays gentle, ÉLITE outpaces the player on raw
speed so nitro + racecraft decide it.
