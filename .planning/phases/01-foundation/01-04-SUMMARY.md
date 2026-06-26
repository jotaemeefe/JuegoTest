---
phase: 01-foundation
plan: 04
subsystem: multiplayer-ux
tags: [clipboard, toast, modal, disconnect, ux]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [UI-05, UI-06]
  affects: [index.html, style.css, game.js]
tech_stack:
  added: []
  patterns: [navigator.clipboard API with fallback, CSS opacity transition toast, fixed overlay modal]
key_files:
  created: []
  modified:
    - index.html
    - style.css
    - game.js
decisions:
  - "Net.destroy() moved before modal.hidden = false in onDisconnect() so the peer connection is torn down before the 3s UI delay"
  - "navigator.clipboard && guard handles file:// context where clipboard API is unavailable — fallback toast shown instead of silent failure"
  - ".catch() on writeText promise handles permission-denied rejections on HTTPS without crashing"
  - "toast opacity transition (0.25s ease) driven by .visible class add/remove — no JS animation frames needed"
metrics:
  duration: "8 min"
  completed: "2026-06-26"
  tasks_completed: 2
  files_modified: 3
---

# Phase 1 Plan 4: Copy Button and Disconnect Modal Summary

**One-liner:** Clipboard copy button with CSS opacity toast and non-blocking 3s disconnect modal replacing the blocking alert() call in onDisconnect().

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Copy button DOM, toast DOM, disconnect modal DOM + all CSS | 6f57fa1 | index.html, style.css |
| 2 | Copy button JS handler + rewrite onDisconnect() modal | 9bf9df7 | game.js |

## What Was Built

### Task 1 — index.html and style.css

**index.html — three DOM additions:**

- `<button id="btn-copy-code" class="btn btn-secondary">Copiar código</button>` inserted inside `#screen-create` after `#room-code-display` (UI-05)
- `<div id="copy-toast" class="copy-toast" aria-live="polite"></div>` inserted immediately after `btn-copy-code` — starts invisible, `aria-live="polite"` for screen reader support (UI-05)
- `<div id="disconnect-modal" class="disconnect-modal" hidden>` with two `<p>` children, placed inside `.app` after `#screen-results` and before the closing `.app` `</div>` (UI-06)

**style.css — two rule blocks appended after last existing rule:**

- `.copy-toast`: `opacity: 0`, `transition: opacity 0.25s ease`, green text (`#10b981`), `min-height: 20px` prevents layout shift
- `.copy-toast.visible { opacity: 1; }` — JS adds/removes this class
- `.disconnect-modal`: `position: fixed; inset: 0; z-index: 9999; background: rgba(5, 10, 26, 0.92)` — full-screen overlay above all game content
- `.disconnect-modal[hidden] { display: none; }` — CSS attribute selector ensures `hidden` is respected without a `display: flex` override conflict

### Task 2 — game.js

**onDisconnect() rewrite (UI-06):**

Old implementation (3 lines):
```js
stopLoop();
alert('El rival se desconectó. Vuelve al menú.');
goTo('lobby'); Net.destroy();
```

New implementation:
```js
stopLoop();
Net.destroy();
const modal = document.getElementById('disconnect-modal');
if (modal) {
  modal.hidden = false;
  setTimeout(() => { modal.hidden = true; goTo('lobby'); }, 3000);
} else {
  goTo('lobby');
}
```

Key differences: `alert()` removed entirely; `Net.destroy()` moved before modal show; `goTo('lobby')` deferred 3000ms inside `setTimeout` (non-blocking); `else` branch is a safety fallback if DOM is missing.

**btn-copy-code handler (UI-05):**

Added after `btn-cancel-join` listener. Handler:
1. Reads `#room-code-display` `textContent.trim()` for the 6-char room code
2. Guards `navigator.clipboard && navigator.clipboard.writeText` before calling (handles `file://` context)
3. On success: `showToast('¡Copiado!')` — adds `.visible` class, removes after 1500ms
4. `.catch()` on promise: `showToast('Copia el código manualmente')` — handles permission-denied
5. Else (no clipboard API): same fallback message — no silent failure

## Verification

Acceptance criteria verified programmatically via `node -e`:
- `alert()` removed from game.js: confirmed
- `disconnect-modal` present in `onDisconnect()`: confirmed
- `setTimeout` present in `onDisconnect()`: confirmed
- `btn-copy-code` addEventListener present: confirmed
- `navigator.clipboard.writeText` call present: confirmed
- `navigator.clipboard &&` guard present: confirmed
- `.catch()` handler present: confirmed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security-relevant surfaces beyond those documented in plan threat model:
- T-04-01: clipboard writes only the 6-char alphanumeric room code (not PII)
- T-04-02: modal auto-dismisses at 3s; no way to trap user in modal
- T-04-03: onDisconnect fires only on genuine PeerJS connection close

## Self-Check: PASSED

- index.html contains `id="btn-copy-code"` inside `#screen-create`: confirmed
- index.html contains `id="copy-toast"` after btn-copy-code: confirmed
- index.html contains `id="disconnect-modal"` with `hidden` attribute inside `.app`: confirmed
- style.css ends with `.copy-toast` and `.disconnect-modal` rules: confirmed
- style.css `.disconnect-modal[hidden] { display: none; }` present: confirmed
- game.js `alert()` removed from onDisconnect(): confirmed
- game.js `navigator.clipboard.writeText` with guard and catch: confirmed
- Commit 6f57fa1 exists: confirmed (Task 1)
- Commit 9bf9df7 exists: confirmed (Task 2)
