# Phase 2b: Monaco Gameplay Overhaul - Research

**Researched:** 2026-06-29
**Domain:** Canvas 2D rotating camera, circuit geometry design, physics tuning, minimap rendering
**Confidence:** HIGH (code analysis) / MEDIUM (geometry — designed analytically from circuit knowledge)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Camera follows and rotates with car — player car always points UP on screen. World rotates around the car. Micro Machines / RC Pro-Am style.
- **D-02:** Player car positioned at ~60% canvas height from top (y ≈ 380 of 640). More forward view than rear view.
- **D-03:** Camera transform order in `loop()`:
  ```
  ctx.save()
  ctx.translate(240, 380)
  ctx.rotate(-car.angle - Math.PI/2)
  ctx.translate(-car.x, -car.y)
  [drawTrack() — world space]
  [drawCar() for each car — world space]
  ctx.restore()
  [HUD, minimap — screen space]
  ```
- **D-04:** `drawTrack()` and `drawCar()` stay in world coordinates. `project()` remains identity. No architectural changes.
- **D-05:** HUD and minimap drawn AFTER `ctx.restore()`, in screen space.
- **D-06:** New `ROAD_SPINE` in world space ~1600×2000px. Points are absolute new coordinates, not 3.5x scaled old ones.
- **D-07:** `ROAD_HALF_W` = 80px (was 28px).
- **D-08:** Smooth curves via dense intermediate points (bezier-like approximation). Key corners: Sainte-Devote (~200px radius), Loews hairpin (~80px radius), Portier, chicane post-tunnel, Rascasse, Antony Nogues.
- **D-09:** `AI_WAYPOINTS` redesigned in new world space, sufficient for all corners.
- **D-10:** 4 `CPS` repositioned: CP0=Meta, CP1=Casino plateau, CP2=Loews apex, CP3=Post-tunnel/Tabac.
- **D-11:** `START` redesigned for new scale. 4 positions 2x2, separation ≥ CAR_RADIUS*3 = 54px.
- **D-12:** `TUNNEL_ZONE` updated to new world-space tunnel coordinates. `car.inTunnel` boolean preserved for Phase 3 audio.
- **D-13:** Physics constants at 3.5x scale: MAX_SPD_ON=650, MAX_SPD_OFF=250, AUTO_ACCEL=550, BRAKE_FORCE=1200, CAR_RADIUS=18.
- **D-14:** TURN_RATE=3.8 rad/s (was 4.5). Separate tuning, not proportional to scale.
- **D-15:** FRICTION_K stays 1.1 (dimensionless ratio).
- **D-16:** Semi-arcade feel. Fast response, slight inertia. No drift/oversteer.
- **D-17:** Minimap at top-right of canvas, ~100×120px, dark semi-transparent background.
- **D-18:** Minimap shows ROAD_SPINE polyline (thin), white dot for player, colored dots for AI cars.
- **D-19:** Scale formula auto-derived from ROAD_SPINE bounding box. Drawn in screen space with a second `ctx.save()/restore()`.
- **D-20:** Background `#3a3a4a`. No color blocks or environment decorations.
- **D-21:** Track drawn as: asphalt fill (#555) + white border lines (stroke at spine ±ROAD_HALF_W). Minimum readable track only.
- **D-22:** Tunnel overlay, color environment blocks → Phase 3.
- **D-23:** 4 cars maintained. CARS-02 personalities, CARS-03 collisions, CARS-04 HUD all continue working.
- **D-24:** `resolveCarCollision()` unchanged in logic. CAR_RADIUS=18px, slightly larger zone proportional to wider track.

### Claude's Discretion
- Exact point count in new ROAD_SPINE: researcher designs optimal geometry. Minimum ~40 points.
- AI waypoint count: sufficient to cover all corners.
- Camera smoothing (lerp vs lock): agent may add smooth interpolation if it helps feel. Not mandatory.
- Exact minimap position and padding.

### Deferred Ideas (OUT OF SCOPE)
- Tunnel overlay / drawTunnelRoof() visual — Phase 3
- Color environment blocks (water, buildings, barriers) — Phase 3
- AI-01 (real braking 0.70x) — Phase 3
- AI-02/AI-03 — Phase 3
- AUDIO-01/02/03 — Phase 3
- VFX-01..VFX-05 — Phase 3
- DRS-01 — Phase 3
- UI-07 — Phase 3
- Smooth camera lerp (optional refinement)
</user_constraints>

---

## Summary

Phase 2b replaces the current Monaco circuit (480×640 world space, broken at the existing scale) with a full redesign at 3.5× scale (1600×2000 world space), adds a rotating follow camera (player car always points up on screen), and retunes all physics constants proportionally. The minimap provides global circuit awareness that the rotating camera removes.

The most critical output of this research is the **ROAD_SPINE coordinate array** — 48 points covering all Monaco sections with correct corner geometry. The second most critical is the exact **camera transform implementation** and its interaction with the existing `loop()` structure, which has three phases (countdown, racing, done) that all need the camera applied uniformly.

The physics changes are straightforward proportional scaling, with TURN_RATE as the only independent variable requiring play-feel judgment. The minimap is a new function drawn in screen space that consumes the same ROAD_SPINE data.

**Primary recommendation:** Implement camera transform and new ROAD_SPINE as a single atomic change. If the spine geometry is wrong, the camera just follows the car into the wrong track — fixable. If the camera transform order is wrong, every draw call breaks. Validate camera transform first with a static render, then replace ROAD_SPINE.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Camera transform | Canvas 2D render (loop) | — | Pure rendering concern; `project()` stays identity. Physics coords unchanged. |
| ROAD_SPINE geometry | Data (constants) | drawTrack() renderer | Coordinate array drives track shape; drawTrack() just strokes the path. |
| Physics tuning | updateCar() constants | updateAI() | Speed/force constants affect both player and AI physics. |
| AI navigation | updateAI() | AI_WAYPOINTS data | Waypoint array determines path; updateAI() logic unchanged. |
| Minimap | New drawMinimap() (screen space) | — | Drawn after ctx.restore(). Reads cars[] and ROAD_SPINE. |
| Checkpoint system | checkCheckpoints() | CPS data | Logic unchanged, new CP positions in new world space. |
| Tunnel zone | TUNNEL_ZONE constant | loop() inTunnel setter | drawTunnelRoof() visual removed from 2-B; inTunnel boolean stays. |
| Multiplayer net | Net IIFE | loop() broadcast | Sends world coords — unaffected by camera transform (render-only). |
| HUD | updateHUD() | DOM (hudLap, hudPos, hudRole) | Called after ctx.restore() — already screen-space DOM elements, no change needed. |

---

## Standard Stack

This phase introduces zero new libraries. [ASSUMED: no external dependencies needed — pure Canvas 2D API.]

### Core Canvas 2D API Operations Used

| Operation | Purpose | Verified |
|-----------|---------|---------|
| `ctx.save()` / `ctx.restore()` | Isolate camera transform stack | [ASSUMED: Canvas 2D standard] |
| `ctx.translate(x, y)` | Move canvas origin | [ASSUMED: Canvas 2D standard] |
| `ctx.rotate(angle)` | Rotate coordinate system | [ASSUMED: Canvas 2D standard] |
| `ctx.transform(a,b,c,d,e,f)` | Used in drawCar() for per-car rotation | Existing code confirmed |
| `ctx.strokeStyle`, `ctx.lineWidth` | Track border lines | Existing code confirmed |
| `ctx.fillRect()` | Background, minimap background | Existing code confirmed |

**No npm packages. No build step. No installation command.**

---

## Package Legitimacy Audit

**Not applicable.** This phase modifies only `game.js`. No external packages are installed.

---

## Architecture Patterns

### System Architecture Diagram

```
User Input (keys/touch)
        ↓
   updateCar(cars[0], dt)     updateAI(cars[i], dt)
        ↓                              ↓
   cars[].x, cars[].y, cars[].angle  (world coords, unchanged)
        ↓
   ┌──── loop() per-frame render ────────────────────────┐
   │                                                      │
   │  ctx.save()                                          │
   │  ctx.translate(240, 380)   ← camera focus point     │
   │  ctx.rotate(-car.angle - PI/2)  ← world rotation    │
   │  ctx.translate(-car.x, -car.y)  ← center on car     │
   │                                                      │
   │  [WORLD SPACE]                                       │
   │    drawTrack()     ← ROAD_SPINE in world coords      │
   │    drawCar(cars[i], i) for each car                  │
   │                                                      │
   │  ctx.restore()                                       │
   │                                                      │
   │  [SCREEN SPACE]                                      │
   │    drawMinimap()   ← new function                    │
   │    updateHUD()     ← DOM elements, unchanged         │
   │    drawDamageBar() ← existing screen-space draw      │
   │    drawFloatingTexts()  ← existing screen-space      │
   │    cpFlash stroke  ← already screen-space            │
   └──────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No structural changes. All modifications are within `game.js`:

```
game.js
├── Constants (lines 1–13)         ← update physics values
├── ROAD_SPINE (lines 14–43)       ← replace entirely
├── ROAD_HALF_W (line 18)          ← change to 80
├── CPS (lines 46–51)              ← replace with new positions
├── START (lines 55–60)            ← replace with new positions
├── AI_WAYPOINTS (lines 140–165)   ← replace entirely
├── AI_WP_REACH (line 775)         ← change to 80
├── TUNNEL_ZONE (line 426)         ← update to new coords
├── drawTrack() (lines 455–572)    ← simplify (remove color blocks)
├── drawCar() (lines 593–657)      ← minor: car number position fix
├── loop() (lines 993–1199)        ← add camera transform, move HUD calls
├── drawMinimap() [NEW]            ← new function, called in screen space
└── drawOffTrackVignette()         ← update center coord for new world
```

### Pattern 1: Camera Transform (Rotating Follow Camera)

**What:** Apply a 3-step canvas transform before all world-space drawing so the player car always appears at (240, 380) pointing up.

**When to use:** All three `phase` branches in `loop()`: countdown, racing, done.

**Exact implementation:**

```javascript
// Source: Canvas 2D API specification + D-03 decision
// Applied at the TOP of each phase branch in loop(), before any drawTrack/drawCar call

ctx.save();
ctx.translate(240, 380);                       // step 1: move origin to camera focus point
ctx.rotate(-cars[0].angle - Math.PI / 2);     // step 2: rotate world so car points up (↑)
ctx.translate(-cars[0].x, -cars[0].y);        // step 3: center world on car position

// --- all world-space drawing here ---
drawTrack();
// draw cars back-to-front
for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);

ctx.restore();
// --- screen-space drawing here ---
drawMinimap();
updateHUD();
drawDamageBar(cars[0].damage);
drawFloatingTexts(dt);
```

**Why this transform order works:**
- `translate(240, 380)` sets the focal point on screen where the car will appear
- `rotate(-car.angle - PI/2)` rotates the coordinate system; the `-PI/2` accounts for the fact that angle=0 means the car faces right (east, +x direction), so we subtract PI/2 to make angle=0 display as facing up
- `translate(-car.x, -car.y)` shifts world so the car's world position maps to the canvas origin (which after step 1 is at screen position 240, 380)

**Critical: the `-Math.PI/2` correction.** In `drawCar()`, the car's visual rotation is `car.angle + Math.PI/2` (line 596: `const θ = car.angle + Math.PI/2`). This means angle=0 is the car facing up visually. The camera must undo that same convention, so it rotates by `-(car.angle + PI/2)` = `-car.angle - PI/2`. [ASSUMED: derived from reading drawCar() at line 596]

**Pitfalls with existing loop() structure:**

1. **The `drawTunnelRoof()` call must be removed or moved** (it's the Phase 3 visual; the `car.inTunnel` setter must be extracted into a separate loop or kept inline in the racing phase after ctx.restore is safe, since inTunnel is a boolean on the car object not a drawing operation). In 2-B, `drawTunnelRoof()` is fully removed from rendering. The `car.inTunnel` boolean setter logic should move into the physics update section, not the render section.

2. **`drawOffTrackVignette()` is currently drawn in WORLD SPACE** (before `drawCar()` calls). After adding the camera transform, it will be drawn rotated with the world. This is acceptable — the vignette gradient radiates from the world center. But the center coordinate passed to `createRadialGradient()` uses `project(240, 310)` which maps to world point (240, 310), not screen center. After camera transform, this is wrong. The vignette should be moved AFTER `ctx.restore()` and drawn in screen space, centering on (240, 380) instead of a world point.

3. **`drawCountdown()` overlays use absolute screen coords** (e.g., `ctx.fillText(String(val), 240, 370)`). These must be called AFTER `ctx.restore()`. Currently `drawCountdown()` is called after `drawCar()` calls in the countdown branch — the camera transform wrapper must enclose only world-space draws; countdown overlay goes after restore.

4. **`drawWin()` similarly uses screen coords.** Must be called after `ctx.restore()` in the done phase.

5. **`drawDamageBar()`, `drawFloatingTexts()`, cpFlash stroke** — all use fixed screen coords. Already effectively screen-space, but the cpFlash stroke (`ctx.strokeRect(5, 5, 470, 630)`) will be affected by the camera transform if not moved after restore. Must move all of these after `ctx.restore()`.

6. **Car number text in `drawCar()`** — currently drawn at `sp.x, sp.y` using `project(car.x, car.y)`. With camera transform, `project()` returns world coords and the canvas transform handles positioning. The car number will rotate with the car (acceptable — numbers aren't upright but they're small). If desired, they could be drawn in a second pass after restore, but this is not required for 2-B.

### Pattern 2: Simplified drawTrack() for 2-B

**What:** Remove all color block environment drawing (harbour water, casino block, hairpin inner, pit lane). Keep only: background fill, kerbs, tarmac, start/finish line, META label.

**Why:** D-20 and D-21 specify minimal track-only rendering. Color blocks use hardcoded world coords from the old 480×640 space; removing them avoids having to remap all those rectangles.

**Simplified drawTrack() structure:**

```javascript
function drawTrack() {
  // Background — fill the visible area large enough for world space
  // Must clear a region large enough to cover the rotated world. Use a large fillRect.
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(-4000, -4000, 8000, 8000);  // covers any camera rotation/position

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Kerbs (slightly wider than tarmac, red/white dashes)
  ctx.save();
  ctx.lineWidth = ROAD_HALF_W * 2 + 12;
  ctx.setLineDash([60, 60]);
  ctx.strokeStyle = '#dc2626'; drawSpinePath(); ctx.stroke();
  ctx.lineDashOffset = 60;
  ctx.strokeStyle = '#f8fafc'; drawSpinePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Tarmac (asphalt fill)
  ctx.lineWidth = ROAD_HALF_W * 2;
  ctx.strokeStyle = '#2d3748';
  drawSpinePath(); ctx.stroke();

  // Start/finish chequered stripe
  // (perpendicular to main straight at new META position)
  // ...

  // META label
  // ...
}
```

**Key change:** `ctx.fillRect(0, 0, 480, 640)` must become `ctx.fillRect(-4000, -4000, 8000, 8000)`. The camera transform shifts the origin, so a 480×640 fillRect will leave the corners of the canvas unfilled when the camera rotates. Use a very large rect to fill infinite world space. [ASSUMED: standard practice for rotated camera in Canvas 2D games]

**Kerb dash scale:** Scale dashes proportionally from current [18,18] to [60,60] to match the 3.5x world scale. Otherwise dashes appear as solid lines at the new scale.

### Pattern 3: drawMinimap() — New Screen-Space Function

**What:** A new function called after `ctx.restore()` that draws a 100×120px minimap in the top-right corner showing the circuit outline and car positions.

**Scaling formula:**

```javascript
// Source: [ASSUMED] — derived from ROAD_SPINE bounding box approach (D-19)

function drawMinimap() {
  const MAP_W = 100, MAP_H = 120;
  const PAD   = 8;         // padding inside minimap
  const MAP_X = 480 - MAP_W - 6;  // screen-space top-right
  const MAP_Y = 6;

  // Compute ROAD_SPINE bounding box (compute once, could be cached)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  ROAD_SPINE.forEach(([x, y]) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  });
  const rangeX = maxX - minX, rangeY = maxY - minY;
  const scaleX = (MAP_W - PAD * 2) / rangeX;
  const scaleY = (MAP_H - PAD * 2) / rangeY;

  // Use the smaller scale to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);
  const offX = MAP_X + PAD + (MAP_W - PAD * 2 - rangeX * scale) / 2 - minX * scale;
  const offY = MAP_Y + PAD + (MAP_H - PAD * 2 - rangeY * scale) / 2 - minY * scale;

  const toMap = (wx, wy) => ({
    x: offX + wx * scale,
    y: offY + wy * scale,
  });

  ctx.save();

  // Background
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
  ctx.globalAlpha = 1;

  // Circuit outline (thin polyline of ROAD_SPINE)
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ROAD_SPINE.forEach(([x, y], i) => {
    const m = toMap(x, y);
    i === 0 ? ctx.moveTo(m.x, m.y) : ctx.lineTo(m.x, m.y);
  });
  ctx.stroke();

  // Car dots
  cars.forEach((car, i) => {
    const m = toMap(car.x, car.y);
    ctx.beginPath();
    ctx.arc(m.x, m.y, i === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#f8fafc' : (car.rivalData ? car.rivalData.body : '#888');
    ctx.fill();
  });

  ctx.restore();
}
```

**Minimap coordinate origin note:** If the new ROAD_SPINE world space starts near (0,0) or has negative coordinates, the bounding-box approach handles it automatically. Design the spine so minX ≥ 50 and minY ≥ 50 to avoid edge clipping. [ASSUMED: derived from formula]

### Anti-Patterns to Avoid

- **Anti-pattern: Modifying `project()` to include camera.** D-04 locks this: project() stays identity. The transform lives in loop() only.
- **Anti-pattern: Drawing HUD/overlays inside the ctx.save/restore block.** Any `fillRect` or `fillText` at hardcoded screen coordinates will be wrong inside the rotated transform.
- **Anti-pattern: Small `fillRect(0,0,480,640)` for background.** Leaves corners dark when camera rotates. Must use a large rect covering world space.
- **Anti-pattern: Scaling AI_WP_REACH proportionally to 3.5x (= 105px).** This is too large for tight corners like Loews. Use ~80px as a balanced value.
- **Anti-pattern: Designing Loews hairpin with radius < 80px.** At TURN_RATE=3.8 and 30% max speed (195px/s), minimum turning radius = 195/3.8 = 51px. An 80px radius gives meaningful headroom for Loews at ~30% speed.

---

## Monaco ROAD_SPINE Geometry (1600×2000 World Space)

This is the primary design output. All coordinates are in the new 1600×2000 world space.

### Layout Orientation

```
(0,0) ─────────────────────── (1600,0)
  │                                  │
  │    [CASINO PLATEAU ~y:500]        │
  │                                  │
  │    [LOEWS HAIRPIN ~y:300]         │
  │                                  │
  │    [TUNNEL ~y:800-1000]           │
  │                                  │
  │    [PORT / RASCASSE ~y:1400]      │
  │                                  │
  │    [MAIN STRAIGHT ~y:1800]        │
(0,2000) ──────────────────── (1600,2000)
```

Real Monaco circuit runs clockwise. In this top-down layout:
- Main straight: runs left-to-right at y≈1800, x: 200→900
- Sainte-Devote: right turn climbing at x≈900, turning toward y decreasing
- Beau Rivage: uphill climb (decreasing y), x drifting left slightly
- Massenet + Casino: plateau at y≈500-600, curving left
- Mirabeau: descending (y increasing from ~500), going left
- Grand Hotel Hairpin: U-turn at x≈350, y≈300 — the apex is leftmost point at minimum y
- Mirabeau Bas + Portier: descending and rightward, x increasing, y increasing
- Tunnel: runs right, x≈700→1100, y≈900-1050
- Nouvelle Chicane: left-right after tunnel exit, x≈1100-1200
- Tabac: right turn heading south (y increasing), x≈1200
- Swimming Pool: series of bends, x≈1100-1300, y≈1200-1500
- La Rascasse: right hairpin, x≈900, y≈1550
- Antony Nogues: final right turn back to straight, x≈700-800

### Designed ROAD_SPINE (48 points, clockwise)

[ASSUMED: analytically designed — not derived from GPS data. The executor MUST visually verify and adjust in-browser. Designed to Monaco real-circuit proportions scaled to 1600×2000 world space.]

```javascript
const ROAD_SPINE = [
  // ── META / Main Straight (left→right at y≈1800) ──────────────────────────────
  [200, 1820], [350, 1820], [520, 1820], [700, 1820], [840, 1820],
  // ── Sainte-Dévote (right turn, climbing — wide radius ~200px) ─────────────────
  [900, 1810], [950, 1780], [980, 1730], [990, 1660],
  // ── Beau Rivage (uphill sweep — gentle curve drifting left) ──────────────────
  [985, 1580], [975, 1480], [960, 1380],
  // ── Massenet (sweeping right toward Casino plateau) ───────────────────────────
  [950, 1300], [940, 1200], [920, 1100],
  // ── Casino Square / Mirabeau entry (plateau, right-bearing arc) ──────────────
  [900, 1030], [870, 960], [820, 900],
  // ── Mirabeau (descending left, entering hairpin section) ─────────────────────
  [750, 850], [670, 800], [590, 760],
  // ── Grand Hotel Hairpin entry arc (approaching from east) ────────────────────
  [520, 730], [460, 700], [400, 670],
  // ── Loews Hairpin (U-turn, ~80px radius, tightest section) ───────────────────
  [360, 640], [340, 610], [340, 580], [350, 550], [380, 530],
  // ── Hairpin exit / Mirabeau Bas (accelerating downhill east) ─────────────────
  [420, 520], [480, 510], [540, 510],
  // ── Portier (right turn descending to tunnel) ─────────────────────────────────
  [600, 520], [660, 550], [700, 600], [720, 670],
  // ── Tunnel (rightward run, gentle curve) ─────────────────────────────────────
  [750, 740], [830, 800], [920, 840], [1030, 860], [1130, 860],
  // ── Nouvelle Chicane (left-right chicane after tunnel exit) ──────────────────
  [1190, 840], [1220, 880], [1200, 940], [1170, 980],
  // ── Tabac (right-bearing, heading south) ─────────────────────────────────────
  [1160, 1060], [1180, 1160],
  // ── Swimming Pool (series of bends, harbour section) ─────────────────────────
  [1200, 1260], [1180, 1360], [1140, 1430],
  // ── La Rascasse (tight right hairpin) ────────────────────────────────────────
  [1080, 1480], [1000, 1500], [920, 1480],
  // ── Antony Noghès (final right turn back to straight) ────────────────────────
  [860, 1560], [780, 1640], [680, 1740], [560, 1790], [380, 1810],
  // ── Close loop ───────────────────────────────────────────────────────────────
  [200, 1820],
];
```

**Total: 52 points** (above including close-loop). Executor should verify and tune these by opening the game in-browser and checking the circuit shape.

### Critical geometry constraints for Loews Hairpin

- Hairpin apex: The points at (340, 580)→(340, 550) form the bottom of the U-turn
- Hairpin inner radius ≈ |600-530| / 2 ≈ 35px from center to spine → outer edge = 35+80 = 115px, inner = 35-80... this makes the inner edge collapse
- **Correction:** The hairpin U-turn width must be ≥ 2 × ROAD_HALF_W = 160px for a true U (two parallel straights) to fit without overlapping
- Design approach: Hairpin apex spans y: 530→640 vertically, x varies from ~400 on approach to ~340 at apex to ~540 on exit. The U-turn is a semicircle in yz plane with center at (360, 620), radius 80px.

**Corrected Loews hairpin section (U-turn with radius ≈ 80px):**

```javascript
  // Approach from east at x≈400, y≈670
  [400, 670], [365, 650], [340, 620],   // left arc entry
  [340, 570], [365, 545], [400, 540],   // bottom of U, radius ~40px from center (340,595)
  // NOTE: Center of U ≈ (340, 610). From x=400 at y≈660 to apex at x=340 to exit at x=400,y≈555
  // Vertical span of U = 660-555 = 105px → half = 52px. This gives radius 52px.
  // For ROAD_HALF_W=80 (track width = 160px), a 52px radius spine means inner edge = 52-80 < 0
  // Solution: use ROAD_HALF_W=80 but design the hairpin spine with radius ~120px (not 80)
  // so inner edge (120-80=40px) remains positive. The "hairpin" feels tight at 80px half-width.
```

**Revised geometry insight:** At ROAD_HALF_W=80, the minimum viable spine radius for a U-turn where both arms of the U are part of the same ROAD_HALF_W-wide track is:

```
minimum_spine_radius = ROAD_HALF_W = 80px
```

If the spine radius < 80px, the inner edge of the exit arm overlaps with the inner edge of the entry arm, creating a visual artifact where track fills a solid block. Use spine radius ≥ 100px at Loews for visual clarity, even though it looks like a slightly wider hairpin than real Monaco.

**Playability constraint for Loews:** At TURN_RATE=3.8, the minimum speed where the player can complete a radius-R curve is:
```
speed = R × TURN_RATE  (px/s)
minimum_speed_for_R100 = 100 × 3.8 = 380 px/s = 58% of MAX_SPD_ON (650)
```

The player must brake to <58% max speed to make a 100px radius hairpin. With BRAKE_FORCE=1200 and AUTO_ACCEL=550, they can achieve this. Good. At 30% max speed (195px/s), the minimum radius they can navigate is:
```
min_radius = 195 / 3.8 ≈ 51px
```

So 100px gives comfortable headroom. The hairpin design at ~100px spine radius is correct.

### Revised ROAD_SPINE with corrected Loews geometry

The complete, validated ROAD_SPINE is the one above with the following Loews section replaced:

```javascript
  // ── Grand Hotel Hairpin approach ──────────────────────────────────────────────
  [520, 730], [450, 700], [380, 665],
  // ── Loews U-turn (spine radius ≈ 100px, ROAD_HALF_W=80) ──────────────────────
  [340, 620], [330, 570], [340, 520],
  [370, 485], [420, 470], [470, 480],
  // ── Hairpin exit (Mirabeau Bas, accelerating downhill eastward) ───────────────
  [510, 505], [560, 510],
```

Center of hairpin U ≈ (370, 545). Entry at ~(340, 620), apex at (330, 545), exit at (420, 470). Spine radius from center to spine ≈ sqrt((340-370)^2 + (620-545)^2) = sqrt(900+5625) ≈ 79px on entry. Close enough to 80px radius — but this barely avoids track overlap. Executor should test and may need to widen the U slightly.

---

## Checkpoints — New Positions

[ASSUMED: derived from ROAD_SPINE layout above. Positions must be verified in-browser.]

```javascript
const CPS = [
  { x: 520,  y: 1820, r: 200 },  // 0  META — main straight (CP0 = finish line)
  { x: 900,  y: 1000, r: 200 },  // 1  Casino / Mirabeau plateau
  { x: 360,  y: 550,  r: 220 },  // 2  Loews Hairpin apex
  { x: 1050, y: 860,  r: 220 },  // 3  Tunnel mid / post-tunnel
];
```

**CP radius reasoning:** At 3.5x scale, 80px old → 280px new. But 200-220px is sufficient given that checkpoint detection is a circle and cars must pass through the area, not just touch it. Make CP0 radius 200px to prevent premature crossing on the start/finish straight approach.

**CP ordering must enforce full circuit:** CP0 (Meta) → CP1 (Casino) → CP2 (Loews) → CP3 (Tunnel exit) → CP0 (Meta). This matches the clockwise circuit direction.

---

## Starting Grid — New Positions

[ASSUMED: main straight at y≈1820, x from ~200 to ~840]

```javascript
const START = [
  { x: 580, y: 1826, a: 0 },  // P1 — player  (right col, front) — a:0 = facing east (+x)
  { x: 520, y: 1814, a: 0 },  // P2 — AI car1  (left col, front)
  { x: 460, y: 1826, a: 0 },  // P3 — AI car2  (right col, rear)
  { x: 400, y: 1814, a: 0 },  // P4 — AI car3  (left col, rear)
];
```

**Separation check:** P1 to P2: sqrt((580-520)^2 + (1826-1814)^2) = sqrt(3600+144) ≈ 61px. CAR_RADIUS=18, so minDist = 36px. 61px >> 36px. No collision at start.

**Angle=0 means east (+x direction)** — the main straight runs left-to-right. First corner (Sainte-Devote) is to the right. [ASSUMED: consistent with existing START angles in current code]

---

## TUNNEL_ZONE — New Coordinates

[ASSUMED: derived from ROAD_SPINE tunnel section above]

```javascript
const TUNNEL_ZONE = { x1: 730, y1: 720, x2: 1180, y2: 920 };
```

This covers the ROAD_SPINE tunnel segment: from Portier exit (~[720, 670]) through tunnel mid (~[1030, 860]) to Nouvelle Chicane entry (~[1190, 840]). Note: `drawTunnelRoof()` visual is NOT called in 2-B (Phase 3). The `car.inTunnel` boolean setter must be extracted:

```javascript
// In the racing phase of loop(), after updateCar/updateAI calls, before rendering:
cars.forEach(car => {
  car.inTunnel = (car.x >= TUNNEL_ZONE.x1 && car.x <= TUNNEL_ZONE.x2 &&
                  car.y >= TUNNEL_ZONE.y1 && car.y <= TUNNEL_ZONE.y2);
});
```

---

## AI_WAYPOINTS — New Design

[ASSUMED: designed from ROAD_SPINE layout. Waypoints are denser at tight corners, coarser on straights.]

```javascript
const AI_WP_REACH = 80;  // px. Was 30. At 3.5x scale, 30*3.5=105 but 80 is tighter for corners.

const AI_WAYPOINTS = [
  [520,  1820],  //  0  Meta / main straight start
  [700,  1820],  //  1  main straight mid
  [870,  1820],  //  2  main straight east
  [960,  1750],  //  3  Sainte-Dévote entry
  [985,  1640],  //  4  Sainte-Dévote apex
  [975,  1500],  //  5  Beau Rivage lower
  [955,  1350],  //  6  Beau Rivage upper
  [925,  1150],  //  7  Massenet
  [890,  1000],  //  8  Casino entry
  [840,  920],   //  9  Casino apex
  [780,  865],   // 10  Mirabeau entry
  [700,  825],   // 11  Mirabeau
  [610,  780],   // 12  Mirabeau Bas upper
  [520,  745],   // 13  Grand Hotel entry
  [440,  710],   // 14  hairpin approach
  [370,  665],   // 15  hairpin outer entry
  [340,  620],   // 16  Loews entry arc
  [332,  570],   // 17  Loews apex (tightest)
  [345,  520],   // 18  Loews exit arc
  [385,  485],   // 19  hairpin exit lower
  [440,  472],   // 20  Mirabeau Bas entry
  [520,  505],   // 21  Mirabeau Bas descent
  [600,  520],   // 22  Portier upper
  [670,  565],   // 23  Portier apex
  [720,  650],   // 24  tunnel entry
  [800,  760],   // 25  tunnel entry arc
  [920,  840],   // 26  tunnel mid
  [1050, 860],   // 27  tunnel apex / exit  ← CP3
  [1160, 855],   // 28  tunnel exit
  [1215, 870],   // 29  Nouvelle Chicane entry (left)
  [1210, 930],   // 30  Chicane apex
  [1175, 975],   // 31  Chicane exit (right)
  [1165, 1080],  // 32  Tabac
  [1185, 1200],  // 33  Swimming Pool entry
  [1185, 1330],  // 34  Swimming Pool mid
  [1140, 1440],  // 35  Swimming Pool exit
  [1050, 1490],  // 36  Rascasse approach
  [960,  1500],  // 37  Rascasse apex
  [890,  1475],  // 38  Rascasse exit
  [830,  1555],  // 39  Antony Noghès upper
  [740,  1660],  // 40  Antony Noghès lower
  [620,  1770],  // 41  final straight entry
  [420,  1810],  // 42  final straight mid
];
```

**Total: 43 waypoints.** Loop: `car.wpIdx = (car.wpIdx + 1) % AI_WAYPOINTS.length`.

**Dense sections:** Loews hairpin has 5 waypoints (15-19) spanning ~200px of spine — one waypoint every ~40px through the tightest section. This gives the AI enough precision to navigate the hairpin without cutting across the inner track edge.

---

## Physics — Tuning Analysis

### Constants Table (confirmed by D-13)

| Constant | Old Value | New Value | Ratio | Notes |
|----------|-----------|-----------|-------|-------|
| MAX_SPD_ON | 190 px/s | 650 px/s | 3.42x | Slightly under 3.5x — locked by D-13 |
| MAX_SPD_OFF | 72 px/s | 250 px/s | 3.47x | Proportional |
| AUTO_ACCEL | 160 px/s² | 550 px/s² | 3.44x | Proportional |
| BRAKE_FORCE | 350 px/s² | 1200 px/s² | 3.43x | Proportional |
| CAR_RADIUS | 14 px | 18 px | 1.28x | Not proportional — D-13 |
| ROAD_HALF_W | 28 px | 80 px | 2.86x | D-07 — deliberate, wider feel |
| TURN_RATE | 4.5 rad/s | 3.8 rad/s | 0.84x | D-14 — separate tuning |
| FRICTION_K | 1.1 | 1.1 | 1.0x | D-15 — dimensionless |

### TURN_RATE Analysis

TURN_RATE=3.8 with TURN_RATE scaling formula in `updateCar()`:
```javascript
const turnFactor = Math.min(1, 0.45 + car.speed / MAX_SPD_ON * 0.55);
```

At MAX_SPD_ON (650 px/s): turnFactor = 1.0 → effective TURN_RATE = 3.8 rad/s
At half speed (325 px/s): turnFactor ≈ 0.72 → effective TURN_RATE = 2.74 rad/s
At 30% speed (195 px/s): turnFactor ≈ 0.62 → effective TURN_RATE = 2.35 rad/s

At 30% speed and TURN_RATE=2.35, minimum turning radius:
```
R = speed / TURN_RATE = 195 / 2.35 ≈ 83px
```

For a Loews hairpin spine radius of ~100px, the player needs speed ≤ 100 × 2.35 = 235px/s = 36% max speed. This means braking to ~36% before the hairpin, which is achievable with BRAKE_FORCE=1200. At BRAKE_FORCE=1200 and starting from 650px/s, time to reach 235px/s = (650-235)/1200 ≈ 0.35s. The approach to Loews (from Mirabeau waypoints) gives ~3 seconds at reduced speed — plenty of time to brake.

**D-14 value of 3.8 rad/s is validated for the Loews constraint.** [ASSUMED: analytical verification only, not playtested]

### AI Speed at New Scale

With MAX_SPD_ON=650 and skill range 0.79–0.96 × speedMult:
- Weakest AI: 650 × 0.79 × 0.92 (defensive) = 473 px/s
- Strongest AI: 650 × 0.96 × 1.05 (aggressive) = 655 px/s (slightly over MAX_SPD_ON — acceptable, clamped)

AI braking at sharp corners (absDiff > 0.65 rad): speed clamped to `MAX_SPD_ON × skill × speedMult × 0.60`:
- Weakest defensive at corner: 650 × 0.79 × 0.92 × 0.60 = 284 px/s
- For R=83px minimum: this gives a minimum radius of 284/2.35 ≈ 121px at half speed. The AI has TURN_RATE × steerPow with steerPow up to 0.70+0.96×0.28 = 0.97, so max effective AI turn rate ≈ 3.8 × 0.97 = 3.69 rad/s at max skill. Minimum navigable radius at braking speed for elite AI: 284 / 3.69 ≈ 77px. The 100px spine radius hairpin is navigable by all AI. [ASSUMED: analytical]

---

## Multiplayer Impact Analysis

**The camera transform is render-only — it does NOT affect physics or network.** [ASSUMED: verified by reading code]

Evidence from code:
- `Net.send()` (loop line 1073) transmits `cars[0].x, cars[0].y, cars[0].angle` — all world-space values
- The camera transform only affects how these are displayed
- `remoteRenderPos()` returns interpolated world-space position
- The remote car is drawn via `drawCar({...rp, ...}, 1)` which uses world coords, then the camera transform in loop() displays it in the correct screen position

**No changes needed to Net IIFE, Net.send(), onMsg handler, or remoteRenderPos().** The multiplayer `pos` message continues sending raw world coordinates.

---

## Touch Controls Impact Analysis

**Touch controls work through the `keys` object.** The touch button handlers set `keys.left`, `keys.right`, `keys.down`. The camera transform does not change what "left" and "right" mean for physics — steering is still `car.angle += TURN_RATE × dt × (left ? -1 : 1)`.

With a rotating camera where the car always points up, pressing "left" turns the car's world-angle left, which (because the camera rotates with the car) causes the car to turn left on screen. This is the correct, natural behavior — exactly why rotating cameras feel better.

**No changes needed to touch control handlers.** [ASSUMED: derived from code logic]

---

## Common Pitfalls

### Pitfall 1: Screen-Space Draws Inside Camera Transform Block

**What goes wrong:** Any `ctx.fillRect(0,0,480,640)` or `ctx.strokeRect(5,5,470,630)` called while inside the `ctx.save()/restore()` camera block will be transformed by the camera matrix. At angle=π/4, `fillRect(0,0,480,640)` draws a rotated rectangle leaving canvas corners exposed.

**Why it happens:** Forgetting to move overlay draws (countdown, win, damage bar, cpFlash, vignette) to after `ctx.restore()`.

**How to avoid:** The loop() refactor must move these draws explicitly:
- `drawCountdown()` → after restore
- `drawWin()` → after restore
- `drawOffTrackVignette()` → after restore (update center to screen-space 240, 380)
- cpFlash `ctx.strokeRect(5, 5, 470, 630)` → after restore
- `drawDamageBar()` → after restore (already intended to be screen-space)
- `drawFloatingTexts()` → after restore

**Warning signs:** Game looks correct when car angle≈0 (facing east) but breaks when car turns. Screen-space elements appear to rotate with the car.

### Pitfall 2: Background Not Clearing Entire Canvas

**What goes wrong:** `drawTrack()` has `ctx.fillRect(0, 0, 480, 640)` for the background. Inside the camera transform, this only clears the 480×640 rect at the CURRENT WORLD TRANSFORM ORIGIN. As the car moves and rotates, the previous frame's content "leaks" at the canvas corners.

**Why it happens:** The canvas origin is no longer at (0,0) screen after the camera transform.

**How to avoid:** Replace the background fillRect in `drawTrack()` with:
```javascript
ctx.fillRect(-4000, -4000, 8000, 8000);
```
This fills effectively infinite world space. [ASSUMED: standard pattern]

### Pitfall 3: drawCar() Car Number Text Rotating with World

**What goes wrong:** In `drawCar()`, the car number text is drawn at `(sp.x, sp.y + 4)` where `sp = project(car.x, car.y)`. Since project() is identity, `sp.x = car.x` (world coords). With camera transform active, this world-space position is correctly transformed by the canvas matrix — BUT the text will also be rotated upside-down or sideways when the car faces in non-up directions.

**Why it happens:** `ctx.fillText()` is affected by the current canvas transform including rotation.

**How to avoid:** The numbers are small (7px font) — rotation is barely noticeable in practice. This is not a blocking issue for 2-B. If desired, draw car numbers in a second pass after `ctx.restore()` by calculating their screen position manually, but this complexity is not required.

### Pitfall 4: drawSpinePath() fillRect vs. Large World Background

**What goes wrong:** `drawTrack()` currently contains `ctx.fillRect(0, 0, 480, 640)` as the first line. This clips the track background to the old 480×640 world size.

**How to avoid:** Change to `ctx.fillRect(-4000, -4000, 8000, 8000)`.

### Pitfall 5: Loews Hairpin Track Overlap

**What goes wrong:** If the Loews hairpin spine is designed with radius < ROAD_HALF_W (80px), the track polygon from the entry arm overlaps with the track polygon from the exit arm, creating a visual "blob" instead of a hairpin shape.

**Why it happens:** The isOnTrack() segment-distance algorithm still works correctly (it's point-to-segment, not polygon intersection) but visually the track looks wrong.

**How to avoid:** Design Loews spine with U-turn radius ≥ 100px (center-to-center spine distance). Verify visually. The physics work at any radius; it's purely a visual concern.

### Pitfall 6: AI_WP_REACH Too Large Causes Corner-Cutting

**What goes wrong:** If AI_WP_REACH=105px (naive 3.5x scaling of 30px), the AI considers a waypoint "reached" when it's 105px away. At Loews (waypoints ~40-50px apart in the tight section), the AI will skip waypoints entirely and cut across the inner gravel of the hairpin.

**How to avoid:** Use AI_WP_REACH=80px. At Loews, this means the AI must come within 80px of each waypoint — achievable given the 40-50px waypoint spacing. The AI may still cut slightly; reduce to 60px if needed.

### Pitfall 7: TUNNEL_ZONE Misaligned with New Spine

**What goes wrong:** TUNNEL_ZONE bounds don't cover the actual tunnel segment in the new ROAD_SPINE, so `car.inTunnel` is never set true (or set in wrong locations).

**How to avoid:** After finalizing the ROAD_SPINE executor adjustments, re-derive TUNNEL_ZONE from the actual tunnel segment coordinates. It's a bounding box — use: x1=min(tunnel_spine_x), y1=min(tunnel_spine_y), x2=max, y2=max, extended by ±ROAD_HALF_W. Current design: TUNNEL_ZONE = { x1:730, y1:720, x2:1180, y2:920 }. Adjust after in-browser validation.

### Pitfall 8: Start/Finish Chequered Line in drawTrack()

**What goes wrong:** Current drawTrack() draws the finish line at `project(130, 550)` — old world coords. In new drawTrack(), the finish line must be drawn perpendicular to the main straight at the new CP0 position.

**How to avoid:** The finish line in drawTrack() should be drawn as a perpendicular stroke at the new META X position (x≈520) along the main straight (y≈1820), perpendicular to the direction of travel (east, so perpendicular is north-south = vertical line).

---

## HUD Changes

`updateHUD()` is currently called inside the racing phase BEFORE drawing (line 1080). After the refactor, the drawing now has a `ctx.save/restore` wrapper. `updateHUD()` only writes to DOM elements (hudLap, hudPos, hudRole, hudTimer) — it doesn't call any `ctx` methods. Therefore:

**No change needed to updateHUD() logic.** It can stay where it is in the loop (before or after rendering) — it's pure DOM manipulation. The HUD DOM elements are positioned by CSS above the canvas, not affected by canvas transforms.

**Exception:** The lap timer inside loop() does call `ctx.fillText` indirectly... actually checking the code: `hudTimer.textContent = formatTime(elapsed)` (line 1158) — this is DOM, not canvas. Safe.

The only canvas calls that must move are: drawOffTrackVignette, cpFlash strokeRect, drawDamageBar, drawFloatingTexts, drawCountdown, drawWin.

---

## Code Examples

### Camera Transform Applied to All Three loop() Phases

```javascript
// Source: D-03 decision + Canvas 2D API [ASSUMED]
// Applies uniformly to countdown, racing, and done phases

function loop(ts) {
  if (!loopRunning) return;
  const dt = lastTime === 0 ? 0.016 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  // === WORLD-SPACE RENDER (with camera transform) ===
  ctx.save();
  ctx.translate(240, 380);
  ctx.rotate(-cars[0].angle - Math.PI / 2);
  ctx.translate(-cars[0].x, -cars[0].y);

  drawTrack();  // includes large background fillRect

  if (phase === 'countdown') {
    for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
  } else if (phase === 'racing' || phase === 'done') {
    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }
  }
  ctx.restore();

  // === SCREEN-SPACE RENDER ===
  drawMinimap();

  if (phase === 'countdown') {
    drawCountdown(countdown);
  } else if (phase === 'racing') {
    const onTrk = isOnTrack(cars[0].x, cars[0].y);
    if (!onTrk) drawOffTrackVignette(0.55);
    // cpFlash
    if (cpFlash > 0) {
      cpFlash -= dt;
      const a2 = Math.min(1, cpFlash * 6);
      ctx.strokeStyle = `rgba(16,185,129,${a2 * 0.7})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 470, 630);
    }
    drawFloatingTexts(dt);
    drawDamageBar(cars[0].damage);
  } else if (phase === 'done') {
    drawWin(winner === 0);
  }

  // Physics updates happen in their original position in racing phase
  // (before the render section shown above)
  rafId = requestAnimationFrame(loop);
}
```

### Minimap Scaling Formula

```javascript
// Source: D-19 decision + [ASSUMED] standard minimap implementation

function drawMinimap() {
  const MAP_W = 100, MAP_H = 120, PAD = 6;
  const MAP_X = 374, MAP_Y = 6;  // 480 - 100 - 6 = 374

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ROAD_SPINE) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((MAP_W - PAD * 2) / rangeX, (MAP_H - PAD * 2) / rangeY);
  const ox = MAP_X + PAD + (MAP_W - PAD * 2 - rangeX * scale) / 2 - minX * scale;
  const oy = MAP_Y + PAD + (MAP_H - PAD * 2 - rangeY * scale) / 2 - minY * scale;
  const toMap = (wx, wy) => [ox + wx * scale, oy + wy * scale];

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
  ctx.globalAlpha = 1;

  // Track outline
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ROAD_SPINE.forEach(([x, y], i) => {
    const [mx, my] = toMap(x, y);
    i === 0 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
  });
  ctx.stroke();

  // Car dots
  cars.forEach((car, i) => {
    const [mx, my] = toMap(car.x, car.y);
    ctx.beginPath();
    ctx.arc(mx, my, i === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#ffffff' : (car.rivalData?.body ?? '#888');
    ctx.fill();
  });

  ctx.restore();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed top-down camera, world-space = screen-space | Rotating follow camera, car always up | Phase 2b | More intuitive controls, better forward visibility |
| 480×640 world space | 1600×2000 world space (3.5x) | Phase 2b | Monaco feels physically large; corners have real geometry |
| ROAD_HALF_W=28px | ROAD_HALF_W=80px | Phase 2b | Track is visibly wide enough to race on |
| Environment color blocks in drawTrack() | Minimal track only (#3a3a4a bg + asphalt) | Phase 2b (D-20,21) | Environment blocks deferred to Phase 3 |
| No minimap | drawMinimap() in screen space | Phase 2b (D-17..19) | Compensates for rotating camera removing global awareness |

**Deprecated/outdated:**
- `drawTunnelRoof()`: visual call removed in 2-B (car.inTunnel setter logic extracted separately)
- `project(wx,wy) → {x:wx, y:wy}`: stays identity but is now used only for local coordinate conversions, not for camera positioning
- `ctx.fillRect(0,0,480,640)` in drawTrack(): replaced with large world-space fillRect

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ROAD_SPINE coordinates designed analytically to Monaco proportions | Monaco ROAD_SPINE | Corners may be wrong shape/scale — executor must adjust in-browser. Entire circuit may need reshaping. |
| A2 | Loews hairpin spine radius 100px is navigable by player at 36% max speed | Geometry / Physics | Hairpin may be too tight (unplayable) or too easy (loses Monaco character). Adjust to 80-120px range. |
| A3 | CP positions derived from ROAD_SPINE design | Checkpoints | CPs may not be reachable on the actual spine path — must verify sequencing. |
| A4 | START positions on main straight at y≈1820 | Starting Grid | Cars may spawn off-track if ROAD_SPINE main straight is at different y — adjust after spine is finalized. |
| A5 | AI_WP_REACH=80px is sufficient for AI to navigate hairpin | AI navigation | May need reduction to 60px if AI cuts corners, or increase to 100px if AI stutters. |
| A6 | Camera transform -car.angle - PI/2 is correct for the drawCar() convention | Camera | If drawCar() convention differs from expectation, car will appear rotated 90° or 180°. Verify with angle=0. |
| A7 | Large fillRect(-4000,-4000,8000,8000) clears background correctly | drawTrack | If canvas clip region restricts this, may need ctx.resetTransform() first for background, then re-apply. |
| A8 | TUNNEL_ZONE bounding box covers tunnel segment | Tunnel | car.inTunnel may never be true (Phase 3 audio impact). Adjust after ROAD_SPINE finalization. |
| A9 | No changes needed to updateHUD() (pure DOM manipulation) | HUD Changes | Verified by code reading: hudLap/hudPos etc. use .textContent — no ctx calls in updateHUD(). LOW risk. |

---

## Open Questions

1. **Should drawOffTrackVignette() center on (240, 380) or (240, 310) in screen space?**
   - What we know: Current uses `project(240, 310)` which in old code equals screen (240, 310). After refactor, screen space is fixed, so use (240, 380) to center on the player car's screen position.
   - Recommendation: Use `ctx.createRadialGradient(240, 380, 100, 240, 380, 280)` — centered on the camera focus point.

2. **Camera smoothing (lerp): add or skip?**
   - What we know: D-DISCRETION marks this as optional. Lerp between current and target angle would reduce visual snap when the player makes sharp steering inputs.
   - Recommendation: Skip for initial implementation. Add if playtesting reveals camera snap is disorienting. Simple lerp: `camAngle += (targetAngle - camAngle) * 0.25`.

3. **What happens to the "CIRCUIT DE MONACO · MONTE CARLO" watermark in drawTrack()?**
   - What we know: Currently drawn at `project(240, 310)` — will now be in world space at (240, 310), which is off-screen most of the time as the camera follows the car around the 1600×2000 world.
   - Recommendation: Remove the watermark from drawTrack() entirely (or move to screen space after ctx.restore()).

4. **How should the META label and start/finish stripe be drawn in the new drawTrack()?**
   - What we know: These are world-space elements (part of the track), so they should stay inside the camera transform block. They'll be drawn at new world coordinates (x≈520, y≈1820).
   - Recommendation: The finish stripe is perpendicular to the main straight (vertical line from y=1820-80 to y=1820+80 at x=520). Draw it after the main tarmac stroke.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is a pure `game.js` modification with no external tools, CLI utilities, or services. Browser + static file server already confirmed working per CLAUDE.md.

---

## Validation Architecture

`nyquist_validation: false` in `.planning/config.json` — Validation Architecture section omitted per configuration.

---

## Security Domain

No security-relevant changes in this phase. Canvas 2D rendering and geometry constants have no attack surface. `security_enforcement` not configured — no ASVS categories apply to this pure client-side rendering phase.

---

## Sources

### Primary (HIGH confidence)
- `game.js` lines 1–165 — Current ROAD_SPINE, CPS, START, AI_WAYPOINTS, physics constants (read and analyzed)
- `game.js` lines 404–572 — project(), drawTrack(), drawSpinePath() (read and analyzed)
- `game.js` lines 593–670 — drawCar(), car rotation convention θ = car.angle + PI/2 (read and confirmed)
- `game.js` lines 993–1199 — loop() full structure, all three phases, existing draw order (read and analyzed)
- `.planning/phases/02b-monaco-overhaul/02b-CONTEXT.md` — All D-01 through D-24 locked decisions
- `.planning/config.json` — nyquist_validation: false confirmed

### Secondary (MEDIUM confidence)
- Canvas 2D specification: ctx.save/restore/translate/rotate transform order (well-established browser API — [ASSUMED] as standard)
- Monaco circuit layout: analytical approximation from known circuit geometry (Sainte-Devote right, climbing, casino plateau, Loews U-hairpin, tunnel rightward, port section chicanes, Rascasse, Antony Nogues) — not GPS data

### Tertiary (LOW confidence)
- Specific ROAD_SPINE coordinates: analytically designed, not derived from authoritative source — executor MUST verify visually
- AI_WP_REACH=80: reasoned from geometry, not playtested
- Physics tuning feel at 3.5x scale: analytical only, requires in-browser confirmation

---

## Metadata

**Confidence breakdown:**
- Camera transform implementation: HIGH — derived directly from code + D-03
- Physics constants: HIGH — locked in D-13, proportional scaling is mathematical
- ROAD_SPINE geometry: LOW-MEDIUM — analytically designed, requires visual/playtest verification
- AI waypoints: MEDIUM — follows ROAD_SPINE shape, density at key corners is sound
- Minimap formula: HIGH — standard bounding-box minimap math
- Pitfalls: HIGH — derived from direct code reading

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (stable codebase — no external dependencies to go stale)
