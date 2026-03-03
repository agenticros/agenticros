# Phase 3: Teleop Web App

**Pages not loading?** OpenClaw **2026.3.1** had a regression (fixed in **2026.3.2**) where the Control UI ran before plugin routes; use **`/plugins/agenticros/`** (or `/api/agenticros/`). With token auth, plugin routes require the Bearer token — use the **local proxy** (port **18790**), which adds it. See [openclaw-releases-and-plugin-routes.md](openclaw-releases-and-plugin-routes.md) for release impact.

```bash
node scripts/agenticros-proxy.cjs 18790
```

Then open **`http://127.0.0.1:18790/plugins/agenticros/`** in your browser. Do not use the gateway port (e.g. 18791) for AgenticROS when you see Unauthorized; use this proxy URL. The proxy reads the token from `~/.openclaw/openclaw.json`. Config and Teleop work from the links on that page.

**Twist buttons send 0s?** Open teleop **via the proxy** (`http://127.0.0.1:18790/plugins/agenticros/` → Teleop) so twist params are forwarded. Do a **hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) so the page uses GET for twist; the backend also falls back to URL/query when POST body is empty. If you still see zeros in logs, ensure you're on the proxy URL and that the proxy is running.

**No image / camera timeout?** The feed needs a **CompressedImage** topic (e.g. `.../image_raw/compressed`) being **published** on Zenoh (or rosbridge). If nothing publishes that topic, the teleop page cannot show a feed — configure the robot or zenoh-bridge to publish it, or republish from an existing topic.

---

The AgenticROS plugin can serve a **remote teleop web page** (Phase 3) when the OpenClaw gateway exposes HTTP route registration. The page provides:

- **Live camera** — stream from a ROS2 Image/CompressedImage topic (2D webcam or RealSense)
- **Camera source selector** — when multiple camera streams are available, choose which one to view
- **Twist controls** — Forward, Back, Left, Right, Stop, and a speed slider

The same page works with **Zenoh**, **rosbridge**, **local**, and **webrtc** transport modes.

## Opening the teleop page

1. Ensure the OpenClaw gateway is running with the AgenticROS plugin loaded and **transport connected** (so camera and cmd_vel topics are available).
2. In a browser, open the teleop page. **If your gateway shows the chat for `/agenticros/`**, use the **proxy** instead:
   - Run: `node scripts/agenticros-proxy.cjs 18790`
   - Open: **`http://127.0.0.1:18790/plugins/agenticros/`** then click **Teleop**.
   Otherwise try:
   ```
   http://127.0.0.1:18789/agenticros/teleop/
   ```
   Use your gateway host and port. Path must be exactly `/plugins/agenticros/teleop/` (or `/api/agenticros/teleop/` via proxy) with a trailing slash.

3. The page loads the camera source list and shows the first available stream. Use the **Speed** slider and the **Fwd / Back / Left / Right / Stop** buttons to drive the robot.

**If you see the OpenClaw chat dashboard instead of the teleop page:**

- **Wrong URL**: Use the URL with **no space** (e.g. `http://127.0.0.1:18789/agenticros/teleop/`). A typo like `...18789/ /agenticros/teleop` will hit the main app and show the chat.
- **Plugin routes not registered**: Check gateway logs. If you see `AgenticROS teleop: registerHttpRoute not available, skipping routes`, your OpenClaw build does not expose plugin HTTP routes, so `/agenticros/teleop/` is never registered and the server serves the main app for that path.
- **Wrong port**: Use the same port as the OpenClaw web UI (the port where the gateway’s HTTP server listens).

**Diagnostic:** Open **`http://127.0.0.1:18789/agenticros/teleop/ping`**. If you see JSON `{"ok":true,"agenticros":"teleop"}`, plugin routes are active (then try `/agenticros/teleop/index.html`). If you see the chat UI, the gateway is not routing to the plugin. Check logs for `AgenticROS teleop routes registered` vs `registerHttpRoute not available`. Use an OpenClaw build that supports plugin HTTP routes (e.g. v2026.2.15+).

### 503 (Camera) and 502 (Twist) when using the proxy — **multi-worker**

If you use the **proxy** (`http://127.0.0.1:18790/plugins/agenticros/`) and see:

- **Camera:** `503 Service Unavailable` — "Transport may be on another gateway worker"
- **Twist:** `502 Bad Gateway` — or POST to twist returns **405 Method Not Allowed** and GET returns **502**
- **Twist reaches the robot but values are all 0** — only requests that hit the "wrong" worker get through (e.g. stop = zeros)

then the gateway is running **multiple HTTP workers** (processes or threads). The AgenticROS transport (Zenoh, etc.) lives in **one** process. Requests that the load balancer sends to other workers have no transport, so the handler throws and you get 503 or 502.

**Fix: run the gateway with a single worker** so the same process that has the transport serves all plugin requests.

- If you start the gateway with **`openclaw gateway`** in a terminal, it is usually already one process. 503/502 then often mean something in front (reverse proxy, Docker replicas, or a process manager) is spawning or balancing multiple gateway instances.
- If you use **Docker** or **Kubernetes**, set replicas/workers to **1** for the gateway.
- If you use **systemd**, **launchd**, or **PM2**, ensure only **one** gateway process is running (no cluster mode, no multiple instances).
- Check [OpenClaw gateway docs](https://docs.openclaw.ai/gateway/configuration) and your deployment for "workers", "cluster", or "replicas" and set to 1.

After switching to a single gateway process, restart the gateway and use the proxy again; camera and twist should work.

### Camera returns 500 or "Transport not initialized"

If the camera feed shows **500 (Internal Server Error)** and the status line shows **"Camera: Transport not initialized. Is the service running?"**, the request is likely being handled by a **different gateway process** than the one that has the ROS2 transport. Many gateways run multiple workers (processes or threads); the plugin creates the transport in only one of them, so requests that hit other workers fail.

**Workarounds:** Run the OpenClaw gateway in **single-worker/single-process mode** if your deployment supports it, or use **sticky sessions** so the same browser session always hits the same worker. Alternatively, open the teleop page **directly on the gateway** (e.g. `http://127.0.0.1:18789/agenticros/teleop/`) instead of via a proxy; some setups use one process when not behind a load balancer.

### Camera timeout (no image, gateway logs "Teleop camera error: timeout")

The feed only supports **CompressedImage** topics (e.g. `.../image_raw/compressed`). If the gateway logs "Teleop camera error: timeout", no frames were received on the requested topic within 8 seconds. Check that the robot (or zenoh-bridge) is **publishing** that topic and that the Zenoh key matches (namespace, key format). If the robot only publishes a zstd or raw Image topic, configure it to also publish a CompressedImage topic, or republish from the existing topic.

### "ROS2 transport not connected (mode: none)"

If the teleop page shows **"ROS2 transport not connected (mode: none)"**, the plugin has not connected to any transport (Zenoh, rosbridge, etc.). Common causes:

1. **Config file not used** — The plugin reads `plugins.entries.agenticros.config` from the OpenClaw config file at startup. If that file is missing or not found (e.g. different working directory or `OPENCLAW_CONFIG` not set), the plugin falls back to the gateway’s in-memory config, which may be empty so `mode` defaults to `rosbridge` and the connection fails. **Check gateway logs** on startup: you should see either `AgenticROS: using config from file` or `could not read config from file: ... — using gateway pluginConfig`. The error message includes the path tried (e.g. `Config file not found: /Users/you/.openclaw/openclaw.json`). Create that file (e.g. run OpenClaw configure once) and set **transport.mode** and for Zenoh **zenoh.routerEndpoint** (e.g. `ws://localhost:10000`) under `plugins.entries.agenticros.config`, then restart the gateway.

2. **Zenoh router not running** — For Mode D (Zenoh), start the Zenoh router with the remote-api plugin (WebSocket) **before** or **after** starting the gateway. The plugin **retries connection every 10 seconds**; once the router is up, it will connect without a gateway restart. You can also click **Reconnect** on the teleop page to try immediately.

3. **Reconnect without restart** — Start the Zenoh router (e.g. `zenohd -c scripts/zenohd-agenticros.json5`), then on the teleop page click **Reconnect**. The plugin re-reads the config file and connects; no gateway restart needed.

### Routes show web chat instead of AgenticROS (gateway serves chat for /agenticros/)

Many OpenClaw setups serve the **main chat app** for all paths, so `http://127.0.0.1:18789/agenticros/` and `http://127.0.0.1:18789/agenticros/teleop/` show the chat instead of the AgenticROS plugin pages. In that case the plugin routes are only reachable **via a different base path** (e.g. under `/api/`) or **via the local proxy**.

**Use the proxy to open teleop:**

1. Start the proxy: `node scripts/agenticros-proxy.cjs 18790` (reads token from `~/.openclaw/openclaw.json`).
2. Open **`http://127.0.0.1:18790/plugins/agenticros/`** in the browser — that shows the AgenticROS landing page.
3. From there go to **Teleop** and **Config**. The proxy forwards to the gateway with the auth token.

**If you get 502 on twist or 500 on camera** when using the proxy, the gateway may be running multiple workers and only one has the transport; see “Camera returns 500” and “502 Bad Gateway” above. Running the gateway in single-worker mode (if supported) fixes it.

**Paths to try (prefer `/plugins/agenticros/` when `/agenticros/` shows the chat):**

- **Landing:** `http://127.0.0.1:18790/plugins/agenticros/` (proxy) or `http://127.0.0.1:18789/plugins/agenticros/`
- **Config:** `.../plugins/agenticros/config` (or `.../api/agenticros/config`)
- **Teleop:** `.../plugins/agenticros/teleop/` (or `.../api/agenticros/teleop/`)
- **Ping (diagnostic):** `.../plugins/agenticros/teleop/ping`

**OpenClaw 2026.3.1:** A regression made POST requests (e.g. config save, twist) return 405 when `gateway.controlUi.basePath` was set. Fixed in [PR #32311](https://github.com/openclaw/openclaw/pull/32311) (non-GET under basePath now fall through to plugin handlers). Ensure your OpenClaw build includes this fix so config and teleop POST work.

If the gateway port (e.g. 18789) shows the OpenClaw web chat for `/agenticros/*`:

1. **Check gateway logs** (after a fresh restart):
   - macOS: `tail -f ~/.openclaw/logs/gateway.err.log`
   - Look for **`AgenticROS HTTP routes registered`** — if present, the plugin did register routes; the gateway may be serving the SPA before plugin routes.
   - Look for **`AgenticROS HTTP: registerHttpRoute not available`** or **`AgenticROS teleop: registerHttpRoute not available`** — if present, your OpenClaw build does not expose `registerHttpRoute` to plugins (or the API changed).

2. **OpenClaw version**: Some versions may mount plugin routes under a different path (e.g. `/plugins/agenticros/`) or require a config flag to enable plugin HTTP routes. Check the [OpenClaw plugin docs](https://docs.openclaw.ai/plugin) and your version’s changelog.

3. **Route order**: If the web app is a catch-all SPA, plugin routes must be registered and matched *before* the SPA. This is a gateway implementation detail; if routes are registered but still not hit, consider opening an issue or asking in OpenClaw’s community channels.

### Redirect to chat or Unauthorized

Some OpenClaw versions may:

- **Redirect `/agenticros/` to `/agenticros/chat?session=...`** — the app treats the path as “open chat” and redirects, so the plugin’s landing page is never served.
- **Return `{"error":{"message":"Unauthorized","type":"unauthorized"}}`** — the gateway applies token (or session) auth to requests with no valid token.

**What to try:**

1. **Open dashboard first** — Open the main OpenClaw dashboard URL (where you see the gateway or chat UI). Then in the **same browser** go to `http://127.0.0.1:18789/agenticros/` or `/agenticros/teleop/`. If the gateway uses session/cookie auth, that may be enough.

2. **Token in the URL (when `gateway.auth.mode` is `token`)**  
   If your config has `gateway.auth.mode: "token"`, try adding `?token=YOUR_TOKEN` (from `gateway.auth.token` in `~/.openclaw/openclaw.json`), e.g. `http://127.0.0.1:18789/agenticros/teleop/?token=YOUR_TOKEN`. Not all OpenClaw builds support `?token=`.

3. **Check gateway auth config**  
   In `~/.openclaw/openclaw.json`, look under `gateway.auth` (e.g. `mode`, `token`). For **local use only**, you can try setting `gateway.auth.mode` to `"off"` (if supported) so plugin routes are reachable without a token. Check [OpenClaw gateway configuration](https://docs.openclaw.ai/gateway/configuration).

4. **Ask OpenClaw**  
   If plugin routes are always behind auth with no way to open them in a browser, this may need a gateway change (e.g. config to mark plugin routes as public). Open an issue or ask in OpenClaw’s community channels.

## Requirements

- The gateway must support **plugin HTTP routes** (`registerHttpRoute`). If not available, the plugin skips teleop route registration and logs: `AgenticROS teleop: registerHttpRoute not available, skipping routes`.
- At least one **camera topic** of type `sensor_msgs/msg/Image` or `sensor_msgs/msg/CompressedImage` (for the camera endpoint we use CompressedImage; raw Image topics return 501 with a hint to use a compressed topic).
- **cmd_vel** must be published to the robot (same as chat teleop); configure `robot.namespace` or `teleop.cmdVelTopic` if your robot uses a namespaced cmd_vel.

## Config (optional)

If **Save** in the config web view returns **405 Method Not Allowed**, some gateways only allow GET on plugin routes. The config page will retry with PUT automatically. If both fail, edit the config file directly: `~/.openclaw/openclaw.json` under `plugins.entries.agenticros.config`, then restart the gateway.

In the AgenticROS plugin config you can set:

| Key | Description |
|-----|-------------|
| `teleop.cameraTopic` | Default camera topic when only one source or as default selection. Falls back to `robot.cameraTopic` then RealSense default. |
| `teleop.cameraTopics` | Explicit list of `{ topic, label? }` for the source selector; if empty, sources are derived from `listTopics()` filtered by Image/CompressedImage. |
| `teleop.cmdVelTopic` | Override for cmd_vel topic (default from robot namespace). |
| `teleop.speedDefault` | Default linear speed (0.1–2 m/s). |
| `teleop.cameraPollMs` | Camera poll interval in ms (50–2000). |

## API (for reference)

| Route | Method | Description |
|-------|--------|-------------|
| `/agenticros/teleop/` | GET | Teleop web page (HTML). |
| `/agenticros/teleop/ping` | GET | Diagnostic: returns `{"ok":true,"agenticros":"teleop"}` if plugin routes are active. |
| `/agenticros/teleop/sources` | GET | JSON array of `{ topic, label? }` camera sources. |
| `/agenticros/teleop/camera` | GET | Latest frame as image/jpeg (or image/png). Query: `topic`, optional `type=compressed`. |
| `/agenticros/teleop/twist` | POST | Publish twist. Body: `{ linear_x?, linear_y?, linear_z?, angular_x?, angular_y?, angular_z? }`. Safety limits are applied. |
