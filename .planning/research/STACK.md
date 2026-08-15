# Stack Research

**Domain:** Pseudo-3D "behind the car" arcade racer (OutRun-style road rendering + kart-style drift handling), built on top of an existing vanilla-JS single-file (`game.js`, ~2700 lines) browser racing game with no build tools
**Researched:** 2026-08-15
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Canvas 2D "road segments" technique (hand-rolled, adapted from Jake Gordon's `javascript-racer` / Lou's Pseudo-3D Page) | N/A (technique, not a library) | Renders the chase-cam pseudo-3D road: per-scanline trapezoids with curve/hill offset and 1/z perspective scaling for road width, rumble strips, and sprite placement | This is still the canonical, actively-referenced technique for exactly this look in 2026 (Jake Gordon's tutorial series and source remain the standard reference cited across current game-dev search results). It is ~150–300 lines of plain math, runs entirely on `CanvasRenderingContext2D` (no WebGL context, no shaders), and drops straight into the existing single `game.js` file with zero new script tags. Perf headroom is large: the current game already draws a full pixel-art tile/palette pipeline at 60fps on mobile Safari/Android (per CLAUDE.md); drawing ~100–200 filled trapezoids per frame is cheaper than that. |
| Existing Web Audio API synth (extend, don't replace) | Native browser API | Engine tone, brake squeal, **+ drift squeal, + boost/mini-turbo sound** | Already validated and lazy-initialized correctly for iOS/Safari gesture requirements. The new sounds needed (continuous filtered noise for drift squeal, pitch-swept oscillator burst for boost) are the same class of primitive already used for brake squeal (`AudioBufferSourceNode` noise + `BiquadFilterNode`) and engine tone (`OscillatorNode` + `GainNode`). No new API surface required. |
| PeerJS 1.5.4 (unchanged) | 1.5.4, CDN | P2P multiplayer transport | No version or library change needed. What changes is the **shape of the data** sent over the existing `pos` message (see Q3 below), not the transport, the room-code flow, or the message protocol itself. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required for road rendering, sprite scaling, or kart physics | — | — | Hand-roll all three. See "What NOT to Use" for why Three.js and physics/math libraries are the wrong fit here. |
| kontra.js | 10.0.2 (CDN: cdnjs `kontra.min.js`, also has a plain global/UMD build, not ESM-only) | Optional micro-library (~1.5–4kb depending on modules) for sprite pooling, simple AABB collision helpers, game-loop scaffolding | Only worth considering if sprite/entity bookkeeping for track-side scenery (trees, signs, grandstands placed by distance-along-track) becomes unwieldy to hand-roll. Not needed to start — the existing codebase already hand-rolls entity management for 22 cars and hasn't needed a helper library. Mention only as a fallback if scenery-object count grows large. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| None new | — | Project has no build/lint/test tooling today (per CLAUDE.md) and none is needed for this milestone. The existing `tests/` smoke tests (Node-based, per `r4a-smoke.test.js` pattern) are the right place to add a smoke test for segment rendering (e.g., assert road width/curve math produces expected screen-space values for known inputs) — same pattern, no new tool. |

## Installation

```bash
# No installs. Everything below is either a plain <script src="..."> CDN tag
# (PeerJS, unchanged) or hand-rolled code added to game.js / a new sibling file
# loaded via <script> before game.js, e.g.:
#   <script src="road.js"></script>   <!-- segment math + projection, new -->
#   <script src="game.js"></script>   <!-- existing, calls into road.js -->
```

## Answers to the Specific Questions

### (1) Canvas 2D road-segments trick vs. Three.js via CDN

**Use the Canvas 2D road-segments trick. Do not add Three.js.**

The classic technique (per-segment world→camera→screen projection, road drawn as a stack of trapezoids from far to near, curve = cumulative horizontal offset, hill = cumulative vertical offset, sprite scale = `1/z`) is not a relic — it's still the standard reference implementation people point to today for this exact visual style (Jake Gordon's `javascript-racer` tutorial series and its MIT-licensed source, plus "Lou's Pseudo 3D Page," both still actively cited in current search results). It is a pure 2D-math technique that outputs fill-rect/polygon draw calls, so it fits `CanvasRenderingContext2D` perfectly — no shader code, no depth buffer, no 3D scene graph needed.

Three.js is the wrong tool here for a project-fit reason, not a capability reason: as of the current release (Three.js **0.185.x**, mid-2026), the legacy global/UMD `build/three.js` script has been **deprecated since r150 and removed since r160**. The only supported way to use it from a plain HTML page without a bundler is `<script type="importmap">` + `<script type="module">` ES module imports. That's a real architectural change for this codebase: `game.js` would need to become an ES module (`type="module"`, different scoping rules, no more implicit globals across `<script>` tags, async loading semantics), on top of standing up a WebGL renderer, camera, scene graph, and either 3D car models (new asset pipeline — GLTF, materials, lighting) or billboarded sprites faked in 3D space anyway. That's a disproportionate amount of new surface area — and a new class of iOS Safari/Android WebGL context-loss and driver-quirk risk — to get a look that the 2D segment trick already produces natively. Stay with Canvas 2D.

**Confidence: HIGH** (verified via current web search that the UMD build removal is real and current, and that the Jake Gordon technique remains the standard 2026 reference).

### (2) Audio additions needed on top of existing engine/brake synth

Two new sound behaviors, both achievable with stock Web Audio nodes already used elsewhere in the codebase — no new library (see "What NOT to Use" re: Tone.js):

- **Drift squeal**: a continuous tire-slip screech while the kart is drifting, distinct from the existing one-shot brake squeal. Reuse the same `AudioBufferSourceNode` (white/pink noise buffer) + `BiquadFilterNode` (bandpass) pattern already built for brake squeal, but drive the filter's center frequency and the gain envelope continuously from the drift's lateral-slip angle/intensity each frame (louder and higher-pitched with more slip), instead of firing a single decay envelope on brake-lock. This is additive to the existing audio module, not a rewrite.
- **Boost / mini-turbo sound**: a short (200–500ms) pitch-rising burst layered under the engine tone when a charged drift releases into a boost — a second `OscillatorNode` with a `frequency.exponentialRampToValueAtTime` sweep plus a brief gain swell, optionally softened with a `WaveShaperNode` for a bit of saturation "punch." This is the same primitive-composition approach already used for the two-oscillator engine tone.

Both are additive functions inside the existing lazy-init `getAudioCtx()` audio module; no new nodes types, no new API, no CDN addition.

### (3) Does PeerJS/WebRTC sync change for chase-cam vs. top-down?

**The library and protocol don't change; the payload shape and the remote-rendering math do.**

Today, `pos` messages broadcast free 2D world coordinates (`x`, `y`, heading angle) at 50ms intervals, and the remote car is drawn by interpolating between the last two received world-space points (`remoteRenderPos()`).

In a segment-based, forward-travel racer, the natural (and *simpler*) position representation is 1D-along-track-plus-lateral-offset — directly analogous to the arc-length `trackProgress()` / `SPINE_CUMLEN` system this codebase already built for continuous race progress. Concretely, `pos` becomes something like `{ trackDistance, lateralOffset, speed, driftState }` instead of `{ x, y, angle }`. This is *less* data and *less* validation surface than today (no need to range-check a 2D point against the world; just clamp `lateralOffset` to road half-width and validate `trackDistance` is monotonic-ish), which fits the existing "validate all incoming `pos` data server-side before applying" rule directly.

The rendering side changes more than the networking side: instead of drawing the remote car at an absolute world position, you place its **sprite** in the pseudo-3D scene at the segment corresponding to `remoteTrackDistance - localCameraTrackDistance` (same 1/z scale-by-distance math already used for scenery sprites), with `lateralOffset` mapped to a screen-space X shift within the road's projected width at that segment. If the opponent is far enough ahead/behind to be off-screen, fall back to a HUD gap indicator (the game already computes and displays real-seconds gaps from `trackProgress()`, so that pattern carries over almost unchanged).

One new wrinkle specific to *branching* point-to-point tracks: if the player and the rival can take different branches, "distance along track" is no longer a single scalar for both cars — it needs a `(segmentPathId, distanceIntoSegment)` or similar compound key so the interpolation/rendering code knows whether the opponent is even on a path that could put them on-screen. When paths diverge, drop back to the HUD gap indicator rather than trying to render a sprite that isn't meaningfully "in front of" or "behind" the camera anymore. This is a data-modeling addition on top of the existing message schema, not a transport or PeerJS version change.

**Confidence: HIGH** for the "PeerJS/WebRTC itself is unaffected" claim (this is an application-layer concern, verified against the existing architecture description in CLAUDE.md). **MEDIUM** for the specific branching-path compound-key design — that's a reasonable extrapolation from the existing `trackProgress()` pattern but hasn't been validated against an actual branching-track implementation anywhere; flag for validation once the branch data structure is designed in a later phase.

### (4) Lightweight CDN libraries for road-segment math, sprite scaling, or kart physics — or hand-roll?

**Hand-roll all three.** This matches how the project has built everything else (physics, AI, collision, camera, tile rendering are all hand-rolled in `game.js` today), and none of the three problems is large enough to justify a dependency:

- **Road-segment math**: ~150–300 lines of straightforward perspective-projection arithmetic (per Jake Gordon's reference implementation). No library packages this in a form worth taking as a dependency over just adapting the (MIT-licensed) reference code directly into `road.js`.
- **Sprite scaling**: is a direct output of the same `1/z` projection math used for the road itself — same code path, not a separate concern needing its own library.
- **Kart physics** (drift charge, hop, mini-turbo boost, lateral slip): this is a natural *extension* of the drift/grip model the game already has (`GRIP_ON`/`GRIP_OFF` lag between heading and `velAngle` producing micro-drift, per CLAUDE.md). Turning that into a full charge-and-release mini-turbo system is adding a state machine (drift charge timer → boost tier → release) and a couple of new tunable constants, not new math primitives. No physics engine (Matter.js, Planck.js, etc.) is warranted — those solve rigid-body simulation with multiple colliding bodies and constraints, which is overkill for kart-on-a-fixed-road-with-a-lateral-offset.

The one item worth naming as a *possible, not necessary* dependency is **kontra.js** (10.0.2, plain global build available via CDN, ~1.5–4kb) for sprite/entity pool bookkeeping if the number of track-side scenery objects placed by distance-along-track grows large enough that hand-rolled arrays get unwieldy. This is explicitly optional — start hand-rolled, reach for it only if scenery entity management becomes a real pain point.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Canvas 2D road-segments trick | Three.js (WebGL, via importmap/ES modules) | If a future milestone wants true 3D geometry (jumps with real elevation-dependent occlusion, banked curves viewed from odd angles, dynamic lighting/shadows) that the flat-scanline segment trick can't fake convincingly. Would require converting `game.js` to ES modules and building a real asset pipeline — a deliberate, larger architectural decision, not a drop-in swap. |
| Hand-rolled Web Audio synth extensions | Tone.js (CDN-friendly audio library) | If the audio system needs proper musical scheduling/sequencing (e.g., a real music transport, sample-accurate loops, effect chains composed declaratively). This project's audio is short procedural SFX + a simple synthesized background loop — Tone.js's transport/scheduling abstractions solve a problem this project doesn't have. |
| Hand-rolled kart drift state machine | A physics engine (Matter.js / Planck.js) | If the design grows to need general rigid-body collision resolution between many freely-moving bodies (e.g., a return to open-field top-down racing with complex multi-car pileups). For a single kart constrained to a lateral offset on a fixed road, a physics engine is solving a harder, more general problem than exists here. |
| Hand-rolled sprite/scenery bookkeeping | kontra.js | If scenery entity count and pooling logic become a genuine maintenance burden. Not needed at current scope. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Three.js / any WebGL 3D engine | Current major versions (0.185.x) dropped the legacy global/UMD script tag (removed since r160); only supported no-bundler path is ES modules + import maps, which forces `game.js` into module scoping and pulls in a full 3D asset/lighting pipeline for a look the 2D trick already achieves | Canvas 2D road-segments technique |
| Tone.js or other audio framework libraries | Solves musical scheduling/sequencing problems this project doesn't have; adds a CDN dependency and an abstraction layer over Web Audio for effects (noise + filter + oscillator) the existing hand-rolled synth already produces correctly | Extend the existing lazy-init Web Audio synth module with more nodes of the same kind already in use |
| Matter.js / Planck.js / other 2D physics engines | Built for general multi-body rigid physics and constraint solving; a kart's lateral position on a fixed road segment is a 1-DOF-plus-heading problem, not a rigid-body simulation problem | Hand-rolled drift/grip state machine, extending the existing `GRIP_ON`/`GRIP_OFF` heading-lag model |
| A generic "2D game engine" (Phaser, PixiJS, Excalibur, Babylon.js, etc.) | All require either a build step for idiomatic use or push the project toward their own scene-graph/asset conventions; none solve the pseudo-3D scanline projection problem directly, and adopting one would mean re-platforming 2700 lines of working game logic for no capability gain | Continue the existing single-file `game.js` + plain Canvas 2D pattern |

## Stack Patterns by Variant

**If a future milestone wants true elevation/occlusion (e.g., a car disappearing behind a hill crest, banked curves):**
- Move to Three.js with import maps + ES modules
- Because the flat-scanline segment trick fundamentally can't occlude geometry by real depth — it's a clever 2D illusion, not a 3D renderer, and there's a real ceiling to how far you can push hills/curves before the illusion breaks

**If scenery/entity count on branching tracks grows large:**
- Add kontra.js (CDN, global build) for pooling/bookkeeping only
- Because the road-segment rendering math itself doesn't change; only entity list management gets unwieldy at scale

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| PeerJS 1.5.4 (existing, unchanged) | Any modern browser with WebRTC (Chrome/Edge/Firefox/Safari desktop + iOS Safari, Chrome Android) | No change required for this milestone; only the `pos` message payload schema changes at the application layer |
| Web Audio API (native) | All target browsers (iOS Safari, Android Chrome, desktop evergreen browsers) | Must remain lazy-initialized on first user gesture — unchanged constraint, still applies to new drift-squeal/boost nodes |
| kontra.js 10.0.2 (optional, not adopted by default) | Plain `<script>` global build on cdnjs; no ESM requirement | If ever added, use the global/UMD build (`kontra.min.js`), not the `.mjs` module build, to avoid introducing `type="module"` into `index.html` |
| Three.js 0.185.x (evaluated, not recommended for this milestone) | Requires `<script type="importmap">` + `<script type="module">`; incompatible with plain global `<script>` loading as used by every other script in this project | Only relevant if a future milestone explicitly decides to move to true 3D |

## Sources

- [How to build a racing game (Jake Gordon, javascript-racer tutorial series — straight roads, curves, hills)](https://jakesgordon.com/writing/javascript-racer/) — MEDIUM/HIGH confidence, verified current via search as the standard reference for this technique in 2026
- [jakesgordon/javascript-racer on GitHub](https://github.com/jakesgordon/javascript-racer) — MIT-licensed reference source for the segment-projection algorithm
- [Lou's Pseudo 3D Page](https://www.extentofthejam.com/pseudo/) — MEDIUM confidence, corroborating reference for the same technique
- [Three.js UMD/global build deprecation — three.js forum thread "Build/three.js depreciation?"](https://discourse.threejs.org/t/build-three-js-depreciation/53915) — HIGH confidence, confirms `build/three.js`/`build/three.min.js` deprecated since r150, removed since r160
- [Using Import Maps — Three.js Tutorials (sbcode.net)](https://sbcode.net/threejs/importmap/) — MEDIUM confidence, confirms import-map-based no-bundler usage pattern is now the only supported non-bundler path
- Three.js npm package page / current version check — MEDIUM confidence (WebSearch only, not Context7-verified): latest release ~0.185.x as of mid-2026
- [Kontra.js official site](https://straker.github.io/kontra/) and [kontra on cdnjs](https://cdnjs.com/libraries/kontra) — MEDIUM confidence, confirms current version (10.0.2) and CDN availability of a plain global build
- CLAUDE.md (this repository) — HIGH confidence, ground truth for existing architecture (Web Audio synth structure, camera/tile pipeline performance baseline, PeerJS message protocol, arc-length progress system) informing all "extend, don't replace" recommendations

---
*Stack research for: pseudo-3D chase-cam arcade racer rebuild (v3.0 "Arcade Rebirth")*
*Researched: 2026-08-15*
