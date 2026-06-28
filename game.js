'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_LAPS    = 3;
const MAX_SPD_ON    = 190;   // px/s on track
const MAX_SPD_OFF   = 72;    // px/s off track (gradual, not abrupt)
const AUTO_ACCEL    = 160;   // px/s² constant push (eq speed ≈ 145 px/s)
const FRICTION_K    = 1.1;   // speed lost per second (proportional)
const BRAKE_FORCE   = 350;   // px/s² when braking
const TURN_RATE     = 3.5;   // rad/s — min radius at eq speed = 145/(3.5×0.87)≈48px < ROAD_HALF_W=60
const NET_MS        = 50;    // position broadcast interval
const CAR_RADIUS    = 14;    // px, for car-car collision detection

// Circuit de Monaco — clockwise, 34-point polyline, world-space 480×640
// Sequence: Meta → Sainte-Dévote → Beau Rivage → Massenet → Casino → Mirabeau
//           → Grand Hotel Hairpin (U-turn) → Portier → Tunnel → Nouvelle Chicane
//           → Tabac → Swimming Pool → La Rascasse → Antony Noghès → Meta
const ROAD_HALF_W = 60;
const ROAD_SPINE = [
  // ── Meta / main straight (west → east, bottom of canvas) ──────────────────
  [ 60, 550], [130, 550], [220, 550],
  // ── Sainte-Dévote (tight right, climbing) ──────────────────────────────────
  [255, 545], [275, 530], [285, 510],
  // ── Beau Rivage + Massenet (uphill sweep toward Casino plateau) ────────────
  [290, 475], [295, 440], [305, 395],
  [320, 355],
  // ── Casino Square + Mirabeau (right then left, upper-right area) ──────────
  [345, 315], [365, 275], [375, 245],
  // ── Grand Hotel Hairpin (tightest turn — near U-turn, upper apex) ─────────
  [385, 215], [400, 195], [410, 185], [405, 175], [385, 175], [365, 182],
  // ── Mirabeau Bas + Portier (descending right toward tunnel) ───────────────
  [345, 200], [325, 230], [310, 265],
  // ── Tunnel (rightward run at sea level) ───────────────────────────────────
  [320, 295], [370, 310], [420, 315],
  // ── Nouvelle Chicane + Tabac (left-right after tunnel exit) ───────────────
  [440, 305], [435, 355], [415, 385],
  // ── Swimming Pool + La Rascasse (harbour chicane, tight right) ────────────
  [395, 420], [365, 465], [345, 495],
  // ── Antony Noghès (final right back to start/finish) ──────────────────────
  [300, 525], [240, 547],
  // ── Close loop (return to Meta) ───────────────────────────────────────────
  [ 60, 550],
];

// Monaco checkpoints {x,y,r} — must be hit in order; CP0 = META / finish line
const CPS = [
  { x: 130, y: 550, r: 80 },  // 0 META — main straight
  { x: 365, y: 265, r: 70 },  // 1 Casino / Mirabeau plateau
  { x: 400, y: 185, r: 65 },  // 2 Grand Hotel Hairpin apex
  { x: 415, y: 312, r: 70 },  // 3 Tunnel / post-tunnel exit
];

// Monaco starting grid [P1, P2, P3, P4] — main straight, 2×2 formation, pointing east (angle 0)
// 30px lateral spread, ~10px longitudinal — all positions verified isOnTrack()
const START = [
  { x: 185, y: 543, a: 0 },  // P1 — player (right column, front row)
  { x: 155, y: 543, a: 0 },  // P2 — AI car 1 (left column, front row)
  { x: 185, y: 553, a: 0 },  // P3 — AI car 2 (right column, back row)
  { x: 155, y: 553, a: 0 },  // P4 — AI car 3 (left column, back row)
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

// Monaco AI navigation waypoints — 24 points CW, extra density at hairpin & Rascasse
const AI_WAYPOINTS = [
  [130, 550],  //  0  Meta / main straight
  [220, 550],  //  1  main straight east
  [270, 535],  //  2  Sainte-Dévote entry
  [285, 510],  //  3  Sainte-Dévote apex
  [293, 455],  //  4  Beau Rivage climb
  [312, 375],  //  5  Massenet
  [355, 315],  //  6  Casino Square
  [368, 270],  //  7  Mirabeau entry
  [375, 245],  //  8  Mirabeau
  [387, 215],  //  9  Grand Hotel entry
  [404, 193],  // 10  hairpin outer
  [410, 183],  // 11  hairpin apex 1
  [400, 174],  // 12  hairpin apex 2 (tightest)
  [378, 176],  // 13  hairpin inner
  [360, 183],  // 14  hairpin exit
  [335, 215],  // 15  Mirabeau Bas descent
  [312, 270],  // 16  Portier
  [325, 300],  // 17  tunnel entry
  [395, 313],  // 18  tunnel mid
  [435, 310],  // 19  tunnel exit / Nouvelle Chicane
  [430, 370],  // 20  Tabac
  [405, 420],  // 21  Swimming Pool
  [355, 480],  // 22  La Rascasse
  [310, 525],  // 23  Antony Noghès
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
let prevPlayerRank  = Infinity; // tracks player classification for overtake celebration (CARS-04)
let shakeTimer      = null;
let rivalAnimTimers = [];  // cleared on each visit to avoid double-animation

// Floating feedback
let floatingTexts      = [];  // [{text,color,x,y,alpha,vy,size}]
let cpFlash            = 0;   // seconds remaining of checkpoint flash
let damageWarningShown = 0;   // last damage% when warning was shown

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
let engineOsc = null, engineOsc2 = null, engineGain = null;
let brakeNoiseNode = null, brakeGainNode = null;
let engineRunning = false;

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
  const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200; filter.Q.value = 1;
  engineGain = ac.createGain(); engineGain.gain.value = 0;
  engineOsc.connect(filter); engineOsc2.connect(filter); filter.connect(engineGain); engineGain.connect(ac.destination);
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
  engineRunning = false; engineOsc = null; engineOsc2 = null; engineGain = null;
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
// ROAD_SPINE tunnel: Portier [310,265] → [320,295] → [370,310] → [420,315] → [440,305]
// Extended slightly to cover the full tunnel visual section.
const TUNNEL_ZONE = { x1: 295, y1: 255, x2: 450, y2: 330 };

function drawTunnelRoof() {
  // Update car.inTunnel flag for each car (used by audio in Phase 3)
  cars.forEach(car => {
    car.inTunnel = (car.x >= TUNNEL_ZONE.x1 && car.x <= TUNNEL_ZONE.x2 &&
                    car.y >= TUNNEL_ZONE.y1 && car.y <= TUNNEL_ZONE.y2);
  });

  // Project the 4 corners of the tunnel bounding box into screen space
  const tl = project(TUNNEL_ZONE.x1, TUNNEL_ZONE.y1);
  const tr = project(TUNNEL_ZONE.x2, TUNNEL_ZONE.y1);
  const br = project(TUNNEL_ZONE.x2, TUNNEL_ZONE.y2);
  const bl = project(TUNNEL_ZONE.x1, TUNNEL_ZONE.y2);

  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTrack() {
  // Ground — Monaco city grey (replaces green)
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(0, 0, 480, 640);

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // ── Monaco environment colour blocks (drawn before tarmac so spine paints over) ──

  // Harbour water — blue area at the bottom-right (Swimming Pool / harbour zone)
  // World-space harbour: roughly x:330-460, y:280-500
  ctx.save();
  ctx.fillStyle = '#1a4a7a';
  const hw_tl = project(330, 280), hw_tr = project(460, 280);
  const hw_br = project(460, 510), hw_bl = project(330, 510);
  ctx.beginPath();
  ctx.moveTo(hw_tl.x, hw_tl.y);
  ctx.lineTo(hw_tr.x, hw_tr.y);
  ctx.lineTo(hw_br.x, hw_br.y);
  ctx.lineTo(hw_bl.x, hw_bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Casino / Mirabeau building block — upper-right area (Casino plateau zone)
  // World-space casino: roughly x:280-420, y:195-340
  ctx.save();
  ctx.fillStyle = '#c8c8c4';
  const cb_tl = project(280, 195), cb_tr = project(420, 195);
  const cb_br = project(420, 345), cb_bl = project(280, 345);
  ctx.beginPath();
  ctx.moveTo(cb_tl.x, cb_tl.y);
  ctx.lineTo(cb_tr.x, cb_tr.y);
  ctx.lineTo(cb_br.x, cb_br.y);
  ctx.lineTo(cb_bl.x, cb_bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Hairpin inner area — darker block to emphasise the U-turn
  ctx.save();
  ctx.fillStyle = '#2a2a3a';
  const hp_tl = project(335, 160), hp_tr = project(425, 160);
  const hp_br = project(425, 215), hp_bl = project(335, 215);
  ctx.beginPath();
  ctx.moveTo(hp_tl.x, hp_tl.y);
  ctx.lineTo(hp_tr.x, hp_tr.y);
  ctx.lineTo(hp_br.x, hp_br.y);
  ctx.lineTo(hp_bl.x, hp_bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Pit lane strip — dark tarmac alongside the main straight (south of spine)
  // World-space pit: x:60-250, y:558-580
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  const pl_tl = project(60, 558), pl_tr = project(250, 558);
  const pl_br = project(250, 578), pl_bl = project(60, 578);
  ctx.beginPath();
  ctx.moveTo(pl_tl.x, pl_tl.y);
  ctx.lineTo(pl_tr.x, pl_tr.y);
  ctx.lineTo(pl_br.x, pl_br.y);
  ctx.lineTo(pl_bl.x, pl_bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Kerb — dashed, slightly wider than tarmac (red/white armco-style) ─────────
  ctx.save();
  ctx.lineWidth = ROAD_HALF_W * 2 + 8;
  ctx.setLineDash([18, 18]);
  ctx.strokeStyle = '#dc2626'; drawSpinePath(); ctx.stroke();
  ctx.lineDashOffset = 18;
  ctx.strokeStyle = '#f8fafc'; drawSpinePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Tarmac
  ctx.lineWidth = ROAD_HALF_W * 2;
  ctx.strokeStyle = '#2d3748';
  drawSpinePath(); ctx.stroke();

  // Racing line dashes
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = 'rgba(251,191,36,0.22)';
  ctx.lineWidth = 2;
  drawSpinePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Start/finish chequered stripe — perpendicular to main straight (Monaco CP0: x=130, y=550)
  const pm1 = project(130, 550 - ROAD_HALF_W);
  const pm2 = project(130, 550 + ROAD_HALF_W);
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

  // META label
  ctx.fillStyle = 'rgba(248,250,252,0.75)';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('META', pm1.x + 14, pm1.y - 3);

  // Watermark
  const wm = project(240, 310);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('CIRCUIT DE MONACO · MONTE CARLO', wm.x, wm.y);
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

function resolveCarCollision(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist2 = dx * dx + dy * dy;
  const minDist = CAR_RADIUS * 2;
  if (dist2 >= minDist * minDist || dist2 === 0) return false;
  const dist = Math.sqrt(dist2);
  const nx = dx / dist, ny = dy / dist;
  const overlap = (minDist - dist) * 0.55;
  a.x -= nx * overlap; a.y -= ny * overlap;
  b.x += nx * overlap; b.y += ny * overlap;
  const aVn = (Math.cos(a.angle) * nx + Math.sin(a.angle) * ny) * a.speed;
  const bVn = (Math.cos(b.angle) * nx + Math.sin(b.angle) * ny) * b.speed;
  if (bVn - aVn >= 0) return true;
  const relV = aVn - bVn;
  a.speed = Math.max(0, a.speed - relV * 0.35);
  b.speed = Math.max(0, b.speed - relV * 0.35);
  return true;
}

// ── Checkpoint / lap logic ────────────────────────────────────────────────────
function checkCheckpoints(car) {
  if (car.finished) return;
  const cp = CPS[car.nextCP];
  const dx = car.x - cp.x, dy = car.y - cp.y;
  if (dx * dx + dy * dy < cp.r * cp.r) {
    if (car.nextCP === 0) {
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
          if (lastLapMs < bestLapMs) {
            bestLapMs = lastLapMs;
            sessionRecord = true;
            recordFlashUntil = performance.now() + 2000;
            localStorage.setItem('cr_best_lap_ms', bestLapMs);
            updateLobbyRecord();
            addFloatingText(`⚡ ¡VUELA, FRANCO!  ${formatTime(lastLapMs)}`, '#fbbf24', 240, 280, 14);
          }
        }
      }
      car.lap++;
      if (car.lap >= TOTAL_LAPS) {
        car.finished = true;
        return;
      }
    } else if (car.isPlayer) {
      cpFlash = 0.12;
    }
    car.nextCP = (car.nextCP + 1) % CPS.length;
  }
}

// ── Physics update ─────────────────────────────────────────────────────────────
function updateCar(car, dt, damage = 0) {
  if (car.finished) return;
  const onTrack = isOnTrack(car.x, car.y);
  const damageFactor = 1 - (Math.min(damage, 100) / 100) * 0.45;
  const maxSpd  = (onTrack ? MAX_SPD_ON : MAX_SPD_OFF) * damageFactor;

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

  // Move
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// ── AI driver ─────────────────────────────────────────────────────────────────
const AI_WP_REACH = 30; // px radius to advance to next waypoint (reduced for Monaco tight corners)

function updateAI(car, dt) {
  if (car.finished) return;

  // Derive skill from car.rivalData (per-car) — never from selectedRival global
  const skill = car.rivalData ? car.rivalData.skill : 0.88;

  // Personality multipliers (CARS-02) — fallback to consistent if missing
  const pers     = car.personality || PERSONALITIES.consistent;
  const noiseAmp = pers.noiseAmp;  // personality-driven noise amplitude

  // Navigate using fine-grained AI_WAYPOINTS (stays on road) — per-car wpIdx
  const wp = AI_WAYPOINTS[car.wpIdx];
  // Apply lineMult as a subtle lateral offset toward the apex (aggressive) or wider (defensive)
  // lineMult < 1 → tighter line; lineMult > 1 → wider line; offset is small to keep AI on track
  const lineOffset = (1.0 - pers.lineMult) * 5; // max ±5px lateral in world space
  const wpDx = wp[0] - car.x + lineOffset * Math.cos(car.angle + Math.PI / 2);
  const wpDy = wp[1] - car.y + lineOffset * Math.sin(car.angle + Math.PI / 2);

  if (wpDx * wpDx + wpDy * wpDy < AI_WP_REACH * AI_WP_REACH) {
    car.wpIdx = (car.wpIdx + 1) % AI_WAYPOINTS.length;
  }

  const targetAngle = Math.atan2(wpDy, wpDx);
  let diff = targetAngle - car.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const absDiff = Math.abs(diff);

  const steerPow = 0.70 + skill * 0.28;
  const maxTurn  = TURN_RATE * steerPow * dt;
  const noise    = (Math.random() - 0.5) * noiseAmp * dt;
  car.angle += Math.sign(diff) * Math.min(absDiff, maxTurn) + noise;

  // Brake before sharp corners — scale base factor (0.35) by personality brakeMult
  const braking  = absDiff > 0.65;
  const lapBonus = 1 + Math.min(car.lap, 2) * 0.04; // +4% per completed lap, max +8%
  // Apply personality speedMult to the AI's effective top speed (CARS-02)
  const aiMaxSpd = MAX_SPD_ON * skill * pers.speedMult * lapBonus * (braking ? 0.60 : 1.0);
  const onTrack  = isOnTrack(car.x, car.y);
  const maxSpd   = onTrack ? aiMaxSpd : MAX_SPD_OFF;
  car.speed += AUTO_ACCEL * dt;
  car.speed -= car.speed * FRICTION_K * dt;
  // brakeMult scales the base 0.35 factor — NOTE: 0.35 base intentional (AI-01/Phase 3 will raise to 0.70)
  if (braking) car.speed -= BRAKE_FORCE * 0.35 * pers.brakeMult * dt;
  car.speed = Math.max(0, Math.min(car.speed, maxSpd));

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// ── HUD update ────────────────────────────────────────────────────────────────
// CARS-04: clasificacion P1-P4 en tiempo real con desempate por distancia al CP
function updateHUD() {
  if (!cars[0]) return;
  const lap = Math.min(cars[0].lap + 1, TOTAL_LAPS);
  hudLap.textContent = `VUELTA ${lap}/${TOTAL_LAPS}`;

  // nextCP=0 means approaching finish line — worth CPS.length to avoid false 2nd
  const cpScore = c => c.finished ? Infinity : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);

  // Rank all cars by cpScore (highest = ahead), tiebreak by euclidean distance to next CP
  // (shorter distance = physically more ahead → ranks higher — Pitfall 6 fix)
  const ranked = cars
    .map((c, i) => {
      const score = cpScore(c);
      const cp = CPS[c.nextCP] || CPS[0];
      const distToCP = Math.sqrt((c.x - cp.x) ** 2 + (c.y - cp.y) ** 2);
      return { i, score, distToCP };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // higher score = ahead
      return a.distToCP - b.distToCP;                    // tiebreak: closer to CP = ahead
    });

  const playerRank = ranked.findIndex(r => r.i === 0) + 1; // 1-based
  hudPos.textContent = `P${playerRank}`;

  // Overtake detection — player moved up in classification
  if (playerRank < prevPlayerRank) {
    addFloatingText('¡LO PASÉ! ⚡', '#10b981', 240, 220, 20);
  }
  prevPlayerRank = playerRank;

  if (gameMode === 'solo') {
    // Gap display: find the car immediately ahead of the player in ranking
    const playerScore = cpScore(cars[0]);
    const rivals = cars.slice(1);
    if (rivals.length > 0) {
      const myP = playerScore;
      // Find nearest rival (closest cpScore)
      const nearestRival = rivals.reduce((best, c) => {
        return Math.abs(cpScore(c) - myP) < Math.abs(cpScore(best) - myP) ? c : best;
      }, rivals[0]);
      const itsP = cpScore(nearestRival);
      const diff = myP - itsP;
      let gapText, gapColor;
      if (Math.abs(diff) < 0.5) {
        const dist = Math.sqrt((cars[0].x - nearestRival.x) ** 2 + (cars[0].y - nearestRival.y) ** 2);
        gapText  = `~${(dist / 190).toFixed(1)}s`;
        gapColor = '#94a3b8';
      } else {
        const secs = (Math.abs(diff) * 1.4).toFixed(1);
        gapText  = diff > 0 ? `+${secs}s` : `-${secs}s`;
        gapColor = diff > 0 ? '#10b981' : '#ef4444';
      }
      hudRole.textContent        = gapText;
      hudRole.style.color        = gapColor;
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
  const center = project(240, 310);
  const grad = ctx.createRadialGradient(center.x, center.y, 100, center.x, center.y, 290);
  grad.addColorStop(0,   `rgba(180,0,0,0)`);
  grad.addColorStop(0.5, `rgba(180,0,0,0)`);
  grad.addColorStop(1,   `rgba(180,0,0,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 640);
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
    drawTrack();
    // Draw all cars in countdown (back to front)
    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      drawCar(cars[1], 1);
      drawCar(cars[0], 0);
    }
    drawCountdown(countdown);

    if (cdTimer <= 0) {
      countdown--;
      if (countdown < 0) {
        phase = 'racing';
        lapStartTime = performance.now(); // BUG-04: lapStartTime correctly initialized here (verified)
        playGoSound();
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

      // Car-car collision: all 6 pairs among 4 cars (CARS-03)
      PAIRS.forEach(([i, j]) => {
        const a = cars[i], b = cars[j];
        if (!a || !b || a.finished || b.finished) return;
        // Compute approach velocity before resolving (used for damage scaling)
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist, ny = dy / dist;
        const vA = Math.cos(a.angle) * a.speed * nx + Math.sin(a.angle) * a.speed * ny;
        const vB = Math.cos(b.angle) * b.speed * nx + Math.sin(b.angle) * b.speed * ny;
        if (resolveCarCollision(a, b)) {
          const relV = Math.abs(vA - vB);
          const baseDmg = Math.min(6, 1 + relV * 0.02);
          // Only player (cars[0]) accumulates damage for HUD display
          if (i === 0) {
            // cars[j] hit cars[0]: scale damage by AI's damageMult (aggressive hits harder)
            const aiDamageMult = (b.personality ? b.personality.damageMult : 1.0);
            const playerIsAggressor = vA > vB + 5;
            cars[0].damage = Math.min(100, cars[0].damage + (playerIsAggressor ? baseDmg : baseDmg * 0.15) * aiDamageMult);
            playCollisionSound();
          } else if (j === 0) {
            // cars[i] hit cars[0]: scale damage by AI's damageMult
            const aiDamageMult = (a.personality ? a.personality.damageMult : 1.0);
            const playerIsAggressor = vB > vA + 5;
            cars[0].damage = Math.min(100, cars[0].damage + (playerIsAggressor ? baseDmg : baseDmg * 0.15) * aiDamageMult);
            playCollisionSound();
          }
          // AI vs AI collisions: play sound only if close to player (optional ambience)
          // No damage accumulation for AI-vs-AI pairs
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

    updateHUD();

    // Engine pitch tracks player speed
    updateEnginePitch(cars[0].speed);
    // Brake squeal (player only)
    if (keys.down && cars[0].speed > 20) startBrakeSound();
    else stopBrakeSound();

    // Render — draw back-to-front so player (cars[0]) is on top
    drawTrack();

    // BUG-OFFTRACK fix: draw off-track vignette BEFORE cars so cars always render on top
    const onTrk = isOnTrack(cars[0].x, cars[0].y);
    if (!onTrk) {
      drawOffTrackVignette(0.55);
    }

    if (gameMode === 'solo') {
      // Draw in reverse order: cars[3], cars[2], cars[1], cars[0]
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      // Multiplayer: interpolate remote car position
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }
    // Tunnel roof drawn AFTER all drawCar() so it darkens cars inside the tunnel
    drawTunnelRoof();

    // Off-track damage + shake (player car only) — damage logic kept here, vignette moved above
    if (!onTrk) {
      cars[0].damage = Math.min(100, cars[0].damage + 1.5 * dt);
      if (wasOnTrack) {
        cars[0].damage = Math.min(100, cars[0].damage + 3);
        clearTimeout(shakeTimer);
        canvasWrap.classList.remove('shake');
        void canvasWrap.offsetWidth;
        canvasWrap.classList.add('shake');
        shakeTimer = setTimeout(() => canvasWrap.classList.remove('shake'), 320);
      }
    }
    wasOnTrack = onTrk;

    // Checkpoint flash (green border sweep)
    if (cpFlash > 0) {
      cpFlash -= dt;
      const a2 = Math.min(1, cpFlash * 6);
      ctx.strokeStyle = `rgba(16,185,129,${a2 * 0.7})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 470, 630);
    }

    // Floating text overlays
    drawFloatingTexts(dt);

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

    // Damage bar drawn last so it's always on top
    drawDamageBar(cars[0].damage);

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
        // Player destroyed — find the furthest-ahead non-player car (CR-01)
        const cpScore = c => c.finished ? Infinity
          : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
        let bestIdx = 1, bestScore = -Infinity;
        for (let i = 1; i < cars.length; i++) {
          const s = cpScore(cars[i]);
          if (s > bestScore) { bestScore = s; bestIdx = i; }
        }
        winner = bestIdx;
      }
      if (winner !== null) {
        stopEngine(); stopBrakeSound();
        if (gameMode === 'multi' && winner === 0) Net.send({ type: 'finish' });
        phase = 'done';
      }
    }
  } else if (phase === 'done') {
    drawTrack();
    if (gameMode === 'solo') {
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i], i);
    } else {
      const rp = remoteRenderPos();
      drawCar({ ...rp, finished: cars[1].finished, rivalData: null, isPlayer: false }, 1);
      drawCar(cars[0], 0);
    }
    // Tunnel roof drawn AFTER all drawCar() in done phase as well
    drawTunnelRoof();
    drawWin(winner === 0);
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
    if (!isFinite(x) || x < -500 || x > 1000) return;
    if (!isFinite(y) || y < -500 || y > 1200) return;
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
    // Solo: 4 cars — player + 3 AI opponents
    // Select 3 AI rivals bracketing the selected rival's skill
    const pivotIdx = selectedRivalIdx;
    const candidateIndices = [
      pivotIdx,
      Math.max(0, pivotIdx - 1),
      Math.min(RIVALS.length - 1, pivotIdx + 1),
      Math.min(RIVALS.length - 1, pivotIdx + 2),
    ];
    // Deduplicate, exclude duplicate of same rival (keep selected + 2 different neighbors)
    const seen = new Set();
    const aiIndices = [];
    // Always include the selected rival first, then unique neighbors
    for (const idx of candidateIndices) {
      if (!seen.has(idx) && aiIndices.length < 3) {
        seen.add(idx);
        aiIndices.push(idx);
      }
    }
    // If we still don't have 3 (e.g. at edge of array), fill from RIVALS
    for (let i = 0; aiIndices.length < 3 && i < RIVALS.length; i++) {
      if (!seen.has(i)) { seen.add(i); aiIndices.push(i); }
    }

    // Assign one personality per AI car — one of each type per race (CARS-02)
    const personalityOrder = ['aggressive', 'defensive', 'consistent'];

    cars = [
      // cars[0] — player (Colapinto)
      Object.assign(makeCar(0), { isPlayer: true, damage: 0, wpIdx: 0, rivalData: null, personality: null }),
      // cars[1–3] — AI opponents with staggered waypoints and distinct personalities
      Object.assign(makeCar(1), { isPlayer: false, damage: 0, wpIdx: 0, rivalData: RIVALS[aiIndices[0]], personality: PERSONALITIES[personalityOrder[0]] }),
      Object.assign(makeCar(2), { isPlayer: false, damage: 0, wpIdx: 2, rivalData: RIVALS[aiIndices[1]], personality: PERSONALITIES[personalityOrder[1]] }),
      Object.assign(makeCar(3), { isPlayer: false, damage: 0, wpIdx: 4, rivalData: RIVALS[aiIndices[2]], personality: PERSONALITIES[personalityOrder[2]] }),
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
  prevPlayerRank     = Infinity;  // suppress spurious overtake on race start — CARS-04 HUD P1-P4 (WR-04)
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
    // Show best lap info
    if (resultLap) {
      if (lastLapMs > 0 && isFinite(bestLapMs)) {
        const isNew = sessionRecord;
        resultLap.textContent = isNew
          ? `⭐ RÉCORD: ${formatTime(bestLapMs)}`
          : `Mejor vuelta: ${formatTime(bestLapMs)}`;
      } else {
        resultLap.textContent = '';
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
