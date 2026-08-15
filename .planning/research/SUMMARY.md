# Project Research Summary

**Project:** Colapinto Kart Racer (v3.0 milestone — working name "Arcade Rebirth")
**Domain:** Pseudo-3D chase-cam arcade kart racer, closed-lap kartodromo, single-file vanilla-JS/Canvas2D browser game
**Researched:** 2026-08-15
**Confidence:** MEDIUM-HIGH (see per-area breakdown below — stack/pitfalls research transfers almost entirely; features/architecture research was scoped against an earlier framing and required correction)

> **Scope correction applied to this summary.** The four source research files
> (`STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`) were researched against an
> earlier framing: an F1-themed pseudo-3D racer with **point-to-point branching stages**.
> After that research was commissioned, the product direction changed:
> 1. **Theme is karting, not F1** — a young Franco Colapinto racing go-karts in Argentina,
>    before his move to Italy for Formula 4. Not an F1 car on a Grand Prix circuit.
> 2. **Track format is a closed-lap kartodromo** (short closed circuit, multiple laps) —
>    branching is explicitly **out of scope** for this milestone.
> 3. **Narrative/biographical layer** (real Argentina venues, story progression toward the
>    Italy call-up) is **out of scope** for this milestone, reserved for a future release.
>    This milestone is scoped to the core handling/camera/track-feel loop only.
> 4. **Light progression is in scope**: best-lap-time tracking + a ghost-car replay
>    (localStorage only, no backend) — but no story/unlocks/campaign structure yet.
> 5. Handling should be **grounded arcade kart handling**, not as floaty/toy-like as Mario
>    Kart. Mario Kart is a camera/handling reference point only, not a design target for
>    chaos or power-ups (power-ups/combat were already out of scope, independently confirmed).
>
> Everything below has been filtered and reframed through this correction. Findings that are
> branching-specific have been dropped or explicitly flagged as **NOT APPLICABLE** — this is
> itself one of the most useful findings of the pivot (see Architecture section).

## Executive Summary

This is a from-scratch rendering and handling rewrite of an already-shipped, working vanilla-JS
top-down racer, not a new project. The single highest-confidence recommendation across all
research is: **replace the top-down renderer with the classic OutRun-style Canvas 2D
"road-segments" technique** (per-scanline trapezoid projection, no WebGL, no Three.js) and
**extend, not replace, the existing physics/audio/multiplayer primitives** the codebase already
has. The current `ACCEL_RATE` exponential-approach speed model, the `GRIP_ON`/`GRIP_OFF`
heading-vs-velocity lag (today tuned as a barely-visible micro-drift), the lazy-init Web Audio
synth, and the PeerJS transport are all sound foundations to build on rather than throw away.
The karting-and-closed-lap pivot simplifies this further: the arc-length progress model the game
already uses (`trackProgress()` / `SPINE_CUMLEN`) carries over almost unchanged for a closed lap
— it just needs to run against a new, denser `SEGMENTS[]` table (with curve, elevation, and
width per segment) instead of the current sparse 57-point `ROAD_SPINE`. No route-graph, no
branch-normalized progress, no same-edge collision guards, no branch-aware multiplayer payload
are needed. That entire risk category, which the original branching-scoped research treated as
the single largest and riskiest piece of new infrastructure, disappears with this pivot.

The recommended approach is to build and validate the renderer and the drift-handling state
machine in isolation, in that order, before authoring real track content: get a scanline
projector rendering a simple looped test segment correctly (including the notoriously
bug-prone case of a curve and a hill/crest coinciding), then tune kart-style drift (a genuine
state machine — slip-angle lock, charge, tiered release boost — not a grip-constant tweak) in a
throwaway test harness, then port the AI to the new track-space coordinate model with the same
drift capability the player has. Only after those are proven should the one real kartodromo be
authored with actual landmarks and identity, and only after that should best-lap tracking and
ghost-replay progression be layered on top (this is now confirmed LOW-MEDIUM complexity, not the
"deferred, too complex" item the current `PROJECT.md` lists it as).

The key risks are almost entirely about *feel* and *mobile performance*, not architecture: (1) a
naive port of curve+hill projection math visibly breaks where they combine, so it needs a
deliberate early test case; (2) the projector must cap segment draw-distance and profile on real
iOS Safari/mid-tier Android from day one, since Canvas2D per-call overhead is much less forgiving
on mobile than the desktop tutorials this technique is normally validated against; (3) drift and
its boost reward are easy to get either floaty/uncontrollable or twitchy/binary, and the AI must
get the same drift capability as the player or corner-feel will visibly mismatch and read as a
regression from the game's already-good AI racecraft. None of these risks are new or exotic —
they are well-documented, tractable, and the codebase's own commit history shows this team has
already solved comparably tricky mobile/iOS problems (lazy `AudioContext` init, Pointer Events
touch handling, `devicePixelRatio`-aware sizing) that must simply not be silently regressed
during the rewrite.

## Key Findings

### Recommended Stack

Hand-roll everything; add no new dependencies. The Canvas 2D "road-segments" technique (per-segment
world→camera→screen projection, drawn as back-to-front trapezoids) is still the standard, actively
cited 2026 reference for this exact chase-cam look (Jake Gordon's `javascript-racer` tutorial
series and source) — it's ~150–300 lines of plain math that drops straight into the existing
single-file/no-bundler project. Three.js was evaluated and explicitly rejected: current releases
dropped the legacy global/UMD script tag, so adopting it would force `game.js` into ES-module
scoping and pull in a full 3D asset pipeline for a look the 2D technique already produces
natively — a disproportionate architectural cost for no requirement this milestone actually has.
Audio (drift squeal, boost sound) extends the existing lazy-init Web Audio synth with the same
class of nodes already used for engine tone and brake squeal — no new library. PeerJS 1.5.4 stays
unchanged as the transport; only the `pos` message payload shape changes.

**Core technologies:**
- Canvas 2D road-segments technique (hand-rolled) — renders the chase-cam pseudo-3D kartodromo; zero new script tags, runs well within the perf headroom already proven by the current pixel-art tile pipeline
- Existing Web Audio API synth, extended — drift squeal (continuous filtered noise) + boost sound (pitch-swept oscillator burst), same primitive-composition pattern already used for brake squeal/engine tone
- PeerJS 1.5.4, unchanged — transport and room-code flow don't change; only the `pos` payload shape changes (see Architecture)

**What NOT to use:** Three.js/WebGL (forces ES-module rewrite, full 3D pipeline, for a look already achievable in 2D), Tone.js (solves musical-sequencing problems this project doesn't have), Matter.js/Planck.js physics engines (a kart on a lateral offset within a track is a 1-DOF-plus-heading problem, not general rigid-body simulation), any general 2D game engine (Phaser/Pixi/Excalibur — all push toward a build step or their own scene-graph conventions for no capability gain here).

### Expected Features

*Reframed for closed-lap kartodromo, no branching, no narrative layer.* The original FEATURES.md
was researched against point-to-point branching stages; branch-specific items below are dropped
or deferred per the scope correction, but the rest of the feature landscape and its complexity
estimates transfer directly.

**Must have (table stakes) — largely unchanged by the pivot:**
- Chase-cam pseudo-3D road rendering (segment projection, curves, elevation) — the format-defining feature; the genre signature this milestone exists to deliver
- Speed sensation via segment scroll rate (distance-keyed rumble-strip strobe, FOV/shake response, audio pitch scaling) — makes the renderer feel fast, not just look different
- Kart-style drift-to-turn handling (genuine state machine: initiate, hold slip angle, charge, tiered release boost) — directly answers "handling feels flat"; **must be tuned toward "grounded arcade kart" feel, not Mario Kart floatiness** (see Gaps — this specific tuning target is a product extrapolation, not directly researched)
- One fully-realized closed-lap kartodromo with elevation changes and recognizable landmarks — proves "track identity" before any further content investment
- AI rivals ported to the new coordinate model with existing racecraft (avoidance, block, rubber-band, pressure mistakes) **and** the same drift capability as the player — losing either is a felt regression from the current, already-good AI
- Best-lap time display/persistence — trivial extension of the existing `cr_best_lap_ms` `localStorage` pattern

**Should have (competitive, in scope per correction):**
- Ghost-line time-attack replay (own best run, translucent non-colliding sprite) — **corrected finding: this is LOW-MEDIUM complexity, not the HIGH-complexity item `PROJECT.md` currently lists as out of scope.** A ghost is a sampled array of `{t, distance, lateralOffset}` snapshots replayed as interpolated playback — materially simpler than the AI racecraft system already shipped, and fits comfortably in `localStorage` (a few KB per track, well under the ~5MB origin limit). This is now core scope for this milestone, not a maybe.
- Lap-clear rank/grading (time thresholds vs. best) — cheap, client-side, high-value replay hook; near-mandatory given how little it costs once best-time persistence exists

**Defer to a future release (per the narrative/branching correction):**
- Point-to-point branching, fork telegraphing, reconverging paths — entire category dropped for this milestone
- Real Argentina venue biography / story progression toward the Italy call-up — reserved for a future release
- Stage-unlock gauntlet / campaign structure, unlockable rival/car skins — these depend on a multi-stage campaign concept that doesn't exist yet in this milestone's scope (single kartodromo)
- Items/power-ups/combat — already independently out of scope, confirmed again by this pivot
- Additional drift-boost tiers beyond one — defer past a single validated boost tier
- Multiplayer on the new format beyond a straightforward payload update — see Architecture; no new scope, just re-pointing

### Architecture Approach

The migration replaces the rendering and coordinate-system layers while reusing the physics
*shape*, the audio system fully, and the multiplayer transport. The **single biggest structural
change** is moving car state from world-space `(x, y, angle)` to track-space `(z, lateralOffset,
heading-as-visual-only)`, because that is what the scanline projector needs to place segments and
what makes "ahead/behind" trivial arithmetic. The **single biggest simplification the karting
pivot bought** is that this track-space model, for a closed lap, needs no branch graph at all: the
existing `trackProgress()`/`SPINE_CUMLEN` arc-length pattern (lap × circuit length + distance along
one continuous table) is reused almost as-is — just pointed at the new dense `SEGMENTS[]` table
instead of the old sparse 57-point spine. Multiplayer needs the same simplification: the `pos`
payload becomes `{trackDistance, lateralOffset, speed, driftState}` instead of raw `{x, y, angle}`
— less data and less validation surface than today — with **no route/edge id and no branch-choice
divergence handling required**, because there is only one path.

**Major components:**
1. **Track data (`SEGMENTS[]` table)** — dense, uniformly-spaced segments (curve, elevation, width, color, sprite placements) resampled from sparse hand-authored waypoints, replacing `ROAD_SPINE`; no branch graph needed for this milestone
2. **Physics (track-space car state + drift state machine)** — `car.z`/`car.offset`/`car.driftCharge` replace `car.x`/`car.y`/`car.angle`; the existing `ACCEL_RATE`/`GRIP_ON`/`GRIP_OFF` lag is the correct primitive to extend into an explicit drift state machine, not replace
3. **Renderer (scanline segment projector + camera)** — per-frame projection of visible segments into screen-space trapezoids; car/rival sprites become fixed-position, view-angle-frame-selected (not rotated), scaled continuously by projected depth
4. **Progress/ranking (closed-lap arc-length, reused pattern)** — same cached-once-per-frame-scalar discipline as today (`car.progress`), now measured against the new segment table; drives ranking, gap display, and any boost-zone mechanic
5. **Multiplayer transport (PeerJS, unchanged) + simplified payload** — same IIFE, cadence, and dead-reckoning technique; only the `pos` schema changes, with validation actually *tightening* (1D distance/offset bounds are a stricter invariant than a loose 2D world box)
6. **Audio (unchanged, extended)** — same lazy-init synth module, new node compositions for drift squeal and boost

**Recommended file split (still zero build step, plain `<script>` tags in dependency order):**
`track-data.js` (segment table/authoring), `physics.js` (car state + drift, track-space), `render-3d.js` (scanline projector/camera), `render-assets.js` (existing tile/sprite pixel pipeline, reused near-verbatim), `progress.js` (arc-length ranking, closed-lap only), `net.js` (PeerJS, payload updated), `audio.js` (unchanged), `game.js` (loop/phase state machine/HUD glue, structurally unchanged). This split is a recommendation, not a requirement — the same boundaries can live as sections within one file if the team prefers the current single-file convention.

**Suggested build order** (each step needs the previous step's output to be testable): (1) segment table on a single closed-loop test track with no curves/elevation yet, (2) scanline projector validated on that flat loop, (3) physics/drift rewrite tuned against the now-visible road, (4) add real curvature + elevation and re-validate the curve+hill combination specifically, (5) port AI racecraft + AI drift to track-space, (6) author the one real kartodromo's content, (7) multiplayer payload update (can be smoke-tested independently once step 3 lands), (8) progression layer (best time, rank, ghost).

### Critical Pitfalls

1. **Curve+hill projection silently breaks when combined** — the classic bug in every "I followed the OutRun tutorial" clone: curve and elevation offsets folded into the projection at different points produce a kinked/self-intersecting road on a corner-that's-also-a-crest. Avoid by keeping both as independent per-segment accumulators projected together in one call, and build a deliberate "corner on a crest" test segment before any real track content is authored.
2. **Segment rendering has no draw-distance culling and hits a mobile framerate cliff** — a straight port of desktop tutorial code redraws far more segments than are visible, and Canvas2D's per-call overhead is much less forgiving on iOS Safari than desktop Chrome. Avoid by capping drawn segments to draw-distance (start ~100-120), culling before the projection loop, batching same-color strips, and profiling on real mobile hardware during the renderer phase itself — not deferred to polish.
3. **Drift ships as either "ice" (floaty, no commitment) or "on/off toggle" (twitchy, binary)** because the current grip model was tuned to be barely-noticeable micro-drift, and naively cranking those same constants doesn't produce kart-style drift. Avoid by modeling drift as an explicit state machine (locked slip angle proportional to steering input, held while the button is held, distinct convergence-back-to-heading on release) tuned in an isolated throwaway harness before wiring it into the real track — this is also the pitfall most directly relevant to the corrected "grounded, not floaty" handling target.
4. **AI never earns the same drift/boost the player does**, producing a visible corner-feel mismatch (player slides, AI corners "on rails") that reads as a regression from the current, already-convincing AI racecraft. Avoid by giving AI the same drift state machine, entered via a decision rule (predicted turn angle vs. speed) rather than a button, with personality-driven variance mirroring the existing braking/pressure-mistake pattern — shipped in the same phase as player drift, never deferred.
5. **Mobile/iOS regressions get silently reintroduced during the rewrite** — the current game has several hard-won, non-obvious fixes (lazy `AudioContext` init on gesture, Pointer Events with `pointerleave`/`pointercancel` for touch controls, `devicePixelRatio`-aware sizing, viewport-fit layout) that are easy to drop because the new render/input code "doesn't obviously touch the mobile stuff." Avoid by treating these as explicit requirements checked at the end of every rendering/input/audio-touching phase, plus one final end-to-end mobile regression pass before ship, reusing the existing `tests/` smoke-test/reference-capture pattern.

**Not applicable under the corrected (closed-lap, no-branching) scope** — flagged explicitly because the source PITFALLS.md treated these as top risks: branch-aware `trackProgress()` retrofit (route-graph progress, same-edge collision/DRS guards, branch merge-point rank flicker) and multiplayer branch-divergence sync (route/edge id in the `pos` payload, peers silently racing on different geometry). A closed lap has no divergence to guard against; this is the single biggest risk category the karting pivot removed.

## Implications for Roadmap

Based on research (corrected for closed-lap kartodromo, no branching, no narrative layer),
suggested phase structure:

### Phase 1: Chase-cam renderer foundation
**Rationale:** Highest-uncertainty, highest-value-to-validate-early piece of the whole milestone; nothing else matters if this doesn't look and feel right. Must come before physics tuning because drift feel needs a visible road to tune against.
**Delivers:** `SEGMENTS[]` table + scanline projector on a single closed test loop (flat first, then curves + elevation), with a deliberate curve+crest test case validated.
**Addresses:** Table-stakes "chase-cam pseudo-3D road rendering," "speed sensation" groundwork.
**Avoids:** Pitfall 1 (curve+hill projection break), Pitfall 2 (mobile draw-distance/perf cliff — profile on real hardware before this phase is done), Pitfall 3 (sprite/rival scaling pop-in — validate against a moving object, not just static props).

### Phase 2: Kart drift handling (isolated harness)
**Rationale:** Drift feel is extremely sensitive to a handful of constants and needs a fast iteration loop; tuning it inside a full race scene (per Pitfall research) is a known trap. Sequenced right after the renderer so there's a real road to eventually validate against, but tuned standalone first.
**Delivers:** Explicit drift state machine (initiate/hold/charge/tiered release boost) tuned in a throwaway test scene toward a **grounded** feel — track-space physics rewrite (`car.z`/`car.offset`) replacing world x/y.
**Uses:** Extension of existing `ACCEL_RATE`/`GRIP_ON`/`GRIP_OFF`/`TURN_RATE` primitives (STACK.md, ARCHITECTURE.md Pattern 1).
**Implements:** Physics component (track-space car state + drift state machine).
**Avoids:** Pitfall 4 (floaty/twitchy drift) and Pitfall 5 (boost balance — tiered, DRS-pattern HUD/sound signature, not a silent multiplier).

### Phase 3: AI port + AI drift parity
**Rationale:** Must ship drift for AI in the same wave as player drift, not after — a phase where only the player drifts is a visible regression from the current game's already-good AI cornering.
**Delivers:** `updateAI()` re-derived against track-space `(z, offset)`; AI drift state entered via a decision rule (predicted turn angle vs. speed), personality-driven like existing braking/pressure-mistake variance; existing racecraft (avoidance, block, rubber-band, pressure mistakes) preserved.
**Addresses:** Table-stakes "AI rivals that still race, ported."
**Avoids:** Pitfall 6 (AI drift parity — corner-feel mismatch, hidden pace-multiplier band-aids).

### Phase 4: One real kartodromo (content)
**Rationale:** Deliberately last among the simulation-layer phases — content authoring is cheap to iterate once renderer/physics/AI are proven, and expensive to redo if an earlier layer's assumptions were wrong.
**Delivers:** One fully-realized closed-lap kartodromo with elevation changes, 2-3 recognizable landmarks, proving "track identity" before any further content investment.
**Addresses:** Table-stakes "distinct track identity" (the milestone's explicit "tracks feel empty/generic" problem statement).
**Uses:** Same tile/sprite pixel-art pipeline reused near-verbatim from the current `buildEnvCanvas()` asset extraction (STACK.md, ARCHITECTURE.md — "Reuse" components).

### Phase 5: Progression — best lap + ghost replay
**Rationale:** Cheapest available "reason to replay," strictly downstream of a real track existing; does not compete for budget with the renderer/handling work since it's pure `localStorage` bookkeeping and results-screen UI.
**Delivers:** Per-track best-lap persistence (extends existing `cr_best_lap_ms` pattern), lap-clear rank/grading, ghost-car time-attack playback (sampled `{t, distance, lateralOffset}` array, interpolated non-colliding sprite).
**Addresses:** "Should have" ghost replay (corrected from HIGH to LOW-MEDIUM complexity) and lap-clear rank.
**Research flag:** Low — this is a straightforward extension of an already-validated `localStorage` pattern.

### Phase 6: Multiplayer payload update
**Rationale:** Can be smoke-tested independently once Phase 2's track-space car state exists; no branch-divergence complexity to design against under the closed-lap scope, so this is a small, well-bounded phase.
**Delivers:** `pos` payload changed from `{x, y, angle, speed, lap, cp}` to `{trackDistance, lateralOffset, speed, driftState}`; validation tightened to 1D distance/offset bounds; `remoteRenderPos()` updated to interpolate/project the remote car in the new coordinate model.
**Uses:** PeerJS 1.5.4 transport unchanged (STACK.md).
**Avoids:** N/A — the corresponding source pitfalls (branch-divergence desync) are not applicable under closed-lap scope; this phase is materially simpler than the original branching-scoped research anticipated.

### Phase 7: Mobile/iOS regression pass + polish
**Rationale:** Individual phases can each pass in isolation while the cumulative rewrite still regresses mobile behavior; this needs one dedicated end-to-end pass before ship, not just per-phase spot checks.
**Delivers:** Full re-verification of lazy `AudioContext` init, Pointer Events touch controls (including any new drift-button control), `devicePixelRatio`-aware sizing, and viewport-fit layout against the completed rewrite; extended `tests/` smoke tests/reference captures for the new chase-cam HUD and controls.
**Avoids:** Pitfall 9 (silent mobile/iOS regression).

### Phase Ordering Rationale

- Renderer before physics-feel-tuning, because drift tuning needs a visible, correctly-projected road to be judged against (research explicitly calls out this ordering, mirroring Jake Gordon's own tutorial sequence: straight roads → curves → hills).
- Drift/AI-drift-parity before content authoring, because track design will implicitly assume both the projection math and the handling feel are correct; redoing content after either changes is expensive, redoing the isolated test harness is cheap.
- Content before progression, because best-lap/ghost/rank are meaningless without a real track to measure against, and they're cheap enough to not need early validation.
- Multiplayer payload update is intentionally late and small — it depends on the track-space car state existing, but (per the pivot) needs no design work beyond a payload-shape change, so there's no reason to front-load it.
- Mobile regression pass is last but is also a checklist item within every rendering/input/audio-touching phase along the way, not solely a final gate.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (drift handling):** Kart-drift conventions (slip-angle lock, charge/release tiering) are MEDIUM-confidence, WebSearch-derived genre patterns, not verified against a single authoritative source (per ARCHITECTURE.md). Combined with the corrected "grounded, not floaty" target being a product extrapolation rather than directly researched fact, this phase should budget explicit playtest/validation cycles, not just an implementation pass.
- **Phase 4 (kartodromo content):** No research was done on what makes a *karting* track (vs. an F1 circuit) read as authentic — real kartodromo layouts tend to be tighter, more technical, with different landmark vocabulary than a Grand Prix circuit. Worth a light research/reference pass before authoring.

Phases with standard patterns (skip research-phase):
- **Phase 1 (renderer foundation):** Canonical, well-documented technique (Jake Gordon's reference implementation) with HIGH-confidence sourcing; implement directly against the reference.
- **Phase 3 (AI port):** Existing racecraft logic is proven and just needs coordinate-system porting; the porting pattern is well-specified in ARCHITECTURE.md.
- **Phase 5 (progression):** Direct extension of an already-shipped `localStorage` pattern; no new research needed.
- **Phase 6 (multiplayer payload):** Small, well-bounded schema change on an unchanged transport; no new research needed.
- **Phase 7 (mobile regression):** Re-verification of already-solved, already-documented problems in this exact codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | STACK.md's recommendations (Canvas 2D segment technique, Three.js rejection, hand-rolled audio/physics, PeerJS unchanged) are fully unaffected by the karting/closed-lap pivot — nothing in that research was branching- or F1-specific. |
| Features | MEDIUM | FEATURES.md was researched against point-to-point branching and F1 theming; the table-stakes/MVP core (renderer, drift, speed sensation, AI parity, one track, best-time, rank, ghost) transfers cleanly and its complexity estimates hold, but the branching-dependent portions (differentiators, MVP sequencing that assumed multiple forked stages) had to be dropped rather than confirmed against the new scope. |
| Architecture | HIGH for what's kept | Component-by-component migration mapping (track-space car state, dense segment table, reused arc-length progress, extended physics/audio, simplified multiplayer payload) is HIGH confidence, read directly against the current `game.js`. The branch-graph-specific portions (Pattern 3, multiplayer edge-id disambiguation) are explicitly NOT APPLICABLE under the corrected scope, not merely uncertain. |
| Pitfalls | HIGH for renderer/drift/mobile; N/A for branching | Renderer, drift, AI-parity, and mobile-regression pitfalls are HIGH confidence (verified against the canonical reference implementation and direct reading of the current codebase) and apply unchanged under the pivot. The two branch-specific pitfalls (progress-model retrofit, multiplayer divergence) are the single biggest risk category the pivot removed — noted as a simplification, not a gap. |

**Overall confidence:** MEDIUM-HIGH — the technical foundation (stack, renderer/physics/audio architecture, core pitfalls) is solidly researched and transfers cleanly through the pivot; what needs fresh attention during requirements/roadmap work is re-deriving feature scope and MVP sequencing cleanly for a single closed-lap karting track rather than a multi-stage branching campaign, and validating the "grounded, not floaty" handling target through actual playtesting rather than research alone.

### Gaps to Address

- **"Grounded kart handling" (low ground clearance, twitchier, more mechanical grip, less aero) is a MEDIUM-confidence extrapolation, not a researched fact.** None of the four source files directly researched how a go-kart should feel distinct from either an F1 car or a Mario Kart-style kart. Treat the drift-handling phase's tuning target as a hypothesis to validate through playtesting, not a spec to implement literally.
- **Karting-specific track-identity references were not researched.** All track-identity findings (OutRun, Horizon Chase Turbo) are drawn from car-racing precedents, not kart-racing/kartodromo-specific ones. A light reference pass (real kartodromo layouts, typical technical-corner density) would sharpen Phase 4 before content authoring starts.
- **Whether the existing DRS mechanic has any place in a karting context is unresolved.** The current game's DRS (F1-specific, draft-detection-based boost) was going to be "reframed" per the original branching-scoped research; under the karting pivot, DRS's F1-authenticity rationale is weaker and it risks competing for "boost" identity with the new drift-boost mechanic. Flag this as an explicit decision to make during REQUIREMENTS.md — likely candidates are "drop DRS for this milestone" or "keep it as a separate, clearly-differentiated proximity boost," but this wasn't resolved by research.
- **New car-sprite art requirement (fixed view-angle frames vs. today's rotatable top-down sprite) is scoped but not sized.** ARCHITECTURE.md flags this as "a new art requirement, not just code" but doesn't estimate how many frames/angles are needed or how they interact with the existing 16-cell tileset/palette pipeline. Worth a scoping pass early in Phase 1.
- **Ghost-replay data shape and storage budget are reasoned from first principles, not load-tested.** FEATURES.md's LOW-MEDIUM complexity correction is well-argued (a sampled array is simpler than the shipped AI system, comfortably under `localStorage`'s ~5MB origin limit) but wasn't validated with an actual implementation. Low risk given the margin involved; confirm during Phase 5 implementation rather than pre-emptively researching further.

## Sources

### Primary (HIGH confidence)
- [How to build a racing game — straight roads / curves / conclusion (Jake Gordon, jakesgordon.com)](https://jakesgordon.com/writing/javascript-racer-v1-straight/) and [jakesgordon/javascript-racer GitHub](https://github.com/jakesgordon/javascript-racer) — canonical, MIT-licensed reference implementation for the segment-projection technique this milestone's renderer is built on; still the standard 2026 reference per current search.
- Direct reading of the current `game.js`, `CLAUDE.md`, and `.planning/PROJECT.md` (this repository) — ground truth for existing architecture, physics constants, audio module, multiplayer protocol, and prior mobile/iOS fixes that all "extend, don't replace" recommendations are anchored to.
- [Three.js UMD/global build deprecation — three.js forum](https://discourse.threejs.org/t/build-three-js-depreciation/53915) — confirms the legacy no-bundler Three.js path is gone, supporting the decision to stay on Canvas 2D.

### Secondary (MEDIUM confidence)
- [Lou's Pseudo 3D Page](https://www.extentofthejam.com/pseudo/) — corroborating reference for the segment/projection technique, including elevation handling.
- [Mini-Turbo](https://mariokart.fandom.com/wiki/Mini-Turbo) and [Drift — Mario Kart Racing Wiki](https://mariokart.fandom.com/wiki/Drift) — community-verified description of tiered drift-boost mechanics used as the camera/handling reference point (not a design target for chaos/items).
- [Out Run — Grokipedia](https://grokipedia.com/page/Out_Run) and [Horizon Chase Turbo Trophy Guide (PSNProfiles)](https://psnprofiles.com/guide/8513-horizon-chase-turbo-trophy-guide) — genre precedent for track-identity and no-backend progression patterns; branching-specific portions of the OutRun precedent are not applicable to this milestone's closed-lap scope.
- Kart-drift physics conventions (slip-angle/heading-vs-velocity lag, charge/release) — WebSearch-only, cross-referenced across a Pixi.js drift-physics writeup, a GameDev.net arcade-drift discussion, and a Unity Discussions arcade-kart-physics thread; genre-standard but not verified against one authoritative source — flagged for playtest validation.

### Tertiary (LOW confidence)
- [Racing Games With The Best Sense Of Speed (Game Rant)](https://gamerant.com/racing-games-best-sense-feel-speed/) — enthusiast press, used only for a genre-standard speed-cue checklist, cross-checked against the Jake Gordon technical source.
- [Saving Game Progress with LocalStorage (abratabia.com)](https://www.abratabia.com/game-saves/localstorage-saves.php) — used only to sanity-check that `localStorage` capacity is adequate for ghost/rank/best-time persistence at this project's scale.

---
*Research completed: 2026-08-15*
*Ready for roadmap: yes — with the scope correction above applied; recommend REQUIREMENTS.md explicitly restate the karting/closed-lap/no-narrative scope so it isn't lost to the original branching-framed research files.*
