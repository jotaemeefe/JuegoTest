---
phase: 02b-monaco-overhaul
plan: 02
type: execute
wave: 2
depends_on:
  - 02b-01
files_modified:
  - game.js
autonomous: true
requirements:
  - TRACK-01

must_haves:
  truths:
    - "drawTrack() background fills with fillRect(-4000,-4000,8000,8000) — not the old fillRect(0,0,480,640)"
    - "Track renders as asphalt fill (#2d3748) plus red/white kerb dashes at [60,60] scale, covering the new 1600x2000 ROAD_SPINE"
    - "No colour environment blocks drawn (harbour water, casino building, hairpin inner, pit lane) — deferred per D-20"
    - "Start/finish chequered stripe drawn at new META x position (x≈520) perpendicular to main straight"
    - "The watermark fillText('CIRCUIT DE MONACO...') at world (240,310) is removed from drawTrack()"
    - "drawSpinePath() works correctly with the new 52-point ROAD_SPINE"
    - "Racing line dashes (yellow, thin) are kept as optional decoration"
  artifacts:
    - path: "game.js"
      provides: "Rewritten drawTrack() function for new world space"
      contains: "fillRect(-4000, -4000, 8000, 8000)"
    - path: "game.js"
      provides: "Kerb dashes at new scale"
      contains: "setLineDash([60, 60])"
  key_links:
    - from: "drawTrack()"
      to: "drawSpinePath()"
      via: "drawSpinePath() call inside drawTrack — function unchanged"
      pattern: "drawSpinePath\\(\\)"
    - from: "drawTrack() fillRect background"
      to: "camera transform in loop()"
      via: "large fillRect covers world space regardless of camera position/rotation"
      pattern: "fillRect\\(-4000"
---

<objective>
Rewrite drawTrack() for the new 1600x2000 world space per D-20 and D-21. Three key changes: (1) background fillRect expands to (-4000,-4000,8000,8000) so canvas corners stay filled when the camera rotates, (2) all environment colour blocks (harbour, casino, hairpin inner, pit lane) are removed as they use old 480x640 hardcoded coords, (3) the watermark is removed. Kerb dash scale is updated from [18,18] to [60,60] to remain visible at 3.5x scale. The tarmac, kerbs, and start/finish stripe remain — these are world-space draws that work correctly via drawSpinePath().

Purpose: Without the large fillRect, the camera transform (Plan 02b-03) will leave unfilled black corners as the world rotates. Without removing the old environment blocks, those blocks will appear at wrong positions in the new world. This is the prerequisite for a legible track once the camera is added.

Output: drawTrack() simplified and correct for the new geometry. The game is still playable but will look odd until the camera transform is added in Plan 02b-03.
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

<interfaces>
<!-- Exact current drawTrack() structure to be rewritten — from game.js lines 455-572 -->

Current drawTrack() structure (to REPLACE entirely):
  ctx.fillRect(0, 0, 480, 640)              → replace with fillRect(-4000, -4000, 8000, 8000)
  Harbour water block (project(330,280)...)  → REMOVE (old 480x640 coords, D-20)
  Casino building block (project(280,195)...)→ REMOVE (old coords, D-20)
  Hairpin inner block (project(335,160)...)  → REMOVE (old coords, D-20)
  Pit lane strip (project(60,580)...)        → REMOVE (old coords, D-20)
  Kerb: ctx.setLineDash([18, 18])           → change to [60, 60] (3.5x scale)
  Kerb: ctx.lineDashOffset = 18             → change to 60
  Tarmac: ctx.lineWidth = ROAD_HALF_W * 2   → keep (ROAD_HALF_W is now 80 → lineWidth=160)
  Racing line dashes: setLineDash([14, 10]) → keep as-is (very thin line, scale matters less)
  Start/finish stripe: project(130, 550...)  → update to new META coords (x:520, y:1820)
  META label fillText at pm1.x+14, pm1.y-3  → update position to match new stripe coords
  Watermark: fillText('CIRCUIT DE MONACO...') → REMOVE (per RESEARCH.md open question 3)

drawSpinePath() function (lines 415-421) — DO NOT CHANGE:
  function drawSpinePath() {
    ctx.beginPath();
    ROAD_SPINE.forEach(([x, y], i) => {
      const p = project(x, y);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
  }
  This function is unchanged — it already reads from ROAD_SPINE and calls project() (identity).
  After Plan 02b-01, ROAD_SPINE has the new 52-point array, so drawSpinePath() will trace new Monaco.

New start/finish stripe calculation (replaces project(130, 550...) references):
  The main straight is at y≈1820, running east-west. Direction of travel is east (+x).
  Perpendicular to east is north-south (vertical line in world space).
  Stripe: vertical line at x=520 (CP0 position), from y=1820-ROAD_HALF_W to y=1820+ROAD_HALF_W
  In code: project(520, 1820 - ROAD_HALF_W) and project(520, 1820 + ROAD_HALF_W)
  META label: draw near project(520, 1820 - ROAD_HALF_W - 10) for visibility above stripe

No changes to: ROAD_HALF_W (already updated in Plan 01), drawSpinePath(), project(), any function outside drawTrack()
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite drawTrack() for new world space and scale</name>
  <files>game.js</files>
  <read_first>
    game.js lines 414-572 — current drawSpinePath() and full drawTrack() function
    game.js lines 1-20 — verify ROAD_HALF_W is now 80 (from Plan 02b-01)
    .planning/phases/02b-monaco-overhaul/02b-CONTEXT.md — D-20 (background color), D-21 (track only)
    .planning/phases/02b-monaco-overhaul/02b-RESEARCH.md — Pattern 2: Simplified drawTrack() for 2-B
  </read_first>
  <action>
    Rewrite the drawTrack() function body (lines ~455-572). Keep the function signature `function drawTrack()` unchanged. Replace the entire body with the following structure (no fenced blocks — implement as directive prose):

    1. Background fill: use ctx.fillStyle = '#3a3a4a' followed by ctx.fillRect(-4000, -4000, 8000, 8000). This is the critical change — the large rect covers the entire rotated world so no black corners appear when camera rotates.

    2. Set line caps: ctx.lineCap = 'round' and ctx.lineJoin = 'round' (unchanged).

    3. Kerbs: ctx.save(), set ctx.lineWidth = ROAD_HALF_W * 2 + 12, call ctx.setLineDash([60, 60]) (was [18,18] — scaled 3.5x), set ctx.strokeStyle = '#dc2626', call drawSpinePath() and ctx.stroke(), then set ctx.lineDashOffset = 60 (was 18), set ctx.strokeStyle = '#f8fafc', call drawSpinePath() and ctx.stroke(), then ctx.setLineDash([]) and ctx.restore().

    4. Tarmac: ctx.lineWidth = ROAD_HALF_W * 2 (= 160 with new ROAD_HALF_W), ctx.strokeStyle = '#2d3748', drawSpinePath(), ctx.stroke().

    5. Racing line dashes (keep for visual polish): ctx.save(), ctx.setLineDash([14, 10]), ctx.strokeStyle = 'rgba(251,191,36,0.22)', ctx.lineWidth = 2, drawSpinePath(), ctx.stroke(), ctx.setLineDash([]), ctx.restore().

    6. Start/finish chequered stripe at new META position: declare pm1 = project(520, 1820 - ROAD_HALF_W) and pm2 = project(520, 1820 + ROAD_HALF_W). Draw a dashed vertical stripe from pm1 to pm2 using the same pattern as before: ctx.save(), ctx.lineWidth = 5, ctx.setLineDash([6, 6]), ctx.strokeStyle = '#f8fafc', moveTo pm1 lineTo pm2 stroke, then lineDashOffset=6 strokeStyle='#111827' moveTo pm1 lineTo pm2 stroke, then ctx.setLineDash([]) and ctx.restore().

    7. META label: ctx.fillStyle = 'rgba(248,250,252,0.75)', ctx.font = 'bold 7px monospace', ctx.textAlign = 'center', ctx.fillText('META', pm1.x + 14, pm1.y - 3). (Offset +14 puts label slightly to the right of the stripe endpoint, same as original.)

    REMOVE entirely: harbour water block, casino building block, hairpin inner block, pit lane strip, and watermark fillText. Do not replace them with anything — they are deferred to Phase 3 per D-20.

    DO NOT change: drawSpinePath() function, project() function, or any code outside drawTrack().
  </action>
  <verify>
    <automated>node -e "const c=require('fs').readFileSync('game.js','utf8'); const dt=c.slice(c.indexOf('function drawTrack()'),c.indexOf('function drawTrack()')+3000); console.log('largeFillRect:', dt.includes('fillRect(-4000')); console.log('noOldFillRect:', !dt.includes('fillRect(0, 0, 480, 640)')||dt.indexOf('fillRect(0, 0, 480, 640)')>dt.indexOf('fillRect(-4000')); console.log('dashScale60:', dt.includes('setLineDash([60, 60])')); console.log('noHarbour:', !dt.includes('1a4a7a')); console.log('noCasino:', !dt.includes('c8c8c4')); console.log('noWatermark:', !dt.includes('CIRCUIT DE MONACO')); console.log('newMETA:', dt.includes('520, 1820'));"</automated>
  </verify>
  <acceptance_criteria>
    - drawTrack() body contains ctx.fillRect(-4000, -4000, 8000, 8000) as the first draw call
    - drawTrack() does NOT contain fillRect(0, 0, 480, 640)
    - drawTrack() contains setLineDash([60, 60]) for the kerbs (not [18, 18])
    - drawTrack() does NOT contain '#1a4a7a' (harbour water colour)
    - drawTrack() does NOT contain '#c8c8c4' (casino building colour)
    - drawTrack() does NOT contain '1a1a1a' in the context of pit lane (check: the pit lane fillStyle was '#1a1a1a' in a save/restore block — verify that block is absent)
    - drawTrack() does NOT contain 'CIRCUIT DE MONACO' (watermark removed)
    - drawTrack() contains 'project(520, 1820' — new META stripe position
    - drawSpinePath() function remains UNCHANGED (beginPath, forEach ROAD_SPINE, project, moveTo/lineTo)
    - No other functions were modified
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Canvas 2D rendering | Pure rendering constants — no external input |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02b02-SC | Tampering | No npm installs | accept | No packages — pure JS edit |
</threat_model>

<verification>
After task completes, open game.js and search for:
1. "fillRect(-4000" — must appear inside drawTrack()
2. "setLineDash([60, 60])" — must appear in drawTrack() kerb section
3. "#1a4a7a" — must NOT appear anywhere
4. "CIRCUIT DE MONACO" — must NOT appear anywhere (watermark gone from drawTrack)
5. "project(520, 1820" — must appear as the new META stripe calculation
6. drawSpinePath() function (lines ~415-421) — completely unchanged from Plan 01 state
</verification>

<success_criteria>
drawTrack() is rewritten for the new 1600x2000 world space. Only the track tarmac, kerbs, racing line, and start/finish stripe are rendered. No environment colour blocks. The background fillRect covers world space so the camera transform (next plan) won't leave black corners.
</success_criteria>

<output>
Create `.planning/phases/02b-monaco-overhaul/02b-02-SUMMARY.md` when done.
</output>
