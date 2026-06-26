# Codebase Concerns

**Analysis Date:** 2026-06-26

## Tech Debt

**Monolithic single-file game logic:**
- Issue: All 1281 lines of game logic live in `game.js` with no modules, classes, or clear separation between physics, rendering, AI, audio, and networking concerns.
- Files: `game.js`
- Impact: Any change risks unintended side effects across all systems. Finding where a specific subsystem begins and ends requires reading comment banners. Adding features (e.g., a third car, a second track) requires threading changes throughout the entire file.
- Fix approach: Split into ES module files — `physics.js`, `ai.js`, `audio.js`, `net.js`, `render.js`, `game.js` (orchestrator). Requires adding a `<script type="module">` to `index.html` (no bundler needed).

**`cpScore` function defined twice in `updateHUD()`:**
- Issue: The lambda `cpScore` is defined identically at lines 673 and 682 within the same function. The second definition shadows the first for the gap-calculation block.
- Files: `game.js` lines 673, 682
- Impact: Misleading — makes the code appear to have two different scoring models. Any bug fix to one copy must be manually applied to the other.
- Fix approach: Hoist `cpScore` to a single definition at the top of `updateHUD()` and reference it in both the position HUD and the gap calculation.

**`phase` state machine has undead states:**
- Issue: The comment at line 136 documents phases `lobby|creating|waiting|joining|countdown|racing|done`, but `creating`, `waiting`, and `joining` are never assigned anywhere in the file. The variable only transitions through `countdown → racing → done` and resets to `countdown` via `resetGame()`. The declared states are misleading.
- Files: `game.js` line 136
- Impact: Confusing for future maintainers who may write `if (phase === 'waiting')` guards that never fire.
- Fix approach: Update the comment to reflect the actual used values: `countdown|racing|done`.

**`prevX`/`prevY`/`prevAngle` fields on `remote` are stored but never read:**
- Issue: `remote.prevX`, `remote.prevY`, and `remote.prevAngle` are set every time a `pos` message arrives (lines 980–982) and initialized in `makeCar`/`resetGame`, but `remoteRenderPos()` performs pure dead-reckoning from the current position only — it never reads the previous values.
- Files: `game.js` lines 151, 980–982, 1017–1018, 512–519
- Impact: Dead code adding cognitive load and object bloat on every received network packet.
- Fix approach: Remove `prevX`, `prevY`, `prevAngle` from the `remote` object and its initialization/reset paths. If interpolation between last two samples is ever needed, reintroduce them with a `remoteRenderPos()` that actually uses them.

**`isOnTrack()` called redundantly three times per frame:**
- Issue: During the racing phase, `isOnTrack(car.x, car.y)` is called inside `updateCar()` (line 602), inside `updateAI()` (line 656), and again at the top level of the loop (line 875) to determine the off-track vignette. Each call iterates all 34 spine segments.
- Files: `game.js` lines 602, 656, 875
- Impact: Minor CPU waste at ~60 fps; not critical now but will worsen with more cars.
- Fix approach: Compute `onTrack` once per car per frame at the loop level and pass it in to `updateCar`/`updateAI` as a parameter.

**`drawTrack()` redraws the full static scene every frame:**
- Issue: `drawTrack()` rebuilds the entire track — including 5 passes of the 35-point spine polyline with different strokes — on every animation frame (lines 811, 870, 936).
- Files: `game.js` lines 365–421
- Impact: Track geometry is static; re-stroking it every frame at 60 fps is unnecessary CPU/GPU work. On low-end or older mobile hardware this is the primary rendering bottleneck.
- Fix approach: Pre-render the track once onto an offscreen `OffscreenCanvas` (or a secondary canvas) at startup. Then in the main loop, `ctx.drawImage(trackCanvas, 0, 0)` for a single blit per frame.

---

## Known Bugs

**Lap timer starts one lap late for the player:**
- Symptoms: On the very first crossing of CP0 after the race starts, `lapStartTime` is 0, so the timer branches to `lapStartTime = performance.now()` (line 584) without recording lap 1's time. Lap 1 is effectively unrecorded; lap timing begins on the second crossing.
- Files: `game.js` lines 568–585, 820
- Trigger: First CP0 crossing in any race.
- Workaround: The `lapStartTime` is set to `performance.now()` in the `countdown → racing` transition at line 820 AND again in `checkCheckpoints` at line 584. The code at 820 sets it before the lap completes, but the `if (lapStartTime > 0)` guard at line 568 is entered correctly on the first crossing — so lap 1 IS recorded. However the `lapNum` displayed is `car.lap + 1` computed BEFORE `car.lap++` on line 587, which can show "VUELTA 1 / 3" text after the line is already crossed for lap 2 in edge cases.

**AI `lapBonus` reads `remote.lap` rather than the car argument's lap:**
- Symptoms: The lap-scaling bonus in `updateAI()` at line 654 reads `remote.lap` directly even though the function receives `car` as a parameter. In solo mode `car` IS `remote`, so this is harmless today. If a second AI car were ever added, both AIs would read the same `remote.lap`, computing incorrect bonuses.
- Files: `game.js` line 654
- Trigger: Not currently triggerable in the shipped game.
- Workaround: Replace `remote.lap` with `car.lap` on line 654.

**Multiplayer finish validation is one-sided:**
- Symptoms: When the remote player finishes, the host receives a `finish` message and sets `winner = 'remote'` only if `remote.lap >= TOTAL_LAPS - 1` (line 994). But the guest validates nothing — any `finish` message from the host causes the guest to immediately declare the host the winner without a lap guard.
- Files: `game.js` lines 992–997
- Trigger: A host whose `finish` message is received by the guest when the host has not actually completed laps (e.g., due to a de-sync or a malicious peer).
- Workaround: Add a symmetric lap guard for the guest branch: `if (remote.lap < TOTAL_LAPS - 1) return;` before accepting a `finish` message.

**`btn-restart` calls `resetGame(); beginCountdown()` in solo mode, doubling the reset:**
- Symptoms: In solo mode the restart button handler calls `resetGame()` then `beginCountdown()` on line 1212. `beginCountdown()` itself calls `resetGame()` at line 1046. Two resets run back-to-back: the second one overwrites the first cleanly, so no visible bug occurs, but audio engine is started/stopped/started within the same synchronous call stack.
- Files: `game.js` lines 1045–1050, 1212
- Trigger: Clicking "Revancha" in solo mode.
- Workaround: Remove the explicit `resetGame()` call on line 1212 since `beginCountdown()` already handles it.

---

## Security Considerations

**`innerHTML` injection with unvalidated `r.name` and `r.team` from the RIVALS constant:**
- Risk: `buildRivalGrid()` at line 1155 interpolates `r.name` and `r.team` directly into `card.innerHTML`. The data comes from the hard-coded `RIVALS` array so there is no immediate injection vector, but if `RIVALS` is ever loaded from a remote source (e.g., a JSON endpoint), any field containing `<script>` or event handler attributes would execute.
- Files: `game.js` lines 1155–1163
- Current mitigation: Data is static and bundled in the source file.
- Recommendations: Replace `innerHTML` template with `createElement` + `textContent` assignments, or sanitize with `innerText` for the text nodes. This is the correct pattern regardless of data source.

**PeerJS room code generated with `Math.random()` (not cryptographically secure):**
- Risk: The 6-character room code generated by `chars()` uses `Math.floor(Math.random() * pool.length)`. `Math.random()` is not a CSPRNG; the output is theoretically predictable from the browser's internal state.
- Files: `game.js` lines 189–194
- Current mitigation: The pool has 32 characters × 6 positions = ~1 billion combinations. Guessing a live room requires real-time brute-force against PeerJS's signaling server. Practical risk is low for a casual game.
- Recommendations: Use `crypto.getRandomValues()` for the room code: `const arr = new Uint8Array(6); crypto.getRandomValues(arr); let s = ''; for (const b of arr) s += pool[b % pool.length];`

**PeerJS loaded from unpkg CDN without Subresource Integrity (SRI):**
- Risk: `index.html` line 8 loads PeerJS from `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` with no `integrity` attribute. A compromised CDN or MITM attacker could serve modified JavaScript that intercepts all peer connections.
- Files: `index.html` line 8
- Current mitigation: Version-pinned (`@1.5.4`) which prevents automatic upgrades to a malicious newer version.
- Recommendations: Add `integrity="sha384-..."` and `crossorigin="anonymous"` to the `<script>` tag. Generate the hash via `openssl dgst -sha384 -binary peerjs.min.js | openssl base64 -A`.

**Incoming network data applied without angle validation:**
- Risk: The `pos` message handler validates `x`, `y`, and `speed` ranges (lines 974–978) but does not validate `angle`. A malicious peer can send `angle: NaN` or `angle: Infinity`, which would propagate into `Math.cos(remote.angle)` and poison the remote car's rendered position.
- Files: `game.js` lines 972–990
- Current mitigation: Only the remote car's visual position is affected; the local player's physics are unaffected.
- Recommendations: Add `if (!isFinite(angle)) return;` guard — this line is already present at line 976 but is checking `angle` only for `isFinite`, which does reject `NaN` and `Infinity`. On re-review the angle IS validated. However there is no range clamp; an angle of `1e308` would pass. Add `angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)` normalization after acceptance.

---

## Performance Bottlenecks

**Track redrawn fully every frame (5 polyline passes, 35-point path each):**
- Problem: `drawTrack()` executes 5 separate `drawSpinePath()` + `stroke()` sequences per frame at lines 376, 378, 385, 392, and two `beginPath`/`stroke` for the finish line. The spine has 35 points projected through `project()` each time.
- Files: `game.js` lines 365–421
- Cause: No offscreen caching of static geometry.
- Improvement path: Pre-render to an `OffscreenCanvas` once at startup; blit with `ctx.drawImage` each frame.

**`isOnTrack()` is O(N) per car per query with N=34 segments:**
- Problem: Three `isOnTrack()` calls per frame means 3 × 34 = 102 segment distance checks at 60 fps.
- Files: `game.js` lines 531–538
- Cause: Brute-force linear scan of all spine segments.
- Improvement path: For the current 34-segment track, 102 distance checks at 60 fps is negligible. If track complexity grows, replace with spatial partitioning (grid cells or segment bounding-box early rejection).

**`startBrakeSound()` creates a 1-second `AudioBuffer` of white noise on every invocation:**
- Problem: `startBrakeSound()` at line 278 calls `ac.createBuffer(1, ac.sampleRate, ac.sampleRate)` and fills it with `Math.random()` every time braking starts. At 44100 samples this allocates a new Float32Array each time the player presses the brake.
- Files: `game.js` lines 275–286
- Cause: No pre-allocation or reuse of the noise buffer.
- Improvement path: Create the noise buffer once (at `startEngine()` time or module init) and store it in a module-level variable. Reuse for all subsequent `startBrakeSound()` calls.

---

## Fragile Areas

**`Net` IIFE has a single shared `conn` slot:**
- Files: `game.js` lines 184–231
- Why fragile: If `Net.create()` is called while a previous peer connection exists (e.g., user clicks "Crear Sala" twice without cancelling), the old `conn` is leaked and unreachable. `Net.destroy()` only cleans up if called explicitly.
- Safe modification: Always call `Net.destroy()` before `Net.create()` or `Net.join()`. Guard `create()` and `join()` with a `if (peer) destroy()` at the top.
- Test coverage: None — no automated tests exist.

**`goTo()` only calls `stopLoop()` but does not clean up audio or network state:**
- Files: `game.js` lines 1083–1087
- Why fragile: Navigating to a screen other than `game` via `goTo()` stops the render loop but leaves the engine oscillators running, the result poll active, and the PeerJS connection open. Cleanup is done piecemeal at each call site (e.g., `btn-menu` handler calls `stopEngine()`, `stopBrakeSound()`, `Net.destroy()` separately). If a new navigation path is added without knowing this convention, audio or connections can leak.
- Safe modification: Move all cleanup into `goTo()` or a dedicated `teardownGame()` helper called by `goTo()` when leaving `screen-game`.
- Test coverage: None.

**`resultPollId` interval starts at module load time (`startResultPoll()` at line 1280):**
- Files: `game.js` line 1280
- Why fragile: `pollResults()` fires every 300 ms from the moment the page loads. On initial load `phase` is `'lobby'` and `winner` is `null`, so the poll does nothing, but any future code that sets `phase = 'done'` before `startResultPoll()` is called explicitly (e.g., during a refactor) would skip straight to the results screen unexpectedly.
- Safe modification: Remove the unconditional `startResultPoll()` at line 1280 and only call it from `beginCountdown()` — which already calls it.

**Disconnection handler uses `alert()`, blocking the main thread:**
- Files: `game.js` line 1008
- Why fragile: `onDisconnect()` calls `alert()`, which freezes JS execution until the user dismisses it. During a live race this interrupts the RAF loop in an uncontrolled way. On iOS Safari the alert can be suppressed entirely, leaving the game in a frozen `racing` phase with no escape.
- Safe modification: Replace `alert()` with an in-game notification — e.g., show a modal overlay or `addFloatingText()`, then call `goTo('lobby')` after a short `setTimeout`.

---

## Scaling Limits

**Canvas fixed at 480×640 px with no responsive scaling:**
- Current capacity: The canvas is declared at a fixed `width="480" height="640"` in `index.html` line 69. All world coordinates, track spine points, HUD positions, and isometric projection constants are hard-coded for this size.
- Limit: On screens narrower than 480 CSS px the game overflows or is scaled down by CSS but the internal resolution stays 480×640, reducing visual clarity on retina displays.
- Scaling path: Set canvas CSS dimensions via CSS `max-width: 100%` and use `canvas.width = devicePixelRatio * displayWidth` with a corresponding `ctx.scale(devicePixelRatio, ...)` transform.

**Single room code namespace shared globally via PeerJS default signaling:**
- Current capacity: PeerJS uses its own public signaling server (`0.peerjs.com`). All room codes generated by `chars()` occupy the global PeerJS peer namespace.
- Limit: With 32^6 ~= 1.07 billion combinations and 6-char codes, collision probability is low, but the public server has rate limits and can be down.
- Scaling path: Self-host a PeerJS server and configure it via the `Peer` constructor options.

---

## Dependencies at Risk

**PeerJS 1.5.4 loaded from unpkg with no fallback:**
- Risk: `unpkg.com` is a CDN with no SLA guarantee. If unpkg is unreachable, the entire multiplayer mode fails to initialize and the `Peer` global is undefined, causing a JS error on page load that breaks all button wiring.
- Impact: The game may be entirely unplayable if the CDN is down, even for solo mode, because `game.js` executes after the `<script>` tag and assumes `Peer` is defined globally.
- Migration plan: Bundle `peerjs.min.js` locally (copy to repo), or add a CDN fallback: `<script>window.Peer || document.write('<script src="/vendor/peerjs.min.js"><\/script>')</script>`.

---

## Missing Critical Features

**No keep-alive or reconnect logic in multiplayer:**
- Problem: PeerJS WebRTC connections silently drop in poor network conditions. The only recovery mechanism is `onDisconnect()` (line 1006), which terminates the session immediately with an `alert`. There is no reconnection attempt.
- Blocks: Stable multiplayer on mobile networks with variable connectivity.

**No input validation on join code beyond length check:**
- Problem: The join flow only checks `code.length < 6` (line 1119). No character validation is performed. A user can enter `!!!!!!` and the code is sent to PeerJS as-is, resulting in a confusing error from the signaling layer rather than a friendly client-side message.
- Blocks: Good UX on the join screen.

**AI only has one fixed track (oval waypoints):**
- Problem: `AI_WAYPOINTS` is a hard-coded 18-point oval path. If the track spine (`ROAD_SPINE`) changes shape, the AI waypoints must be updated manually or the AI will drive off-road.
- Blocks: Adding alternative tracks.

---

## Test Coverage Gaps

**No automated tests of any kind:**
- What's not tested: Physics integration, checkpoint detection, lap counting, collision resolution, damage accumulation, AI waypoint navigation, network message validation, `resetGame()` correctness, `goTo()` screen transitions, localStorage read/write.
- Files: `game.js` (all functions), `index.html`
- Risk: Any change to `checkCheckpoints()`, `updateCar()`, or `resolveCarCollision()` can silently break race outcomes. The only regression detection is manual play.
- Priority: High — the `.claude/agents/tester-jugabilidad.md` agent covers Playwright visual smoke tests but no unit-level coverage exists.

**No error boundary around PeerJS initialization:**
- What's not tested: Behavior when `Peer` global is undefined (CDN failure). The `Net.create()` and `Net.join()` functions will throw synchronously if `Peer` is not defined, crashing the button handler with no user-visible error.
- Files: `game.js` lines 207, 215
- Risk: Multiplayer buttons appear active but throw on click when CDN is unavailable.
- Priority: Medium.

---

*Concerns audit: 2026-06-26*
