# Antigravity CLI setup

Use the [Google Antigravity CLI](https://antigravity.google/docs/cli/) (`agy`) to control a ROS 2 robot through the same AgenticROS MCP server as Claude Code, Codex, and Hermes. There is no separate adapter package and no `GEMINI_API_KEY`. `agy` uses the Antigravity / Gemini subscription you already signed in with.

[`agenticros-gemini`](../packages/agenticros-gemini/README.md) is a different path: it calls the Gemini API with a key. This guide is only for the `agy` CLI.

## Prerequisites

- Node.js 20+
- AgenticROS built (`pnpm build` or `npx agenticros init`)
- ROS 2 transport available (Zenoh router, rosbridge, or local DDS on-robot)
- [Antigravity CLI](https://antigravity.google/docs/cli/) installed and on your `PATH`
- One interactive `agy` session so headless runs can reuse cached credentials

## Quick setup

```bash
npx agenticros init          # optional; includes Antigravity when `agy` is on PATH

agenticros agy setup         # global mcp_config.json, project .agents/ when in a repo, and the skill
agenticros agy doctor
```

`agenticros mcp setup` writes the same Antigravity files along with Codex, Hermes, and Claude.

In an `agy` session, `/mcp` should list `agenticros`. You can also add the server from that overlay instead of the CLI.

## What gets written

- `~/.gemini/config/mcp_config.json` — global MCP servers
- `<repo>/.agents/mcp_config.json` — workspace MCP servers, when setup runs inside an AgenticROS repo
- `~/.gemini/antigravity-cli/skills/agenticros/SKILL.md` — when to use the robot tools
- `<repo>/.agents/skills/agenticros/SKILL.md` — the same skill for this workspace
- `~/.gemini/antigravity-cli/settings.json` — adds `mcp(agenticros/*)` to `permissions.allow` so headless `agy` can call the robot tools

The server entry uses this machine's Node binary, an absolute path to the MCP server, and `AGENTICROS_ROBOT_NAMESPACE` set to `""` so `agenticros mode real|sim` selects the robot.

The skill does not list every tool. MCP tool schemas already do. It tells `agy` to use the `agenticros` server instead of a `ros2` shell, and to call `ros2_estop` to halt motion.

## Run a prompt

Sign in with interactive `agy` once. Then:

```bash
agenticros agy run "List active ROS 2 topics"
agenticros agy run --model gemini-2.5-pro "What is in front of the robot?"
```

Headless `agy` cannot prompt. `agenticros agy setup` allows the AgenticROS MCP server (`mcp(agenticros/*)`), so `ros2_list_topics` and the other robot tools run. Velocity is still clamped by AgenticROS safety limits. Shell commands and other tools stay on Ask and are denied in headless mode unless you allow them yourself. Pass `--yes` only when every tool, including shell commands, should auto-approve for that run (`agy --dangerously-skip-permissions`):

```bash
agenticros agy run --yes "Drive forward slowly, then stop"
```

## Manual registration

```json
{
  "mcpServers": {
    "agenticros": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/ABSOLUTE/PATH/TO/packages/agenticros-claude-code/dist/index.js"],
      "env": {
        "AGENTICROS_ROBOT_NAMESPACE": ""
      }
    }
  }
}
```

Put that in `~/.gemini/config/mcp_config.json` or `.agents/mcp_config.json`. `agenticros agy setup` writes the same shape and leaves other MCP servers in the file alone.

## Troubleshooting

- **`agy doctor` says the config is missing** — run `agenticros agy setup`. Antigravity reads `~/.gemini/config/mcp_config.json` and `.agents/mcp_config.json`.
- **`/mcp` does not list agenticros** — confirm the absolute path in `mcp_config.json` and restart `agy`.
- **`agy run` says a tool required the `mcp` permission** — headless mode cannot prompt, so MCP is denied until `permissions.allow` contains `mcp(agenticros/*)`. Run `agenticros agy setup` again. That writes `~/.gemini/antigravity-cli/settings.json` and leaves your other allow rules in place.
- **`agenticros agy run` exits with authentication required** — run interactive `agy` once on this machine so credentials are cached.
- **Headless output is empty when piped** — `agy -p` is unreliable when stdout is not a terminal. `agenticros agy run` inherits your terminal. Capture output from an interactive terminal, or check current `agy` release notes if you script it.
