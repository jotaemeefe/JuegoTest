# Release 04B — Racecraft & Visual Coherence

**Date:** 2026-07-11
**Status:** COMPLETE

## Player-facing changes

- Trackside environment is composed intentionally: only surface materials repeat.
- Unique yachts, stands, tunnel structures, balustrades and tire walls no longer tile.
- Pixel spectators celebrate with Argentine and Alpine flags; photographers line the circuit.
- Track asphalt uses the authored atlas texture and has stronger barrier/kerb contrast.
- Nitro was removed. DRS follows a one-second detection, one-use-per-lap, main-straight rule.
- The circuit is 22% larger than R4A and the grid starts on a longer straight.
- AI grid rows now launch forward instead of targeting a waypoint behind them.
- Perfect sectors, clean overtakes and clean streaks create a score/mastery objective.

## Technical decisions

- Texture tiles and modular seat/armco rows may repeat; semantic props such as yachts, tunnels and crowd clusters may not.
- Props and crowd clusters are drawn once at explicit world coordinates.
- Crowd sprites use chroma-key removal and are stored as local RGBA PNG.
- DRS is shared player/AI logic through `useDRS()` and `isInDrsZone()`.
- R4A save keys and multiplayer messages remain compatible.

## Assets

- `assets/r4a-tileset.png`: 16-cell environment tileset.
- `assets/r4b-crowd.png`: 2×2 crowd/photographer sprite sheet with alpha.

The crowd sheet was generated with the built-in image generation workflow as four
orthographic 16-bit clusters (Argentine supporters, Alpine supporters, photographers and
mixed fans) on a flat chroma background, then converted locally to RGBA with the standard
chroma-key helper. People are rendered smaller than cars and clusters are uniquely placed.

## Verification

- `node --check game.js`: pass.
- R4A regression smoke: 19 invariants pass.
- R4B release suite: 13 invariants pass.
- `git diff --check`: pass.
- Direct `file://` active race: zero uncaught page errors.
- Desktop active race: `tests/r4b-race.png`.
- Compact active race: `tests/r4b-mobile.png`.
- Forced legal DRS activation smoke: `tests/r4b-drs.png`.
