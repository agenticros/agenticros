/**
 * Invisible keyboard teleop — no on-screen UI.
 * WASD drive, Q faster, Z slower. Messages go to the server over WebSocket.
 */

const MOVE_KEYS = new Set(['w', 'a', 's', 'd']);

/** @type {WebSocket | null} */
let socket = null;
let reconnectTimer = 0;

const pressed = {
  w: false,
  a: false,
  s: false,
  d: false,
};

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function sendKeys() {
  send({
    type: 'keys',
    keys: { ...pressed },
  });
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  socket = ws;

  ws.addEventListener('open', () => {
    sendKeys();
  });

  ws.addEventListener('close', () => {
    socket = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 1000);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });
}

function normalizeKey(e) {
  return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
}

window.addEventListener('keydown', (e) => {
  const key = normalizeKey(e);

  if (MOVE_KEYS.has(key)) {
    e.preventDefault();
    if (!pressed[key]) {
      pressed[key] = true;
      sendKeys();
    }
    return;
  }

  if (key === 'q' && !e.repeat) {
    e.preventDefault();
    send({ type: 'speed', delta: 1 });
    return;
  }

  if (key === 'z' && !e.repeat) {
    e.preventDefault();
    send({ type: 'speed', delta: -1 });
  }
});

window.addEventListener('keyup', (e) => {
  const key = normalizeKey(e);
  if (!MOVE_KEYS.has(key)) return;
  e.preventDefault();
  if (pressed[key]) {
    pressed[key] = false;
    sendKeys();
  }
});

// Release all keys if the window loses focus (safety)
window.addEventListener('blur', () => {
  let changed = false;
  for (const k of MOVE_KEYS) {
    if (pressed[k]) {
      pressed[k] = false;
      changed = true;
    }
  }
  if (changed) sendKeys();
});

connect();
