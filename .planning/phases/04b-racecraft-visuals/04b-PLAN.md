# Phase 04B Plan — Racecraft & Visual Coherence

**Status:** COMPLETE

## Goal

Turn R4A's technically functional 22-car race into a coherent F1 arcade race: a readable
long starting straight, legal DRS instead of unlimited nitro, meaningful trackside art,
correct visual scale and an additional mastery/challenge loop.

## Waves

### 1. Environment composition

- [x] Restrict repetition to materials and genuinely modular structures such as seat rows.
- [x] Render yacht, grandstand, balustrade, tunnel and tire wall as unique props.
- [x] Reduce prop scale relative to cars.
- [x] Add trackside cheering crowds and photographers.
- [x] Use the asphalt tile inside the road body for stronger track readability.

### 2. F1 race mechanic

- [x] Remove the rechargeable/unlimited nitro economy.
- [x] Detect DRS eligibility at the finish line when within one second.
- [x] Allow one activation on the following main straight.
- [x] End DRS after three seconds or when leaving the zone.
- [x] Give AI drivers the same rules.

### 3. Track and grid

- [x] Scale the world from 1.35 to 1.65.
- [x] Move META from base x=500 to x=700.
- [x] Move the complete grid onto the extended straight.
- [x] Correct the initial AI waypoint so rear rows accelerate forward.

### 4. Challenge loop

- [x] Award sector precision/speed points.
- [x] Build a clean-driving streak through perfect sectors and overtakes.
- [x] Reset streak on hard wall/car contact.
- [x] Show final race score in results.

### 5. Validation

- [x] JavaScript syntax.
- [x] R4 smoke and new 04B invariants.
- [x] Direct `file://` runtime.
- [x] Desktop and compact visual screenshots.
- [x] DRS-active visual smoke.
- [x] No page errors during active racing.
