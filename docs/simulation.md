# AgenticROS simulation

AgenticROS ships a simulation track so contributors without a physical robot
can still drive every MCP tool end-to-end against a virtual robot. The first
shipped sim is a **2-wheel AMR** powered by Gazebo Harmonic + ROS-GZ bridges,
in the `agenticros_sim` ROS 2 package. **Nav2** is available on the same AMR
via `agenticros up sim-amr --nav2`. A **6-DOF arm** is also available
(`agenticros up sim-arm`); add `--moveit` to bring up MoveIt2.

## Quick start (CLI)

```bash
agenticros up sim-amr            # gzsim with GUI, namespace=sim_robot
agenticros up sim-amr --rviz     # add RViz with sensible defaults
agenticros up sim-amr --nav2     # Gazebo AMR + map + AMCL + Nav2
agenticros up sim-amr --nav2 --headless
agenticros up sim-arm            # Gazebo 6-DOF arm (per-joint /arm/*/cmd_pos)
agenticros up sim-arm --moveit --headless
```

Stop everything with:

```bash
agenticros down
```

By default the sim publishes on the same topic names the real-robot plugin
already expects (`/cmd_vel`, `/camera/camera/depth/image_rect_raw`, …). If your
`~/.agenticros/config.json` is set up for a real robot (with a UUID
namespace), switch it for sim with:

```bash
./scripts/configure_for_sim.sh --backup
```

This drops in `ros2_ws/src/agenticros_sim/config/agenticros-sim.config.json`
and keeps your old config at `~/.agenticros/config.json.real.<ts>.bak`.

## Nav2 on sim-amr

Requires `sudo apt install ros-$ROS_DISTRO-navigation2 ros-$ROS_DISTRO-nav2-bringup` (Humble or Jazzy). `nav2-bringup` alone is not enough on Jazzy.

```bash
agenticros up sim-amr --nav2 --headless
npx agenticros skills install @agenticros/navigate-to
# MCP / OpenClaw: run_mission navigate_to → { x: 2.0, y: 1.0 }
```

What `--nav2` launches:

| Piece | Source |
|-------|--------|
| Gazebo + bridge + RSP | `sim_amr.launch.py` |
| Indoor occupancy map | `maps/agenticros_indoor.{yaml,pgm}` |
| AMCL + Nav2 stack | `nav2_bringup` via `sim_amr_nav2.launch.py` |
| Params | `config/nav2_params.yaml` (`base_footprint`, `/scan`, `/cmd_vel`, `use_sim_time`) |

Smoke script (sim + Nav2 + skill already up):

```bash
node scripts/test-navigate-sim.mjs
```

See [examples/navigate-to](../examples/navigate-to/README.md).

Live RGB-D mapping (RTAB-Map, no AMCL) is a **different** stack — see [Mapping a room](mapping.md). `sim-amr --nav2` will not start RTAB-Map.

## MoveIt2 on sim-arm

Sim-only MVP: headless Gazebo arm + MoveGroup reaches a **named joint pose**.
No gripper, no pick/place, no `ros2_control` rewrite. The SDF still takes
per-joint `std_msgs/Float64` on `/arm/<joint>/cmd_pos`; a small bridge
converts MoveIt's `FollowJointTrajectory` into those setpoints.

Requires `sudo apt install ros-$ROS_DISTRO-moveit` (Jazzy + Gazebo Harmonic
is the intended target). The arm SDF notes a Fortress-vs-Harmonic plugin
difference — see `models/agenticros_arm/model.sdf`.

```bash
agenticros up sim-arm --moveit --headless
npx agenticros skills install @agenticros/moveit-pick
# MCP / OpenClaw: run_mission pick_object with a MoveGroup joint-constraint goal
# Named SRDF targets: home, ready  (group "arm", tip tool0)
```

What `--moveit` launches:

| Piece | Source |
|-------|--------|
| Gazebo + bridge + RSP | `sim_arm.launch.py` |
| `move_group` | `agenticros_arm_moveit_config` (SRDF group `arm`) |
| Trajectory bridge | `arm_trajectory_bridge.py` → `/arm_controller/follow_joint_trajectory` → `/arm/*/cmd_pos` |

Smoke script (sim + MoveIt already up):

```bash
node scripts/test-moveit-sim.mjs
```

The smoke asserts `/move_action` exists and joints move toward the named
`ready` pose (via `run_mission pick_object` if the skill is installed, else
`ros2_action_goal`). Pick/place and the [arm-control](../examples/arm-control/README.md)
demo stay Planned.

Full pick/place with a gripper is out of scope for this bringup.

## Layout

| Layer | Where | What |
|---|---|---|
| World     | `agenticros_sim/worlds/agenticros_indoor.sdf` | 12 m × 12 m indoor room, three obstacles, one "person" cylinder for follow-me. |
| AMR model | `agenticros_sim/models/agenticros_amr/`       | Diff-drive base + RGBD camera (87° HFOV, D435-like) + 2D GPU lidar + IMU. |
| Bridge    | `agenticros_sim/config/amr_bridge.yaml`       | gz ↔ ROS 2 topic mapping, renaming gz defaults to RealSense paths. |
| Map / Nav2 | `maps/`, `config/nav2_params.yaml`, `launch/sim_amr_nav2.launch.py` | Static map + AMCL + Nav2. |
| Launch    | `agenticros_sim/launch/sim_amr.launch.py`     | One-shot `ros2 launch` entry point. |
| Arm / MoveIt | `launch/sim_arm.launch.py`, `sim_arm_moveit.launch.py`, `agenticros_arm_moveit_config` | Per-joint jogging or MoveGroup + trajectory bridge. |
| Worker    | `scripts/sim/run_sim.sh`                       | Bash wrapper the CLI uses (sources ROS, sets PIDs, logs to /tmp). |
| CLI       | `agenticros up sim-amr [--rviz] [--nav2] [--headless]` / `up sim-arm [--moveit]` | Interactive + scripted entry. |

## Available tools in sim

Every MCP / OpenClaw tool except the camera-LED and motor-driver ones works
against the sim AMR. Specifically:

| Tool                       | Topic                                       | Sim status |
|----------------------------|---------------------------------------------|-----|
| `ros2_list_topics`         | (all)                                       | ✓ |
| `ros2_publish` /cmd_vel    | `/cmd_vel`                                  | ✓ |
| `ros2_subscribe_once`      | any bridged topic                           | ✓ |
| `ros2_camera_snapshot`     | `/camera/camera/color/image_raw`            | ✓ |
| `ros2_depth_distance`      | `/camera/camera/depth/image_rect_raw`       | ✓ |
| `ros2_follow_me_start` mode='depth' | depth blob in front of AMR         | ✓ (person cylinder at +2.5 m) |
| `ros2_follow_me_start` mode='local' (YOLO) | RGB image                  | works if YOLO model is available |
| `ros2_action_goal` / `navigate_to` | Nav2 `navigate_to_pose`              | ✓ with `agenticros up sim-amr --nav2` |
| `ros2_action_goal` / `pick_object` | MoveIt `move_action`                 | ✓ with `agenticros up sim-arm --moveit` |
| `ros2_service_call`        | various                                     | basic services; Nav2 lifecycle via bringup |

## Sensor formats

| Sensor | Sim encoding | Real RealSense encoding | Handled? |
|---|---|---|---|
| RGB    | `rgb8`  | `rgb8` / `bgr8`  | ✓ |
| Depth  | `32FC1` (float metres) | `16UC1` (mm)  | ✓ — depth-loop normaliser handles both |
| Lidar  | `LaserScan` | (n/a real robot)  | ✓ |
| IMU    | `Imu` (low noise) | `Imu` (noisier) | ✓ |
| Odom   | `Odometry` (via `OdometryWithCovariance` bridge) | `Odometry` from base controller | ✓ |
| `tf`   | DiffDrive `odom` → `base_footprint` + RSP | from robot_state_publisher | ✓ |

## Headless / CI

```bash
agenticros up sim-amr --headless
agenticros up sim-amr --nav2 --headless
agenticros up sim-arm --moveit --headless
# Equivalent direct invocation:
ros2 launch agenticros_sim sim_amr.launch.py gui:=false
ros2 launch agenticros_sim sim_amr_nav2.launch.py gui:=false
ros2 launch agenticros_sim sim_arm_moveit.launch.py gui:=false
```

The `gui:=false` / `--headless` flag adds `-s --headless-rendering` to `gz sim`,
which still runs physics but suppresses the OpenGL window. Sensors continue to
produce data, so MCP tools and the topic bridge keep working. On Jetson (or when
`$DISPLAY` is unset) the CLI auto-enables headless.

## Performance notes

On a Jetson Orin Nano running Gazebo Harmonic 8.x:

| Component                         | Approx CPU |
|-----------------------------------|------------|
| gz sim + scene broadcaster + sensors | 80–110 % (i.e. 1 core saturated) |
| ros_gz_bridge                     | 5–10 %     |
| Nav2 (with `--nav2`)              | 20–40 %    |
| MCP server (idle)                 | <1 %       |
| MCP server (follow-me running)    | 5–15 %     |
| RViz                              | 30–60 %    |

When CPU-bound, drop the depth camera update rate from 30 → 15 Hz in
`models/agenticros_amr/model.sdf`, or run `gui:=false`.

## Smoke-test status (Phase 2 on Jetson + ROS 2 Humble + Gazebo Harmonic 8.12)

| Capability                                              | Status      |
|---------------------------------------------------------|-------------|
| `colcon build agenticros_sim` produces share + env hooks | ✅          |
| `ros2 launch agenticros_sim sim_amr.launch.py gui:=false` | ✅          |
| Topic list (`ros2 topic list`)                           | ✅          |
| `/clock` flowing                                         | ✅ 637 Hz   |
| `/scan` (LIDAR)                                          | ✅ 10 Hz    |
| `/imu/data`                                              | ✅ 75 Hz    |
| `/joint_states`                                          | ✅ 642 Hz   |
| `/tf` (when AMR moves)                                   | ✅ 43 Hz    |
| `/camera/camera/depth/image_rect_raw` (16UC1 mm)         | ✅ 24 Hz    |
| `ros2 topic pub /cmd_vel` → AMR drives                   | ✅ (verified via /tf updates) |
| `/odom` (OdometryWithCovariance bridge)                  | ✅ (fixed; was type-mismatch) |
| `/camera/camera/color/image_raw` (headless)              | ❌ blocked by EGL / DRI2 (see `Known sharp edges`) |
| Nav2 `navigate_to_pose` via `--nav2`                     | ✅ bringup shipped; run `scripts/test-navigate-sim.mjs` on a ROS host |
| MoveIt `move_action` via `--moveit`                      | ✅ bringup shipped; run `scripts/test-moveit-sim.mjs` on a ROS + Gazebo host |

## Troubleshooting

### Jetson display rendering

On Jetson L4T images the desktop libEGL search path puts Mesa first and Mesa
tries to load `nvidia-drm_dri.so` (a Mesa DRI driver that doesn't exist on
Tegra), so the **Gazebo GUI window comes up solid white** with no grid, no
robot, and no scene. The physics server and all sensors still run; only the
3D viewport is broken. `run_sim.sh` already exports
`__GLX_VENDOR_LIBRARY_NAME=nvidia` and `__EGL_VENDOR_LIBRARY_FILENAMES=…`
when it detects `/usr/lib/aarch64-linux-gnu/tegra-egl/libEGL_nvidia.so.0`,
but the gz GUI's Ogre2 renderer initialises its own EGL context which still
hits Mesa, so the fix is best-effort.

**Default on Jetson**: the CLI now auto-detects Tegra (`/etc/nv_tegra_release`)
and runs gz-sim headless, so you'll never see the white window. RViz is the
primary visualisation and renders the URDF (chassis, wheels, caster, lidar
cylinder, camera box) plus live `/scan`, `/camera/...` image, depth point
cloud, and TF tree:

```bash
agenticros up sim-amr --rviz     # gz headless + RViz visible (default on Jetson)
```

To force the Gazebo GUI on anyway (e.g. you have a working Ogre install or
want to try software rendering):

```bash
AGENTICROS_GZ_SOFTWARE_RENDER=1 agenticros up sim-amr --rviz --no-headless
```

`AGENTICROS_GZ_SOFTWARE_RENDER=1` falls back to Mesa's llvmpipe rasteriser —
slow (~5 fps) but at least the viewport renders.

### RViz shows only TF axes, no robot mesh

You're running an older sim build. The launch file now includes
`robot_state_publisher` with a URDF mirror of the SDF, which publishes
`/robot_description`. Rebuild the sim package:

```bash
cd ros2_ws && colcon build --packages-select agenticros_sim --symlink-install
```

### Nav2 / `--nav2` fails to start

```bash
sudo apt-get install -y ros-$ROS_DISTRO-navigation2 ros-$ROS_DISTRO-nav2-bringup
cd ros2_ws && colcon build --packages-select agenticros_sim --symlink-install
```

Confirm `/navigate_to_pose` exists after launch (`ros2 action list`). AMCL
initial pose is set in `nav2_params.yaml` to the default spawn `(0, 0)`.

### MoveIt / `--moveit` fails to start

```bash
sudo apt-get install -y ros-$ROS_DISTRO-moveit
cd ros2_ws && colcon build --packages-select agenticros_sim agenticros_arm_moveit_config --symlink-install
```

Confirm `/move_action` and `/arm_controller/follow_joint_trajectory` exist
after launch. The intended sim target is Jazzy + Gazebo Harmonic; Humble +
Fortress may need the plugin note already in `models/agenticros_arm/model.sdf`.

### Other

- **`gz sim` fails to start, no error** — make sure `/usr/share/gz/` is
  populated by `apt install gz-harmonic`. Run `gz sim --versions` to confirm.
- **No topics appear in `ros2 topic list`** — the bridge is started by
  `sim_amr.launch.py`. Run `ros2 node list` and look for
  `/agenticros_amr_bridge`; if missing, `ros_gz_bridge` may not be installed
  (`sudo apt install ros-$ROS_DISTRO-ros-gz-bridge`).
- **`tf` warnings about old transforms** — your MCP / Claude Code session may
  have started before `use_sim_time:=true` took effect. Restart the MCP
  server, or set `AGENTICROS_USE_SIM_TIME=1` in the env before launching.
- **AMR doesn't move when `/cmd_vel` is published** — confirm the bridge by
  running `ros2 topic echo /model/agenticros_amr/cmd_vel` while publishing.
  If gz never sees the message, the bridge config didn't load — look in
  `/tmp/agenticros-sim.log` for `parameter_bridge` errors.
