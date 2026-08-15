---
phase: 02b-monaco-overhaul
plan: 03
type: execute
wave: 3
depends_on:
  - 02b-01
  - 02b-02
files_modified:
  - game.js
autonomous: true
requirements:
  - TRACK-01

must_haves:
  truths:
    - "The player car always points UP (↑) on screen while navigating corners — the world rotates around the car"
    - "Camera focal point is at screen position (240, 380) — more forward view than rear view per D-02"
    - "All three loop() phases (countdown, racing, done) apply the same camera transform before drawTrack/drawCar"
    - "HUD elements (hudLap, hudPos, hudRole, hudTimer), drawMinimap, drawDamageBar, drawFloatingTexts, drawCountdown, drawWin, cpFlash border, and drawOffTrackVignette are drawn in screen space — after ctx.restore()"
    - "drawMinimap() is a new function that draws a 100x120px minimap in the top-right corner, showing the ROAD_SPINE polyline and coloured car dots"
    - "drawOffTrackVignette() is called in screen space with center at (240, 380) — not world point (240, 310)"
    - "The multiplayer pos broadcast (Net.send with x/y/angle) is unchanged — camera transform is render-only"
  artifacts:
    - path: "game.js"
      provides: "Camera transform applied in all three loop() phases"
      contains: "ctx.translate(240, 380)"
    - path: "game.js"
      provides: "Camera rotation by car angle"
      contains: "ctx.rotate(-cars[0].angle - Math.PI / 2)"
    - path: "game.js"
      provides: "New drawMinimap() function"
      contains: "function drawMinimap()"
    - path: "game.js"
      provides: "Updated drawOffTrackVignette() center"
      contains: "createRadialGradient(240, 380,"
  key_links:
    - from: "ctx.save() camera transform"
      to: "ctx.restore() before HUD"
      via: "All world-space draws (drawTrack, drawCar) between save and restore"
      pattern: "ctx\\.save\\(\\)"
    - from: "drawMinimap()"
      to: "ROAD_SPINE and cars[]"
      via: "Reads ROAD_SPINE for circuit outline, cars[] for dot positions"
      pattern: "function drawMinimap"
    - from: "screen-space draws after ctx.restore()"
      to: "drawCountdown / drawWin / cpFlash"
      via: "Called after ctx.restore() in their respective phase branches"
      pattern: "ctx\\.restore\\(\\)"
---

<objective>
Add the rotating follow camera to loop() and create the drawMinimap() function. After this plan, the player car always points up on screen and the world rotates around it (Micro Machines / RC Pro-Am style, per D-01).

Three changes to loop():
1. Wrap all world-space draws in ctx.save() + [3-step transform] + ctx.restore()
2. Move 6 screen-space draw calls to AFTER ctx.restore() in each phase branch
3. Call drawMinimap() after ctx.restore() in all three phases

New function drawMinimap() draws a 100x120px minimap in screen space at the top-right corner showing the Monaco circuit outline and car positions (D-17, D-18, D-19).

Also update drawOffTrackVignette() center from world coords (240,310) to screen coords (240,380) so the red vignette is centred on the camera focal point, not an arbitrary old world position.

Purpose: This is the transformative change that makes the game feel like a proper racing game. The camera transform is pure Canvas 2D API — ctx.save/translate/rotate/restore.

Output: game.js with rotating follow camera active. Opening the game in a browser should show Monaco circuit with the player car pointing up at all times.
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

<interfaces>
<!-- Key loop() structure the executor must understand before editing — from game.js lines 991-1199 -->

Current loop() structure (3 phases):

  if (phase === 'countdown') {
    cdTimer -= dt;
    drawTrack();                              ← world-space
    drawCar(cars[i], i) for each car;        ← world-space
    drawCountdown(countdown);                 ← SCREEN-SPACE (must move AFTER restore)
    // cdTimer logic...
  } else if (phase === 'racing') {
    // physics updates (updateCar, updateAI, checkCheckpoints, PAIRS collisions)
    // networking (Net.send)
    updateHUD();                              ← DOM only — safe anywhere, no ctx calls
    // audio (updateEnginePitch, brake sound)
    drawTrack();                              ← world-space
    drawOffTrackVignette(0.55) if !onTrk;   ← SCREEN-SPACE (must move AFTER restore + update center)
    drawCar(cars[i], i) for each car;        ← world-space
    // damage/shake logic
    cpFlash strokeRect(5,5,470,630);         ← SCREEN-SPACE (must move AFTER restore)
    drawFloatingTexts(dt);                    ← SCREEN-SPACE (must move AFTER restore)
    // damage warnings...
    drawDamageBar(cars[0].damage);           ← SCREEN-SPACE (must move AFTER restore)
    // hudTimer DOM update
    // winner detection
  } else if (phase === 'done') {
    drawTrack();                              ← world-space
    drawCar(cars[i], i) for each car;        ← world-space
    drawWin(winner === 0);                    ← SCREEN-SPACE (must move AFTER restore)
  }

TARGET loop() structure after this plan:

  // WORLD SPACE BLOCK (identical content in all three phases)
  ctx.save();
  ctx.translate(240, 380);
  ctx.rotate(-cars[0].angle - Math.PI / 2);
  ctx.translate(-cars[0].x, -cars[0].y);

  drawTrack();

  if (phase === 'countdown') {
    for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);  // solo
    // (or drawCar(cars[1],1); drawCar(cars[0],0) for multi)
  } else if (phase === 'racing') {
    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }
  } else if (phase === 'done') {
    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }
  }

  ctx.restore();

  // SCREEN SPACE BLOCK
  drawMinimap();

  if (phase === 'countdown') {
    drawCountdown(countdown);
  } else if (phase === 'racing') {
    if (!onTrk) drawOffTrackVignette(0.55);   // onTrk computed BEFORE the world block
    if (cpFlash > 0) {
      cpFlash -= dt;
      const a2 = Math.min(1, cpFlash * 6);
      ctx.strokeStyle = `rgba(16,185,129,${a2 * 0.7})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 470, 630);
    }
    drawFloatingTexts(dt);
    drawDamageBar(cars[0].damage);
  } else if (phase === 'done') {
    drawWin(winner === 0);
  }

IMPORTANT: The `const onTrk = isOnTrack(...)` check for vignette and damage must stay computed in the racing physics section (before the world block) so the value is available in the screen-space block. The damage application and shake code that use `onTrk` also stay in the physics section. Only the drawOffTrackVignette CALL moves to screen space.

drawOffTrackVignette() update:
  Current: const center = project(240, 310);
           ctx.createRadialGradient(center.x, center.y, 100, center.x, center.y, 290)
           ctx.fillRect(0, 0, 480, 640)
  New:     const center = { x: 240, y: 380 };   // screen-space focal point (D-02)
           ctx.createRadialGradient(240, 380, 100, 240, 380, 280)
           ctx.fillRect(0, 0, 480, 640)        // screen-space, safe after restore
  Note: project() call removed — center is hardcoded to camera focal point (240, 380)

drawMinimap() — new function to ADD:
  From 02b-RESEARCH.md Pattern 3 (exact implementation reference):
  - MAP_W=100, MAP_H=120, PAD=6
  - MAP_X=374, MAP_Y=6  (480-100-6=374)
  - Compute ROAD_SPINE bounding box (minX, minY, maxX, maxY)
  - scale = Math.min((MAP_W-PAD*2)/rangeX, (MAP_H-PAD*2)/rangeY)
  - ox and oy offsets for centering within the minimap rect
  - toMap(wx,wy) = [ox + wx*scale, oy + wy*scale]
  - Draw: semi-transparent dark background (globalAlpha=0.75, '#0d0d1a')
  - Draw circuit outline: ROAD_SPINE polyline, strokeStyle 'rgba(255,255,255,0.4)', lineWidth=2
  - Draw car dots: cars[] forEach, player (i=0) = white circle r=3, AI = car.rivalData?.body r=2
  - Wrapped in ctx.save()/ctx.restore()
  - Place this function definition near drawTrack() / drawCar() (around line 572-593 area)

updateHUD() position: stays where it is in the racing phase (before the world-space block or between physics and render). updateHUD() only writes to DOM elements — no ctx calls — so it is unaffected by the canvas transform. No change needed.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add camera transform to loop() — wrap world draws, move screen draws after restore, call drawMinimap in all phases</name>
  <files>game.js</files>
  <read_first>
    game.js lines 991-1199 — full loop() function in current state (after Plans 01 and 02)
    .planning/phases/02b-monaco-overhaul/02b-CONTEXT.md — D-03 (exact transform order), D-05 (screen space after restore)
    .planning/phases/02b-monaco-overhaul/02b-RESEARCH.md — Pattern 1 (camera transform + pitfalls list)
  </read_first>
  <action>
    Restructure loop() to separate world-space and screen-space draws. The physics updates (updateCar, updateAI, checkCheckpoints, PAIRS, Net.send) do NOT move — they stay at the top of the racing phase exactly as they are. Only the render section changes.

    Add the camera transform block. Place ctx.save() before the first drawTrack() call that appears in loop(). The three-step transform is:
      ctx.save()
      ctx.translate(240, 380)
      ctx.rotate(-cars[0].angle - Math.PI / 2)
      ctx.translate(-cars[0].x, -cars[0].y)

    Restructure the draw order so that inside the save/restore block, ONLY world-space calls appear: drawTrack() called once (before the phase branch), then drawCar() calls inside the appropriate phase conditional.

    The single drawTrack() call should come first inside the camera transform block, before the if/else phase branch for drawCar. This avoids calling drawTrack three times.

    After all drawCar() calls for the current phase, place ctx.restore().

    Immediately after ctx.restore(), call drawMinimap() for ALL three phases (countdown, racing, done). This gives a consistent minimap regardless of race phase.

    Move these 6 elements to the screen-space section (after ctx.restore()):

    In the countdown phase screen-space section: call drawCountdown(countdown). This replaces the drawCountdown(countdown) call that was inside the countdown branch before restore.

    In the racing phase screen-space section:
    - drawOffTrackVignette(0.55) if !onTrk — the `onTrk` variable is already computed in the physics section before the world block. Move ONLY the drawOffTrackVignette call here; keep the damage application (cars[0].damage += ...) and wasOnTrack update in the physics section where they are.
    - The cpFlash strokeRect block: `if (cpFlash > 0) { cpFlash -= dt; const a2 = ...; ctx.strokeRect(5, 5, 470, 630); }` — move this entire block to screen space.
    - drawFloatingTexts(dt)
    - drawDamageBar(cars[0].damage)

    In the done phase screen-space section: call drawWin(winner === 0).

    NOTE on countdown phase: The countdown branch currently only has drawTrack, drawCar calls, and drawCountdown. In the new structure, drawTrack moves to the shared world block. The countdown-specific drawCar calls remain in the world block (inside the countdown branch of the if/else). drawCountdown moves to screen space.

    NOTE on inTunnel setter: The inline cars.forEach(car => { car.inTunnel = ... }) added in Plan 01 should remain in the racing physics section (before the render block), NOT inside the world-space draw block. This is fine since inTunnel is physics state, not rendering.

    The physics updates, audio calls, hudTimer DOM update, winner detection, and requestAnimationFrame call at the bottom remain UNCHANGED in their positions. Only the render draw calls are reorganized.

    Do not modify any function other than loop().
  </action>
  <verify>
    <automated>node -e "const c=require('fs').readFileSync('game.js','utf8'); const li=c.indexOf('function loop('); const le=c.indexOf('\nfunction ',li+20); const loop=c.slice(li,le); console.log('hasSave:', loop.includes('ctx.save()')); console.log('hasTranslate240:', loop.includes('ctx.translate(240, 380)')); console.log('hasRotate:', loop.includes('ctx.rotate(-cars[0].angle - Math.PI / 2)')); console.log('hasRestore:', loop.includes('ctx.restore()')); console.log('hasMinimap:', loop.includes('drawMinimap()')); console.log('noOldVignette:', !loop.includes('drawOffTrackVignette(0.55);\n    drawCar')); console.log('countdown_section:', loop.includes('drawCountdown'));"</automated>
  </verify>
  <acceptance_criteria>
    - loop() contains ctx.save() followed by ctx.translate(240, 380) followed by ctx.rotate(-cars[0].angle - Math.PI / 2) followed by ctx.translate(-cars[0].x, -cars[0].y) in that exact order
    - loop() contains ctx.restore() after all drawCar() calls and before drawMinimap()
    - loop() calls drawMinimap() in all three phase branches (or once after restore outside the if/else)
    - drawCountdown(countdown) is called AFTER ctx.restore() in the countdown branch
    - drawWin(winner === 0) is called AFTER ctx.restore() in the done branch
    - cpFlash strokeRect(5, 5, 470, 630) is called AFTER ctx.restore() in the racing branch
    - drawFloatingTexts(dt) is called AFTER ctx.restore() in the racing branch
    - drawDamageBar is called AFTER ctx.restore() in the racing branch
    - drawOffTrackVignette(0.55) is called AFTER ctx.restore() in the racing branch
    - Physics updates (updateCar, updateAI, checkCheckpoints, PAIRS, Net.send, updateHUD) are UNCHANGED in their positions
    - The inTunnel setter forEach remains in the physics section (before the render block)
    - requestAnimationFrame(loop) call at the bottom is unchanged
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Add drawMinimap() function and update drawOffTrackVignette() center</name>
  <files>game.js</files>
  <read_first>
    game.js lines 940-949 — current drawOffTrackVignette() function
    game.js lines 950-990 — context around damage bar, floating texts (to find good insertion point for drawMinimap)
    .planning/phases/02b-monaco-overhaul/02b-CONTEXT.md — D-17 (minimap size/position), D-18 (content), D-19 (scaling formula)
    .planning/phases/02b-monaco-overhaul/02b-RESEARCH.md — Pattern 3: drawMinimap() full implementation
  </read_first>
  <action>
    Update drawOffTrackVignette() to use screen-space center coordinates instead of a world-space project() call. Change the function body from using `const center = project(240, 310)` to hardcoded screen coords. The new createRadialGradient call is: ctx.createRadialGradient(240, 380, 100, 240, 380, 280). This centers the red vignette on the camera focal point (240, 380) per D-02. The fillRect(0, 0, 480, 640) remains unchanged — it covers the screen canvas correctly when called in screen space after ctx.restore().

    Add drawMinimap() as a new function. Insert it in the file just before the loop() function (around line 990-991 area, after drawFloatingTexts). This keeps rendering functions grouped together.

    The drawMinimap() implementation (reference: 02b-RESEARCH.md Pattern 3):
    - Declare constants: MAP_W=100, MAP_H=120, PAD=6, MAP_X=374, MAP_Y=6
    - Compute ROAD_SPINE bounding box with a for...of loop: minX/minY/maxX/maxY initialized to Infinity/-Infinity
    - Compute rangeX and rangeY (protect against zero with `|| 1`)
    - Compute scale as Math.min((MAP_W-PAD*2)/rangeX, (MAP_H-PAD*2)/rangeY)
    - Compute ox = MAP_X + PAD + (MAP_W-PAD*2-rangeX*scale)/2 - minX*scale
    - Compute oy = MAP_Y + PAD + (MAP_H-PAD*2-rangeY*scale)/2 - minY*scale
    - Declare toMap helper: (wx, wy) => [ox + wx*scale, oy + wy*scale]
    - ctx.save()
    - Background: ctx.globalAlpha=0.75, ctx.fillStyle='#0d0d1a', ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H), ctx.globalAlpha=1
    - Circuit outline: ctx.beginPath(), ctx.strokeStyle='rgba(255,255,255,0.4)', ctx.lineWidth=2, ctx.lineCap='round', ctx.lineJoin='round', then ROAD_SPINE forEach using toMap — i===0 ? moveTo : lineTo — then ctx.stroke()
    - Car dots: cars.forEach((car, i) => { const [mx,my] = toMap(car.x, car.y); ctx.beginPath(); ctx.arc(mx, my, i===0 ? 3 : 2, 0, Math.PI*2); ctx.fillStyle = i===0 ? '#ffffff' : (car.rivalData?.body ?? '#888'); ctx.fill(); })
    - ctx.restore()

    Do NOT modify any other function.
  </action>
  <verify>
    <automated>node -e "const c=require('fs').readFileSync('game.js','utf8'); console.log('hasDrawMinimap:', c.includes('function drawMinimap()')); console.log('minimapMapW:', c.includes('MAP_W = 100')); console.log('vignetteUpdated:', c.includes('createRadialGradient(240, 380,')); console.log('vignetteNoOldCenter:', !c.includes('createRadialGradient(center.x')); console.log('roadSpineInMinimap:', c.includes('ROAD_SPINE') && c.indexOf('function drawMinimap()')>0); const dm=c.slice(c.indexOf('function drawMinimap()'), c.indexOf('function drawMinimap()')+2000); console.log('minimapHasCars:', dm.includes('cars.forEach')); console.log('minimapHasSaveRestore:', dm.includes('ctx.save()') && dm.includes('ctx.restore()'));"</automated>
  </verify>
  <acceptance_criteria>
    - game.js contains function drawMinimap() as a top-level function
    - drawMinimap() declares MAP_W = 100 and MAP_H = 120
    - drawMinimap() uses MAP_X = 374 and MAP_Y = 6 (or equivalent expression 480-MAP_W-6)
    - drawMinimap() iterates over ROAD_SPINE to draw the circuit outline
    - drawMinimap() iterates over cars[] to draw car dots, with player dot (i===0) in white
    - drawMinimap() is wrapped in ctx.save() / ctx.restore()
    - drawOffTrackVignette() now uses ctx.createRadialGradient(240, 380, 100, 240, 380, 280) — screen-space center
    - drawOffTrackVignette() does NOT use project(240, 310) or createRadialGradient(center.x, ...
    - drawOffTrackVignette() fillRect(0, 0, 480, 640) is unchanged
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Canvas 2D transform stack | ctx.save/restore must be balanced — an unmatched save would corrupt all subsequent draws |
| car.rivalData?.body | Optional chaining — if rivalData is null (multiplayer remote car), falls back to '#888' |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02b03-01 | Tampering | ctx transform stack balance | mitigate | Every ctx.save() in drawMinimap and the camera block has a matching ctx.restore(); verify by tracing through each phase branch |
| T-02b03-SC | Tampering | No npm installs | accept | Pure JS edit — no packages |
</threat_model>

<verification>
After both tasks complete, open the game in a browser (npx http-server . -p 8081 then visit http://localhost:8081):

1. Start a VS CPU race (any rival).
2. During countdown: all 4 cars should appear at the new START positions (main straight at y≈1820). The world should look roughly like a Monaco circuit outline (even if the shape needs adjustment).
3. During racing: the player car should always point UP on screen as it navigates corners. The world rotates around it. This is the key validation of D-01.
4. Top-right corner: a small dark rectangle (~100x120px) appears showing the circuit outline with a white dot (player) and coloured dots (AI cars).
5. Going off-track: a red vignette appears, centred on the car position on screen (not at a fixed screen point).
6. drawCountdown overlay (numbers "3", "2", "1", "¡GO!") appears correctly — not rotated with the world.
7. After a car finishes: the "¡GANASTE!" or "¡Buen intento!" overlay appears correctly — not rotated.
8. Open browser DevTools console — zero JavaScript errors.
</verification>

<success_criteria>
The rotating follow camera is active. The player car always points up on screen. All three game phases (countdown, racing, done) apply the camera transform consistently. The minimap shows circuit position. No JS errors in the console. The game is now playable — the core Phase 2b deliverable is met.
</success_criteria>

<output>
Create `.planning/phases/02b-monaco-overhaul/02b-03-SUMMARY.md` when done.
</output>
