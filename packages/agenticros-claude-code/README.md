# AgenticROS Claude Code adapter

MCP (Model Context Protocol) server that exposes AgenticROS ROS2 tools to **Claude Code CLI** and to the **Claude desktop app** on macOS (including **Claude Dispatch** on iPhone when paired to Claude on your Mac). Use natural language to control and query your ROS2 robot (e.g. *"what do you see?"*, *"find a chair and drive toward it"*, *"list every robot that can follow a person"*).

This adapter does **not** provide the config or teleop web UI; use the [OpenClaw plugin](../../packages/agenticros) for that, or run the gateway for the browser-based teleop page.

## Prerequisites

- Node.js 20+
- ROS2 transport available (Zenoh router, rosbridge, or local DDS)
- **Claude Code CLI** and/or **Claude desktop app** (MCP-enabled)

## Config

The server reads AgenticROS config from (in order):

1. **`AGENTICROS_CONFIG_PATH`** — path to a JSON file
2. **`~/.agenticros/config.json`**
3. **OpenClaw config** — if the above are missing, it tries `OPENCLAW_CONFIG` or `~/.openclaw/openclaw.json` and uses `plugins.entries.agenticros.config`

Config shape is the same as the OpenClaw plugin (transport mode, Zenoh endpoint, robot namespace, camera topic, etc.). Example:

```json
{
  "transport": { "mode": "zenoh" },
  "zenoh": { "routerEndpoint": "ws://localhost:10000" },
  "robot": {
    "name": "MyRobot",
    "namespace": "",
    "cameraTopic": "/camera/camera/color/image_raw/compressed"
  }
}
```

**Where to put `robot.namespace`:** Put `robot.namespace`, `zenoh.routerEndpoint`, etc. in **`~/.agenticros/config.json`**, or set **`AGENTICROS_CONFIG_PATH`** to the path of your JSON file. To override namespace only for a given MCP launch (e.g. desktop app vs another project), set env **`AGENTICROS_ROBOT_NAMESPACE`** on the MCP server entry — it overrides `robot.namespace` after the JSON is loaded. The value must match the robot’s ROS namespace exactly (many robots use **no hyphens** in the UUID part of `/robot<uuid>/cmd_vel`).

The MCP server does **not** read arbitrary keys from `.mcp.json` except **`env`** passed to the process; AgenticROS settings still come from `~/.agenticros/config.json` (or `AGENTICROS_CONFIG_PATH` / OpenClaw fallback) plus optional **`AGENTICROS_ROBOT_NAMESPACE`** in `env`.

**Zenoh:** The MCP server connects to the URL in `zenoh.routerEndpoint` (e.g. `ws://localhost:10000`). That must be the machine where **this** process runs: either start a Zenoh router on your Mac (`zenohd --listen tcp/0.0.0.0:7447 --listen ws/0.0.0.0:10000`) or, if the router runs on another host (e.g. the robot), set `routerEndpoint` to that host (e.g. `ws://192.168.1.5:10000`). If nothing is listening on that host:port, you will see "Remote api request timeout".

## Build

From the repo root:

```bash
pnpm install
pnpm build
```

Or build only core and this package: `pnpm --filter @agenticros/core build && pnpm --filter @agenticros/claude-code build`.

## Register with Claude Code

Add the MCP server so Claude Code can use the tools.

**Option A — Project `.mcp.json` (recommended when working in the repo)**  
From the repo root, create or edit `.mcp.json`:

```json
{
  "mcpServers": {
    "agenticros": {
      "type": "stdio",
      "command": "sh",
      "args": ["-c", "node packages/agenticros-claude-code/dist/index.js 2>>/tmp/agenticros-mcp.log"],
      "env": {}
    }
  }
}
```

Then run `claude` from the **repo root** so the path `packages/agenticros-claude-code/dist/index.js` resolves. To capture logs: `tail -f /tmp/agenticros-mcp.log` or `grep AgenticROS /tmp/agenticros-mcp.log`.

**Option B — `claude mcp add`**  
From the repo root after building:

```bash
claude mcp add --transport stdio --scope project agenticros -- node packages/agenticros-claude-code/dist/index.js
```

Or user scope (stored in `~/.claude.json`):

```bash
claude mcp add --transport stdio --scope user agenticros -- node "$(pwd)/packages/agenticros-claude-code/dist/index.js"
```

**Stale MCP processes**  
Claude Code may start a new MCP process per session without stopping old ones. If tool behavior is outdated after a rebuild, kill existing servers then start Claude again:

```bash
pnpm mcp:kill
claude
```

Scope options: `--scope user` (default), `--scope project` (shared via `.mcp.json`).

## Codex CLI (OpenAI)

The same MCP server works unmodified with the **OpenAI Codex CLI** — Codex is a vanilla MCP client, and our server speaks the standard MCP protocol.

**Option A — `agenticros codex setup` (recommended)**

```bash
agenticros codex setup              # ~/.codex/config.toml
agenticros codex setup --project    # .codex/config.toml in repo root
agenticros codex doctor
```

Then start Codex and run `/mcp` — you should see `agenticros` connected. See [docs/codex-setup.md](../../docs/codex-setup.md) for the full guide.

**Option B — `codex mcp add`**

```bash
cd /path/to/agenticros
codex mcp add agenticros \
  -- node "$(pwd)/packages/agenticros-claude-code/dist/index.js"
```

**Option C — direct edit of `~/.codex/config.toml`**

```toml
[mcp_servers.agenticros]
command = "sh"
args = ["-c", "node /ABSOLUTE/PATH/TO/agenticros/packages/agenticros-claude-code/dist/index.js 2>>/tmp/agenticros-mcp.log"]
enabled = true
startup_timeout_sec = 30

[mcp_servers.agenticros.env]
AGENTICROS_ROBOT_NAMESPACE = ""
```

Same tools, same tool names, same JSON shapes as in Claude Code; everything in the **Tools** section below applies identically.

Two Codex-specific notes:

- **Absolute path required.** Codex's working directory at server-spawn time is not the AgenticROS repo root, so `args = ["packages/agenticros-claude-code/dist/index.js"]` will fail. Use the full absolute path.
- **Project-scoped config.** Codex also supports a `.codex/config.toml` in a project directory (and a `mcp.json` in cwd on recent builds) — handy for per-repo MCP setups when you don't want `agenticros` enabled globally. See OpenAI's [Codex config reference](https://developers.openai.com/codex/config-reference) for the precedence rules.

## Hermes Agent

The same MCP server works unmodified with **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — Hermes is a model-agnostic MCP client (OpenRouter, Ollama, Anthropic, OpenAI, 200+ providers).

**Option A — `agenticros hermes setup` (recommended)**

```bash
agenticros hermes setup
agenticros hermes doctor
```

**Option B — edit YAML directly**

```yaml
# ~/.hermes/config.yaml
mcp_servers:
  agenticros:
    command: "node"
    args: ["/ABSOLUTE/PATH/TO/agenticros/packages/agenticros-claude-code/dist/index.js"]
    env:
      AGENTICROS_ROBOT_NAMESPACE: ""
    connect_timeout: 60
    timeout: 120
```

Then `/reload-mcp` in Hermes or restart the agent. Verify with `hermes mcp test agenticros`.

Hermes-specific notes:

- **Absolute path required.** Same as Codex — Hermes does not spawn MCP servers from the repo root.
- **Empty namespace.** Leave `AGENTICROS_ROBOT_NAMESPACE: ""` so `agenticros mode real|sim` drives the active robot (same policy as Codex).
- **Model choice is independent.** OpenRouter, Ollama, or any other Hermes LLM provider does not change AgenticROS MCP setup.

Full guide: [docs/hermes-setup.md](../../docs/hermes-setup.md).

## Claude desktop app + Claude Dispatch (iOS)

The Claude **desktop** app uses a different MCP config file than Claude Code:

| Platform | MCP config file |
|----------|-----------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

1. Add an **`agenticros`** entry under **`mcpServers`** with the same shape as in `.mcp.json`, but use an **absolute path** to the built server:

   ```json
   {
     "mcpServers": {
       "agenticros": {
         "command": "sh",
         "args": [
           "-c",
           "node /ABSOLUTE/PATH/TO/agenticros/packages/agenticros-claude-code/dist/index.js 2>>/tmp/agenticros-mcp.log"
         ],
         "env": {
           "AGENTICROS_ROBOT_NAMESPACE": "robot3946b404c33e4aa39a8d16deb1c5c593"
         }
       }
     }
   }
   ```

   Replace the `node` path with your clone’s path. Relative paths like `packages/agenticros-claude-code/dist/index.js` usually **fail** from the desktop app because its working directory is not the repo root.

2. **Fully quit** Claude (Cmd+Q on macOS) and restart — not just closing the window.

3. **Claude Dispatch** on iPhone: when paired to Claude on your Mac, the same MCP tools available in the desktop app (including **agenticros**) can be used from Dispatch, subject to Claude app permissions and tool approval.

## Tools

The server exposes the same ROS2 tools as the OpenClaw plugin:

| Tool | Description |
|------|-------------|
| **Inspection** | |
| `ros2_list_topics` | List topics and types |
| `ros2_list_capabilities` | Typed verb manifest (built-in + skill-declared) — the planning surface for agents |
| **Fleet** | |
| `ros2_list_robots` | List configured robots — id, name, kind, capabilities, online status |
| `ros2_discover_robots` | Online discovery: detect `/<ns>/cmd_vel` namespaces + classify reachability |
| `ros2_find_robots_for` | Ranked filter by capability + kind + online — *"who can `follow_person` right now?"* |
| **Missions** | |
| `run_mission` | Execute a multi-step mission **or** compile a natural-language `goal` into one. Chains capabilities via `{{stepId.outputs.field}}` template refs; returns a `mission_id` |
| `mission_cancel` | Cancel an in-flight mission by `mission_id` at the next step boundary (idempotent, safe on unknown ids) |
| **Direct ROS** | |
| `ros2_publish` | Publish to a topic (e.g. cmd_vel) — safety-clamped |
| `ros2_subscribe_once` | Get next message from a topic |
| `ros2_service_call` | Call a ROS2 service |
| `ros2_action_goal` | Send goal to an action server |
| `ros2_param_get` / `ros2_param_set` | Get/set node parameters |
| `ros2_camera_snapshot` | *"What do you see"* — one frame from camera topic |
| `ros2_depth_distance` | Distance in meters from depth camera |
| **Memory** *(only when enabled)* | |
| `memory_remember` | Store a durable fact for the robot — shared with OpenClaw, Claude Desktop, Gemini |
| `memory_recall` | Semantic search across long-term memory (also reads `mission:<id>` step transcripts) |
| `memory_forget` | Delete by id, query, or whole namespace |
| `memory_status` | Health check + record count + embedder info |

Safety limits (max linear/angular velocity) from config are applied before `ros2_publish`.

### Optional: shared memory across agents

The four `memory_*` tools only show up in `tools/list` when memory is **enabled** in `~/.agenticros/config.json`. Once enabled, anything you remember from Claude Code (or Claude Desktop) is immediately recall-able from OpenClaw chat and the Gemini CLI for the same robot — the underlying store lives at `~/.mem0/vector_store.db` and is shared across processes. Memory tools work even when zenohd is not running (they never touch the ROS transport). See [`docs/memory.md`](../../docs/memory.md) at the repo root for setup recipes and troubleshooting.

### “You’re denying the tool call” / robot doesn’t move

Claude Code asks for **approval** before running tools that can change state (e.g. `ros2_publish`). When it says “I’ll publish to …”, you must choose **Allow** or **Approve** (not Deny). If you deny, the command never runs and the robot won’t move.

To **auto-allow** AgenticROS tools so you aren’t prompted every time, add a permission rule. In **project** settings (e.g. `.claude/settings.json` in the repo) or **user** settings (`~/.claude/settings.json`):

```json
{
  "permissions": {
    "allow": ["mcp__agenticros"]
  }
}
```

That allows all tools from the `agenticros` MCP server. To allow only `ros2_publish`: `"allow": ["mcp__agenticros__ros2_publish"]`. Use `/permissions` in Claude Code to view and edit rules.

### WebSocket error / "disconnected from remote-api-plugin: 1006" in log

The MCP server talks to Zenoh over **WebSocket** (e.g. `ws://localhost:10000`). If you see `WebSocket error` and `WebSocket has been disconnected from remote-api-plugin: 1006` in `/tmp/agenticros-mcp.log`, the connection to zenohd is failing or dropping. The transport never stays connected, so no messages are sent.

**Do this:**

1. **Start zenohd with the remote-api plugin** (so it listens on port 10000):
   ```bash
   cd /path/to/agenticros
   zenohd -c scripts/zenohd-agenticros.json5
   ```
   Leave it running in the foreground so you can see any errors when the MCP server connects.

2. **Check that port 10000 is in use:**  
   `lsof -i :10000`  
   You should see `zenohd` (or the process that runs the plugin). If nothing is listening, the plugin did not load — install `zenoh-plugin-remote-api` (e.g. `brew install zenoh-plugin-remote-api` with the eclipse-zenoh tap) and ensure the config’s `plugins_loading.search_dirs` includes the directory that has `libzenoh_plugin_remote_api.*`.

3. **Version match:**  
   zenoh-ts (npm) and zenoh-plugin-remote-api (zenohd) should be compatible. Check `zenohd --version` and `@eclipse-zenoh/zenoh-ts` version in `packages/core/package.json`; if one is much newer, try aligning versions (see [docs/zenoh-agenticros.md](../../docs/zenoh-agenticros.md)).

4. **Restart order:**  
   Start zenohd first, confirm port 10000, then start (or restart) Claude Code so the MCP server connects to an already-running router.

### No messages reaching the robot (publish seems to do nothing)

1. **Await publish** — The tool now waits for the Zenoh put to complete before returning. If the put fails, you’ll see an error in the tool result (e.g. "Zenoh put failed: …"). Rebuild and restart Claude Code after pulling this change.
2. **Check MCP server logs** — Server logs go to stderr. To capture: in `.mcp.json` use `"command": "sh", "args": ["-c", "node packages/agenticros-claude-code/dist/index.js 2>>/tmp/agenticros-mcp.log"]`. Then `cat /tmp/agenticros-mcp.log` after a move to see publish lines and errors.
 When you trigger a move, the first terminal should show `[AgenticROS] Zenoh publish: key=...` for each publish. If you see that but the robot still doesn’t move, the issue is downstream (bridge allow list, robot topic, or network).
3. **Confirm key/topic** — The server publishes to the Zenoh key derived from the topic (e.g. `3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel` for topic `/3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel`). Your zenoh-bridge-ros2dds `subscribers` allow list must match that key (e.g. `.+/cmd_vel` or the exact key).

**z_sub shows "invalid utf-8"?** We publish binary CDR; z_sub is trying to display it as text. The payload is correct. If z_sub shows `Received PUT (.../cmd_vel: ...)`, the MCP server and zenohd are fine; if the robot still does not move, the issue is the **bridge or the ROS2 topic on the robot** — see [docs/robot-not-receiving-cmd-vel.md](../../docs/robot-not-receiving-cmd-vel.md).

### Robot not moving (cmd_vel not received)

If `ros2_publish` runs but the robot doesn’t move:

1. **Topic the base subscribes to**  
   On the robot run: `ros2 topic list` and `ros2 topic info /cmd_vel`. If the base subscribes to **`/cmd_vel`** (no prefix), set **`robot.namespace`** to `""` in `~/.agenticros/config.json` so we publish to `/cmd_vel`. If it subscribes to **`/<uuid>/cmd_vel`**, set `robot.namespace` to that `<uuid>` (e.g. `3946b404-c33e-4aa3-9a8d-16deb1c5c593`).

2. **Bridge allow list**  
   zenoh-bridge-ros2dds on the robot must **subscribe** to the Zenoh key we publish. For ros2dds the key is the topic without the leading slash (e.g. `cmd_vel` or `3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel`). In the bridge config `plugins.ros2dds.allow.subscribers`, include a pattern that matches that key (e.g. `cmd_vel`, `*\/cmd_vel`, or `.+/cmd_vel` depending on the bridge’s syntax). Restart the bridge after changing the config.

3. **Confirm on the Mac**  
   Subscribe to cmd_vel on the Zenoh router. If you have the Zenoh repo built (e.g. `~/Projects/zenoh`):  
   `cargo run -p zenoh-examples --example z_sub -- -e tcp/127.0.0.1:7447 --no-multicast-scouting -k '**/cmd_vel'`  
   Or if `z_sub` is in your PATH (e.g. from a Zenoh tools package):  
   `z_sub -e tcp/127.0.0.1:7447 --no-multicast-scouting -k '**/cmd_vel'`  
   Then in Claude Code ask to move the robot. If you see Twist messages in the subscriber, the MCP server and zenohd are fine and the issue is the bridge or the robot’s ROS2 topic.

## Testing the plugin

1. **Build** (from repo root):
   ```bash
   pnpm install && pnpm --filter @agenticros/core build && pnpm --filter @agenticros/claude-code build
   ```

2. **Config** (so the MCP server can connect to ROS2): create `~/.agenticros/config.json` or set `AGENTICROS_CONFIG_PATH`. You can copy from this package:
   ```bash
   mkdir -p ~/.agenticros
   cp packages/agenticros-claude-code/config.example.json ~/.agenticros/config.json
   ```
   Edit the file if needed (e.g. `zenoh.routerEndpoint`, `robot.cameraTopic`, or `transport.mode` to `rosbridge` / `local`).

3. **Register the MCP server** with Claude Code (use project scope so it’s stored in `.mcp.json`):
   ```bash
   cd /path/to/agenticros
   claude mcp add --transport stdio --scope project agenticros -- node packages/agenticros-claude-code/dist/index.js
   ```
   Or user scope (stored in `~/.claude.json`):
   ```bash
   claude mcp add --transport stdio --scope user agenticros -- node "$(pwd)/packages/agenticros-claude-code/dist/index.js"
   ```

4. **Verify**:
   ```bash
   claude mcp list
   claude mcp get agenticros
   ```

5. **Use Claude Code**: run `claude` and ask it to use the tools, e.g.:
   - “List ROS2 topics using the agenticros tools.”
   - “What do I see from the robot’s camera?” (if `robot.cameraTopic` is set and a camera is publishing).
   - “Publish a stop to cmd_vel.” (if you have a robot with `cmd_vel`).

   In the chat you can type `/mcp` to see MCP server status. If the transport isn’t running (e.g. no Zenoh router), tool calls will fail with connection errors until the ROS2 side is up.

## Skills

Skill packages (e.g. `agenticros-skill-followme`, `agenticros-skill-find`) extend the capability registry with new verbs like `follow_person` and `find_object`. The MCP server reads each skill's `package.json` `agenticros` block (`id`, `capabilities[]`) at startup and surfaces those verbs through `ros2_list_capabilities` and `run_mission` — no per-skill MCP tool needed. To register a skill for this adapter, install it with `agenticros skills install <owner/skill-id>` from the marketplace (e.g. `chrismatthieu/followme`), or add its path under `skillPaths[]` in `~/.agenticros/config.json` (or use the `agenticros skills add <path>` CLI). See [docs/skills.md](../../docs/skills.md) for the full skill contract.
