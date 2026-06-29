---
phase: 02b-monaco-overhaul
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - game.js
autonomous: true
requirements:
  - TRACK-01
  - TRACK-04

must_haves:
  truths:
    - "All physics constants (MAX_SPD_ON, MAX_SPD_OFF, AUTO_ACCEL, BRAKE_FORCE, CAR_RADIUS, TURN_RATE, ROAD_HALF_W) match the 3.5x-scaled values in D-13 and D-14"
    - "ROAD_SPINE contains 52 points designed in 1600x2000 world space, covering all Monaco sections including Loews hairpin with spine radius >= 100px"
    - "AI_WAYPOINTS contains 43 points in the new world space with dense coverage at Loews (5 waypoints through the hairpin)"
    - "AI_WP_REACH is 80 (not 30 or 105)"
    - "CPS has 4 checkpoints at new world-space coordinates: CP0=Meta (~x:520,y:1820), CP1=Casino (~x:900,y:1000), CP2=Loews (~x:360,y:550), CP3=Tunnel (~x:1050,y:860)"
    - "START has 4 positions on new main straight at y≈1820, all separation distances >= 36px (CAR_RADIUS*2)"
    - "TUNNEL_ZONE bounding box covers the tunnel segment in new world space: x1≈730, y1≈720, x2≈1180, y2≈920"
    - "car.inTunnel is set each frame in the racing phase via inline forEach loop — drawTunnelRoof() visual call is removed"
  artifacts:
    - path: "game.js"
      provides: "Updated constants block and ROAD_SPINE array"
      contains: "MAX_SPD_ON    = 650"
    - path: "game.js"
      provides: "Updated AI_WAYPOINTS and AI_WP_REACH"
      contains: "AI_WP_REACH = 80"
    - path: "game.js"
      provides: "Updated CPS and START in new world space"
      contains: "x: 520,  y: 1820"
    - path: "game.js"
      provides: "Inline inTunnel setter replacing drawTunnelRoof call"
      contains: "car.inTunnel = (car.x >= TUNNEL_ZONE.x1"
  key_links:
    - from: "AI_WAYPOINTS"
      to: "updateAI()"
      via: "car.wpIdx index into array"
      pattern: "AI_WAYPOINTS\\[car\\.wpIdx\\]"
    - from: "TUNNEL_ZONE"
      to: "car.inTunnel"
      via: "bounding box check in racing phase"
      pattern: "car\\.inTunnel = \\(car\\.x >= TUNNEL_ZONE"
    - from: "CPS"
      to: "checkCheckpoints()"
      via: "car.nextCP index"
      pattern: "CPS\\[car\\.nextCP\\]"
---

<objective>
Replace all world-space constants in game.js with the Monaco 3.5x-scale redesign: ROAD_SPINE (52 pts, 1600x2000 world), ROAD_HALF_W=80, physics constants per D-13/D-14, AI_WAYPOINTS (43 pts), AI_WP_REACH=80, CPS, START, and TUNNEL_ZONE. Extract the car.inTunnel boolean setter from drawTunnelRoof() into an inline loop in the racing phase, and remove the drawTunnelRoof() visual call (Phase 3 will restore the visual; Phase 3 audio needs the boolean to be set correctly).

Purpose: This is the load-bearing data change. Without new world-space geometry, the camera transform (Plan 02b-02) would follow a car around a tiny 480x640 oval. No logic changes in this plan — only constant arrays and one call site extraction.

Output: game.js with all constants replaced. The game will look visually broken (still using old drawTrack) but cars will spawn at new START positions and physics will apply new values. No camera transform yet — that is Plan 02b-03.
</objective>

<execution_context>
@C:\Users\Julio\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\Julio\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/02b-monaco-overhaul/02b-CONTEXT.md
@.planning/phases/02b-monaco-overhaul/02b-RESEARCH.md

<interfaces>
<!-- Key signatures and patterns the executor must replicate exactly -->

From game.js (lines 1-13) — CURRENT constants to REPLACE:
  MAX_SPD_ON = 190   → 650
  MAX_SPD_OFF = 72   → 250
  AUTO_ACCEL = 160   → 550
  BRAKE_FORCE = 350  → 1200
  CAR_RADIUS = 14    → 18
  TURN_RATE = 4.5    → 3.8
  ROAD_HALF_W = 28   → 80

From game.js (line 775) — current AI_WP_REACH:
  const AI_WP_REACH = 30;  → change to 80

From game.js (line 426) — current TUNNEL_ZONE:
  const TUNNEL_ZONE = { x1: 318, y1: 282, x2: 452, y2: 325 };
  → new: { x1: 730, y1: 720, x2: 1180, y2: 920 }

From game.js (lines 428-453) — drawTunnelRoof() function:
  - The inTunnel-setting forEach loop inside this function must be EXTRACTED
    and placed inline in the racing phase of loop() (see Task 2)
  - The drawTunnelRoof() function itself should remain defined but the VISUAL
    part (ctx.save/globalAlpha/fillStyle/fill/restore) can be removed, leaving
    only the inTunnel setter. Alternatively, move the inTunnel setter to loop()
    and remove drawTunnelRoof() entirely (preferred per D-22 / RESEARCH.md)

From game.js (line 1107) — current drawTunnelRoof() call in racing phase:
  drawTunnelRoof();  // after drawCar() calls — REMOVE this call

From game.js (line 1194) — current drawTunnelRoof() call in done phase:
  drawTunnelRoof();  // after drawCar() calls in done phase — REMOVE this call

From 02b-RESEARCH.md — new ROAD_SPINE (52 pts):
  Starts at [200, 1820], goes clockwise around 1600x2000 world.
  Loews hairpin section (validated geometry, spine radius ~100px):
    [380, 665], [340, 620], [330, 570], [340, 520], [370, 485], [420, 470], [470, 480]

From 02b-RESEARCH.md — new AI_WAYPOINTS (43 pts):
  Starts at [520, 1820], 43 waypoints covering all corners.
  Loews dense section: waypoints 15-19 at [370,665], [340,620], [332,570], [345,520], [385,485]

From 02b-RESEARCH.md — new CPS:
  { x: 520, y: 1820, r: 200 }   // CP0 META
  { x: 900, y: 1000, r: 200 }   // CP1 Casino
  { x: 360, y: 550,  r: 220 }   // CP2 Loews apex
  { x: 1050, y: 860, r: 220 }   // CP3 Tunnel

From 02b-RESEARCH.md — new START:
  { x: 580, y: 1826, a: 0 }  // P1 player
  { x: 520, y: 1814, a: 0 }  // P2 AI car1
  { x: 460, y: 1826, a: 0 }  // P3 AI car2
  { x: 400, y: 1814, a: 0 }  // P4 AI car3
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace physics constants, ROAD_SPINE, CPS, START, TUNNEL_ZONE</name>
  <files>game.js</files>
  <read_first>
    game.js lines 1-60 — current constants block, ROAD_SPINE, CPS, START
    game.js lines 422-430 — current TUNNEL_ZONE constant and drawTunnelRoof start
    .planning/phases/02b-monaco-overhaul/02b-RESEARCH.md — full ROAD_SPINE array, CPS, START, TUNNEL_ZONE
  </read_first>
  <action>
    Replace the constants block at the top of game.js (lines 1-60) with new values per D-13/D-14:
    - MAX_SPD_ON = 650 (was 190)
    - MAX_SPD_OFF = 250 (was 72)
    - AUTO_ACCEL = 550 (was 160)
    - FRICTION_K = 1.1 (unchanged, D-15)
    - BRAKE_FORCE = 1200 (was 350)
    - TURN_RATE = 3.8 (was 4.5, per D-14 — independent tuning, not proportional)
    - NET_MS = 50 (unchanged)
    - CAR_RADIUS = 18 (was 14)

    Replace ROAD_HALF_W from 28 to 80 (per D-07).

    Replace the entire ROAD_SPINE array (was 34 pts in 480x640) with the 52-point array from 02b-RESEARCH.md designed in 1600x2000 world space. Keep the same comment structure and variable name. The first and last point are both [200, 1820] to close the loop.

    Replace the CPS array with the 4 new checkpoints from 02b-RESEARCH.md:
    CP0: { x: 520, y: 1820, r: 200 }  — META main straight
    CP1: { x: 900, y: 1000, r: 200 }  — Casino / Mirabeau plateau
    CP2: { x: 360, y: 550,  r: 220 }  — Loews Hairpin apex
    CP3: { x: 1050, y: 860, r: 220 }  — Tunnel mid / post-tunnel

    Update the comment on CPS to reflect new positions (CP0=Meta, CP1=Casino, CP2=Loews, CP3=Tunnel).

    Replace the START array with 4 positions from 02b-RESEARCH.md at y≈1820 main straight:
    P1: { x: 580, y: 1826, a: 0 }
    P2: { x: 520, y: 1814, a: 0 }
    P3: { x: 460, y: 1826, a: 0 }
    P4: { x: 400, y: 1814, a: 0 }

    Update the START comment to note new separation check: min distance P1-P2 ≈ 61px > CAR_RADIUS*2=36px.

    Replace TUNNEL_ZONE constant (near line 426) from old world space to new:
    { x1: 730, y1: 720, x2: 1180, y2: 920 }

    Update the comment on TUNNEL_ZONE to indicate it covers the new world-space tunnel segment (Portier exit through Nouvelle Chicane entry).

    Do NOT modify any function logic, drawTunnelRoof(), loop(), updateCar(), updateAI(), or any other code — only the constant declarations and array literals.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const c=fs.readFileSync('game.js','utf8'); const checks=[['MAX_SPD_ON    = 650','MAX_SPD_ON=650'],['MAX_SPD_OFF   = 250','MAX_SPD_OFF=250'],['AUTO_ACCEL    = 550','AUTO_ACCEL=550'],['BRAKE_FORCE   = 1200','BRAKE_FORCE=1200'],['CAR_RADIUS    = 18','CAR_RADIUS=18'],['TURN_RATE     = 3.8','TURN_RATE=3.8'],['ROAD_HALF_W = 80','ROAD_HALF_W=80'],['[200, 1820]','first spine pt'],['x: 520,  y: 1820','CP0 META'],['x: 360,  y: 550','CP2 Loews'],['x1: 730','TUNNEL_ZONE x1']]; checks.forEach(([pat,label])=>{if(!c.includes(pat.replace(/ /g,'').replace(/=/g,' = ').slice(0,12))){const found=c.includes(pat.split('=')[1].trim().split(',')[0].trim()); console.log(found?'OK':'FAIL',label);}else{console.log('OK',label);}}); console.log('spinePts:', (c.match(/\[\d+, \d+\]/g)||[]).length);"</automated>
  </verify>
  <acceptance_criteria>
    - game.js contains MAX_SPD_ON    = 650 (exact string with spacing matching code style)
    - game.js contains MAX_SPD_OFF   = 250
    - game.js contains AUTO_ACCEL    = 550
    - game.js contains BRAKE_FORCE   = 1200
    - game.js contains CAR_RADIUS    = 18
    - game.js contains TURN_RATE     = 3.8
    - game.js contains ROAD_HALF_W = 80
    - ROAD_SPINE begins with [200, 1820] and ends with [200, 1820] (closed loop)
    - ROAD_SPINE contains approximately 52 coordinate pairs (count via grep/search)
    - CPS[0] has x: 520 and y: 1820
    - CPS[2] has x: 360 and y: 550 (Loews)
    - START[0] has x: 580, y: 1826, a: 0
    - TUNNEL_ZONE has x1: 730
    - No changes to any function bodies, updateCar, updateAI, loop, drawTrack, or drawCar
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Replace AI_WAYPOINTS and AI_WP_REACH, extract inTunnel setter, remove drawTunnelRoof calls</name>
  <files>game.js</files>
  <read_first>
    game.js lines 139-165 — current AI_WAYPOINTS and AI_WP_REACH declaration
    game.js lines 428-453 — current drawTunnelRoof() function (contains the inTunnel setter)
    game.js lines 1100-1115 — racing phase: drawTunnelRoof() call location after drawCar()
    game.js lines 1184-1196 — done phase: drawTunnelRoof() call location after drawCar()
    .planning/phases/02b-monaco-overhaul/02b-RESEARCH.md — full AI_WAYPOINTS array (43 pts) and AI_WP_REACH=80
  </read_first>
  <action>
    Replace AI_WP_REACH (line ~775) from 30 to 80. Keep the comment updated to reflect new scale rationale: at 3.5x, naive scaling would be 105px but 80px is used for tighter corner precision.

    Replace the entire AI_WAYPOINTS array (lines ~140-165, currently 24 points) with the 43-point array from 02b-RESEARCH.md. The array starts at [520, 1820] (main straight) and loops around the 1600x2000 Monaco circuit. Keep the comment block noting waypoint indices for key corners. The waypoints do NOT form a closed loop in the array — the updateAI() modulo wrap handles that: car.wpIdx = (car.wpIdx + 1) % AI_WAYPOINTS.length.

    Extract the inTunnel boolean setter out of drawTunnelRoof(). Remove the entire drawTunnelRoof() function from the file (the visual polygon drawing is deferred to Phase 3 per D-22). Add the inTunnel setter as an inline forEach in the racing phase of loop(), placed just before the drawTrack() call in the racing phase render section (after all physics/checkpoints updates, before drawing):

      cars.forEach(car => {
        car.inTunnel = (car.x >= TUNNEL_ZONE.x1 && car.x <= TUNNEL_ZONE.x2 &&
                        car.y >= TUNNEL_ZONE.y1 && car.y <= TUNNEL_ZONE.y2);
      });

    Remove both calls to drawTunnelRoof() in loop():
    - In the racing phase (after drawCar calls, around line 1107): remove `drawTunnelRoof();`
    - In the done phase (around line 1194): remove `drawTunnelRoof();`

    Also remove the corresponding comments "// Tunnel roof drawn AFTER all drawCar() so it darkens cars inside the tunnel" from both locations.

    Do NOT change updateAI() logic — only the AI_WAYPOINTS data and AI_WP_REACH value change.
  </action>
  <verify>
    <automated>node -e "const c=require('fs').readFileSync('game.js','utf8'); console.log('AI_WP_REACH=80:', c.includes('AI_WP_REACH = 80')); console.log('wpCount:', (c.match(/\/\/\s+\d+\s+/g)||[]).length, 'lines with wp comments'); console.log('noDrawTunnelRoof:', !c.includes('drawTunnelRoof()')); console.log('hasInTunnelSetter:', c.includes('car.inTunnel = (car.x >= TUNNEL_ZONE.x1')); console.log('wpStart520:', c.includes('[520,  1820]')||c.includes('[520, 1820]'));"</automated>
  </verify>
  <acceptance_criteria>
    - game.js contains AI_WP_REACH = 80
    - AI_WAYPOINTS array starts with [520, 1820] (or [520,  1820] with extra space) as the first element
    - AI_WAYPOINTS contains 43 elements (count manually or via search for array entries)
    - game.js does NOT contain the string "drawTunnelRoof()" anywhere (function removed and both call sites removed)
    - game.js contains the inline inTunnel setter: "car.inTunnel = (car.x >= TUNNEL_ZONE.x1"
    - The inTunnel setter appears in the racing phase of loop(), inside the solo-mode branch or shared section, NOT inside a drawTunnelRoof function
    - updateAI() function body is otherwise unchanged — only AI_WAYPOINTS data and AI_WP_REACH changed
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Data constants | Pure JS constant declarations — no external input, no attack surface |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02b01-SC | Tampering | No npm installs in this plan | accept | No packages installed — pure JS edit |
</threat_model>

<verification>
After both tasks complete, open game.js and verify:
1. The constants block (top of file) shows all new values: 650, 250, 550, 1200, 18, 3.8, 80
2. ROAD_SPINE has ~52 pairs starting and ending with [200, 1820]
3. AI_WAYPOINTS has 43 entries starting with [520, 1820]
4. AI_WP_REACH = 80
5. CPS[0] is at x:520, y:1820 (META on new main straight)
6. START[0] is at x:580, y:1826
7. TUNNEL_ZONE = { x1: 730, y1: 720, x2: 1180, y2: 920 }
8. "drawTunnelRoof" does NOT appear anywhere in the file
9. "car.inTunnel = (car.x >= TUNNEL_ZONE.x1" appears in the racing phase of loop()
</verification>

<success_criteria>
All Monaco 3.5x-scale data constants are in place. Opening the game in a browser will show cars spawning in unexpected positions (since drawTrack still uses old 480x640 draws) but no JS errors — physics will apply new values and the engine will not crash.
</success_criteria>

<output>
Create `.planning/phases/02b-monaco-overhaul/02b-01-SUMMARY.md` when done.
</output>
