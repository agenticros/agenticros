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
