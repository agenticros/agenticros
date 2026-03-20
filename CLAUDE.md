# AgenticROS

## What this is

AgenticROS is a ROS2 integration for AI agent platforms. It provides a **core** (transport, types, config) and **adapters** per platform. The **OpenClaw adapter** is the OpenClaw plugin that exposes ROS2 to the OpenClaw gateway (tools, commands, HTTP routes). Future adapters can support other agent platforms.

## Architecture

- **Core** (`packages/core`): Platform-agnostic. ROS2 transport (rosbridge, Zenoh, local, WebRTC), config schema (Zod), shared types. No OpenClaw or other platform APIs.
- **Adapters** (`packages/agenticros`, etc.): One package per AI platform. Each implements that platform’s plugin/extension contract and uses the core for ROS2.

## Repo layout

| Path | Purpose |
|------|---------|
| `packages/core` | @agenticros/core — transport, types, config |
| `packages/agenticros` | @agenticros/agenticros — OpenClaw plugin (id: agenticros) |
| `packages/agenticros-claude-code` | @agenticros/claude-code — Claude Code CLI MCP server (stdio) |
| `packages/agenticros-gemini` | @agenticros/gemini — Gemini CLI (function calling, no MCP) |
| `ros2_ws/src/agenticros_msgs` | ROS2 messages and services |
| `ros2_ws/src/agenticros_discovery` | Capability discovery node |
| `ros2_ws/src/agenticros_agent` | WebRTC agent node (Mode C) |
| `ros2_ws/src/agenticros_follow_me` | Follow Me mission node |
| `docs/` | Architecture, skills, setup |
| `scripts/` | Workspace and gateway setup |
| `docker/` | Docker Compose and images |

## Conventions

- **ESM only**, TypeScript strict, NodeNext.
- **pnpm workspaces**: `packages/*`.
- **npm scope**: `@agenticros/`.
- **ROS2 package prefix**: `agenticros_`.
- **OpenClaw plugin id**: `agenticros`. Config key: `plugins.entries.agenticros.config`. HTTP routes: `/agenticros/`, `/agenticros/config`, `/agenticros/teleop/`.
- **Config**: Zod in core; adapter reads/writes platform config (e.g. OpenClaw JSON file).

## Adapters

- **OpenClaw** (`packages/agenticros`): Plugin for the OpenClaw gateway — tools, config UI, teleop web page. See “Loading the OpenClaw plugin” below.
- **Claude Code CLI** (`packages/agenticros-claude-code`): MCP server over stdio for **Claude Code** (terminal) and the **Claude desktop app** on macOS (and **Claude Dispatch** on iPhone when paired to the Mac). Desktop MCP config: `~/Library/Application Support/Claude/claude_desktop_config.json` — use an absolute path to `dist/index.js`. Setup: [packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md).
- **Gemini CLI** (`packages/agenticros-gemini`): Standalone CLI using Google Gemini and function calling to chat with the robot (no MCP). Setup: [packages/agenticros-gemini/README.md](packages/agenticros-gemini/README.md). Requires `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

**Claude Code: use MCP tools for the robot (not the ros2 CLI).** When controlling the robot from Claude Code, use the agenticros MCP tools (e.g. `ros2_publish`, `ros2_list_topics`, `ros2_camera_snapshot`). Do not run `ros2 topic pub` or other `ros2` CLI commands in Bash — the `ros2` CLI is not installed on this machine; the robot is reached via the AgenticROS MCP server over Zenoh.

## Loading the OpenClaw plugin

Point the OpenClaw gateway at the plugin so it loads at startup:

- **From source**: Set the gateway’s plugin path to this repo’s `packages/agenticros` (OpenClaw loads `.ts` via jiti). Ensure `pnpm install` has been run at repo root so `@agenticros/core` is available.
- **Config**: In the OpenClaw config file (e.g. `~/.openclaw/openclaw.json` or `OPENCLAW_CONFIG`), the AgenticROS plugin config lives under `plugins.entries.agenticros.config`. The config UI is at `/agenticros/config` when the gateway is running.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm build
```

## Adding another adapter

Add `packages/<platform>/` that depends on `@agenticros/core`, implements that platform’s plugin API, and registers tools/commands by delegating to the core.
