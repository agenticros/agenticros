# AgenticROS

## What this is

AgenticROS is a ROS2 integration for AI agent platforms. It provides a **core** (transport, types, config) and **adapters** per platform.

- **OpenClaw adapter**: OpenClaw gateway plugin (tools, config UI, teleop HTTP routes)
- **Codex adapter**: MCP server over stdio (this environment)
- **Gemini adapter**: Standalone CLI using Gemini function calling

## IMPORTANT: Controlling the robot from Codex

**Use MCP tools — never the `ros2` CLI.** The `ros2` CLI is not installed on this machine. The robot is reached via the AgenticROS MCP server over Zenoh.

Available MCP tools:
- `ros2_list_topics` — list all topics with types
- `ros2_publish` — publish a message to a topic
- `ros2_subscribe_once` — read one message from a topic
- `ros2_service_call` — call a ROS2 service
- `ros2_action_goal` — send an action goal
- `ros2_param_get` / `ros2_param_set` — get/set node parameters
- `ros2_camera_snapshot` — capture a camera image
- `ros2_depth_distance` — sample depth at the center of the depth image
- `memory_remember` / `memory_recall` / `memory_forget` / `memory_status` — cross-adapter long-term memory (only when `config.memory.enabled` is true). Shared with OpenClaw, Codex, and Gemini for the same robot via `~/.mem0/vector_store.db` (mem0 backend) or `~/.agenticros/memory.json` (local backend). See `docs/memory.md`.

**Robot namespace**: `3946b404-c33e-4aa3-9a8d-16deb1c5c593`
**cmd_vel topic**: `/3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel`

## Architecture

```
packages/
  core/                    # @agenticros/core — transport, types, Zod config (no platform deps)
  ros-camera/              # @agenticros/ros-camera — shared camera snapshot encoding (Image / CompressedImage)
  agenticros/              # @agenticros/agenticros — OpenClaw plugin
  agenticros-claude-code/  # @agenticros/claude-code — MCP server (stdio, used by Codex CLI + Claude Code / Desktop / Dispatch)
  agenticros-gemini/       # @agenticros/gemini — Gemini CLI
  agenticros-cli/          # agenticros — orchestrator CLI
  robot-eyes/              # @agenticros/eyes — on-robot face display + WASD (local DDS)
ros2_ws/src/
  agenticros_msgs/         # Custom ROS2 messages & services
  agenticros_discovery/    # Capability discovery node (Python)
  agenticros_agent/        # WebRTC agent node, Mode C (Python)
  agenticros_follow_me/    # Follow Me mission (Python)
docs/                      # Architecture, skills, setup guides
scripts/                   # Workspace and gateway setup
docker/                    # Docker Compose and Dockerfiles
```

## Key source files

### Core (`packages/core/src/`)
| File | Purpose |
|------|---------|
| `config.ts` | Zod config schema — all transport modes, robot, safety, skills |
| `transport/factory.ts` | `createTransport(config)` — picks implementation by mode |
| `transport/transport.ts` | `RosTransport` interface (the contract all adapters share) |
| `transport/types.ts` | Shared types: `ConnectionStatus`, `PublishOptions`, `TopicInfo`, etc. |
| `transport/zenoh/adapter.ts` | Zenoh transport (binary CDR, Eclipse Zenoh) |
| `transport/rosbridge/adapter.ts` | Rosbridge transport (WebSocket, JSON) |
| `transport/webrtc/transport.ts` | WebRTC transport (cloud/remote Mode C) |
| `transport/local/transport.ts` | Local DDS transport via rclnodejs |
| `topic-utils.ts` | Namespace prefix helpers |
| `index.ts` | Public API re-exports |

### Camera package (`packages/ros-camera/src/`)
Shared camera snapshot encoding used by all adapters — handles both `sensor_msgs/Image` and `sensor_msgs/CompressedImage`.

### Codex MCP server (`packages/agenticros-claude-code/src/`)
| File | Purpose |
|------|---------|
| `index.ts` | Entry point — `StdioServerTransport`, registers tool handlers |
| `tools.ts` | All 9 MCP tool definitions + execution handlers |
| `config.ts` | Load config from env / `~/.agenticros/config.json` / OpenClaw fallback |
| `transport.ts` | Connect/disconnect lifecycle |
| `safety.ts` | Velocity safety validation before publish |
| `depth.ts` | Depth image sampling helper |

### OpenClaw plugin (`packages/agenticros/src/`)
| File | Purpose |
|------|---------|
| `index.ts` | Plugin registration, config loading |
| `tools/index.ts` | Register all 9 tools with OpenClaw |
| `tools/ros2-publish.ts` | Publish tool |
| `tools/ros2-camera.ts` | Camera snapshot tool |
| `tools/ros2-depth-distance.ts` | Depth distance tool |
| `service.ts` | Transport lifecycle for the plugin |
| `safety/validator.ts` | Velocity safety guard |
| `skill-loader.ts` | Dynamic skill package loading |
| `config-page.ts` | Web config UI |
| `routes.ts` | HTTP routes: `/agenticros/config`, `/agenticros/teleop/` |

## Conventions

- **ESM only**, TypeScript strict, NodeNext module resolution
- **pnpm workspaces**: `packages/*`
- **npm scope**: `@agenticros/`
- **ROS2 package prefix**: `agenticros_`
- All transports implement the `RosTransport` interface from `@agenticros/core`
- Config validated with Zod; defaults applied in the schema — never assume a field is set
- Dynamic imports in factory to avoid loading unused transport deps

## Adapters

- **OpenClaw** (`packages/agenticros`): Plugin for the OpenClaw gateway — tools, config UI, teleop web page. See "Loading the OpenClaw plugin" below.
- **Codex CLI** (`packages/agenticros-claude-code`): MCP server over stdio. The same server registers with **Codex CLI** and **Claude Code** / **Claude Desktop** / **Claude Dispatch**. Setup: `agenticros codex setup` (writes `~/.codex/config.toml` with an absolute path to `dist/index.js`). Docs: [docs/codex-setup.md](docs/codex-setup.md), [packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md).
- **Gemini CLI** (`packages/agenticros-gemini`): Standalone CLI using Google Gemini and function calling to chat with the robot (no MCP). Setup: [packages/agenticros-gemini/README.md](packages/agenticros-gemini/README.md). Requires `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

## Build & development commands

```bash
# From repo root
pnpm install                                      # Install all workspace deps
pnpm build                                        # Build all packages
pnpm typecheck                                    # Type-check all packages
pnpm clean                                        # Remove dist/ and .tsbuildinfo files
pnpm lint                                         # Lint all packages
pnpm mcp:kill                                     # Kill a running MCP server process

# Per-package (filter syntax)
pnpm --filter @agenticros/core build
pnpm --filter @agenticros/ros-camera build
pnpm --filter @agenticros/claude-code typecheck
pnpm --filter @agenticros/claude-code build       # Required after editing Codex src
```

After editing `packages/agenticros-claude-code/src/`, always run `pnpm --filter @agenticros/claude-code build` before testing — the MCP server runs from `dist/index.js`.

**External skill repos and the pnpm hardlink cascade**: Skills like `agenticros-skill-followme` and `agenticros-skill-find` consume `@agenticros/core` via `file:` deps. pnpm hardlinks them through a virtual store snapshot that is NOT auto-refreshed when `packages/core/dist/` gains new files. After adding new exports to `@agenticros/core`, run `pnpm refresh:skills` (or `pnpm deploy:plugin`, which includes it) to keep external skills in lockstep.

The same hardlink-snapshot trap also bites `~/.agenticros/plugin-deploy/`, which is the flattened tree OpenClaw loads the plugin from. `pnpm deploy --prod` snapshots `@agenticros/core/dist/` into the virtual store at deploy time and is NOT refreshed afterward. Two situations leave it stale and silently break the plugin:
- A new file is added to `packages/core/dist/` (e.g. a fresh `mission-registry.js`) and `index.js` starts importing it — the deployed snapshot still lacks the file → `Cannot find module './mission-registry.js'` → plugin fails to load → no `ros2_*` tools registered → agent falls back to bash/CLI for robot control with no safety clamps.
- OpenClaw self-updates (e.g. `openclaw update`) and re-loads plugins from disk, re-exposing the stale snapshot. The update can fire at unpredictable times mid-session; the first symptom is usually MCP tools vanishing from the agent's tool list and `tools.profile (...) allowlist contains unknown entries (ros2_publish, ...)` warnings in `/tmp/openclaw/openclaw-*.log`.

Always re-run `pnpm deploy:plugin` after either of: (a) any change to `@agenticros/core`'s exports, or (b) an OpenClaw self-update. Check plugin health with `rg -i "agenticros (failed|loaded successfully)" /tmp/openclaw/openclaw-*.log | tail -5`.

## Configuration system

Config is loaded (in priority order):
1. `AGENTICROS_CONFIG_PATH` env var path
2. `~/.agenticros/config.json`
3. OpenClaw config: `plugins.entries.agenticros.config` in `~/.openclaw/openclaw.json` or `OPENCLAW_CONFIG`

Override robot namespace at runtime:
```bash
AGENTICROS_ROBOT_NAMESPACE=<namespace> node dist/index.js
```

Key config fields (all have defaults in `packages/core/src/config.ts`):
```jsonc
{
  "transport": { "mode": "zenoh" },         // rosbridge | local | webrtc | zenoh
  "zenoh": { "routerEndpoint": "ws://localhost:10000" },
  "rosbridge": { "url": "ws://localhost:9090" },
  "robot": { "namespace": "...", "name": "Robot", "cameraTopic": "..." },
  "safety": { "maxLinearVelocity": 1.0, "maxAngularVelocity": 1.5 },
  "teleop": { "cmdVelTopic": "...", "speedDefault": 0.3 }
}
```

## MCP server setup

**Project-scoped** (`.mcp.json` at repo root — already configured):
```json
{
  "mcpServers": {
    "agenticros": {
      "type": "stdio",
      "command": "sh",
      "args": ["-c", "node packages/agenticros-claude-code/dist/index.js 2>>/tmp/agenticros-mcp.log"],
      "env": { "AGENTICROS_ROBOT_NAMESPACE": "robot3946b404c33e4aa39a8d16deb1c5c593" }
    }
  }
}
```

**Codex CLI config**: `~/.codex/config.toml` under `[mcp_servers.agenticros]` — use an absolute path to `dist/index.js`. Run `agenticros codex setup` to generate it. (For Claude Desktop, the config file is `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS — same server binary, different client config file.)

MCP server logs: `/tmp/agenticros-mcp.log`

## Adding a new ROS2 tool

Tools are mirrored across three adapters. Add to all three:

1. **Core** — no changes needed (transport handles arbitrary topics/services)
2. **Codex** (`packages/agenticros-claude-code/src/tools.ts`):
   - Add tool definition to the `tools` array (name, description, inputSchema)
   - Add handler in the `switch` in `callTool`
3. **OpenClaw** (`packages/agenticros/src/tools/`):
   - Add `ros2-<name>.ts` implementing the OpenClaw tool contract
   - Register in `src/tools/index.ts`
4. **Gemini** (`packages/agenticros-gemini/src/tools.ts`):
   - Add function declaration + handler

## Adding a new transport

1. Create `packages/core/src/transport/<name>/adapter.ts` implementing `RosTransport`
2. Add the mode to the Zod config union in `packages/core/src/config.ts`
3. Add a dynamic import case in `packages/core/src/transport/factory.ts`

## Adding a new adapter (agent platform)

1. Create `packages/agenticros-<platform>/` with `package.json` depending on `@agenticros/core` (and `@agenticros/ros-camera` if you need `ros2_camera_snapshot`)
2. Implement that platform's plugin/extension contract
3. Use `createTransport(config)` from core
4. Mirror the tool set from `packages/agenticros-claude-code/src/tools.ts` as a reference

## Loading the OpenClaw plugin

- **One-shot install**: `./scripts/setup_gateway_plugin.sh` — installs workspace deps, builds the required packages, flattens the plugin via `pnpm deploy --prod` into `~/.agenticros/plugin-deploy`, links it with `openclaw plugins install -l`, and restarts the gateway. Flags: `--transport`, `--rosbridge-url`, `--zenoh-endpoint`, `--robot-namespace`, `--camera-topic`, `--skip-build`, `--no-restart`.
- **Why the deploy step is required (OpenClaw 2026.6+)**: the install-time code safety scan rejects any `node_modules/*` symlink that resolves outside the plugin install root. pnpm workspace symlinks always trip this, so `openclaw plugins install -l ./packages/agenticros` no longer works against the source tree — `pnpm --filter ./packages/agenticros deploy --prod <dir>` produces a flat tree with all deps contained inside.
- **Default transport mode is `local`** (DDS direct via rclnodejs). Override with `--transport rosbridge|zenoh|webrtc` when the gateway runs off-robot.
- **Config**: In the OpenClaw config file (e.g. `~/.openclaw/openclaw.json` or `OPENCLAW_CONFIG`), the AgenticROS plugin config lives under `plugins.entries.agenticros.config`. The config UI is at `/agenticros/config` when the gateway is running.

## ROS2 workspace (Python nodes)

```bash
# Build (from ros2_ws/)
colcon build --symlink-install

# Source
source install/setup.bash

# Run nodes
ros2 run agenticros_discovery discovery_node
ros2 run agenticros_follow_me follow_me_node
```

Custom messages are in `ros2_ws/src/agenticros_msgs/msg/` and `srv/`.

## Safety

All velocity publishes go through a safety validator (both in Codex and OpenClaw adapters):
- `maxLinearVelocity` (default 1.0 m/s)
- `maxAngularVelocity` (default 1.5 rad/s)

Clamps are enforced in `packages/agenticros-claude-code/src/safety.ts` and `packages/agenticros/src/safety/validator.ts`.

## Docs

| File | Contents |
|------|---------|
| `docs/architecture.md` | Full system architecture |
| `docs/skills.md` | Skill development guide |
| `docs/robot-setup.md` | Hardware/software setup |
| `docs/zenoh-agenticros.md` | Zenoh integration |
| `docs/cameras.md` | Camera configuration |
| `docs/codex-setup.md` | OpenAI Codex CLI setup (`agenticros codex setup`) |
| `docs/local-vlm.md` | Local Ollama VLM setup for OpenClaw / Hermes (no cloud API keys) |
| `docs/teleop.md` | Teleop web app setup |
| `docs/eyes.md` | On-robot eyes display (`agenticros eyes`) |
