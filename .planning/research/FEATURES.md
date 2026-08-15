# Feature Research

**Domain:** Pseudo-3D chase-cam arcade racer (OutRun-style rendering + Mario-Kart-style handling feel), F1/Colapinto themed, point-to-point branching stages, no items/combat
**Researched:** 2026-08-15
**Confidence:** MEDIUM-HIGH (camera/rendering and handling mechanics are well-documented, verified across multiple sources; progression-loop complexity estimates for a vanilla-JS solo project are reasoned from first principles + verified localStorage precedent)

## Feature Landscape

### Table Stakes (Users Expect These)

Features a pseudo-3D chase-cam arcade racer is judged broken without. These map directly to the three research areas.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Chase-cam pseudo-3D road rendering (scaled/projected segments) | This *is* the genre signature (OutRun, Lotus Turbo Challenge, Cruis'n). Without it the game is just re-skinned top-down. | HIGH | Classic technique: track is a list of fixed-length segments, each projected to screen via similar-triangles scaling (`scale = cameraDepth / z`). Curve = per-segment world-X offset accumulated frame to frame; hill/jump = per-segment world-Y offset. This replaces the entire render pipeline (`buildEnvCanvas`, camera translate/lerp, tile pipeline) — it is not an incremental change to the current renderer. [jakesgordon.com, HIGH confidence — canonical open-source reference implementation in plain JS/Canvas, same stack as this project] |
| Speed sensation via segment scroll rate, not frame timers | Player must *feel* 300 km/h even though the world is flat 2D math. Missing this makes acceleration/DRS boosts feel inert regardless of the numbers. | MEDIUM | Canonical trick: alternate rumble-strip/road colors keyed to *distance traveled* (segment index), not elapsed time — at low speed stripes crawl, at high speed they strobe. Combine with: widening FOV / lower camera height at high speed, screen shake on curbs, audio pitch scaling (already have an oscillator engine tone — reuse it), particle/scenery streaks at track edges. [MEDIUM confidence, WebSearch cross-referenced with genre-standard sources] |
| Kart-style drift-to-turn handling (not simulation steering) | Player explicitly asked for "Mario Kart handling feel." Flat, grip-based steering (current `TURN_RATE × speed_factor` model) reads as the exact "flat handling" complaint from the milestone brief. | MEDIUM | Needs a genuine state machine: (1) normal steering, (2) drift-initiate (steer past a threshold while holding a drift input/hard turn), (3) car body auto-holds an oversteer angle distinct from input direction, (4) a charge timer accrues while drifting, (5) release/exit applies a decaying speed-boost multiplier keyed to charge tier. This is new state, not a tuning pass on existing `moveCar()`/`velAngle` lag. |
| Tiered drift boost feedback (color-coded charge stages) | Mario Kart's mini-turbo readability (blue → orange → purple sparks) is *the* reason drifting feels skill-expressive rather than random. Players need to see "I'm about to get a boost" before releasing. | LOW-MEDIUM | Visual-only once the state machine exists: spark/particle color + pitch-shifted SFX tied to charge tier thresholds (e.g., 0.3s / 0.8s / 1.4s held). Cheap to add once drift state machine (above) exists — this is a dependent, not a standalone feature. |
| Point-to-point stage structure (start → finish, not closed lap) | Explicit milestone requirement; replaces the 57-point closed `ROAD_SPINE`. | HIGH | New spine authoring model: point-to-point implies no lap-counting, no meta-line re-crossing logic, and the finish/checkpoint system (`crossedFinish`, `CPS[]`, `trackProgress`) needs to become "distance to stage end" rather than "laps × circuit length." Existing arc-length/`SPINE_CUMLEN` machinery is reusable *conceptually* (same prefix-sum trick) but the spine itself must be redesigned per stage. |
| Distinct stage identity (visual theme, landmarks, elevation) | Milestone brief explicitly names "tracks feel empty/generic" as a problem to fix. Every reference title (OutRun's 5+ scenic routes, Horizon Chase Turbo's per-country visuals, Cruis'n's per-locale set dressing) solves replay fatigue with *recognizable place*, not mechanical novelty. | MEDIUM per stage (after the pipeline exists) | Once the pseudo-3D renderer supports per-segment sprite billboards (roadside objects) and hill/curve data, each new stage is mostly *content* (palette, billboard set, elevation profile, curve sequence) rather than new code. First stage is expensive (build the content pipeline); subsequent stages are cheap. This is the core lever for making "replace Monaco" pay off instead of just being a reskin. |
| AI rivals that still race (not just decorate) | Already validated and prized in v2.0 (racecraft: avoidance, blocking, rubber-band, pressure mistakes). Losing this on the rebuild would be a regression the player will notice immediately. | MEDIUM | AI needs porting to the new coordinate model (world-Z distance along spine + world-X lane offset instead of 2D `x,y`) and to branch-aware pathing if branches ship. Racecraft *logic* (time-to-contact avoidance, block, rubber-band, pressure mistakes) is reusable as pseudo-code even though the coordinate math underneath must change. |
| Time display / lap-or-stage clock with a "did I do well" signal | Baseline arcade-racer feedback loop; without it a finish just stops the game with no sense of performance. | LOW | Already exists in spirit (`cr_best_lap_ms` persisted best time). Extend to per-stage best time; trivial with existing `localStorage` pattern. |

### Differentiators (Competitive Advantage)

Features that set this project apart from a generic pseudo-3D racer template, and that align with the stated Core Value (F1/Colapinto theme + genuinely fun handling + replay reason).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| DRS reframed as a boost-zone mechanic in the new camera | The project already has a legible, F1-authentic boost mechanic (detect within 1s at a gate, one use, timed window) that no generic kart racer has. Keeping it — retuned for point-to-point pacing instead of lap-based detection — is a low-cost way to keep F1 identity distinct from "generic Mario Kart clone." | LOW-MEDIUM | Needs `isInDrsZone()`/`useDRS()` re-anchored to stage-relative distance instead of "main straight of the lap," and the boost curve should feel distinct from the mini-turbo boost (DRS = sustained top-speed lift; mini-turbo = short punchy accel) so they don't compete for the same "boost" identity. |
| Stage-clear rank (S/A/B/C style, F1-themed labels e.g. "POLE", "PODIUM", "Q3/Q2/Q1") | Classic arcade-racer replay hook (Ridge Racer, Daytona USA, WipEout, Trials) that requires no backend and reuses the existing best-time persistence pattern. Gives a *reason to replay a stage* without needing items or combat. | LOW | Pure client-side: compute time thresholds per stage, compare against `localStorage`-stored best, render a grade on the results screen. This is one of the cheapest high-value features available and should be treated as near-mandatory for the "replay reason" requirement. |
| Ghost-line time attack (replay a recorded best run as a translucent rival) | Strongest replay hook that doesn't require a backend or leaderboard — literally races the player against their own best self. Genre-standard (every modern arcade/kart racer has this). | LOW-MEDIUM | **Correction to current project assumption:** `PROJECT.md` currently lists "Replay / ghost car" under Out of Scope as "high state complexity." Research does not support that. A ghost is a sampled array of `{t, x/distance, laneOffset}` snapshots (e.g., every 100ms) replayed as a non-colliding sprite — this is materially *simpler* than the existing AI racecraft system already shipped (no avoidance/steering logic needed, just interpolated playback), and fits comfortably in `localStorage` (a few KB per stage). Flagging this for reconsideration at roadmap time; it is much closer to LOW-MEDIUM than HIGH complexity. |
| Branch-path stage variants with distinct scenery per fork (OutRun model) | Turns a handful of authored spines into a combinatorial number of "different" races, which is exactly the replay-variety lever OutRun invented and every successor since has copied. Also gives natural difficulty gating (right fork = harder, per OutRun precedent) without a skill-tree or unlock backend. | HIGH | Requires: (1) fork points in the spine data model, (2) a telegraph — visual signage/lane split rendered several segments ahead so the player can react, not just discover the fork on top of it, (3) either true divergent geometry per branch (more content) or shared "hub" segments that reconverge (cheaper, reuses geometry, still reads as choice). Reconvergence is the pragmatic solo-dev choice: author 1 shared trunk + 2 short unique branch segments per fork rather than fully divergent tracks. AI must also choose a branch (can be scripted/deterministic per rival to keep it simple). |
| Short campaign/gauntlet with unlockable stages | Gives structure and a sense of progress without any online system — beat stage N to unlock stage N+1 (or unlock via branch choice, per OutRun). Matches "reason to come back" requirement directly. | LOW-MEDIUM | Pure client-side state: an array of stage-unlock flags in `localStorage`. Can ship with as few as 3-5 stages and still read as "a campaign." This is the natural backbone that ranks + ghosts + branches all attach to. |
| Unlockable rival/car skins tied to stage clears | Reuses the existing 21-driver roster (already built, already themed) as unlock currency instead of building new content — cheap because the asset library already exists. | LOW | Mostly bookkeeping: gate existing rival-select entries behind a `localStorage` flag set on stage-clear. No new art or physics needed. |
| Retained AI personality/racecraft system, ported | Nothing else in the browser-arcade-racer space has "AI with visible pressure mistakes and defensive blocking" at this fidelity for a vanilla-JS project — this was already a differentiator in v2.0 and is worth preserving as the new mode's competitive edge over template pseudo-3D racers (most of which have primitive rubber-band-only AI). | MEDIUM (porting cost only — logic is proven) | See Table Stakes row above; listed again here because it's a genuine differentiator versus the reference genre (most fan/tutorial pseudo-3D racers ship trivial AI). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Items / power-ups (blue shells, boost pads with pickups, weapons) | "Mario Kart" is the explicit handling reference, and players/stakeholders conflate "kart game" with "item game." | Explicitly ruled out in `PROJECT.md` — turns an F1-skill racer into chaos/combat, destroys the "pure driving skill" identity the milestone is built around, and drags in RNG/balance design that has nothing to do with the stated goals. | Keep the *camera and handling feel* (drift boost, tight chase cam) from Mario Kart; keep the *competitive structure* (rivals, DRS, racecraft) from F1. Skill-based boosts only: drift charge and DRS, both earned by driving well, never by pickup RNG. |
| True 3D / WebGL migration for "real" depth | Pseudo-3D can look primitive next to true 3D chase-cam racers; tempting to "just do it properly" in Three.js. | Breaks the vanilla-JS-no-build-tools constraint (`CLAUDE.md`), throws away the working Canvas 2D pixel-art pipeline (16-tile art, palette quantization) shipped in 4A/4B, and is a much larger rendering rewrite than the segment-projection technique for a payoff (true 3D) the milestone doesn't ask for — OutRun's whole aesthetic identity *is* the pseudo-3D look. | Pseudo-3D segment rendering (Jake Gordon-style projection) stays in Canvas 2D, is a known-tractable solo-dev technique, and matches the explicitly requested "OutRun-style" look. |
| Fully divergent branch tracks (no shared geometry, unique art for every fork combination) | "Branching" sounds like it should mean every path is 100% unique, maximizing variety. | Combinatorial content cost: N forks with fully unique branches multiplies authored track length exponentially. For a solo vanilla-JS project this is a content-production trap, not a coding-complexity trap — it will stall the milestone. | OutRun's actual model: short unique fork segments that reconverge into shared trunk segments. Variety reads to the player from the fork *choice* and a different visual "biome" per branch, not from every meter of track being bespoke. |
| Online leaderboards / server-backed ghost sharing | Natural extension once ghost time-attack exists — "wouldn't it be cool to compare with everyone." | Explicitly out of scope in `PROJECT.md` ("el juego es y sigue siendo estático" — no backend). Requires auth, a database, moderation of submitted times/ghosts, and hosting — a different project category entirely. | Local ghost (own best run) + local rank grading covers the "replay for improvement" motivation without a server. If community comparison is wanted later, a shareable ghost-as-URL-hash (client-only) is a much smaller step than a backend, but is out of scope for this milestone. |
| Full damage/deformation physics per stage hazard | Chase-cam arcade racers with "identity" tracks (jumps, tight forks) invite "what if going off-road wrecks the car visibly." | The project already has a lightweight, working damage-tint/shake system; a full deformation model is simulation-grade complexity with no gameplay payoff for an arcade racer, and risks re-introducing the "flat/simulation" feel the milestone is explicitly moving away from. | Keep the existing lightweight damage feedback (tint + shake), reframed as "off-track / big-hit" feedback for jumps and hard fork misses, rather than building new physics. |
| Analog/motion (accelerometer) steering | Feels like a natural companion to a new mobile-friendly camera/handling overhaul. | Already explicitly deferred in `PROJECT.md` Out of Scope as a future nice-to-have; adding it now expands input-handling surface (calibration, sensitivity, device support) unrelated to the camera/handling/track work that is this milestone's actual goal. | Leave current touch-button steering in place; revisit only in a future milestone if mobile feel is still a problem after the chase-cam rebuild ships. |

## Feature Dependencies

```
Pseudo-3D segment-projection renderer (chase cam)
    └──requires──> New spine data model (per-segment world-X curve offset, world-Y elevation offset)
                       └──requires──> Point-to-point stage structure (replaces closed ROAD_SPINE)

Kart-style drift state machine (initiate / hold angle / charge / release-boost)
    └──requires──> New handling model (replaces TURN_RATE × speed_factor + velAngle lag)
                       └──enhances──> Pseudo-3D renderer readability (car visibly yaws off the road-center line during drift)

Tiered drift-boost VFX (spark color stages)
    └──requires──> Kart-style drift state machine

Speed-sensation tricks (segment-scroll rumble strobe, FOV/shake at speed)
    └──requires──> Pseudo-3D segment-projection renderer
                       └──enhances──> DRS boost (existing mechanic reads as "faster" only if the renderer sells speed)

Branch-path forks + telegraph signage + reconvergence
    └──requires──> New spine data model (must support graph, not linear list)
                       └──requires──> AI branch-choice logic (port of existing racecraft AI)

Stage-clear rank (S/A/B/C, F1-labeled)
    └──requires──> Point-to-point stage structure (needs a defined "stage" with a finish and a time)

Ghost time-attack playback
    └──requires──> Point-to-point stage structure
    └──enhances──> Stage-clear rank (visual "beat your ghost" framing of the same data)

Unlockable stages / gauntlet campaign
    └──requires──> Point-to-point stage structure (multiple discrete stages must exist)
    └──requires──> Stage-clear rank OR simple clear flag (either can gate unlock)

Unlockable rival/car skins
    └──requires──> Unlockable stages / gauntlet campaign (reuses existing 21-driver roster as unlock reward)

AI racecraft (avoidance, block, rubber-band, pressure mistakes) [existing, v2.0]
    └──requires porting to──> New spine/coordinate model (distance-along-spine + lane-offset instead of x,y)

Item/power-up systems ──conflicts──> "Pure driving skill" Core Value (explicit Out of Scope)
Fully divergent branch art ──conflicts──> Solo-dev content budget (favor reconvergent branches instead)
```

### Dependency Notes

- **Everything track-related is downstream of the new spine data model.** The current `ROAD_SPINE` (57-point closed loop, 2D x/y) cannot represent elevation, forks, or "distance to stage end." This is the single highest-leverage piece of new infrastructure — camera rendering, handling readability, branching, ranks, and ghosts all sit on top of it.
- **Handling (drift state machine) and rendering (pseudo-3D projection) are parallel-buildable but should share the same coordinate convention** (distance-along-track + lateral offset) so the car's visual yaw during a drift matches what the renderer draws under it. Building them against mismatched coordinate systems is the likeliest integration bug.
- **Drift-boost VFX, DRS retuning, and speed-sensation tricks are all "enhances" not "requires"** — they can and should be sequenced *after* the core drift/renderer work is validated as fun, not built speculatively alongside it.
- **The progression loop (ranks → ghosts → unlockable stages/skins) is a strictly ordered, cheap chain once "stage" exists as a first-class concept.** None of these four features need new rendering or physics work; they are `localStorage` bookkeeping and results-screen UI. They are the best "cheap replay value" investment in this milestone precisely because they don't compete for budget with the chase-cam/handling/track rebuild.
- **Branching conflicts with content budget, not code complexity.** The graph-based spine model itself is not much harder than a linear one; what's expensive is authoring enough unique per-branch content to make forks feel meaningfully different. Plan branch scope (how many forks, how much unique geometry per fork) explicitly rather than letting it grow unbounded.

## MVP Definition

### Launch With (v3.0)

Minimum viable product for the milestone goal ("fix flat handling, empty tracks, no replay reason").

- [ ] Pseudo-3D chase-cam renderer (segment projection, curves, at least basic elevation) — the format-defining feature; nothing else in this milestone matters if this doesn't ship and feel good
- [ ] Kart-style drift handling (initiate, hold angle, at least one boost tier on release) — directly answers "handling feels flat"
- [ ] Speed-sensation tricks (distance-keyed rumble strobe, camera FOV/shake response) — makes the new renderer *feel* fast, not just look different
- [ ] 1 fully-realized point-to-point stage with elevation changes and at least 2-3 recognizable landmarks — proves "track identity" before investing in more content
- [ ] Stage-clear rank + best-time persistence (reuse existing `localStorage` pattern) — cheapest possible "reason to replay," should not be deferred
- [ ] AI rival(s) ported to the new coordinate model with existing racecraft behaviors intact — losing this is a regression the player will feel immediately

### Add After Validation (v3.x)

Add once the core chase-cam/handling/single-stage loop is confirmed fun.

- [ ] 2-4 additional stages, each with distinct visual theme/landmarks (content, not new systems, once the pipeline exists)
- [ ] One branch point with reconverging paths (validate the fork mechanic on a small scale before committing to a full branching campaign)
- [ ] Ghost time-attack (own best-run playback) — trigger: once stage-clear ranks are validated as motivating, ghosts are the natural next layer
- [ ] DRS retuned for point-to-point pacing — trigger: once base handling/drift feel is locked, so DRS doesn't get tuned against a moving target
- [ ] Simple stage-unlock gating (clear stage N to unlock N+1) — trigger: once 3+ stages exist, to give them structure

### Future Consideration (v4+)

- [ ] Full branching campaign with multiple forks and F1-themed multiple "endings" (OutRun model) — defer until per-stage content pipeline is proven efficient enough to afford the combinatorial cost
- [ ] Unlockable rival/car skins as clear rewards — defer until the unlock/gauntlet structure itself is validated as motivating
- [ ] Additional drift-boost tiers (blue/orange/purple-equivalent) with distinct VFX/SFX per tier — defer past a single boost tier until base drift feel is confirmed fun
- [ ] Multiplayer on the new format — out of scope for this milestone per `PROJECT.md`; revisit only after solo mode is validated

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Pseudo-3D chase-cam renderer | HIGH | HIGH | P1 |
| Kart-style drift handling | HIGH | MEDIUM | P1 |
| Speed-sensation tricks | HIGH | MEDIUM | P1 |
| Point-to-point spine w/ elevation, 1 stage | HIGH | HIGH | P1 |
| AI racecraft ported to new model | HIGH | MEDIUM | P1 |
| Stage-clear rank + best time | MEDIUM-HIGH | LOW | P1 |
| Drift-boost tiered VFX (single tier) | MEDIUM | LOW | P2 |
| Additional stages (content) | HIGH | MEDIUM (per stage, after pipeline) | P2 |
| Ghost time-attack playback | MEDIUM-HIGH | LOW-MEDIUM | P2 |
| DRS retuned for stages | MEDIUM | LOW-MEDIUM | P2 |
| Branch fork + reconvergence (1 fork) | MEDIUM-HIGH | HIGH | P2 |
| Stage-unlock gauntlet gating | MEDIUM | LOW | P2 |
| Unlockable rival/car skins | LOW-MEDIUM | LOW | P3 |
| Full multi-branch campaign, multiple endings | HIGH (long-term retention) | HIGH | P3 |
| Additional drift-boost tiers | LOW-MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for the v3.0 milestone to be a credible "Arcade Rebirth"
- P2: Should have, sequenced right after P1 validates as fun
- P3: Nice to have, defer to a future milestone

## Competitor Feature Analysis

| Feature | OutRun (arcade, 1986/2 series) | Mario Kart (handling reference) | Horizon Chase Turbo (modern indie precedent) | Our Approach |
|---------|-------------------------------|----------------------------------|-----------------------------------------------|--------------|
| Track structure | 5 sequential stages, binary fork at each stage end, 15 unique track segments = up to 25 route combinations, multiple endings | Closed-lap "cups" grouped into tournaments, no branching | Linear "World Tour" of individual point-to-point/lap races across real-world locales, grouped into tournament tiers | Point-to-point stages (not closed lap), with reconverging forks rather than fully divergent routes — smaller authored-content footprint than OutRun's 15-segment model, appropriate for solo dev |
| Handling feel | Grip-based, exaggerated weight shift, no formal drift-boost mechanic (era predates mini-turbo) | Drift-to-boost: hold drift input, car holds an oversteer angle, charge timer tiers (blue/orange/purple), release = speed boost | Simplified arcade grip, boost meter fills passively/via drift, tap to release — no items | Kart-style drift-boost (Mario Kart reference) layered onto F1 car handling; DRS kept as a second, distinct boost mechanic tied to draft/proximity rather than drift, to preserve F1 identity |
| Progression/meta loop | Route choice = variety; score-attack timer; multiple endings as the "completion" hook; no persistent unlocks (arcade cabinet, coin-op era) | Cup completion unlocks next cup/character/kart parts; time trials with staff ghosts | Unlock 30+ cars via World Tour milestones/wins; gold/super-gold trophies via time + collectibles; tiered Tournament endurance races (12/36/109-race gauntlets) | Stage-clear ranks (F1-labeled: Q1/Q2/Q3-or-podium style grading) + own-best ghost time attack + simple stage-unlock gauntlet using the *existing* 21-driver roster as unlock currency — no items/collectibles, no backend, everything `localStorage`-backed |
| Track identity / speed sensation | Distinct scenery per branch (coast, desert, snow, etc.), Super Scaler sprite scaling for depth+speed | Themed cups (jungle, castle, etc.), boost pads, anti-gravity sections in later entries | Strong per-locale visual theming (Santorini, Reykjavik, etc.) reusing a shared pseudo-3D-esque rendering approach | Distance-keyed rumble-strip strobe + FOV/shake speed cues (genre-standard) + 1 fully realized landmark-rich stage before scaling to more — validates "does our pipeline make a place feel distinct" cheaply |
| Combat/items | None (era predates it; OutRun is pure driving) | Core to the franchise (explicitly the piece we are NOT taking) | None (explicitly item-free, closest modern sibling to our design goal) | None — matches OutRun and Horizon Chase Turbo, not Mario Kart's combat layer; only the *camera/handling feel* is borrowed from Mario Kart per `PROJECT.md` |

## Sources

- [The implementation of pseudo-3D in racing games (Sudo Null IT News)](https://sudonull.com/post/71919-The-implementation-of-pseudo-3D-in-racing-games) — MEDIUM confidence, cross-referenced with primary technique source below
- [How to build a racing game: straight roads — Jake Gordon (jakesgordon.com, canonical open-source JS/Canvas pseudo-3D tutorial)](https://jakesgordon.com/writing/javascript-racer-v1-straight/) — HIGH confidence, directly applicable reference implementation in the same tech stack (vanilla JS, Canvas 2D) as this project; segment-projection math, curve/hill data model, and performance guidance (pre-allocated segment objects, `drawDistance` culling) verified here
- [Out Run — Grokipedia](https://grokipedia.com/page/Out_Run) — MEDIUM confidence, corroborated branching-stage structure (5 stages, binary forks, 15 segments, up to 25 route combinations, multiple endings)
- [Mini-Turbo — Mario Kart Racing Wiki (Fandom)](https://mariokart.fandom.com/wiki/Mini-Turbo) — MEDIUM confidence, standard community-verified mechanic description, consistent across multiple entries in the same wiki family (Super Mini-Turbo, Ultra Mini-Turbo)
- [Mario Kart 8 Deluxe Drifting Guide — Nintendo Life](https://www.nintendolife.com/guides/mario-kart-8-deluxe-drifting-guide-how-to-drift-slipstream-and-boost) — MEDIUM confidence, corroborates tiered spark-color boost system
- [Horizon Chase Turbo Trophy Guide (PSNProfiles)](https://psnprofiles.com/guide/8513-horizon-chase-turbo-trophy-guide) — MEDIUM confidence, corroborates World Tour / Tournament structure and gold/super-gold grading as a no-backend progression model
- [Racing Games With The Best Sense Of Speed (Game Rant)](https://gamerant.com/racing-games-best-sense-feel-speed/) — LOW-MEDIUM confidence (enthusiast press, not technical doc), used only for genre-standard speed-cue list (FOV, shake, roadside object density), cross-checked against the Jake Gordon technical source for the rumble-strip/distance-keying trick specifically
- [Saving Game Progress with LocalStorage (abratabia.com)](https://www.abratabia.com/game-saves/localstorage-saves.php) — LOW-MEDIUM confidence, used to confirm `localStorage` capacity/pattern is adequate for ghost-run and rank/unlock persistence at this project's scale (few KB per stage, well under the ~5MB origin limit)
- `CLAUDE.md` and `.planning/PROJECT.md` (this repository) — HIGH confidence, primary source for existing architecture (`ROAD_SPINE`, `moveCar`, `updateAI`, DRS rules, `localStorage` keys) that all dependency and complexity estimates above are anchored to

---
*Feature research for: Pseudo-3D chase-cam arcade racer rebuild (v3.0 Arcade Rebirth)*
*Researched: 2026-08-15*
