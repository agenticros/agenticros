# AgenticROS

AgenticROS connects ROS2 robots to AI agent platforms so you can control and query robots via natural language. It ships with an **OpenClaw** adapter (plugin) and is structured so additional adapters for other agent platforms can be added later.

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
- **`docs/`** — Architecture, missions, robot setup, Zenoh, teleop.
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

   Point the OpenClaw gateway at this repo’s `packages/agenticros` (or at a built package). Configure the plugin under `plugins.entries.agenticros.config` in your OpenClaw config file. Run `./scripts/setup_gateway_plugin.sh` from the repo root to register the plugin and print next steps. **Quick test:** open `http://<gateway-host>:<port>/agenticros/config` for the plugin config UI, or `/agenticros/teleop/ping` for `{"ok":true,"agenticros":"teleop"}`.

See **`docs/`** for robot setup, missions, teleop, and Docker.

## License

Apache-2.0
