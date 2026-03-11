# Robot not receiving cmd_vel (Mac side works)

If **z_sub on the Mac** shows `Received PUT (.../cmd_vel: ...)` when you move from Claude Code, the MCP server and zenohd are fine. The break is between zenohd and the robot.

## Checklist (robot side)

1. **Bridge is running on the robot**  
   On the robot run **zenoh-bridge-ros2dds** (not zenohd). Example:
   ```bash
   zenoh-bridge-ros2dds -c /path/to/zenoh-bridge-ros2dds-robot.json5
   ```

2. **Bridge connects to the Mac’s zenohd**  
   In the bridge config, **`connect.endpoints`** must be your **Mac’s IP** and port **7447**, e.g. `["tcp/192.168.0.241:7447"]`. Replace with the Mac’s actual IP on the same subnet as the robot. From the robot: `ping <mac-ip>` and `nc -zv <mac-ip> 7447` must succeed.

3. **zenohd on the Mac listens on all interfaces**  
   zenohd must accept TCP on 0.0.0.0:7447 (default). If you started it with a config that binds only to localhost, the robot cannot connect. No change needed if you use `scripts/zenohd-agenticros.json5` as-is.

4. **Bridge allow list includes the key we publish**  
   We publish Zenoh key **`3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel`** when `robot.namespace` is that UUID, or **`cmd_vel`** when `robot.namespace` is `""`. The bridge config **`plugins.ros2dds.allow.subscribers`** must include a pattern that matches that key. Example: `[".+/cmd_vel", "cmd_vel", "3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel"]` (see `scripts/zenoh-bridge-ros2dds-robot.json5`). Restart the bridge after editing.

5. **Robot base subscribes to the same ROS2 topic**  
   The bridge maps Zenoh key → ROS2 topic. Key `3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel` → topic **`/3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel`**. Key `cmd_vel` → **`/cmd_vel`**.  
   On the robot run: `ros2 topic list` and `ros2 topic info /cmd_vel` (or the namespaced topic). If the base subscribes to **`/cmd_vel`** only, use **`robot.namespace: ""`** in `~/.agenticros/config.json` so we publish to `cmd_vel` and the bridge forwards to `/cmd_vel`.

## Try /cmd_vel (no namespace)

Most bases subscribe to **`/cmd_vel`**. Camera already works (robot → Mac), so the bridge is connected; we need it to accept **cmd_vel** (Mac → robot).

1. In **`~/.agenticros/config.json`** set **`robot.namespace`** to **`""`**. If the tool still shows **`/3946b404-.../cmd_vel`**, the MCP server may be loading another config (e.g. OpenClaw). Run **`cat /tmp/agenticros-mcp.log`** and look for **`[AgenticROS] Config from ...`** and **`robot.namespace=...`** — set **`"namespace": ""`** in that file, then **quit Claude Code completely** and reopen.
2. On the **robot**, ensure **`"cmd_vel"`** is in **`plugins.ros2dds.allow.subscribers`** in the bridge config. Restart the bridge.
3. Restart the bridge and restart Claude Code (or new chat), then try “move robot forward” again.

The bridge will then receive Zenoh key `cmd_vel` and publish to ROS2 `/cmd_vel`, which the base should be subscribed to.
