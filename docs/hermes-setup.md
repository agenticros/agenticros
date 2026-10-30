# Hermes Agent setup

Use **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** to control your ROS 2 robot through the same Corebrum Synapse MCP server as Claude Code and Codex. Hermes is a standard MCP client — no separate adapter package is required.

Hermes is **model-agnostic**: OpenAI, Anthropic, OpenRouter, Ollama, and 200+ other providers. Your LLM choice does not change Corebrum Synapse integration — only the MCP client config matters.

For **fully local** inference with Ollama (no cloud API keys), see **[local-vlm.md](local-vlm.md)**.

## Prerequisites

- Node.js 20+
- Corebrum Synapse built (`pnpm build` or `npx @corebrum/synapse init`)
- ROS 2 transport available (Zenoh router, rosbridge, or local DDS on-robot)
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) installed and on your `PATH`

## Quick setup

From a machine with Corebrum Synapse installed:

```bash
# First-time robot + MCP setup (includes optional Hermes step)
npx @corebrum/synapse init

# Or configure Hermes MCP only
synapse hermes setup

# Verify
synapse hermes doctor
synapse doctor
```

In Hermes, run `/reload-mcp` (or restart Hermes), then verify with `hermes mcp test synapse`. You should see the full Corebrum Synapse tool list (ROS tools, missions, follow-me, find-object, memory when enabled).

## Config file

| File | Scope |
|------|--------|
| `~/.hermes/config.yaml` | Global — default Hermes profile (v1) |

Corebrum Synapse writes `mcp_servers.synapse` with an **absolute path** to the MCP server binary. Hermes does not use the repo root as cwd when spawning MCP servers, so relative paths fail.

Robot namespace is **not** hardcoded in Hermes config. Leave `SYNAPSE_ROBOT_NAMESPACE: ""` so `~/.synapse/config.json` and `synapse mode real|sim` drive the active robot (same policy as Codex and Claude Code).

## Manual registration

**Option A — `synapse hermes setup` (recommended)**

```bash
synapse hermes setup
synapse hermes doctor
```

**Option B — edit YAML directly**

```yaml
# ~/.hermes/config.yaml
mcp_servers:
  synapse:
    command: "node"
    args: ["/ABSOLUTE/PATH/TO/packages/synapse-claude-code/dist/index.js"]
    env:
      SYNAPSE_ROBOT_NAMESPACE: ""
    connect_timeout: 60
    timeout: 120
```

Then `/reload-mcp` in Hermes or restart the agent.

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

Reload MCP in Hermes after changing robot config (`/reload-mcp`).

## Tools available in Hermes

Same surface as Claude Code / Codex MCP:

- Core ROS: `ros2_list_topics`, `ros2_publish`, `ros2_estop`, `ros2_subscribe_once`, services, actions, params
- Perception: `ros2_camera_snapshot`, `ros2_depth_distance`
- Fleet: `ros2_discover_robots`, `ros2_list_capabilities`, `run_mission`, `mission_cancel`
- Built-in missions: follow-me and find-object tools
- Memory (when `memory.enabled` in config): `memory_remember`, `memory_recall`, …

See [packages/synapse-claude-code/README.md](../packages/synapse-claude-code/README.md) for tool details.

## Codex + Hermes on the same machine

Both are MCP clients. They can share `~/.synapse/config.json`, cross-adapter memory, and the same built MCP server. Codex for terminal work and Hermes for messaging (Telegram, Discord, etc.) is a valid split — coordinate so two agents do not drive the robot at once without intent.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `hermes mcp test synapse` fails | Run `synapse hermes setup`; check `synapse hermes doctor` |
| MCP tools missing after config edit | Run `/reload-mcp` in Hermes or restart |
| MCP server fails to start | Run `pnpm --filter @corebrum/claude-code build` or `synapse init` |
| Robot does not move in sim | Hardcoded `SYNAPSE_ROBOT_NAMESPACE` in Hermes env — clear it and use `synapse mode sim` |
| Transport timeout | Ensure Zenoh/rosbridge is up; see `synapse doctor` |
| Logs | `/tmp/synapse-mcp.log` (when using shell wrapper); Hermes MCP client logs per Hermes docs |

## Hermes vs OpenClaw vs Codex vs Gemini

| | Hermes | Codex | Claude Code | OpenClaw | Gemini CLI |
|--|--------|-------|-------------|----------|------------|
| Protocol | MCP | MCP | MCP | OpenClaw plugin | Function calling |
| Messaging / teleop | Yes (15+ channels) | No | No | Yes | No |
| Model choice | 200+ providers / Ollama | OpenAI | Anthropic | Gateway models (Ollama or cloud) | Google Gemini |
| External skills | Hermes skills | Built-in missions | Built-in missions | Dynamic skill loader | Subset of tools |
| Setup | `synapse hermes setup` | `synapse codex setup` | `.mcp.json` | `synapse init` plugin step | `synapse-gemini` |

For teleop web UI and in-process `corebrum-skill-*` loading, use OpenClaw (local Ollama: [local-vlm.md](local-vlm.md)). For terminal MCP clients, use Codex or Claude Code. For messaging with a model-agnostic gateway, use Hermes + MCP.
