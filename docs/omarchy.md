# Omarchy host (Grok and Claude Code)

Omarchy is Arch-based. Its host Python, GCC, OpenCV, and Qt do not match ROS 2 Jazzy, so leave ROS inside a container. Grok and Claude Code stay on the host and talk to that container through the AgenticROS MCP server. The server uses rosbridge (`ws://localhost:9090`). It does not load ROS libraries on the host.

This is deployment Mode B from [architecture.md](architecture.md): the agent runs on the workstation, rosbridge runs with the robot graph.

## What runs where

| Piece | Where | Why |
|-------|--------|-----|
| ROS 2 Jazzy, rosbridge, RealSense | Container | Matches Ubuntu 24.04 and the Jazzy libraries |
| `@agenticros/claude-code` MCP server | Host | Grok and Claude Code spawn a local stdio process |
| Grok, Claude Code | Host | Both already speak MCP |

Do not install OpenClaw or Claude inside the ROS container for this setup. Do not set the host config to `"transport": { "mode": "local" }`. That mode loads `rclnodejs` against a sourced ROS install. The host has no `/opt/ros`, and a binding built inside the container will not load under the host's Node.

## 1. ROS container

Any Jazzy container that publishes rosbridge on host port **9090** is enough for the agents. From a clone of this repo, the stock compose file does that:

```bash
cd docker
sudo docker compose up ros2
```

Omarchy does not put your user in the `docker` group. In a terminal, `sudo docker` asks for the password in that window. `pkexec docker` is the fallback when there is no terminal.

`docker compose up ros2` starts rosbridge only. It does not start a RealSense. The upstream `docker/Dockerfile.ros2` image has rosbridge and Gazebo, not librealsense.

For a USB RealSense (D435 and similar):

- Run the camera node in a Jazzy image that contains librealsense and `realsense2_camera`. Build librealsense with `FORCE_RSUSB_BACKEND=ON` so the host kernel does not need a patched `uvcvideo` module.
- Pass the USB bus through (`-v /dev/bus/usb:/dev/bus/usb` and `--device-cgroup-rule='c 189:* rmw'`).
- Use `--network host`, or publish port `9090`, so the host can open `ws://localhost:9090`.
- If the camera process is not root, the device node must be mode `0666`. The stock RealSense udev rules do that once the `plugdev` group exists. A camera that was already plugged in keeps the old mode until you unplug it or `chmod` the node.

Color frames show up as `/camera/camera/color/image_raw`. Depth is `/camera/camera/depth/image_rect_raw`.

## 2. Build the MCP server on the host

Node 20 or newer is required. pnpm 9.15.4 matches this repo (`packageManager` in the root `package.json`). A Node install from mise is fine, including Node 26, because rosbridge mode is plain WebSocket.

```bash
cd /path/to/agenticros
npm install -g pnpm@9.15.4
# Omarchy ships libvips. Without this, sharp tries to compile against it and
# fails looking for node-gyp. The flag selects sharp's prebuilt binary.
# Skip the CUDA add-on: this host has no NVIDIA GPU, and the installer
# otherwise downloads a GPU build it cannot use.
# --ignore-scripts skips rclnodejs's install script. That compile needs a
# sourced ROS 2, which this host does not have, and a full install fails
# there. Rosbridge mode does not load it. The rebuild line installs the
# prebuilt natives the MCP server can use (sharp, onnx, node-datachannel).
SHARP_IGNORE_GLOBAL_LIBVIPS=1 ONNXRUNTIME_NODE_INSTALL_CUDA=skip \
  pnpm install --frozen-lockfile --filter @agenticros/claude-code... --ignore-scripts
SHARP_IGNORE_GLOBAL_LIBVIPS=1 ONNXRUNTIME_NODE_INSTALL_CUDA=skip \
  pnpm rebuild sharp onnxruntime-node node-datachannel
pnpm --filter @agenticros/claude-code... build
```

The server entry is `packages/agenticros-claude-code/dist/index.js`. `dist/` is gitignored, so each machine builds its own.

Object detection (`onnxruntime-node`, `sharp`) loads only when a detection tool is called.

## 3. Host robot config

Write this on the **host**, at `~/.agenticros/config.json`. The container's own `~/.agenticros` is a different directory when the container home is a mounted state folder. Leave the in-container config on `local` if the menu inside the container uses DDS.

```json
{
  "transport": { "mode": "rosbridge" },
  "rosbridge": { "url": "ws://localhost:9090" },
  "robot": {
    "namespace": "",
    "name": "RealSense",
    "cameraTopic": "/camera/camera/color/image_raw"
  },
  "safety": {
    "maxLinearVelocity": 1.0,
    "maxAngularVelocity": 1.5
  },
  "teleop": {
    "cmdVelTopic": "/cmd_vel",
    "speedDefault": 0.3
  }
}
```

Leave the namespace empty when topics are `/cmd_vel` and `/camera/camera/...` rather than `/my_robot/cmd_vel`.

## 4. Register Grok and Claude Code

Use the absolute path from the build. Both clients spawn the server themselves, so the path has to work no matter what the client's working directory is.

```bash
MCP=/absolute/path/to/agenticros/packages/agenticros-claude-code/dist/index.js
NODE=$(command -v node)

grok mcp add --scope user agenticros \
  -e AGENTICROS_CONFIG_PATH="$HOME/.agenticros/config.json" \
  -e AGENTICROS_ROBOT_NAMESPACE= \
  -- "$NODE" "$MCP"

claude mcp add --scope user agenticros \
  -e AGENTICROS_CONFIG_PATH="$HOME/.agenticros/config.json" \
  -e AGENTICROS_ROBOT_NAMESPACE= \
  -- "$NODE" "$MCP"
```

Grok stores that in `~/.grok/config.toml` under `[mcp_servers.agenticros]`. Claude Code stores the user scope in `~/.claude.json`.

`agenticros mcp setup --claude` writes a project `.mcp.json` and, on Linux, a Claude Desktop file under `~/Library/Application Support/Claude/`. Claude Code on Omarchy does not read that desktop path. Use `claude mcp add --scope user` for the CLI you already logged into.

The repo ships a project `.mcp.json` with a relative path for people who run Claude Code from the clone. `claude mcp list` then warns that `agenticros` is defined in both the user scope and the project scope. Both read `~/.agenticros/config.json` when `AGENTICROS_CONFIG_PATH` is unset. The user-scope command above is the one that works from any directory. Leave the committed `.mcp.json` in place.

Start a new Grok session and a new Claude Code session so they load the server. Check:

```bash
grok mcp list
claude mcp list
```

Both should show `agenticros`. In Claude Code, `/mcp` lists the same server.

## 5. Confirm the robot graph

With rosbridge listening, ask either agent to list ROS topics, or call `ros2_list_topics` yourself. A live rosbridge answers with topics such as `/rosout` and `/client_count` even before the camera starts. `/camera/camera/color/image_raw` appears after the RealSense node is up.

A one-shot check from the repo, using the same config the agents use:

```bash
cd /path/to/agenticros
AGENTICROS_CONFIG_PATH="$HOME/.agenticros/config.json" \
  node --input-type=module -e '
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["packages/agenticros-claude-code/dist/index.js"],
  env: { ...process.env },
});
const client = new Client({ name: "omarchy-smoke", version: "0.0.1" });
await client.connect(transport);
const tools = await client.listTools();
console.log("tools", tools.tools.length);
const listed = await client.callTool({ name: "ros2_list_topics", arguments: {} });
console.log(JSON.stringify(listed).slice(0, 500));
await client.close();
'
```

`tools` should be well above 1. If rosbridge is down, `ros2_list_topics` fails with a connection error. The tool list still comes back, which means Grok and Claude can launch the server.

## Troubleshooting

| Symptom | Cause |
|---------|--------|
| MCP server missing after `claude mcp add` with no `--scope user` | Default scope is the current project. Add it again with `--scope user`. |
| `Mode A (local) requires rclnodejs` | Host config is `local`. Switch it to `rosbridge` and point at `ws://localhost:9090`. |
| `ros2_list_topics` cannot connect | Nothing is listening on port 9090. Start the ROS container and wait for rosbridge. |
| Camera topics missing, rosbridge topics present | The RealSense node is not running, or the USB device node is not readable (`0666`). |
| Detection tools fail, other tools work | `sharp` or `onnxruntime-node` did not build for this Node. Re-run `pnpm install` with the same Node you registered. |
| Stale tools after a rebuild | Quit the client so it drops the old server process, then start it again. |
