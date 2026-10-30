# Antigravity CLI setup

Use the [Google Antigravity CLI](https://antigravity.google/docs/cli/) (`agy`) to control a ROS 2 robot through the same Corebrum Synapse MCP server as Claude Code, Codex, and Hermes. There is no separate adapter package and no `GEMINI_API_KEY`. `agy` uses the Antigravity / Gemini subscription you already signed in with.

[`synapse-gemini`](../packages/synapse-gemini/README.md) is a different path: it calls the Gemini API with a key. This guide is only for the `agy` CLI.

## Prerequisites

- Node.js 20+
- Corebrum Synapse built (`pnpm build` or `npx @corebrum/synapse init`)
- ROS 2 transport available (Zenoh router, rosbridge, or local DDS on-robot)
- [Antigravity CLI](https://antigravity.google/docs/cli/) installed and on your `PATH`
- One interactive `agy` session so headless runs can reuse cached credentials

## Quick setup

```bash
npx @corebrum/synapse init          # optional; includes Antigravity when `agy` is on PATH

synapse agy setup         # global mcp_config.json, project .agents/ when in a repo, and the skill
synapse agy doctor
```

`synapse mcp setup` writes the same Antigravity files along with Codex, Hermes, and Claude.

In an `agy` session, `/mcp` should list `synapse`. You can also add the server from that overlay instead of the CLI.

## What gets written

- `~/.gemini/config/mcp_config.json` — global MCP servers
- `<repo>/.agents/mcp_config.json` — workspace MCP servers, when setup runs inside a Corebrum Synapse repo
- `~/.gemini/antigravity-cli/skills/synapse/SKILL.md` — when to use the robot tools
- `<repo>/.agents/skills/synapse/SKILL.md` — the same skill for this workspace
- `~/.gemini/antigravity-cli/settings.json` — adds `mcp(synapse/*)` to `permissions.allow` so headless `agy` can call the robot tools

The server entry uses this machine's Node binary, an absolute path to the MCP server, and `SYNAPSE_ROBOT_NAMESPACE` set to `""` so `synapse mode real|sim` selects the robot.

The skill does not list every tool. MCP tool schemas already do. It tells `agy` to use the `synapse` server instead of a `ros2` shell, and to call `ros2_estop` to halt motion.

## Run a prompt

Sign in with interactive `agy` once. Then:

```bash
synapse agy run "List active ROS 2 topics"
synapse agy run --model gemini-2.5-pro "What is in front of the robot?"
```

Headless `agy` cannot prompt. `synapse agy setup` allows the Corebrum Synapse MCP server (`mcp(synapse/*)`), so `ros2_list_topics` and the other robot tools run. Velocity is still clamped by Corebrum Synapse safety limits. Shell commands and other tools stay on Ask and are denied in headless mode unless you allow them yourself. Pass `--yes` only when every tool, including shell commands, should auto-approve for that run (`agy --dangerously-skip-permissions`):

```bash
synapse agy run --yes "Drive forward slowly, then stop"
```

## Manual registration

```json
{
  "mcpServers": {
    "synapse": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/ABSOLUTE/PATH/TO/packages/synapse-claude-code/dist/index.js"],
      "env": {
        "SYNAPSE_ROBOT_NAMESPACE": ""
      }
    }
  }
}
```

Put that in `~/.gemini/config/mcp_config.json` or `.agents/mcp_config.json`. `synapse agy setup` writes the same shape and leaves other MCP servers in the file alone.

## Troubleshooting

- **`agy doctor` says the config is missing** — run `synapse agy setup`. Antigravity reads `~/.gemini/config/mcp_config.json` and `.agents/mcp_config.json`.
- **`/mcp` does not list synapse** — confirm the absolute path in `mcp_config.json` and restart `agy`.
- **`agy run` says a tool required the `mcp` permission** — headless mode cannot prompt, so MCP is denied until `permissions.allow` contains `mcp(synapse/*)`. Run `synapse agy setup` again. That writes `~/.gemini/antigravity-cli/settings.json` and leaves your other allow rules in place.
- **`synapse agy run` exits with authentication required** — run interactive `agy` once on this machine so credentials are cached.
- **Headless output is empty when piped** — `agy -p` is unreliable when stdout is not a terminal. `synapse agy run` inherits your terminal. Capture output from an interactive terminal, or check current `agy` release notes if you script it.
