/**
 * Returns the AgenticROS config page HTML.
 * Page fetches config.json (relative), renders an editable form, and on Save POSTs to config/save. Served under /plugins/agenticros/ or /api/agenticros/.
 */
export function getConfigPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgenticROS Config</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 12px; background: #1a1a1a; color: #e0e0e0; max-width: 720px; }
    h1 { font-size: 1.5rem; margin: 0 0 8px 0; }
    a { color: #0c9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .banner { border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 0.9rem; }
    .banner.success { background: #1e3a1e; color: #9f9; border: 1px solid #2a5a2a; }
    .banner.error { background: #3a1e1e; color: #f99; border: 1px solid #5a2a2a; }
    .banner.saving { background: #2a2a2a; color: #ccc; border: 1px solid #555; }
    .banner.hidden { display: none; }
    section { margin-bottom: 24px; }
    section h2 { font-size: 1.1rem; margin: 0 0 8px 0; color: #ccc; }
    label { display: block; margin-bottom: 4px; font-size: 0.9rem; color: #aaa; }
    input[type="text"], input[type="number"], input[type="url"], select { width: 100%; max-width: 400px; padding: 6px 8px; background: #252525; border: 1px solid #444; border-radius: 4px; color: #e0e0e0; font-size: 0.9rem; }
    input[type="checkbox"] { margin-right: 8px; }
    .field { margin-bottom: 12px; }
    .field-hint { font-size: 0.8rem; color: #666; margin-top: 2px; }
    button { background: #0c9; color: #111; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
    button:hover { background: #0db; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .readonly { color: #888; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>AgenticROS Config</h1>
  <p><a href="/plugins/agenticros/">Back to AgenticROS</a></p>
  <div id="banner" class="banner hidden"></div>
  <form id="config-form">
    <section>
      <h2>Transport / Mode</h2>
      <div class="field">
        <label for="transport.mode">Mode</label>
        <select id="transport.mode" name="transport.mode">
          <option value="rosbridge">Mode B – Rosbridge (local network)</option>
          <option value="local">Mode A – Local (same machine)</option>
          <option value="webrtc">Mode C – WebRTC (cloud/remote)</option>
          <option value="zenoh">Mode D – Zenoh</option>
        </select>
      </div>
    </section>
    <section>
      <h2>Robot</h2>
      <div class="field"><label for="robot.name">Name</label><input type="text" id="robot.name" name="robot.name" /></div>
      <div class="field"><label for="robot.namespace">Namespace</label><input type="text" id="robot.namespace" name="robot.namespace" placeholder="e.g. robot-uuid" /></div>
      <div class="field"><label for="robot.cameraTopic">Camera topic</label><input type="text" id="robot.cameraTopic" name="robot.cameraTopic" placeholder="/camera/.../compressed" /></div>
    </section>
    <section id="section-rosbridge">
      <h2>Rosbridge (Mode B)</h2>
      <div class="field"><label for="rosbridge.url">URL</label><input type="url" id="rosbridge.url" name="rosbridge.url" placeholder="ws://localhost:9090" /></div>
      <div class="field"><label><input type="checkbox" id="rosbridge.reconnect" name="rosbridge.reconnect" /> Reconnect</label></div>
      <div class="field"><label for="rosbridge.reconnectInterval">Reconnect interval (ms)</label><input type="number" id="rosbridge.reconnectInterval" name="rosbridge.reconnectInterval" min="500" step="500" /></div>
    </section>
    <section id="section-zenoh" style="display:none">
      <h2>Zenoh (Mode D)</h2>
      <div class="field"><label for="zenoh.routerEndpoint">Router endpoint</label><input type="text" id="zenoh.routerEndpoint" name="zenoh.routerEndpoint" placeholder="tcp/localhost:7447" /></div>
      <div class="field"><label for="zenoh.domainId">Domain ID</label><input type="number" id="zenoh.domainId" name="zenoh.domainId" min="0" /></div>
      <div class="field"><label for="zenoh.keyFormat">Key format</label><select id="zenoh.keyFormat" name="zenoh.keyFormat"><option value="ros2dds">ros2dds</option><option value="rmw_zenoh">rmw_zenoh</option></select></div>
    </section>
    <section id="section-local" style="display:none">
      <h2>Local (Mode A)</h2>
      <div class="field"><label for="local.domainId">Domain ID</label><input type="number" id="local.domainId" name="local.domainId" min="0" /></div>
    </section>
    <section id="section-webrtc" style="display:none">
      <h2>WebRTC (Mode C)</h2>
      <div class="field"><label for="webrtc.signalingUrl">Signaling URL</label><input type="url" id="webrtc.signalingUrl" name="webrtc.signalingUrl" /></div>
      <div class="field"><label for="webrtc.apiUrl">API URL</label><input type="url" id="webrtc.apiUrl" name="webrtc.apiUrl" /></div>
      <div class="field"><label for="webrtc.robotId">Robot ID</label><input type="text" id="webrtc.robotId" name="webrtc.robotId" /></div>
      <div class="field"><span class="readonly">robotKey: (set in OpenClaw config only; not editable here)</span></div>
    </section>
    <section>
      <h2>Teleop</h2>
      <div class="field"><label for="teleop.cameraTopic">Camera topic</label><input type="text" id="teleop.cameraTopic" name="teleop.cameraTopic" /></div>
      <div class="field"><label for="teleop.cmdVelTopic">cmd_vel topic</label><input type="text" id="teleop.cmdVelTopic" name="teleop.cmdVelTopic" /></div>
      <div class="field"><label for="teleop.speedDefault">Speed default (m/s)</label><input type="number" id="teleop.speedDefault" name="teleop.speedDefault" min="0" max="2" step="0.1" /></div>
      <div class="field"><label for="teleop.cameraPollMs">Camera poll (ms)</label><input type="number" id="teleop.cameraPollMs" name="teleop.cameraPollMs" min="50" max="2000" step="50" /></div>
    </section>
    <section>
      <h2>Safety</h2>
      <div class="field"><label for="safety.maxLinearVelocity">Max linear velocity</label><input type="number" id="safety.maxLinearVelocity" name="safety.maxLinearVelocity" min="0" step="0.1" /></div>
      <div class="field"><label for="safety.maxAngularVelocity">Max angular velocity</label><input type="number" id="safety.maxAngularVelocity" name="safety.maxAngularVelocity" min="0" step="0.1" /></div>
    </section>
    <section>
      <h2>Follow Me</h2>
      <div class="field"><label><input type="checkbox" id="followMe.useOllama" name="followMe.useOllama" /> Use Ollama (VLM)</label></div>
      <div class="field"><label for="followMe.ollamaUrl">Ollama URL</label><input type="url" id="followMe.ollamaUrl" name="followMe.ollamaUrl" /></div>
      <div class="field"><label for="followMe.vlmModel">VLM model</label><input type="text" id="followMe.vlmModel" name="followMe.vlmModel" /></div>
      <div class="field"><label for="followMe.cameraTopic">Camera topic</label><input type="text" id="followMe.cameraTopic" name="followMe.cameraTopic" /></div>
      <div class="field"><label for="followMe.cmdVelTopic">cmd_vel topic</label><input type="text" id="followMe.cmdVelTopic" name="followMe.cmdVelTopic" /></div>
      <div class="field"><label for="followMe.targetDistance">Target distance (m)</label><input type="number" id="followMe.targetDistance" name="followMe.targetDistance" min="0" step="0.1" /></div>
      <div class="field"><label for="followMe.rateHz">Rate (Hz)</label><input type="number" id="followMe.rateHz" name="followMe.rateHz" min="1" max="15" /></div>
      <div class="field"><label for="followMe.minLinearVelocity">Min linear velocity</label><input type="number" id="followMe.minLinearVelocity" name="followMe.minLinearVelocity" min="0" max="1" step="0.1" /></div>
      <div class="field"><label for="followMe.depthTopic">Depth topic</label><input type="text" id="followMe.depthTopic" name="followMe.depthTopic" /></div>
      <div class="field"><label for="followMe.visionCallbackUrl">Vision callback URL</label><input type="url" id="followMe.visionCallbackUrl" name="followMe.visionCallbackUrl" /></div>
    </section>
    <p><button type="button" id="save-btn">Save config</button><span id="save-status"></span></p>
  </form>
  <script src="config.js"></script>
</body>
</html>`;
}

/** Returns the config page script (served as config.js so it runs under CSP). */
export function getConfigPageScript(): string {
  return CONFIG_PAGE_SCRIPT;
}

const CONFIG_PAGE_SCRIPT = `(function() {
  var form = document.getElementById('config-form');
  var banner = document.getElementById('banner');
  var saveBtn = document.getElementById('save-btn');
  var saveStatus = document.getElementById('save-status');
  if (!form || !banner || !saveBtn) {
    if (banner) { banner.className = 'banner error'; banner.textContent = 'Config form or save button not found.'; }
    return;
  }
  function setSaveStatus(msg, isError) {
    if (saveStatus) {
      saveStatus.textContent = msg;
      saveStatus.style.color = isError ? '#f99' : (msg.indexOf('Saved') !== -1 ? '#9f9' : '#aaa');
      saveStatus.style.marginLeft = '10px';
    }
    if (saveBtn && msg) saveBtn.textContent = msg.indexOf('Saving') !== -1 ? 'Saving…' : 'Save config';
  }
  var NUM_FIELDS = ['rosbridge.reconnectInterval','zenoh.domainId','local.domainId','teleop.speedDefault','teleop.cameraPollMs','safety.maxLinearVelocity','safety.maxAngularVelocity','followMe.targetDistance','followMe.rateHz','followMe.minLinearVelocity'];
  var BOOL_FIELDS = ['rosbridge.reconnect','followMe.useOllama'];
  function setByPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  function getByPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function showBanner(className, text) {
    banner.className = 'banner ' + className;
    banner.textContent = text;
    banner.classList.remove('hidden');
  }
  function hideBanner() {
    banner.classList.add('hidden');
  }
  function getFormElement(name) {
    var el = form.elements[name];
    if (!el && typeof CSS !== 'undefined' && CSS.escape) {
      try { el = form.querySelector('#' + CSS.escape(name)); } catch (_) {}
    }
    if (!el) try { el = document.getElementById(name); } catch (_) {}
    return el || null;
  }
  function setFieldValue(name, value) {
    var el = getFormElement(name);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else if (value !== undefined && value !== null) {
      el.value = value;
    }
  }
  function getFieldValue(name) {
    var el = getFormElement(name);
    if (!el) return undefined;
    if (el.type === 'checkbox') return el.checked;
    if (BOOL_FIELDS.indexOf(name) !== -1) return el.checked;
    if (NUM_FIELDS.indexOf(name) !== -1) {
      var n = Number(el.value);
      return isNaN(n) ? undefined : n;
    }
    return el.value;
  }
  function payloadFromForm() {
    var payload = { transport: {}, robot: {}, rosbridge: {}, zenoh: {}, local: {}, webrtc: {}, teleop: {}, safety: {}, followMe: {} };
    var names = ['transport.mode','robot.name','robot.namespace','robot.cameraTopic','rosbridge.url','rosbridge.reconnect','rosbridge.reconnectInterval','zenoh.routerEndpoint','zenoh.domainId','zenoh.keyFormat','local.domainId','webrtc.signalingUrl','webrtc.apiUrl','webrtc.robotId','teleop.cameraTopic','teleop.cmdVelTopic','teleop.speedDefault','teleop.cameraPollMs','safety.maxLinearVelocity','safety.maxAngularVelocity','followMe.useOllama','followMe.ollamaUrl','followMe.vlmModel','followMe.cameraTopic','followMe.cmdVelTopic','followMe.targetDistance','followMe.rateHz','followMe.minLinearVelocity','followMe.depthTopic','followMe.visionCallbackUrl'];
    for (var i = 0; i < names.length; i++) {
      var v = getFieldValue(names[i]);
      if (v !== undefined) setByPath(payload, names[i], v);
    }
    return payload;
  }
  function populateForm(c) {
    var names = ['transport.mode','robot.name','robot.namespace','robot.cameraTopic','rosbridge.url','rosbridge.reconnect','rosbridge.reconnectInterval','zenoh.routerEndpoint','zenoh.domainId','zenoh.keyFormat','local.domainId','webrtc.signalingUrl','webrtc.apiUrl','webrtc.robotId','teleop.cameraTopic','teleop.cmdVelTopic','teleop.speedDefault','teleop.cameraPollMs','safety.maxLinearVelocity','safety.maxAngularVelocity','followMe.useOllama','followMe.ollamaUrl','followMe.vlmModel','followMe.cameraTopic','followMe.cmdVelTopic','followMe.targetDistance','followMe.rateHz','followMe.minLinearVelocity','followMe.depthTopic','followMe.visionCallbackUrl'];
    for (var i = 0; i < names.length; i++) {
      var v = getByPath(c, names[i]);
      setFieldValue(names[i], v);
    }
    var mode = (c.transport && c.transport.mode) || 'rosbridge';
    document.getElementById('section-rosbridge').style.display = mode === 'rosbridge' ? 'block' : 'none';
    document.getElementById('section-zenoh').style.display = mode === 'zenoh' ? 'block' : 'none';
    document.getElementById('section-local').style.display = mode === 'local' ? 'block' : 'none';
    document.getElementById('section-webrtc').style.display = mode === 'webrtc' ? 'block' : 'none';
  }
  document.getElementById('transport.mode').addEventListener('change', function() {
    var mode = this.value;
    document.getElementById('section-rosbridge').style.display = mode === 'rosbridge' ? 'block' : 'none';
    document.getElementById('section-zenoh').style.display = mode === 'zenoh' ? 'block' : 'none';
    document.getElementById('section-local').style.display = mode === 'local' ? 'block' : 'none';
    document.getElementById('section-webrtc').style.display = mode === 'webrtc' ? 'block' : 'none';
  });
  function doSave(method, payload) {
    payload = payload || payloadFromForm();
    if (method === 'GET') {
      var json = JSON.stringify(payload);
      var base64 = btoa(unescape(encodeURIComponent(json))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
      if (base64.length > 1800) {
        return Promise.resolve({ status: 413, data: { success: false, error: 'Config too large for GET. Edit ~/.openclaw/openclaw.json manually.' } });
      }
      return fetch('config/save?payload=' + encodeURIComponent(base64), { method: 'GET' })
        .then(function(r) { return r.text().then(function(text) {
          var data;
          try { data = text ? JSON.parse(text) : {}; } catch (_) {
            return { status: r.status, data: { success: false, error: (text || '').slice(0, 200) } };
          }
          return { status: r.status, data: data };
        }); });
    }
    return fetch('config/save', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.text().then(function(text) {
      var data;
      try { data = text ? JSON.parse(text) : {}; } catch (_) {
        if (r.ok) {
          var msg = (text && text.trim().indexOf('<!') === 0)
            ? 'Server returned a page instead of JSON. Edit ~/.openclaw/openclaw.json (plugins.entries.agenticros.config) and restart the gateway.'
            : 'Server returned non-JSON (status 200).';
          return { status: r.status, data: { success: false, error: msg } };
        }
        var errText = (text && text.trim().indexOf('<!') === 0) ? 'Server returned an error page.' : (text || 'No response body').slice(0, 300);
        if (r.status === 401) errText = 'Unauthorized. Use the proxy (node scripts/agenticros-proxy.cjs 18790) and open the config page from there.';
        if (r.status === 405) errText = 'Method not allowed. Will try PUT then GET.';
        return { status: r.status, data: { success: false, error: errText } };
      }
      return { status: r.status, data: data };
    }); });
  }
  function handleSaveResult(_, retryGet) {
    var status = _.status;
    var res = _.data || {};
    if (res.success) {
      showBanner('success', res.message + (res.configPath ? ' Saved to: ' + res.configPath : ''));
      setSaveStatus('Saved. Restart gateway for changes.', false);
      return Promise.resolve();
    }
    if (status === 405 && retryGet !== false) {
      setSaveStatus('Trying PUT…', false);
      return doSave('PUT').then(function(p) {
        if (p.status === 200 && p.data && p.data.success) {
          showBanner('success', p.data.message + (p.data.configPath ? ' Saved to: ' + p.data.configPath : ''));
          setSaveStatus('Saved. Restart gateway for changes.', false);
          return;
        }
        if (p.status === 405) {
          setSaveStatus('Trying GET…', false);
          return doSave('GET').then(function(g) {
            if (g.status === 200 && g.data && g.data.success) {
              showBanner('success', g.data.message + (g.data.configPath ? ' Saved to: ' + g.data.configPath : ''));
              setSaveStatus('Saved. Restart gateway for changes.', false);
              return;
            }
            var err = g.data && g.data.error ? g.data.error : 'Save failed (GET).';
            showBanner('error', err);
            setSaveStatus(err.slice(0, 80), true);
          });
        }
        var putErr = p.data && p.data.error ? p.data.error : 'Save failed (PUT).';
        showBanner('error', putErr);
        setSaveStatus(putErr.slice(0, 80), true);
      });
    }
    var errMsg = res.error || ('Save failed (status ' + status + ').');
    if (status >= 400) errMsg = (status + ' ' + (status === 400 ? 'Bad Request' : status === 503 ? 'Service Unavailable' : status === 413 ? 'Payload too large' : 'Error') + ': ') + (res.error || errMsg);
    showBanner('error', errMsg);
    setSaveStatus(errMsg.slice(0, 80), true);
    return Promise.resolve();
  }
  function runSave() {
    hideBanner();
    setSaveStatus('Saving…', false);
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;
    doSave('POST')
    .then(function(r) { return handleSaveResult(r); })
    .catch(function(err) {
      var msg = 'Request failed: ' + (err.message || String(err));
      showBanner('error', msg);
      setSaveStatus(msg.slice(0, 80), true);
    })
    .then(function() {
      saveBtn.disabled = false;
      if (saveBtn.textContent === 'Saving…') saveBtn.textContent = 'Save config';
    });
  }
  window.agenticrosSave = runSave;
  saveBtn.addEventListener('click', runSave);
  form.addEventListener('submit', function(e) { e.preventDefault(); if (window.agenticrosSave) window.agenticrosSave(); });
  fetch('config.json')
    .then(function(r) { return r.json(); })
    .then(function(c) { populateForm(c); })
    .catch(function(e) {
      showBanner('error', 'Failed to load config: ' + (e.message || 'Unknown error'));
    });
})();`;
