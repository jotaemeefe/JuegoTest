'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_LAPS    = 3;
const MAX_SPD_ON    = 220;   // px/s on track
const MAX_SPD_OFF   = 55;    // px/s off track
const AUTO_ACCEL    = 200;   // px/s² constant push (eq speed ≈ 200 px/s)
const FRICTION_K    = 1.0;   // speed lost per second (proportional)
const BRAKE_FORCE   = 400;   // px/s² when braking
const TURN_RATE     = 2.8;   // rad/s max turn speed
const NET_MS        = 50;    // position broadcast interval
const CAR_RADIUS    = 14;    // px, for car-car collision detection

// Street circuit — Buenos Aires (polyline spine, 17 points)
const ROAD_HALF_W = 30;
const ROAD_SPINE = [
  // ── Main straight (east) + Turn 1 braking zone ────────────────────────────
  [ 82, 553], [322, 553], [368, 524], [403, 476],
  // ── Back straight (north) ─────────────────────────────────────────────────
  [408, 300], [408, 168],
  // ── Top hairpin complex — Turns 3-4 ───────────────────────────────────────
  [390, 110], [352,  86], [294,  86], [234, 110],
  // ── Technical S-curve section — Turns 5-6 ────────────────────────────────
  [198, 164], [168, 242], [186, 328],
  // ── Bottom-left hairpin — Turns 7-8 ──────────────────────────────────────
  [162, 408], [108, 456], [ 68, 512],
  // ── Return to main straight ───────────────────────────────────────────────
  [ 82, 553],
];

// Checkpoints {x,y,r} — must be hit in order; CP0 = META / finish line
const CPS = [
  { x: 200, y: 553, r: 55 },  // 0 META — main straight
  { x: 408, y: 322, r: 52 },  // 1 back straight (right side)
  { x: 323, y:  86, r: 55 },  // 2 top hairpin
  { x: 162, y: 378, r: 55 },  // 3 S-curve / bottom-left entry
];

// Starting grid [host, guest] — main straight, pointing east
const START = [
  { x: 270, y: 551, a: 0 },
  { x: 238, y: 558, a: 0 },
];

// Visual style for Colapinto — Alpine BWT
// Visual style for Colapinto — Alpine BWT (the player's car)
const CAR_STYLE_HOST = { body: '#0090d0', stripe: '#f569b7', cockpit: '#001f3f', helmet: '#74c0fc', num: '43' };

// Full 2025 F1 grid — body/accent = team livery, helmet = driver's signature helmet colour
// skill = AI speed factor (1.0 = same max speed as player)
const RIVALS = [
  // ── Red Bull Racing ──────────────────────────────────────────────────────────
  { name:'Max Verstappen',    team:'Red Bull Racing',   num:'1',  body:'#1d2f6a', accent:'#ffd700', helmet:'#cc1100', skill:0.96 },
  { name:'Yuki Tsunoda',      team:'Red Bull Racing',   num:'22', body:'#1d2f6a', accent:'#ffd700', helmet:'#ef4444', skill:0.88 },
  // ── Scuderia Ferrari ─────────────────────────────────────────────────────────
  { name:'Charles Leclerc',   team:'Scuderia Ferrari',  num:'16', body:'#cc0000', accent:'#f8fafc', helmet:'#cc0000', skill:0.92 },
  { name:'Lewis Hamilton',    team:'Scuderia Ferrari',  num:'44', body:'#cc0000', accent:'#f8fafc', helmet:'#1a1a1a', skill:0.94 },
  // ── McLaren F1 Team ──────────────────────────────────────────────────────────
  { name:'Lando Norris',      team:'McLaren F1 Team',   num:'4',  body:'#ff6b00', accent:'#1a1a1a', helmet:'#ff6b00', skill:0.93 },
  { name:'Oscar Piastri',     team:'McLaren F1 Team',   num:'81', body:'#ff6b00', accent:'#ffd700', helmet:'#ffd700', skill:0.89 },
  // ── Mercedes-AMG Petronas ────────────────────────────────────────────────────
  { name:'George Russell',    team:'Mercedes-AMG',      num:'63', body:'#1e293b', accent:'#00d2be', helmet:'#ffd700', skill:0.90 },
  { name:'Kimi Antonelli',    team:'Mercedes-AMG',      num:'12', body:'#1e293b', accent:'#00d2be', helmet:'#cc0000', skill:0.84 },
  // ── Aston Martin ─────────────────────────────────────────────────────────────
  { name:'Fernando Alonso',   team:'Aston Martin',      num:'14', body:'#005540', accent:'#c0a030', helmet:'#1a1a1a', skill:0.91 },
  { name:'Lance Stroll',      team:'Aston Martin',      num:'18', body:'#005540', accent:'#c0a030', helmet:'#1d4ed8', skill:0.81 },
  // ── BWT Alpine F1 ────────────────────────────────────────────────────────────
  { name:'Pierre Gasly',      team:'BWT Alpine',        num:'10', body:'#0090d0', accent:'#f569b7', helmet:'#1565c0', skill:0.87 },
  { name:'Franco Colapinto',  team:'BWT Alpine',        num:'43', body:'#0090d0', accent:'#f569b7', helmet:'#74c0fc', skill:0.85 },
  // ── Williams Racing ──────────────────────────────────────────────────────────
  { name:'Alexander Albon',   team:'Williams Racing',   num:'23', body:'#003087', accent:'#e8f4ff', helmet:'#cc0000', skill:0.86 },
  { name:'Carlos Sainz',      team:'Williams Racing',   num:'55', body:'#003087', accent:'#e8f4ff', helmet:'#ffd700', skill:0.88 },
  // ── MoneyGram Haas F1 ────────────────────────────────────────────────────────
  { name:'Esteban Ocon',      team:'Haas F1 Team',      num:'31', body:'#1c1c1c', accent:'#cc0000', helmet:'#1d4ed8', skill:0.85 },
  { name:'Oliver Bearman',    team:'Haas F1 Team',      num:'87', body:'#1c1c1c', accent:'#cc0000', helmet:'#cc0000', skill:0.79 },
  // ── Kick Sauber ──────────────────────────────────────────────────────────────
  { name:'Nico Hülkenberg',   team:'Kick Sauber',       num:'27', body:'#111111', accent:'#22c55e', helmet:'#22c55e', skill:0.86 },
  { name:'Gabriel Bortoleto', team:'Kick Sauber',       num:'5',  body:'#111111', accent:'#22c55e', helmet:'#065f46', skill:0.80 },
  // ── Visa Cash App Racing Bulls ───────────────────────────────────────────────
  { name:'Liam Lawson',       team:'Racing Bulls',      num:'30', body:'#0f172a', accent:'#ef4444', helmet:'#1a1a1a', skill:0.84 },
  { name:'Isack Hadjar',      team:'Racing Bulls',      num:'6',  body:'#0f172a', accent:'#ef4444', helmet:'#1d4ed8', skill:0.82 },
];

function rivalDiff(skill) {
  if (skill >= 0.92) return { label: 'ÉLITE',    color: '#ef4444' };
  if (skill >= 0.88) return { label: 'EXPERTO',  color: '#f97316' };
  if (skill >= 0.84) return { label: 'DURO',     color: '#fbbf24' };
  return                     { label: 'MEDIO',    color: '#22c55e' };
}

// Fine-grained AI navigation waypoints — Buenos Aires street circuit, 21 points CW
const AI_WAYPOINTS = [
  [200, 551],  // 0  main straight (META zone)
  [290, 551],  // 1  main straight east
  [348, 543],  // 2  T1 braking zone
  [370, 526],  // 3  T1 apex
  [403, 478],  // 4  T2 exit / back straight entry
  [408, 390],  // 5  back straight lower
  [408, 300],  // 6  back straight mid (CP1)
  [408, 210],  // 7  back straight upper
  [405, 168],  // 8  approaching T3
  [390, 112],  // 9  T3 entry
  [352,  88],  // 10 T3-4 hairpin apex
  [294,  88],  // 11 T4 section
  [234, 112],  // 12 T4-5 exit
  [198, 165],  // 13 T5 chicane entry
  [168, 243],  // 14 S-curve left
  [186, 328],  // 15 S-curve right (CP3 zone)
  [162, 408],  // 16 S-curve exit
  [108, 457],  // 17 T7 left
  [ 68, 512],  // 18 T8 hairpin apex
  [ 82, 548],  // 19 T8 exit
  [130, 551],  // 20 re-join main straight
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

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
  return { x: s.x, y: s.y, angle: s.a, speed: 0, lap: 0, nextCP: 1, finished: false };
}

let local  = makeCar(0);
let remote = Object.assign(makeCar(1), {
  prevX: START[1].x, prevY: START[1].y, prevAngle: START[1].a,
  lastUpdate: 0,
});

let countdown   = 3;
let cdTimer     = 0;
let lastNetSend = 0;
let lastTime    = 0;
let rafId       = null;
let winner      = null;  // 'local' | 'remote'
let localDamage = 0;     // 0–100 accumulated damage
let aiWpIdx     = 0;     // AI waypoint index

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
  if (!isFinite(ms) || ms <= 0) return '0:00.0';
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

// ── Track drawing ─────────────────────────────────────────────────────────────
function drawSpinePath() {
  ctx.beginPath();
  ROAD_SPINE.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
}

function drawTrack() {
  // Grass background
  ctx.fillStyle = '#1a4a10';
  ctx.fillRect(0, 0, 480, 640);

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Kerb — dashed, slightly wider than tarmac
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

  // Start/finish chequered stripe — vertical, perpendicular to main straight (east-west)
  const flX = 163, flYT = 553 - ROAD_HALF_W, flYB = 553 + ROAD_HALF_W;
  for (let i = 0, y = flYT; y < flYB; y += 8, i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#111827';
    ctx.fillRect(flX - 3, y, 6, 8);
  }
  ctx.fillStyle = 'rgba(248,250,252,0.75)';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('META', flX, flYT - 3);

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('CIRCUITO COLAPINTO · BUENOS AIRES', 240, 340);
}

// ── Car drawing ───────────────────────────────────────────────────────────────
function carStyle(styleIdx) {
  if (styleIdx === 0) return CAR_STYLE_HOST;
  const r = selectedRival;
  return { body: r.body, stripe: r.accent, cockpit: '#0d0d0d', helmet: r.helmet, num: r.num };
}

function drawCar(car, styleIdx) {
  const s = carStyle(styleIdx);
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + Math.PI / 2);   // angle 0 = east; +π/2 so car "nose" points in angle dir

  // Body
  ctx.fillStyle = s.body;
  ctx.fillRect(-9, -22, 18, 42);

  // Colour stripe (side pod accent)
  ctx.fillStyle = s.stripe;
  ctx.fillRect(-9, -4, 3, 16);
  ctx.fillRect(6, -4, 3, 16);

  // Front wing
  ctx.fillStyle = s.stripe;
  ctx.fillRect(-13, -22, 26, 5);

  // Rear wing
  ctx.fillRect(-14, 17, 28, 4);

  // Cockpit / halo
  ctx.fillStyle = '#111';
  ctx.fillRect(-5, -10, 10, 18);
  // Helmet (driver's signature colour)
  ctx.fillStyle = s.helmet || '#555';
  ctx.beginPath();
  ctx.ellipse(0, -2, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Visor (dark tinted strip)
  ctx.fillStyle = 'rgba(10, 20, 40, 0.88)';
  ctx.fillRect(-3, -5, 6, 3.5);

  // Number plate
  if (s.num) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.num, 0, 4);
  }

  ctx.restore();
}

// ── Remote car interpolation ───────────────────────────────────────────────────
function remoteRenderPos() {
  const age = (performance.now() - remote.lastUpdate) / 1000;
  // Simple dead-reckoning from last known state
  return {
    x:     remote.x + Math.cos(remote.angle) * remote.speed * Math.min(age, 0.15),
    y:     remote.y + Math.sin(remote.angle) * remote.speed * Math.min(age, 0.15),
    angle: remote.angle,
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
  a.speed = Math.max(0, a.speed - relV * 0.4);
  b.speed = Math.max(0, b.speed - relV * 0.25);
  return true;
}

// ── Checkpoint / lap logic ────────────────────────────────────────────────────
function checkCheckpoints(car) {
  if (car.finished) return;
  const cp = CPS[car.nextCP];
  const dx = car.x - cp.x, dy = car.y - cp.y;
  if (dx * dx + dy * dy < cp.r * cp.r) {
    if (car.nextCP === 0) {
      if (car === local) {
        cpFlash = 0.30;
        if (lapStartTime > 0) {
          lastLapMs = performance.now() - lapStartTime;
          lapStartTime = performance.now();
          const lapNum = car.lap + 1;
          if (lapNum <= TOTAL_LAPS) {
            addFloatingText(`VUELTA ${lapNum} / ${TOTAL_LAPS}`, '#f8fafc', 240, 250, 22);
          }
          if (lastLapMs < bestLapMs) {
            bestLapMs = lastLapMs;
            sessionRecord = true;
            recordFlashUntil = performance.now() + 2000;
            localStorage.setItem('cr_best_lap_ms', bestLapMs);
            updateLobbyRecord();
            addFloatingText(`⚡ VUELTA RÁPIDA  ${formatTime(lastLapMs)}`, '#fbbf24', 240, 280, 14);
          }
        } else {
          lapStartTime = performance.now();
        }
      }
      car.lap++;
      if (car.lap >= TOTAL_LAPS) {
        car.finished = true;
        return;
      }
    } else if (car === local) {
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
  // Brake (keyboard ↓ or touch)
  if (keys.down) car.speed -= BRAKE_FORCE * dt;
  // Clamp
  car.speed = Math.max(0, Math.min(car.speed, maxSpd));

  // Steering (rate scales with speed so it feels natural)
  const turnFactor = Math.min(1, 0.3 + car.speed / MAX_SPD_ON * 0.7);
  if (keys.left)  car.angle -= TURN_RATE * turnFactor * dt;
  if (keys.right) car.angle += TURN_RATE * turnFactor * dt;

  // Move
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// ── AI driver ─────────────────────────────────────────────────────────────────
const AI_WP_REACH = 48; // px radius to advance to next waypoint

function updateAI(car, dt) {
  if (car.finished) return;

  const skill    = selectedRival ? selectedRival.skill : 0.88;
  const noiseAmp = 0.055 - skill * 0.038; // elite: ~0.017, medio: ~0.055

  // Navigate using fine-grained AI_WAYPOINTS (stays on road)
  const wp = AI_WAYPOINTS[aiWpIdx];
  const dx = wp[0] - car.x, dy = wp[1] - car.y;
  if (dx * dx + dy * dy < AI_WP_REACH * AI_WP_REACH) {
    aiWpIdx = (aiWpIdx + 1) % AI_WAYPOINTS.length;
  }

  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - car.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const absDiff = Math.abs(diff);

  const steerPow = 0.70 + skill * 0.28;
  const maxTurn  = TURN_RATE * steerPow * dt;
  const noise    = (Math.random() - 0.5) * noiseAmp * dt;
  car.angle += Math.sign(diff) * Math.min(absDiff, maxTurn) + noise;

  // Brake before sharp corners
  const braking  = absDiff > 0.65;
  const aiMaxSpd = MAX_SPD_ON * skill * (braking ? 0.60 : 1.0);
  const onTrack  = isOnTrack(car.x, car.y);
  const maxSpd   = onTrack ? aiMaxSpd : MAX_SPD_OFF;
  car.speed += AUTO_ACCEL * dt;
  car.speed -= car.speed * FRICTION_K * dt;
  if (braking) car.speed -= BRAKE_FORCE * 0.35 * dt;
  car.speed = Math.max(0, Math.min(car.speed, maxSpd));

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// ── HUD update ────────────────────────────────────────────────────────────────
function updateHUD() {
  const lap = Math.min(local.lap + 1, TOTAL_LAPS);
  hudLap.textContent = `VUELTA ${lap}/${TOTAL_LAPS}`;

  // nextCP=0 means approaching finish line — worth CPS.length to avoid false 2nd
  const cpScore = c => c.finished ? Infinity : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
  hudPos.textContent = cpScore(local) >= cpScore(remote) ? '1°' : '2°';

  if (gameMode === 'solo' && selectedRival) {
    const cpScore  = c => c.finished ? Infinity : c.lap * CPS.length + (c.nextCP === 0 ? CPS.length : c.nextCP);
    const myP = cpScore(local), itsP = cpScore(remote);
    const diff = myP - itsP;
    let gapText, gapColor;
    if (Math.abs(diff) < 0.5) {
      const dist = Math.sqrt((local.x - remote.x) ** 2 + (local.y - remote.y) ** 2);
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
    ctx.fillText('CIRCUITO COLAPINTO', 240, 440);
    ctx.fillStyle = '#00a0e9';
    ctx.font = '11px monospace';
    ctx.fillText('BUENOS AIRES · ARGENTINA', 240, 458);
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
  const grad = ctx.createRadialGradient(240, 320, 140, 240, 320, 340);
  grad.addColorStop(0,   `rgba(180,0,0,0)`);
  grad.addColorStop(0.6, `rgba(180,0,0,0)`);
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
function loop(ts) {
  const dt = lastTime === 0 ? 0.016 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (phase === 'countdown') {
    cdTimer -= dt;
    drawTrack();
    drawCar(remote, isHost ? 1 : 0);
    drawCar(local,  isHost ? 0 : 1);
    drawCountdown(countdown);

    if (cdTimer <= 0) {
      countdown--;
      if (countdown < 0) {
        phase = 'racing';
        lapStartTime = performance.now();
        playGoSound();
      } else {
        cdTimer = 1;
      }
    }
  } else if (phase === 'racing') {
    updateCar(local, dt, localDamage);
    checkCheckpoints(local);
    updateHUD();

    // AI update (solo mode) or broadcast position (multi)
    if (gameMode === 'solo') {
      updateAI(remote, dt);
      checkCheckpoints(remote);
    } else if (ts - lastNetSend >= NET_MS) {
      lastNetSend = ts;
      Net.send({
        type: 'pos',
        x: local.x, y: local.y, angle: local.angle,
        speed: local.speed, lap: local.lap, cp: local.nextCP,
      });
    }

    // Car-car collision (solo only)
    if (gameMode === 'solo') {
      const dx = remote.x - local.x, dy = remote.y - local.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist, ny = dy / dist;
      // Relative approach speed along collision normal
      const vLocal  = Math.cos(local.angle)  * local.speed  * nx + Math.sin(local.angle)  * local.speed  * ny;
      const vRemote = Math.cos(remote.angle) * remote.speed * nx + Math.sin(remote.angle) * remote.speed * ny;
      if (resolveCarCollision(local, remote)) {
        const relV = Math.abs(vLocal - vRemote);
        // Player takes less damage when they are the one being rear-ended
        const playerIsHitter = vLocal > vRemote + 10;
        const dmg = Math.min(22, 4 + relV * 0.06);
        localDamage = Math.min(100, localDamage + (playerIsHitter ? dmg : dmg * 0.35));
        playCollisionSound();
      }
    }

    // Engine pitch tracks speed
    updateEnginePitch(local.speed);
    // Brake squeal
    if (keys.down && local.speed > 20) startBrakeSound();
    else stopBrakeSound();

    // Render
    const rp = gameMode === 'solo' ? remote : remoteRenderPos();
    drawTrack();
    drawCar({ ...rp, finished: remote.finished }, isHost ? 1 : 0);
    drawCar(local, isHost ? 0 : 1);

    // Off-track feedback + damage
    const onTrk = isOnTrack(local.x, local.y);
    if (!onTrk) {
      drawOffTrackVignette(0.55);
      localDamage = Math.min(100, localDamage + 3 * dt);
      if (wasOnTrack) {
        localDamage = Math.min(100, localDamage + 8);
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
      const a = Math.min(1, cpFlash * 6);
      ctx.strokeStyle = `rgba(16,185,129,${a * 0.7})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 470, 630);
    }

    // Floating text overlays
    drawFloatingTexts(dt);

    // Damage warning at 60% / 80%
    if (localDamage >= 60 && damageWarningShown < 60) {
      damageWarningShown = 60;
      addFloatingText('⚠ DAÑO ALTO', '#f97316', 240, 200, 18);
    } else if (localDamage >= 80 && damageWarningShown < 80) {
      damageWarningShown = 80;
      addFloatingText('⛔ COCHE CRÍTICO', '#ef4444', 240, 200, 20);
    }

    // Damage bar drawn last so it's always on top
    drawDamageBar(localDamage);

    // Lap timer HUD
    if (lapStartTime > 0) {
      const elapsed = performance.now() - lapStartTime;
      const isRecord = performance.now() < recordFlashUntil;
      hudTimer.textContent = formatTime(elapsed);
      hudTimer.classList.toggle('record', isRecord);
    }

    // Win / total-damage check
    if (!winner) {
      if (localDamage >= 100) {
        winner = 'remote'; stopEngine(); stopBrakeSound(); phase = 'done';
      } else if (local.finished) {
        winner = 'local'; stopEngine(); stopBrakeSound();
        if (gameMode === 'multi') Net.send({ type: 'finish' });
        phase = 'done';
      } else if (gameMode === 'solo' && remote.finished) {
        winner = 'remote'; stopEngine(); stopBrakeSound(); phase = 'done';
      }
    }
  } else if (phase === 'done') {
    const rp = gameMode === 'solo' ? remote : remoteRenderPos();
    drawTrack();
    drawCar({ ...rp }, isHost ? 1 : 0);
    drawCar(local, isHost ? 0 : 1);
    drawWin(winner === 'local');
  }

  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  lastTime = 0;
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
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
    if (!isFinite(speed) || speed < 0 || speed > MAX_SPD_ON * 1.5) return;
    if (typeof lap !== 'number' || lap < 0 || lap > TOTAL_LAPS) return;
    if (typeof cp  !== 'number' || cp  < 0 || cp  >= CPS.length) return;
    remote.prevX      = remote.x;
    remote.prevY      = remote.y;
    remote.prevAngle  = remote.angle;
    remote.x          = x;
    remote.y          = y;
    remote.angle      = angle;
    remote.speed      = speed;
    remote.lap        = lap;
    remote.nextCP     = cp;
    remote.lastUpdate = performance.now();
  }

  if (data.type === 'finish' && !winner) {
    // Require remote to be near the end to prevent premature finish messages
    if (remote.lap < TOTAL_LAPS - 1) return;
    winner = 'remote';
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
  alert('El rival se desconectó. Vuelve al menú.');
  goTo('lobby');
  Net.destroy();
}

// ── Game lifecycle ─────────────────────────────────────────────────────────────
function resetGame() {
  local  = makeCar(isHost ? 0 : 1);
  remote = Object.assign(makeCar(isHost ? 1 : 0), {
    prevX: START[isHost ? 1 : 0].x, prevY: START[isHost ? 1 : 0].y,
    prevAngle: START[isHost ? 1 : 0].a, lastUpdate: 0,
  });
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
  localDamage        = 0;
  aiWpIdx            = 0;
  floatingTexts      = [];
  cpFlash            = 0;
  damageWarningShown = 0;
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
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
  if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') keys.down  = false;
});

// ── Input: touch buttons ───────────────────────────────────────────────────────
function bindTouch(id, flag) {
  const el = document.getElementById(id);
  if (!el) return;
  const on  = () => { keys[flag] = true;  el.classList.add('pressed'); };
  const off = () => { keys[flag] = false; el.classList.remove('pressed'); };
  el.addEventListener('touchstart',  e => { e.preventDefault(); on();  }, { passive: false });
  el.addEventListener('touchend',    e => { e.preventDefault(); off(); }, { passive: false });
  el.addEventListener('touchcancel', e => { e.preventDefault(); off(); }, { passive: false });
  el.addEventListener('mousedown',   on);
  el.addEventListener('mouseup',     off);
  el.addEventListener('mouseleave',  off);
}

bindTouch('touch-left',  'left');
bindTouch('touch-right', 'right');
bindTouch('touch-brake', 'down');

// ── Screen management ─────────────────────────────────────────────────────────
function goTo(name) {
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

function buildRivalGrid() {
  const grid = document.querySelector('.rival-grid');
  grid.innerHTML = '';
  RIVALS.forEach((r, idx) => {
    const diff = rivalDiff(r.skill);
    const wins = localStorage.getItem(`cr_rival_${idx}`);
    const badge = wins === 'win'  ? '<span class="rival-badge badge-win">VENCIDO</span>'
                : wins === 'loss' ? '<span class="rival-badge badge-loss">REVANCHA</span>'
                : '';
    const card = document.createElement('div');
    card.className = 'rival-card';
    card.dataset.rivalIdx = idx;
    card.innerHTML = `
      <div class="rival-band" style="background:${r.body};border-bottom:3px solid ${r.accent};"></div>
      <div class="rival-info">
        <div class="rival-name">${r.name.split(' ').pop().toUpperCase()} <span class="rival-num">#${r.num}</span></div>
        <div class="rival-team">${r.team}</div>
        <div class="rival-footer">
          <span class="rival-diff" style="color:${diff.color}">${diff.label}</span>
          ${badge}
        </div>
      </div>`;
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
    } else {
      // Guest requests restart; host will respond with 'start'
      Net.send({ type: 'restart' });
    }
  } else {
    resetGame(); beginCountdown();
  }
  startResultPoll();
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
  if (phase === 'done' && winner) {
    stopLoop();
    const won = winner === 'local';
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

startResultPoll();
updateLobbyRecord();
