# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A browser-based 2D top-down F1 racing game themed around Franco Colapinto and Alpine. Two modes: VS CPU (solo, 1v1 against any of the 21 real 2026 F1 drivers), and multiplayer P2P via PeerJS WebRTC. Both modes race 2 cars. No build tools, no bundler, no package.json — pure HTML/CSS/JS.

## Running the game

Open `index.html` directly in a browser, or serve it with any static HTTP server:

```bash
npx http-server . -p 8081
# then open http://localhost:8081
```

There are no build, lint, or test commands.

## Architecture

The entire game lives in three files: `index.html` (screens and DOM), `style.css` (layout and animations), `game.js` (~1770 lines, all game logic).

### Screen system

Six screens managed by CSS `.active` class via `goTo(name)`. `goTo()` also calls `stopLoop()` when navigating away from `screen-game` — this is the single enforcement point for loop cleanup.

```
lobby → rival (VS CPU) → game → results
lobby → create / join  → game → results
```

### Phase state machine

The game loop branches on `phase`:
- `countdown` — 3-2-1 timer, draws cars on grid
- `racing` — physics, AI, net broadcast, damage, checkpoints
- `done` — winner declared, static render; `pollResults()` (300ms interval) detects this and transitions to results screen

`phase` and `winner` are the two key state variables. They are reset in `resetGame()`.

### Game loop

`startLoop()` / `stopLoop()` manage a `requestAnimationFrame` loop guarded by a `loopRunning` boolean. The guard at the top of `loop()` ensures that if `stopLoop()` is called while a frame is in flight, the next scheduled frame bails immediately without re-scheduling.

### Physics model

All cars use the same model in `updateCar()`: constant auto-acceleration (`AUTO_ACCEL`), proportional friction (`FRICTION_K × speed`), capped at `MAX_SPD_ON` / `MAX_SPD_OFF` depending on track position. Braking applies `BRAKE_FORCE`. Steering is `TURN_RATE × speed_factor`.

Monaco has no run-off — the walls *are* the circuit. After moving a car, if it lands off-track, `nearestSpinePoint()` snaps it back to the track edge (88% of `ROAD_HALF_W`) and cuts its speed. A wrong-way detector (`wrongWayTimer`) caps the player's speed and shows a "⚠ VUELTA INCORRECTA ⚠" overlay when heading opposes the nearest spine direction.

### Camera

The camera is a rotating follow camera (Micro Machines style): the world is drawn with `ctx.translate(240,380) / rotate(-car.angle - PI/2) / translate(-car.x,-car.y)` so the player car always points UP on screen. All HUD/overlay elements (countdown, win text, damage bar, off-track vignette, wrong-way warning, minimap) are drawn in screen space *after* `ctx.restore()` so they never rotate. `drawMinimap()` (top-right) shows the `ROAD_SPINE` outline and live car dots.

### AI

`updateAI()` steers each AI car toward waypoints in `AI_WAYPOINTS` (55-point Monaco line). Effective max speed is `MAX_SPD_ON × skill × personality.speedMult × lapBonus`. The AI **brakes for sharp corners**: when the steering angle to the next waypoint exceeds ~0.65 rad it applies `BRAKE_FORCE` (scaled by `personality.brakeMult`) and caps speed to 60%.

### Multiplayer (PeerJS)

`Net` is a self-contained IIFE wrapping PeerJS. Host creates a 6-char room code (peer ID); guest connects to it. Messages: `ready`, `start`, `pos` (50ms broadcast), `finish`, `restart`. All incoming `pos` data is validated server-side (range checks) before being applied.

Remote car rendering uses `remoteRenderPos()` which interpolates between the last two received positions to smooth 50ms network jitter.

### Checkpoint and lap system

4 checkpoints (`CPS`) must be hit in order. CP0 doubles as the finish line. `checkCheckpoints()` updates `car.nextCP` and `car.lap`. A lap is complete when CP0 is crossed after all others. Best lap time is persisted in `localStorage` (`cr_best_lap_ms`). Rival win/loss results are stored as `cr_rival_<idx>`.

### Audio

Web Audio API synthesizer: two oscillators for engine tone, white noise node for brake squeal. All created lazily in `getAudioCtx()` on first user gesture (iOS/Safari requirement).

## Key constants to know

Tuning these changes game feel significantly:

Tuning these changes game feel significantly. Values below are the current 1600×2000 world-space tuning (retuned during the Phase 2c gameplay fix):

| Constant | Default | Effect |
|----------|---------|--------|
| `TURN_RATE` | 4.5 rad/s | Steering sharpness |
| `AUTO_ACCEL` | 400 px/s² | How quickly cars reach top speed |
| `MAX_SPD_ON` | 450 px/s | Top speed on track |
| `MAX_SPD_OFF` | 175 px/s | Top speed off track |
| `BRAKE_FORCE` | 900 px/s² | Braking deceleration |
| `ROAD_HALF_W` | 80 px | Track half-width |
| `CAR_RADIUS` | 18 px | Collision radius |

`rival.skill` (0.79–0.96) scales the AI's effective top speed.

The circuit lives in `ROAD_SPINE` (57 points, 1600×2000 world space). Monaco in 2D self-crosses (it's a 3D circuit), so the spine was redesigned into a non-crossing layout with mathematically guaranteed separation between passages (Beau Rivage vs Swimming Pool: 296px; main straight y=1500 vs return straight: 245px). `AI_WAYPOINTS` (55 points) follows the same layout.
