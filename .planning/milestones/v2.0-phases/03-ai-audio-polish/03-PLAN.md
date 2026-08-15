# Phase 3 Plan — AI, Audio & Polish

**Date:** 2026-07-04
**Depends on:** Phases 1, 2, 2b, 2c (all COMPLETE)
**Adapted to:** the 1v1 (2-car) reality established in Phase 2c — VS CPU is now player + one selected rival.

## Goal

Racing feels tense and dramatic: the AI brakes for corners and varies its line with a
personality tied to the rival, background music builds atmosphere and fades at the flag,
and visual/audio effects celebrate overtakes, communicate damage, and reward a fast lap.
DRS adds a tactical speed boost.

## Requirements & how each is met

### AI (AI-01, AI-02, AI-03)
- **AI-01 real braking**: raise the AI brake factor from 0.35 → graded 0.7×`brakeStrength`
  (sharper corner ⇒ harder braking), lower the braking threshold to 0.5 rad, and scale the
  effective top speed down while braking. The AI visibly slows for Loews.
- **AI-02 line variation**: add a small per-lap random lateral bias (`car.lineBias`,
  regenerated when `car.lap` changes) on top of the personality `lineMult` offset, so the
  line differs lap-to-lap.
- **AI-03 personalities**: assign the single rival a personality from its skill tier —
  ≥0.90 aggressive (tighter line, faster), ≤0.82 defensive (wider, slower), else consistent.

### Audio (AUDIO-01, AUDIO-02, AUDIO-03)
- **AUDIO-01 music**: `startMusic()`/`stopMusic()` — a low-volume 8-step bass + arp
  sequencer (setInterval scheduler) through a dedicated `musicGain`; fades out (gain ramp +
  interval clear) when the checkered flag falls (`stopEngine()` path / phase→done).
- **AUDIO-02 overtake tone**: rising synth sweep on overtake; DRS activation whoosh.
- **AUDIO-03 tunnel muffle**: store the engine low-pass filter; drop its cutoff (1200→500 Hz)
  while `cars[0].inTunnel` for a muffled tunnel effect, restore on exit.

### VFX (VFX-01 … VFX-05)
- **VFX-01 damage tint**: full-screen tint that ramps orange→red with `cars[0].damage`
  (starts ~40%), drawn in screen space after the vignette.
- **VFX-02 impact shake**: `triggerShake()` helper; fire on hard car-car collisions
  (high relative velocity), reusing the existing `.shake` CSS animation.
- **VFX-03 overtake flash**: per-car `flashUntil`; on overtake flash the passed car white,
  on being overtaken flash the player. `drawCar()` renders the flash overlay.
- **VFX-04 DRS speed lines**: motion streaks drawn while the player's DRS boost is active.
- **VFX-05 lap feedback**: gold record / delta floating text (shared with UI-07 lap delta).

### DRS (DRS-01)
- Detection: DRS available to a car when it is within `DRS_RANGE` (60px) of the car ahead in
  classification and has not used it this lap. HUD shows "DRS DISPONIBLE"; a floating
  `#btn-drs` appears on mobile.
- Activation: player via ArrowUp / W / Shift / DRS button → `DRS_BOOST` (1.28×) top speed for
  `DRS_DURATION` (3s). `car.drsLap` guards one use per lap (auto-resets when `car.lap` changes).
- The AI activates DRS automatically under the same condition.

### UI-07
- CSS restyle of lobby, rival select, and results with Alpine blue **and pink** (#f569b7),
  stronger typography and gradient banners. Add DRS button + indicator styling.

## Success criteria (from ROADMAP, adapted to 1v1)
1. The AI visibly brakes for Loews; its line varies lap-to-lap; an aggressive rival runs a
   tighter line than a defensive one.
2. Music plays during the race and fades at the checkered flag.
3. Heavy damage tints the screen orange→red and hard impacts shake it.
4. Passing the rival flashes it + rising tone; being passed flashes the player.
5. Each lap shows time vs personal best ("1:23.4 +0.8s récord" / "RÉCORD PERSONAL! -0.3s"
   gold); results always shows a best lap, "--:--" when none.
6. Within 60px of the car ahead → "DRS DISPONIBLE"; activating gives a 3s boost, resets next
   lap; the AI uses DRS too.
7. Lobby / rival / results restyled with Alpine blue+pink and impactful type.
8. Zero JS console errors across countdown, racing, done.

## Files
- `game.js` — AI, audio, VFX, DRS, lap feedback, DRS input.
- `index.html` — DRS button, DRS HUD indicator.
- `style.css` — UI-07 restyle + DRS styling.
