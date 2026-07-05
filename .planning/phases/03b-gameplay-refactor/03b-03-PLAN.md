# Plan 03b-03 — Wave 3: AI racecraft (battles, not obstacles)

**Requirements:** R3B-07 (avoidance + wheel-to-wheel), R3B-08 (rubber-band)
**Files:** `game.js`
**Depends on:** 03b-01 (`trackProgress`), 03b-02 (contact physics that reward side-by-side).

## Tasks

### T1 — Opponent awareness / avoidance
In `updateAI()`:
- If another car is within 100px ahead (±35° cone), add a lateral offset target (pick the
  side with more room to the track edge via `nearestSpinePoint().dist`) — the AI goes for
  the pass instead of driving through the player's gearbox.
- If the player is *behind* within 80px, a `defensive` personality shifts 12px toward the
  inside line (one move, held for 2s — F1-style single defensive move); `aggressive` holds
  the racing line.

### T2 — Rubber-band (keeps races alive)
- Gap-aware speed trim using `trackProgress`: if the AI leads the player by > 4s of gap,
  ×0.96 top speed; if it trails by > 4s, ×1.05 (caps at skill 1.0 equivalent). Subtle —
  the ÉLITE tier should still be hard to beat.

### T3 — Mistakes under pressure
- When the player is within 1s of gap behind the AI for > 3s, roll a small chance
  (personality-scaled: aggressive 2×) of a "mistake": one-frame steering flinch + 15% brake
  — creates real overtaking windows tied to pressure, not RNG spam.

## Verification (Playwright)
1. Park the player on the racing line: AI must lap past without ramming (offset visible,
   no contact > 1 event per pass).
2. Instrument a 3-lap race vs MEDIO rival: final gap within ±8s (rubber-band working),
   at least one pressure-mistake event logged when tailing.
3. Aggressive vs defensive: measure lateral offset when player approaches from behind —
   defensive shifts, aggressive holds.
