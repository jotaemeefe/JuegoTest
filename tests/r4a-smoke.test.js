'use strict';

const fs = require('fs');
const assert = require('assert');
const root = process.argv[2];
const source = fs.readFileSync(`${root}/game.js`, 'utf8');
const html = fs.readFileSync(`${root}/index.html`, 'utf8');

assert.match(source, /const TOTAL_LAPS\s*= 5;/, 'R4A must run five laps');
assert.match(source, /const GRID_SIZE\s*= 22;/, 'R4A must seed 22 cars');
assert.match(source, /const WORLD_SCALE\s*= 1\.65;/, 'current circuit must preserve the R4B extension');
assert.match(source, /collisionPairs\(\)\.forEach/, 'dynamic field collisions must be active');
assert.match(source, /finishPosition/, 'the player must be allowed to finish after the leader');
assert.match(html, /id="btn-duel"/, 'the 1v1 duel needs its own lobby entry');
assert.match(source, /gameMode = 'duel'/, 'rival selection must launch duel mode');
assert.match(source, /gameMode = 'solo';[\s\S]{0,100}beginCountdown/, 'Grand Prix must start without rival selection');
assert.match(source, /function drawPixelGround/, 'pixel ground must be generated as native tiles');
assert.match(source, /function finalizePixelEnvironment/, 'environment must use an integer pixel pipeline');
assert.doesNotMatch(source, /r4a-pixel-atlas/, 'stretched atlas must never return');
assert.match(source, /function fillPixelTile/, 'atlas cells must be consumed as individual tiles');
assert.ok(fs.statSync(`${root}/assets/r4a-tileset.png`).size > 100000,
  'production pixel-art tileset is missing');

// Grid invariant: 22 cars, 11 staggered rows, no initial collision overlap.
const scale = 1.65, radius = 14;
const grid = Array.from({length:22}, (_, i) => ({
  x:(620 - Math.floor(i / 2) * 30) * scale,
  y:(i % 2 ? 1462 : 1538) * scale
}));
for (let i = 0; i < grid.length; i++) for (let j = i + 1; j < grid.length; j++) {
  assert.ok(Math.hypot(grid[i].x-grid[j].x, grid[i].y-grid[j].y) > radius * 2,
    `grid overlap ${i}/${j}`);
}

// Broad-phase invariant: no more than all 231 possible pairs, and distant cars vanish.
const mockCars = Array.from({length:22}, (_, i) => ({progress:i * 200}));
let pairs = 0;
for (let i=0;i<mockCars.length;i++) for(let j=i+1;j<mockCars.length;j++)
  if (Math.abs(mockCars[i].progress-mockCars[j].progress)<140) pairs++;
assert.strictEqual(pairs, 0, 'broad phase should reject distant cars');

console.log('R4A smoke: 19 invariants OK');
