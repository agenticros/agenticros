const canvas = document.getElementById('eyes');
const ctx = canvas.getContext('2d');

const state = {
  // Target from ROS (+/-1); idle offsets applied on top when not driving
  rosGazeX: 0,
  driving: false,
  // Smoothed pupil position in [-1, 1]
  gazeX: 0,
  gazeY: 0,
  // Idle wander target
  idleX: 0,
  idleY: 0,
  nextIdleAt: 0,
  idleHoldUntil: 0,
  // Blink: 0 open → 1 closed
  blink: 0,
  blinkPhase: 'open', // open | closing | closed | opening
  nextBlinkAt: 0,
  blinkHoldUntil: 0,
};

const BLINK_CLOSE_MS = 90;
const BLINK_OPEN_MS = 110;
const BLINK_HOLD_MS = 40;
const GAZE_LERP = 0.12;
const IDLE_LERP = 0.04;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function scheduleBlink(now) {
  state.nextBlinkAt = now + rand(2200, 5200);
}

function scheduleIdle(now) {
  state.nextIdleAt = now + rand(2500, 6000);
}

scheduleBlink(performance.now());
scheduleIdle(performance.now());

function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);

  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type !== 'gaze') return;
      state.rosGazeX = Number(msg.gazeX) || 0;
      state.driving = Boolean(msg.driving);
      if (state.driving) {
        state.idleX = 0;
        state.idleY = 0;
      }
    } catch {
      // ignore malformed
    }
  });

  ws.addEventListener('close', () => {
    setTimeout(connectWs, 1000);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });
}

async function enterFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement) return;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
  } catch {
    // Kiosk browsers often already cover the screen
  }
}

document.addEventListener('click', () => {
  enterFullscreen();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Allow escape while developing; kiosk may ignore it
    window.close();
  }
  if (e.key === 'f' || e.key === 'F') {
    enterFullscreen();
  }
});

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function updateBlink(now, dt) {
  if (state.blinkPhase === 'open') {
    if (now >= state.nextBlinkAt) {
      state.blinkPhase = 'closing';
    }
    return;
  }

  if (state.blinkPhase === 'closing') {
    state.blink = Math.min(1, state.blink + dt / BLINK_CLOSE_MS);
    if (state.blink >= 1) {
      state.blink = 1;
      state.blinkPhase = 'closed';
      state.blinkHoldUntil = now + BLINK_HOLD_MS;
    }
    return;
  }

  if (state.blinkPhase === 'closed') {
    if (now >= state.blinkHoldUntil) {
      state.blinkPhase = 'opening';
    }
    return;
  }

  if (state.blinkPhase === 'opening') {
    state.blink = Math.max(0, state.blink - dt / BLINK_OPEN_MS);
    if (state.blink <= 0) {
      state.blink = 0;
      state.blinkPhase = 'open';
      scheduleBlink(now);
    }
  }
}

function updateIdle(now) {
  if (state.driving) {
    state.idleX = 0;
    state.idleY = 0;
    return;
  }

  if (now >= state.nextIdleAt && now >= state.idleHoldUntil) {
    // Sometimes glance around, sometimes return to center
    if (Math.random() < 0.35) {
      state.idleX = 0;
      state.idleY = 0;
    } else {
      state.idleX = rand(-0.45, 0.45);
      state.idleY = rand(-0.25, 0.25);
    }
    state.idleHoldUntil = now + rand(600, 1800);
    scheduleIdle(now);
  }
}

function updateGaze() {
  const targetX = state.driving ? state.rosGazeX : state.idleX;
  const targetY = state.driving ? 0 : state.idleY;
  const lerp = state.driving ? GAZE_LERP : IDLE_LERP;
  state.gazeX += (targetX - state.gazeX) * lerp;
  state.gazeY += (targetY - state.gazeY) * lerp;
}

function drawEye(cx, cy, eyeW, eyeH, gazeX, gazeY, blink) {
  const rx = eyeW / 2;
  const ry = eyeH / 2;

  // sclera
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f5f5';
  ctx.fill();

  // iris + pupil
  const maxOffsetX = rx * 0.32;
  const maxOffsetY = ry * 0.28;
  const px = cx + gazeX * maxOffsetX;
  const py = cy + gazeY * maxOffsetY;
  const irisR = Math.min(rx, ry) * 0.42;
  const pupilR = irisR * 0.55;

  ctx.beginPath();
  ctx.arc(px, py, irisR, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px, py, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();

  // highlight
  ctx.beginPath();
  ctx.arc(px - irisR * 0.35, py - irisR * 0.35, pupilR * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();

  // eyelids (cover from top and bottom)
  if (blink > 0) {
    const cover = ry * blink + 2;
    ctx.fillStyle = '#000';
    // clip to eye bounds roughly with rects over the ellipse region
    ctx.fillRect(cx - rx - 2, cy - ry - 2, eyeW + 4, cover + 2);
    ctx.fillRect(cx - rx - 2, cy + ry - cover, eyeW + 4, cover + 2);
  }
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const eyeW = Math.min(w * 0.28, h * 0.55);
  const eyeH = eyeW * 0.62;
  const gap = w * 0.14;
  const cy = h * 0.5;
  const leftCx = w * 0.5 - gap / 2 - eyeW / 2;
  const rightCx = w * 0.5 + gap / 2 + eyeW / 2;

  drawEye(leftCx, cy, eyeW, eyeH, state.gazeX, state.gazeY, state.blink);
  drawEye(rightCx, cy, eyeW, eyeH, state.gazeX, state.gazeY, state.blink);
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;
  updateBlink(now, dt);
  updateIdle(now);
  updateGaze();
  draw();
  requestAnimationFrame(frame);
}

connectWs();
enterFullscreen();
requestAnimationFrame(frame);
