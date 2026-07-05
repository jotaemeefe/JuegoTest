'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_LAPS    = 3;
const MAX_SPD_ON    = 450;   // px/s on track — reduced for controllable cornering
const MAX_SPD_OFF   = 175;   // px/s off track
const AUTO_ACCEL    = 400;   // px/s² constant push — slower acceleration, more reaction time
const FRICTION_K    = 1.1;   // speed lost per second (proportional, unchanged — D-15)
const BRAKE_FORCE   = 900;   // px/s² when braking
const TURN_RATE     = 4.5;   // rad/s — increased for responsive steering
const NET_MS        = 50;    // position broadcast interval
const CAR_RADIUS    = 18;    // px, for car-car collision detection (D-13)

// DRS (Phase 3 — DRS-01): tactical speed boost when close behind the car ahead
const DRS_RANGE     = 60;    // px proximity to the car ahead that unlocks DRS
const DRS_DURATION  = 3000;  // ms the boost lasts once activated
const DRS_BOOST     = 1.28;  // top-speed multiplier while DRS is active

// Circuit — clockwise, 57-point non-crossing polyline, world-space 1600×2000
// Designed for clean 2D top-down: northbound leg (Beau Rivage) at x≈1095-1200,
// southbound leg (Swimming Pool) at x≈1418-1448 — 220+px separation guaranteed.
// Main straight going EAST at y=1500; return going WEST at y≈1748.
const ROAD_HALF_W = 80;
const ROAD_SPINE = [
  // ── META / Main Straight (going EAST, y=1500) ────────────────────────────
  [200, 1500], [430, 1500], [660, 1500], [900, 1500], [1080, 1500],
  // ── Sainte-Dévote (right turn going northeast) ───────────────────────────
  [1140, 1472], [1180, 1428], [1200, 1370],
  // ── Beau Rivage / Massenet (climbing NORTH, x≈1095-1200) ─────────────────
  [1185, 1280], [1150, 1190], [1095, 1115],
  // ── Casino / Mirabeau plateau (curving NW) ────────────────────────────────
  [1030, 1050], [950, 1005], [865, 975],
  // ── Mirabeau descent (heading WSW) ───────────────────────────────────────
  [790, 940], [715, 900], [650, 860],
  // ── Grand Hotel Hairpin approach (heading WSW) ────────────────────────────
  [590, 835], [535, 815],
  // ── Loews U-turn (WSW → ENE, spine radius ≈100px) ────────────────────────
  [485, 795], [455, 752], [447, 705],
  [458, 658], [488, 620], [528, 602],
  [575, 598], [622, 612], [660, 642],
  // ── Portier (going EAST) ─────────────────────────────────────────────────
  [700, 672], [758, 688], [830, 692],
  // ── Tunnel (going EAST at y≈680-692) ─────────────────────────────────────
  [920, 690], [1050, 686], [1190, 682], [1330, 680],
  // ── Curve south into chicane ──────────────────────────────────────────────
  [1405, 700], [1440, 748], [1440, 808],
  // ── Nouvelle Chicane (left-right jink) ────────────────────────────────────
  [1428, 868], [1448, 928], [1428, 975],
  // ── Swimming Pool (going SOUTH at x≈1418-1448) ────────────────────────────
  // Separation from Beau Rivage (x≈1095-1200): 220+px ✓ — no visual crossing
  [1418, 1065], [1428, 1205], [1438, 1365],
  // ── La Rascasse / Antony Noghès (sweeping WSW) ───────────────────────────
  [1428, 1488], [1388, 1572], [1298, 1638],
  [1198, 1678], [1098, 1712],
  // ── Return straight (going WEST at y≈1748, 248px south of main straight) ─
  [948, 1744], [748, 1748], [548, 1750], [348, 1750],
  // ── NW curve back to META ─────────────────────────────────────────────────
  [278, 1728], [222, 1678], [204, 1618],
  // ── Close loop ───────────────────────────────────────────────────────────
  [200, 1500],
];

// Checkpoints {x,y,r} — anti-shortcut gates hit in order (R3B-01).
// CP0 is the META marker only: the finish itself is a segment-crossing test
// (crossedFinish), never a radius — the old r=200 fired the lap 200px early.
// Gate radii are 100 (ROAD_HALF_W+20): they trigger only on their own passage.
const CPS = [
  { x: 500,  y: 1500, r: 0   },  // 0  META — handled by crossedFinish(), r unused
  { x: 950,  y: 1005, r: 100 },  // 1  Casino / Mirabeau plateau
  { x: 575,  y: 598,  r: 100 },  // 2  Loews apex EXIT (was [528,602] r=220 — fired on the approach)
  { x: 1190, y: 682,  r: 100 },  // 3  Tunnel mid
];

// ── Continuous track progress constants (R3B-02) ──────────────────────────────
// Prefix-sum of ROAD_SPINE segment lengths — arc-length lookup for trackProgress().
const SPINE_CUMLEN = (() => {
  const cum = [0];
  for (let i = 1; i < ROAD_SPINE.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(ROAD_SPINE[i][0] - ROAD_SPINE[i - 1][0],
                                     ROAD_SPINE[i][1] - ROAD_SPINE[i - 1][1]));
  }
  return cum;
})();
const SPINE_TOTAL_LEN = SPINE_CUMLEN[SPINE_CUMLEN.length - 1];
const FINISH_X = 500;  // META stripe x on the main straight (y=1500) — matches drawTrack()
// Arc position of the stripe along the spine (nearestSpinePoint is hoisted)
const FINISH_ARC = (() => {
  const n = nearestSpinePoint(FINISH_X, 1500);
  return SPINE_CUMLEN[n.segIdx] + n.t * (SPINE_CUMLEN[n.segIdx + 1] - SPINE_CUMLEN[n.segIdx]);
})();

// Starting grid [P1, P2, P3, P4] — main straight y=1500, 2×2 staggered, pointing east (a:0)
// All positions WEST of x=500 (META stripe) — cars start before finish line
const START = [
  { x: 420, y: 1506, a: 0 },  // P1 — player  (right col, front)
  { x: 360, y: 1494, a: 0 },  // P2 — AI car1  (left col, front)
  { x: 300, y: 1506, a: 0 },  // P3 — AI car2  (right col, rear)
  { x: 240, y: 1494, a: 0 },  // P4 — AI car3  (left col, rear)
];

// Visual style for Colapinto — Alpine BWT
// Visual style for Colapinto — Alpine BWT (the player's car)
const CAR_STYLE_HOST = { body: '#0090d0', stripe: '#f569b7', cockpit: '#001f3f', helmet: '#74c0fc', num: '43' };

// 2026 F1 grid — 21 rivals (Colapinto is the player, not listed here)
// Colors verified at formula1.com on 2026-06-26 (Cadillac/Audi colors from best available knowledge — [ASSUMED]).
// Note: index positions changed from v1 — cr_rival_* keys from old grid are orphaned (D-05, accepted).
// localStorage keys: cr_rival_<0-20>. Removed: Colapinto (player), Tsunoda (not in 2026 grid per D-02).
// skill = AI speed factor (1.0 = same max speed as player) — sorted easiest → hardest
const RIVALS = [
  // ── MEDIO ────────────────────────────────────────────────────────────────────
  { name:'Oliver Bearman',    team:'Haas F1 Team',      num:'87', body:'#1c1c1c', accent:'#cc0000', helmet:'#cc0000', skill:0.79 },
  { name:'Gabriel Bortoleto', team:'Audi',              num:'5',  body:'#141414', accent:'#9e9e9e', helmet:'#065f46', skill:0.80 },
  { name:'Arvid Lindblad',    team:'Racing Bulls',      num:'6',  body:'#0f172a', accent:'#ef4444', helmet:'#0d3b96', skill:0.80 },
  { name:'Lance Stroll',      team:'Aston Martin',      num:'18', body:'#005540', accent:'#c0a030', helmet:'#1d4ed8', skill:0.81 },
  { name:'Isack Hadjar',      team:'Red Bull Racing',   num:'22', body:'#1d2f6a', accent:'#ffd700', helmet:'#1d4ed8', skill:0.82 },
  { name:'Valtteri Bottas',   team:'Cadillac',          num:'77', body:'#0d0d0d', accent:'#dc2626', helmet:'#1a1a1a', skill:0.82 },
  { name:'Sergio Pérez',      team:'Cadillac',          num:'11', body:'#0d0d0d', accent:'#dc2626', helmet:'#228b22', skill:0.83 },
  { name:'Alexander Albon',   team:'Williams Racing',   num:'23', body:'#003087', accent:'#e8f4ff', helmet:'#cc0000', skill:0.83 },
  // ── DURO ─────────────────────────────────────────────────────────────────────
  { name:'Esteban Ocon',      team:'Haas F1 Team',      num:'31', body:'#1c1c1c', accent:'#cc0000', helmet:'#1d4ed8', skill:0.84 },
  { name:'Nico Hülkenberg',   team:'Audi',              num:'27', body:'#141414', accent:'#9e9e9e', helmet:'#9e9e9e', skill:0.84 },
  { name:'Liam Lawson',       team:'Racing Bulls',      num:'30', body:'#0f172a', accent:'#ef4444', helmet:'#1a1a1a', skill:0.86 },
  { name:'Kimi Antonelli',    team:'Mercedes-AMG',      num:'12', body:'#1e293b', accent:'#00d2be', helmet:'#cc0000', skill:0.87 },
  { name:'Pierre Gasly',      team:'BWT Alpine',        num:'10', body:'#0090d0', accent:'#f569b7', helmet:'#1565c0', skill:0.87 },
  // ── EXPERTO ──────────────────────────────────────────────────────────────────
  { name:'Carlos Sainz',      team:'Williams Racing',   num:'55', body:'#003087', accent:'#e8f4ff', helmet:'#ffd700', skill:0.88 },
  { name:'George Russell',    team:'Mercedes-AMG',      num:'63', body:'#1e293b', accent:'#00d2be', helmet:'#ffd700', skill:0.90 },
  { name:'Fernando Alonso',   team:'Aston Martin',      num:'14', body:'#005540', accent:'#c0a030', helmet:'#1a1a1a', skill:0.91 },
  // ── ÉLITE ────────────────────────────────────────────────────────────────────
  { name:'Oscar Piastri',     team:'McLaren F1 Team',   num:'81', body:'#ff6b00', accent:'#ffd700', helmet:'#ffd700', skill:0.92 },
  { name:'Charles Leclerc',   team:'Scuderia Ferrari',  num:'16', body:'#cc0000', accent:'#f8fafc', helmet:'#cc0000', skill:0.92 },
  { name:'Lando Norris',      team:'McLaren F1 Team',   num:'4',  body:'#ff6b00', accent:'#1a1a1a', helmet:'#ff6b00', skill:0.93 },
  { name:'Lewis Hamilton',    team:'Scuderia Ferrari',  num:'44', body:'#cc0000', accent:'#f8fafc', helmet:'#1a1a1a', skill:0.94 },
  { name:'Max Verstappen',    team:'Red Bull Racing',   num:'1',  body:'#1d2f6a', accent:'#ffd700', helmet:'#cc1100', skill:0.96 },
];

// ── AI Personalities (CARS-02) ────────────────────────────────────────────────
// Three personality archetypes that modulate AI speed, line, noise, braking and damage.
// Values are [ASSUMED] — require playtesting (Assumption A4).
const PERSONALITIES = {
  aggressive: {
    style:     'aggressive',
    speedMult: 1.05,   // 5% faster than skill-based speed
    lineMult:  0.7,    // tighter line (closer to apex)
    noiseAmp:  0.025,  // low noise — precise but risky
    brakeMult: 0.8,    // brakes less than normal
    damageMult:1.5,    // deals more damage on collision
  },
  defensive: {
    style:     'defensive',
    speedMult: 0.92,   // slightly slower
    lineMult:  1.3,    // wider line through corners
    noiseAmp:  0.04,   // moderate variation
    brakeMult: 1.2,    // brakes earlier/harder
    damageMult:0.8,    // absorbs collision better
  },
  consistent: {
    style:     'consistent',
    speedMult: 1.0,    // at-skill speed
    lineMult:  1.0,    // standard line
    noiseAmp:  0.02,   // very low noise
    brakeMult: 1.0,    // standard braking
    damageMult:1.0,    // standard damage
  },
};

// All 6 collision pairs among 4 cars (CARS-03)
const PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

function rivalDiff(skill) {
  if (skill >= 0.92) return { label: 'ÉLITE',    color: '#ef4444' };
  if (skill >= 0.88) return { label: 'EXPERTO',  color: '#f97316' };
  if (skill >= 0.84) return { label: 'DURO',     color: '#fbbf24' };
  return                     { label: 'MEDIO',    color: '#22c55e' };
}

// AI-03: give the single rival a personality drawn from its skill tier so that
// stronger rivals attack (tighter line, higher speed) and weaker ones defend (wider, slower).
function personalityFor(skill) {
  if (skill >= 0.90) return PERSONALITIES.aggressive;
  if (skill <= 0.82) return PERSONALITIES.defensive;
  return PERSONALITIES.consistent;
}

// AI navigation waypoints — 55 points CW, matching new non-crossing circuit
// Dense section: Loews hairpin (WP 18-26) for tight corner precision
// Loop: car.wpIdx = (car.wpIdx + 1) % AI_WAYPOINTS.length
const AI_WAYPOINTS = [
  [400,  1500],  //  0  META start
  [660,  1500],  //  1  main straight mid
  [900,  1500],  //  2  main straight east
  [1050, 1500],  //  3  main straight end
  [1140, 1472],  //  4  Sainte-Dévote entry
  [1180, 1428],  //  5  Sainte-Dévote mid
  [1196, 1378],  //  6  Sainte-Dévote apex
  [1183, 1280],  //  7  Beau Rivage lower
  [1148, 1192],  //  8  Beau Rivage upper
  [1090, 1118],  //  9  Beau Rivage exit
  [1028, 1052],  // 10  Casino entry
  [948,  1008],  // 11  Casino mid  ← CP1
  [862,   978],  // 12  Casino exit
  [788,   942],  // 13  Mirabeau entry
  [714,   902],  // 14  Mirabeau mid
  [648,   862],  // 15  Mirabeau exit
  [588,   836],  // 16  hairpin approach upper
  [532,   818],  // 17  hairpin approach lower
  [482,   798],  // 18  Loews entry     ← dense section start
  [452,   755],  // 19  Loews entry arc
  [446,   706],  // 20  Loews apex N
  [458,   660],  // 21  Loews apex S
  [488,   622],  // 22  Loews exit arc
  [528,   603],  // 23  Loews exit  ← CP2
  [574,   599],  // 24  Loews exit apex
  [622,   613],  // 25  Loews exit east
  [660,   644],  // 26  Loews exit end  ← dense section end
  [700,   674],  // 27  Portier entry
  [758,   690],  // 28  Portier mid
  [828,   693],  // 29  Portier exit
  [920,   691],  // 30  tunnel entry
  [1048,  688],  // 31  tunnel mid
  [1188,  684],  // 32  tunnel exit  ← CP3
  [1328,  682],  // 33  tunnel east
  [1402,  702],  // 34  curve south
  [1438,  750],  // 35  curve mid
  [1438,  810],  // 36  chicane entry
  [1426,  870],  // 37  Nouvelle Chicane left
  [1446,  930],  // 38  Nouvelle Chicane apex
  [1426,  978],  // 39  Chicane exit
  [1416, 1068],  // 40  Swimming Pool entry
  [1426, 1208],  // 41  Swimming Pool mid
  [1436, 1368],  // 42  Swimming Pool exit
  [1426, 1490],  // 43  La Rascasse entry
  [1386, 1574],  // 44  La Rascasse mid
  [1296, 1640],  // 45  La Rascasse exit
  [1196, 1680],  // 46  Antony Noghès entry
  [1096, 1714],  // 47  Antony Noghès mid
  [946,  1746],  // 48  return entry
  [748,  1748],  // 49  return mid-east
  [548,  1750],  // 50  return mid-west
  [348,  1750],  // 51  return west
  [276,  1728],  // 52  NW curve upper
  [220,  1678],  // 53  NW curve mid
  [202,  1618],  // 54  NW curve lower
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

// ── HiDPI / Retina canvas scaling (static init — no resize listener) ──────────
(function initCanvasDPR() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = 480 * dpr;
  canvas.height = 640 * dpr;
  ctx.scale(dpr, dpr);
})();

const SCR = {
  lobby:   document.getElementById('screen-lobby'),
  create:  document.getElementById('screen-create'),
  join:    document.getElementById('screen-join'),
  rival:   document.getElementById('screen-rival'),
  game:    document.getElementById('screen-game'),
  results: document.getElementById('screen-results'),
};

const hudLap    = document.getElementById('hud-lap');
const hudTimer  = document.getElementById('hud-timer');
const hudPos    = document.getElementById('hud-pos');
const hudRole   = document.getElementById('hud-role');
const lobbyRec  = document.getElementById('lobby-record');
const resultLap = document.getElementById('result-lap');
const canvasWrap = document.querySelector('.game-canvas-wrapper');

// ── Mutable state ─────────────────────────────────────────────────────────────
let phase          = 'lobby';   // lobby|creating|waiting|joining|countdown|racing|done
let gameMode       = 'multi';   // 'multi' | 'solo'
let isHost         = false;
let selectedRival    = RIVALS[0]; // rival chosen on rival-select screen
let selectedRivalIdx = 0;         // index in RIVALS — stable key for localStorage

const keys = { left: false, right: false, down: false };

function makeCar(idx) {
  const s = START[idx];
  return {
    x: s.x, y: s.y, angle: s.a, speed: 0,
    lap: 0, nextCP: 1, finished: false,
    isPlayer: false,   // true only for cars[0]
    damage: 0,         // 0–100 accumulated damage (per-car)
    wpIdx: 0,          // AI waypoint index (per-car, independent navigation)
    rivalData: null,   // RIVALS entry for style/skill (null for player)
    drsUntil: 0,       // performance.now() until which DRS boost is active (DRS-01)
    drsLap: -1,        // lap index on which DRS was last used (one use per lap)
    flashUntil: 0,     // performance.now() until which the car flashes white (VFX-03)
    lineBias: 0,       // per-lap lateral line variation (AI-02)
    lineLap: -1,       // lap for which lineBias was last generated
    prevX: s.x,        // position before the last move — finish-crossing test (R3B-01)
    prevY: s.y,
    startCrossed: false, // grid sits behind the META line; first crossing arms lap 1
    progress: 0,       // continuous race progress, cached once per frame (R3B-02)
    velAngle: s.a,     // velocity direction — lags heading for micro-drift (R3B-06)
    wallContact: false, // true while grinding the barrier (R3B-05)
    avoidActive: false, // sticky swerve state while clearing a car ahead (W3-T1)
    avoidSide: 1,      // chosen swerve side — held until the obstacle is cleared
    defendUntil: 0,    // defensive one-move block active until (W3-T1)
    defendCdUntil: 0,  // block cooldown — one move per straight, F1 style
    defendSide: 1,     // lateral sign of the active block
    pressureTime: 0,   // seconds the player has been within 1s behind (W3-T3)
    mistakeCount: 0,   // pressure mistakes committed (observability)
    rubber: 1.0,       // current rubber-band multiplier (observability)
  };
}

// cars[] replaces local/remote: length 4 in solo mode, length 2 in multi mode
let cars = [];

let countdown   = 3;
let cdTimer     = 0;
let lastNetSend = 0;
let lastTime    = 0;
let rafId       = null;
let loopRunning = false;
let winner      = null;  // numeric index 0-3 into cars[], or null

// Lap timing & records
let lapStartTime  = 0;        // performance.now() when current lap began
let bestLapMs     = Number(localStorage.getItem('cr_best_lap_ms')) || Infinity;
let lastLapMs     = 0;
let sessionRecord = false;    // true if a new record was set this race
let recordFlashUntil = 0;    // timestamp until which to flash HUD gold

// Off-track state
let wasOnTrack      = true;
let shakeTimer      = null;
let rivalAnimTimers = [];  // cleared on each visit to avoid double-animation

// Floating feedback
let floatingTexts      = [];  // [{text,color,x,y,alpha,vy,size}]
let cpFlash            = 0;   // seconds remaining of checkpoint flash
let damageWarningShown = 0;   // last damage% when warning was shown
let wrongWayTimer      = 0;   // seconds player has been going wrong-way
let drsAvail           = false; // player DRS available this frame (DRS-01)
let drsActive          = false; // player DRS boost currently active

// Overtake event engine (R3B-04): a rank change must persist RANK_CONFIRM_MS before
// firing an event, and each direction has an OVERTAKE_CD_MS cooldown — kills both the
// side-by-side flip-flop spam and the checkpoint-boundary false positives.
const RANK_CONFIRM_MS = 600;
const OVERTAKE_CD_MS  = 3000;
let confirmedRank     = null; // last stable player rank (null until first racing frame)
let pendingRank       = null; // candidate new rank awaiting confirmation
let pendingRankSince  = 0;
let lastPassMsgAt     = -Infinity;
let lastLostMsgAt     = -Infinity;

// Smoothed follow camera (R3B W2-T4): lerps toward the car with speed lookahead so
// the world stops twitching 1:1 with every input.
let camX = 0, camY = 0, camReady = false;

// ── Network (PeerJS wrapper) ───────────────────────────────────────────────────
const Net = (() => {
  let peer = null;
  let conn = null;
  let msgCb = null, closeCb = null;

  function chars() {
    const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += pool[Math.floor(Math.random() * pool.length)];
    return s;
  }

  function wire(c) {
    conn = c;
    c.on('data',  d => msgCb  && msgCb(d));
    c.on('close', () => closeCb && closeCb());
    c.on('error', e => console.warn('conn', e));
  }

  return {
    create(onCode, onPeer, onMsg, onClose, onErr) {
      msgCb = onMsg; closeCb = onClose;
      const id = chars();
      peer = new Peer(id);
      peer.on('open',       ()  => onCode(id));
      peer.on('connection', c   => { wire(c); c.on('open', onPeer); });
      peer.on('error',      err => { console.warn('peer', err); onErr && onErr(err); });
    },

    join(code, onPeer, onMsg, onClose, onErr) {
      msgCb = onMsg; closeCb = onClose;
      peer = new Peer();
      peer.on('open', () => {
        const c = peer.connect(code.toUpperCase(), { reliable: false, serialization: 'json' });
        wire(c);
        c.on('open',  onPeer);
        c.on('error', onErr);
      });
      peer.on('error', onErr);
    },

    send(msg) { if (conn && conn.open) conn.send(msg); },

    destroy() {
      if (peer) { try { peer.destroy(); } catch (_) {} peer = null; conn = null; }
    },
  };
})();

// ── Audio (Web Audio API) ─────────────────────────────────────────────────────
let audioCtx = null;
let engineOsc = null, engineOsc2 = null, engineGain = null, engineFilter = null;
let brakeNoiseNode = null, brakeGainNode = null;
let engineRunning = false;

// Background music (AUDIO-01) — self-contained step sequencer
let musicGain = null, musicInterval = null, musicStep = 0;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function startEngine() {
  if (engineRunning) return;
  const ac = getAudioCtx();
  engineOsc  = ac.createOscillator(); engineOsc.type  = 'sawtooth'; engineOsc.frequency.value  = 80;
  engineOsc2 = ac.createOscillator(); engineOsc2.type = 'square';   engineOsc2.frequency.value = 82;
  engineFilter = ac.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 1200; engineFilter.Q.value = 1;
  engineGain = ac.createGain(); engineGain.gain.value = 0;
  engineOsc.connect(engineFilter); engineOsc2.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(ac.destination);
  engineOsc.start(); engineOsc2.start();
  engineGain.gain.setTargetAtTime(0.12, ac.currentTime, 0.1);
  engineRunning = true;
}

function stopEngine() {
  if (!engineRunning || !engineOsc) return;
  const ac = getAudioCtx();
  engineGain.gain.setTargetAtTime(0, ac.currentTime, 0.2);
  const o1 = engineOsc, o2 = engineOsc2;
  setTimeout(() => { try { o1.stop(); o2.stop(); } catch(_){} }, 400);
  engineRunning = false; engineOsc = null; engineOsc2 = null; engineGain = null; engineFilter = null;
}

// AUDIO-03: muffle the engine while inside the tunnel by dropping the low-pass cutoff.
function setEngineMuffled(muffled) {
  if (!engineRunning || !engineFilter) return;
  const ac = getAudioCtx();
  engineFilter.frequency.setTargetAtTime(muffled ? 480 : 1200, ac.currentTime, 0.08);
}

function updateEnginePitch(speed) {
  if (!engineRunning || !engineOsc) return;
  const ac = getAudioCtx();
  const freq = 80 + Math.max(0, Math.min(1, speed / MAX_SPD_ON)) * 140;
  engineOsc.frequency.setTargetAtTime(freq, ac.currentTime, 0.05);
  if (engineOsc2) engineOsc2.frequency.setTargetAtTime(freq + 2, ac.currentTime, 0.05);
}

function startBrakeSound() {
  if (brakeNoiseNode) return;
  const ac = getAudioCtx();
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  brakeNoiseNode = ac.createBufferSource(); brakeNoiseNode.buffer = buf; brakeNoiseNode.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3500; f.Q.value = 8;
  brakeGainNode = ac.createGain(); brakeGainNode.gain.value = 0;
  brakeNoiseNode.connect(f); f.connect(brakeGainNode); brakeGainNode.connect(ac.destination);
  brakeNoiseNode.start();
  brakeGainNode.gain.setTargetAtTime(0.07, ac.currentTime, 0.03);
}

function stopBrakeSound() {
  if (!brakeNoiseNode) return;
  const ac = getAudioCtx();
  brakeGainNode.gain.setTargetAtTime(0, ac.currentTime, 0.08);
  const n = brakeNoiseNode; setTimeout(() => { try { n.stop(); } catch(_){} }, 300);
  brakeNoiseNode = null; brakeGainNode = null;
}

function playCollisionSound() {
  try {
    const ac = getAudioCtx();
    const size = Math.floor(ac.sampleRate * 0.15);
    const buf = ac.createBuffer(1, size, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (size * 0.15));
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    const g = ac.createGain(); g.gain.value = 0.6;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
  } catch(_){}
}

function playGoSound() {
  try {
    const ac = getAudioCtx();
    [261.6, 329.6, 392.0].forEach(f => {
      const osc = ac.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.connect(g); g.connect(ac.destination);
      osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.6);
    });
  } catch(_){}
}

// ── Background music (AUDIO-01) ────────────────────────────────────────────────
// A low-volume driving bass + arpeggio in A minor, scheduled as discrete steps.
// Deliberately understated so it sits under the engine and never masks feedback SFX.
const MUSIC_BASS = [110.0, 110.0, 164.8, 110.0, 130.8, 130.8, 98.0, 98.0]; // A2 arp pattern
const MUSIC_ARP  = [440.0, 523.3, 659.3, 523.3, 587.3, 659.3, 784.0, 659.3]; // higher sparkle
function playMusicNote(freq, dur, type, vol, dest) {
  const ac = getAudioCtx();
  const osc = ac.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  osc.connect(g); g.connect(dest);
  osc.start(ac.currentTime); osc.stop(ac.currentTime + dur + 0.05);
}
function startMusic() {
  if (musicInterval) return;
  try {
    const ac = getAudioCtx();
    musicGain = ac.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(ac.destination);
    musicGain.gain.setTargetAtTime(0.5, ac.currentTime, 0.6); // fade in under the engine
    musicStep = 0;
    musicInterval = setInterval(() => {
      if (!musicGain) return;
      const i = musicStep % 8;
      playMusicNote(MUSIC_BASS[i], 0.22, 'triangle', 0.10, musicGain);      // bass pulse
      if (i % 2 === 0) playMusicNote(MUSIC_ARP[i], 0.16, 'square', 0.028, musicGain); // sparkle on the beat
      musicStep++;
    }, 190); // ~132 BPM eighth-notes
  } catch(_){}
}
function stopMusic() {
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  if (musicGain) {
    try {
      const ac = getAudioCtx();
      musicGain.gain.setTargetAtTime(0, ac.currentTime, 0.3); // AUDIO-01: fade out at the flag
      const g = musicGain;
      setTimeout(() => { try { g.disconnect(); } catch(_){} }, 800);
    } catch(_){}
    musicGain = null;
  }
}

// AUDIO-02: rising synth sweep celebrating an overtake.
function playOvertakeSound() {
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.35);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.14, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
    osc.connect(g); g.connect(ac.destination);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.5);
  } catch(_){}
}

// AUDIO-02: DRS activation whoosh — filtered noise burst that opens up.
function playDrsSound() {
  try {
    const ac = getAudioCtx();
    const size = Math.floor(ac.sampleRate * 0.4);
    const buf = ac.createBuffer(1, size, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(600, ac.currentTime);
    f.frequency.exponentialRampToValueAtTime(4200, ac.currentTime + 0.35);
    const g = ac.createGain(); g.gain.value = 0.18;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
  } catch(_){}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ms) {
  if (!isFinite(ms) || ms < 0) return '0:00.0';
  const totalS = Math.floor(ms / 1000);
  const m      = Math.floor(totalS / 60);
  const s      = totalS % 60;
  const tenth  = Math.floor((ms % 1000) / 100);
  return `${m}:${String(s).padStart(2, '0')}.${tenth}`;
}

function updateLobbyRecord() {
  const stored = parseInt(localStorage.getItem('cr_best_lap_ms'));
  if (lobbyRec) {
    lobbyRec.textContent = isFinite(stored) ? `⏱ RÉCORD: ${formatTime(stored)}` : '';
  }
}

// ── Top-down projection (identity — world-space = screen-space at 480×640) ─────
function project(wx, wy) { return { x: wx, y: wy }; }

function darken(hex, f) {
  try {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.round(r*(1-f))},${Math.round(g*(1-f))},${Math.round(b*(1-f))})`;
  } catch(_) { return hex; }
}

// ── Track drawing ─────────────────────────────────────────────────────────────
function drawSpinePath() {
  ctx.beginPath();
  ROAD_SPINE.forEach(([x, y], i) => {
    const p = project(x, y);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
}

// ── Tunnel zone (world-space bounding box covering the tunnel segment) ─────────
// Portier exit [830,692] → tunnel [920-1330,680] → curve [1405,700] → chicane [1440,808]
const TUNNEL_ZONE = { x1: 830, y1: 670, x2: 1450, y2: 830 };


function drawTrack() {
  // Ground — large fillRect covers entire rotated world so no black corners appear
  // when camera transform is applied (Plan 02b-03). Sized to cover 1600x2000 world
  // plus diagonal slack for rotation at any angle.
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(-4000, -4000, 8000, 8000);

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // ── Kerbs — dashed, slightly wider than tarmac (red/white armco-style) ────────
  // Dash scale: [60,60] = 3.5x the old [18,18] to remain visible at new world scale
  ctx.save();
  ctx.lineWidth = ROAD_HALF_W * 2 + 12;
  ctx.setLineDash([60, 60]);
  ctx.strokeStyle = '#dc2626'; drawSpinePath(); ctx.stroke();
  ctx.lineDashOffset = 60;
  ctx.strokeStyle = '#f8fafc'; drawSpinePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Tarmac
  ctx.lineWidth = ROAD_HALF_W * 2;
  ctx.strokeStyle = '#2d3748';
  drawSpinePath(); ctx.stroke();

  // Center dashed line — yellow, follows spine to show lap direction
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = 'rgba(251,191,36,0.40)';
  ctx.lineWidth = 3;
  drawSpinePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Direction arrows — semi-transparent triangles every 5 spine points show lap direction
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 2; i < ROAD_SPINE.length - 1; i += 5) {
    const [x0, y0] = ROAD_SPINE[i - 1];
    const [x1, y1] = ROAD_SPINE[i];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) continue;
    const nx = dx / len, ny = dy / len;
    const px = -ny, py = nx;
    const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(mx + nx * 20, my + ny * 20);
    ctx.lineTo(mx - nx * 14 + px * 14, my - ny * 14 + py * 14);
    ctx.lineTo(mx - nx * 14 - px * 14, my - ny * 14 - py * 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Start/finish chequered stripe — vertical at x=500 (CP0 position), main straight y=1500
  const pm1 = project(500, 1500 - ROAD_HALF_W);
  const pm2 = project(500, 1500 + ROAD_HALF_W);
  ctx.save();
  ctx.lineWidth = 5;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = '#f8fafc';
  ctx.beginPath(); ctx.moveTo(pm1.x, pm1.y); ctx.lineTo(pm2.x, pm2.y); ctx.stroke();
  ctx.lineDashOffset = 6;
  ctx.strokeStyle = '#111827';
  ctx.beginPath(); ctx.moveTo(pm1.x, pm1.y); ctx.lineTo(pm2.x, pm2.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // META label — slightly to the right of the stripe endpoint for visibility
  ctx.fillStyle = 'rgba(248,250,252,0.75)';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('META', pm1.x + 14, pm1.y - 3);
}

// ── Car drawing ───────────────────────────────────────────────────────────────
// carStyle(car, carIdx): derives visual style from car object or index
// cars[0] = player (CAR_STYLE_HOST); cars[1-3] = AI derived from car.rivalData
function carStyle(car, carIdx) {
  if (carIdx === 0) return CAR_STYLE_HOST;
  // In multiplayer, cars[1] is the remote player — use selected rival style
  if (gameMode === 'multi' && carIdx === 1) {
    const r = selectedRival;
    return { body: r.body, stripe: r.accent, cockpit: '#0d0d0d', helmet: r.helmet, num: r.num };
  }
  // AI cars: derive style from rivalData stored on the car
  if (car && car.rivalData) {
    const r = car.rivalData;
    return { body: r.body, stripe: r.accent, cockpit: '#0d0d0d', helmet: r.helmet, num: r.num };
  }
  // Fallback
  return { body: '#444', stripe: '#888', cockpit: '#0d0d0d', helmet: '#555', num: '?' };
}

function drawCar(car, carIdx) {
  const s   = carStyle(car, carIdx);
  const sp  = project(car.x, car.y);
  const θ   = car.angle + Math.PI / 2;
  const COS = Math.cos(θ), SIN = Math.sin(θ);

  // Standard 2D rotation matrix (top-down view)
  const ma = COS, mb = SIN, mc = -SIN, md = COS;

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = '#000';
  ctx.translate(sp.x + 3, sp.y + 3);
  ctx.transform(ma, mb, mc, md, 0, 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Car body (top-down)
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.transform(ma, mb, mc, md, 0, 0);

  // Body
  ctx.fillStyle = s.body;
  ctx.fillRect(-9, -22, 18, 42);

  // Side pod stripes
  ctx.fillStyle = s.stripe;
  ctx.fillRect(-9, -4, 3, 16);
  ctx.fillRect(6,  -4, 3, 16);

  // Front wing
  ctx.fillStyle = s.stripe;
  ctx.fillRect(-13, -22, 26, 5);

  // Rear wing
  ctx.fillRect(-14, 17, 28, 4);

  // Cockpit
  ctx.fillStyle = '#111';
  ctx.fillRect(-5, -10, 10, 18);

  // Helmet
  ctx.fillStyle = s.helmet || '#555';
  ctx.beginPath();
  ctx.ellipse(0, -2, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = 'rgba(10,20,40,0.88)';
  ctx.fillRect(-3, -5, 6, 3.5);

  // VFX-03: overtake flash — white overlay that fades over ~0.5s
  const flash = car.flashUntil && performance.now() < car.flashUntil
    ? Math.min(1, (car.flashUntil - performance.now()) / 500) : 0;
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -23, 26, 45);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Car number in screen space (avoids distortion from matrix)
  if (s.num) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.num, sp.x, sp.y + 4);
  }
}

// ── Remote car interpolation (multiplayer only — reads cars[1]) ───────────────
function remoteRenderPos() {
  const r = cars[1];
  if (!r) return { x: 0, y: 0, angle: 0 };
  const age = (performance.now() - r.lastUpdate) / 1000;
  // Simple dead-reckoning from last known state
  return {
    x:     r.x + Math.cos(r.angle) * r.speed * Math.min(age, 0.15),
    y:     r.y + Math.sin(r.angle) * r.speed * Math.min(age, 0.15),
    angle: r.angle,
  };
}

// ── Track collision ───────────────────────────────────────────────────────────
function ptSegDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
}

function isOnTrack(x, y) {
  const r2 = ROAD_HALF_W * ROAD_HALF_W;
  for (let i = 0; i < ROAD_SPINE.length - 1; i++) {
    const [ax, ay] = ROAD_SPINE[i], [bx, by] = ROAD_SPINE[i + 1];
    if (ptSegDist2(x, y, ax, ay, bx, by) <= r2) return true;
  }
  return false;
}

// Returns nearest point on ROAD_SPINE to (x,y), plus normalized track direction at that segment.
// Used for Monaco barrier walls and wrong-way detection.
function nearestSpinePoint(x, y) {
  let bestDist2 = Infinity, bestX = x, bestY = y, bestSegIdx = 0, bestT = 0;
  for (let i = 0; i < ROAD_SPINE.length - 1; i++) {
    const [ax, ay] = ROAD_SPINE[i], [bx, by] = ROAD_SPINE[i + 1];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lenSq));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d2 < bestDist2) { bestDist2 = d2; bestX = cx; bestY = cy; bestSegIdx = i; bestT = t; }
  }
  const [ax, ay] = ROAD_SPINE[bestSegIdx], [bx, by] = ROAD_SPINE[bestSegIdx + 1];
  const sdx = bx - ax, sdy = by - ay, slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
  return { x: bestX, y: bestY, dist: Math.sqrt(bestDist2), dirX: sdx / slen, dirY: sdy / slen,
           segIdx: bestSegIdx, t: bestT };
}

// ── Continuous track progress (R3B-02) ─────────────────────────────────────────
// One number that says how far along the race a car is, in world px. Rank, gaps,
// overtake events and the damage-out winner fallback all read this single metric.
// Measured relative to the META stripe so it is continuous across the lap seam.
function trackProgress(car) {
  const near = nearestSpinePoint(car.x, car.y);
  const arc = SPINE_CUMLEN[near.segIdx] + near.t * (SPINE_CUMLEN[near.segIdx + 1] - SPINE_CUMLEN[near.segIdx]);
  let rel = arc - FINISH_ARC;
  if (rel < 0) rel += SPINE_TOTAL_LEN;
  // Seam guard: a car shoved back over the stripe after being credited must read
  // "just behind the line", not a full lap ahead.
  if (car.startCrossed && car.nextCP === 1 && rel > SPINE_TOTAL_LEN * 0.9) rel -= SPINE_TOTAL_LEN;
  // The grid sits behind the line: until the first crossing (startCrossed) a car is
  // one lap behind the counting convention, which makes progress continuous at that
  // first crossing (where lap does NOT increment).
  const lapEff = car.lap + (car.startCrossed ? 0 : -1);
  return lapEff * SPINE_TOTAL_LEN + rel;
}

// R3B-01: true iff the car's last movement segment crossed the META stripe heading east.
function crossedFinish(car) {
  if (car.prevX === undefined || car.prevX >= FINISH_X || car.x < FINISH_X) return false;
  if (Math.cos(car.angle) <= 0) return false; // must be traveling east, not backing over
  const t = (FINISH_X - car.prevX) / (car.x - car.prevX);
  const yCross = car.prevY + (car.y - car.prevY) * t;
  return Math.abs(yCross - 1500) <= ROAD_HALF_W;
}

// ── Movement integration (R3B-05/06) ──────────────────────────────────────────
const GRIP_ON  = 34;  // rad/s — velocity direction converges to heading (micro-drift)
const GRIP_OFF = 10;  // off-track the car slides far more

// R3B-05: Monaco wall contact — grind along the barrier instead of a flat 78% stop.
// Shallow contact: the car peels along the wall scrubbing a little speed. A square
// hit (> ~57° into the wall) is a real crash: one-time heavy penalty on the first
// contact frame (returned as true so callers can shake/damage), then sustained scrub.
function applyWallContact(car, dt) {
  if (isOnTrack(car.x, car.y)) { car.wallContact = false; return false; }
  const near = nearestSpinePoint(car.x, car.y);
  if (near.dist > 0) {
    const f = (ROAD_HALF_W * 0.88) / near.dist;
    car.x = near.x + (car.x - near.x) * f;
    car.y = near.y + (car.y - near.y) * f;
  }
  const alongT = Math.cos(car.angle) * near.dirX + Math.sin(car.angle) * near.dirY;
  const hard = Math.abs(alongT) < 0.55;
  let freshHard = false;
  if (hard && !car.wallContact) {
    car.speed *= 0.35;                                        // crash: one-time penalty
    freshHard = true;
  } else {
    car.speed *= Math.max(0, 1 - (hard ? 2.5 : 0.45) * dt);   // grind: gentle scrub
  }
  // Peel the heading toward the wall tangent so the car slides along, not into
  const tSign = alongT >= 0 ? 1 : -1;
  const tAngle = Math.atan2(near.dirY * tSign, near.dirX * tSign);
  let d = tAngle - car.angle;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, d));
  car.velAngle = car.angle; // velocity re-aligns against the barrier
  car.wallContact = true;
  return freshHard;
}

// Shared move step for player and AI: micro-drift integration + wall contact.
// Returns true on a fresh hard wall hit.
function moveCar(car, dt) {
  car.prevX = car.x; car.prevY = car.y; // finish-crossing test reads this (R3B-01)
  // R3B-06: velocity direction lags heading — the rear steps out slightly in fast
  // steering and drifting scrubs a little speed. Controls unchanged.
  let dv = car.angle - car.velAngle;
  while (dv >  Math.PI) dv -= Math.PI * 2;
  while (dv < -Math.PI) dv += Math.PI * 2;
  const grip = isOnTrack(car.x, car.y) ? GRIP_ON : GRIP_OFF;
  car.velAngle += dv * Math.min(1, grip * dt);
  car.speed *= Math.max(0, 1 - Math.abs(dv) * 2.2 * dt);
  car.x += Math.cos(car.velAngle) * car.speed * dt;
  car.y += Math.sin(car.velAngle) * car.speed * dt;
  return applyWallContact(car, dt);
}

// R3B-03: arcade bump-and-run. Cars deflect and slide around each other — the old
// resolver only cut scalar speed, so AUTO_ACCEL rebuilt the same head-to-tail ram
// every frame and the cars stayed glued ("te trabás con el otro jugador").
// Returns false when not touching, else { impact, aVn, bVn } (impact = closing px/s).
function resolveCarCollision(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist2 = dx * dx + dy * dy;
  const minDist = CAR_RADIUS * 2;
  if (dist2 >= minDist * minDist || dist2 === 0) return false;
  const dist = Math.sqrt(dist2);
  const nx = dx / dist, ny = dy / dist;   // contact normal a→b
  const tx = -ny, ty = nx;                // contact tangent

  // 50/50 separation (was full overlap on EACH car — visible position pops)
  const sep = (minDist - dist) * 0.51;
  a.x -= nx * sep; a.y -= ny * sep;
  b.x += nx * sep; b.y += ny * sep;

  const aVn = (Math.cos(a.angle) * nx + Math.sin(a.angle) * ny) * a.speed;
  const bVn = (Math.cos(b.angle) * nx + Math.sin(b.angle) * ny) * b.speed;
  if (bVn - aVn >= 0) return { impact: 0, aVn, bVn }; // already separating
  const relV = aVn - bVn;

  // Soften only the closing momentum — the race keeps flowing
  a.speed = Math.max(0, a.speed - relV * 0.45);
  b.speed = Math.max(0, b.speed - relV * 0.45);

  // Anti-stick: stagger the cars across the contact tangent and nudge their headings,
  // EACH toward its own lean side — pushing a car against where it is steering (e.g.
  // an AI mid-swerve) cancels its escape and re-forms the glue. If both lean the same
  // way the faster car still slides past on preserved tangential motion.
  const aSide = Math.sign(Math.cos(a.angle) * tx + Math.sin(a.angle) * ty) || 1;
  const bSide = Math.sign(Math.cos(b.angle) * tx + Math.sin(b.angle) * ty) || -aSide;
  const lateral = Math.min(8, 2 + relV * 0.02);
  a.x += tx * aSide * lateral; a.y += ty * aSide * lateral;
  b.x += tx * bSide * lateral; b.y += ty * bSide * lateral;
  const nudge = Math.min(0.22, 0.08 + relV * 0.0004);
  a.angle += aSide * nudge;   a.velAngle += aSide * nudge;
  b.angle += bSide * nudge;   b.velAngle += bSide * nudge;
  return { impact: relV, aVn, bVn };
}

// ── Classification / DRS helpers ──────────────────────────────────────────────
// Nearest car directly ahead of `car` by continuous progress (or null if `car` leads).
// Reads car.progress, cached once per racing frame.
function carAhead(car) {
  let best = null, bestP = Infinity;
  for (const other of cars) {
    if (other === car || other.finished) continue;
    if (other.progress >= car.progress && other.progress < bestP) {
      bestP = other.progress; best = other;
    }
  }
  return best;
}

// DRS-01: available when within DRS_RANGE of the car ahead and not yet used this lap.
function drsAvailableFor(car) {
  if (car.finished || car.drsLap === car.lap) return false;
  if (performance.now() < car.drsUntil) return false; // already boosting
  const ahead = carAhead(car);
  if (!ahead) return false;
  const dx = ahead.x - car.x, dy = ahead.y - car.y;
  return dx * dx + dy * dy < DRS_RANGE * DRS_RANGE;
}

function activateDRS(car) {
  if (!drsAvailableFor(car)) return;
  car.drsUntil = performance.now() + DRS_DURATION;
  car.drsLap   = car.lap;
  if (car.isPlayer) playDrsSound();
}

// VFX-02: screen shake reused for off-track exits and hard collisions.
function triggerShake() {
  clearTimeout(shakeTimer);
  canvasWrap.classList.remove('shake');
  void canvasWrap.offsetWidth; // force reflow so the animation restarts
  canvasWrap.classList.add('shake');
  shakeTimer = setTimeout(() => canvasWrap.classList.remove('shake'), 320);
}

// ── Checkpoint / lap logic ────────────────────────────────────────────────────
// R3B-01: the finish is a real line-crossing test (crossedFinish), never a radius.
// CPS[1..3] are anti-shortcut gates: a stripe crossing with gates pending counts nothing.
function checkCheckpoints(car) {
  if (car.finished) return;

  if (crossedFinish(car)) {
    if (!car.startCrossed) {
      // The grid sits behind the line — the first crossing arms lap 1, no lap counted.
      car.startCrossed = true;
    } else if (car.nextCP === 0) {
      if (car.isPlayer) {
        cpFlash = 0.30;
        if (lapStartTime > 0) {
          lastLapMs = performance.now() - lapStartTime;
          lapStartTime = performance.now();
          const lapNum = car.lap + 1;  // this is the lap just completed
          if (lapNum < TOTAL_LAPS) {
            // A new lap is starting — show the lap about to begin
            addFloatingText(`VUELTA ${lapNum + 1} / ${TOTAL_LAPS}`, '#f8fafc', 240, 250, 22);
          }
          // VFX-05 / criterion 5: lap time vs personal best
          const prevBest = bestLapMs;
          if (lastLapMs < prevBest) {
            bestLapMs = lastLapMs;
            sessionRecord = true;
            recordFlashUntil = performance.now() + 2000;
            localStorage.setItem('cr_best_lap_ms', Math.round(bestLapMs));
            updateLobbyRecord();
            if (isFinite(prevBest)) {
              const delta = ((prevBest - lastLapMs) / 1000).toFixed(1);
              addFloatingText(`⭐ RÉCORD PERSONAL! -${delta}s`, '#fbbf24', 240, 282, 15);
            } else {
              addFloatingText(`⭐ ¡VUELA, FRANCO!  ${formatTime(lastLapMs)}`, '#fbbf24', 240, 282, 15);
            }
          } else {
            const delta = ((lastLapMs - prevBest) / 1000).toFixed(1);
            addFloatingText(`${formatTime(lastLapMs)}  +${delta}s récord`, '#cbd5e1', 240, 282, 14);
          }
        }
      }
      car.lap++;
      if (car.lap >= TOTAL_LAPS) {
        car.finished = true;
        return;
      }
      car.nextCP = 1;
    }
    return;
  }

  if (car.nextCP !== 0) {
    const cp = CPS[car.nextCP];
    const dx = car.x - cp.x, dy = car.y - cp.y;
    if (dx * dx + dy * dy < cp.r * cp.r) {
      if (car.isPlayer) cpFlash = 0.12;
      car.nextCP = (car.nextCP + 1) % CPS.length;
    }
  }
}

// ── Physics update ─────────────────────────────────────────────────────────────
function updateCar(car, dt, damage = 0) {
  if (car.finished) return;
  const onTrack = isOnTrack(car.x, car.y);
  const damageFactor = 1 - (Math.min(damage, 100) / 100) * 0.45;
  const drsMul  = performance.now() < car.drsUntil ? DRS_BOOST : 1.0; // DRS-01
  const maxSpd  = (onTrack ? MAX_SPD_ON : MAX_SPD_OFF) * damageFactor * drsMul;

  // Auto-accelerate (always forward)
  car.speed += AUTO_ACCEL * dt;
  // Friction
  car.speed -= car.speed * FRICTION_K * dt;
  // Brake (keyboard ↓ or touch) — only player car responds to input
  if (car.isPlayer && keys.down) car.speed -= BRAKE_FORCE * dt;
  // Clamp
  car.speed = Math.max(0, Math.min(car.speed, maxSpd));

  // Steering (rate scales with speed so it feels natural) — only player car steers
  const turnFactor = Math.min(1, 0.45 + car.speed / MAX_SPD_ON * 0.55);
  if (car.isPlayer && keys.left)  car.angle -= TURN_RATE * turnFactor * dt;
  if (car.isPlayer && keys.right) car.angle += TURN_RATE * turnFactor * dt;

  // Move with micro-drift; Monaco walls grind/crash via applyWallContact (R3B-05/06)
  if (moveCar(car, dt) && car.isPlayer) {
    car.damage = Math.min(100, car.damage + 1.5); // hard wall hit
    triggerShake();
  }
}

// ── AI driver ─────────────────────────────────────────────────────────────────
const AI_WP_REACH = 80; // px radius to advance to next waypoint (3.5x scale; naive 30*3.5=105 but 80 used for tighter corner precision at Loews)

function updateAI(car, dt) {
  if (car.finished) return;

  // Derive skill from car.rivalData (per-car) — never from selectedRival global
  const skill = car.rivalData ? car.rivalData.skill : 0.88;

  // Personality multipliers (CARS-02) — fallback to consistent if missing
  const pers     = car.personality || PERSONALITIES.consistent;
  const noiseAmp = pers.noiseAmp;  // personality-driven noise amplitude

  // AI-02: regenerate a small lateral line bias once per lap so the racing line
  // differs lap-to-lap (varies within ±6px, scaled by personality noise appetite).
  if (car.lineLap !== car.lap) {
    car.lineLap = car.lap;
    car.lineBias = (Math.random() - 0.5) * 12 * (0.5 + pers.noiseAmp * 10);
  }

  // W3-T1: opponent awareness. A car ahead inside a 150px / ±44° cone bends the
  // steering target AROUND it (angular bias — unlike a waypoint offset, its strength
  // does not dilute with waypoint distance). The chosen side is STICKY until the
  // obstacle is cleared: re-picking each frame lets collision nudges cancel the
  // swerve and the AI dances on the opponent's gearbox forever.
  let avoidBias = 0, boxedCap = Infinity, sawObstacle = false;
  const hdX = Math.cos(car.angle), hdY = Math.sin(car.angle);
  for (const other of cars) {
    if (other === car || other.finished) continue;
    const odx = other.x - car.x, ody = other.y - car.y;
    const od2 = odx * odx + ody * ody;
    if (od2 > 160 * 160 || od2 === 0) continue;
    const od = Math.sqrt(od2);
    const fwd = (odx * hdX + ody * hdY) / od;
    // Cone hysteresis: engage only when the obstacle is ahead (±44°), but once
    // engaged keep biasing until it is genuinely BEHIND — releasing while merely
    // alongside lets the waypoint pull the AI back into the opponent's side.
    if (car.avoidActive ? fwd < 0.15 : fwd < 0.72) continue;
    sawObstacle = true;
    if (!car.avoidActive) {
      car.avoidActive = true;
      car.avoidSide = Math.sign(odx * -hdY + ody * hdX) ||
                      (car.lineBias >= 0 ? 1 : -1);              // dead-center tiebreak
    }
    avoidBias -= car.avoidSide * 0.55 * (1 - od / 160);          // steer to the other side
    // Boxed behind something much slower: lift early to its pace + margin and use
    // the swerve to pass, instead of plowing in at full speed.
    if (od < 110 && fwd > 0.85) boxedCap = Math.max(120, other.speed + 60);
  }
  if (!sawObstacle) car.avoidActive = false;                     // cleared — release side
  avoidBias = Math.max(-0.6, Math.min(0.6, avoidBias));

  // W3-T1: defensive one-move block — when the player closes in from behind, a
  // defensive rival covers the player's side once (2s move, 6s cooldown, F1 style).
  const nowMs = performance.now();
  if (pers.style === 'defensive' && cars[0] && !cars[0].finished) {
    const pdx = cars[0].x - car.x, pdy = cars[0].y - car.y;
    if (pdx * pdx + pdy * pdy < 80 * 80 && (pdx * hdX + pdy * hdY) < 0 && nowMs > car.defendCdUntil) {
      car.defendUntil   = nowMs + 2000;
      car.defendCdUntil = nowMs + 6000;
      car.defendSide    = Math.sign(pdx * -hdY + pdy * hdX) || 1; // cover the player's side
    }
  }
  const blockOffset = nowMs < car.defendUntil ? car.defendSide * 14 : 0;

  // Navigate using fine-grained AI_WAYPOINTS (stays on road) — per-car wpIdx
  const wp = AI_WAYPOINTS[car.wpIdx];
  // Apply lineMult as a lateral offset toward the apex (aggressive) or wider (defensive),
  // plus the per-lap lineBias (AI-02) and the defensive block shift (W3-T1).
  const lineOffset = (1.0 - pers.lineMult) * 6 + car.lineBias + blockOffset;
  const wpDx = wp[0] - car.x + lineOffset * Math.cos(car.angle + Math.PI / 2);
  const wpDy = wp[1] - car.y + lineOffset * Math.sin(car.angle + Math.PI / 2);

  if (wpDx * wpDx + wpDy * wpDy < AI_WP_REACH * AI_WP_REACH) {
    car.wpIdx = (car.wpIdx + 1) % AI_WAYPOINTS.length;
  }

  const targetAngle = Math.atan2(wpDy, wpDx) + avoidBias; // W3-T1: swerve around traffic
  let diff = targetAngle - car.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const absDiff = Math.abs(diff);

  const steerPow = 0.70 + skill * 0.28;
  const maxTurn  = TURN_RATE * steerPow * dt;
  const noise    = (Math.random() - 0.5) * noiseAmp * dt;
  car.angle += Math.sign(diff) * Math.min(absDiff, maxTurn) + noise;

  // W3-T2/T3: rubber-band and pressure, both from the continuous-progress gap.
  // gapSec > 0 = this AI leads the player.
  let rubber = 1.0;
  if (cars[0] && !cars[0].finished && cars[0] !== car) {
    const gapSec = (car.progress - cars[0].progress) / Math.max(cars[0].speed, 100);
    // Rubber-band: far ahead → ease off slightly; far behind → push. Keeps races alive
    // without erasing the skill gap (boost capped at an effective skill of 1.02).
    if (gapSec > 4) rubber = 0.96;
    else if (gapSec < -4) rubber = Math.min(1.05, 1.02 / (skill * pers.speedMult));
    // Pressure mistakes: the player glued within 1s behind for 3s+ forces errors —
    // a steering flinch + lift that opens a real overtaking window.
    if (gapSec > 0 && gapSec < 1.0) {
      car.pressureTime += dt;
      const mistakeRate = 0.25 * (pers.style === 'aggressive' ? 2 : 1); // per second
      if (car.pressureTime > 3 && Math.random() < mistakeRate * dt) {
        car.angle += (Math.random() - 0.5) * 0.5;
        car.speed *= 0.85;
        car.pressureTime = 0;
        car.mistakeCount++;
      }
    } else {
      car.pressureTime = Math.max(0, car.pressureTime - dt);
    }
  }
  car.rubber = rubber;

  // AI-01: real corner braking. The sharper the required turn, the harder the AI brakes.
  // brakeStrength 0→1 across a 0.5–1.4 rad steering demand, scaled by personality brakeMult.
  const braking       = absDiff > 0.5;
  const brakeStrength = Math.min(1, Math.max(0, (absDiff - 0.5) / 0.9)) * pers.brakeMult;
  const lapBonus      = 1 + Math.min(car.lap, 2) * 0.04; // +4% per completed lap, max +8%
  // DRS boost (DRS-01): the AI activates DRS automatically when close behind (see racing loop)
  const drsActive     = performance.now() < car.drsUntil;
  const drsMul        = drsActive ? DRS_BOOST : 1.0;
  // Apply personality speedMult, rubber-band, traffic cap and cornering cap
  const aiMaxSpd = Math.min(boxedCap,
    MAX_SPD_ON * skill * pers.speedMult * lapBonus * drsMul * rubber * (1 - 0.42 * brakeStrength));
  const onTrack  = isOnTrack(car.x, car.y);
  const maxSpd   = onTrack ? aiMaxSpd : MAX_SPD_OFF;
  car.speed += AUTO_ACCEL * dt;
  car.speed -= car.speed * FRICTION_K * dt;
  // AI-01: braking force raised 0.35 → 0.7 base, graded by corner sharpness
  if (braking) car.speed -= BRAKE_FORCE * 0.7 * brakeStrength * dt;
  car.speed = Math.max(0, Math.min(car.speed, maxSpd));

  moveCar(car, dt); // shared micro-drift + wall handling (R3B-05/06)
}

// ── HUD update ────────────────────────────────────────────────────────────────
// R3B-02/04: rank, gap and overtake events all derive from continuous trackProgress
// (car.progress, cached once per frame) — no more checkpoint-boundary jumps or
// per-frame tiebreak flips.
function updateHUD() {
  if (!cars[0]) return;
  const lap = Math.min(cars[0].lap + 1, TOTAL_LAPS);
  hudLap.textContent = `VUELTA ${lap}/${TOTAL_LAPS}`;

  const ranked = cars
    .map((c, i) => ({ i, p: c.finished ? Infinity : c.progress }))
    .sort((a, b) => b.p - a.p);
  const playerRank = ranked.findIndex(r => r.i === 0) + 1; // 1-based
  hudPos.textContent = `P${playerRank}`;

  // Overtake events (R3B-04): the new ordering must persist RANK_CONFIRM_MS before an
  // event fires, with a per-direction cooldown. Side-by-side jitter never confirms.
  const now = performance.now();
  if (confirmedRank === null) {
    confirmedRank = playerRank; // first racing frame — establish baseline silently
  } else if (playerRank === confirmedRank) {
    pendingRank = null;
  } else {
    if (pendingRank !== playerRank) { pendingRank = playerRank; pendingRankSince = now; }
    if (now - pendingRankSince >= RANK_CONFIRM_MS) {
      const gained = playerRank < confirmedRank;
      confirmedRank = playerRank;
      pendingRank = null;
      if (gained && now - lastPassMsgAt >= OVERTAKE_CD_MS) {
        lastPassMsgAt = now;
        addFloatingText('¡LO PASÉ! ⚡', '#10b981', 240, 220, 20);
        playOvertakeSound();
        const passed = ranked[playerRank] ? cars[ranked[playerRank].i] : null; // car now just behind
        if (passed) passed.flashUntil = now + 500;
      } else if (!gained && now - lastLostMsgAt >= OVERTAKE_CD_MS) {
        lastLostMsgAt = now;
        addFloatingText('¡TE PASARON!', '#ef4444', 240, 220, 18);
        cars[0].flashUntil = now + 500;
      }
    }
  }

  if (gameMode === 'solo') {
    // Gap to the rival in real seconds: progress delta (px along track) over player speed
    if (cars[1]) {
      const d = cars[0].progress - cars[1].progress; // + = player ahead
      if (isFinite(d)) {
        const secs = (Math.abs(d) / Math.max(cars[0].speed, 100)).toFixed(1);
        hudRole.textContent = `${d >= 0 ? '+' : '-'}${secs}s`;
        hudRole.style.color = d >= 0 ? '#10b981' : '#ef4444';
      } else {
        hudRole.textContent = '—'; // rival already finished
        hudRole.style.color = '#94a3b8';
      }
      hudRole.style.background   = 'rgba(0,0,0,0.45)';
      hudRole.style.borderRadius = '4px';
      hudRole.style.padding      = '1px 5px';
    }
  } else {
    hudRole.textContent      = isHost ? 'HOST' : 'GUEST';
    hudRole.style.color      = '';
    hudRole.style.background = '';
    hudRole.style.padding    = '';
  }
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function drawCountdown(val) {
  ctx.fillStyle = 'rgba(5,10,26,0.72)';
  ctx.fillRect(0, 0, 480, 640);
  ctx.textAlign = 'center';
  if (val > 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 120px system-ui';
    ctx.fillText(String(val), 240, 370);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('CIRCUIT DE MONACO', 240, 440);
    ctx.fillStyle = '#00a0e9';
    ctx.font = '11px monospace';
    ctx.fillText('MONTE CARLO · MÓNACO', 240, 458);
  } else {
    ctx.font = 'bold 72px system-ui';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('¡GO!', 240, 370);
  }
}

// ── Win overlay ───────────────────────────────────────────────────────────────
function drawWin(won) {
  ctx.fillStyle = 'rgba(5,10,26,0.78)';
  ctx.fillRect(0, 0, 480, 640);
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 52px system-ui';
    ctx.fillText('¡GANASTE!', 240, 300);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText('¡Vamos Colapinto! 🏆', 240, 350);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 44px system-ui';
    ctx.fillText('¡Buen intento!', 240, 300);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '20px system-ui';
    ctx.fillText('El rival ganó esta vez', 240, 350);
  }
}

// ── Off-track vignette ────────────────────────────────────────────────────────
function drawOffTrackVignette(alpha) {
  // Screen-space center at camera focal point (240, 380) per D-02 — called after ctx.restore()
  const grad = ctx.createRadialGradient(240, 380, 100, 240, 380, 280);
  grad.addColorStop(0,   `rgba(180,0,0,0)`);
  grad.addColorStop(0.5, `rgba(180,0,0,0)`);
  grad.addColorStop(1,   `rgba(180,0,0,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 640);
}

// ── Damage tint (VFX-01) ──────────────────────────────────────────────────────
// Full-screen tint that ramps from transparent → orange → red as damage climbs
// above ~40%. Communicates a failing car at a glance without hiding the track.
function drawDamageTint(damage) {
  if (damage < 40) return;
  const t = Math.min(1, (damage - 40) / 60); // 0 at 40% → 1 at 100%
  // Orange (249,115,22) → red (220,38,38) as t rises
  const r = Math.round(249 + (220 - 249) * t);
  const g = Math.round(115 + (38 - 115) * t);
  const b = Math.round(22 + (38 - 22) * t);
  ctx.fillStyle = `rgba(${r},${g},${b},${0.10 + t * 0.28})`;
  ctx.fillRect(0, 0, 480, 640);
}

// ── DRS speed lines (VFX-04) ──────────────────────────────────────────────────
// Cyan motion streaks along the screen edges while the player's DRS boost is active.
function drawDrsLines() {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,224,255,0.5)';
  ctx.lineWidth = 3;
  const t = performance.now() / 60;
  for (let k = 0; k < 6; k++) {
    const off = ((t + k * 40) % 240);
    const x1 = 18, x2 = 462;
    ctx.beginPath(); ctx.moveTo(x1, 120 + off); ctx.lineTo(x1, 120 + off + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, 120 + off); ctx.lineTo(x2, 120 + off + 40); ctx.stroke();
  }
  ctx.restore();
}

// ── DRS HUD indicator + mobile button (DRS-01) ────────────────────────────────
const drsBtn = document.getElementById('btn-drs');
function updateDrsUI(available, active) {
  if (!drsBtn) return;
  drsBtn.hidden = !(available || active);
  drsBtn.classList.toggle('available', available && !active);
  drsBtn.classList.toggle('active', active);
  drsBtn.textContent = active ? 'DRS ●' : 'DRS';
}

// ── Camera (R3B W2-T4) ─────────────────────────────────────────────────────────
function updateCamera(dt) {
  if (!cars[0]) return;
  const look = Math.min(70, cars[0].speed * 0.14); // look ahead along the velocity
  const tx = cars[0].x + Math.cos(cars[0].velAngle) * look;
  const ty = cars[0].y + Math.sin(cars[0].velAngle) * look;
  if (!camReady) { camX = tx; camY = ty; camReady = true; return; }
  const k = Math.min(1, 7 * dt);
  camX += (tx - camX) * k;
  camY += (ty - camY) * k;
}

// ── Minimap ────────────────────────────────────────────────────────────────────
function drawMinimap() {
  const MAP_W = 100, MAP_H = 120, PAD = 6;
  const MAP_X = 374, MAP_Y = 6;  // 480 - 100 - 6 = 374

  // Compute ROAD_SPINE bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ROAD_SPINE) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((MAP_W - PAD * 2) / rangeX, (MAP_H - PAD * 2) / rangeY);
  const ox = MAP_X + PAD + (MAP_W - PAD * 2 - rangeX * scale) / 2 - minX * scale;
  const oy = MAP_Y + PAD + (MAP_H - PAD * 2 - rangeY * scale) / 2 - minY * scale;
  const toMap = (wx, wy) => [ox + wx * scale, oy + wy * scale];

  ctx.save();

  // Background
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
  ctx.globalAlpha = 1;

  // Circuit outline (ROAD_SPINE polyline)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ROAD_SPINE.forEach(([x, y], i) => {
    const [mx, my] = toMap(x, y);
    i === 0 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
  });
  ctx.stroke();

  // Car dots: player (i=0) = white r=3, AI = rivalData color r=2
  cars.forEach((car, i) => {
    const [mx, my] = toMap(car.x, car.y);
    ctx.beginPath();
    ctx.arc(mx, my, i === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#ffffff' : (car.rivalData?.body ?? '#888');
    ctx.fill();
  });

  ctx.restore();
}

// ── Damage bar ────────────────────────────────────────────────────────────────
function drawDamageBar(damage) {
  if (damage <= 0) return;
  const ratio = Math.min(damage / 100, 1);
  const barW = 72, barH = 6, x = 400, y = 16;
  ctx.fillStyle = 'rgba(248,250,252,0.75)';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`DAÑO ${Math.floor(damage)}%`, x + barW, y - 1);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 1, y, barW + 2, barH + 2);
  const r = Math.floor(255 * ratio), g = Math.floor(200 * (1 - ratio));
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.fillRect(x, y + 1, barW * ratio, barH);
  ctx.textAlign = 'left';
}

// ── Floating text feedback ────────────────────────────────────────────────────
function addFloatingText(text, color, x = 240, y = 260, size = 16) {
  floatingTexts.push({ text, color, x, y, alpha: 1.0, vy: -50, size });
}

function drawFloatingTexts(dt) {
  if (!floatingTexts.length) return;
  ctx.save();
  ctx.textAlign = 'center';
  floatingTexts = floatingTexts.filter(ft => {
    ft.y    += ft.vy * dt;
    ft.alpha -= dt * 0.9;
    if (ft.alpha <= 0) return false;
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font        = `bold ${ft.size}px system-ui`;
    ctx.fillStyle   = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    return true;
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Main game loop ─────────────────────────────────────────────────────────────
// CARS-03: extender a 6 pares en 02-04
function loop(ts) {
  if (!loopRunning) return;
  const dt = lastTime === 0 ? 0.016 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (phase === 'countdown') {
    cdTimer -= dt;

    if (cdTimer <= 0) {
      countdown--;
      if (countdown < 0) {
        phase = 'racing';
        lapStartTime = performance.now(); // BUG-04: lapStartTime correctly initialized here (verified)
        playGoSound();
        startMusic(); // AUDIO-01
      } else {
        cdTimer = 1;
      }
    }
  } else if (phase === 'racing') {

    if (gameMode === 'solo') {
      // Update all 4 cars
      cars.forEach(car => {
        if (car.isPlayer) {
          updateCar(car, dt, car.damage);
        } else {
          updateAI(car, dt);
        }
        checkCheckpoints(car);
      });

      // Car-car collision (R3B-03): bump-and-run — grazes are free, real hits cost
      PAIRS.forEach(([i, j]) => {
        const a = cars[i], b = cars[j];
        if (!a || !b || a.finished || b.finished) return;
        const hit = resolveCarCollision(a, b);
        if (!hit || !(i === 0 || j === 0)) return;
        // Grazing contact (closing speed <= 60 px/s) costs nothing — racing wheel-to-
        // wheel must be viable. Only the player accumulates damage for the HUD.
        if (hit.impact > 60) {
          const other = i === 0 ? b : a;
          const playerIsAggressor = i === 0 ? hit.aVn > hit.bVn + 5 : hit.bVn > hit.aVn + 5;
          const baseDmg = Math.min(6, 1 + hit.impact * 0.02);
          const aiDamageMult = other.personality ? other.personality.damageMult : 1.0;
          cars[0].damage = Math.min(100, cars[0].damage + (playerIsAggressor ? baseDmg : baseDmg * 0.15) * aiDamageMult);
          playCollisionSound();
          if (hit.impact > 150) triggerShake(); // VFX-02: hard impact
        }
      });
    } else {
      // Multiplayer: update only cars[0] (local player), cars[1] updated via onMsg
      updateCar(cars[0], dt, cars[0].damage);
      checkCheckpoints(cars[0]);

      // Broadcast position
      if (ts - lastNetSend >= NET_MS) {
        lastNetSend = ts;
        Net.send({
          type: 'pos',
          x: cars[0].x, y: cars[0].y, angle: cars[0].angle,
          speed: cars[0].speed, lap: cars[0].lap, cp: cars[0].nextCP,
        });
      }
    }

    // Cache continuous progress once per frame — rank, gap, DRS and the winner
    // fallback all read car.progress (R3B-02)
    cars.forEach(c => { c.progress = c.finished ? Infinity : trackProgress(c); });

    updateHUD();

    // Engine pitch tracks player speed
    updateEnginePitch(cars[0].speed);
    // Brake squeal (player only)
    if (keys.down && cars[0].speed > 20) startBrakeSound();
    else stopBrakeSound();

    // Update car.inTunnel flag for each car (used by Phase 3 audio)
    cars.forEach(car => {
      car.inTunnel = (car.x >= TUNNEL_ZONE.x1 && car.x <= TUNNEL_ZONE.x2 &&
                      car.y >= TUNNEL_ZONE.y1 && car.y <= TUNNEL_ZONE.y2);
    });
    setEngineMuffled(cars[0].inTunnel); // AUDIO-03: muffle engine inside the tunnel

    // DRS-01: AI auto-activates when it qualifies; track player availability for the HUD/button.
    if (gameMode === 'solo') {
      cars.forEach(car => { if (!car.isPlayer && drsAvailableFor(car)) activateDRS(car); });
    }
    drsActive = performance.now() < cars[0].drsUntil;
    drsAvail  = !drsActive && drsAvailableFor(cars[0]);
    updateDrsUI(drsAvail, drsActive);

    // Compute onTrk before render block — used in screen-space section after ctx.restore()
    const onTrk = isOnTrack(cars[0].x, cars[0].y);

    // Wrong-way detection: compare player heading to nearest spine direction
    if (cars[0].speed > 80) {
      const near = nearestSpinePoint(cars[0].x, cars[0].y);
      const dot = Math.cos(cars[0].angle) * near.dirX + Math.sin(cars[0].angle) * near.dirY;
      wrongWayTimer = dot < -0.5
        ? Math.min(wrongWayTimer + dt, 3)
        : Math.max(0, wrongWayTimer - dt * 2);
      if (wrongWayTimer > 0.8) cars[0].speed = Math.min(cars[0].speed, 100);
    } else {
      wrongWayTimer = Math.max(0, wrongWayTimer - dt);
    }

    // Off-track damage + shake (player car only)
    if (!onTrk) {
      cars[0].damage = Math.min(100, cars[0].damage + 1.2 * dt);
      if (wasOnTrack) {
        cars[0].damage = Math.min(100, cars[0].damage + 2);
        triggerShake();
      }
    }
    // Slow damage recovery while on track — makes game more forgiving
    if (onTrk && cars[0].damage > 0) {
      cars[0].damage = Math.max(0, cars[0].damage - 3 * dt);
    }
    wasOnTrack = onTrk;

    // Damage warning at 60% / 80% (player only)
    // Both checks are independent so both can fire in the same frame if damage jumps 0→80+ (WR-06)
    if (cars[0].damage >= 60 && damageWarningShown < 60) {
      damageWarningShown = 60;
      addFloatingText('⚠ DAÑO ALTO', '#f97316', 240, 200, 18);
    }
    if (cars[0].damage >= 80 && damageWarningShown < 80) {
      damageWarningShown = 80;
      addFloatingText('⛔ COCHE CRÍTICO', '#ef4444', 240, 200, 20);
    }

    // Lap timer HUD
    if (lapStartTime > 0) {
      const elapsed = performance.now() - lapStartTime;
      const isRecord = performance.now() < recordFlashUntil;
      hudTimer.textContent = formatTime(elapsed);
      hudTimer.classList.toggle('record', isRecord);
    }

    // Win / total-damage check
    if (winner === null) {
      // finished check takes priority over damage (CR-03)
      for (let i = 0; i < cars.length; i++) {
        if (cars[i].finished) { winner = i; break; }
      }
      if (winner === null && cars[0].damage >= 100) {
        // Player destroyed — furthest-ahead rival by continuous progress (CR-01/R3B-02)
        let bestIdx = 1, bestP = -Infinity;
        for (let i = 1; i < cars.length; i++) {
          const p = cars[i].finished ? Infinity : cars[i].progress;
          if (p > bestP) { bestP = p; bestIdx = i; }
        }
        winner = bestIdx;
      }
      if (winner !== null) {
        stopEngine(); stopBrakeSound(); stopMusic(); // AUDIO-01: music fades at the flag
        updateDrsUI(false, false); // hide DRS button once the race is over
        if (gameMode === 'multi' && winner === 0) Net.send({ type: 'finish' });
        phase = 'done';
      }
    }

    // === WORLD-SPACE RENDER (racing) ===
    updateCamera(dt);
    ctx.save();
    ctx.translate(240, 380);
    ctx.translate(-camX, -camY);

    drawTrack();

    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }

    ctx.restore();

    // === SCREEN-SPACE RENDER (racing) ===
    if (drsActive) drawDrsLines(); // VFX-04 — behind HUD, over the world
    drawMinimap();

    drawDamageTint(cars[0].damage); // VFX-01: progressive orange→red damage tint
    if (!onTrk) drawOffTrackVignette(0.28); // reduced: walls keep car near track, vignette is brief warning

    // DRS indicator (DRS-01)
    if (drsAvail || drsActive) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui';
      ctx.fillStyle = drsActive ? '#00e0ff' : `rgba(0,224,255,${0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 220))})`;
      ctx.fillText(drsActive ? '⚡ DRS ACTIVO' : 'DRS DISPONIBLE', 240, 610);
      ctx.restore();
    }

    // Checkpoint flash (green border sweep)
    if (cpFlash > 0) {
      cpFlash -= dt;
      const a2 = Math.min(1, cpFlash * 6);
      ctx.strokeStyle = `rgba(16,185,129,${a2 * 0.7})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 470, 630);
    }

    drawFloatingTexts(dt);
    drawDamageBar(cars[0].damage);

    // Wrong-way overlay
    if (wrongWayTimer > 0.8) {
      ctx.save();
      ctx.fillStyle = `rgba(239,68,68,${Math.min(0.9, (wrongWayTimer - 0.8) * 1.5)})`;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚠  VUELTA INCORRECTA  ⚠', 240, 78);
      ctx.restore();
    }

  } else if (phase === 'done') {

    // === WORLD-SPACE RENDER (done) ===
    ctx.save();
    ctx.translate(240, 380);
    ctx.translate(-camX, -camY); // camera freezes at its last racing position

    drawTrack();

    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }

    ctx.restore();

    // === SCREEN-SPACE RENDER (done) ===
    drawMinimap();
    drawWin(winner === 0);
  }

  // === WORLD-SPACE RENDER (countdown — placed after phase branches to share structure) ===
  if (phase === 'countdown') {
    updateCamera(dt); // cars are static — snaps to the grid position
    ctx.save();
    ctx.translate(240, 380);
    ctx.translate(-camX, -camY);

    drawTrack();

    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      drawCar(cars[1], 1);
      drawCar(cars[0], 0);
    }

    ctx.restore();

    // === SCREEN-SPACE RENDER (countdown) ===
    drawMinimap();
    drawCountdown(countdown);
  }

  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  loopRunning = true;
  if (rafId) cancelAnimationFrame(rafId);
  lastTime = 0;
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  loopRunning = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

// ── Network message handler ────────────────────────────────────────────────────
function onMsg(data) {
  if (!data || !data.type) return;

  if (data.type === 'ready' && isHost && phase !== 'racing' && phase !== 'done' && phase !== 'countdown') {
    Net.send({ type: 'start' });
    beginCountdown();
    startResultPoll();
  }

  if (data.type === 'start' && !isHost) {
    beginCountdown();
    startResultPoll();
  }

  if (data.type === 'pos') {
    const { x, y, angle, speed, lap, cp } = data;
    if (!isFinite(x) || x < -500 || x > 1700) return; // world is 1600 wide; was 1000 (too tight)
    if (!isFinite(y) || y < -500 || y > 2100) return; // world is 2000 tall; was 1200 (rejected main straight)
    if (!isFinite(angle)) return;
    // Normalize angle to [-PI, PI] to reject garbage large values from malicious peers
    const normalizedAngle = ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (!isFinite(speed) || speed < 0 || speed > MAX_SPD_ON * 1.5) return;
    if (typeof lap !== 'number' || lap < 0 || lap >= TOTAL_LAPS) return;
    if (typeof cp  !== 'number' || cp  < 0 || cp  >= CPS.length) return;
    // Multiplayer: remote car lives in cars[1]
    if (!cars[1]) return;
    cars[1].prevX      = cars[1].x;
    cars[1].prevY      = cars[1].y;
    cars[1].prevAngle  = cars[1].angle;
    cars[1].x          = x;
    cars[1].y          = y;
    cars[1].angle      = normalizedAngle;
    cars[1].speed      = speed;
    cars[1].lap        = lap;
    cars[1].nextCP     = cp;
    cars[1].lastUpdate = performance.now();
    // R3B-02: arm the remote car's lap convention on its first stripe crossing —
    // its packet-to-packet segment (prevX/Y → x/y) drives the same crossing test.
    if (!cars[1].startCrossed && crossedFinish(cars[1])) cars[1].startCrossed = true;
  }

  if (data.type === 'finish' && !winner) {
    // BUG-02: guard prevents premature win via spoofed finish message (T-01-01 threat mitigation)
    // cars[1].lap is the sender's lap — both host-receives-finish and guest-receives-finish paths
    // check this same guard, making it symmetric for both peers.
    if (!cars[1] || cars[1].lap < TOTAL_LAPS) return;
    winner = 1;
    phase  = 'done';
  }

  // Only host executes restart; guest sends request, host responds with 'start'
  if (data.type === 'restart' && isHost && phase === 'done') {
    beginCountdown(); // beginCountdown calls resetGame internally
    Net.send({ type: 'start' });
  }
}

function onDisconnect() {
  stopLoop();
  stopEngine(); stopBrakeSound(); stopMusic();
  Net.destroy();
  const modal = document.getElementById('disconnect-modal');
  if (modal) {
    modal.hidden = false;
    setTimeout(() => {
      modal.hidden = true;
      goTo('lobby');
    }, 3000);
  } else {
    goTo('lobby');
  }
}

// ── Game lifecycle ─────────────────────────────────────────────────────────────
function resetGame() {
  if (gameMode === 'solo') {
    // Solo: 2 cars — player vs the one selected rival
    cars = [
      Object.assign(makeCar(0), { isPlayer: true,  damage: 0, wpIdx: 0, rivalData: null,                          personality: null }),
      Object.assign(makeCar(1), { isPlayer: false, damage: 0, wpIdx: 1, rivalData: RIVALS[selectedRivalIdx], personality: personalityFor(RIVALS[selectedRivalIdx].skill) }),
    ];
  } else {
    // Multi: 2 cars — local player + remote peer
    const localIdx  = isHost ? 0 : 1;
    const remoteIdx = isHost ? 1 : 0;
    cars = [
      // cars[0] — local player
      Object.assign(makeCar(localIdx), { isPlayer: true, damage: 0, wpIdx: 0, rivalData: null }),
      // cars[1] — remote peer (includes net interpolation fields)
      Object.assign(makeCar(remoteIdx), {
        isPlayer: false, damage: 0, wpIdx: 0, rivalData: null,
        prevX: START[remoteIdx].x, prevY: START[remoteIdx].y,
        prevAngle: START[remoteIdx].a, lastUpdate: 0,
      }),
    ];
  }

  winner           = null;
  countdown        = 3;
  cdTimer          = 1;
  phase            = 'countdown';
  lapStartTime     = 0;
  lastLapMs        = 0;
  wrongWayTimer    = 0;
  sessionRecord    = false;
  recordFlashUntil = 0;
  wasOnTrack       = true;
  clearTimeout(shakeTimer); shakeTimer = null;
  canvasWrap.classList.remove('shake');
  hudTimer.textContent = '0:00.0';
  hudTimer.classList.remove('record');
  hudRole.textContent  = gameMode === 'solo' ? '' : (isHost ? 'HOST' : 'GUEST');
  hudRole.style.color = ''; hudRole.style.background = ''; hudRole.style.padding = '';
  floatingTexts      = [];
  cpFlash            = 0;
  damageWarningShown = 0;
  drsAvail           = false;
  drsActive          = false;
  updateDrsUI(false, false);
  confirmedRank      = null;      // overtake engine baseline re-established on first frame (R3B-04)
  pendingRank        = null;
  lastPassMsgAt      = -Infinity;
  lastLostMsgAt      = -Infinity;
  camReady           = false;     // camera re-centers on the grid (R3B W2-T4)
  stopBrakeSound();
  keys.left = false; keys.right = false; keys.down = false;
}

function beginCountdown() {
  resetGame();
  goTo('game');
  startLoop();
  try { startEngine(); } catch(_){}
}

// ── Input: keyboard ────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
  if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') keys.down  = true;
  if (e.key === ' ') { e.preventDefault(); keys.down = true; }  // CTRL-03: spacebar brake (preventDefault stops page scroll)
  // DRS-01: activate the boost with ArrowUp / W / Shift while racing
  if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === 'Shift') {
    if (e.key === 'ArrowUp') e.preventDefault();
    if (phase === 'racing' && cars[0]) activateDRS(cars[0]);
  }
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
  if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') keys.down  = false;
  if (e.key === ' ') keys.down = false;  // CTRL-03: spacebar brake release
});

// ── Input: touch buttons ───────────────────────────────────────────────────────
function bindTouch(id, flag) {
  const el = document.getElementById(id);
  if (!el) return;
  const on  = () => { keys[flag] = true;  el.classList.add('pressed'); };
  const off = () => { keys[flag] = false; el.classList.remove('pressed'); };
  // Pointer Events API covers mouse + touch + stylus uniformly;
  // pointerleave fires when finger slides off the button, fixing stuck-key bug
  el.addEventListener('pointerdown',   e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch(_){} on();  }, { passive: false });
  el.addEventListener('pointerup',     e => { e.preventDefault(); off(); }, { passive: false });
  el.addEventListener('pointercancel', e => { e.preventDefault(); off(); }, { passive: false });
  el.addEventListener('pointerleave',  e => { e.preventDefault(); off(); }, { passive: false });
}

bindTouch('touch-left',  'left');
bindTouch('touch-right', 'right');
bindTouch('touch-brake', 'down');

// DRS-01: tap the floating DRS button to activate the boost
if (drsBtn) {
  drsBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (phase === 'racing' && cars[0]) activateDRS(cars[0]);
  }, { passive: false });
}

// ── Screen management ─────────────────────────────────────────────────────────
function goTo(name) {
  if (name !== 'game') stopLoop();
  Object.values(SCR).forEach(s => s.classList.remove('active'));
  if (SCR[name]) SCR[name].classList.add('active');
}

// ── UI event listeners ─────────────────────────────────────────────────────────
document.getElementById('btn-create').addEventListener('click', () => {
  isHost = true;
  goTo('create');
  const waitingMsg = document.getElementById('waiting-msg');
  Net.create(
    code => { document.getElementById('room-code-display').textContent = code; },
    ()   => { /* guest connected → handled in onMsg */ },
    onMsg,
    onDisconnect,
    err  => {
      waitingMsg.textContent = `Error: ${err.type || 'no se pudo crear la sala'}. Vuelve e intenta de nuevo.`;
      waitingMsg.style.color = '#f97316';
    },
  );
});

document.getElementById('btn-cancel-create').addEventListener('click', () => {
  Net.destroy();
  goTo('lobby');
});

document.getElementById('btn-join-screen').addEventListener('click', () => {
  goTo('join');
  document.getElementById('join-error').textContent = '';
  document.getElementById('join-code-input').value = '';
});

document.getElementById('btn-connect').addEventListener('click', () => {
  const code = document.getElementById('join-code-input').value.trim();
  if (code.length < 6) {
    document.getElementById('join-error').textContent = 'El código debe tener 6 caracteres.';
    return;
  }
  isHost = false;
  document.getElementById('join-error').textContent = '';
  Net.join(
    code,
    () => Net.send({ type: 'ready' }),
    onMsg,
    onDisconnect,
    () => {
      document.getElementById('join-error').textContent = 'No se pudo conectar. Verifica el código.';
      Net.destroy();
      goTo('join');
    },
  );
});

document.getElementById('btn-cancel-join').addEventListener('click', () => {
  Net.destroy();
  goTo('lobby');
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  const code = document.getElementById('room-code-display').textContent.trim();
  const toast = document.getElementById('copy-toast');
  if (!toast) return;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showToast('¡Copiado!');
    }).catch(() => {
      showToast('Copia el código manualmente');
    });
  } else {
    // Fallback for file:// context or older browsers
    showToast('Copia el código manualmente');
  }
});

function buildRivalGrid() {
  let carouselIdx = 0;
  const grid = document.querySelector('.rival-grid');
  grid.innerHTML = '';
  RIVALS.forEach((r, idx) => {
    const diff = rivalDiff(r.skill);
    const wins = localStorage.getItem(`cr_rival_${idx}`);
    const card = document.createElement('div');
    card.className = 'rival-card';
    card.dataset.rivalIdx = idx;

    const band = document.createElement('div');
    band.className = 'rival-band';
    band.style.background = r.body;
    band.style.borderBottom = `3px solid ${r.accent}`;
    card.appendChild(band);

    const info = document.createElement('div');
    info.className = 'rival-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'rival-name';
    nameEl.textContent = r.name.split(' ').pop().toUpperCase() + ' ';
    const numSpan = document.createElement('span');
    numSpan.className = 'rival-num';
    numSpan.textContent = `#${r.num}`;
    nameEl.appendChild(numSpan);
    info.appendChild(nameEl);

    const teamEl = document.createElement('div');
    teamEl.className = 'rival-team';
    teamEl.textContent = r.team;
    info.appendChild(teamEl);

    const footer = document.createElement('div');
    footer.className = 'rival-footer';
    const diffSpan = document.createElement('span');
    diffSpan.className = 'rival-diff';
    diffSpan.style.color = diff.color;
    diffSpan.textContent = diff.label;
    footer.appendChild(diffSpan);
    if (wins === 'win') {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'rival-badge badge-win';
      badgeSpan.textContent = 'VENCIDO';
      footer.appendChild(badgeSpan);
    } else if (wins === 'loss') {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'rival-badge badge-loss';
      badgeSpan.textContent = 'REVANCHA';
      footer.appendChild(badgeSpan);
    }
    info.appendChild(footer);
    card.appendChild(info);

    grid.appendChild(card);
  });
  // Update win counter in title
  const wins = RIVALS.filter((_, i) => localStorage.getItem(`cr_rival_${i}`) === 'win').length;
  const titleEl = document.getElementById('rival-screen-title');
  if (titleEl) titleEl.textContent = wins > 0 ? `ELIGE TU RIVAL · ${wins}/${RIVALS.length}` : 'ELIGE TU RIVAL';
  // Bind click handlers
  document.querySelectorAll('.rival-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx    = parseInt(card.dataset.rivalIdx, 10);
      selectedRival    = RIVALS[idx];
      selectedRivalIdx = idx;
      gameMode = 'solo';
      isHost   = true;
      beginCountdown();
      startResultPoll();
    });
  });

  // Carousel state management (resets to 0 on each buildRivalGrid() call)
  function updateCarousel() {
    const narrow = window.innerWidth < 500;
    const cards = document.querySelectorAll('.rival-card');
    const indicator = document.getElementById('carousel-indicator');
    if (!narrow) {
      // Desktop: remove carousel-active (all cards show via CSS grid)
      cards.forEach(c => c.classList.remove('carousel-active'));
      if (indicator) indicator.textContent = '';
      return;
    }
    // Mobile: show only the card at carouselIdx
    cards.forEach((c, i) => c.classList.toggle('carousel-active', i === carouselIdx));
    if (indicator) indicator.textContent = `${carouselIdx + 1} / ${cards.length}`;
  }

  const prevBtn = document.getElementById('rival-prev');
  const nextBtn = document.getElementById('rival-next');
  if (prevBtn) {
    prevBtn.onclick = () => {
      const count = document.querySelectorAll('.rival-card').length;
      carouselIdx = (carouselIdx - 1 + count) % count;
      updateCarousel();
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      const count = document.querySelectorAll('.rival-card').length;
      carouselIdx = (carouselIdx + 1) % count;
      updateCarousel();
    };
  }

  updateCarousel();
}

document.getElementById('btn-solo').addEventListener('click', () => {
  try { getAudioCtx(); } catch(_){}
  // Cancel any in-flight animation timers before rebuilding
  rivalAnimTimers.forEach(clearTimeout);
  rivalAnimTimers = [];
  buildRivalGrid();
  goTo('rival');
  // Staggered card entrance animation
  const outer = setTimeout(() => {
    document.querySelectorAll('.rival-card').forEach((card, i) => {
      const t = setTimeout(() => card.classList.add('show'), i * 45);
      rivalAnimTimers.push(t);
    });
  }, 40);
  rivalAnimTimers.push(outer);
});

document.getElementById('btn-restart').addEventListener('click', () => {
  if (gameMode === 'multi') {
    if (isHost) {
      // beginCountdown() calls resetGame() internally — don't call it twice
      beginCountdown(); Net.send({ type: 'start' });
      startResultPoll();
    } else {
      // Guest requests restart; host will respond with 'start'.
      // Do NOT call startResultPoll() here — it fires when host sends 'start' (via onMsg).
      Net.send({ type: 'restart' });
    }
  } else {
    beginCountdown();
    startResultPoll();
  }
});

document.getElementById('btn-menu').addEventListener('click', () => {
  stopLoop();
  stopResultPoll();
  stopEngine();
  stopBrakeSound();
  stopMusic();
  if (gameMode === 'multi') Net.destroy();
  gameMode = 'multi';
  isHost   = false;
  goTo('lobby');
});

// Show results screen when game ends (poll phase)
let resultPollId = null;
function pollResults() {
  if (phase === 'done' && winner !== null) {
    stopLoop();
    const won = winner === 0;  // player wins if winner index is 0 (cars[0])
    document.getElementById('result-icon').textContent  = won ? '🏆' : '💨';
    document.getElementById('result-title').textContent = won ? '¡VAMOS COLAPINTO!' : '¡BUEN INTENTO!';
    if (gameMode === 'solo' && selectedRival) {
      const apellido = selectedRival.name.split(' ').pop().toUpperCase();
      const diff     = rivalDiff(selectedRival.skill);
      document.getElementById('result-sub').textContent = won
        ? `Le ganaste a ${apellido} (${diff.label}) 🇦🇷`
        : `${apellido} (${diff.label}) te ganó esta vez — ¡Revancha!`;
      // Save rival result: victories persist; only write loss if no prior result
      const rKey = `cr_rival_${selectedRivalIdx}`;
      if (won || !localStorage.getItem(rKey)) localStorage.setItem(rKey, won ? 'win' : 'loss');
    } else {
      document.getElementById('result-sub').textContent = won
        ? 'Completaste las 3 vueltas primero 🇦🇷'
        : 'El rival ganó esta vez — ¡Revancha!';
    }
    // Show best lap info — always render a best-lap line, with a --:-- placeholder
    // when no lap has ever been completed (criterion 5).
    if (resultLap) {
      if (isFinite(bestLapMs)) {
        resultLap.textContent = sessionRecord
          ? `⭐ RÉCORD: ${formatTime(bestLapMs)}`
          : `Mejor vuelta: ${formatTime(bestLapMs)}`;
      } else {
        resultLap.textContent = 'Mejor vuelta: --:--';
      }
    }
    goTo('results');
    stopResultPoll();
  }
}
function startResultPoll() {
  stopResultPoll();
  resultPollId = setInterval(pollResults, 300);
}
function stopResultPoll() {
  if (resultPollId) { clearInterval(resultPollId); resultPollId = null; }
}
// ── Rival selection screen ────────────────────────────────────────────────────
document.getElementById('btn-cancel-rival').addEventListener('click', () => goTo('lobby'));

// Unlock audio on first user gesture (required by iOS / Safari)
['click', 'touchstart'].forEach(ev =>
  document.addEventListener(ev, () => { try { getAudioCtx(); } catch(_){} }, { once: true })
);

updateLobbyRecord();
