# Plan 03b-04 — Wave 4: Presentation ("que no parezca de family")

**Requirements:** R3B-09 (track identity), R3B-10 (feedback effects)
**Files:** `game.js`, `style.css` (minor)
**Depends on:** 03b-02 (wall/drift hooks emit the events these effects visualize).

## Tasks

### T1 — Monaco environment blocks (return, at 3.5x scale)
- Reintroduce the Phase-2 idea at the new world scale: harbour water + boats SE of Tabac,
  building blocks lining Casino/Mirabeau, tunnel roof overlay (semi-transparent arch over
  TUNNEL_ZONE that darkens cars — hook `car.inTunnel` already exists), grandstand + armco
  detail along the main straight, trees NW. Flat color blocks + simple shapes only (repo
  constraint: no image assets).
- Draw order: under the kerbs/tarmac stroke so nothing occludes the racing surface.

### T2 — Dynamic marks & particles
- **Skid marks**: while drifting/braking hard, push segments into a capped ring buffer
  (~400), drawn as dark strokes on the tarmac; fades oldest-first.
- **Wall sparks**: burst of 6-10 yellow/white particles on hard wall hits (hook from
  03b-02 T2).
- **Contact dust**: small grey puff on car-car contact > 60 px/s.
- One shared particle pool (~150), integer positions, zero allocations per frame.

### T3 — Sound hooks
- Wall scrape: reuse the brake-noise node pattern (bandpass ~2kHz) gated by wall-contact
  frames.
- Contact thud already exists (`playCollisionSound`) — scale gain by impact speed.

### T4 — HUD micro-polish
- Gap readout gets ▲/▼ trend arrow (closing/opening, from `trackProgress` deltas).
- Final classification on the results screen: margin in seconds (uses real gap at flag).

## Verification (Playwright)
1. Screenshot sweep: main straight, Casino, tunnel (roof visible + car darkened), harbour.
2. Drift through Loews → skid marks visible in the following frame's screenshot.
3. Wall grind → sparks + scrape audible (assert node created); 60fps maintained
   (`requestAnimationFrame` delta sampling < 20ms p95 on the CI box).
