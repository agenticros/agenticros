# AgenticROS

This project was inspired by ROSClaw’s hackathon prototype but rewritten as an AI Agent agnostic ROS interface layer.

AgenticROS connects ROS2 robots to AI Agent platforms so you can control and query robots via natural language. It ships with an **OpenClaw** adapter (plugin) and is structured so additional adapters for other agent platforms can be added later.

## Architecture

- **Core** (`packages/core`): Platform-agnostic ROS2 transport (rosbridge, Zenoh, local, WebRTC), config schema, and shared types. No dependency on any specific AI platform.
- **Adapters** (`packages/agenticros`, and later others): Implement the contract for each AI platform. The OpenClaw adapter registers tools, commands, and HTTP routes with the OpenClaw gateway and uses the core for all ROS2 communication.

```
User (messaging app) → OpenClaw Gateway → AgenticROS OpenClaw plugin → Core → ROS2 robots
```

## Repository layout

- **`packages/core`** — Transport, types, config (Zod). Used by all adapters.
- **`packages/agenticros`** — OpenClaw plugin: tools, commands, config page, teleop routes.
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

   Point the OpenClaw gateway at this repo’s `packages/agenticros` (or at a built package). Configure the plugin under `plugins.entries.agenticros.config` in your OpenClaw config file. Run `./scripts/setup_gateway_plugin.sh` from the repo root to register the plugin and print next steps. **If web chat and AgenticROS URLs don't load** (gateway logs "missing or invalid auth"): run **`./scripts/use-openclaw-2026.2.26.sh`**, then restart the gateway. Then open http://127.0.0.1:18789/ (web chat) and http://127.0.0.1:18789/plugins/agenticros/ (config, teleop). See **docs/openclaw-releases-and-plugin-routes.md**.

**With token auth:** Run `node scripts/agenticros-proxy.cjs 18790` and open http://127.0.0.1:18790/plugins/agenticros/. See **docs/teleop.md**.

See **`docs/`** for robot setup, skills, teleop, and Docker.

## Skills

AgenticROS **skills** are optional packages that add tools and behaviors to the plugin. They are loaded at gateway start.

- **Install**: In the OpenClaw config file, under `plugins.entries.agenticros.config`, set **`skillPackages`** (e.g. `["agenticros-skill-followme"]`) and ensure the package is installed where the gateway runs, or set **`skillPaths`** to directories containing skill packages. Restart the gateway after changes.
- **Config**: Each skill reads its options from **`config.skills.<skillId>`** (e.g. `config.skills.followme`).
- **Contract and creating a skill**: See **[docs/skills.md](docs/skills.md)** for the full contract, install steps, and how to build a third-party skill.
- **Reference skill**: **[agenticros-skill-followme](https://github.com/your-org/agenticros-skill-followme)** — Follow Me (depth + optional Ollama), with tools `follow_robot`, `follow_me_see`, and `ollama_status`. Use its README as a template for new skills.

## License

Apache-2.0
