# Testing Patterns

**Analysis Date:** 2026-06-26

## Test Framework

**Runner:**
- None installed — no package.json, no npm, no bundler
- No `jest.config.*`, `vitest.config.*`, or similar files present
- No `*.test.*` or `*.spec.*` files in the repository

**Assertion Library:**
- None

**Run Commands:**
```bash
# No automated test commands exist.
# The server must be running first:
npx http-server . -p 8081

# Then invoke the tester agent for visual/interaction tests:
# /agent:tester-jugabilidad
```

## Test Approach

**This project uses manual Playwright-based visual testing** via the `tester-jugabilidad` agent (`.claude/agents/tester-jugabilidad.md`). There are no unit tests, integration tests, or automated test suites. Testing is performed on-demand after significant changes.

## Test File Organization

**Location:**
- No test files in the repository
- Test scripts are written ad-hoc as inline Playwright Node.js scripts (not committed)
- Screenshots are written to `/tmp/` during test sessions (not committed)

**Tester agent definition:**
- `.claude/agents/tester-jugabilidad.md` — defines the Playwright testing protocol

## Test Structure (Playwright Protocol)

The `tester-jugabilidad` agent defines a 7-step test protocol:

**Setup:**
```js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 480, height: 700 });
  await page.goto('http://localhost:8081/index.html');
  // ... tests here
  await browser.close();
})();
```

**Test 1 — Lobby screen:**
- Screenshot lobby, verify 3 buttons visible (VS CPU, CREAR SALA, UNIRSE)

**Test 2 — VS CPU rival selection:**
```js
await page.click('#btn-solo');
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/test-rival.png' });
```

**Test 3 — Countdown screen:**
```js
await page.click('.rival-card');
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/test-countdown.png' });
```

**Test 4 — Gameplay (simulated keyboard inputs):**
```js
await page.waitForTimeout(3800); // wait for countdown
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(300);
await page.keyboard.up('ArrowLeft');
await page.screenshot({ path: '/tmp/test-racing1.png' });
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(500);
await page.keyboard.up('ArrowRight');
await page.screenshot({ path: '/tmp/test-racing2.png' });
```

**Test 5 — Visual verification of car positions:**
- Are cars visible on circuit?
- Did player car respond to input (changed direction)?
- Is AI car moving along the track?

**Test 6 — HUD readability:**
```js
const hudLap   = await page.$eval('#hud-lap',   el => el.textContent);
const hudPos   = await page.$eval('#hud-pos',   el => el.textContent);
const hudTimer = await page.$eval('#hud-timer', el => el.textContent);
```

**Test 7 — Physics constants (runtime values):**
```js
const constants = await page.evaluate(() => ({
  maxSpd:     MAX_SPD_ON,
  autoAccel:  AUTO_ACCEL,
  frictionK:  FRICTION_K,
  turnRate:   TURN_RATE,
  brakeForce: BRAKE_FORCE,
  roadHalfW:  ROAD_HALF_W,
  carRadius:  CAR_RADIUS,
}));
```

## Mocking

**Framework:** None — no mocking library exists.

**Manual patterns:**
- PeerJS (`Peer` global) is loaded from CDN; in Playwright tests it is exercised live (real WebRTC handshake not performed in solo-mode tests)
- Audio API (`AudioContext`) is exercised through real browser in Playwright; no mock needed since headless Chromium supports Web Audio API
- `localStorage` is the real browser API, not mocked; Playwright test sessions start with clean state

**What is effectively mocked:**
- Keyboard/touch inputs are simulated via `page.keyboard.down()` and `page.keyboard.up()`, which trigger the real `keydown`/`keyup` listeners in `game.js`

**What is NOT mocked:**
- Game physics — `local.speed`, `local.x/y` are real runtime values read via `page.evaluate()`
- Network — multiplayer tests would require two browser instances; not covered

## Runtime Inspection Pattern

Since there are no unit tests, game state inspection happens at runtime via Playwright's `page.evaluate()`:

```js
// Read live game state
const speed = await page.evaluate(() => local.speed);
const phase = await page.evaluate(() => phase);
const damage = await page.evaluate(() => localDamage);

// Compute derived metrics
const equilibriumRadius = await page.evaluate(() =>
  local.speed / (TURN_RATE * 0.75)
);
```

All constants and mutable state variables are globally accessible (no module system), making this straightforward.

## Fixtures and Factories

**Test Data:**
- No fixtures or factories — all game data (`RIVALS`, `AI_WAYPOINTS`, `ROAD_SPINE`) is defined as top-level constants in `game.js` and used as-is
- `makeCar(idx)` at `game.js:144` is the closest equivalent to a factory — used in `resetGame()` to create fresh car state

**Location:**
- No separate fixture files

## Coverage

**Requirements:** None enforced — no coverage tooling installed.

**What is implicitly covered by the Playwright protocol:**
- Screen navigation flow: lobby → rival → countdown → racing → results
- Player input: keyboard left/right/brake
- HUD state: lap counter, timer, position indicator
- Physics constants visible at runtime
- Visual rendering: canvas output captured in screenshots

**What is NOT covered:**
- Multiplayer flow (requires two simultaneous browser sessions)
- Network message validation (`onMsg()` input sanitization at `game.js:973–979`)
- Collision detection edge cases
- Lap timing edge cases (finish on exact CP crossing)
- Audio synthesis (Web Audio nodes)
- localStorage persistence across sessions
- Off-track damage accumulation

## Test Types

**Unit Tests:**
- Not used. No test runner installed.

**Integration Tests:**
- Not used in automated form. The Playwright session acts as an ad-hoc integration test of the full game flow.

**E2E Tests:**
- Playwright via `tester-jugabilidad` agent — manual invocation only. Tests the full VS CPU flow from lobby to racing. Multiplayer E2E not covered.

## Common Patterns

**Waiting for game state transitions:**
```js
// Wait for countdown to expire before testing racing phase
await page.waitForTimeout(3800); // 3 seconds countdown + buffer
```

**Asserting visual output:**
```js
// Screenshots are the primary assertion mechanism
await page.screenshot({ path: '/tmp/test-racing1.png' });
// Tester agent evaluates screenshots visually
```

**Reading physics metrics:**
```js
// Read equilibrium speed after 2 seconds of racing
await page.waitForTimeout(2000);
const speed = await page.evaluate(() => local.speed);
// Expected: 130–160 px/s for comfortable cornering
```

**Computed assertions from agent protocol:**
- Minimum turn radius = `local.speed / (TURN_RATE * 0.75)` — must be less than `ROAD_HALF_W` (60)
- Maneuvering margin = `(ROAD_HALF_W * 2) - (CAR_RADIUS * 2 * 2)` — must be > 10px

## Adding New Tests

When the tester agent is invoked after changes to `game.js`:

1. Start the HTTP server: `npx http-server . -p 8081`
2. Write an ad-hoc Playwright script following the setup template above
3. Use `page.evaluate()` to read affected game state variables or constants directly
4. Use `page.screenshot()` to capture visual output before/after the change
5. Report using the tester agent's structured format (metrics + screenshots + verdict)

There is no test file to update — tests are ephemeral scripts.

---

*Testing analysis: 2026-06-26*
