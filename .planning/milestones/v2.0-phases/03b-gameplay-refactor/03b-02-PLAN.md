# Plan 03b-02 — Wave 2: Contact & wall physics ("nunca más trabado")

**Requirements:** R3B-03 (anti-stick collisions), R3B-05 (wall slide), R3B-06 (lateral grip)
**Files:** `game.js`
**Depends on:** 03b-01 (uses `nearestSpinePoint` extensions).

## Tasks

### T1 — Collision refactor (fixes "te trabás")
In `resolveCarCollision(a, b)`:
- **50/50 separation**: displace each car by `overlap * 0.51` (was full overlap each).
- **Tangential slide impulse**: decompose each car's velocity into normal + tangent
  components at the contact. Kill/reflect only the normal component (restitution ~0.45);
  preserve the tangential component and add a small tangential shove (±40 px/s, signed by
  which side of the contact normal each car is on) so cars *rotate around* each other
  instead of stopping nose-to-tail.
- **Heading nudge**: rotate each car's `angle` by up to ±0.15 rad away from the contact
  normal — breaks the stable ram-loop that AUTO_ACCEL otherwise re-creates every frame.
- Cap damage events: contact damage only when normal approach speed > 60 px/s (grazes are
  free — racing contact must be viable).

### T2 — Wall slide (fixes "family game" walls)
Replace the snap+`speed *= 0.22` block in `updateCar()` (and AI equivalent):
- On boundary contact, decompose velocity against the track tangent from
  `nearestSpinePoint`: keep the tangential component (×0.94 scrub per contact frame),
  zero the outward normal component, and set position on the boundary (88% half-width).
- Hard hits (normal component > 45% of speed) additionally scrub ×0.65, spark VFX +
  scrape SFX hook (Wave 4 fills the actual effects), small `triggerShake()`.
- Net effect: glancing the wall = you grind along it losing a little speed; head-on = real
  crash. Off-track damage logic unchanged.

### T3 — Lateral grip / micro-drift
- Add `car.vx/vy` velocity vector: heading pulls velocity toward it at `GRIP` rate
  (~8/s on track, ~3.5/s off) instead of velocity being instantaneously aligned.
- At high steering rates the rear steps out a few degrees (visual drift) and scrubs ~4%
  speed — cornering has weight without changing controls.
- Keep `car.speed` as the magnitude for all existing consumers (HUD, engine pitch, net).
- Multiplayer: `pos` message unchanged (x,y,angle,speed) — remote car needs no new fields.

### T4 — Camera smoothing
- Camera position lerps toward the car (k≈12/s) and looks ahead `min(60, speed*0.12)` px
  along the heading; camera angle lerps (k≈10/s) toward `-car.angle`.
- Kills the twitchy 1:1 world-shake; the car breathes inside the frame.

## Verification (Playwright)
1. Park the AI mid-straight (freeze `updateAI`), ram it head-on for 5s: player must end up
   *past* the AI (slid around), never pinned >1.5s at speed <50.
2. Approach a wall at 20°: speed after 1s of contact ≥ 60% of entry speed (grind, not stop).
3. Head-on into the Sainte-Dévote wall: speed cut hard + shake fires.
4. Zero console errors; multiplayer smoke test (two tabs) still exchanges positions.
