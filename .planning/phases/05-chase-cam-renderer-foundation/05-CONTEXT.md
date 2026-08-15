# Phase 5: Chase-Cam Renderer Foundation - Context

**Gathered:** 2026-08-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the top-down renderer with a pseudo-3D, third-person chase-cam road-segment renderer
(Canvas 2D, no WebGL), proven correct on curves, hills, and their combination, on a
brand-new synthetic test loop — before any real kartodromo content is authored (that's Phase 8).

**Explicit priority: this phase must produce a genuinely playable first version, not a
technical demo.** The player drives the test loop end-to-end with today's controls/physics,
sees a basic HUD, and experiences the new camera and an early illustrated kart — so the
direction can be validated early, before the team is deep into drift/AI/content work.

Requirements: RENDER-01, RENDER-02, RENDER-03, RENDER-04 (see REQUIREMENTS.md).

</domain>

<decisions>
## Implementation Decisions

### Delivery scope
- **D-01:** Phase 5 replaces the live game view directly — no separate test/dev harness. Hitting "play" in VS CPU already shows the new chase-cam renderer.
- **D-02:** The test loop is a brand-new, simple synthetic track (basic oval with at least one curve+crest combination per RENDER-03) — NOT Mónaco. Mónaco (`ROAD_SPINE`, the old top-down render pipeline) is retired starting this phase and is never touched again once the rewrite starts.
- **D-03:** Current (non-drift) controls and physics still drive the kart during this phase — steering/accel/brake same as today (`updateCar()`), just re-projected through the new camera/coordinate mapping. Drift-specific handling lands in Phase 6, not here.
- **D-04:** Multiplayer is explicitly allowed to go stale/non-functional during Phases 5-9 (it still sends the old world x/y `pos` payload against a renderer/track model that has moved on). This is accepted, not a blocker — multiplayer is fixed in Phase 10.
- **D-05:** Multiplayer entry points (create/join room buttons) are hidden from the lobby for the duration of Phases 5-9, reappearing only once Phase 10 lands. VS CPU is the only visible mode during the rewrite — avoids exposing a broken multiplayer flow.

### Art direction (milestone-wide pivot — affects Phase 8 heavily, noted here because it changes this phase's placeholder choices)
- **D-06:** v3.0's art direction moves away from the pixel-art tile/palette pipeline (4A/4B) toward a hand-drawn/painterly "Silksong-style" look (reference: Hollow Knight: Silksong). What's wanted is the TECHNIQUE — illustrated, textured, with depth/atmosphere — NOT Silksong's dark/gothic mood. Palette should stay bright/warm, consistent with a sunny day of karting in Argentina, not gray/gothic.
- **D-07:** This pivot invalidates REQUIREMENTS.md's current ART-01 wording ("mismo estilo pixel-art que 4A/4B"). Flagged for update — REQUIREMENTS.md should be corrected to describe the Silksong-technique/bright-palette direction instead of pixel-art, ahead of Phase 8 planning.
- **D-08:** For Phase 5 specifically, reusing the existing 4A/4B pixel-art tile textures as the test-loop's road/ground/kerb surface is fine and intentional — purely functional/throwaway, it validates that the texture-sampling and per-segment projection pipeline works. It gets fully replaced by real Silksong-style art in Phase 8. Do not invest in new track textures now.
- **D-09:** Unlike the track surface, the kart/pilot sprite should get an early illustrated (non-pixel-art) attempt already in this phase — not a placeholder box/silhouette. It's understood this may be refined or replaced in Phase 8, but seeing something closer to final style helps validate the view-angle-frame rendering approach and gives the "first playable version" real visual identity.

### Camera
- **D-10:** Chase-cam framing is tight and aggressive — camera low and close behind the kart, prioritizing speed sensation over forward track visibility. Closer to classic OutRun/Mario Kart framing than a pulled-back, more "readable" view. Directly serves the "handling shouldn't feel soso" goal from the milestone's problem statement.

### HUD
- **D-11:** Existing HUD elements (lap counter, speed, position) are adapted onto the new chase-cam view already in this phase, not deferred — the first playable build should feel like a real (if unpolished) game, not a bare rendering tech demo.
- **D-12:** The minimap is removed for this phase — a basic oval test loop isn't worth showing on a minimap. It returns in Phase 8 once the real kartodromo exists and a minimap is actually useful.
- **D-13:** HUD visual style begins moving toward the new Silksong-style direction already in Phase 5 (typography/color treatment), rather than staying frozen in the current Alpine blue/pink design untouched until Phase 8.

### Claude's Discretion
- Exact camera FOV/height/distance numeric tuning — within the "tight and aggressive" direction (D-10).
- Exact shape/layout of the synthetic test loop, as long as it includes a curve+crest combination (RENDER-03) and reads as a believable, drivable oval.
- Execution approach for the early illustrated kart sprite (D-09) — style exploration is allowed to be rough; polish is Phase 8's job.
- How much of the HUD gets restyled now (D-13) vs. left functional-only — as long as lap/speed/position are legible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & milestone scope
- `.planning/REQUIREMENTS.md` — RENDER-01..04 (this phase's requirements); note ART-01's pixel-art wording is stale per D-07, correct before Phase 8 planning
- `.planning/PROJECT.md` — Current Milestone: v3.0 Arcade Rebirth section (goal, target features, out-of-scope)
- `.planning/ROADMAP.md` — Phase 5 section (goal, success criteria, depends-on)

### Technical research (primary implementation reference)
- `.planning/research/SUMMARY.md` — synthesized recommendation: Canvas 2D road-segments technique (Jake Gordon's reference implementation), rejection of WebGL/Three.js, 8-step build order, and the corrected (closed-lap, no-branching) scope
- `.planning/research/STACK.md` — full stack rationale (renderer technique, audio extension, PeerJS unchanged)
- `.planning/research/ARCHITECTURE.md` — component-by-component migration mapping (track-space car state, dense `SEGMENTS[]` table, reused arc-length progress pattern), read directly against current `game.js`
- `.planning/research/PITFALLS.md` — Pitfall 1 (curve+hill projection break) and Pitfall 2 (mobile draw-distance/perf cliff) are this phase's most relevant risks (RENDER-03, RENDER-04)

### Existing code (stale — read with caution)
- `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/STACK.md` are dated 2026-06-26 and describe a much earlier state of the game (pre-Monaco, 480×640 canvas, isometric projection, 20 rivals). **Do not trust these for current game.js structure** — the fresh `.planning/research/ARCHITECTURE.md` (read directly against today's ~2691-line `game.js`) supersedes them for this milestone.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing Web Audio synth module (`getAudioCtx()`, engine/brake tone primitives) — untouched by this phase, but the renderer's speed-sensation work (RENDER-02) should hook into existing pitch-scaling patterns rather than build new audio infra.
- `assets/r4a-tileset.png` (16-cell pixel-art tileset) — reused as Phase 5's throwaway placeholder texture source per D-08.
- Current player input handling (`keys` object, touch bindings) — unchanged this phase; steering/accel/brake wiring stays as-is, just feeding the new camera/render layer.

### Established Patterns
- Current game loop / phase state machine (`countdown` → `racing` → `done`, `startLoop()`/`stopLoop()`) — the renderer swap happens inside this existing loop structure, not a parallel system.
- `buildEnvCanvas()`-style prebake pattern cannot produce a chase-cam view (perspective changes every frame) — per research ARCHITECTURE.md, this is a full replace for the render step specifically, while the underlying tile/sprite extraction utilities are reusable.

### Integration Points
- Lobby screen (`index.html` / `goTo()`): multiplayer entry points (create/join buttons) need to be hidden per D-05 — this is a UI-layer change alongside the renderer work, not deferred to a later phase.
- HUD DOM/canvas overlay elements: adapted in-place per D-11/D-12/D-13, not rebuilt from scratch.

</code_context>

<specifics>
## Specific Ideas

- **Visual reference: "Silksong-style"** (Hollow Knight: Silksong) — hand-drawn/painted illustration technique with texture and atmospheric depth. Explicitly NOT the dark/gothic mood — palette should read as a bright, warm, sunny day of karting in Argentina.
- Camera should feel like classic OutRun / Mario Kart chase-cam: low, close, aggressive — speed over visibility.
- The milestone's "first playable" goal is explicit: by the end of Phase 5, there should be something a person can actually sit down and drive, not just a rendering proof-of-concept.

</specifics>

<deferred>
## Deferred Ideas

- Real kartodromo content, landmarks, elevation storytelling — Phase 8 (TRACK-01, TRACK-02).
- Final (non-throwaway) track/environment art in the Silksong-style direction — Phase 8, once D-07's REQUIREMENTS.md correction is made.
- Minimap — returns in Phase 8 with the real kartodromo.
- Multiplayer payload/rendering fixes — Phase 10.
- Full HUD redesign (beyond D-13's early style nudge) — likely folds into Phase 8's art pass; not this phase's job to finish.

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 5-Chase-Cam Renderer Foundation*
*Context gathered: 2026-08-15*
