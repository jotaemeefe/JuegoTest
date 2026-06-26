# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A browser-based 2D top-down F1 racing game themed around Franco Colapinto and Alpine. Two modes: VS CPU (solo) against any of 20 real 2025 F1 drivers, and multiplayer P2P via PeerJS WebRTC. No build tools, no bundler, no package.json — pure HTML/CSS/JS.

## Running the game

Open `index.html` directly in a browser, or serve it with any static HTTP server:

```bash
npx http-server . -p 8081
# then open http://localhost:8081
```

There are no build, lint, or test commands.

## Architecture

The entire game lives in three files: `index.html` (screens and DOM), `style.css` (layout and animations), `game.js` (~1300 lines, all game logic).

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

### AI

`updateAI()` steers `remote` toward waypoints in `AI_WAYPOINTS` (18-point oval). Effective max speed is `MAX_SPD_ON × rival.skill`. The AI never brakes; it relies on friction and waypoint steering.

### Multiplayer (PeerJS)

`Net` is a self-contained IIFE wrapping PeerJS. Host creates a 6-char room code (peer ID); guest connects to it. Messages: `ready`, `start`, `pos` (50ms broadcast), `finish`, `restart`. All incoming `pos` data is validated server-side (range checks) before being applied.

Remote car rendering uses `remoteRenderPos()` which interpolates between the last two received positions to smooth 50ms network jitter.

### Checkpoint and lap system

4 checkpoints (`CPS`) must be hit in order. CP0 doubles as the finish line. `checkCheckpoints()` updates `car.nextCP` and `car.lap`. A lap is complete when CP0 is crossed after all others. Best lap time is persisted in `localStorage` (`cr_best_lap_ms`). Rival win/loss results are stored as `cr_rival_<idx>`.

### Audio

Web Audio API synthesizer: two oscillators for engine tone, white noise node for brake squeal. All created lazily in `getAudioCtx()` on first user gesture (iOS/Safari requirement).

## Key constants to know

Tuning these changes game feel significantly:

| Constant | Default | Effect |
|----------|---------|--------|
| `TURN_RATE` | 3.5 rad/s | Steering sharpness |
| `AUTO_ACCEL` | 160 px/s² | How quickly cars reach top speed |
| `MAX_SPD_ON` | 190 px/s | Top speed on track |
| `BRAKE_FORCE` | 350 px/s² | Braking deceleration |
| `ROAD_HALF_W` | 60 px | Track half-width |
| `CAR_RADIUS` | 14 px | Collision radius |

`rival.skill` (0.79–0.96) scales the AI's effective top speed.
