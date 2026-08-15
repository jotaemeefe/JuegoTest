---
phase: 02b-monaco-overhaul
plan: 04
type: execute
wave: 4
depends_on:
  - 02b-03
files_modified:
  - game.js
autonomous: false
requirements:
  - TRACK-01
  - TRACK-04

must_haves:
  truths:
    - "Player car always points UP during a race — navigating corners rotates the world, not the car sprite"
    - "All 4 cars (player + 3 AI) appear at grid start positions without overlapping"
    - "AI cars navigate the full Monaco circuit, including the Loews hairpin, without permanently leaving the track"
    - "Minimap shows circuit outline and all 4 car dots, updating in real time"
    - "Checkpoints trigger correctly: CP0 Meta → CP1 Casino → CP2 Loews → CP3 Tunnel → CP0"
    - "Zero JavaScript console errors during any game phase (countdown, racing, done)"
    - "Multiplayer pos broadcast is unchanged: Net.send still transmits raw world-space x/y/angle"
  artifacts:
    - path: "game.js"
      provides: "Fully integrated Monaco + rotating camera game"
      contains: "ctx.translate(240, 380)"
  key_links:
    - from: "ROAD_SPINE geometry"
      to: "Visual circuit shape in browser"
      via: "drawTrack → drawSpinePath → ctx.stroke"
      pattern: "visual verification — no code assertion"
    - from: "AI_WAYPOINTS"
      to: "AI navigation through hairpin"
      via: "updateAI wpIdx loop"
      pattern: "visual verification — AI completes laps"
---

<objective>
Integration verification checkpoint for the full Phase 2b implementation. After Plans 01-03, all constants, track drawing, camera transform, and minimap are in place. This plan has two roles: (1) a human visual verification checkpoint to confirm the game looks and feels correct, and (2) targeted geometry fixes if the ROAD_SPINE needs adjustment after in-browser testing.

The ROAD_SPINE coordinates in 02b-RESEARCH.md are explicitly marked [ASSUMED] — designed analytically, not from GPS data. It is expected that the executor will need to tune some points after seeing the circuit in-browser. This is not a bug — it is a documented expectation.

Purpose: Phase 2b goal is a game that "feels like a real racing game." The checkpoint confirms the human barometer: does navigating Loews feel like a hairpin? Is there a sense of speed on the straight? Is Monaco recognisable?

Output: Either confirmation that the game is complete, or targeted adjustments to ROAD_SPINE, AI_WAYPOINTS, or CPS coords, followed by re-verification.
</objective>

<execution_context>
@C:\Users\Julio\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\Julio\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/02b-monaco-overhaul/02b-CONTEXT.md
@.planning/phases/02b-monaco-overhaul/02b-RESEARCH.md
@.planning/phases/02b-monaco-overhaul/02b-01-SUMMARY.md
@.planning/phases/02b-monaco-overhaul/02b-02-SUMMARY.md
@.planning/phases/02b-monaco-overhaul/02b-03-SUMMARY.md

<interfaces>
<!-- Geometry adjustment guidance — what to look for and how to fix it -->

If ROAD_SPINE shape looks wrong:
  - Each [x, y] point is in 1600x2000 world space
  - The minimap shows the full circuit outline — use it to identify which section is wrong
  - Edit individual points in the ROAD_SPINE array in game.js (lines ~19-43 area after rewrites)
  - Reload index.html in browser to see the change immediately
  - The main straight should run roughly left-to-right at y≈1820
  - Loews should be a U-turn (entry from right, turn left, exit to right lower)

If Loews hairpin feels too tight to navigate:
  - The spine radius at Loews is currently ~100px (designed value)
  - If the player cannot negotiate it at 30-40% speed: widen the U-turn
  - Push the apex points further left (decrease x) to increase the radius
  - Example: change [330, 570] to [310, 570] to add 20px radius
  - Verify: player can navigate Loews at ~30-40% max speed (roughly 195-260 px/s)

If AI cars leave the track permanently at a corner:
  - The AI uses AI_WAYPOINTS — add a waypoint in the problem section
  - Dense waypoints (every 40-60px) are needed at tight corners
  - Reduce AI_WP_REACH from 80 to 60 if AI is cutting inside corners too aggressively

If checkpoint CP2 (Loews) is never triggered:
  - Check that the actual Loews apex coords in ROAD_SPINE match CPS[2]: {x:360, y:550, r:220}
  - If the spine apex is at a different position, update CPS[2] to match the adjusted spine point
  - The r=220 radius is generous — the car must physically pass within 220px of the CP center

If car starts facing wrong direction:
  - START positions have a: 0 (angle=0 = facing east, +x direction)
  - The main straight runs left-to-right (east), so a:0 is correct
  - The camera transform rotates by -car.angle - PI/2, so at angle=0 the car points up on screen
  - If car points wrong direction, the transform is correct but START angle may need adjustment

Multiplayer verification:
  - Net.send in loop() transmits cars[0].x, cars[0].y, cars[0].angle
  - The camera transform is inside ctx.save()/restore() and does not affect these values
  - Verify by checking that Net.send still reads cars[0].x etc. (not modified)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Console error check and automated geometry validation</name>
  <files>game.js</files>
  <read_first>
    game.js lines 1-60 — verify all constants from Plans 01-03 are present
    game.js lines 991-1200 — verify loop() has camera transform and screen-space draws after restore
    game.js — search for "drawTunnelRoof" to confirm it is fully removed
  </read_first>
  <action>
    Run a static code analysis pass on game.js to confirm all changes from Plans 01-03 are present and internally consistent. Specifically verify:

    1. Physics constants match D-13/D-14: MAX_SPD_ON=650, MAX_SPD_OFF=250, AUTO_ACCEL=550, BRAKE_FORCE=1200, CAR_RADIUS=18, TURN_RATE=3.8, ROAD_HALF_W=80.

    2. ROAD_SPINE has entries in the 1600x2000 range — no point has x < 100 or y < 400 in the main body (the old 480x640 spine had points like [60, 550] which are invalid in new world).

    3. The string "drawTunnelRoof" does NOT appear anywhere in game.js (function removed, calls removed).

    4. The camera transform three-step sequence is present in loop(): "ctx.translate(240, 380)" followed by "ctx.rotate(-cars[0].angle" followed by "ctx.translate(-cars[0].x".

    5. "drawMinimap()" is called in loop() and the function "function drawMinimap()" exists in the file.

    6. "fillRect(-4000, -4000, 8000, 8000)" appears in drawTrack().

    7. "createRadialGradient(240, 380," appears in drawOffTrackVignette().

    8. Net.send block still reads "x: cars[0].x, y: cars[0].y, angle: cars[0].angle" (unchanged).

    If any check fails, apply the targeted fix from the relevant prior plan. Do not re-implement entire plans — make surgical corrections to the specific failing assertion.
  </action>
  <verify>
    <automated>node -e "
    const c = require('fs').readFileSync('game.js', 'utf8');
    const checks = [
      ['MAX_SPD_ON    = 650', 'physics MAX_SPD_ON'],
      ['ROAD_HALF_W = 80', 'ROAD_HALF_W'],
      ['CAR_RADIUS    = 18', 'CAR_RADIUS'],
      ['AI_WP_REACH = 80', 'AI_WP_REACH'],
      ['fillRect(-4000, -4000, 8000, 8000)', 'large bg fillRect'],
      ['ctx.translate(240, 380)', 'camera translate'],
      ['ctx.rotate(-cars[0].angle - Math.PI / 2)', 'camera rotate'],
      ['function drawMinimap()', 'drawMinimap function'],
      ['createRadialGradient(240, 380,', 'vignette screen center'],
      ['setLineDash([60, 60])', 'kerb dash scale'],
    ];
    const notFound = checks.filter(([s]) => !c.includes(s));
    const badOnes = [
      ['drawTunnelRoof()', 'drawTunnelRoof should be REMOVED'],
      ['fillRect(0, 0, 480, 640)', 'old bg fillRect should be REMOVED from drawTrack'],
    ];
    const stillPresent = badOnes.filter(([s]) => { const idx = c.indexOf(s); return idx >= 0 && idx < c.indexOf('function loop('); });
    console.log('MISSING:', notFound.map(x=>x[1]).join(', ') || 'none');
    console.log('SHOULD_BE_GONE:', stillPresent.map(x=>x[1]).join(', ') || 'none');
    console.log('STATUS:', notFound.length === 0 && stillPresent.length === 0 ? 'PASS' : 'FAIL');
    "</automated>
  </verify>
  <acceptance_criteria>
    - Node check script above outputs STATUS: PASS
    - MISSING list is empty (all required strings found)
    - SHOULD_BE_GONE list is empty (old patterns not present in drawTrack area)
    - game.js has no syntax errors: node --check game.js exits with code 0
  </acceptance_criteria>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Full Phase 2b implementation in game.js:
    - Monaco circuit redesigned at 3.5x scale (1600x2000 world space, 52-point ROAD_SPINE)
    - Rotating follow camera: player car always points UP on screen (Micro Machines style)
    - Physics re-tuned: MAX_SPD_ON=650, BRAKE_FORCE=1200, TURN_RATE=3.8
    - Minimap in top-right corner (100x120px) showing circuit and all 4 car positions
    - 3 AI opponents navigate Monaco circuit with density waypoints at Loews hairpin
    - All HUD elements (P1-P4, lap counter, damage bar) in screen space — not affected by camera rotation
  </what-built>
  <how-to-verify>
    Start the game: npx http-server . -p 8081 then open http://localhost:8081

    TEST 1 — Camera rotation (D-01 critical):
      1. Start any VS CPU race.
      2. During countdown: verify 4 cars appear at the start grid without JS console errors.
      3. Begin racing: press right (→ or D). The world should rotate LEFT as your car turns right. Your car sprite should always point UP on screen.
      4. Navigate Sainte-Devote (first corner): the turn should feel natural — not like the old fixed camera where the car moved diagonally across the screen.
      PASS: Car always points up. World rotates with steering.
      FAIL: Car points sideways, or world doesn't rotate.

    TEST 2 — Monaco circuit shape (D-06):
      5. Look at the minimap in the top-right corner. Verify: a circuit outline is visible (not a blob). There should be a clearly identifiable U-turn (Loews) and some long sections (straights/curves).
      6. Drive for 30 seconds observing the circuit through the rotating camera. You should experience: a straight section, a sweeping right turn (Sainte-Devote), an uphill feel (Beau Rivage), a tight U-turn (Loews), a faster section (tunnel), and return to the straight.
      PASS: Circuit has the character described. Sections feel distinct.
      FAIL: Track is a barely-modified oval, or the shape makes no racing sense.

    TEST 3 — Loews hairpin playability (key concern from CONTEXT.md):
      7. Approach the Loews U-turn (the tightest corner). Brake hard before it.
      8. With heavy braking (hold ↓ or S), verify you can negotiate the hairpin at ~30-40% speed.
      9. Without braking (full speed approach): verify you DO go off-track (correct — it's the tightest corner). The off-track vignette (red border) should appear.
      PASS: Loews is negotiable with proper braking. Full-speed approach goes off-track.
      FAIL: Loews is impossible to navigate even with full braking (car can't turn tight enough), OR Loews has no hairpin character (too wide/gentle).

    TEST 4 — AI cars complete laps:
      10. Wait 1-2 minutes without doing anything. Observe the AI cars (colored dots on minimap).
      11. All 3 AI cars should be moving around the circuit. None should be permanently stuck.
      PASS: AI cars circulate. At least 2 complete a full lap in 2 minutes.
      FAIL: AI cars leave the track immediately and stop, or circle on one section indefinitely.

    TEST 5 — Checkpoints and lap counting:
      12. Drive a full lap. CP flash (green border glow) should trigger at: Loews area (CP2), tunnel area (CP3), Casino area (CP1), and Meta/start line (CP0 — lap counter increments).
      PASS: All 4 CP flashes occur. Lap counter increments at Meta.
      FAIL: CP flashes don't trigger, or lap counter increments at wrong place.

    TEST 6 — Screen-space HUD correctness:
      13. While racing and turning: verify the P1-P4 position display, lap counter, and damage bar all remain STATIC on screen — they do NOT rotate with the world.
      14. Verify the minimap stays in the top-right corner and does NOT rotate.
      PASS: All HUD elements are stationary on screen regardless of car angle.
      FAIL: HUD elements rotate with the world.

    TEST 7 — Console errors:
      15. Open browser DevTools (F12) → Console tab.
      16. Complete at least one lap.
      PASS: Zero JavaScript errors throughout.
      FAIL: Any red error messages.
  </how-to-verify>
  <resume-signal>
    If all 7 tests pass: type "approved" to proceed to Phase 3 planning.

    If any test fails: describe the specific failure and which test number. Include:
    - Test number that failed
    - What you observed vs. what was expected
    - Whether the minimap showed any useful diagnostic info

    The executor agent will apply targeted fixes and re-test before returning here.

    If ROAD_SPINE geometry needs tuning (expected): describe which section looks wrong and the executor will adjust the relevant coordinate points. This is a normal part of the process — the spine was analytically designed and may need 1-2 iterations.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser execution | Pure client-side JS — no network data involved in this verification |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02b04-SC | Tampering | No npm installs | accept | No packages — pure verification and potential geometry fixes |
</threat_model>

<verification>
Plan passes when the human verification checkpoint returns "approved" for all 7 tests. Geometry adjustments during the checkpoint (ROAD_SPINE tuning) are part of this plan's scope and do not require re-planning.
</verification>

<success_criteria>
Phase 2b is complete when:
1. Human has approved all 7 verification tests
2. Zero console errors during a full race
3. The game "feels like a real racing game" — the barometer from CONTEXT.md specifics section

After approval, all Phase 2b requirements are delivered:
- TRACK-01: Monaco circuit in world space (ROAD_SPINE, AI_WAYPOINTS)
- TRACK-04: Monaco checkpoints (CPS) updated
- D-01 through D-24: all locked decisions implemented
</success_criteria>

<output>
Create `.planning/phases/02b-monaco-overhaul/02b-04-SUMMARY.md` when done.
</output>
