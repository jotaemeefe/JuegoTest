# Pitfalls Research

**Domain:** Migrating an existing top-down 2D Canvas racer (spine/arc-length track model, 1v1 PeerJS multiplayer) to a pseudo-3D OutRun-style chase-cam renderer with kart-style drift and branching point-to-point stages
**Researched:** 2026-08-15
**Confidence:** MEDIUM-HIGH (renderer/drift patterns verified against the classic reference implementation and well-documented arcade-kart mechanics; branching-retrofit and multiplayer-divergence pitfalls are derived directly from reading the current `game.js` implementation, so they are project-specific rather than generic)

This research assumes v3.0 "Arcade Rebirth" replaces top-down rendering, the closed-lap Monaco spine, and the current progress/DRS/overtake system, while keeping the vanilla-JS/Canvas2D/PeerJS/no-build constraint and 1v1 multiplayer. Pitfalls below are scoped to *this specific migration*, not generic game-dev advice.

## Critical Pitfalls

### Pitfall 1: The road-segment renderer silently breaks on combined curve+hill segments

**What goes wrong:**
The classic OutRun-clone technique (Jake Gordon's `javascript-racer`, the de facto reference for this exact effect) projects each road segment independently using screen-space scale = `cameraDepth / (segment.z - cameraZ)`. When curvature (x-offset per segment) and elevation (y-offset per segment) are applied together without properly compounding them through the same perspective divide, the road appears to "kink," the horizon warps unnaturally on hill crests taken mid-corner, or the road surface intersects itself. This is the single most common bug reported by every "I followed the OutRun tutorial" clone.

**Why it happens:**
Curve accumulates as `dx = curve` added *after* projection per segment, while hills accumulate as `dy` added to camera height *before* projection. Developers who add hills to an existing curves-only renderer (or vice versa) often add both offsets at the same integration point, which works for either effect alone but produces visibly wrong perspective when a corner and a crest coincide — exactly the "saltos, curvas únicas" (jumps, unique curves) the project's Active requirements call for.

**How to avoid:**
Keep curve and hill as two independent per-segment accumulators (`curve`, `y`) that are both folded into the *same* single perspective projection call per segment (project x and y together, not curve-then-project-then-shift-y). Build and visually test a "figure-8 crest" test segment (a corner that also crosses a hill) early, before any other track content depends on the projection math being right. Do not let track/stage authoring start until this combination is verified.

**Warning signs:**
Road edges that visibly bend into a "V" or overlap themselves on hill+corner combos; horizon line jumping non-monotonically frame to frame; sprites (trackside objects) appearing to float off the road surface only on hills.

**Phase to address:**
The first phase that builds the chase-cam pseudo-3D renderer — before any stage/branching content is authored on top of it, since track design will implicitly assume the projection is correct.

---

### Pitfall 2: Rendering is done as N% painter's-algorithm segment fills without a way to cheaply skip off-screen work

**What goes wrong:**
The straightforward implementation redraws every road segment (typically hundreds per track, drawn as trapezoids via `ctx.fillRect`/`ctx.moveTo`+`lineTo` polygons) every frame, ordered back-to-front, even though only ~100-150 are actually visible given the draw-distance. On top of Canvas2D's own per-call overhead (far higher than a batched WebGL draw), this creates a hard framerate cliff exactly where the project is most exposed: low-end/mobile Safari, which the current game explicitly supports and validates against (`tests/` has mobile capture references).

**Why it happens:**
This is a straight port of desktop tutorial code where segment count and draw distance were tuned against 2010s desktop Chrome, not against a phone GPU/CPU rendering through Canvas2D's software-ish path on iOS Safari. The existing top-down renderer in this codebase (`buildEnvCanvas()`) gets away with a single static pre-rendered background canvas because top-down scenery doesn't need per-frame re-projection — the pseudo-3D renderer has no equivalent shortcut and every developer coming from the current codebase will reach for "cache it in an offscreen canvas" out of habit, which does not work here because the projection changes every frame with camera z/curve/hill.

**How to avoid:**
Cap the number of projected/drawn segments per frame by draw distance (start conservative: ~100-120 segments, same order of magnitude as Jake Gordon's reference implementation), not by track length. Skip segments behind the camera and past draw distance before the projection loop, not after. Batch identical-color segment fills (group consecutive same-color strips into one `fillRect`/path where possible) instead of one canvas call per segment per frame. Profile on actual mid-tier Android Chrome and iOS Safari early — desktop Chrome DevTools throttling is not a reliable proxy for Safari's Canvas2D performance characteristics.

**Warning signs:**
Frame time budget exceeded first on mobile, not desktop; frame drops correlate with track sections that have more visual complexity (crowds, elevation change) rather than car count; `requestAnimationFrame` delta creeping upward only when the phone is not connected to devtools (thermal throttling).

**Phase to address:**
The renderer-building phase, with an explicit mobile-device profiling checkpoint before that phase is considered done — not deferred to a later "polish" phase, because segment-count and draw-distance are architectural, not a late optimization.

---

### Pitfall 3: Sprite pop-in/scaling causes trackside objects (and the rival car) to jitter or snap in size

**What goes wrong:**
Sprites (trackside props, the rival's car in chase-cam) are scaled by the same per-segment perspective factor as the road. If sprite scale is computed once per segment placement instead of continuously as the camera approaches, or if scale steps are too coarse (e.g., driven by integer segment index rather than continuous z-distance), objects visibly "pop" to a new size at fixed intervals instead of growing smoothly — most noticeable on the rival car directly ahead, which is exactly the object the player is staring at in a chase-cam.

**Why it happens:**
The existing codebase's AI/rival car is a first-class simulated entity with continuous world (x, y) coordinates (see `nearestSpinePoint`, `moveCar`); the pseudo-3D renderer's temptation is to treat it like a static prop (snapped to a segment) for reuse of the sprite-drawing code path, which reintroduces stepped scaling.

**How to avoid:**
Compute sprite/rival-car scale from continuous z-distance to camera every frame (interpolate within the segment, don't snap to segment boundaries), not from segment index. Keep the rival car's simulated position (its own x/z along the track) fully continuous, matching how the player's own z-progress is tracked, and only quantize to a segment at draw time for the projection math.

**Warning signs:**
The rival car "teleports" in size as it approaches/recedes instead of smoothly scaling; scaling steps become more visible at low speed (small screen-space delta per frame) where population is easiest to notice.

**Phase to address:**
The renderer-building phase, in the same pass that renders the rival car in chase-cam (do not build road-only rendering and add the rival car as an afterthought — verify sprite scaling against a moving car, not just static props).

---

### Pitfall 4: Drift handling ships either "ice physics" (floaty, no commitment) or "on/off toggle" (twitchy, binary) because there is no existing reference for kart-style slip in this codebase

**What goes wrong:**
The current physics model (`ACCEL_RATE` exponential approach, `GRIP_ON`/`GRIP_OFF` velocity-angle lag, `TURN_RATE` heading rate) produces a *subtle* micro-drift as a side effect of realistic-ish grip — it was explicitly tuned to be barely noticeable ("a little speed... Controls unchanged"). Naively cranking `GRIP_ON` down or `TURN_RATE` up to "add drift" produces one of two failure modes: (a) the car's heading and velocity vector separate so much, with no counter-steer feedback, that the car feels like it's on ice and the player loses the intuition that turning does anything (floaty); or (b) drift is implemented as a boolean state (button held → sideways-snap to a fixed slip angle) with no continuous entry/exit ramp, so the car feels like it's switching between two disconnected physics models every time the drift key is pressed (twitchy).

**Why it happens:**
Kart-arcade drift (Mario Kart-style) is not "more slip" — it is a *distinct, deliberately-entered state* with its own rules: a fixed or speed-scaled slip angle band, steering that widens the arc without directly rotating the heading 1:1, and clear entry/exit thresholds. Retrofitting it onto a continuous "grip constant" model (as this codebase currently has) conflates "reduce grip" with "enter kart drift," which is the wrong mental model and the most common reason drift prototypes feel wrong on the first pass.

**How to avoid:**
Model drift as an explicit state machine (not-drifting → drifting → boosting-exit), not a grip-constant tweak: on drift-button + steer input, lock a slip angle offset (heading vs. velocity direction) proportional to steering input and hold it while the button is held (clamped, not accumulating indefinitely), then use a *separate*, higher, deliberately-tuned steering response for velocity-angle convergence back to heading on release. Build a minimal standalone test harness (empty canvas, one car, no track) to tune the feel numerically before wiring it into the real track, since drift feel is extremely sensitive to a handful of constants (entry slip angle, hold decay rate, max drift steering assist) that are hard to iterate on inside a full race.

**Warning signs:**
Playtesters describe the car as either "slippery/uncontrollable" or "doesn't feel different when I hold drift"; drift angle doesn't scale with steering input (always snaps to the same angle regardless of how hard the player is turning); no visible/audible feedback differentiates "about to boost" from "just drifting."

**Phase to address:**
The kart-handling phase, built and tuned in isolation (a throwaway test scene) before it is wired into the pseudo-3D renderer or any real stage — coupling drift-tuning iteration to full render+track content will make the tuning loop too slow to converge.

---

### Pitfall 5: Boost-on-drift-release becomes either free/spammable (loses skill expression) or invisible/unrewarding (players don't feel it)

**What goes wrong:**
Once drift exists, the natural next step ("mini-turbo" style boost on release) has two common failure tunings: if the boost threshold is trivially easy to hit (any drift of any length grants full boost), players hold-tap drift constantly on straights, which (a) looks visually chaotic/inconsistent with "still an F1-flavored race, not chaos," a stated project constraint, and (b) trivializes the skill ceiling the mechanic exists to create. If the boost is too subtle (small speed delta, no readable telegraph), players can't tell it happened and the mechanic feels decorative — same failure mode DRS avoided in this codebase by giving it a clear on/off HUD state and sound cue.

**Why it happens:**
Boost tuning is usually done by eyeballing a single number (a speed multiplier) without separating the *threshold to earn it* (drift duration/angle held) from the *magnitude and duration of the reward*. Reference implementations (Mario Kart) tier the reward (blue spark → orange spark → purple spark, each a longer/stronger boost) specifically so a *skilled, sustained* drift is visibly and mechanically better than a tap — that tiering is easy to skip when porting the idea in one pass.

**How to avoid:**
Reuse the DRS pattern already validated in this codebase: an explicit state (available/charging/active) surfaced via HUD text/color and a distinct sound cue (`playDrsSound` is the direct precedent), not a silent multiplier. Gate the boost behind a minimum held-drift duration/angle (at least a de facto two-tier system: "held long enough for a small boost" vs. "held longer for a bigger one") so tap-drifting isn't optimal, and make the boost duration short and decaying (like `DRS_BOOST`/`DRS_DURATION_MS`) rather than an instant speed jump, so it reads as an event, not a glitch.

**Warning signs:**
Players (or the AI) drift-tap constantly instead of driving normally; the boost has no distinct visual/audio signature separate from normal acceleration; there is only one boost tier and testers can't tell a "good" drift from a "bad" one by feel.

**Phase to address:**
Same kart-handling phase as Pitfall 4 — boost-on-release must be tuned together with drift entry/exit, not bolted on afterward, since the reward shape determines what "good drift technique" even means for this game.

---

### Pitfall 6: Making the AI drift convincingly requires teaching it a state it never needed before, and a naive port produces either an AI that never drifts (looks robotic through corners the player drifts through) or one that drift-spams unrealistically (since AI has no human muscle-memory cost to pressing the button)

**What goes wrong:**
The current AI (`updateAI()`) steers by waypoint-seeking with speed reduced by "steering demand" — it never needed a concept of *deliberately* entering a slip state, only of not over-steering. If drift is added only to the player's input path, AI cars corner using the old grip model while the player drifts, which reads as inconsistent (the player's car visibly slides through corners the rival AI takes "on rails") and, worse, means the AI never earns boost, making it either uniformly too slow (if boost math assumes drift is available) or requiring compensating pace multipliers that mask the real gap.

**Why it happens:**
Player input is button-driven (discrete drift press), while AI decisions are typically continuous (steering angle output each frame) — there's no natural "button press" for the AI to hook into unless one is deliberately added, so it is easy to skip and treat drift as "a player feature" during initial implementation, only to hit corner-feel mismatch late.

**How to avoid:**
Give the AI the same drift *state machine* as the player, driven by a decision rule instead of a button: enter drift when predicted corner turn angle (already computed for corner-braking in `updateAI()`'s steering-demand logic) exceeds a threshold at current speed, hold for a duration scaled by corner severity (mirroring `personality`-driven variance already used for braking/pressure mistakes), then release for boost like the player. Reuse the existing personality system (aggressive personalities drift later/harder, defensive ones drift conservatively) so AI drift behavior varies per rival the same way braking/pressure mistakes already do, keeping it consistent with the established characterization approach.

**Warning signs:**
AI cars visually corner without any slip while the player's car slides; AI lap-times require a hidden pace multiplier to stay competitive once player drift-boost is in the game (a sign the AI isn't earning the same mechanic); all AI cars drift identically regardless of personality, breaking the "personality" pattern this codebase already established for braking and mistakes.

**Phase to address:**
The kart-handling phase should ship AI drift alongside player drift, not after — do not ship a phase where only the player drifts, since that phase would visibly regress race feel versus even the current top-down AI, which already has convincing, personality-driven cornering.

---

### Pitfall 7: Retrofitting branches onto `trackProgress()`/`SPINE_CUMLEN` breaks ranking, gap display, DRS eligibility and overtake detection all at once, because they all read one number that assumes a single path

**What goes wrong:**
`trackProgress()` currently returns a single scalar (`lap × circuit length + arc-length along one spine`) that four independent systems consume as ground truth: `carAhead()` (ranking/DRS-target), the HUD gap-in-seconds display, `isInDrsZone()`/DRS eligibility (implicitly, since DRS zone detection is spine-segment-index-based), and overtake-event detection (rank-change persistence). The moment two cars can be on *different physical paths* after a branch point, "arc-length along the one spine" stops being well-defined — a car on the shorter branch will read as impossibly far ahead or behind a car on the longer branch at the merge point, producing nonsensical rank flips, DRS availability that doesn't correspond to actual proximity, and false overtake events exactly at every branch merge.

**Why it happens:**
The whole progress system was deliberately built (per the codebase's own comments — "One number that says how far along the race a car is") as a *single* metric specifically because a closed-lap circuit has no ambiguity about position along the route. Branching by definition introduces exactly the ambiguity this design assumed away; there is no way to patch `trackProgress()` piecemeal (e.g., "just clamp it") without addressing the represented data model, since every consumer (ranking, HUD, DRS, overtakes) was written assuming progress is monotonic and comparable across all cars at all times.

**How to avoid:**
Replace the single arc-length spine with a route-graph model: precompute cumulative-length tables per *segment/edge* of the branch graph (not one global spine), and represent a car's progress as (route-so-far, arc-length-into-current-edge) rather than a single scalar. For cross-branch comparisons (ranking, gap, overtakes) while cars are on different branches, don't compare raw arc-length — compare against each branch's known length-to-next-merge-point so "ahead"/"behind" is computed relative to the nearest shared reference point (the merge), falling back to a simple heuristic (e.g., "same as before" or "based on distance-to-merge") only in the window while cars are actually on diverged paths. Treat DRS and overtake-event detection as needing this same route-aware distance, not literal `SPINE_CUMLEN`-style arc-length, from the start — don't ship an interim version that silently mis-ranks branched cars and patch it later, since ranking/HUD/DRS are all player-visible every frame.

**Warning signs:**
Rank/gap display flickers or produces obviously wrong deltas near any branch point; DRS becomes available/unavailable based on a car's spine-segment-index rather than actual proximity to the car ahead once branches exist; overtake toast/flash fires for cars that are visibly nowhere near each other on screen (a strong sign the underlying "progress" comparison, not just its consumers, is wrong).

**Phase to address:**
The phase that introduces branch points must ship the route-graph progress model in the same phase as the branching track structure itself — do not add branching to the track data first and defer the progress-metric rework, since every player-visible system (ranking, gap, DRS, overtakes) depends on it and will silently misbehave the moment branches exist, even in single-player.

---

### Pitfall 8: 1v1 PeerJS sync (raw `{x, y, angle, speed, lap, cp}` broadcast) has no way to express "which branch the remote car took," so multiplayer players can silently race on different geometry

**What goes wrong:**
The current `pos` message is pure world-space coordinates plus lap/checkpoint index — it works because both peers share the exact same track geometry, so a remote (x, y) is unambiguous. Once the track can branch, (x, y) is no longer sufficient to reconstruct where the remote car is *relative to the route graph*: two branches can physically overlap or come close in world space (by design, since they eventually merge), so a naive world-space interpolation (`remoteRenderPos()`) can draw the remote car on the *wrong branch* if the peer took a different fork, and any route-aware distance/ranking computed locally (see Pitfall 7) will be wrong for the remote car if the local client doesn't know which edge of the graph it's actually on.

**Why it happens:**
It's easy to assume "the position sync already works, branching doesn't change the network layer" because the wire format doesn't visibly reference the track at all — the bug is entirely in interpretation, not transmission, so it's easy to miss until two testers actually fork onto different branches in a live P2P session.

**How to avoid:**
Add the current route/edge identifier to the `pos` payload (a small integer index into the branch graph, not just raw coordinates), and use it to disambiguate which edge's geometry to render/interpolate the remote car against and which edge's cumulative-length table to use for the route-aware progress computation from Pitfall 7. Decide product behavior for divergence explicitly rather than letting it fall out of physics: either (a) branches are cosmetic/short and always remerge quickly so divergence windows are brief and gap/rank freezes or uses last-known-branch heuristics during that window, or (b) branch choice is locked to be *identical* for both players in 1v1 (e.g., only the host's choice applies, or branches are simultaneous-choice-then-locked) to sidestep the desync problem entirely. Given the project's stated constraint that 1v1 multiplayer must keep working and is explicitly out of scope for a bigger redesign, prefer whichever option requires the least new synchronization logic — test divergence in a real two-peer session, not by simulating both cars locally, since latency/jitter changes when divergence-window edge cases actually surface.

**Warning signs:**
Remote car renders on top of trackside geometry that doesn't belong to the branch it's actually on; gap/rank numbers between two human players swing wildly right after a branch point in testing; the desync is invisible in single-player testing and only appears when two real peers actually pick different forks.

**Phase to address:**
The phase that wires branching into multiplayer (should be scoped as its own explicit phase, after single-player branching + route-graph progress from Pitfall 7 are solid, and before considering v3.0 multiplayer "done") — do not assume the existing `Net`/`pos` plumbing "just works" because branching is a single-player track feature; it is not, the moment two humans can diverge.

---

### Pitfall 9: A full rendering/handling/track-format rewrite regresses the mobile and iOS Safari behaviors the current game already got right, because those fixes are easy to lose silently in a rewrite

**What goes wrong:**
This codebase has several hard-won, non-obvious mobile/iOS fixes: Web Audio lazily initialized on first user gesture via `getAudioCtx()` (iOS Safari requires this or audio silently never starts), Pointer Events (not touch events) for on-screen controls specifically to fix a "stuck key" bug (`pointerleave`/`pointercancel` release logic), `devicePixelRatio`-aware canvas sizing, and a responsive layout that keeps the game screen within the viewport on mobile (explicitly called out as a past regression — "fix(mobile): game screen fits the viewport"). A rewrite of the renderer and control scheme (chase-cam likely changes what "left/right" mean relative to camera-relative vs. world-relative steering, and drift likely needs a new touch control — e.g., a drift button/gesture) is exactly the kind of change where these fixes get dropped because the new code doesn't obviously touch "the mobile stuff," even though it does.

**Why it happens:**
Mobile/iOS fixes are cross-cutting and were added incrementally as bugs were found in production (the commit history shows this: "fix(mobile): game screen fits the viewport", "Pointer Events API... pointerleave fires when finger slides off the button, fixing stuck-key bug"), so they aren't concentrated in one obviously-reusable module — a rewrite of the input/render layer can easily reintroduce the exact bugs each fix addressed unless those specific behaviors are treated as requirements, not implementation details, of the new code.

**How to avoid:**
Before starting the rewrite, extract the existing mobile/iOS behaviors as an explicit checklist of requirements (see "Looks Done But Isn't" below) and re-verify each one against the new renderer/controls, not just "does it run on my phone." Any new touch control (drift button, if one is added) must reuse the same Pointer Events pattern (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave`) already proven in `bindTouch()`/the DRS button binding, not a fresh touch-event implementation. Keep `getAudioCtx()`'s lazy-init-on-gesture pattern regardless of how much the audio subsystem changes (e.g., new drift/boost sound cues) — any new sound must be created through the existing lazy `AudioContext`, not a new one. Re-run/extend the existing `tests/` smoke tests and reference screenshots (`r4a-smoke.test.js`, `r4b-release.test.js`, desktop/mobile/DRS captures) against the new build rather than starting a fresh test approach, since they already encode known-good mobile geometry.

**Warning signs:**
Audio works on desktop Chrome during dev but is silent on an actual iPhone the first time someone tests on real hardware; on-screen buttons "stick" (steering/braking continues after finger lift) after any touch-control rework; the game canvas is cut off or requires scrolling on a phone after camera/HUD layout changes for chase-cam.

**Phase to address:**
Every phase that touches rendering, input, or audio must explicitly re-verify this checklist before being marked done (it is not a single phase's job) — but there should additionally be one final regression/polish phase before v3.0 ships that re-runs the full mobile/iOS checklist end-to-end against the completed rewrite, since individual phases can each pass in isolation while the cumulative change still regresses something.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Tune drift feel directly inside the full race scene instead of an isolated test harness | Skips building throwaway scaffolding | Slow iteration loop (must race a full lap to feel one drift tweak); tuning session pollutes git history with unrelated commits | Never for the initial feel pass — acceptable only for final micro-tuning once the harness has already converged on rough numbers |
| Reuse `SPINE_CUMLEN`-style single-array arc-length for an early branching prototype ("just clamp progress at the fork") | Fast to prototype a single branch visually | Every consumer (rank/gap/DRS/overtake) silently misbehaves at merge points; the patch has to be thrown away, not extended, once real branching ships | Acceptable only for a throwaway visual-only spike explicitly not wired to ranking/HUD/DRS |
| Ship chase-cam rendering with a fixed, generous segment draw-distance untested on real mobile hardware | Looks good immediately on the dev's desktop | Frame-rate cliff discovered late, forcing a scramble to cut draw distance/segment count after track content already assumes a certain view distance | Never — mobile profiling must happen during the renderer phase, not after |
| Broadcast raw world (x, y) over PeerJS without a route/edge id, deferring branch-aware sync | Multiplayer "still works" for the non-branching parts of the migration | Silent desync/mis-render the first time two real peers diverge; discovered late because single-player and simulated testing won't surface it | Acceptable only if branching is deliberately disabled/locked in multiplayer for an interim milestone, with that constraint explicit in code and docs |
| Let AI keep the old no-drift cornering while only wiring drift for the player, to ship the player-facing feature faster | Player-visible drift ships sooner | Corner-feel mismatch (player slides, AI doesn't) is highly visible and reads as a regression versus current, already-convincing AI cornering | Never for a shippable phase — acceptable only as an internal WIP checkpoint within a phase, not as a phase's Definition of Done |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|--------------------|
| PeerJS / WebRTC DataChannel | Assuming position sync semantics don't need to change because "the wire format still looks the same" (x, y, angle, speed, lap, cp) | Add a route/edge identifier to the payload the moment branching exists; treat position sync as track-graph-aware, not just world-space, from the branching-multiplayer phase onward (Pitfall 8) |
| Web Audio API (iOS Safari) | Creating any new `AudioContext` (e.g., for new drift/boost SFX) outside the existing lazy `getAudioCtx()` gesture-gated singleton | Route every new sound (drift, boost, jump landing, etc.) through the existing `getAudioCtx()` pattern; never instantiate a second context |
| Pointer Events for touch controls | Implementing a new drift-button or camera-relative steering control with raw `touchstart`/`touchend` instead of the established Pointer Events pattern | Reuse `bindTouch()`'s pattern (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave` with `setPointerCapture`) for any new on-screen control |
| Canvas2D on iOS Safari | Assuming desktop Chrome DevTools CPU throttling is representative of iOS Safari's Canvas2D fill-rate/compositing performance for a segment-heavy pseudo-3D renderer | Profile the actual segment-fill workload on real iOS Safari (or at minimum a representative mid-tier Android browser) before locking in draw-distance/segment-count constants |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|------------------|
| Per-frame road-segment redraw with no draw-distance culling | Frame time scales with total track length instead of visible depth; fine on short test tracks, degrades as real stages get longer | Cull to a fixed segment count ahead of camera before the projection/draw loop; decouple "segments authored" from "segments drawn per frame" | Becomes visible once a stage exceeds roughly the same order of magnitude of segments as fit in the draw-distance window (a few hundred) — i.e., almost immediately once real stage content is authored, not just the first test track |
| One canvas draw call per road segment per frame (no batching of same-color/consecutive strips) | Desktop feels fine, mobile (especially iOS Safari) drops frames well before desktop would predict | Batch consecutive segments of identical fill style into single path/fillRect calls where the projection allows it | Breaks first on mobile at moderate segment counts (~100+), long before desktop shows any strain — easy to miss if only desktop-tested |
| Sprite (trackside prop / rival car) draw order recomputed by a full sort every frame instead of using the segment-ordered back-to-front structure already implied by the projection loop | Extra CPU cost that scales with prop count; most visible when trackside "identity" props (jumps, unique curve scenery — an explicit v3.0 goal) get added in bulk | Attach sprites to their owning segment at authoring time and draw them in the same back-to-front segment sweep (two-phase: segments front-to-back for the road, sprites back-to-front within visible range), not via a global per-frame sort | Breaks once prop density increases for "sensación de lugar" (place identity) content — i.e., exactly when the visual-identity goal is being pursued, so it's easy to hit late in content production rather than early in engineering |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting a remote peer's route/edge id and position unconditionally once branching is added to the `pos` message | A malicious/modified client could claim to be on a shorter branch, or report position/progress values that make it appear to always be ahead, cheating the (already-present) range-validation model | Extend the existing "range checks before applying" validation (already used for `pos` data per CLAUDE.md) to also validate that the reported route/edge id is a legal edge from the car's last known edge (no teleporting across the graph) before applying remote state |
| Letting a peer send a `cp`/checkpoint or route-edge index that skips required branch-graph gates (the anti-shortcut pattern `CPS[1..3]` already establishes for the closed lap) | A modified client could claim to have taken a shortcut branch it never actually visited, invalidating race results between two human players | Port the existing "gates hit in order, out-of-order crossing counts nothing" pattern to the branch graph: define required-gate ordering per edge/branch and validate remote-reported progression against it, exactly as `nextCP` already guards the single-spine case |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Branch choice with no advance signal (player discovers the fork exists only as they arrive at it) | Feels like a random coin-flip rather than a skill/strategy choice, undermining the "diseño de pista con identidad" (track design with identity) goal | Telegraph forks well before the decision point (visual signage/road markings/camera framing), consistent with how real arcade racers (and the existing DRS zone, which is clearly signposted via HUD) always give the player legible advance warning of a mechanic window |
| Drift and boost with no distinct audio/visual signature (reusing generic engine/skid sounds for everything) | Players can't tell "good" drift technique from "bad," so the mechanic feels arbitrary rather than skill-based — same trap DRS avoided by having a distinct sound (`playDrsSound`) and HUD state | Give drift-charging and boost-release their own sound cues and a HUD/visual tell (e.g., spark-color tiering), mirroring the DRS HUD pattern (`DRS DISPONIBLE` / `DRS ABIERTO` states) already proven to read clearly in this game |
| Gap/rank HUD flicker near merge points once branching + route-graph progress ships | Players lose trust in the position readout, which currently (single-spine) is one of the game's strongest, most-polished systems ("real-seconds gap display," "overtakes honestos") | Smooth/hold rank and gap display across the actual divergence-then-merge window rather than showing raw frame-to-frame route-graph comparisons, reusing the existing overtake-event persistence pattern (600ms hold, 3s cooldown) as the template for how to avoid noisy flicker |

## "Looks Done But Isn't" Checklist

- [ ] **Pseudo-3D renderer:** Often missing a verified curve+hill combination test — verify by building one deliberately awkward test segment (sharp corner directly on a crest) and confirming the road edges don't visibly kink or self-intersect (Pitfall 1)
- [ ] **Pseudo-3D renderer:** Often missing real mobile/iOS Safari profiling — verify by running the actual build (not a desktop-throttled simulation) on a real mid-tier phone and iPhone before locking segment-count/draw-distance constants (Pitfall 2)
- [ ] **Drift handling:** Often missing AI parity — verify every AI personality actually enters/exits the drift state visibly in at least one corner per lap, not just the player (Pitfall 6)
- [ ] **Drift handling:** Often missing a tiered boost reward — verify a short tap-drift and a held, well-timed drift produce visibly/audibly different outcomes, not the same flat boost (Pitfall 5)
- [ ] **Branching progress system:** Often missing route-aware rank/gap/DRS/overtake logic — verify by forcing two cars onto different branches in a test and confirming rank, gap-in-seconds, and DRS eligibility remain sane through the divergence-then-merge window, not just that the branch renders (Pitfall 7)
- [ ] **Multiplayer:** Often missing branch-divergence handling — verify with two actual peer connections (not two local simulated cars) forking onto different branches, confirming the remote car renders on the correct branch geometry (Pitfall 8)
- [ ] **Mobile/iOS regression:** Often missing verification that lazy Web Audio init, Pointer Events touch controls, and viewport-fit layout still hold after the rewrite — verify against the existing `tests/` smoke tests and reference captures, extended to cover any new drift/boost control or chase-cam HUD layout (Pitfall 9)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|-------------------|
| Curve+hill projection bug shipped and discovered after track content is authored | MEDIUM | Fix the projection math centrally (one function); re-verify existing authored segments render correctly post-fix — do not re-author track content, since the bug is purely in the projection layer, not the data |
| Segment-count/draw-distance perf cliff discovered late on mobile | LOW-MEDIUM | Reduce draw distance and/or add batching (see Performance Traps) — these are tunable constants and a rendering-loop optimization, not a data-model change, so recovery doesn't touch track content |
| Drift feels wrong after full integration (floaty or twitchy) | MEDIUM | Extract the drift state machine back into an isolated test harness to re-tune constants without the overhead of a full race scene, then re-integrate — avoid tuning live inside the full game loop, which is what caused the problem |
| `trackProgress()`/route-graph retrofit shipped without route-awareness, rank/gap/DRS visibly break at branch points | HIGH | This is the costliest recovery on this list — every consumer (rank, gap, DRS, overtake) needs to be re-pointed at the new route-aware distance function; treat it as a full replacement of the progress subsystem, not a patch, and budget a dedicated phase for it rather than attempting a hotfix |
| Multiplayer desyncs when peers diverge onto different branches (discovered late, e.g. during playtesting) | MEDIUM-HIGH | Add the route/edge id to the `pos` payload and gate remote-car rendering/progress on it; if timeline pressure is high, the cheaper interim fix is to lock branch choice identically for both peers (removing divergence entirely) rather than building full divergence-aware sync |
| Mobile/iOS regression discovered post-rewrite (audio silent, controls sticky, layout cut off) | LOW | These are well-understood, previously-solved problems in this exact codebase — re-apply the known patterns (`getAudioCtx()` lazy init, Pointer Events with `pointerleave`/`pointercancel`, `devicePixelRatio`-aware sizing) rather than re-diagnosing from scratch |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|-----------------|
| Curve+hill projection bugs (P1) | First chase-cam renderer phase | Deliberate corner-on-crest test segment renders without visible kinking/self-intersection |
| Segment-count/draw-distance perf cliff (P2) | First chase-cam renderer phase | Frame time measured on real mobile hardware (not desktop-throttled) stays within budget at target draw distance |
| Sprite/rival-car scaling pop-in (P3) | First chase-cam renderer phase (rival car render pass specifically) | Rival car scale changes smoothly frame-to-frame at low speed, no visible size steps |
| Floaty/twitchy drift (P4) | Dedicated kart-handling phase, tuned in an isolated harness before track integration | Playtest feedback distinguishes "controllable slide" from both "ice" and "on/off snap" |
| Boost-on-release balance (P5) | Same kart-handling phase as P4 | Tap-drift and held-drift produce visibly/audibly different, tiered outcomes; boost has its own HUD/sound signature (DRS-pattern reuse) |
| AI drift parity (P6) | Same kart-handling phase as P4/P5 — shipped together, not deferred | Every AI personality visibly drifts through at least one corner per lap; no hidden pace multiplier required to compensate for AI not drifting |
| `trackProgress()`/route-graph retrofit (P7) | The phase that introduces branch points (route-graph model ships in the same phase as branching itself) | Two cars forced onto different branches in a test still produce sane rank/gap/DRS/overtake behavior through the merge |
| Multiplayer branch divergence (P8) | Dedicated branching-multiplayer phase, after P7 is solid, before v3.0 multiplayer is considered done | Two real PeerJS peers diverge onto different branches in a live session; remote car renders on correct branch geometry, no rank/gap nonsense |
| Mobile/iOS regressions (P9) | Every rendering/input/audio-touching phase individually, plus one final end-to-end regression/polish phase before ship | Existing `tests/` smoke tests and reference captures (extended for new controls/HUD) pass on real iOS Safari and a representative Android browser |

## Sources

- [How to build a racing game - conclusion (Jake Gordon)](https://jakesgordon.com/writing/javascript-racer-v4-final/) — HIGH confidence: the de facto reference implementation for this exact pseudo-3D road-segment technique; confirms the back-to-front sprite painter's-algorithm requirement, sprite clipping against hill horizons, and the general architecture pitfalls of the technique.
- [javascript-racer GitHub repo (Jake Gordon)](https://github.com/jakesgordon/javascript-racer) — HIGH confidence: source implementation referenced above.
- [How to build a racing game - straight roads (Jake Gordon)](https://jakesgordon.com/writing/javascript-racer-v1-straight/) — MEDIUM confidence: foundational projection math for the segment technique.
- [Mini-Turbo — Mario Kart Racing Wiki](https://mariokart.fandom.com/wiki/Mini-Turbo) — MEDIUM confidence: documents the tiered drift-boost reward structure (spark color tiers) that this project's boost-on-release design should mirror.
- [Drift — Mario Kart Racing Wiki](https://mariokart.fandom.com/wiki/Drift) — MEDIUM confidence: documents drift-as-distinct-state mechanics referenced in Pitfall 4/5.
- Direct reading of the current `game.js` (`trackProgress()`, `SPINE_CUMLEN`, `crossedFinish()`, `carAhead()`, `isInDrsZone()`/`useDRS()`, `moveCar()`/`applyWallContact()`/`resolveCarCollision()`, `Net` PeerJS wiring, `bindTouch()`, `getAudioCtx()`) and `CLAUDE.md`/`PROJECT.md` — HIGH confidence: these are project-specific pitfalls derived directly from the existing implementation, not third-party sources, and describe exactly what will break when this codebase specifically is extended with branching/pseudo-3D/drift.

---
*Pitfalls research for: Colapinto F1 Racer v3.0 "Arcade Rebirth" migration (top-down closed-lap → pseudo-3D chase-cam, kart drift, point-to-point branching)*
*Researched: 2026-08-15*
