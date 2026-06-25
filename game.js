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

// Visual styles [host = P1 Williams, guest = rival]
const CAR_STYLE = [
  { body: '#003087', stripe: '#e8f4ff', cockpit: '#0a1628', num: '43' },
  { body: '#b91c1c', stripe: '#facc15', cockpit: '#200808', num: null },
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const SCR = {
  lobby:   document.getElementById('screen-lobby'),
  create:  document.getElementById('screen-create'),
  join:    document.getElementById('screen-join'),
  game:    document.getElementById('screen-game'),
  results: document.getElementById('screen-results'),
};

const hudLap  = document.getElementById('hud-lap');
const hudPos  = document.getElementById('hud-pos');
const hudRole = document.getElementById('hud-role');

// ── Mutable state ─────────────────────────────────────────────────────────────
let phase    = 'lobby';   // lobby|creating|waiting|joining|countdown|racing|done
let gameMode = 'multi';   // 'multi' | 'solo'
let isHost   = false;
let myIdx    = 0;         // 0=host car, 1=guest car

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
    create(onCode, onPeer, onMsg, onClose) {
      msgCb = onMsg; closeCb = onClose;
      const id = chars();
      peer = new Peer(id);
      peer.on('open',       ()  => onCode(id));
      peer.on('connection', c   => { wire(c); c.on('open', onPeer); });
      peer.on('error',      err => console.warn('peer', err));
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
function drawCar(car, styleIdx) {
  const s = CAR_STYLE[styleIdx];
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
  ctx.fillStyle = s.cockpit;
  ctx.fillRect(-5, -10, 10, 18);
  ctx.fillStyle = '#2563eb22';
  ctx.fillRect(-3, -8, 6, 6);

  // Number plate (host only)
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
const AI_MAX_SPD  = MAX_SPD_ON * 0.88;
const AI_WP_REACH = 70; // px radius to consider waypoint reached

function updateAI(car, dt) {
  if (car.finished) return;

  // Navigate toward current checkpoint
  const wp = CPS[car.nextCP];
  const dx = wp.x - car.x;
  const dy = wp.y - car.y;

  // Advance waypoint when close enough
  if (dx * dx + dy * dy < AI_WP_REACH * AI_WP_REACH) {
    // Mirror checkpoint/lap logic
    if (car.nextCP === 0) {
      car.lap++;
      if (car.lap >= TOTAL_LAPS) { car.finished = true; return; }
    }
    car.nextCP = (car.nextCP + 1) % CPS.length;
  }

  // Steer toward waypoint
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - car.angle;
  // Normalise to [-π, π]
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const maxTurn = TURN_RATE * 0.82 * dt;
  // Add slight imperfection so AI isn't robotic
  const noise = (Math.random() - 0.5) * 0.06 * dt;
  car.angle += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn) + noise;

  // Physics (same as player but capped at AI speed)
  const onTrack = isOnTrack(car.x, car.y);
  const maxSpd  = onTrack ? AI_MAX_SPD : MAX_SPD_OFF;
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

  hudRole.textContent = gameMode === 'solo' ? 'CPU 🤖' : (isHost ? 'HOST' : 'GUEST');
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

// ── Main game loop ─────────────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05) || 0.016;
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

  if (data.type === 'ready' && isHost && phase !== 'racing' && phase !== 'done') {
    // Guest connected — start countdown (guard against mid-game reconnect)
    Net.send({ type: 'start' });
    beginCountdown();
    startResultPoll();
  }

  if (data.type === 'start' && !isHost) {
    beginCountdown();
  }

  if (data.type === 'pos') {
    remote.prevX    = remote.x;
    remote.prevY    = remote.y;
    remote.prevAngle = remote.angle;
    remote.x        = data.x;
    remote.y        = data.y;
    remote.angle    = data.angle;
    remote.speed    = data.speed;
    remote.lap      = data.lap;
    remote.nextCP   = data.cp;
    remote.lastUpdate = performance.now();
  }

  if (data.type === 'finish' && !winner) {
    winner = 'remote';
    phase  = 'done';
  }

  if (data.type === 'restart' && gameMode === 'multi') {
    resetGame();
    beginCountdown();
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
  winner    = null;
  countdown = 3;
  cdTimer   = 1;
  phase     = 'countdown';
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
  myIdx  = 0;
  goTo('create');
  Net.create(
    code => { document.getElementById('room-code-display').textContent = code; },
    ()   => { /* guest connected → handled in onMsg */ },
    onMsg,
    onDisconnect,
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
  myIdx  = 1;
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

document.getElementById('btn-solo').addEventListener('click', () => {
  gameMode = 'solo';
  isHost   = true;
  myIdx    = 0;
  hudRole.textContent = 'CPU 🤖';
  beginCountdown();
  startResultPoll();
});

document.getElementById('btn-restart').addEventListener('click', () => {
  if (gameMode === 'multi') Net.send({ type: 'restart' });
  resetGame();
  goTo('game');
  startLoop();
  startResultPoll();  // reinicia el poll para esta nueva partida
});

document.getElementById('btn-menu').addEventListener('click', () => {
  stopLoop();
  stopResultPoll();
  if (gameMode === 'multi') Net.destroy();
  gameMode = 'multi';
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
    document.getElementById('result-sub').textContent   = won
      ? 'Completaste las 3 vueltas primero 🇦🇷'
      : 'El rival ganó esta vez — ¡Revancha!';
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
startResultPoll();
