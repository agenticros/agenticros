# AgenticROS

This project was inspired by ROSClaw’s hackathon prototype but rewritten as an AI Agent agnostic ROS interface layer.

AgenticROS connects ROS2 robots to AI Agent platforms so you can control and query robots via natural language. It ships with an **OpenClaw** adapter (plugin) and is structured so additional adapters for other agent platforms can be added later.

## Architecture

- **Core** (`packages/core`): Platform-agnostic ROS2 transport (rosbridge, Zenoh, local, WebRTC), config schema, and shared types. No dependency on any specific AI platform.
- **Adapters** (`packages/agenticros`, and later others): Implement the contract for each AI platform. The OpenClaw adapter registers tools, commands, and HTTP routes with the OpenClaw gateway and uses the core for all ROS2 communication.
- **`packages/agenticros-claude-code`** — MCP server for **Claude Code CLI**: use Claude from the terminal to talk to your robot (e.g. “what do you see?”, “move 1m forward”). See [packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md).

```
User (messaging app) → OpenClaw Gateway → AgenticROS OpenClaw plugin → Core → ROS2 robots
Claude Code CLI → agenticros MCP server → Core → ROS2 robots (Zenoh/rosbridge)
```

## Repository layout

- **`packages/core`** — Transport, types, config (Zod). Used by all adapters.
- **`packages/agenticros`** — OpenClaw plugin: tools, commands, config page, teleop routes.
- **`packages/agenticros-claude-code`** — Claude Code CLI MCP server (tools only; no config UI).
- **`ros2_ws/`** — ROS2 workspace: `agenticros_msgs`, `agenticros_discovery`, `agenticros_agent`, `agenticros_follow_me`.
- **`docs/`** — Architecture, skills, robot setup, Zenoh, teleop.
- **`scripts/`** — Workspace setup, gateway plugin config, run demos.
- **`docker/`** — Docker Compose and Dockerfiles for ROS2 + plugin images.
- **`examples/`** — Example projects.

## Requirements

- Node.js >= 20, pnpm >= 9
- ROS2 (Jazzy or compatible) for building and running the ROS2 packages
- OpenClaw gateway for the OpenClaw plugin

## Quick start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Build ROS2 workspace** (optional, if you need discovery/agent/follow_me nodes)

   ```bash
   cd ros2_ws
   colcon build --packages-select agenticros_msgs agenticros_discovery agenticros_agent agenticros_follow_me
   source install/setup.bash
   ```

3. **Type-check packages**

   ```bash
   pnpm typecheck
   ```

4. **Install and test the OpenClaw plugin**

   Point the OpenClaw gateway at this repo’s `packages/agenticros` (or at a built package). Configure the plugin under `plugins.entries.agenticros.config` in your OpenClaw config file. Run `./scripts/setup_gateway_plugin.sh` from the repo root to register the plugin and print next steps. **Recommended:** OpenClaw **2026.3.11** or later — plugin routes work at http://127.0.0.1:18789/plugins/agenticros/ (config, teleop). For local dev without token auth, run **`node scripts/setup-openclaw-local.cjs`** then restart the gateway. **If URLs don't load** (e.g. gateway logs "missing or invalid auth" on older versions): run **`./scripts/use-openclaw-2026.2.26.sh`** as fallback. See **docs/openclaw-releases-and-plugin-routes.md**.

**With token auth:** Run `node scripts/agenticros-proxy.cjs 18790` and open http://127.0.0.1:18790/plugins/agenticros/. See **docs/teleop.md**.

See **`docs/`** for robot setup, skills, teleop, and Docker.

## Claude Code CLI (terminal)

Use **Claude Code** in the terminal to control and query your robot via natural language (e.g. “move forward 1 meter”, “what do you see?”).

1. **Build** (from repo root): `pnpm install && pnpm build`
2. **Config**: Create `~/.agenticros/config.json` (see [packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md) for shape). Set `zenoh.routerEndpoint` (e.g. `ws://localhost:10000`) and `robot.namespace` if your robot uses a namespaced `cmd_vel`.
3. **Start Zenoh**: Run `zenohd` with the remote-api plugin so port 10000 is listening (see `scripts/zenohd-agenticros.json5` or [docs/zenoh-agenticros.md](docs/zenoh-agenticros.md)).
4. **Register MCP** (project scope, from repo root):
   ```bash
   claude mcp add --transport stdio --scope project agenticros -- node packages/agenticros-claude-code/dist/index.js
   ```
   Or add the server via `.mcp.json` (see package README). To avoid multiple MCP processes, run `pnpm mcp:kill` before starting a fresh `claude` session after rebuilding.
5. **Run Claude**: `claude` then e.g. “List ROS2 topics”, “What do you see?”, “Move the robot forward 1 meter.”

Full steps, troubleshooting, and permissions are in **[packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md)**.

## Skills

AgenticROS **skills** are optional packages that add tools and behaviors to the plugin. They are loaded at gateway start.

**[AgenticROS Skills](https://github.com/agenticros/agenticros-skills)** is a curated list of skills — use it to discover skills for your robot and to submit your own via pull request.

- **Install**: In the OpenClaw config file, under `plugins.entries.agenticros.config`, set **`skillPackages`** (e.g. `["agenticros-skill-followme"]`) and ensure the package is installed where the gateway runs, or set **`skillPaths`** to directories containing skill packages. Restart the gateway after changes.
- **Config**: Each skill reads its options from **`config.skills.<skillId>`** (e.g. `config.skills.followme`).
- **Contract and creating a skill**: See **[docs/skills.md](docs/skills.md)** for the full contract, install steps, and how to build a third-party skill.
- **Reference skill**: **[agenticros-skill-followme](https://github.com/your-org/agenticros-skill-followme)** — Follow Me (depth + optional Ollama), with tools `follow_robot`, `follow_me_see`, and `ollama_status`. Use its README as a template for new skills.

## Running AgenticROS on NemoClaw

[NVIDIA NemoClaw](https://github.com/NVIDIA/NemoClaw) runs OpenClaw inside an OpenShell sandbox with policy-enforced egress and inference. AgenticROS uses the same OpenClaw plugin API, so it is compatible—but you must add and configure the plugin inside the sandbox. No code changes are required.

1. **Add the AgenticROS plugin to the NemoClaw sandbox**  
   Make the AgenticROS package available inside the sandbox (bake it into the sandbox image or mount this repo). Ensure the OpenClaw gateway inside the sandbox can load it (e.g. `plugins.load.paths` or `openclaw plugins install -l` pointing at `packages/agenticros`).

2. **Configure OpenClaw in the sandbox**  
   In the sandbox’s OpenClaw config (e.g. `~/.openclaw/openclaw.json`), add the AgenticROS plugin: set **`plugins.entries.agenticros`** with the plugin path and **`plugins.entries.agenticros.config`** (transport mode, Zenoh endpoint or rosbridge URL, robot namespace, etc.). Same shape as [Quick start](#quick-start) step 4.

3. **Allow network access to the robot**  
   The sandbox restricts egress. In NemoClaw/OpenShell network policy, allow outbound connections to your robot’s Zenoh router (e.g. WebSocket port) or rosbridge host/port so the plugin can reach the robot.

4. **Restart the gateway**  
   Restart the OpenClaw gateway inside the sandbox so it loads both NemoClaw and AgenticROS. Then use the TUI or your channel to chat; the agent can use AgenticROS tools.

See **[NemoClaw](https://github.com/NVIDIA/NemoClaw)** for install, sandbox lifecycle, and network policies.

## License

Apache-2.0
