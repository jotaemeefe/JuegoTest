'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_LAPS    = 3;
const MAX_SPD_ON    = 220;   // px/s on track
const MAX_SPD_OFF   = 60;    // px/s off track
const AUTO_ACCEL    = 160;   // px/s² constant push forward
const FRICTION_K    = 1.3;   // speed lost per second (proportional)
const BRAKE_FORCE   = 450;   // px/s² when braking
const TURN_RATE     = 2.6;   // rad/s max turn speed
const NET_MS        = 50;    // position broadcast interval

// Track ellipses centred at (CX, CY)
const CX = 240, CY = 320;
const ORX = 200, ORY = 260;   // outer radii
const IRX = 100, IRY = 160;   // inner radii

// Checkpoints {x,y,r} — must be hit in order; CP0 = finish line
const CPS = [
  { x: 330, y: 490, r: 58 },  // 0 finish (bottom-right)
  { x: 390, y: 210, r: 58 },  // 1 top-right
  { x:  90, y: 210, r: 58 },  // 2 top-left
  { x:  90, y: 430, r: 58 },  // 3 bottom-left
];

// Starting grid [host, guest] (verified on-track)
const START = [
  { x: 278, y: 488, a: -Math.PI / 2 },
  { x: 316, y: 503, a: -Math.PI / 2 },
];

// Visual style for Colapinto — Alpine BWT
// Visual style for Colapinto — Alpine BWT (the player's car)
const CAR_STYLE_HOST = { body: '#0090d0', stripe: '#f569b7', cockpit: '#001f3f', helmet: '#74c0fc', num: '43' };

// Full 2025 F1 grid — body/accent = team livery, helmet = driver's signature helmet colour
// skill = AI speed factor (1.0 = same max speed as player)
const RIVALS = [
  // ── Red Bull Racing ──────────────────────────────────────────────────────────
  { name:'Max Verstappen',    team:'Red Bull Racing',   num:'1',  body:'#1d2f6a', accent:'#ffd700', helmet:'#cc1100', skill:0.96 },
  { name:'Liam Lawson',       team:'Red Bull Racing',   num:'30', body:'#1d2f6a', accent:'#ffd700', helmet:'#1a1a1a', skill:0.84 },
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
  { name:'Yuki Tsunoda',      team:'Racing Bulls',      num:'22', body:'#0f172a', accent:'#ef4444', helmet:'#ef4444', skill:0.87 },
  { name:'Isack Hadjar',      team:'Racing Bulls',      num:'6',  body:'#0f172a', accent:'#ef4444', helmet:'#1d4ed8', skill:0.82 },
];

function rivalDiff(skill) {
  if (skill >= 0.92) return { label: 'ÉLITE',    color: '#ef4444' };
  if (skill >= 0.88) return { label: 'EXPERTO',  color: '#f97316' };
  if (skill >= 0.84) return { label: 'DURO',     color: '#fbbf24' };
  return                     { label: 'MEDIO',    color: '#22c55e' };
}

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
function drawTrack() {
  // Grass
  ctx.fillStyle = '#1d4d11';
  ctx.fillRect(0, 0, 480, 640);

  // Outer rumble band (alternating red/white dashes)
  ctx.save();
  ctx.lineWidth = 18;
  ctx.setLineDash([28, 28]);
  ctx.strokeStyle = '#dc2626';
  ctx.beginPath(); ctx.ellipse(CX, CY, ORX + 6, ORY + 6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineDashOffset = 28;
  ctx.strokeStyle = '#f8fafc';
  ctx.beginPath(); ctx.ellipse(CX, CY, ORX + 6, ORY + 6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Tarmac
  ctx.fillStyle = '#2d3748';
  ctx.beginPath(); ctx.ellipse(CX, CY, ORX, ORY, 0, 0, Math.PI * 2); ctx.fill();

  // Inner island grass
  ctx.fillStyle = '#1d4d11';
  ctx.beginPath(); ctx.ellipse(CX, CY, IRX, IRY, 0, 0, Math.PI * 2); ctx.fill();

  // Inner rumble band
  ctx.save();
  ctx.lineWidth = 12;
  ctx.setLineDash([22, 22]);
  ctx.strokeStyle = '#dc2626';
  ctx.beginPath(); ctx.ellipse(CX, CY, IRX, IRY, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineDashOffset = 22;
  ctx.strokeStyle = '#f8fafc';
  ctx.beginPath(); ctx.ellipse(CX, CY, IRX, IRY, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Centre dashed racing line
  ctx.save();
  ctx.setLineDash([18, 14]);
  ctx.strokeStyle = 'rgba(251,191,36,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(CX, CY, (ORX + IRX) / 2, (ORY + IRY) / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Start/finish line (checker stripe — bottom right of oval)
  const fy = 490;
  const fxL = 240, fxR = 390;
  const sw = 9;
  for (let i = 0; fxL + i * sw < fxR; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#111827';
    ctx.fillRect(fxL + i * sw, fy - 5, sw, 10);
  }
  ctx.fillStyle = '#f8fafc88';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('META', (fxL + fxR) / 2, fy - 10);

  // Track name
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CIRCUITO COLAPINTO', CX, CY);
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
function isOnTrack(x, y) {
  const outer = ((x - CX) / ORX) ** 2 + ((y - CY) / ORY) ** 2;
  const inner = ((x - CX) / IRX) ** 2 + ((y - CY) / IRY) ** 2;
  return outer <= 1.0 && inner >= 1.0;
}

// ── Checkpoint / lap logic ────────────────────────────────────────────────────
function checkCheckpoints(car) {
  if (car.finished) return;
  const cp = CPS[car.nextCP];
  const dx = car.x - cp.x, dy = car.y - cp.y;
  if (dx * dx + dy * dy < cp.r * cp.r) {
    if (car.nextCP === 0) {
      // Record lap time for local player
      if (car === local && lapStartTime > 0) {
        lastLapMs = performance.now() - lapStartTime;
        lapStartTime = performance.now();
        if (lastLapMs < bestLapMs) {
          bestLapMs = lastLapMs;
          sessionRecord = true;
          recordFlashUntil = performance.now() + 2000;
          localStorage.setItem('cr_best_lap_ms', bestLapMs);
          updateLobbyRecord();
        }
      }
      car.lap++;
      if (car.lap >= TOTAL_LAPS) {
        car.finished = true;
        return;
      }
    }
    car.nextCP = (car.nextCP + 1) % CPS.length;
  }
}

// ── Physics update ─────────────────────────────────────────────────────────────
function updateCar(car, dt) {
  if (car.finished) return;
  const onTrack = isOnTrack(car.x, car.y);
  const maxSpd  = onTrack ? MAX_SPD_ON : MAX_SPD_OFF;

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
const AI_WP_REACH = 70; // px radius to consider waypoint reached

function updateAI(car, dt) {
  if (car.finished) return;

  const skill = selectedRival ? selectedRival.skill : 0.88;
  // Better drivers have less steering noise
  const noiseAmp = 0.14 - skill * 0.10; // 0.04 at skill 1.0 → 0.14 at skill 0.0

  // Navigate toward current checkpoint
  const wp = CPS[car.nextCP];
  const dx = wp.x - car.x;
  const dy = wp.y - car.y;

  // Advance waypoint when close enough
  if (dx * dx + dy * dy < AI_WP_REACH * AI_WP_REACH) {
    if (car.nextCP === 0) {
      car.lap++;
      if (car.lap >= TOTAL_LAPS) { car.finished = true; return; }
    }
    car.nextCP = (car.nextCP + 1) % CPS.length;
  }

  // Steer toward waypoint
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - car.angle;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const maxTurn = TURN_RATE * 0.82 * dt;
  const noise   = (Math.random() - 0.5) * noiseAmp * dt;
  car.angle += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn) + noise;

  // Physics — skill drives max speed
  const aiMaxSpd = MAX_SPD_ON * skill;
  const onTrack  = isOnTrack(car.x, car.y);
  const maxSpd   = onTrack ? aiMaxSpd : MAX_SPD_OFF;
  car.speed += AUTO_ACCEL * dt;
  car.speed -= car.speed * FRICTION_K * dt;
  car.speed = Math.max(0, Math.min(car.speed, maxSpd));

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// ── HUD update ────────────────────────────────────────────────────────────────
function updateHUD() {
  const lap = Math.min(local.lap + 1, TOTAL_LAPS);
  hudLap.textContent = `VUELTA ${lap}/${TOTAL_LAPS}`;

  const myScore  = local.finished  ? Infinity : local.lap  * 10 + local.nextCP;
  const itsScore = remote.finished ? Infinity : remote.lap * 10 + remote.nextCP;
  hudPos.textContent = myScore >= itsScore ? '1°' : '2°';

  if (gameMode === 'solo' && selectedRival) {
    const tag = selectedRival.name.split(' ').pop().substring(0, 3).toUpperCase();
    hudRole.textContent        = `VS ${tag}`;
    hudRole.style.color        = selectedRival.accent;
    hudRole.style.background   = selectedRival.body + '99';
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
  ctx.fillStyle = '#f8fafc';
  if (val > 0) {
    ctx.font = 'bold 120px system-ui';
    ctx.fillText(String(val), 240, 360);
  } else {
    ctx.font = 'bold 72px system-ui';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('¡GO!', 240, 360);
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
      } else {
        cdTimer = 1;
      }
    }
  } else if (phase === 'racing') {
    updateCar(local, dt);
    checkCheckpoints(local);
    updateHUD();

    // AI update (solo mode) or broadcast position (multi)
    if (gameMode === 'solo') {
      updateAI(remote, dt);
    } else if (ts - lastNetSend >= NET_MS) {
      lastNetSend = ts;
      Net.send({
        type: 'pos',
        x: local.x, y: local.y, angle: local.angle,
        speed: local.speed, lap: local.lap, cp: local.nextCP,
      });
    }

    // Render
    const rp = gameMode === 'solo' ? remote : remoteRenderPos();
    drawTrack();
    drawCar({ ...rp, finished: remote.finished }, isHost ? 1 : 0);
    drawCar(local, isHost ? 0 : 1);

    // Off-track feedback
    const onTrk = isOnTrack(local.x, local.y);
    if (!onTrk) {
      drawOffTrackVignette(0.55);
      if (wasOnTrack) {
        clearTimeout(shakeTimer);
        canvasWrap.classList.remove('shake');
        void canvasWrap.offsetWidth; // force reflow to restart animation
        canvasWrap.classList.add('shake');
        shakeTimer = setTimeout(() => canvasWrap.classList.remove('shake'), 320);
      }
    }
    wasOnTrack = onTrk;

    // Lap timer HUD
    if (lapStartTime > 0) {
      const elapsed = performance.now() - lapStartTime;
      const isRecord = performance.now() < recordFlashUntil;
      hudTimer.textContent = formatTime(elapsed);
      hudTimer.classList.toggle('record', isRecord);
    }

    // Win check — also check remote AI in solo mode
    if (!winner) {
      if (local.finished) {
        winner = 'local';
        if (gameMode === 'multi') Net.send({ type: 'finish' });
        phase = 'done';
      } else if (gameMode === 'solo' && remote.finished) {
        winner = 'remote';
        phase  = 'done';
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
  keys.left = false; keys.right = false; keys.down = false;
}

function beginCountdown() {
  resetGame();
  goTo('game');
  startLoop();
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

startResultPoll();
updateLobbyRecord();
