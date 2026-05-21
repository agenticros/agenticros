# AgenticROS

This project was inspired by ROSClaw’s hackathon prototype but rewritten as an AI Agent agnostic ROS interface layer.

AgenticROS connects ROS2 robots to AI Agent platforms so you can control and query robots via natural language. It ships with an **OpenClaw** adapter (plugin) and is structured so additional adapters for other agent platforms can be added later.

## Architecture

- **Core** (`packages/core`): Platform-agnostic ROS2 transport (rosbridge, Zenoh, local, WebRTC), config schema, and shared types. No dependency on any specific AI platform.
- **Adapters** (`packages/agenticros`, and later others): Implement the contract for each AI platform. The OpenClaw adapter registers tools, commands, and HTTP routes with the OpenClaw gateway and uses the core for all ROS2 communication.
- **`packages/agenticros-claude-code`** — MCP server for **Claude Code** (terminal), **Claude desktop** (macOS), and **Dispatch** (iOS paired to Mac). See [packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md).
- **`packages/agenticros-gemini`** — **Gemini CLI**: use Google Gemini to chat with your robot from the terminal (same ROS2 tools, no MCP). See [packages/agenticros-gemini/README.md](packages/agenticros-gemini/README.md).

```
User (messaging app) → OpenClaw Gateway → AgenticROS OpenClaw plugin → Core → ROS2 robots
Claude (Code / desktop / Dispatch) → agenticros MCP server → Core → ROS2 robots (Zenoh/rosbridge)
Gemini CLI → @agenticros/gemini (function calling) → Core → ROS2 robots
```

## Repository layout

- **`packages/core`** — Transport, types, config (Zod). Used by all adapters.
- **`packages/agenticros`** — OpenClaw plugin: tools, commands, config page, teleop routes.
- **`packages/agenticros-claude-code`** — MCP server for Claude Code + Claude desktop / Dispatch (tools only; no config UI).
- **`packages/agenticros-gemini`** — Gemini CLI (function calling; no MCP).
- **`ros2_ws/`** — ROS2 workspace: `agenticros_msgs`, `agenticros_bringup` (Gazebo + RViz + rosbridge launches), `agenticros_discovery`, `agenticros_agent`, `agenticros_follow_me`.
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
   colcon build --packages-select agenticros_msgs agenticros_bringup agenticros_discovery agenticros_agent agenticros_follow_me
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

## RViz2 and Gazebo (TurtleBot3 + rosbridge)

The package **`agenticros_bringup`** provides launch files and an RViz2 config so you can run the same style of stack used in **`examples/turtlebot-chat`** and **`docker/`**: TurtleBot3 in Gazebo, **`/scan`**, **`/cmd_vel`**, and rosbridge on **port 9090** for the AgenticROS plugin.

**Install** (Ubuntu / ROS 2 Jazzy): `sudo apt install ros-jazzy-turtlebot3-gazebo ros-jazzy-rviz2 ros-jazzy-rosbridge-suite` (or rely on the Docker image, which already includes them). **`colcon build` does not install this** — if you see `package 'turtlebot3_gazebo' not found`, run the `apt` line above, then verify with `ros2 pkg prefix turtlebot3_gazebo` after sourcing `/opt/ros/jazzy/setup.bash`.

For **namespaced** `cmd_vel` (same `robot.namespace` as the plugin in OpenClaw), pass **`robot_namespace:=<id>`** to the Gazebo bringup launches, or see [agenticros_bringup README](ros2_ws/src/agenticros_bringup/README.md#namespaced-cmd_vel-agenticros-robotnamespace).

**Build** the workspace package (from **`ros2_ws`** after a full `colcon build`, or alone):

```bash
cd ros2_ws
source /opt/ros/jazzy/setup.bash
colcon build --packages-select agenticros_bringup
source install/setup.bash
```

**Commands** (after `source install/setup.bash`):

| Goal | Command |
|------|--------|
| **Rosbridge + Gazebo** (headless-friendly; plugin uses `ws://localhost:9090`) | `ros2 launch agenticros_bringup rosbridge_gazebo.launch.py` |
| **Gazebo + RViz** on one machine (needs a display) | `ros2 launch agenticros_bringup turtlebot3_gazebo_rviz.launch.py` |
| **RViz only** (simulation already running) | `ros2 launch agenticros_bringup rviz.launch.py use_sim_time:=true` |
| **Gazebo only** (you start rosbridge yourself) | `ros2 launch agenticros_bringup gazebo_turtlebot3.launch.py` |

**Parameters**: e.g. `turtlebot3_model:=waffle`, or `rviz_config:=/path/to/custom.rviz` for the RViz launch.

**Mode A (local DDS)** — OpenClaw and Gazebo on the **same machine**, plugin transport **`local`** (no rosbridge). Match **`ROS_DOMAIN_ID`** between the sim and the plugin (default **`0`**):

```bash
ros2 launch agenticros_bringup mode_a_gazebo.launch.py
# With RViz: ros2 launch agenticros_bringup mode_a_gazebo_rviz.launch.py
```

In the AgenticROS config UI, set **Transport mode** to **local** and **Domain ID** to the same value as `ros_domain_id` (default `0`). Then drive the robot with the usual tools (e.g. `ros2_publish` on `/cmd_vel`).

**Docker** (starts Gazebo + TurtleBot3 + rosbridge — typical for **Mode B** plugin on host → `ws://localhost:9090`):

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.sim.yml up ros2
```

Then configure the AgenticROS plugin with **`ws://localhost:9090`** as usual. The bundled RViz config is **`turtlebot3_agenticros.rviz`** (fixed frame **`odom`**, LaserScan **`/scan`**, RobotModel from **`/robot_description`**). Adjust displays in RViz if your robot uses different topic names.

Details: [ros2_ws/src/agenticros_bringup/README.md](ros2_ws/src/agenticros_bringup/README.md).

## Claude + AgenticROS (MCP)

The same **AgenticROS MCP server** (`@agenticros/claude-code`) can drive the robot from **Claude Code** (terminal) or from the **Claude desktop app** on macOS (including **Claude Dispatch** on iPhone when paired to Claude on your Mac). Both use MCP; they use **different config files**.

Shared setup:

1. **Build** (from repo root): `pnpm install && pnpm build`
2. **AgenticROS config**: `~/.agenticros/config.json` — set `zenoh.routerEndpoint`, `robot.namespace`, `robot.cameraTopic`, etc. (see [packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md)).
3. **Zenoh**: Run `zenohd` with the remote-api plugin (e.g. port 10000) — see `scripts/zenohd-agenticros.json5` or [docs/zenoh-agenticros.md](docs/zenoh-agenticros.md).

Optional: override `robot.namespace` per MCP launch with env **`AGENTICROS_ROBOT_NAMESPACE`** (must match the robot’s topic namespace exactly; many setups use **no dashes** in the UUID segment).

### Claude Code CLI (terminal)

1. **Register MCP** (project scope, from repo root):

   ```bash
   claude mcp add --transport stdio --scope project agenticros -- node packages/agenticros-claude-code/dist/index.js
   ```

   Or add the server via `.mcp.json` in the repo. To avoid multiple MCP processes, run `pnpm mcp:kill` before starting a fresh `claude` session after rebuilding.

2. **Run**: `claude` — e.g. “List ROS2 topics”, “What do you see?”, “Publish a stop to cmd_vel.”

### Claude desktop app + Dispatch (iOS)

Claude Code stores MCP in `~/.claude.json` or project `.mcp.json`. The **Claude desktop app** uses a separate file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

1. Copy your **agenticros** MCP entry from Claude Code / `.mcp.json` into `mcpServers` in `claude_desktop_config.json`.
2. Use an **absolute path** to `packages/agenticros-claude-code/dist/index.js` (the desktop app’s working directory is not your repo root, so relative `node packages/...` paths will fail).
3. **Fully quit** the Claude desktop app (not just close the window) and reopen it. The **agenticros** tools should appear in the desktop app and in **Dispatch** when your phone is paired to Claude on the Mac.

Example `mcpServers` entry (adjust the path and namespace to your machine):

```json
{
  "mcpServers": {
    "agenticros": {
      "command": "sh",
      "args": [
        "-c",
        "node /ABSOLUTE/PATH/TO/agenticros/packages/agenticros-claude-code/dist/index.js 2>>/tmp/agenticros-mcp.log"
      ],
      "env": {
        "AGENTICROS_ROBOT_NAMESPACE": "robotYOUR_NAMESPACE_NO_DASHES"
      }
    }
  }
}
```

Full steps, permissions (`mcp__agenticros`), and troubleshooting are in **[packages/agenticros-claude-code/README.md](packages/agenticros-claude-code/README.md)**.

## Gemini CLI

Use **Google Gemini** to chat with your robot from the terminal (same ROS2 tools as Claude Code, no MCP).

1. **Build**: `pnpm install && pnpm build`
2. **Config**: Same as Claude Code — `~/.agenticros/config.json` with `zenoh.routerEndpoint`, `robot.namespace`, etc.
3. **Run**: Set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and run:
   ```bash
   GEMINI_API_KEY=xxx pnpm --filter @agenticros/gemini exec agenticros-gemini "What do you see?"
   ```

See **[packages/agenticros-gemini/README.md](packages/agenticros-gemini/README.md)** for details and tested command examples (camera snapshot/description, depth distance, forward Twist, and stop).

## Skills

AgenticROS **skills** are optional packages that add tools and behaviors to the plugin. They are loaded at gateway start.

**[AgenticROS Skills](https://github.com/agenticros/agenticros-skills)** is a curated list of skills — use it to discover skills for your robot and to submit your own via pull request.

- **Install**: In the OpenClaw config file, under `plugins.entries.agenticros.config`, set **`skillPackages`** (e.g. `["agenticros-skill-followme"]`) and ensure the package is installed where the gateway runs, or set **`skillPaths`** to directories containing skill packages. Restart the gateway after changes.
- **Config**: Each skill reads its options from **`config.skills.<skillId>`** (e.g. `config.skills.followme`).
- **Contract and creating a skill**: See **[docs/skills.md](docs/skills.md)** for the full contract, install steps, and how to build a third-party skill.
- **Reference skill**: **[agenticros-skill-followme](https://github.com/your-org/agenticros-skill-followme)** — Follow Me (depth + optional Ollama), with tools `follow_robot`, `follow_me_see`, and `ollama_status`. Use its README as a template for new skills.

## Running AgenticROS on NemoClaw

[NVIDIA NemoClaw](https://github.com/NVIDIA/NemoClaw) packages OpenClaw inside an OpenShell sandbox container with policy-enforced egress and managed inference. AgenticROS plugs into that OpenClaw the same way it plugs into a "vanilla" gateway — with one twist: ROS 2, RealSense, and rosbridge run on the **host**, and only the AgenticROS plugin runs **inside** the sandbox. The plugin reaches the host over the Docker bridge at `host.docker.internal:9090`.

Quick steps (sandbox named `nemo`, robot has namespace `<NS>`):

```bash
# 1. Build + pack the plugin so it works in the sandbox's offline-npm env
pnpm install && pnpm build
pnpm --filter @agenticros/agenticros deploy --prod /tmp/agenticros-deploy
rm -f /tmp/agenticros-deploy/node_modules/.pnpm/node_modules/@agenticros/agenticros

# 2. Copy it into the sandbox and chown to the sandbox user
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec "$CONTAINER" rm -rf /sandbox/agenticros && docker exec "$CONTAINER" mkdir -p /sandbox/agenticros
docker cp /tmp/agenticros-deploy/. "$CONTAINER:/sandbox/agenticros/"
docker exec "$CONTAINER" chown -R sandbox:sandbox /sandbox/agenticros

# 3. Register + configure the plugin inside the sandbox (HOME=/sandbox is required)
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" \
    openclaw plugins install -l /sandbox/agenticros           # Ctrl-C once it starts logging "ROS2 transport status:"

# 4. Open the host's rosbridge port in NemoClaw policy
nemoclaw nemo policy-add --from-file scripts/agenticros-rosbridge.policy.yaml --yes

# 5. Start RealSense + rosbridge on the host
./scripts/run_nemoclaw_host_stack.sh humble robot_namespace:=<NS> align_depth:=true

# 6. Restart the sandbox gateway, verify, and chat
nemoclaw nemo recover
./scripts/smoke_test_nemoclaw.sh        # 6 checks; exits 0 when all green
nemoclaw nemo dashboard-url
```

Full walkthrough, troubleshooting, and a "full-embed" alternative (ROS / RealSense baked into a custom sandbox image): **[docs/nemoclaw.md](docs/nemoclaw.md)**.

## License

Apache-2.0
