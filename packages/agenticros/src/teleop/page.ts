import type { AgenticROSConfig } from "@agenticros/core";

/**
 * Returns the teleop web page HTML (Phase 3).
 * Includes: camera <img>, source selector when multiple streams, twist buttons, speed slider.
 */
export function getTeleopPageHtml(config: AgenticROSConfig): string {
  const teleop = config.teleop ?? {};
  const speedDefault = teleop.speedDefault ?? 0.3;
  const cameraPollMs = teleop.cameraPollMs ?? 150;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgenticROS Teleop</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 12px; background: #1a1a1a; color: #e0e0e0; }
    h1 { font-size: 1.25rem; margin: 0 0 12px 0; }
    .camera-wrap { position: relative; max-width: 100%; margin-bottom: 12px; }
    .camera-wrap img { width: 100%; max-height: 60vh; object-fit: contain; background: #000; border-radius: 8px; }
    .camera-wrap .no-feed { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 8px; color: #888; }
    .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; }
    .source-select { min-width: 200px; padding: 6px 10px; border-radius: 6px; background: #333; color: #e0e0e0; border: 1px solid #555; }
    .speed-wrap { display: flex; align-items: center; gap: 8px; }
    .speed-wrap label { font-size: 0.9rem; }
    .speed-wrap input[type="range"] { width: 100px; }
    .btn-wrap { display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .btn-row { display: flex; gap: 8px; justify-content: center; }
    button { padding: 12px 20px; font-size: 1rem; border-radius: 8px; border: none; cursor: pointer; color: #fff; }
    button:not(.stop) { background: #086; }
    button:not(.stop):active, button:not(.stop).active { background: #0c9; }
    button.stop { background: #822; }
    button.stop:active { background: #c33; }
    .conn-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; margin-bottom: 8px; }
    .conn-badge.connected { background: #0a5; color: #000; }
    .conn-badge.disconnected { background: #822; color: #fff; }
    .gamepad-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; margin-bottom: 8px; margin-left: 8px; }
    .gamepad-badge.active { background: #07a; color: #fff; }
    .gamepad-badge.inactive { background: #444; color: #888; }
    .status-wrap { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .status { font-size: 0.85rem; color: #888; }
    a { color: #0c9; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>AgenticROS Teleop</h1>
  <p><a href="/plugins/agenticros/">Back to AgenticROS</a></p>
  <div id="conn-badge" class="conn-badge disconnected" title="Transport connection">○ Checking…</div>
  <div id="gamepad-badge" class="gamepad-badge inactive" title="Gamepad status">🎮 No gamepad</div>
  <div class="camera-wrap">
    <img id="camera" src="" alt="Camera" style="display:none" />
    <div id="no-feed" class="no-feed">Select a camera source (or waiting for feed)</div>
  </div>
  <div class="controls">
    <div class="speed-wrap">
      <label for="speed">Speed:</label>
      <input type="range" id="speed" min="0.1" max="1" step="0.1" value="${speedDefault}" />
      <span id="speed-val">${speedDefault}</span>
    </div>
    <select id="source" class="source-select" style="display:none">
      <option value="">—</option>
    </select>
    <span class="status" style="font-size:0.8rem; color:#666;">Use a topic ending in <code>/compressed</code> for the feed.</span>
  </div>
  <div class="btn-wrap">
    <div class="btn-row"><button type="button" id="btn-fwd" data-linear-x="1">Fwd</button></div>
    <div class="btn-row">
      <button type="button" id="btn-left" data-linear-x="-1">Left</button>
      <button type="button" id="btn-stop" class="stop">Stop</button>
      <button type="button" id="btn-right" data-linear-x="1">Right</button>
    </div>
    <div class="btn-row"><button type="button" id="btn-back" data-linear-x="-1">Back</button></div>
  </div>
  <div class="status-wrap">
    <span id="status" class="status"></span>
    <button type="button" id="btn-reconnect" style="display:none; margin-left: 12px; padding: 6px 12px; font-size: 0.85rem;">Reconnect</button>
  </div>
  <p style="font-size:0.75rem; color:#888; margin-top:8px;">WASD keys and Bluetooth gamepads also drive (W=Forward, A=Left, S=Back, D=Right). If Fwd/Back send 0s, open this page via the proxy: <code>http://127.0.0.1:18790/plugins/agenticros/</code> → Teleop.</p>

  <script>
(function() {
  const POLL_MS = ${cameraPollMs};
  const SPEED_DEFAULT = ${speedDefault};
  const cameraEl = document.getElementById('camera');
  const noFeedEl = document.getElementById('no-feed');
  const sourceEl = document.getElementById('source');
  const speedEl = document.getElementById('speed');
  const speedVal = document.getElementById('speed-val');
  const statusEl = document.getElementById('status');
  const reconnectBtn = document.getElementById('btn-reconnect');
  const connBadge = document.getElementById('conn-badge');

  let selectedTopic = '';
  let pollTimer = null;
  let statusInterval = null;
  let lastConnected = null;
  let disconnectedCount = 0;

  function setStatus(msg) { statusEl.textContent = msg; }
  function getSpeed() { return parseFloat(speedEl?.value || SPEED_DEFAULT); }
  speedEl?.addEventListener('input', function() { speedVal.textContent = this.value; });

  function cameraUrl() {
    if (!selectedTopic) return '';
    const u = 'camera?topic=' + encodeURIComponent(selectedTopic) + '&type=compressed&t=' + Date.now();
    return u;
  }

  function startPoll() {
    if (pollTimer) clearInterval(pollTimer);
    if (!selectedTopic) { noFeedEl.style.display = 'flex'; cameraEl.style.display = 'none'; return; }
    noFeedEl.style.display = 'none';
    cameraEl.style.display = 'block';
    cameraEl.onerror = function() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      fetch(cameraUrl())
        .then(function(r) {
          if (r.status >= 400) return r.json().then(function(j) { setStatus('Camera: ' + (j && j.error ? j.error : r.statusText)); });
          setStatus('Camera failed (use a CompressedImage topic, e.g. .../image_raw/compressed)');
        })
        .catch(function() { setStatus('Camera request failed. Check transport (Reconnect) and gateway logs.'); });
    };
    cameraEl.src = cameraUrl();
    pollTimer = setInterval(function() { cameraEl.src = cameraUrl(); }, POLL_MS);
  }

  function loadSources() {
    fetch('sources')
      .then(function(r) { return r.json(); })
      .then(function(arr) {
        if (!Array.isArray(arr) || arr.length === 0) {
          setStatus('No camera sources found. Publish to an Image/CompressedImage topic.');
          return;
        }
        sourceEl.innerHTML = '';
        arr.forEach(function(o) {
          const opt = document.createElement('option');
          opt.value = o.topic;
          opt.textContent = o.label || o.topic;
          sourceEl.appendChild(opt);
        });
        sourceEl.style.display = arr.length > 1 ? 'block' : 'none';
        if (arr.length === 1) selectedTopic = arr[0].topic;
        else if (arr.length > 1) selectedTopic = arr[0].topic;
        startPoll();
      })
      .catch(function(e) { setStatus('Failed to load sources: ' + e.message); });
  }

  function setConnBadge(connected, mode) {
    if (!connBadge) return;
    if (connected) {
      disconnectedCount = 0;
      lastConnected = true;
    } else {
      disconnectedCount = (lastConnected === false ? disconnectedCount + 1 : 1);
      lastConnected = false;
    }
    var showConnected = connected || disconnectedCount < 2;
    connBadge.className = 'conn-badge ' + (showConnected ? 'connected' : 'disconnected');
    connBadge.textContent = showConnected ? '● Connected (' + (mode || 'ros2') + ')' : '○ Disconnected (mode: ' + (mode || 'none') + ')';
    connBadge.title = showConnected ? 'Transport connected' : 'Start Zenoh router (ws://localhost:10000) or rosbridge, then click Reconnect';
  }

  function updateConnectionStatus() {
    fetch('status')
      .then(function(r) { return r.json(); })
      .then(function(j) {
        var connected = !!j.connected;
        var mode = j.mode || 'none';
        setConnBadge(connected, mode);
        if (!connected) {
          setStatus('ROS2 transport not connected. Set transport.mode and Zenoh endpoint (ws://localhost:10000) in config, start the Zenoh router, then click Reconnect or restart the gateway.');
          if (reconnectBtn) { reconnectBtn.style.display = 'inline-block'; }
          return;
        }
        if (reconnectBtn) { reconnectBtn.style.display = 'none'; }
        setStatus('');
        loadSources();
      })
      .catch(function() {
        setConnBadge(false, 'none');
        if (reconnectBtn) reconnectBtn.style.display = 'none';
        loadSources();
      });
  }

  function refreshStatus() {
    fetch('status').then(function(r) { return r.json(); }).then(function(j) {
      var c = !!j.connected;
      var m = j.mode || 'none';
      setConnBadge(c, m);
    }).catch(function() { setConnBadge(false, 'none'); });
  }

  reconnectBtn?.addEventListener('click', function() {
    setStatus('Reconnecting...');
    fetch('reconnect', { method: 'GET' })
      .then(function(r) {
        const ct = (r.headers.get('Content-Type') || '').toLowerCase();
        if (ct.includes('application/json')) return r.json();
        return r.text().then(function(t) { throw new Error(t || r.statusText || 'Non-JSON response'); });
      })
      .then(function(j) {
        if (j && j.ok) { setStatus('Connected.'); updateConnectionStatus(); }
        else { setStatus('Reconnect failed: ' + (j && j.error ? j.error : 'unknown')); }
      })
      .catch(function(e) { setStatus('Reconnect failed: ' + (e.message || String(e))); });
  });

  sourceEl.addEventListener('change', function() {
    selectedTopic = this.value || '';
    startPoll();
  });

  // Twist: GET only. POST body is often not passed to the plugin by the gateway. Use the proxy (http://127.0.0.1:18790/plugins/agenticros/) so the query is forwarded in X-AgenticROS-Query.
  function sendTwist(linearX, linearY, linearZ, angularX, angularY, angularZ) {
    const s = getSpeed();
    const lx = (linearX ?? 0) * s;
    const ly = (linearY ?? 0) * s;
    const lz = linearZ ?? 0;
    const ax = angularX ?? 0;
    const ay = angularY ?? 0;
    const az = (angularZ ?? 0) * s;
    var q = 'linear_x=' + encodeURIComponent(lx) + '&linear_y=' + encodeURIComponent(ly) + '&linear_z=' + encodeURIComponent(lz) + '&angular_x=' + encodeURIComponent(ax) + '&angular_y=' + encodeURIComponent(ay) + '&angular_z=' + encodeURIComponent(az);
    fetch('twist?' + q, { method: 'GET' })
      .then(function(r) {
        if (r.status === 502) { setStatus('Twist: 502 — use proxy (http://127.0.0.1:18790/plugins/agenticros/) or single gateway worker.'); return; }
        if (!r.ok) return r.json().then(function(j) { setStatus('Twist: ' + (j && j.error ? j.error : r.statusText)); });
        setStatus('');
      })
      .catch(function(e) { setStatus('Twist error: ' + e.message); });
  }

  function stop() {
    sendTwist(0,0,0,0,0,0);
    document.querySelectorAll('.btn-wrap button:not(.stop)').forEach(function(b) { b.classList.remove('active'); });
  }

  ['btn-fwd','btn-back','btn-left','btn-right'].forEach(function(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', function() {
      btn.classList.add('active');
      const lx = parseFloat(btn.dataset.linearX);
      const az = parseFloat(btn.dataset.angularZ);
      sendTwist(lx || 0, 0, 0, 0, 0, az || 0);
    });
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
  });
  document.getElementById('btn-stop')?.addEventListener('click', function() { stop(); });

  // WASD keyboard: same as green directional buttons (ignore repeat via keysDown set)
  var keysDown = {};
  var keyToButton = { w: 'btn-fwd', a: 'btn-left', s: 'btn-back', d: 'btn-right' };
  function applyKey(key, down) {
    var k = key.toLowerCase();
    if (!keyToButton[k]) return;
    if (down) {
      if (keysDown[k]) return;
      keysDown[k] = true;
      var btn = document.getElementById(keyToButton[k]);
      if (btn) {
        btn.classList.add('active');
        var lx = parseFloat(btn.dataset.linearX);
        var az = parseFloat(btn.dataset.angularZ);
        sendTwist(lx || 0, 0, 0, 0, 0, az || 0);
      }
    } else {
      if (!keysDown[k]) return;
      delete keysDown[k];
      stop();
    }
  }
  document.addEventListener('keydown', function(e) {
    if (keyToButton[e.key.toLowerCase()]) { e.preventDefault(); applyKey(e.key, true); }
  });
  document.addEventListener('keyup', function(e) {
    if (keyToButton[e.key.toLowerCase()]) { e.preventDefault(); applyKey(e.key, false); }
  });

  // Gamepad (Bluetooth controller) support
  var gamepadBadge = document.getElementById('gamepad-badge');
  var gamepadPollInterval = null;
  var lastGamepadDirection = 'STOP';

  function setGamepadBadge(active, name) {
    if (!gamepadBadge) return;
    if (active) {
      gamepadBadge.className = 'gamepad-badge active';
      gamepadBadge.textContent = '🎮 ' + (name || 'Gamepad');
      gamepadBadge.title = 'Gamepad connected: ' + (name || 'Unknown');
    } else {
      gamepadBadge.className = 'gamepad-badge inactive';
      gamepadBadge.textContent = '🎮 No gamepad';
      gamepadBadge.title = 'Connect a Bluetooth gamepad to use joystick control';
    }
  }

  function clearGamepadButtons() {
    ['btn-fwd','btn-back','btn-left','btn-right'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });
  }

  function applyGamepadDirection(direction) {
    if (direction === lastGamepadDirection) return;
    lastGamepadDirection = direction;
    clearGamepadButtons();

    var dirToButton = { FORWARD: 'btn-fwd', BACKWARD: 'btn-back', LEFT: 'btn-left', RIGHT: 'btn-right' };
    var btnId = dirToButton[direction];
    if (btnId) {
      var btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.add('active');
        var lx = parseFloat(btn.dataset.linearX);
        var az = parseFloat(btn.dataset.angularZ);
        sendTwist(lx || 0, 0, 0, 0, 0, az || 0);
      }
    } else {
      sendTwist(0, 0, 0, 0, 0, 0);
    }
  }

  function pollGamepad() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var controller = null;
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { controller = gamepads[i]; break; }
    }
    if (!controller) {
      setGamepadBadge(false);
      if (lastGamepadDirection !== 'STOP') {
        applyGamepadDirection('STOP');
      }
      return;
    }

    setGamepadBadge(true, controller.id.split('(')[0].trim());

    var x = Math.trunc(controller.axes[0] * 100) / 100;
    var y = Math.trunc(controller.axes[1] * 100) / 100;

    var direction = 'STOP';
    if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) {
      direction = 'STOP';
    } else if (x > 0.2) {
      direction = 'RIGHT';
    } else if (x < -0.2) {
      direction = 'LEFT';
    } else if (y > 0.2) {
      direction = 'BACKWARD';
    } else if (y < -0.2) {
      direction = 'FORWARD';
    }

    applyGamepadDirection(direction);
  }

  function startGamepadPolling() {
    if (gamepadPollInterval) return;
    gamepadPollInterval = setInterval(pollGamepad, 100);
  }

  function stopGamepadPolling() {
    if (gamepadPollInterval) {
      clearInterval(gamepadPollInterval);
      gamepadPollInterval = null;
    }
  }

  window.addEventListener('gamepadconnected', function(e) {
    setGamepadBadge(true, e.gamepad.id.split('(')[0].trim());
    startGamepadPolling();
  });

  window.addEventListener('gamepaddisconnected', function() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var hasGamepad = false;
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { hasGamepad = true; break; }
    }
    if (!hasGamepad) {
      setGamepadBadge(false);
      stopGamepadPolling();
      if (lastGamepadDirection !== 'STOP') {
        applyGamepadDirection('STOP');
      }
    }
  });

  // Check for already-connected gamepads on page load
  (function checkInitialGamepads() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        setGamepadBadge(true, gamepads[i].id.split('(')[0].trim());
        startGamepadPolling();
        break;
      }
    }
  })();

  updateConnectionStatus();
  statusInterval = setInterval(refreshStatus, 5000);
  window.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') refreshStatus(); });
})();
  </script>
</body>
</html>`;
}
