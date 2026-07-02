# Phase 02c — Visual Testing Report
**Date:** 2026-07-02  
**Method:** Puppeteer automated gameplay (Chrome headless, 16 screenshots, real browser)  
**Game version:** commit 719ae97  
**Duration tested:** ~35 seconds of gameplay

---

## Executive Summary

The game is **unplayable** in its current state. Within 3 seconds of race start, the player car exits the track and enters an infinite red void with zero ability to return. The primary culprit is the absence of Monaco-style barrier walls — the track has no boundary enforcement. Secondary issues: collision physics cause sticking, and the multiplayer position validation rejects half the Monaco circuit.

---

## Screenshot Analysis

| Screenshot | Time | Observation |
|-----------|------|-------------|
| 03-countdown | 3 | Track visible, cars on grid, minimap OK |
| 04-race-start | 0.4s | Cars on main straight, camera follow working |
| 05-racing-straight | 1.5s | **Last good screenshot.** Player on track, direction arrows barely visible, AI cars visible |
| 06-steering-right | 3.2s | **CRITICAL: ENTIRE SCREEN RED.** Car exited track after 1.5s of right steering. Drops to P4. |
| 07 onwards | 4.9s-35s | **Permanent red void.** Car floats in empty off-track area the entire remaining session |

**Key visual finding from screenshot 05 (last good race shot):**
- Camera follow (no rotation) works — car visible, track curves make sense
- Direction arrows are gray and subtle, merge with track color in motion
- Track width appears appropriate at zoom level
- **The moment the player steers right, the car exits the 160px-wide track** and enters the 1600x2000 void

From screenshots 06-16: no track visible, the vignette creates a near-opaque red screen that covers everything. The minimap still shows circuit outline but the main canvas is useless for navigation.

---

## Critical Issues (P0)

### P0-1: No barrier walls — car escapes track permanently
**Symptom:** 1.5 seconds of steering → car exits track → enters infinite red void → cannot return. Game is unplayed for 90% of the session.  
**Root cause (game.js:734-736):**
```javascript
car.x += Math.cos(car.angle) * car.speed * dt;
car.y += Math.sin(car.angle) * car.speed * dt;
```
Movement is applied unconditionally. No boundary enforcement exists.  
**Game design principle violated:** Control + Fairness. Monaco has NO run-off area — the walls ARE the circuit.  
**Fix:** Add `nearestSpinePoint()` helper. Snap car to track edge (88% of ROAD_HALF_W) and cut speed 78% on wall contact.

### P0-2: Off-track vignette blocks recovery
**Symptom:** Radial red gradient fills ENTIRE screen when off-track. Track becomes invisible. Player can't steer back.  
**Root cause (game.js, line ~1163):** `drawOffTrackVignette(0.55)` — 0.55 alpha at gradient edge dominates the full visual.  
**Fix:** `drawOffTrackVignette(0.28)`. With Monaco walls, car can't go far off-track so vignette becomes a brief tactile warning, not a visibility blocker.

### P0-3: Collision sticking (user-confirmed + code-verified)
**Symptom:** "La experiencia de chocar es malísima, te quedás trabado."  
**Root cause (game.js:662-670):**
```javascript
const overlap = (minDist - dist) * 0.55;  // 45% residual overlap remains
a.speed = Math.max(0, a.speed - relV * 0.35);  // low restitution
```
`0.55` separation leaves 45% overlap residual. `AUTO_ACCEL=550` re-closes the gap in ~0.5s. Perpetual sticking.  
**Fix:** Separation `1.02` (2% extra buffer) + restitution `0.65`.

---

## High Priority Issues (P1)

### P1-1: Multiplayer position bounds reject half the circuit
**Root cause (game.js:1276-1277):**
```javascript
if (!isFinite(x) || x < -500 || x > 1000) return;  // World is 0-1600! Tunnel at x=1220 rejected
if (!isFinite(y) || y < -500 || y > 1200) return;  // World is 0-2000! Main straight y=1820 rejected
```
Tunnel (x=1220), Tabac, Swimming Pool, La Rascasse, Antony Noghès, and **the entire main straight (y=1820)** are all outside these bounds. Remote car invisible for >70% of the lap.  
**Fix:** `x > 1700` and `y > 2100`.

### P1-2: Wrong-way driving has zero consequence
**Root cause:** No wrong-way detection. Checkpoints enforce order but a car can physically drive the wrong direction.  
**Fix:** Detect heading vs nearest spine direction. If dot product < -0.5 for >0.8s at speed>80, cap speed at 100px/s and show "⚠ VUELTA INCORRECTA ⚠" overlay.

---

## Medium Priority (P2)

### P2-1: Direction arrows barely visible in motion
From screenshot 05: gray triangles at 0.22 alpha blend into track. Less critical once Monaco walls enforce direction geometrically.

---

## What Works Well

- **Lobby screen**: Professional, clean design
- **Countdown overlay**: "CIRCUIT DE MONACO" text adds atmosphere (intentional, keep it)
- **Minimap**: Circuit outline accurate, updates real-time
- **HUD**: VUELTA, timer, P1-P4 clearly readable
- **Camera follow**: When on track, translate-only camera works. Car sprite rotates correctly.
- **Car sprite**: Distinctive Alpine livery, visible at scale
- **Track kerbs**: Red/white kerb dashes look great, Monaco feel

---

## Recommended Fix Order

1. Monaco barrier walls (P0-1) — game unplayable without
2. Fix collision restitution (P0-3) — ruins on-track action  
3. Fix multiplayer bounds (P1-1) — breaks online mode
4. Reduce vignette opacity (P0-2) — reduces severity when off-track
5. Wrong-way detector (P1-2) — direction enforcement polish

---

## Implementation Snippets (for Phase 2c plans)

### Monaco walls — new helper + updateCar patch
```javascript
// Add after isOnTrack(), before drawTrack():
function nearestSpinePoint(x, y) {
  let bestDist2 = Infinity, bestX = x, bestY = y, bestSegIdx = 0;
  for (let i = 0; i < ROAD_SPINE.length - 1; i++) {
    const [ax, ay] = ROAD_SPINE[i], [bx, by] = ROAD_SPINE[i + 1];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lenSq));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d2 < bestDist2) { bestDist2 = d2; bestX = cx; bestY = cy; bestSegIdx = i; }
  }
  const [ax, ay] = ROAD_SPINE[bestSegIdx], [bx, by] = ROAD_SPINE[bestSegIdx + 1];
  const sdx = bx - ax, sdy = by - ay, slen = Math.sqrt(sdx*sdx + sdy*sdy) || 1;
  return { x: bestX, y: bestY, dist: Math.sqrt(bestDist2), dirX: sdx/slen, dirY: sdy/slen };
}
```

```javascript
// Replace "Move" section (lines 734-736) in updateCar():
const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
car.x = nextX; car.y = nextY;
if (!isOnTrack(car.x, car.y)) {
  const near = nearestSpinePoint(car.x, car.y);
  if (near.dist > 0) {
    const f = (ROAD_HALF_W * 0.88) / near.dist;
    car.x = near.x + (car.x - near.x) * f;
    car.y = near.y + (car.y - near.y) * f;
  }
  car.speed *= 0.22;
}
```

### Collision fix (game.js:662, 669-670)
```javascript
const overlap = (minDist - dist) * 1.02;   // was 0.55
a.speed = Math.max(0, a.speed - relV * 0.65);  // was 0.35
b.speed = Math.max(0, b.speed - relV * 0.65);  // was 0.35
```

### Multiplayer bounds (game.js:1276-1277)
```javascript
if (!isFinite(x) || x < -500 || x > 1700) return;  // was 1000
if (!isFinite(y) || y < -500 || y > 2100) return;  // was 1200
```

### Wrong-way detection (add to global vars + racing phase + screen-space render)
```javascript
// Global: let wrongWayTimer = 0;  (reset in resetGame)
// In racing phase, after updateCar for cars[0]:
if (cars[0].speed > 80) {
  const near = nearestSpinePoint(cars[0].x, cars[0].y);
  const dot = Math.cos(cars[0].angle) * near.dirX + Math.sin(cars[0].angle) * near.dirY;
  wrongWayTimer = dot < -0.5 ? Math.min(wrongWayTimer + dt, 3) : Math.max(0, wrongWayTimer - dt * 2);
  if (wrongWayTimer > 0.8) cars[0].speed = Math.min(cars[0].speed, 100);
} else {
  wrongWayTimer = Math.max(0, wrongWayTimer - dt);
}
// In screen-space render after ctx.restore():
if (wrongWayTimer > 0.8) {
  ctx.save();
  ctx.fillStyle = `rgba(239,68,68,${Math.min(1, (wrongWayTimer - 0.8) * 2)})`;
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('⚠  VUELTA INCORRECTA  ⚠', 240, 78);
  ctx.restore();
}
```
