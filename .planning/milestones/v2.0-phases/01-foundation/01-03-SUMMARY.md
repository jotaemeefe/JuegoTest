---
phase: 01-foundation
plan: 03
subsystem: ui-responsive
tags: [carousel, mobile, css, responsive, rival-select]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [UI-04]
  affects: [index.html, style.css, game.js]
tech_stack:
  added: []
  patterns: [CSS media query carousel, display:contents desktop passthrough, closure-scoped carousel state]
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - game.js
decisions:
  - "carouselIdx declared as local variable inside buildRivalGrid() — resets to 0 on each call, no global state"
  - "prevBtn.onclick / nextBtn.onclick assignment (not addEventListener) prevents handler accumulation on repeated calls"
  - "display:contents on .carousel-wrapper at >=500px makes the wrapper invisible to layout — children behave as if wrapper doesn't exist"
  - "Staggered show animation adds .show to all 21 cards including hidden ones — correct behavior, no change needed"
metrics:
  duration: "8 minutes"
  completed: "2026-06-26"
  tasks_completed: 2
  files_modified: 3
---

# Phase 1 Plan 3: Mobile Rival Select Carousel Summary

**One-liner:** Single-card carousel with prev/next buttons and N/21 indicator for viewports narrower than 500px, while the 2-column desktop grid is fully preserved via CSS display:contents.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Carousel DOM structure + CSS | d5bc135 | index.html, style.css |
| 2 | Carousel JavaScript state and navigation handlers | b950c21 | game.js |

## What Was Built

### Task 1 — index.html and style.css

**index.html:** Wrapped the existing `.rival-grid` div with a `.carousel-wrapper` div containing `#rival-prev` (&#8249;) and `#rival-next` (&#8250;) buttons. Added `#carousel-indicator` div below the wrapper. The `#btn-cancel-rival` button remains unchanged after the indicator.

**style.css:** Appended two new media query blocks at the end of the file without modifying any existing rules:

- `@media (max-width: 499px)`: `.rival-card { display: none }` hides all cards; `.rival-card.carousel-active { display: flex }` shows the active one; `.carousel-wrapper` is a flex row; `.carousel-btn` sized for tap targets (padding 10px 14px, font-size 1.4rem); `.carousel-indicator` displays N/21 text.

- `@media (min-width: 500px)`: `.carousel-wrapper { display: contents }` makes the wrapper invisible to layout — its children (`.rival-grid` and the buttons) participate in the parent flex column as if the wrapper does not exist. `.carousel-btn { display: none }` and `.carousel-indicator { display: none }` hide the navigation UI. The 2-column grid behaves identically to before.

### Task 2 — game.js

Modified `buildRivalGrid()` to add carousel state management entirely inside the function:

- `let carouselIdx = 0;` at function start ensures the index resets to 0 on every call (RESEARCH.md Pitfall 2 — global variable would persist across visits to rival select screen).

- `updateCarousel()` closure: reads `window.innerWidth < 500` to detect mobile; on mobile, toggles `carousel-active` on the card at `carouselIdx` and sets indicator text `"N / 21"`; on desktop, removes all `carousel-active` classes and clears indicator.

- `prevBtn.onclick` / `nextBtn.onclick` assignments use modulo arithmetic `(carouselIdx - 1 + count) % count` and `(carouselIdx + 1) % count` for full wrap-around in both directions. Assignment (not `addEventListener`) replaces any prior handler if `buildRivalGrid()` is called multiple times.

- `updateCarousel()` called once at end of `buildRivalGrid()` to set initial state (card 0 visible, indicator "1 / 21").

The existing card click handler (which calls `beginCountdown()` via `dataset.rivalIdx`) is unchanged — clicking the one visible card always selects the correct rival because card DOM order matches RIVALS array index.

## Verification

Acceptance criteria verified programmatically via grep:

- `id="rival-prev"` in index.html: 1 occurrence (confirmed)
- `id="rival-next"` in index.html: 1 occurrence (confirmed)
- `id="carousel-indicator"` in index.html: 1 occurrence (confirmed)
- `carousel-wrapper` in index.html: 1 occurrence (confirmed)
- `@media (max-width: 499px)` in style.css: 1 occurrence (confirmed)
- `.carousel-active` in style.css: 1 occurrence (confirmed)
- `display: contents` in style.css: 1 occurrence (confirmed)
- `.carousel-btn` in style.css: 2 occurrences (confirmed)
- `let carouselIdx = 0` in game.js: 1 occurrence, local (confirmed)
- `function updateCarousel` in game.js: 1 occurrence (confirmed)
- `rival-prev` in game.js: 1 occurrence (confirmed)
- `rival-next` in game.js: 1 occurrence (confirmed)
- `updateCarousel()` call in game.js: 4 occurrences (function def + 2 calls in handlers + 1 final call) (confirmed)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All 21 rival cards are fully rendered with actual data from the RIVALS array.

## Threat Flags

None — changes are entirely client-side CSS/JS. No new network endpoints, auth paths, file access patterns, or schema changes. T-03-01 and T-03-02 from threat model: modulo arithmetic prevents out-of-bounds on carouselIdx; window.innerWidth manipulation is cosmetic-only at worst.

## Self-Check: PASSED

- index.html modified: carousel-wrapper, rival-prev, rival-next, carousel-indicator present
- style.css modified: @media (max-width: 499px) and @media (min-width: 500px) carousel blocks appended
- game.js modified: carouselIdx, updateCarousel(), prev/next onclick handlers, updateCarousel() call
- Commit d5bc135 verified (Task 1)
- Commit b950c21 verified (Task 2)
- All grep counts match expected values
