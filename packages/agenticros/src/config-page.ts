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
      <h2>Memory</h2>
      <p class="field-hint">Optional cross-adapter semantic memory. Shared across OpenClaw, Claude Code, and Gemini when they target the same robot namespace. Off by default. <a href="https://github.com/" target="_blank">See docs/memory.md.</a></p>
      <div class="field">
        <label>Backend</label>
        <label style="display:inline-block;margin-right:14px;font-size:0.9rem;color:#e0e0e0"><input type="radio" name="memory.backendChoice" value="off" /> Off</label>
        <label style="display:inline-block;margin-right:14px;font-size:0.9rem;color:#e0e0e0"><input type="radio" name="memory.backendChoice" value="local" /> Local (no deps, dumb keyword)</label>
        <label style="display:inline-block;font-size:0.9rem;color:#e0e0e0"><input type="radio" name="memory.backendChoice" value="mem0" /> Mem0 (semantic, requires <code>pnpm add mem0ai</code>)</label>
      </div>
      <div id="section-memory-mem0" style="display:none">
        <div class="field"><label><input type="checkbox" id="memory.mem0.inferOnWrite" name="memory.mem0.inferOnWrite" /> Use LLM-driven fact extraction on write (slower, costs tokens)</label></div>
        <div class="field"><label for="memory.mem0.historyDbPath">History DB path</label><input type="text" id="memory.mem0.historyDbPath" name="memory.mem0.historyDbPath" placeholder="~/.agenticros/memory-history.db" /></div>
        <p class="field-hint">Embedder, vector store, and llm overrides require editing <code>~/.openclaw/openclaw.json</code> directly. When unset, the factory auto-detects Ollama (if reachable) then OpenAI (if OPENAI_API_KEY set).</p>
      </div>
      <div id="section-memory-local" style="display:none">
        <div class="field"><label for="memory.local.storePath">Store path</label><input type="text" id="memory.local.storePath" name="memory.local.storePath" placeholder="~/.agenticros/memory.json" /></div>
      </div>
      <div class="field" id="memory-actions" style="display:none">
        <button type="button" id="memory-test-btn">Test</button>
        <button type="button" id="memory-clear-btn" style="background:#a33;color:#fff;margin-left:8px">Clear all in namespace</button>
        <span id="memory-test-status" style="margin-left:10px;color:#aaa;font-size:0.85rem"></span>
      </div>
      <pre id="memory-test-output" style="display:none;background:#252525;padding:8px;border:1px solid #444;border-radius:4px;font-size:0.8rem;color:#9c9;max-width:520px;white-space:pre-wrap;word-break:break-all"></pre>
    </section>
    <section>
      <h2>Skills</h2>
      <div class="field">
        <label for="skillPackages">Skill packages (comma-separated)</label>
        <input type="text" id="skillPackages" name="skillPackages" placeholder="e.g. agenticros-skill-followme" />
        <div class="field-hint">Npm package names to load as skills. Restart gateway after change.</div>
      </div>
      <div class="field">
        <label for="skillPaths">Skill paths (comma-separated)</label>
        <input type="text" id="skillPaths" name="skillPaths" placeholder="e.g. /path/to/skills" />
        <div class="field-hint">Directories to scan for skill packages (package.json with agenticrosSkill: true).</div>
      </div>
    </section>
    <section>
      <h2>Follow Me (<code>skills.followme</code>)</h2>
      <p class="field-hint">Per-skill settings for the Follow Me / follow_robot behavior. Stored under <code>plugins.entries.agenticros.config.skills.followme</code> in OpenClaw JSON.</p>
      <div class="field"><label><input type="checkbox" id="skills.followme.useOllama" name="skills.followme.useOllama" /> Use Ollama VLM for steering (requires camera topic)</label></div>
      <div class="field"><label for="skills.followme.ollamaUrl">Ollama URL</label><input type="url" id="skills.followme.ollamaUrl" name="skills.followme.ollamaUrl" placeholder="http://localhost:11434" /></div>
      <div class="field"><label for="skills.followme.vlmModel">VLM model</label><input type="text" id="skills.followme.vlmModel" name="skills.followme.vlmModel" placeholder="qwen3-vl:2b" /></div>
      <div class="field"><label for="skills.followme.cameraTopic">Camera topic (for Ollama)</label><input type="text" id="skills.followme.cameraTopic" name="skills.followme.cameraTopic" placeholder="/camera/image_raw/compressed" /></div>
      <div class="field">
        <label for="skills.followme.cameraMessageType">Camera message type</label>
        <select id="skills.followme.cameraMessageType" name="skills.followme.cameraMessageType">
          <option value="CompressedImage">CompressedImage</option>
          <option value="Image">Image</option>
        </select>
      </div>
      <div class="field"><label for="skills.followme.depthTopic">Depth image topic</label><input type="text" id="skills.followme.depthTopic" name="skills.followme.depthTopic" placeholder="/camera/camera/depth/image_rect_raw" /></div>
      <div class="field"><label for="skills.followme.cmdVelTopic">cmd_vel override</label><input type="text" id="skills.followme.cmdVelTopic" name="skills.followme.cmdVelTopic" placeholder="(optional; else teleop / namespace)" /></div>
      <div class="field"><label for="skills.followme.targetDistance">Target distance (m)</label><input type="number" id="skills.followme.targetDistance" name="skills.followme.targetDistance" min="0.25" max="5" step="0.05" /></div>
      <div class="field"><label for="skills.followme.rateHz">Loop rate (Hz)</label><input type="number" id="skills.followme.rateHz" name="skills.followme.rateHz" min="1" max="15" step="1" /></div>
      <div class="field"><label for="skills.followme.minLinearVelocity">Min linear speed (m/s)</label><input type="number" id="skills.followme.minLinearVelocity" name="skills.followme.minLinearVelocity" min="0.05" max="2" step="0.05" /></div>
      <div class="field"><label><input type="checkbox" id="skills.followme.invertLinearX" name="skills.followme.invertLinearX" /> Invert cmd_vel linear.x (forward/back)</label></div>
      <div class="field"><label><input type="checkbox" id="skills.followme.logTickTiming" name="skills.followme.logTickTiming" /> Log tick timing (latency debug)</label></div>
      <div class="field"><label for="skills.followme.criticalStopDistanceM">Hard stop distance (m)</label><input type="number" id="skills.followme.criticalStopDistanceM" name="skills.followme.criticalStopDistanceM" min="0.1" max="2" step="0.05" /></div>
      <div class="field"><label for="skills.followme.maxVelocityFraction">Max speed fraction (of Safety caps)</label><input type="number" id="skills.followme.maxVelocityFraction" name="skills.followme.maxVelocityFraction" min="0.05" max="1" step="0.05" /></div>
      <div class="field"><label for="skills.followme.visionCallbackUrl">Vision callback URL</label><input type="url" id="skills.followme.visionCallbackUrl" name="skills.followme.visionCallbackUrl" placeholder="(optional)" /></div>
      <div class="field"><label><input type="checkbox" id="skills.followme.useDepthSectors" name="skills.followme.useDepthSectors" /> Use depth sectors for turning (when not using Ollama)</label></div>
      <div class="field"><label for="skills.followme.searchAngularVelocity">Search angular velocity (rad/s)</label><input type="number" id="skills.followme.searchAngularVelocity" name="skills.followme.searchAngularVelocity" min="0.05" max="1.5" step="0.05" /></div>
      <div class="field"><label for="skills.followme.searchTicksBeforeSwitch">Search ticks before direction switch</label><input type="number" id="skills.followme.searchTicksBeforeSwitch" name="skills.followme.searchTicksBeforeSwitch" min="1" max="120" step="1" /></div>
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
  var NUM_FIELDS = ['rosbridge.reconnectInterval','zenoh.domainId','local.domainId','teleop.speedDefault','teleop.cameraPollMs','safety.maxLinearVelocity','safety.maxAngularVelocity','skills.followme.targetDistance','skills.followme.rateHz','skills.followme.minLinearVelocity','skills.followme.criticalStopDistanceM','skills.followme.maxVelocityFraction','skills.followme.searchAngularVelocity','skills.followme.searchTicksBeforeSwitch'];
  var BOOL_FIELDS = ['rosbridge.reconnect','memory.mem0.inferOnWrite','skills.followme.useOllama','skills.followme.invertLinearX','skills.followme.logTickTiming','skills.followme.useDepthSectors'];
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
  function toArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    return [];
  }
  function getMemoryBackendChoice() {
    var radios = document.getElementsByName('memory.backendChoice');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return 'off';
  }
  function setMemoryBackendChoice(choice) {
    var radios = document.getElementsByName('memory.backendChoice');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (radios[i].value === choice);
    }
  }
  function updateMemoryVisibility() {
    var choice = getMemoryBackendChoice();
    var localSec = document.getElementById('section-memory-local');
    var mem0Sec = document.getElementById('section-memory-mem0');
    var actions = document.getElementById('memory-actions');
    if (localSec) localSec.style.display = choice === 'local' ? 'block' : 'none';
    if (mem0Sec) mem0Sec.style.display = choice === 'mem0' ? 'block' : 'none';
    if (actions) actions.style.display = choice === 'off' ? 'none' : 'block';
  }
  function payloadFromForm() {
    var payload = { transport: {}, robot: {}, rosbridge: {}, zenoh: {}, local: {}, webrtc: {}, teleop: {}, safety: {}, memory: { local: {}, mem0: {} }, skillPackages: [], skillPaths: [], skills: {} };
    var names = ['transport.mode','robot.name','robot.namespace','robot.cameraTopic','rosbridge.url','rosbridge.reconnect','rosbridge.reconnectInterval','zenoh.routerEndpoint','zenoh.domainId','zenoh.keyFormat','local.domainId','webrtc.signalingUrl','webrtc.apiUrl','webrtc.robotId','teleop.cameraTopic','teleop.cmdVelTopic','teleop.speedDefault','teleop.cameraPollMs','safety.maxLinearVelocity','safety.maxAngularVelocity','memory.local.storePath','memory.mem0.inferOnWrite','memory.mem0.historyDbPath','skills.followme.useOllama','skills.followme.ollamaUrl','skills.followme.vlmModel','skills.followme.cameraTopic','skills.followme.cameraMessageType','skills.followme.depthTopic','skills.followme.cmdVelTopic','skills.followme.targetDistance','skills.followme.rateHz','skills.followme.minLinearVelocity','skills.followme.invertLinearX','skills.followme.logTickTiming','skills.followme.criticalStopDistanceM','skills.followme.maxVelocityFraction','skills.followme.visionCallbackUrl','skills.followme.useDepthSectors','skills.followme.searchAngularVelocity','skills.followme.searchTicksBeforeSwitch'];
    for (var i = 0; i < names.length; i++) {
      var v = getFieldValue(names[i]);
      if (v !== undefined) setByPath(payload, names[i], v);
    }
    var memChoice = getMemoryBackendChoice();
    payload.memory.enabled = (memChoice !== 'off');
    if (memChoice !== 'off') payload.memory.backend = memChoice;
    payload.skillPackages = toArray(getFieldValue('skillPackages'));
    payload.skillPaths = toArray(getFieldValue('skillPaths'));
    return payload;
  }
  function populateForm(c) {
    var names = ['transport.mode','robot.name','robot.namespace','robot.cameraTopic','rosbridge.url','rosbridge.reconnect','rosbridge.reconnectInterval','zenoh.routerEndpoint','zenoh.domainId','zenoh.keyFormat','local.domainId','webrtc.signalingUrl','webrtc.apiUrl','webrtc.robotId','teleop.cameraTopic','teleop.cmdVelTopic','teleop.speedDefault','teleop.cameraPollMs','safety.maxLinearVelocity','safety.maxAngularVelocity','memory.local.storePath','memory.mem0.inferOnWrite','memory.mem0.historyDbPath','skills.followme.useOllama','skills.followme.ollamaUrl','skills.followme.vlmModel','skills.followme.cameraTopic','skills.followme.cameraMessageType','skills.followme.depthTopic','skills.followme.cmdVelTopic','skills.followme.targetDistance','skills.followme.rateHz','skills.followme.minLinearVelocity','skills.followme.invertLinearX','skills.followme.logTickTiming','skills.followme.criticalStopDistanceM','skills.followme.maxVelocityFraction','skills.followme.visionCallbackUrl','skills.followme.useDepthSectors','skills.followme.searchAngularVelocity','skills.followme.searchTicksBeforeSwitch'];
    for (var i = 0; i < names.length; i++) {
      var v = getByPath(c, names[i]);
      setFieldValue(names[i], v);
    }
    var memEnabled = !!getByPath(c, 'memory.enabled');
    var memBackend = getByPath(c, 'memory.backend') || 'local';
    setMemoryBackendChoice(memEnabled ? memBackend : 'off');
    updateMemoryVisibility();
    setFieldValue('skillPackages', Array.isArray(c.skillPackages) ? c.skillPackages.join(', ') : (c.skillPackages || ''));
    setFieldValue('skillPaths', Array.isArray(c.skillPaths) ? c.skillPaths.join(', ') : (c.skillPaths || ''));
    if (getByPath(c, 'skills.followme.useDepthSectors') === undefined) {
      var udsEl = getFormElement('skills.followme.useDepthSectors');
      if (udsEl && udsEl.type === 'checkbox') udsEl.checked = true;
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
  var memoryRadios = document.getElementsByName('memory.backendChoice');
  for (var ri = 0; ri < memoryRadios.length; ri++) {
    memoryRadios[ri].addEventListener('change', updateMemoryVisibility);
  }
  var memoryTestBtn = document.getElementById('memory-test-btn');
  var memoryClearBtn = document.getElementById('memory-clear-btn');
  var memoryTestStatus = document.getElementById('memory-test-status');
  var memoryTestOutput = document.getElementById('memory-test-output');
  function setMemoryTestStatus(text, isErr) {
    if (memoryTestStatus) {
      memoryTestStatus.textContent = text;
      memoryTestStatus.style.color = isErr ? '#f99' : '#aaa';
    }
  }
  function showMemoryTestOutput(text) {
    if (memoryTestOutput) {
      memoryTestOutput.textContent = text;
      memoryTestOutput.style.display = 'block';
    }
  }
  if (memoryTestBtn) {
    memoryTestBtn.addEventListener('click', function() {
      setMemoryTestStatus('Testing...', false);
      if (memoryTestOutput) memoryTestOutput.style.display = 'none';
      fetch('memory/status')
        .then(function(r) { return r.text().then(function(t) { return { status: r.status, text: t }; }); })
        .then(function(p) {
          try {
            var data = JSON.parse(p.text);
            if (data && data.success === false) {
              setMemoryTestStatus('Error', true);
              showMemoryTestOutput(JSON.stringify(data, null, 2));
              return;
            }
            setMemoryTestStatus(
              data.enabled
                ? 'OK — ' + data.backend + ', ' + (data.recordCount || 0) + ' records'
                : 'Disabled',
              false,
            );
            showMemoryTestOutput(JSON.stringify(data, null, 2));
          } catch (_) {
            setMemoryTestStatus('Bad response (status ' + p.status + ')', true);
            showMemoryTestOutput(p.text);
          }
        })
        .catch(function(err) {
          setMemoryTestStatus('Request failed', true);
          showMemoryTestOutput(String(err && err.message ? err.message : err));
        });
    });
  }
  if (memoryClearBtn) {
    memoryClearBtn.addEventListener('click', function() {
      if (!window.confirm('Delete every memory in the current namespace? This cannot be undone.')) return;
      setMemoryTestStatus('Clearing...', false);
      fetch('memory/clear', { method: 'POST' })
        .then(function(r) { return r.text().then(function(t) { return { status: r.status, text: t }; }); })
        .then(function(p) {
          try {
            var data = JSON.parse(p.text);
            if (data && data.success) {
              setMemoryTestStatus('Cleared ' + (data.removed || 0) + ' records', false);
              showMemoryTestOutput(JSON.stringify(data, null, 2));
            } else {
              setMemoryTestStatus('Error', true);
              showMemoryTestOutput(p.text);
            }
          } catch (_) {
            setMemoryTestStatus('Bad response (status ' + p.status + ')', true);
            showMemoryTestOutput(p.text);
          }
        })
        .catch(function(err) {
          setMemoryTestStatus('Request failed', true);
          showMemoryTestOutput(String(err && err.message ? err.message : err));
        });
    });
  }
  fetch('config.json')
    .then(function(r) { return r.json(); })
    .then(function(c) { populateForm(c); })
    .catch(function(e) {
      showBanner('error', 'Failed to load config: ' + (e.message || 'Unknown error'));
    });
})();`;
