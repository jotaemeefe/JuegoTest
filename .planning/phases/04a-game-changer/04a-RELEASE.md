# Release 4A — Grand Prix Pixel Revolution

## Outcome

R4A replaces the 1v1 three-lap demo loop with a full-field arcade Grand Prix.

- 22 cars: Colapinto plus every configured rival.
- Separate lobby flows: Grand Prix starts directly; rival selection belongs only to 1v1 Duel.
- Player starts P12; the chosen driver is the featured rival, not the only opponent.
- Five-lap race; the simulation continues after the leader finishes until the player takes the flag.
- Monaco world scaled to 135% and widened for pack racing.
- Dynamic collision broad phase and impulse-based contact preserving tangential momentum.
- Forgiving collision envelope so wheel-to-wheel racing is possible.
- Neo-16-bit UI and a native tile/palette pixel-art rendering pipeline.
- Existing 1v1 PeerJS multiplayer remains isolated from the 22-car solo field.

## Validation gates

1. JavaScript syntax check.
2. `git diff --check`.
3. Automated R4A invariant smoke test.
4. Grid has 22 non-overlapping slots.
5. Race does not end when an AI leader finishes.
6. Environment is generated in code, reduced to a fixed logical pixel grid and enlarged without smoothing.

## Pixel-art implementation

R4A never stretches a complete background image. `assets/r4a-tileset.png` is split at
runtime into sixteen independent cells normalized to 128×128 logical material tiles. Water, stone, gardens,
grandstands, balustrades, yachts, cobbles, tunnel and tire walls are placed separately.
The composed world is then downsampled to a 4-world-pixel logical grid, quantized in
fixed 16-value steps and enlarged with smoothing disabled.
