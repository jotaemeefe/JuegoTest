# Architecture Research: Chase-Cam Pseudo-3D Migration

**Domain:** Browser arcade racer — migrating a top-down 2D racer (closed Monaco loop) to a
third-person chase-cam pseudo-3D (OutRun-style road-segment) racer with kart-style drift and
point-to-point branching stages.
**Researched:** 2026-08-15
**Confidence:** HIGH for what current `game.js` does (read directly, line-referenced below).
MEDIUM-HIGH for pseudo-3D segment-renderer and kart-drift conventions (verified against Jake
Gordon's canonical "how to build a racing game" tutorial series and Lou's Pseudo 3D Page —
this is well-trodden, 20+ year old genre territory with a standard, widely-replicated technique,
but no Context7-indexed library exists for it since it's a from-scratch Canvas 2D algorithm,
not a package).

## Standard Architecture

### System Overview — current vs. target pipeline

```
CURRENT (top-down, north-up, closed loop)              TARGET (chase-cam, pseudo-3D, point-to-point)
┌──────────────────────────────┐                       ┌──────────────────────────────┐
│ ROAD_SPINE (57 pts, x/y)      │  REPLACE              │ SEGMENTS[] track-space table  │
│ + SPINE_CUMLEN prefix-sum     │ ───────────────────►  │ (z, curve, elevation, width,  │
│ + AI_WAYPOINTS (55 pts)       │                       │  color, sprites) + BRANCH     │
│ + CPS[] gates                 │                       │ GRAPH (nodes/edges)           │
└──────────────┬────────────────┘                       └──────────────┬────────────────┘
               │                                                        │
┌──────────────▼────────────────┐                       ┌──────────────▼────────────────┐
│ Car state: x,y,angle,speed,    │  PARTIAL REWRITE      │ Car state: edgeId, z, offset, │
│ velAngle (world-space)         │ ───────────────────►  │ speed, driftDir/Charge,       │
│ moveCar()/updateCar()/updateAI │  (extend accel/brake/  │ heading (visual only)         │
│ ACCEL_RATE, TURN_RATE,         │   drift-lag math;      │ moveCar()/updateCar()/updateAI│
│ GRIP_ON/OFF micro-drift        │   rewrite coord system)│ same math, track-space coords │
└──────────────┬────────────────┘                       └──────────────┬────────────────┘
               │                                                        │
┌──────────────▼────────────────┐                       ┌──────────────▼────────────────┐
│ buildEnvCanvas() — ONE static  │  REPLACE (renderer)   │ Per-frame scanline segment    │
│ top-down raster, drawn via     │ ───────────────────►  │ projector: draws N trapezoids │
│ ctx.drawImage every frame      │  REUSE (asset pipeline)│ per frame from camera z, using│
│ drawCar() rotates a top-down   │                       │ tileSheet/crowdSheet as source│
│ sprite by car.angle            │                       │ art for road/roadside sprites;│
│ Camera: translate-only, north  │                       │ car sprite = fixed-position,  │
│ -up (ctx.translate(camX,camY)) │                       │ frame-selected, not rotated   │
└──────────────┬────────────────┘                       └──────────────┬────────────────┘
               │                                                        │
┌──────────────▼────────────────┐                       ┌──────────────▼────────────────┐
│ trackProgress() — single       │  REPLACE (algorithm)  │ Branch-aware progress:        │
│ global arc-length scalar       │ ───────────────────►  │ nodes-passed + normalized     │
│ carAhead()/DRS/overtakes/rank  │  REUSE (event/cooldown│ fractional edge completion;   │
│ all compare this one number    │   patterns: RANK_     │ same-edge guard added to      │
│                                 │   CONFIRM_MS etc.)    │ DRS/collision/AI proximity    │
└──────────────┬────────────────┘                       └──────────────┬────────────────┘
               │                                                        │
┌──────────────▼────────────────┐                       ┌──────────────▼────────────────┐
│ Net: pos={x,y,angle,speed,     │  REPLACE (payload)    │ pos={edgeId,z,offset,speed,   │
│ lap,cp} @ 50ms, world-bounds   │ ───────────────────►  │ heading,driftState} @ 50ms;   │
│ range validation               │  REUSE (PeerJS IIFE,  │ edge-relative bounds check;   │
│ remoteRenderPos() dead-reckon  │   cadence, dead-reckon,│ opponent rendered only when   │
│                                 │   unreliable channel)  │ co-located on same edge       │
└────────────────────────────────┘                       └────────────────────────────────┘
```

### Component Responsibilities

| Component | Current Responsibility (game.js ref) | Target Responsibility | Decision |
|-----------|----------------------------------------|------------------------|----------|
| Track data | `ROAD_SPINE` (57pt polyline, line 35), `SPINE_CUMLEN` (line 85), `ROAD_HALF_W` (line 34) | `SEGMENTS[]` dense uniform table (z/curve/elevation/width/color/sprites) + branch graph (nodes/edges) | **Replace** — resolution and shape are wrong for a scanline projector |
| AI navigation line | `AI_WAYPOINTS` (55pt, line 203) | Per-edge waypoint/steering-target list, same density pattern | **Extend** — density precedent is right, just needs branch awareness |
| Car state model | `makeCar()` (line 299): x,y,angle,speed,velAngle, world-space | Track-space: edgeId,z(distance along edge),offset(lateral),speed,driftCharge,heading(visual) | **Partial rewrite** — coordinate system changes, per-frame update *shape* (accelerate→cap, steer, drift-lag) survives |
| Acceleration/braking model | `ACCEL_RATE` exponential approach (line 11), `BRAKE_FORCE` flat decel (line 12) | Same model, same constants as starting point | **Reuse/extend** — already "real caps" per 03b-04 fix, good arcade foundation |
| Drift feel | `GRIP_ON`/`GRIP_OFF` velAngle lag (line 1223) — currently tuned as *micro*-drift | Explicit drift state machine (button-held, charge, mini-turbo release) layered on the same lag mechanic | **Extend** — the lag-between-heading-and-velocity primitive IS the drift primitive the genre needs; add state, don't replace the math |
| Wall/track collision | `isOnTrack`/`nearestSpinePoint`/`applyWallContact` (lines 1165-1257), tied to `ROAD_SPINE`+`ROAD_HALF_W` | Track-space bounds check (offset vs. per-segment half-width) | **Replace** — depends entirely on the world-space spine being replaced |
| Car-car collision | `resolveCarCollision()` impulse-based bump-and-run (line 1290) | Same impulse math, operating on lateral offset instead of world x/y; same-edge guard added | **Extend** |
| World renderer | `buildEnvCanvas()` static top-down raster (line 781), `drawTrack()` (line 963) | Per-frame segment/scanline projector | **Replace** |
| Camera | `updateCamera()` translate-only north-up (line 1791) | Chase-cam: fixed screen-space car position, world scrolls via segment projection driven by camera z | **Replace** |
| Car sprite rendering | `drawCar()` rotates a top-down rect via 2D matrix (line 1055) | Fixed-position sprite, frame-selected (steer-L/straight/steer-R/drift), scaled by projected depth for traffic | **Replace** (technique), reuse car color/style data (`CAR_STYLE_HOST`, `RIVALS[].body/accent/helmet`) |
| Pixel-art asset pipeline | `tileSheet`/`pixelTiles`, `crowdSheet`/`crowdSprites`, `drawPixelSprite()`, `finalizePixelEnvironment()` palette quantization (lines 680-779) | Same tile/sprite extraction + nearest-neighbor blit conventions, reapplied as road-surface bands and roadside billboard/tree sprites | **Reuse** — generic Canvas 2D pixel-art utility, camera-agnostic |
| Progress/ranking | `trackProgress()` (line 1198), `carAhead()` (line 1329), `crossedFinish()` (line 1214) | Branch-normalized progress (nodes-passed + fractional edge completion); finish = z≥finishZ on terminal edge | **Replace** — single-arc-length assumption breaks under branching |
| Overtake/DRS event timing | `RANK_CONFIRM_MS`/`OVERTAKE_CD_MS` debounce (lines 364-365), `isInDrsZone()` (line 1340) | Same debounce pattern, re-driven by branch-aware progress; DRS zone becomes per-edge flag | **Reuse pattern, rewire inputs** |
| VFX (skid/spark/flash/tint) | `addSkid`/`drawSkidMarks`, `spawnSparks`/`drawSparks`, `drawDamageTint`, `drawSpeedLines`, `triggerShake` | Same techniques, screen-space or car-relative math — position source changes | **Reuse** |
| Audio | Web Audio synths, `startEngine`/`startBrakeSound`/music sequencer | Unchanged | **Reuse fully** |
| Multiplayer transport | `Net` PeerJS IIFE (line 380), 50ms `pos` broadcast, `remoteRenderPos()` (line 1144) | Same transport/cadence/dead-reckoning technique, new payload shape, branch-aware opponent visibility | **Reuse transport, replace payload + rendering rule** |
| Screen/phase state machine | `goTo()`, `phase` (countdown/racing/done), `loop()`/`startLoop`/`stopLoop` | Unchanged structurally; `phase==='done'` condition changes from lap-count to node-reached | **Reuse** |

## Recommended Project Structure

The project's hard constraint (CLAUDE.md/PROJECT.md) is **no bundler, no `package.json`** — not
literally "one file." `game.js` is already ~2,700 lines and this migration adds a segment
renderer, a branch graph, and a drift state machine on top. Recommend splitting into a small
number of plain `<script>`-tag files (load order = dependency order), still zero build step:

```
/ (repo root)
├── index.html                 # <script> tags in dependency order, no bundler
├── style.css
├── track-data.js               # NEW: SEGMENTS[] table, branch graph, per-stage authoring data
├── physics.js                  # REWRITE of updateCar/updateAI/moveCar — track-space coords
├── render-3d.js                 # NEW: segment projector, camera, car-sprite compositor
├── render-assets.js             # MOVED (mostly unchanged): tileSheet/crowdSheet pixel pipeline
├── progress.js                  # NEW: branch-aware progress/ranking/DRS-zone/overtake logic
├── net.js                       # MOVED (near-unchanged): PeerJS IIFE + pos payload (schema changes)
├── audio.js                     # MOVED (unchanged): Web Audio synths
└── game.js                      # game loop, phase state machine, screen mgmt, input, HUD glue
```

### Structure Rationale

- **`track-data.js` separate from `physics.js`:** stage content (a specific point-to-point
  circuit with jumps/branches) will churn far more than the simulation code that consumes it —
  keeping them in different files means new stages ship without touching physics, mirroring how
  `ROAD_SPINE`/`AI_WAYPOINTS` are already segregated at the top of today's `game.js`.
- **`render-3d.js` separate from `render-assets.js`:** the *projection algorithm* (how a segment
  becomes a screen trapezoid) is stable engine code; the *asset extraction* (tile-sheet slicing,
  palette quantization) is stable utility code reused verbatim from today's `buildEnvCanvas()`
  helpers — separating them means the renderer rewrite doesn't require touching or re-testing the
  asset pipeline.
- **`progress.js` separate from `physics.js`:** progress/ranking consumes car state but has
  fundamentally different concerns (graph traversal, event debouncing) from per-frame integration
  math — today's code already keeps `trackProgress()`/`carAhead()` as pure functions taking a car,
  so this split is a natural continuation, not a new discipline.
- **This is a recommendation, not a requirement** — if the team prefers to keep everything in
  `game.js` per current convention, every function/data-structure boundary above still applies as
  an *internal* section boundary; the multi-file split just makes the size increase manageable and
  makes it easier for a future AI/developer session to load only the relevant slice.

## Architectural Patterns

### Pattern 1: Track-space car state (z + lateral offset, not world x/y)

**What:** Replace `car.x`/`car.y`/`car.angle` (arbitrary 2D world coordinates + heading) with
`car.edgeId` (which branch-graph edge it's on), `car.z` (distance along that edge), and
`car.offset` (signed lateral distance from the edge's centerline). `car.heading` becomes a
purely *visual* value (drives sprite frame selection and camera-relative bank/tilt), not an input
to movement integration.

**When to use:** Any OutRun-style pseudo-3D racer — this is the standard genre convention because
it's what the scanline projector needs (each segment is authored/generated at a known z with a
known curve/elevation, so "where is the car" must already be expressed in that same z-space to be
projected), and it's what makes "ahead/behind" and branch-relative ranking trivial arithmetic
instead of nearest-point-on-polyline geometry.

**Trade-offs:** Pro — collision/progress/DRS-zone/multiplayer-bounds-check code all get *simpler*
(1D bounds checks instead of 2D point-to-segment distance across a 57-point polyline every car
every frame). Con — every function that currently reads `car.x`/`car.y` directly
(`isOnTrack`, `nearestSpinePoint`, `resolveCarCollision`, `crossedFinish`, `trackProgress`,
`drawMinimap`, `remoteRenderPos`) must be rewritten, not just wrapped — this is the single
largest-surface-area change in the migration.

**Example (illustrative, not literal migration code):**
```javascript
// BEFORE (game.js line ~299): world-space car
function makeCar(idx) {
  const s = START[idx];
  return { x: s.x, y: s.y, angle: s.a, speed: 0, velAngle: s.a, /* ... */ };
}

// AFTER: track-space car
function makeCar(edgeId) {
  return {
    edgeId, z: 0, offset: 0, speed: 0,
    heading: 0,          // visual only — sprite frame selection, not integrated into movement
    driftDir: 0, driftCharge: 0, isDrifting: false,   // NEW: kart-drift state
    // ...same accel/brake/damage/DRS/rubber fields as today, unchanged shape
  };
}
```

### Pattern 2: Segment table + scanline projector (OutRun-clone rendering)

**What:** A dense, *uniformly spaced* array of segments (one every ~100-200 world units along
the route), each carrying `curve` (signed, eased between neighbors), `y` (elevation), `width`,
`color` (for kerb/rumble-strip banding), and optional roadside sprite placements. Every frame,
starting from the camera's current z, the renderer walks forward through however many segments
are visible (draw distance), accumulates a running curve/elevation offset, and projects each
segment's near/far edge into screen space via similar-triangles perspective
(`scale = cameraDepth / segment.z-relative-to-camera`), drawing each as a horizontal trapezoid
back-to-front.

**When to use:** This *is* the chase-cam pseudo-3D look the milestone requires — there is no
partial version of this; `buildEnvCanvas()`'s "prebake once, blit every frame" approach cannot
produce it because the visible geometry changes every frame with camera z, unlike a static
north-up world.

**Trade-offs:** Pro — well-understood, cheap on Canvas 2D (no WebGL required, matches the "vanilla
JS, no bundler" constraint), naturally produces jumps/hills via the elevation channel (a stated
v3.0 goal: "saltos, curvas únicas"). Con — car-car and car-track spatial reasoning that today
reads world x/y (`resolveCarCollision`, AI avoidance cone math in `updateAI`) must be re-derived
from (z, offset) pairs instead; sprite art direction changes from "rotatable top-down car" to
"a handful of fixed view-angle frames," which is a new art requirement, not just code.

**Example (illustrative — standard technique, not literal migration code):**
```javascript
// Segment table: replaces ROAD_SPINE + SPINE_CUMLEN
const SEGMENTS = []; // built by track-data.js from authored waypoints, resampled to fixed length
for (let n = 0; n < segmentCount; n++) {
  SEGMENTS.push({
    index: n, z: n * SEGMENT_LENGTH,
    curve: curveAt(n),      // signed; negative = left, positive = right; eased between corners
    y: elevationAt(n),      // NEW channel — jumps/hills, absent from ROAD_SPINE entirely
    width: widthAt(n),      // per-segment, not the global ROAD_HALF_W constant
    color: (n % 2) ? 'dark' : 'light',
  });
}

// Per-frame: project a segment relative to camera (z, cameraHeight, cameraDepth)
function projectSegment(seg, cameraZ, cameraY, cameraDepth, screenW, screenH) {
  const relZ = seg.z - cameraZ;
  if (relZ <= 0) return null;             // behind camera
  const scale = cameraDepth / relZ;
  return {
    screenY: screenH / 2 - scale * (seg.y - cameraY) * screenH / 2,
    screenW: scale * seg.width * screenW / 2,
    scale,
  };
}
```

### Pattern 3: Branch-normalized progress (nodes-passed + fractional edge completion)

**What:** A branch graph — nodes (splits/merges/start/finish) and edges (each edge owns its own
segment sub-table and length). Car progress = `nodesPassedToward(finish) * NORMALIZED_UNIT +
(car.z / currentEdge.length)`, i.e. **fraction of the current edge completed**, not raw distance —
this is what makes a shorter/twistier branch and a longer/faster branch comparably rankable.

**When to use:** As soon as any stage has more than one path choice mid-route; without it, ranking
degenerates to "whoever picked the longer edge looks like they're losing" regardless of actual
pace.

**Trade-offs:** Pro — directly reuses today's debounce pattern (`RANK_CONFIRM_MS`/
`OVERTAKE_CD_MS`, `confirmedRank`/`pendingRank`) with the input swapped from raw arc-length to
this normalized value. Con — DRS-zone detection, car-car collision pairing (`collisionPairs()`,
today gated only by `|progress diff| < 140`), and AI defensive-block/avoidance logic all need an
explicit **same-edge guard** added — two cars can have near-identical normalized progress while
being on physically different, non-adjacent branches, and today's proximity-only checks would
falsely treat them as touching/drafting/overtaking.

**Example (illustrative):**
```javascript
function branchProgress(car) {
  const edge = EDGES[car.edgeId];
  const fraction = Math.min(1, car.z / edge.length);
  return edge.nodesFromStart * PROGRESS_UNIT + fraction * PROGRESS_UNIT;
}

// Same-edge guard, added to today's proximity checks (collisionPairs, carAhead, DRS zone)
function isSpatiallyNear(a, b) {
  return a.edgeId === b.edgeId && Math.abs(a.z - b.z) < PROXIMITY_THRESHOLD;
}
```

## Data Flow

### Per-frame flow (target architecture)

```
Input (keys/touch) + AI decision
        ↓
physics.js: updateCar()/updateAI() — accelerate toward cap, steer, drift-state machine
        ↓ (mutates car.z, car.offset, car.speed, car.driftCharge — track-space, not x/y)
physics.js: moveCar() — integrate z/offset, wall/edge-bounds contact, car-car collision (same-edge)
        ↓
progress.js: branchProgress(car) cached once per frame → ranking, DRS zone, overtake events
        ↓
render-3d.js: projector walks SEGMENTS[currentEdge] forward from camera z → scanline trapezoids
        ↓
render-3d.js: composite car sprites (fixed player position; scaled/positioned traffic by projected depth)
        ↓
game.js: HUD overlay (screen-space, unchanged), VFX (skid/spark/flash, position source updated)
        ↓
net.js (multiplayer only): broadcast {edgeId, z, offset, speed, heading, driftState} @ 50ms
```

### Key Data Flows

1. **Track authoring → runtime segment table:** stage designers author sparse waypoints/branch
   points (continuing today's `ROAD_SPINE`-style hand-authoring convenience) in `track-data.js`;
   a build-time-or-load-time resample step turns that into the dense, uniform `SEGMENTS[]` table
   the projector actually walks — keeping the ergonomic authoring format while producing the
   renderer's required data shape.
2. **Physics → progress → ranking/DRS/overtakes:** unchanged *shape* from today (cache a
   progress-like scalar once per racing frame, everything else reads the cache) — only the
   scalar's derivation changes from arc-length-on-a-single-spine to nodes-passed-plus-fraction.
3. **Physics → renderer:** today the renderer (`buildEnvCanvas`) does not depend on live car state
   at all (it's prebaked once); in the target architecture the renderer depends on `car.z`/
   `car.offset` every single frame (camera position *is* car position + lookahead) — this is the
   most structurally different data flow in the whole migration.
4. **Multiplayer → local render:** today, a remote position is *always* drawable because there's
   one shared world space; in the target architecture, a remote position is only drawable when
   `remote.edgeId === local.edgeId` and within draw distance — otherwise the opponent must be
   represented as a HUD gap indicator instead of a rendered sprite (see Q5 discussion below).

## Scaling Considerations

The "scale" axis for this project isn't concurrent users (it's a static-hosted client-side game)
— it's **car count** and **stage complexity** (segment count, branch count):

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2 cars (1v1 multiplayer), 1 straight test edge | Validates the projector and physics rewrite in isolation before any branching or AI work — this should be the first playable milestone |
| 2 cars (VS CPU duel), 1 edge with corners+elevation | Validates AI adaptation to track-space steering/avoidance and drift-assisted cornering |
| 2 cars, branching stage (2-3 forks) | Validates branch-graph progress normalization and same-edge collision/DRS guards |
| 22 cars (solo Grand-Prix-equivalent), branching stage | `collisionPairs()`'s current O(n²) pairing (line 176) plus per-car `isOnTrack`/`nearestSpinePoint`-equivalent checks scale the same way they do today — the real new cost is per-frame segment projection, which is bounded by draw-distance segment count (constant per frame, independent of car count), so 22-car scaling risk is unchanged from today's baseline, not worsened by the renderer swap |

### Scaling Priorities

1. **First bottleneck:** segment draw-distance vs. mobile frame budget — the projector draws a
   fixed number of trapezoids every frame regardless of car count; this number (not car count) is
   the first thing to tune for the "runs well on mobile" constraint (PROJECT.md: iOS/Safari
   included). Classic OutRun-clones keep this in the low hundreds of segments for exactly this
   reason.
2. **Second bottleneck:** traffic-car sprite scaling — compositing many AI cars at varying
   projected depths (22-car Grand-Prix-equivalent mode) needs a simple far-to-near sort per frame
   (today's code already sorts `for (let i = cars.length - 1; i >= 0; i--) drawCar(...)` for
   z-ordering in the top-down view at line 2060/2112/2138 — the same "draw far things first"
   discipline applies, just keyed on projected depth instead of array index).

## Anti-Patterns

### Anti-Pattern 1: Reusing `buildEnvCanvas()`'s prebake-once technique for the chase-cam view

**What people do:** Try to save renderer-rewrite effort by prebaking the new track's visuals into
one big offscreen canvas and drawImage-ing a viewport-sized crop of it every frame, the way
`buildEnvCanvas()`/`drawTrack()` do today.
**Why it's wrong:** A chase-cam pseudo-3D view is not a rectangular crop of a larger flat image —
each frame's road width, curvature offset, and horizon depend on a *perspective projection* from
the current camera z, which a flat prebaked raster cannot represent (curves and hills would look
wrong/undistorted from a moving perspective). This is the entire reason genre convention draws the
road fresh every frame from a segment table.
**Instead:** Prebake *only* the reusable, camera-independent assets (tile textures, sprite
cutouts — exactly what `tileSheet`/`crowdSheet` extraction already does) and project/composite
them fresh per frame via the scanline algorithm.

### Anti-Pattern 2: Keeping world x/y as the source of truth and bolting a projector on top

**What people do:** Try to minimize the rewrite by keeping `car.x`/`car.y` (today's model) as the
authoritative state and writing a projector that converts x/y → screen space by first finding
"where on the route" the car is (nearest-point-on-polyline, same technique as today's
`nearestSpinePoint`).
**Why it's wrong:** Once branches exist, two edges can pass near each other in world space
(exactly the kind of near-miss the current Monaco spine was hand-tuned to *avoid*, per
`CLAUDE.md`'s note on 220+px separation between Beau Rivage and Swimming Pool) — a
nearest-point-on-polyline lookup can silently snap a car's derived track-position onto the *wrong*
branch. This is a correctness bug specific to branching, not present in the current closed-loop
design, and it's also strictly more expensive per frame (O(segment count) nearest-point search)
than just storing (edgeId, z) directly.
**Instead:** Make (edgeId, z, offset) the authoritative state (Pattern 1); derive a world-space
point from it only when needed for a specific rendering/VFX purpose, never the reverse.

### Anti-Pattern 3: Treating multiplayer opponent rendering as "just another car in the same view"

**What people do:** Assume the existing `remoteRenderPos()`/`drawCar(cars[1])` pattern (always
render the remote car, dead-reckoned) continues to work unmodified once branching ships.
**Why it's wrong:** In a chase-cam single-lane-of-travel game, the screen only shows the local
player's forward road — an opponent on a different branch has no valid screen position at all
(they're not spatially "in view"); forcing a projection would either be visually nonsensical or
require rendering two separate road views (a much larger scope increase, and one the project has
already scoped out — see Q5 below and PROJECT.md's "Multijugador de 4+ jugadores... cambio
arquitectural demasiado grande" precedent for keeping multiplayer scope conservative).
**Instead:** Render the opponent sprite only when `remote.edgeId === local.edgeId` and within draw
distance; otherwise fall back to the existing HUD gap-text pattern (`hudRole`/`updateHUD`'s
`-${secs}s` display, line ~1667-1681 today) generalized to branch-aware progress.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PeerJS 1.5.4 (CDN) | Unchanged — `Net` IIFE (game.js line 380) wraps `create`/`join`/`send`/`destroy`; only the `pos` message *payload shape* changes (raw x/y/angle → edgeId/z/offset/heading/driftState) | No protocol/library change; this is a payload-schema change only, fully backward-incompatible with old clients (acceptable — no versioning requirement stated) |
| `assets/r4a-tileset.png`, `assets/r4b-crowd.png` | Unchanged loading (`Image()`, `onload` slices into offscreen canvases) — reused as source art for road-surface bands and roadside sprites in the new projector | Existing 16-cell/4-cell layout may not map cleanly to new stage content; expect new art additions to the same sheets rather than a new asset pipeline |
| `localStorage` (`cr_best_lap_ms`, `cr_rival_<idx>`) | Best-lap/rival-record concept doesn't map 1:1 to a lapless point-to-point format — PROJECT.md already flags "Loop de progresión/meta nuevo" as open scope; whatever replaces it (best time on a stage? branch-choice stats?) is a new `localStorage` schema, not a reuse of the lap-time key | Flagged as an open design question for the roadmap, not resolved by this research |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `physics.js` ↔ `track-data.js` | `physics` reads `SEGMENTS[edgeId]`/`EDGES[edgeId].length` for bounds/curvature; never mutates track data | Mirrors today's `updateCar`/`updateAI` reading `ROAD_SPINE`/`AI_WAYPOINTS` as read-only constants |
| `physics.js` ↔ `render-3d.js` | Renderer reads `car.z`/`car.offset`/`car.driftDir` every frame to position camera and sprites; never mutates car state | Mirrors today's strict separation (drawing functions in game.js never mutate `cars[]`) |
| `progress.js` ↔ everything else (HUD, DRS, AI racecraft, win condition) | Single cached-per-frame value (`car.progress` today, its branch-aware successor tomorrow) is the *only* channel other systems use to reason about relative race position | This is the most valuable existing discipline to preserve — today's R3B-02 "progress computed once, everyone reads the cache" pattern is exactly right and should not be diluted by branching (i.e., don't let individual systems start comparing raw `z` values across different edges directly) |
| `net.js` ↔ `physics.js`/`progress.js` | Inbound `pos` messages write directly into the remote car's track-space fields (today: `cars[1].x/y/angle/speed/lap/cp`, tomorrow: `cars[1].edgeId/z/offset/speed/heading/driftState`); validation happens in `net.js` before the write, same as today's range checks in `onMsg` (line 2183) | Validation gets *stronger* under the new model — edge-relative bounds are a tighter invariant than a loose world bounding box (see Q5 discussion) |
| `game.js` (loop/phase state machine) ↔ everything | Orchestrates call order per phase (`countdown`/`racing`/`done`) exactly as today (line 1894-2154); this orchestration shape does not need to change, only what each phase's branch calls internally | Confirms the phase state machine, `startLoop`/`stopLoop`, and `goTo()` screen system are safe to keep as-is |

## Suggested Build Order

Ordered by hard dependency (each step needs the previous one's output to be testable/visible):

1. **`track-data.js` v0 — single straight test edge.** No branching yet, no corners. Unblocks
   everything else; without *some* segment table the projector has nothing to draw and physics
   has nothing to bound against.
2. **`render-3d.js` v0 — scanline projector on the straight edge.** Validates the core "does this
   look like a chase-cam pseudo-3D road" question before any gameplay code is touched — this is
   deliberately the same order Jake Gordon's canonical tutorial series follows (straight roads
   first, curves second, elevation third) and it's the highest-uncertainty, highest-value-to-
   validate-early piece of the whole milestone.
3. **`physics.js` rewrite — track-space state on the test edge**, extended with the drift state
   machine. Tuned by eye against the now-visible projected road (this order — render before
   physics-feel-tuning — is why step 2 must precede this step, not the reverse).
4. **Curvature + elevation in `track-data.js`/`render-3d.js`.** Adds corners and jumps to the test
   edge; validates AI steering-target adaptation (`updateAI`'s waypoint-following logic, ported to
   track-space) against real cornering.
5. **AI racecraft adaptation** — avoidance/defensive-block/rubber-band logic (today's `updateAI`,
   lines 1470-1619) re-derived against (edgeId, z, offset) instead of world x/y; still
   single-edge only at this point.
6. **Branch graph + `progress.js` branch-normalized ranking.** Only meaningful once step 3-5 prove
   the single-edge case works — branching multiplies the surface area of everything upstream, so
   it should be the *last* simulation-layer change, not an early one.
7. **Multiplayer payload/validation update (`net.js`) + same-edge opponent-rendering rule.**
   Depends on the track-space car state (step 3) and, for full correctness, the branch graph (step
   6) — but the transport/cadence itself (PeerJS IIFE, 50ms `pos`) can be smoke-tested against
   step 3's single-edge state before branching lands, de-risking the payload-shape change
   independently of the branching change.
8. **Stage content** — the actual point-to-point circuit(s) with "saltos, curvas únicas, sensación
   de lugar" per PROJECT.md's stated goal. Deliberately last: content authoring is cheap to iterate
   once every layer above it is proven, and expensive to redo if any earlier layer's data-shape
   assumptions turn out wrong after content already exists.

## Sources

- Current implementation — read directly, all line numbers above refer to
  `C:\Users\Julio\OneDrive\Documents\GitHub\JuegoTest\game.js` as of 2026-08-15 (commit
  `a35a828` and worktree state per git status).
- [How to build a racing game — straight roads | Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v1-straight/) — canonical segment/projection technique, MEDIUM-HIGH confidence (verified via WebFetch of the follow-up curves article; core algorithm summary cross-checked, not directly quoted)
- [How to build a racing game — curves | Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v2-curves/) — segment data structure (`p1`/`p2` world/camera/screen, `curve`, `color`), curve-easing convention
- [How to build a racing game — conclusion | Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v4-final/) — full-series wrap-up, referenced for scope confirmation
- [Lou's Pseudo 3D Page](https://www.extentofthejam.com/pseudo/) — independent corroboration of the same segment/projection convention (elevation via "Realistic Hills Using 3d-Projected Segments")
- Kart-drift conventions (slip-angle/heading-vs-velocity lag, drift-charge/mini-turbo release) — MEDIUM confidence, WebSearch-only (Medium.com Pixi.js drift-physics writeup, GameDev.net arcade-drift-with-a-physics-engine discussion, Unity Discussions arcade-kart-physics thread); genre-standard pattern, not verified against a single authoritative source — flagged for validation during Phase 1/3 implementation (playtesting, per this project's existing `[ASSUMED]` tagging convention for AI personality tuning)

---
*Architecture research for: browser pseudo-3D chase-cam arcade racer migration*
*Researched: 2026-08-15*
