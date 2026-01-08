const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const restartButton = document.getElementById("restart");

const state = {
  running: true,
  score: 0,
  bestScore: 0,
  speed: 3.2,
  laneCount: 3,
  roadPadding: 80,
  obstacles: [],
  lines: [],
  keys: {
    left: false,
    right: false,
  },
  player: {
    width: 42,
    height: 72,
    x: canvas.width / 2,
    y: canvas.height - 120,
  },
  lastTime: 0,
};

function resetGame() {
  state.running = true;
  state.score = 0;
  state.speed = 3.2;
  state.obstacles = [];
  state.lines = [];
  state.player.x = canvas.width / 2;
  scoreEl.textContent = "0";
  spawnInitialLines();
}

function spawnInitialLines() {
  const lineCount = 12;
  for (let i = 0; i < lineCount; i += 1) {
    state.lines.push({
      x: canvas.width / 2,
      y: i * (canvas.height / lineCount),
      height: 40,
    });
  }
}

function updateScore(delta) {
  state.score += delta;
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    bestScoreEl.textContent = Math.floor(state.bestScore).toString();
  }
  scoreEl.textContent = Math.floor(state.score).toString();
}

function laneWidth() {
  const roadWidth = canvas.width - state.roadPadding * 2;
  return roadWidth / state.laneCount;
}

function clampPlayer() {
  const half = state.player.width / 2;
  const leftBound = state.roadPadding + half;
  const rightBound = canvas.width - state.roadPadding - half;
  state.player.x = Math.min(Math.max(state.player.x, leftBound), rightBound);
}

function spawnObstacle() {
  const width = 42;
  const height = 72;
  const lane = Math.floor(Math.random() * state.laneCount);
  const laneStart = state.roadPadding + laneWidth() * lane;
  const x = laneStart + laneWidth() / 2;
  const y = -height;

  state.obstacles.push({ x, y, width, height });
}

function update(delta) {
  if (!state.running) return;

  const speed = state.speed * delta;
  state.lines.forEach((line) => {
    line.y += speed * 12;
    if (line.y > canvas.height) {
      line.y = -line.height;
    }
  });

  if (state.keys.left) {
    state.player.x -= speed * 120;
  }
  if (state.keys.right) {
    state.player.x += speed * 120;
  }
  clampPlayer();

  if (Math.random() < 0.02 + state.score / 50000) {
    spawnObstacle();
  }

  state.obstacles.forEach((obstacle) => {
    obstacle.y += speed * 120;
  });

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < canvas.height + obstacle.height);

  const playerBounds = {
    x: state.player.x - state.player.width / 2,
    y: state.player.y - state.player.height / 2,
    width: state.player.width,
    height: state.player.height,
  };

  for (const obstacle of state.obstacles) {
    const obstacleBounds = {
      x: obstacle.x - obstacle.width / 2,
      y: obstacle.y - obstacle.height / 2,
      width: obstacle.width,
      height: obstacle.height,
    };
    if (rectOverlap(playerBounds, obstacleBounds)) {
      state.running = false;
      return;
    }
  }

  updateScore(speed * 0.8);
  state.speed = Math.min(state.speed + delta * 0.02, 7);
}

function rectOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function drawRoad() {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  ctx.fillRect(state.roadPadding, 0, canvas.width - state.roadPadding * 2, canvas.height);

  ctx.fillStyle = "#334155";
  ctx.fillRect(state.roadPadding - 12, 0, 12, canvas.height);
  ctx.fillRect(canvas.width - state.roadPadding, 0, 12, canvas.height);

  ctx.fillStyle = "#f8fafc";
  state.lines.forEach((line) => {
    ctx.fillRect(line.x - 4, line.y, 8, line.height);
  });
}

function drawPlayer() {
  const { x, y, width, height } = state.player;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-width / 2 + 6, -height / 2 + 12, width - 12, height / 3);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(-width / 2 + 8, height / 2 - 20, width - 16, 10);
  ctx.restore();
}

function drawObstacles() {
  ctx.fillStyle = "#f97316";
  state.obstacles.forEach((obstacle) => {
    ctx.fillRect(
      obstacle.x - obstacle.width / 2,
      obstacle.y - obstacle.height / 2,
      obstacle.width,
      obstacle.height
    );
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(
      obstacle.x - obstacle.width / 2 + 6,
      obstacle.y - obstacle.height / 2 + 12,
      obstacle.width - 12,
      obstacle.height / 3
    );
    ctx.fillStyle = "#f97316";
  });
}

function drawGameOver() {
  if (state.running) return;
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.font = "bold 32px 'Segoe UI', sans-serif";
  ctx.fillText("¡Choque!", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "16px 'Segoe UI', sans-serif";
  ctx.fillText("Pulsa reiniciar para intentar de nuevo", canvas.width / 2, canvas.height / 2 + 20);
}

function render() {
  drawRoad();
  drawPlayer();
  drawObstacles();
  drawGameOver();
}

function loop(timestamp) {
  const delta = Math.min((timestamp - state.lastTime) / 1000, 0.05) || 0.016;
  state.lastTime = timestamp;
  update(delta);
  render();
  requestAnimationFrame(loop);
}

function handleKeyDown(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = true;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = true;
  }
}

function handleKeyUp(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = false;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = false;
  }
}

function init() {
  spawnInitialLines();
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  restartButton.addEventListener("click", () => {
    if (!state.running) {
      state.bestScore = Math.max(state.bestScore, state.score);
      bestScoreEl.textContent = Math.floor(state.bestScore).toString();
    }
    resetGame();
  });
  requestAnimationFrame(loop);
}

init();
