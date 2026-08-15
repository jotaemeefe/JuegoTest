---
phase: 02-monaco-4-cars
verified: 2026-06-28T00:00:00Z
goal: Races take place on Monaco circuit with 4 cars on track simultaneously — player plus 3 AI opponents with distinct personalities.
verdict: PASS
requirements_passed: 8
requirements_total: 8
---

# Phase 02: Verification Report

## Verdict: PASS

All 8 requirements are implemented and wired in `game.js`. The Monaco circuit polyline (34 points) drives both rendering and `isOnTrack()`. Four cars are built from the `cars[]` array in solo mode, each AI slot carrying a distinct `PERSONALITIES` entry (`aggressive`, `defensive`, `consistent`). All 6 collision pairs are iterated via the `PAIRS` constant. The HUD computes a live P1-P4 ranking across all four cars. Tunnel overlay and off-track vignette draw order are both correct. The code review (`02-REVIEW.md`) identified several bugs (wrong winner index when player is destroyed, result screen always naming `selectedRival`, spurious overtake flash at race start), but these are post-phase defects in secondary systems — none invalidates the eight phase-scoped requirements. Phase 3 work should address the bugs flagged in the review before they compound.

## Requirement Checks

| Req | Description | Status | Evidence |
|-----|-------------|--------|----------|
| TRACK-01 | Monaco circuit geometry (ROAD_SPINE polyline, ~34 points) | PASS | `game.js:19-43` — `ROAD_SPINE` const with exactly 34 `[x,y]` entries covering Meta → Antony Noghès → close-loop, named after real circuit sections; `isOnTrack()` iterates `ROAD_SPINE.length - 1 = 33` segments (`game.js:703`) |
| TRACK-02 | Monaco environment colours (ground, water, buildings, tunnel) | PASS | `game.js:461-511` in `drawTrack()` — grey ground `#3a3a4a`, harbour water `#1a4a7a`, Casino/Mirabeau building block `#c8c8c4`, hairpin inner `#2a2a3a`, pit lane strip `#1a1a1a`; tunnel dark overlay `#0d0d1a` via `drawTunnelRoof()` (`game.js:448`) |
| TRACK-03 | Tunnel overlay — `drawTunnelRoof` renders over cars inside tunnel zone | PASS | `game.js:1126-1127` — `drawTunnelRoof()` called **after** all `drawCar()` calls in both racing and done phases; `drawTunnelRoof` also updates `car.inTunnel` flag per car (`game.js:435-438`) |
| TRACK-04 | BUG-OFFTRACK fix — off-track vignette no longer renders over cars | PASS | `game.js:1111-1114` — explicit comment "BUG-OFFTRACK fix: draw off-track vignette BEFORE cars so cars always render on top"; `drawOffTrackVignette(0.55)` called before the `drawCar()` loop at `game.js:1119` |
| CARS-01 | `cars[]` array refactor — replaced `local`/`remote` with array of 4 car objects in solo mode | PASS | `game.js:218` — `let cars = []`; no top-level `local` or `remote` variables exist; solo mode initialises `cars` as a 4-element array (`game.js:1329-1336`); array is used in 63 locations throughout the file |
| CARS-02 | AI personalities — 3 distinct personalities: aggressive, defensive, consistent | PASS | `game.js:102-127` — `PERSONALITIES` const with three named archetypes each defining `speedMult`, `lineMult`, `noiseAmp`, `brakeMult`, `damageMult`; assigned one per AI car in `resetGame()` (`game.js:1327-1335`); consumed in `updateAI()` at `game.js:803-840` (speed, steering noise, braking, line offset) and in collision damage at `game.js:1069,1075` |
| CARS-03 | 6-pair collision detection ([0,1],[0,2],[0,3],[1,2],[1,3],[2,3]) | PASS | `game.js:130` — `const PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]`; `PAIRS.forEach(([i,j]) => {...})` at `game.js:1054` resolves all 6 pairs every racing frame with `resolveCarCollision(a,b)` and personality-scaled damage |
| CARS-04 | HUD shows P1-P4 ranking for all 4 cars | PASS | `game.js:848-878` — `updateHUD()` builds a `ranked` array from all four `cars[]` entries sorted by `cpScore` (laps × checkpoints, tiebroken by distance to next CP); `hudPos.textContent = \`P${playerRank}\`` displays the live position; overtake detection (`¡LO PASÉ!`) fires when rank improves; `prevPlayerRank` correctly initialised to `Infinity` in `resetGame()` (`game.js:1371`) to suppress spurious first-frame flash (WR-04 from review was already fixed) |

## Critical Gaps

None. All 8 phase requirements verified.

## Notes for Phase 3

The code review (`02-REVIEW.md`) surfaced several bugs that did not block phase requirements but will affect game quality in Phase 3:

1. **CR-01 / CR-03 (winner logic):** When the player is destroyed (`cars[0].damage >= 100`), `winner` is hardcoded to `1` (`game.js:1179`) rather than the leading non-player car. Fix before adding more end-game content.

2. **WR-03 (result screen attribution):** `pollResults()` always names `selectedRival` as the opponent even when `winner` is `2` or `3`. The `localStorage` key is similarly misattributed.

3. **WR-04 (spurious overtake flash):** Already fixed in this phase — `prevPlayerRank = Infinity` in `resetGame()` (`game.js:1371`).

4. **WR-02 (tie-at-finish):** If two AI cars finish on the same frame, the lower array index always wins. Low probability but worth fixing before Phase 3 adds more AI tuning.

5. **CR-05 (startResultPoll at load):** A 300ms interval fires from page load indefinitely; removing the bare `startResultPoll()` call at `game.js:1695` would eliminate this background leak.

6. **ROAD_SPINE WR-01:** The closing segment `[240,547]→[60,550]` bypasses the `[130,550]` intermediate vertex of the main straight. Functionally safe at current `ROAD_HALF_W=60` but worth adding the intermediate vertex for geometric correctness.
