# OpenAI Codex CLI setup

Use the **OpenAI Codex CLI** to control your ROS 2 robot through the same Corebrum Synapse MCP server as Claude Code. Codex is a standard MCP client — no separate adapter package is required.

> **Want fully local inference (no OpenAI API)?** Codex uses OpenAI models. Use **OpenClaw + Ollama** or **Hermes + Ollama** instead — see **[local-vlm.md](local-vlm.md)**.

## Prerequisites

- Node.js 20+
- Corebrum Synapse built (`pnpm build` or `npx @corebrum/synapse init`)
- ROS 2 transport available (Zenoh router, rosbridge, or local DDS on-robot)
- [Codex CLI](https://developers.openai.com/codex/) installed and on your `PATH`

## Quick setup

From a machine with Corebrum Synapse installed:

```bash
# First-time robot + MCP setup (includes optional Codex step)
npx @corebrum/synapse init

# Or configure Codex MCP only
synapse codex setup              # ~/.codex/config.toml
synapse codex setup --project    # .codex/config.toml in repo root

# Verify
synapse codex doctor
synapse doctor
```

Start Codex, then run `/mcp` in a session — you should see **synapse** connected with the full tool list (ROS tools, missions, follow-me, find-object, memory when enabled).

## Config files

| File | Scope |
|------|--------|
| `~/.codex/config.toml` | Global — all Codex sessions |
| `<project>/.codex/config.toml` | Project — only when Codex runs in that directory |

Corebrum Synapse writes the `[mcp_servers.synapse]` block with an **absolute path** to the MCP server binary. Codex does not use the repo root as cwd when spawning MCP servers, so relative paths fail.

Robot namespace is **not** hardcoded in Codex config. Leave `SYNAPSE_ROBOT_NAMESPACE = ""` so `~/.synapse/config.json` and `synapse mode real|sim` drive the active robot (same policy as `.mcp.json` for Claude Code).

## Manual registration

**Option A — `synapse codex setup` (recommended)**

```bash
synapse codex setup              # ~/.codex/config.toml
synapse codex setup --project    # .codex/config.toml in repo root
synapse codex doctor             # verify paths and namespace policy
```

**Option B — `codex mcp add`**

```bash
synapse codex setup   # prints the absolute MCP path
codex mcp add synapse -- node "/ABS/PATH/FROM/SETUP/index.js"
```

**Option C — edit TOML directly**

```toml
[mcp_servers.synapse]
command = "sh"
args = ["-c", "node /ABSOLUTE/PATH/TO/index.js 2>>/tmp/synapse-mcp.log"]
enabled = true
startup_timeout_sec = 30

[mcp_servers.synapse.env]
SYNAPSE_ROBOT_NAMESPACE = ""
```

## Shared robot config

All adapters read the same config (priority order):

1. `SYNAPSE_CONFIG_PATH`
2. `~/.synapse/config.json`
3. OpenClaw fallback (`~/.openclaw/openclaw.json` → `plugins.entries.synapse.config`)

Example:

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

Switch profiles:

```bash
synapse mode real   # or sim
```

Restart Codex after changing config so the MCP server reloads.

## Tools available in Codex

Same surface as Claude Code MCP:

- Core ROS: `ros2_list_topics`, `ros2_publish`, `ros2_estop`, `ros2_subscribe_once`, services, actions, params
- Perception: `ros2_camera_snapshot`, `ros2_depth_distance`
- Fleet: `ros2_discover_robots`, `ros2_list_capabilities`, `run_mission`, `mission_cancel`
- Built-in missions: follow-me and find-object tools
- Memory (when `memory.enabled` in config): `memory_remember`, `memory_recall`, …

See [packages/synapse-claude-code/README.md](../packages/synapse-claude-code/README.md) for tool details.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/mcp` does not list synapse | Run `synapse codex setup`; check `synapse codex doctor` |
| MCP server fails to start | Run `pnpm --filter @corebrum/claude-code build` or `synapse init` |
| Robot does not move in sim | Hardcoded `SYNAPSE_ROBOT_NAMESPACE` in Codex env — clear it and use `synapse mode sim` |
| Transport timeout | Ensure Zenoh/rosbridge is up; see `synapse doctor` |
| Logs | `/tmp/synapse-mcp.log` |

## Codex vs OpenClaw vs Gemini vs Hermes

| | Codex | Claude Code | OpenClaw | Gemini CLI | Hermes |
|--|-------|-------------|----------|------------|--------|
| Protocol | MCP | MCP | OpenClaw plugin | Function calling | MCP |
| Messaging / teleop | No | No | Yes | No | Yes |
| Setup | `synapse codex setup` | `.mcp.json` | `synapse init` plugin step | `synapse-gemini` | `synapse hermes setup` |

For WhatsApp/Telegram/teleop, use OpenClaw (which can run OpenAI models). For terminal coding agents, Codex and Claude Code share the same MCP server. For a model-agnostic messaging gateway, use Hermes + MCP.

## Future: headless OpenAI CLI

A standalone `@corebrum/openai` package (Gemini-style function calling without the Codex CLI) is **not** included yet. Track demand in project issues before adding a fourth tool-handler copy.
