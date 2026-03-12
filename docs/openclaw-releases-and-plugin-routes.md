# OpenClaw Releases and Plugin Web Routes

This doc summarizes how OpenClaw version changes affect the AgenticROS plugin’s HTTP routes (landing, config, teleop) and what to do if routes return 404 or you see auth-related logs.

## 2026.3.1 regression: plugin routes unreachable

In **OpenClaw 2026.3.1**, a regression made plugin HTTP routes unreachable:

- The **Control UI** SPA catch-all handler ran **before** plugin request handling in the gateway.
- So requests to `/plugins/agenticros/`, `/agenticros/teleop/`, etc. were handled by the Control UI instead of the plugin: GET often returned the chat UI, POST returned **405 Method Not Allowed**.

Details: [openclaw/openclaw#31766](https://github.com/openclaw/openclaw/issues/31766).

**Workaround on 2026.3.1:** Set `gateway.controlUi.enabled: false` so plugin routes were reached (they then went through gateway auth).

---

## 2026.3.2 fix: plugin routes before Control UI

In **OpenClaw 2026.3.2**, the order was fixed (PR [#31906](https://github.com/openclaw/openclaw/pull/31906)):

- **Plugin HTTP routes** (with their auth check) now run **before** the Control UI SPA catch-all.
- Plugin routes are reachable again on `/agenticros/`, `/api/agenticros/`, and `/plugins/agenticros/`.

So 2026.3.2 restores correct routing; the plugin does not need code changes for that.

---

## Gateway auth and “missing or invalid auth” logs

After the fix, plugin routes **go through gateway auth** when the gateway has token auth enabled:

- Requests to plugin routes must include a valid **Bearer token** (e.g. `Authorization: Bearer <token>`).
- If a request hits a plugin route **without** a valid token, the gateway can log something like **`[plugins] http route registration missing or invalid auth`** and respond with **401 Unauthorized** or **404**.

So:

- **From a browser:** If you open `http://127.0.0.1:18789/plugins/agenticros/` (gateway port) and the gateway uses token auth, the browser does not send the token, so the gateway may reject the request and you get “not found” or “unauthorized” and see the auth log.
- **Via the AgenticROS proxy:** The proxy adds the token from `~/.openclaw/openclaw.json` to every request. So use **`http://127.0.0.1:18790/plugins/agenticros/`** (proxy port) to load the plugin UI and teleop with auth handled.

If you see **“not found”** for `/plugins/agenticros/` even when using the proxy, check:

1. Proxy is running: `node scripts/agenticros-proxy.cjs 18790`
2. Config has a token: `gateway.auth.token` in `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG`).
3. You are opening the **proxy** URL (port 18790), not the gateway URL (e.g. 18789).

---

## Summary

| OpenClaw version | Plugin routes reachable? | Auth behavior |
|------------------|--------------------------|----------------|
| 2026.2.26        | Yes                      | Plugin routes work. Web chat may need token in URL — see [Web chat on 2026.2.26](#web-chat-not-loading-on-2026226) below. |
| 2026.3.1         | **No** (Control UI first) | Workaround: `gateway.controlUi.enabled: false` |
| 2026.3.2+        | Yes (fixed)              | Plugin routes go through gateway auth; use proxy (18790) when using token auth |
| 2026.3.11+       | **Yes (recommended)**    | Plugin routes work with sync registration and `auth: "plugin"`. Use `./scripts/use-openclaw-2026.3.11.sh` to pin to 2026.3.11, or `npm install -g openclaw@latest`. **Rollback:** `./scripts/use-openclaw-2026.2.26.sh` if needed. |

### OpenClaw 2026.3.11 (recommended)

**OpenClaw 2026.3.11** is the recommended version: plugin HTTP routes (e.g. http://127.0.0.1:18789/plugins/agenticros/) work correctly. The AgenticROS plugin registers routes synchronously and uses `auth: "plugin"` for compatibility.

- **Install 2026.3.11:** `./scripts/use-openclaw-2026.3.11.sh` (or use latest: `npm install -g openclaw@latest`)
- **Restart the gateway:** `openclaw gateway`
- **Open:** http://127.0.0.1:18789/plugins/agenticros/ (and http://127.0.0.1:18789/ for web chat)

**Rollback** to 2026.2.26 if you hit issues: `./scripts/use-openclaw-2026.2.26.sh`, then restart the gateway.

---

**Local dev (recommended):** Run **`node scripts/setup-openclaw-local.cjs`** to set `gateway.auth.mode` to `"none"`, then restart the gateway. Web chat and AgenticROS pages then work at **http://127.0.0.1:18789/** and **http://127.0.0.1:18789/plugins/agenticros/** without the proxy.

**With token auth:** Use **`http://127.0.0.1:18790/plugins/agenticros/`** (with the proxy running) for the AgenticROS web UI and teleop. See [teleop.md](teleop.md) for full teleop setup.

---

## "Missing or invalid auth" at startup — routes never mounted

In OpenClaw 2026.3.2 with token auth enabled, the gateway can **reject** every plugin HTTP route shortly after the plugin registers it. Logs look like:

1. `AgenticROS plugin loaded successfully` and `AgenticROS teleop routes registered`
2. Then, ~2 seconds later: **`[plugins] http route registration missing or invalid auth`** for every path

When that happens, the routes are **not** added. So both 18789 and 18790 return 404 for `/plugins/agenticros/`.

In OpenClaw 2026.3.2 this can happen **even when** `gateway.auth.mode` is `"none"`, and the plugin’s `requireAuth: false` is not accepted by this gateway build. **Reliable fix:** use OpenClaw **2026.2.26**, where plugin routes are accepted:

```bash
./scripts/use-openclaw-2026.2.26.sh
```

Then restart the gateway (`openclaw gateway`) and open **http://127.0.0.1:18789/** (web chat) and **http://127.0.0.1:18789/plugins/agenticros/** (config, teleop). To return to latest later: `npm install -g openclaw@latest`.

**Workaround:** Disable the Control UI so the gateway may accept plugin routes (in some builds). In `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG`):

```json
"gateway": {
  "controlUi": { "enabled": false }
}
```

Use **`controlUi`** (lowercase “i”), not `controlUI` — OpenClaw rejects unknown keys.

Restart the gateway, then open **http://127.0.0.1:18789/plugins/agenticros/** (no proxy needed). If the auth messages disappear and the plugin page loads, the issue is the gateway's auth check when Control UI is enabled.

**If you already set `controlUi.enabled: false` and still see the auth messages:** In 2026.3.2 the gateway rejects plugin routes when **gateway token auth** is enabled. Removing the token does not help: the gateway may **auto-generate and re-add** it at startup (`auth token was missing. Generated a new token and saved it to config`), so token auth stays on and routes stay rejected.

### Get web chat, config, and teleop all working (recommended for local dev)

On a **loopback-only** gateway (binding to 127.0.0.1), use **no-auth mode** so the gateway accepts plugin routes and the web chat loads without a token:

1. Run the setup script from this repo:
   ```bash
   node scripts/setup-openclaw-local.cjs
   ```
   This sets `gateway.auth.mode` to `"none"` in `~/.openclaw/openclaw.json` (and backs up the file).

2. Restart the gateway: `openclaw gateway`.

3. Open in your browser:
   - **Web chat:** http://127.0.0.1:18789/
   - **AgenticROS landing, config, teleop:** http://127.0.0.1:18789/plugins/agenticros/

No proxy needed. Use this only when the gateway is bound to localhost. To restore token auth later, set `gateway.auth.mode` to `"token"` and add `gateway.auth.token` in your config.

---

## When neither 18789 nor 18790 loads the plugin

If both **http://127.0.0.1:18789/plugins/agenticros/** and **http://127.0.0.1:18790/plugins/agenticros/** fail to load (404, blank, or “not found”):

### 0. Use no-auth mode for local dev (simplest)

If your gateway is only on localhost, run **`node scripts/setup-openclaw-local.cjs`**, restart the gateway, then open **http://127.0.0.1:18789/** (web chat) and **http://127.0.0.1:18789/plugins/agenticros/** (config, teleop). This fixes both "missing or invalid auth" route rejection and web chat token_missing.

### 1. Confirm the plugin and routes are registered

In the gateway startup logs you should see:

- `AgenticROS plugin loaded successfully`
- `AgenticROS teleop routes registered ...`

If you see **`[plugins] http route registration missing or invalid auth`** for each route, the gateway may be **rejecting** route registration (e.g. an auth check at registration time). In that case the routes are never added, so both URLs will 404.

### 2. Try disabling Control UI

Temporarily set in your OpenClaw config (`~/.openclaw/openclaw.json` or `OPENCLAW_CONFIG`):

```json
"gateway": {
  "controlUi": { "enabled": false }
}
```

Use **`controlUi`** (lowercase “i”), not `controlUI`. Restart the gateway and try **http://127.0.0.1:18789/plugins/agenticros/** again. If it loads, the issue is tied to Control UI or auth ordering.

### 3. Disable auth with gateway.auth.mode, not by removing the token

In 2026.3.2, if you only remove `gateway.auth.token`, the gateway may log **"auth token was missing. Generated a new token and saved it to config"** and write a new token. To actually disable auth (for local loopback only), set **`gateway.auth.mode`** to **`"none"`** in your config. Use the script: `node scripts/setup-openclaw-local.cjs`, then restart the gateway.

### 4. Confirm proxy and gateway ports

- Gateway must be running on the port the proxy uses (default **18789** from `gateway.url` in config).
- Proxy must be running: `node scripts/agenticros-proxy.cjs 18790`.
- Config must contain `gateway.auth.token` for the proxy to add the Bearer header.

### 5. Use the dashboard URL with token, then open the plugin

Run `openclaw dashboard` and open the URL it prints (it includes the token in the hash). In that same browser tab, go to **http://127.0.0.1:18789/plugins/agenticros/**. Some setups use that token for subsequent requests; if that works, the proxy (18790) should also work when the token is sent via the proxy.

### 6. Verify plugin path in OpenClaw config

The gateway must load the AgenticROS plugin. In `~/.openclaw/openclaw.json`, under `plugins.entries.agenticros`, ensure the plugin **path** points at this repo’s `packages/agenticros` (absolute path or correct relative path). If the plugin never loads, no routes are registered.

### 7. Use OpenClaw 2026.2.26 (recommended when 2026.3.2 rejects routes)

If the gateway still logs "missing or invalid auth" for every route and the plugin URLs never load, install OpenClaw **2026.2.26** and restart:

```bash
./scripts/use-openclaw-2026.2.26.sh
```

Then **http://127.0.0.1:18789/plugins/agenticros/** works. For the web chat, see [Web chat not loading on 2026.2.26](#web-chat-not-loading-on-2026226) below. To return to latest later: `npm install -g openclaw@latest`.

---

## Web chat not loading on 2026.2.26

### "Not found" (404) on the dashboard URL

**If you set `gateway.controlUi.enabled: false`** (e.g. for a 2026.3.x workaround), the gateway does not serve the Control UI at all, so the dashboard URL returns 404. **Fix:** set it back to `true` or remove the `controlUi` block so the web chat is served again:

```json
"gateway": {
  "controlUi": { "enabled": true }
}
```

Then restart the gateway and open the dashboard URL (with `#token=...`).

---

With a **global install** (`npm install -g openclaw@2026.2.26`), the gateway can also fail to resolve the Control UI assets and return **404**. In that case, use the symlink workaround:

```bash
./scripts/fix-openclaw-control-ui-path.sh
```

Then restart the gateway and open the dashboard URL again (with `#token=...`). If you need the URL: `node scripts/openclaw-dashboard-url.cjs`. See [ClawKit: Missing Control UI assets](https://getclawkit.com/docs/troubleshooting/control-ui-assets-not-found).

### Page loads but won't connect (unauthorized / token missing)

The web chat needs a **gateway token** for the WebSocket. Do this:

1. **Ensure a token and get the dashboard URL:**
   ```bash
   node scripts/openclaw-dashboard-url.cjs
   ```
   This adds `gateway.auth.token` if missing and prints a URL like **http://127.0.0.1:18789/#token=...**.

2. **Restart the gateway** if the token was just added: `openclaw gateway`.

3. **Open the printed URL** in your browser (the `#token=...` is required for the web chat to connect).

Alternatively, run **`openclaw dashboard`** to get the URL. Bookmark it for next time.
