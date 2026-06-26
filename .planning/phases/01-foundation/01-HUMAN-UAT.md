---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-06-26T00:00:00Z
updated: 2026-06-26T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Solo REVANCHA — single audio initialization
expected: Clicking REVANCHA in solo mode restarts the race cleanly with audio firing exactly once (no double tone, no glitch)
result: [pending]

### 2. Spacebar brake + page-scroll prevention
expected: Pressing spacebar during gameplay brakes the car; pressing spacebar on lobby/results screens does NOT scroll the page
result: [pending]

### 3. Canvas sharpness on Retina/HiDPI
expected: On a Retina display (or Chrome DevTools DPR=2), the track, cars, and text render crisply without blur
result: [pending]

### 4. Mobile carousel navigation at 375px viewport
expected: At 375px width — one rival card visible at a time with prev/next buttons and "1 / 21" indicator; navigating 21× wraps back to start; clicking a card starts race against the shown rival
result: [pending]

### 5. Desktop 2-column grid at 500px+ viewport
expected: At 500px+ width — all 21 rivals show in the 2-column grid, prev/next carousel buttons are not visible
result: [pending]

### 6. Copy code button — clipboard write and toast
expected: On localhost — clicking "Copiar código" copies the 6-char code and shows "¡Copiado!" toast for ~1.5s; on file:// URL — shows fallback toast "Copia el código manualmente" instead of silent failure
result: [pending]

### 7. Disconnect modal — no alert(), 3-second auto-redirect
expected: When a peer disconnects mid-race, a modal overlay appears with "El rival se desconectó." text; no alert() dialog; lobby shown after ~3 seconds
result: [pending]

### 8. Zero console errors on page load
expected: Opening index.html (or localhost:8081) shows no SyntaxErrors or ReferenceErrors in the browser console
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
