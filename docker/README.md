# Corebrum Synapse Docker Stack

This project was previously known as AgenticROS.


This project was previously known as Corebrum Synapse.


Run ROS2, rosbridge, and (optionally) Gazebo simulation in containers so you don’t need ROS installed on your host.

## Quick start (no ROS on host)

From the **repository root**:

```bash
cd docker
docker compose up ros2
```

By default the **ros2** service starts **rosbridge only** (WebSocket on **9090**). To also start **TurtleBot3 Gazebo** and match the simulation stack used in [examples/turtlebot-chat](../examples/turtlebot-chat/README.md):

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.sim.yml up ros2
```

That runs `ros2 launch synapse_bringup rosbridge_gazebo.launch.py` inside the container (see the main [README](../README.md) **“RViz2 and Gazebo”** section).

Then use OpenClaw on your machine with the Corebrum Synapse plugin pointing at **`ws://localhost:9090`**. See the main [README](../README.md) for plugin install and config. For **local Ollama** instead of cloud OpenAI, see [docs/local-vlm.md](../docs/local-vlm.md).

On an Arch-based host such as Omarchy, keep Grok or Claude Code on the host and point them at the same rosbridge URL. See [docs/omarchy.md](../docs/omarchy.md).

### Mode A (local DDS) + Gazebo on the host

[`docker-compose.local.yml`](docker-compose.local.yml) sets **`SYNAPSE_TRANSPORT_MODE=local`**. That image does **not** bundle Gazebo. On the **same machine**, install ROS 2 + TurtleBot3 Gazebo, build **`synapse_bringup`**, then run:

```bash
ros2 launch synapse_bringup mode_a_gazebo.launch.py
```

Match **`ros_domain_id`** (default **`0`**) to the plugin’s local domain ID. The compose file uses **`network_mode: host`** so the plugin can join the same DDS graph as Gazebo on the host.

## What runs

| Service | Purpose |
|--------|---------|
| **ros2** | ROS2 Jazzy + **rosbridge** (port 9090). Optional **Gazebo + TurtleBot3** via [docker-compose.sim.yml](docker-compose.sim.yml). Image includes **RViz2** and `synapse_bringup` for custom commands. |
| **synapse** | Pre-built plugin image for containerized OpenClaw; optional if you run OpenClaw locally. |

## Ports

- **9090** — rosbridge WebSocket (plugin connects here)
- **11311** — ROS master (if needed by tools)

## Build

Images are built on first `docker compose up`. To rebuild:

```bash
docker compose build
```

The `ros2` image is built from the repo root so it can include `ros2_ws` and the entrypoint script.
