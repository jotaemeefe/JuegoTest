# Phase 2: Monaco + 4 Cars - Research

**Researched:** 2026-06-27
**Domain:** Canvas 2D track geometry, multi-car state refactor, AI waypoint architecture, collision physics, tunnel overlay compositing, race classification HUD
**Confidence:** HIGH (codebase inspected line-by-line; Monaco layout from multiple verified sources; patterns from MDN)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRACK-01 | Replace oval ROAD_SPINE with Monaco polyline; replace AI_WAYPOINTS with Monaco waypoints | New polyline coordinate set designed; waypoints derived from same geometry |
| TRACK-02 | Draw Monaco environment: harbour water (blue), casino buildings (grey/white), armco barriers (red/white), pit lane tarmac | Canvas fillRect/fillPath color block approach; same pattern as existing kerb drawing |
| TRACK-03 | Tunnel overlay: dark polygon drawn above cars inside tunnel zone; removed on exit | Canvas save/restore with semi-transparent fillRect over car draw region; polygon clips to tunnel zone |
| TRACK-04 | Update 4 CPS to Monaco geometry: must be co-designed with TRACK-01 | Checkpoint positions specified alongside Monaco polyline in this research |
| CARS-01 | Replace local/remote with cars[] array (1 player + 3 AI); all systems migrate | State refactor blueprint provided; every touch-point in game.js identified |
| CARS-02 | AI personality types: aggressive, defensive, consistent | Per-car personality object with speed/offset/damage multipliers |
| CARS-03 | Collision resolution for all 6 pairs among 4 cars | Extend resolveCarCollision(); loop over pairs array |
| CARS-04 | Live P1/P2/P3/P4 HUD classification | cpScore() ranks 4 cars; existing hud-pos element updated; 3 new DOM elements or single text node |
</phase_requirements>

---

## Summary

Phase 2 is the largest structural change in v2.0. It has two independent load-bearing components that must be executed in strict order.

**Component 1 — CARS-01 refactor:** The `local`/`remote` binary model must become a `cars[]` array before any other Phase 2 work begins. Every system in game.js touches one of these two variables: rendering, physics, AI, collision, checkpoints, HUD, win detection, result polling, and network. The refactor is not additive — it replaces the data model that all other code reads. Attempting to bolt on 3 AI cars before this refactor will produce an unmaintainable tangle.

**Component 2 — TRACK-01 geometry:** The Monaco polyline replaces `ROAD_SPINE` and `AI_WAYPOINTS` wholesale. These two constants are the foundation of `isOnTrack()`, `drawTrack()`, `drawSpinePath()`, and `updateAI()`. The new Monaco polyline must be finalized as a coordinate array that fits the 480×640 canvas (using the same world-space coordinate system as the existing oval) before any environment drawing (TRACK-02), tunnel overlay (TRACK-03), or checkpoint placement (TRACK-04) can be coded.

Monaco circuit is driven **clockwise** [VERIFIED: multiple F1 sources]. Corner sequence: Sainte-Dévote (R) → Massenet (L) → Casino (R) → Mirabeau (L) → Grand Hotel Hairpin (R, tightest) → Mirabeau Bas (R) → Portier (R) → Tunnel → Nouvelle Chicane (L-R) → Tabac (L) → Swimming Pool (L-R) → La Rascasse (R) → Antony Noghès (R) → start/finish.

**Build order is mandatory (from STATE.md):** CARS-01 → TRACK-01+04 → TRACK-02+03 → CARS-02+03 → CARS-04.

**Primary recommendation:** Plan four sequential sub-plans: (1) CARS-01 refactor only, (2) Monaco track + checkpoints (TRACK-01+04), (3) Environment + tunnel (TRACK-02+03), (4) 3 AI personalities + collision pairs + P4 HUD (CARS-02+03+04). Each plan leaves game in a playable state.

---

## Project Constraints (from CLAUDE.md)

All directives below are mandatory — the plan MUST NOT violate them:

- **Vanilla JS only** — no bundler, no npm, no frameworks, no external libraries beyond PeerJS (CDN already loaded).
- **Three files only** — all changes go into `game.js`, `style.css`, and `index.html` directly.
- **No external image assets** — Monaco environment drawn entirely in Canvas 2D color blocks (`fillRect`, `beginPath`/`fill`).
- **iOS/Safari AudioContext** — AudioContext must be created inside user gesture handler (existing `getAudioCtx()` pattern); no changes to audio architecture in this phase.
- **No test commands** — manual play is the only regression check.
- **Canvas coordinate system stays 480×640** — the existing `project()` isometric function maps world-space (0–480, 0–640) to screen-space. All Monaco coordinates must live within that world-space boundary.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Track geometry (TRACK-01) | game.js constants (`ROAD_SPINE` replacement) | — | Track is a constant array; `isOnTrack()` and `drawSpinePath()` read it directly |
| Environment rendering (TRACK-02) | game.js `drawTrack()` | — | All environment drawing lives in drawTrack(); Canvas 2D color blocks only |
| Tunnel overlay (TRACK-03) | game.js `loop()` render phase | — | Drawn after cars but before HUD; position check determines alpha |
| Checkpoint positions (TRACK-04) | game.js constants (`CPS` replacement) | — | CPS is a constant array read by `checkCheckpoints()` |
| Multi-car state (CARS-01) | game.js module-level state | — | `local`/`remote` are module globals; entire game.js refactored to `cars[]` |
| AI personalities (CARS-02) | game.js `updateAI()` | — | Personality object passed to or embedded in car object |
| Collision pairs (CARS-03) | game.js `loop()` racing phase | — | `resolveCarCollision()` called for all 6 pairs in a `for i,j` loop |
| Position HUD (CARS-04) | game.js `updateHUD()` | index.html `hud-pos` element | cpScore() ranks 4 cars; single DOM element updated with P1-P4 text |

---

## Standard Stack

### Core (no new libraries — zero external dependencies)

| API / Feature | Source | Purpose | Notes |
|---------------|--------|---------|-------|
| Canvas 2D `fillStyle` + `fillRect` | Browser native | Monaco environment color blocks | Existing pattern in `drawTrack()` |
| Canvas 2D `beginPath` + `fill` | Browser native | Polygon shapes (armco barriers, tunnel roof) | Already used for car drawing |
| Canvas 2D `save`/`restore` | Browser native | Tunnel overlay isolation | Already used for kerb dash pattern |
| Canvas 2D `globalAlpha` | Browser native | Tunnel car darkening | No new API; alpha adjustment of car draw |
| `isOnTrack()` / `ptSegDist2()` | Existing game.js | Track boundary check — works with any polyline | Unchanged algorithm; only data changes |
| `resolveCarCollision()` | Existing game.js | Car-car collision; extend to 4-car pairs | Upgrade existing function |
| `project(wx, wy)` | Existing game.js | Isometric projection — unchanged | All Monaco coords in world space (0–640) |

**No package installs. No npm. No CDN additions.** This phase is entirely internal to game.js.

---

## Package Legitimacy Audit

> **SKIPPED** — Phase 2 installs zero external packages. All work is internal to the three source files.

---

## Monaco Circuit Geometry

### Circuit Facts [VERIFIED: Wikipedia Circuit de Monaco; Multiple F1 sources]

- **Direction:** Clockwise (since 1969 Monaco Grand Prix)
- **Total length:** 3.337 km
- **Total corners:** 19
- **Slowest corner:** Grand Hotel / Loews Hairpin (~48 km/h, ~30 mph)
- **Fastest section:** Tunnel exit, ~260 km/h

### Corner Sequence (Clockwise) [VERIFIED: total-motorsport.com, Wikipedia]

| # | Name | Direction | Character |
|---|------|-----------|-----------|
| 1 | Sainte-Dévote | Right | Tight, first gear entry |
| 2 | Beau Rivage | Right sweep | Uphill acceleration |
| 3 | Massenet | Left | Long sweeping left at hilltop |
| 4 | Casino Square | Right | Fast, downhill exit |
| 5 | Mirabeau Haute | Left | Tight braking zone |
| 6 | Grand Hotel Hairpin | Right | TIGHTEST — near U-turn, first gear |
| 7 | Mirabeau Bas | Right | Short downhill right |
| 8 | Portier | Right | Double right before tunnel |
| 9 | Tunnel | — | High speed kink right (right-hand curve at ~260 km/h) |
| 10-11 | Nouvelle Chicane | Left-Right | Hard braking after tunnel exit |
| 12 | Tabac | Left | Fast fourth-gear corner along harbour |
| 13-16 | Swimming Pool (Piscine) | L-R-L-R | Chicane sequence along pool |
| 17 | La Rascasse | Right | Very tight 135°, almost hairpin |
| 18 | Antony Noghès | Right | Final tight right to start/finish |

### Monaco Polyline Design for 480×640 Canvas

The existing oval uses world-space coordinates ranging from approximately x: 82–420, y: 90–530. The Monaco polyline must fit within the same bounds.

**Circuit Shape Mental Model:** From start/finish at the bottom-left, the track runs upward-right to Sainte-Dévote, then hairpins left-upward to the Casino plateau, drops steeply right-downward through the Hairpin, runs left-downward through the Portier zone into the tunnel (running rightward at sea level), exits the tunnel and chicanes left, runs along the harbour bottom-left through Swimming Pool, then tightens up through Rascasse and Noghès back to start/finish.

**Proposed world-space polyline** — 28 points, designed to be recognizable within 480×640 [ASSUMED — planner must verify visually]:

```javascript
// Monaco circuit — clockwise, 28-point polyline
// Start/finish on main straight (bottom-left horizontal)
// Tunnel runs across the bottom-right
// Casino plateau at top-right
// Hairpin at middle-right
const ROAD_SPINE = [
  // ── Start/finish straight (main straight, bottom, left→right) ─────────────
  [ 60, 550], [130, 550], [200, 550],
  // ── Sainte-Dévote (right turn, upward) ────────────────────────────────────
  [240, 545], [260, 530], [270, 510],
  // ── Beau Rivage + Massenet (climbing left sweep toward Casino) ────────────
  [275, 470], [280, 420], [290, 380], [310, 350],
  // ── Casino Square area (right, then left — Mirabeau) ──────────────────────
  [340, 310], [360, 280], [370, 250],
  // ── Grand Hotel Hairpin (tight right, almost U-turn) ──────────────────────
  [380, 220], [395, 200], [385, 180], [365, 175], [340, 185],
  // ── Mirabeau Bas + Portier (descending right to tunnel) ───────────────────
  [320, 210], [310, 240], [300, 270],
  // ── Tunnel (rightward, bottom of circuit) ─────────────────────────────────
  [330, 300], [380, 310], [420, 310],
  // ── Nouvelle Chicane + Tabac + Swimming Pool (left-right along harbour) ───
  [440, 300], [440, 350], [420, 380], [400, 420],
  // ── La Rascasse + Antony Noghès (tight rights back to start) ─────────────
  [370, 470], [330, 510], [280, 540],
  // ── Close loop (return to start/finish) ───────────────────────────────────
  [200, 550],
];
```

> **[ASSUMED] NOTE:** These coordinates are a first-pass approximation based on the corner sequence description. The planner must budget a dedicated iteration task where a human visually verifies the rendered shape on the canvas and adjusts coordinates to better match recognizable Monaco proportions. The critical landmarks that must be recognizable: (1) a tight near-U-turn hairpin (Grand Hotel) at approximately upper-right area, (2) a horizontal tunnel section, (3) the harbour chicane sequence (Tabac/Swimming Pool) running roughly horizontally at the bottom, (4) Rascasse as a tight right before returning to the main straight.

**Track half-width:** Keep `ROAD_HALF_W = 60` from the oval. Monaco's real track is narrower (~9m) but reducing this value makes the game much harder and the `isOnTrack()` check more punishing. 60px provides playable tolerance.

### Proposed Monaco Checkpoints (TRACK-04) [ASSUMED — must be validated alongside polyline]

```javascript
// Monaco checkpoints — must be hit in order; CP0 = META / finish line
const CPS = [
  { x: 130, y: 550, r: 80 },  // 0 META — main straight
  { x: 360, y: 265, r: 70 },  // 1 Casino/Mirabeau area
  { x: 370, y: 193, r: 65 },  // 2 Grand Hotel Hairpin
  { x: 415, y: 310, r: 70 },  // 3 Tunnel exit
];
```

These 4 checkpoints must be positioned such that:
- CP0 is on the main straight (finish line)
- CP1 is in the Casino/Mirabeau plateau area (after climbing Sainte-Dévote)
- CP2 is at or just after the Grand Hotel Hairpin
- CP3 is in the tunnel/post-tunnel section

### Starting Grid (4 cars) [ASSUMED]

```javascript
// 4-car grid on main straight, pointing right (east, angle=0)
const START = [
  { x: 185, y: 548, a: 0 },  // P1 — player (Colapinto)
  { x: 155, y: 548, a: 0 },  // P2 — AI car 1
  { x: 185, y: 554, a: 0 },  // P3 — AI car 2
  { x: 155, y: 554, a: 0 },  // P4 — AI car 3
];
```

Note: With 4 cars on a narrow street circuit, starting grid spacing must be tight enough that all cars fit on the main straight before Sainte-Dévote. Grid positions may need vertical offsets (2x2 grid) rather than single-file.

---

## CARS-01 Refactor Blueprint

This is the most critical architectural change. Every reference to `local` and `remote` in game.js must be migrated.

### Current State (game.js)

```javascript
// Two module-level car objects
let local  = makeCar(0);
let remote = Object.assign(makeCar(1), {
  prevX, prevY, prevAngle, lastUpdate: 0,
});
let winner = null;          // 'local' | 'remote'
let localDamage = 0;        // damage for local car only
let aiWpIdx = 0;            // single AI waypoint index (shared)
```

### Target State

```javascript
// cars[0] = player (Colapinto), cars[1-3] = AI opponents
let cars = [];
// Each car object:
// { x, y, angle, speed, lap, nextCP, finished,
//   isPlayer: bool,
//   damage: 0,          // was localDamage (player only rendered)
//   wpIdx: 0,           // was aiWpIdx (per-AI)
//   personality: { skill, style, speedMult, lineMult, damageMult }
//   // net interpolation fields (player-only in solo, both in multi):
//   prevX, prevY, prevAngle, lastUpdate
// }
let winner = null;  // index into cars[] or null
```

### Complete Touch-Point Inventory [VERIFIED by full game.js read]

Every location in game.js that reads or writes `local` or `remote`:

| Line Range | System | What Must Change |
|------------|--------|------------------|
| 156–165 | `makeCar()` + initialization | `makeCar()` gains index param; `local`/`remote` replaced by `cars[]` init in `resetGame()` |
| 161–165 | `remote` net fields | Move `prevX/prevY/prevAngle/lastUpdate` into `cars[0]` in multi mode (or `cars[1]` if AI) |
| 173 | `winner` | Change type from `'local'|'remote'` to index (0–3) or null |
| 174 | `localDamage` | Move into `cars[0].damage` |
| 175 | `aiWpIdx` | Move into each AI car object as `wpIdx` |
| 183 | `prevIsFirst` | Becomes derived from position classification; still module-level |
| 572–608 | `checkCheckpoints()` | Receives any car from cars[]; lap start logic gates on `car === cars[0]` |
| 611–634 | `updateCar()` | Receives car + damage; change `keys.down` check to `car.isPlayer && keys.down` |
| 636–676 | `updateAI()` | Receives car + dt; uses `car.wpIdx` instead of `aiWpIdx`; uses `car.personality.skill` |
| 679–716 | `updateHUD()` | `local`/`remote` → cpScore over all 4 cars; position becomes ranking 1–4 |
| 819–832 | loop `countdown` phase | `remote`→`cars[1]`; `local`→`cars[0]`; draw all 4 cars |
| 836–943 | loop `racing` phase | All car updates in loop; collision pairs; damage tracking per-player |
| 854–869 | Collision check (solo) | Extends to 6 pairs |
| 879–881 | Render in racing phase | Draw all 4 cars; tunnel overlay after cars |
| 884–898 | Off-track damage | Gates on `cars[0]` (player only) |
| 933–943 | Win detection | `winner` = index of first car to finish |
| 944–951 | `done` phase render | Draw all 4 cars |
| 1036–1065 | `resetGame()` | Build `cars[]` with personalities; assign `isPlayer: true` to cars[0] |
| 1067–1072 | `beginCountdown()` | No change needed (calls resetGame) |
| 993–1018 | `onMsg()` net handler | `remote.x` etc → `cars[1].x` in multi mode (still 1v1 multiplayer) |
| 1036–1038 | `resetGame()` net logic | In multi mode, cars[1] is the remote car; preserve net fields |
| 1344–1378 | `pollResults()` | `winner === 'local'` → `winner === 0`; result text still refers to player (Colapinto) |

### Key Design Decision: Multiplayer in Phase 2

Multiplayer remains **1v1** in Phase 2. In multi mode: `cars[0]` = local player, `cars[1]` = remote player (net interpolated). Cars[2] and cars[3] do NOT exist in multi mode (or exist as disabled placeholders). The `cars[]` array should be initialized with different length depending on mode: `solo: length 4`, `multi: length 2`.

### carStyle() Migration

```javascript
// Current: carStyle(styleIdx) — 0=player, 1=rival
// Target: carStyle(carIdx) — 0=player, 1-3=AI opponents
function carStyle(carIdx) {
  if (carIdx === 0) return CAR_STYLE_HOST;
  // Each AI car needs its own style derived from AI personality or RIVALS selection
  const r = aiRivals[carIdx - 1];  // array of 3 selected rivals
  return { body: r.body, stripe: r.accent, cockpit: '#0d0d0d', helmet: r.helmet, num: r.num };
}
```

For solo mode, the 3 AI rivals should be auto-selected from RIVALS array (e.g., pick 3 that bracket the chosen rival's skill) rather than requiring manual selection.

---

## AI Personalities (CARS-02)

### Three Personality Types [ASSUMED — tuning values are estimates, require playtesting]

```javascript
const PERSONALITIES = {
  aggressive: {
    style: 'aggressive',
    speedMult: 1.05,       // 5% faster than skill-based speed
    lineMult: 0.7,         // takes tighter line (closer to apex)
    noiseAmp: 0.025,       // low noise — precise but risky
    brakeMult: 0.8,        // brakes less than normal
    damageMult: 1.5,       // deals more damage on collision
  },
  defensive: {
    style: 'defensive',
    speedMult: 0.92,       // slightly slower
    lineMult: 1.3,         // wider line through corners
    noiseAmp: 0.04,        // moderate variation
    brakeMult: 1.2,        // brakes earlier/harder
    damageMult: 0.8,       // absorbs collision better
  },
  consistent: {
    style: 'consistent',
    speedMult: 1.0,        // at-skill speed
    lineMult: 1.0,         // standard line
    noiseAmp: 0.02,        // very low noise
    brakeMult: 1.0,        // standard braking
    damageMult: 1.0,       // standard damage
  },
};
```

### Personality Assignment Strategy

For each race, assign one personality to each of the 3 AI cars. A natural mapping: one of each type per race. The selected rival (shown in rival-select) becomes AI car[1] with personality derived from skill tier:
- skill >= 0.92 (ELITE): aggressive
- skill >= 0.88 (EXPERTO): consistent  
- skill >= 0.84 (DURO): defensive or consistent
- skill < 0.84 (MEDIO): defensive

The other 2 AI cars can be auto-selected from nearby skill range in RIVALS, one per remaining personality type.

---

## Tunnel Overlay (TRACK-03)

### Mechanism [VERIFIED: MDN Canvas API]

The tunnel effect requires drawing a darkening overlay **on top of a car** that is inside the tunnel zone. The correct Canvas 2D pattern:

```javascript
// In the render section, after drawCar() calls, before HUD:
function drawTunnelOverlay() {
  // Tunnel zone defined by world-space bounding box (same coords as ROAD_SPINE tunnel section)
  // e.g., x: 300–440, y: 285–325 (approximate tunnel world coords)
  const TUNNEL_ZONE = { x1: 300, y1: 285, x2: 445, y2: 325 };

  cars.forEach(car => {
    if (car.x >= TUNNEL_ZONE.x1 && car.x <= TUNNEL_ZONE.x2 &&
        car.y >= TUNNEL_ZONE.y1 && car.y <= TUNNEL_ZONE.y2) {
      // Draw dark rectangle over the car's screen position
      const sp = project(car.x, car.y);
      ctx.save();
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(sp.x - 22, sp.y - 36, 44, 52);  // covers car footprint
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  });
}
```

**Alternative — polygon roof approach:** Draw a large dark polygon representing the tunnel roof covering the entire tunnel world-region in screen space (using `project()` on the 4 corners of the tunnel bounding box). This is drawn AFTER all cars so it sits "over" them. The polygon clips all cars that are beneath it without any per-car position check.

```javascript
function drawTunnelRoof() {
  // Project the 4 corners of the tunnel bounding box into screen space
  const tl = project(300, 285), tr = project(445, 285),
        br = project(445, 325), bl = project(300, 325);
  ctx.save();
  ctx.globalAlpha = 0.70;
  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();
  // Optional: draw tunnel portal edges (armco-style stripes)
  ctx.globalAlpha = 1;
  ctx.restore();
}
```

**Recommended approach:** Polygon roof (second approach). It darkens ALL cars inside the tunnel region simultaneously, avoids per-car checks, and visually looks like a roof drawn over the track segment. Draw it after all `drawCar()` calls in the render section.

### Tunnel Entry/Exit Detection

For determining if a car is in the tunnel (for audio effect in Phase 3), store a simple boolean on each car:

```javascript
car.inTunnel = (car.x >= TUNNEL_X1 && car.x <= TUNNEL_X2 &&
                car.y >= TUNNEL_Y1 && car.y <= TUNNEL_Y2);
```

The exact zone coordinates depend on final TRACK-01 geometry. Co-define the tunnel zone constants alongside the ROAD_SPINE update.

---

## Collision System Extension (CARS-03)

### Current State

`resolveCarCollision(a, b)` is already implemented and handles a pair of circle-objects. It:
1. Checks distance² < (CAR_RADIUS*2)²
2. Computes separation overlap and pushes cars apart
3. Computes relative velocity along collision normal
4. Reduces speed of both cars proportionally

### 4-Car Extension [VERIFIED: existing resolveCarCollision() code read]

```javascript
// All 6 pairs among 4 cars — called every racing frame
const PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

// In the racing phase of loop():
PAIRS.forEach(([i, j]) => {
  const a = cars[i], b = cars[j];
  if (a.finished || b.finished) return;
  // Compute approach velocity before resolving
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
  const nx = dx/dist, ny = dy/dist;
  const vA = Math.cos(a.angle)*a.speed*nx + Math.sin(a.angle)*a.speed*ny;
  const vB = Math.cos(b.angle)*b.speed*nx + Math.sin(b.angle)*b.speed*ny;
  if (resolveCarCollision(a, b)) {
    const relV = Math.abs(vA - vB);
    const baseDmg = Math.min(6, 1 + relV * 0.02);
    // Only player (cars[0]) accumulates damage for HUD display
    if (i === 0) {
      const playerIsAggressor = vA > vB + 5;
      cars[0].damage = Math.min(100, cars[0].damage + (playerIsAggressor ? baseDmg : baseDmg * 0.15));
      playCollisionSound();
    } else if (j === 0) {
      const playerIsAggressor = vB > vA + 5;
      cars[0].damage = Math.min(100, cars[0].damage + (playerIsAggressor ? baseDmg : baseDmg * 0.15));
      playCollisionSound();
    }
    // AI vs AI collisions: play sound if close to player (optional)
  }
});
```

**Pitfall:** Running all 6 pairs every frame is fine for 4 cars (6 distance checks per frame is negligible). Do NOT precompute or cache — cars move each frame.

---

## P4 HUD Classification (CARS-04)

### Current HUD Structure

`hud-pos` element shows `'1°'` or `'2°'`. The existing `cpScore()` function:
```javascript
const cpScore = c => c.finished ? Infinity : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
```

### 4-Car Extension

```javascript
function updateHUD() {
  // ... existing lap counter unchanged ...

  // Rank all 4 cars by cpScore
  const ranked = cars
    .map((c, i) => ({ i, score: cpScore(c) }))
    .sort((a, b) => b.score - a.score);  // highest score = ahead

  const playerRank = ranked.findIndex(r => r.i === 0) + 1;  // 1-based
  hudPos.textContent = `P${playerRank}`;

  // Overtake detection: was player rank lower last frame?
  if (playerRank < prevPlayerRank) {
    addFloatingText('¡LO PASÉ! ⚡', '#10b981', 240, 220, 20);
  }
  prevPlayerRank = playerRank;

  // Gap display (hudRole): distance to car ahead or behind
  // ... existing gap logic adapted for 4-car context ...
}
```

**DOM requirement:** `hud-pos` currently shows `'1°'` or `'2°'`. With 4 cars, change to `'P1'`/`'P2'`/`'P3'`/`'P4'` (already done for CARS-04 spec; `hudPos.textContent = 'P1'` etc.).

The existing `hudPos` DOM element in index.html (line 73: `<div class="hud-item hud-pos" id="hud-pos">P1</div>`) is ready — just update the text.

---

## Architecture Patterns

### System Architecture Diagram

```
User Input (keyboard / touch)
   │
   └──→ cars[0].isPlayer ? updateCar(car, dt, car.damage) : updateAI(car, dt)
                                    ↑
                            cars[] loop (4 iterations)

ROAD_SPINE (Monaco polyline) ──→ isOnTrack(x,y) ──→ max speed cap in updateCar/updateAI
AI_WAYPOINTS (Monaco) ──→ updateAI(car) ──→ car.wpIdx (per-car, independent)

Collision resolution:
  PAIRS [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]
    └──→ resolveCarCollision(cars[i], cars[j])
           └──→ if involves cars[0]: cars[0].damage += ...

Checkpoint system:
  cars[] → forEach → checkCheckpoints(car)
    └──→ car === cars[0] ? lap timing + floating text : silent

HUD update:
  cars[] → cpScore(c) → ranked → playerRank → hudPos
                                             → overtake detection

Render order (each frame):
  1. drawTrack()       ← Monaco environment (TRACK-02)
  2. drawCar(cars[3])  ← back-most AI first
  3. drawCar(cars[2])
  4. drawCar(cars[1])
  5. drawCar(cars[0])  ← player last (appears on top)
  6. drawTunnelRoof()  ← tunnel overlay after all cars
  7. off-track vignette (player-only)
  8. checkpoint flash
  9. floating texts
  10. damage bar
  11. lap timer

Net (multiplayer — unchanged):
  cars[1] ← remote.x/y/angle/speed/lap/cp from onMsg('pos')
  (cars[2]/[3] do not exist in multi mode)
```

### Recommended Project Structure (unchanged)
```
/
├── index.html       # Add nothing new for Phase 2 (HUD element already exists)
├── style.css        # No Phase 2 changes needed
└── game.js          # All Phase 2 work; grows from ~1300 to ~1600 lines
```

### Pattern 1: Per-Car Waypoint Index

**What:** Each AI car independently tracks which waypoint it is targeting.
**Why:** Prevents all AI cars from "snapping" to the same waypoint, which would make them all drive in lockstep.

```javascript
// WRONG — shared global (current):
let aiWpIdx = 0;
function updateAI(car, dt) {
  const wp = AI_WAYPOINTS[aiWpIdx];
  if (near(wp)) aiWpIdx = (aiWpIdx + 1) % AI_WAYPOINTS.length;
}

// CORRECT — per-car (target):
function updateAI(car, dt) {
  const wp = AI_WAYPOINTS[car.wpIdx];
  if (near(wp)) car.wpIdx = (car.wpIdx + 1) % AI_WAYPOINTS.length;
}
// car.wpIdx initialized to 0 in resetGame(), then independently increments
```

### Pattern 2: Render Z-Order for 4 Cars

**What:** Cars further from camera render first (painter's algorithm for pseudo-3D isometric).
**How:** In the isometric projection, "further from camera" means lower canvas Y — so sort cars by their canvas Y coordinate (not world Y).

```javascript
// In render section: sort by screen Y so closer cars (higher screen Y) paint last
const drawOrder = [...cars].sort((a, b) => {
  return project(a.x, a.y).y - project(b.x, b.y).y;
});
drawOrder.forEach((car, idx) => drawCar(car, cars.indexOf(car)));
```

However, for simplicity: draw in fixed order [3, 2, 1, 0] since cars start on the grid in order and rarely overlap on a track with a large spread. Fixed order is acceptable for Phase 2.

### Pattern 3: Monaco Environment Drawing (TRACK-02)

**What:** Color blocks representing Monaco environment features.
**Structure:** Draw in `drawTrack()` before the spine so the spine (tarmac) paints over the environment.

```javascript
function drawTrack() {
  // 1. Ground (base colour — grey city instead of green)
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(0, 0, 480, 640);

  // 2. Harbour water (blue area, bottom-right region)
  ctx.fillStyle = '#1a4a7a';
  // ... fillRect or polygon for harbour zone ...

  // 3. Casino building area (upper-right, grey/white)
  ctx.fillStyle = '#c8c8c4';
  // ... fillRect for casino block ...

  // 4. Armco barriers — drawn as thin colored stripes alongside the spine
  //    Use the same drawSpinePath() pattern but slightly wider, alternating red/white

  // 5. Pit lane strip (alongside main straight)
  ctx.fillStyle = '#1a1a1a';
  // ... fillRect for pit lane ...

  // 6. Kerb (red/white dash — existing pattern, reuse)
  // 7. Tarmac (dark grey — existing pattern, reuse)
  // 8. Racing line dashes (existing pattern, reuse)
  // 9. Start/finish chequered line
  // 10. META label
}
```

**Key visual landmarks required by success criteria:**
- Loews hairpin: tight U-bend visually
- Casino Square: recognizable as right-turn with building block
- Massenet: long left sweep
- Tunnel: roof polygon drawn over the tunnel segment
- Swimming Pool: left-right chicane with pool-colored rectangle
- Rascasse: tight right corner

### Anti-Patterns to Avoid

- **Global aiWpIdx:** Moving to `cars[]` but forgetting to move `aiWpIdx` into each car object. All 3 AIs would share one waypoint and cluster. CRITICAL bug.
- **Drawing tunnel overlay before cars:** The tunnel polygon must be drawn AFTER all `drawCar()` calls. Drawing it before means cars render on top of the tunnel roof — the car is visible inside the tunnel.
- **Checking `local.finished` and `remote.finished` directly after CARS-01 refactor:** Any surviving `local.finished` reference crashes with "Cannot read property 'finished' of undefined". Use a grep sweep after the refactor.
- **Running all 6 pairs per frame after checking `finished`:** Skip the pair if BOTH cars are finished (race over), but allow a finished car to still be involved in collision if only one has finished (the other car may not have finished yet and could still hit the stopped car).
- **Z-order not matching isometric perspective:** In isometric view, cars with higher canvas Y appear "closer" and should render on top. If a car above another in world space renders on top, it clips through incorrectly.
- **Monaco road spine not closing the loop:** `ROAD_SPINE` must start and end at the same point (or very close) for `isOnTrack()` to work correctly along the full lap. Check segment from last point back to first point.
- **Checkpoint radius too small for Monaco's narrow track:** With `ROAD_HALF_W = 60`, checkpoints with `r < 60` may miss cars driving near the edge. Keep checkpoint radii at 65–80px.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Track boundary check | Rewrite isOnTrack() | Keep `isOnTrack()` + `ptSegDist2()` unchanged; only replace ROAD_SPINE data | Algorithm is geometry-agnostic — works with any polyline |
| Tunnel darkening | Custom compositing or shader | `ctx.globalAlpha` + dark `fillRect` over tunnel segment | Canvas save/restore is the canonical pattern |
| Elastic car collision | Custom velocity decomposition | Extend existing `resolveCarCollision()` | Existing function already handles the normal + speed reduction correctly |
| Race position ranking | Database-style sort | Simple `cpScore()` sort over 4 cars | cpScore is already correct — just generalize to N cars |
| Per-car waypoint | Separate waypoint arrays | Single `AI_WAYPOINTS` array + `car.wpIdx` per car | Same waypoints, different cursor position per car |
| Personality weighting | Separate updateAI function per type | Single `updateAI()` with multipliers from `car.personality` | Less code duplication; personality is just a parameter set |

**Key insight:** Almost every system needed for Phase 2 already exists in game.js as a 2-car implementation. Phase 2 generalizes from N=2 to N=4, not from N=0 to N=4. The data changes; the algorithms stay.

---

## Common Pitfalls

### Pitfall 1: Surviving `local`/`remote` References After CARS-01

**What goes wrong:** After migrating to `cars[]`, stray references to `local` or `remote` remain. They produce `undefined` errors that surface only during gameplay (not on load).
**Why it happens:** `local` and `remote` appear in 30+ places across game.js. Missing even one causes runtime errors.
**How to avoid:** After completing CARS-01, run a text search for `/\blocal\b/` and `/\bremote\b/` in game.js and audit every result. The only valid survivor is the `selectedRival` logic where `rival` appears (different variable).
**Warning signs:** TypeError on first frame of racing phase; `local.x` or `remote.finished` errors in console.

### Pitfall 2: Monaco Polyline Not Forming a Closed Track

**What goes wrong:** Cars drive off the end of the track into void, or `isOnTrack()` returns false near the start/finish line.
**Why it happens:** ROAD_SPINE must include a closing segment from the last point back to the first point (or overlap with it). The current oval does this explicitly (`[82, 527]` appears as both point 0 and the final point).
**How to avoid:** Ensure `ROAD_SPINE[0]` === `ROAD_SPINE[ROAD_SPINE.length - 1]` (same coordinates). The closing segment is what makes the start/finish area on-track.
**Warning signs:** Car goes off-track when crossing finish line even though visually on the straight.

### Pitfall 3: All AI Cars Clustering at the Same Waypoint

**What goes wrong:** All 3 AI cars clump together and advance through waypoints in lockstep.
**Why it happens:** `aiWpIdx` is not moved to per-car state during CARS-01 refactor.
**How to avoid:** Stagger starting `wpIdx` values: car[1].wpIdx=0, car[2].wpIdx=2, car[3].wpIdx=4. This gives initial spread on the grid.
**Warning signs:** 3 AI cars appear to drive as one unit, same acceleration, same line.

### Pitfall 4: Tunnel Polygon Z-Order Wrong

**What goes wrong:** The tunnel roof is visible from outside the tunnel, OR cars are visible through the tunnel roof.
**Why it happens:** `drawTunnelRoof()` is called before the car draw calls, meaning cars paint over the roof.
**How to avoid:** Call `drawTunnelRoof()` AFTER all `drawCar()` calls in the render sequence.
**Warning signs:** Cars appear on top of the dark tunnel polygon; the tunnel effect doesn't darken the car.

### Pitfall 5: Monaco Track Doesn't Fit Canvas Bounds

**What goes wrong:** Parts of the circuit project outside the 480×640 logical canvas area, causing cars to drive into the canvas edge.
**Why it happens:** Monaco's proportions (long harbour run + tall Casino section) need careful scaling to fit 480×640.
**How to avoid:** After defining ROAD_SPINE, run a quick projection check on all points: `ROAD_SPINE.forEach(([x,y]) => { const p = project(x,y); console.log(p.x, p.y); })`. Verify all projected points fall within [0,480] × [0,640].
**Warning signs:** Track renders with corners visually cut off at canvas edges.

### Pitfall 6: cpScore Rank Unstable at Identical Scores

**What goes wrong:** Two cars at the same checkpoint and lap flip rank every frame, causing HUD to flicker.
**Why it happens:** `sort()` is not stable when two cpScores are equal.
**How to avoid:** Use Euclidean distance to next checkpoint as tiebreaker: if two cars have the same `cpScore`, the one physically closer to the next checkpoint ranks higher.
**Warning signs:** P1/P2 designation flickers rapidly when two cars are side by side on a straight.

### Pitfall 7: 4-Car Grid Doesn't Fit Main Straight

**What goes wrong:** At race start, cars appear stacked on top of each other or partially off-track.
**Why it happens:** Monaco main straight is narrow (fits within 60px ROAD_HALF_W). 4 cars in 2x2 formation may exceed that.
**How to avoid:** Design grid positions with ~30px lateral spread and ~30px longitudinal spacing. Check that each START position satisfies `isOnTrack(x,y)` before coding.
**Warning signs:** Cars start with immediate collision/overlap; `resolveCarCollision()` fires on frame 1.

---

## Code Examples

### Refactored resetGame() for cars[]

```javascript
// Source: refactored from existing resetGame() at game.js:1036
function resetGame() {
  // Select 3 AI rivals to race alongside the player
  // Simple rule: pick rivals bracketing the selected rival's skill
  const pivotIdx = RIVALS.indexOf(selectedRival);
  const aiIndices = [
    Math.max(0, pivotIdx - 1),
    Math.min(RIVALS.length - 1, pivotIdx + 1),
    Math.min(RIVALS.length - 1, pivotIdx + 2),
  ].filter((v, i, a) => a.indexOf(v) === i);  // dedupe

  // Assign personalities
  const personTypes = ['aggressive', 'defensive', 'consistent'];

  cars = [
    // cars[0] — player
    Object.assign(makeCar(0), { isPlayer: true, damage: 0, wpIdx: 0,
      personality: null }),
    // cars[1–3] — AI opponents
    ...aiIndices.slice(0, 3).map((rIdx, k) =>
      Object.assign(makeCar(k + 1), {
        isPlayer: false, damage: 0,
        wpIdx: k * 2,  // stagger starting waypoint
        personality: Object.assign({},
          PERSONALITIES[personTypes[k]],
          { skill: RIVALS[rIdx].skill }
        ),
        rivalData: RIVALS[rIdx],
      })
    ),
  ];

  winner = null;
  // ... rest of reset (countdown, lapStartTime, etc.) unchanged ...
}
```

### Extended loop() racing phase structure

```javascript
// Source: refactored from game.js:836
} else if (phase === 'racing') {
  // 1. Update all cars
  cars.forEach(car => {
    if (car.isPlayer) {
      updateCar(car, dt, car.damage);
    } else {
      updateAI(car, dt);
    }
    checkCheckpoints(car);
  });

  // 2. Collision — all 6 pairs
  PAIRS.forEach(([i, j]) => {
    const a = cars[i], b = cars[j];
    if (a.finished || b.finished) return;
    // ... collision logic per CARS-03 section above ...
  });

  // 3. HUD
  updateHUD();

  // 4. Render
  drawTrack();
  // Draw in reverse rank order so leading car renders on top
  [...cars].reverse().forEach((car, idx) => drawCar(car, cars.indexOf(car)));
  drawTunnelRoof();  // AFTER cars

  // 5. Player-only effects
  const onTrk = isOnTrack(cars[0].x, cars[0].y);
  // ... off-track vignette, damage, etc. gates on cars[0] ...

  // 6. Win detection
  if (!winner) {
    if (cars[0].damage >= 100) { winner = -1; /* player destroyed */ }
    else {
      cars.forEach((car, i) => { if (car.finished && winner === null) winner = i; });
    }
    if (winner !== null) { stopEngine(); stopBrakeSound(); phase = 'done'; }
  }
}
```

---

## Monaco Environment Visual Reference

The success criteria requires these landmarks to be **recognizable** (not pixel-perfect):

| Landmark | Canvas Region (approx) | Visual Treatment |
|----------|----------------------|-----------------|
| Start/finish straight | Bottom of canvas, horizontal | Dark tarmac + chequered line |
| Sainte-Dévote right turn | Bottom-right curve | Tight curve visible in spine |
| Casino / Mirabeau plateau | Upper portion | Light grey building block |
| Grand Hotel Hairpin | Upper-right U-turn | The tightest curve in the polyline |
| Tunnel | Middle-right horizontal run | Dark polygon roof over segment |
| Nouvelle Chicane | Post-tunnel braking | Left-right kink in spine |
| Tabac / Swimming Pool | Bottom-right harbour run | Blue-grey water block |
| La Rascasse | Bottom-right curve back | Tight right before straight |
| Armco barriers | Along full spine | Thin red/white alternating stripes |
| Harbour water | Right side of canvas | Blue fill block |
| Casino buildings | Upper-right | Grey fill block |

**Drawing strategy:** Fill large background blocks first (harbour, casino area, general road grey), then draw the ROAD_SPINE on top. The spine tarmac will visually divide and define the sections.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Single AI waypoint index (global `aiWpIdx`) | Per-car `car.wpIdx` | Required for independent AI navigation |
| Binary local/remote | cars[] array | Required for 4-car races |
| Static oval `ROAD_SPINE` | Monaco polyline | New data; same algorithm |
| `winner = 'local'|'remote'` | `winner = 0|1|2|3|null` | Winner determined by cars[] index |
| HUD: 1° or 2° | HUD: P1/P2/P3/P4 | More positions; cpScore rank over 4 cars |
| Single damage tracker (`localDamage`) | `car.damage` per car (only player's rendered) | Moved to car object |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Monaco polyline coordinates (28 points) produce a recognizable circuit in 480×640 canvas | Monaco Geometry | Shape doesn't resemble Monaco; requires coordinate iteration |
| A2 | Checkpoint positions for Monaco (4 CPS) are positioned on-track | TRACK-04 | Cars cannot complete laps; race never ends |
| A3 | Starting grid as 2×2 formation fits on main straight without overlap | Starting Grid | Cars start colliding immediately; must adjust grid positions |
| A4 | Personality multipliers (speedMult, brakeMult) are balanced enough to be competitive vs player | CARS-02 | AI too fast/slow; requires playtesting iteration |
| A5 | Tunnel zone world coordinates (x1:300, y1:285, x2:445, y2:325) correspond to tunnel segment | TRACK-03 | Tunnel overlay appears in wrong location; must adjust to match final ROAD_SPINE |
| A6 | Drawing order [3,2,1,0] for fixed z-order works adequately | Architecture Patterns | Cars clip through each other visually on tight corners; dynamic sort may be needed |
| A7 | AI_WAYPOINTS count of ~20 points is sufficient for Monaco's 19 corners | TRACK-01 | AI cuts corners or leaves track; increase waypoint density near hairpins |
| A8 | Multi mode remains 1v1 (2 cars) in Phase 2 | CARS-01 Blueprint | If user expects 4-car multi, architecture differs significantly |

---

## Open Questions (RESOLVED)

1. **Monaco polyline visual quality**
   - What we know: Coordinate system is 480×640 world space projected through `project()`
   - What's unclear: Whether 28 points produces a shape visually recognizable as Monaco without more iteration
   - Recommendation: Plan a dedicated visual verification task as the first item of the TRACK-01 plan. Agent draws the spine, human verifies, agent adjusts. Budget 2-3 rounds.
   - RESOLVED: Dedicated visual verification checkpoint task included in 02-02 (checkpoint:human-verify gate), budgeting 2-3 iteration rounds to achieve recognizable Monaco proportions.

2. **AI_WAYPOINTS count for Monaco**
   - What we know: Current oval uses 18 waypoints for a simple oval; Monaco has 19 corners of varying tightness
   - What's unclear: How many waypoints are needed for the AI to navigate the Hairpin and Rascasse without going off-track
   - Recommendation: Start with 22–25 waypoints, with extra density at tight corners (Hairpin, Rascasse, Swimming Pool chicane). The AI_WP_REACH radius (currently 45px) may need to decrease to ~30px for tighter Monaco corners.
   - RESOLVED: 22–25 waypoints with `AI_WP_REACH = 30` — mandated in 02-02 Task 1 acceptance criteria.

3. **Multiplayer scope in Phase 2**
   - What we know: STATE.md says "4 cars = 1 player + 3 AIs" and "multiplayer mesh is v3+"
   - What's unclear: Whether Phase 2 should disable multiplayer mode entirely (simpler) or retain 1v1 multi without AI cars
   - Recommendation: Retain 1v1 multiplayer as-is. In multi mode, `cars` has length 2 (local + remote). AI cars are solo-only. This matches current architecture and STATE.md intent.
   - RESOLVED: Retain 1v1 multiplayer. Solo mode uses `cars[length=4]`, multi mode uses `cars[length=2]` (local + remote, no AI cars). Implemented in 02-01 Task 1.

4. **AI Waypoint starting stagger**
   - What we know: Starting 3 AI cars all at wpIdx=0 causes clustering at race start
   - What's unclear: Optimal stagger values — starting at wpIdx=2 and wpIdx=4 may not provide enough spread
   - Recommendation: Initialize AI waypoint indices to match their starting grid position along the circuit. Since all cars start at the same location, a small stagger (1–3 waypoints) helps spread them immediately.
   - RESOLVED: Stagger `wpIdx` at init — `cars[1].wpIdx=0`, `cars[2].wpIdx=2`, `cars[3].wpIdx=4` — mandated in 02-01 Task 1 acceptance criteria.

---

## Environment Availability

This phase is code-only (no external dependencies beyond what Phase 1 already established).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser Canvas 2D | All rendering | Confirmed existing | Native | — |
| Browser (any modern) | All features | Confirmed (game already runs) | — | — |
| PeerJS CDN | Multiplayer | Already loaded in index.html | 1.5.4 | — |

**No new dependencies introduced in Phase 2.**

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation: false` in `.planning/config.json`.

---

## Security Domain

> No new authentication, session management, or external data ingestion in Phase 2. The only network messages are the existing PeerJS pos/finish/start messages (already validated in `onMsg()`). No new ASVS categories apply.

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `game.js` full read (1397 lines) — all touch-points for local/remote, AI system, collision, HUD, rendering
- `index.html` full read — HUD DOM elements, screen structure
- `.planning/REQUIREMENTS.md` — TRACK-01 through CARS-04 requirement text
- `.planning/STATE.md` — build order mandate, Phase 2 architectural decisions
- `.planning/ROADMAP.md` — Phase 2 success criteria

### Secondary (MEDIUM confidence — verified web sources)
- Wikipedia "Circuit de Monaco" — corner sequence, circuit characteristics [CITED: en.wikipedia.org/wiki/Circuit_de_Monaco]
- total-motorsport.com — corner names and directions [CITED: total-motorsport.com/monaco-gp-corner-names-circuit-de-monaco]
- oversteer48.com — turn-by-turn sequence [CITED: oversteer48.com/monaco-track-layout-drs-zones-corner-names]
- Multiple F1 sources confirming clockwise direction [CITED: sportskeeda.com/f1/5-anti-clockwise-circuits-in-f1-this-year confirms Monaco is clockwise]
- MDN Canvas API — `globalAlpha`, `save`/`restore`, `clip()`, compositing [CITED: developer.mozilla.org/en-US/docs/Web/API/Canvas_API]
- spicyyoghurt.com — elastic circle collision algorithm [CITED: spicyyoghurt.com/tutorials/html5-javascript-game-development/collision-detection-physics]

### Tertiary (LOW confidence — training knowledge / assumed)
- Monaco polyline coordinates: designed from circuit description, NOT verified visually [ASSUMED]
- AI personality multiplier values: estimated from game feel intuition [ASSUMED]
- Starting grid positions: estimated from track geometry [ASSUMED]
- Tunnel zone world coordinates: estimated, dependent on final ROAD_SPINE [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- CARS-01 refactor scope: HIGH — every touch-point inventoried from full game.js read
- Monaco corner sequence and direction: HIGH — verified across 3 independent sources
- Monaco canvas coordinates: LOW — approximations requiring visual iteration
- Checkpoint positions: LOW — depend on final polyline; co-defined during implementation
- Personality system design: MEDIUM — sound architecture, tuning values need playtesting
- Tunnel overlay mechanism: HIGH — standard Canvas 2D `globalAlpha` + polygon
- Collision pair extension: HIGH — trivial generalization of verified existing code
- P4 HUD: HIGH — trivial generalization of existing cpScore/rank logic

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (stable codebase; Monaco circuit geometry does not change)
