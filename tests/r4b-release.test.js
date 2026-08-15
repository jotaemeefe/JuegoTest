'use strict';

const fs = require('fs');
const assert = require('assert');
const root = process.argv[2];
const js = fs.readFileSync(`${root}/game.js`, 'utf8');
const html = fs.readFileSync(`${root}/index.html`, 'utf8');

assert.doesNotMatch(js, /NITRO_MAX|NITRO_DRAIN|earnNitro|spendNitro|car\.nitro/,
  'rechargeable nitro economy must be removed');
assert.match(js, /const DRS_GAP_SECONDS = 1\.0;/, 'DRS detection must use one second');
assert.match(js, /const DRS_DURATION_MS = 3000;/, 'DRS activation must be finite');
assert.match(js, /function isInDrsZone/, 'DRS must be restricted to a track zone');
assert.match(js, /car\.drsAvailable = false;/, 'DRS must be consumed on activation');
assert.match(html, /id="btn-drs"[^>]*>DRS<\/button>/, 'touch control must be labelled DRS');
assert.match(js, /const \[FINISH_X, FINISH_Y\] = worldPoint\(\[700, 1500\]\)/,
  'finish line must sit on the extended straight');
assert.match(js, /\[650,\s+1500\].*grid launch target/, 'AI launch target must be ahead');
assert.match(js, /function drawPixelSprite/, 'semantic props must be placed uniquely');
assert.match(js, /crowdSheet\.src = 'assets\/r4b-crowd\.png'/, 'crowd art must load');
assert.ok(fs.statSync(`${root}/assets/r4b-crowd.png`).size > 100000, 'crowd sprite missing');
assert.match(js, /challengeScore/, 'race mastery score must exist');
assert.match(js, /SECTOR PERFECTO/, 'perfect sector feedback must exist');

console.log('R4B release: 13 invariants OK');
