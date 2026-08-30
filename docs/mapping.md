# Mapping a room (RTAB-Map + Nav2)

```bash
agenticros up real --map
agenticros skills install --bundle mapping
# chat: "map the room"
# then: "save this place as kitchen" / "go to the kitchen"
```

`--map` starts camera + motors (`start_demo.sh`) then `agenticros_bringup` RTAB-Map + Nav2. Use `--wheel-odom` when the motor controller publishes `/odom`.

| Stack | Command | Localization |
|-------|---------|--------------|
| **Real robot (live map)** | `agenticros up real --map` | RTAB-Map RGB-D VSLAM (or wheel `/odom` with `--wheel-odom`) |
| **Sim (known floorplan)** | `agenticros up sim-amr --nav2` | Static map + AMCL — **not** RTAB-Map |

AgenticROS does not run SLAM or path planning in the agent process. Mapping a room is three operator-owned ROS pieces plus marketplace skills:

1. **RTAB-Map** builds `/map` and `map` → `odom` (RGB-D VSLAM).
2. **Nav2** (`navigation_launch.py` only — **no AMCL**) drives to poses and avoids obstacles.
3. **`agenticros_explore`** picks frontiers (or random free cells) and sends `NavigateToPose`.

Skills:

| Skill | Verbs | Role |
|---|---|---|
| [`@agenticros/start-slam`](https://www.npmjs.com/package/@agenticros/start-slam) | `start_slam`, `stop_slam`, `save_map`, `load_map`, `set_mapping_mode`, `set_localization_mode` | RTAB-Map lifecycle. Does **not** move the base. |
| [`@agenticros/explore`](https://www.npmjs.com/package/@agenticros/explore) | `explore`, `wander` | Long-running coverage / wander loop. |
| [`@agenticros/navigate-to`](https://www.npmjs.com/package/@agenticros/navigate-to) | `navigate_to` | Go to a known `{x, y, yaw}` **after** you have a map. |

`agenticros up sim-amr --nav2` is a **static map + AMCL** stack. Use it for `navigate_to` / `wander` against a known grid. It will **not** exercise live RTAB-Map.

## Install

Nav2’s metapackage (`navigation2`) is required in addition to `nav2-bringup`. Without it, `navigate_to_pose` / costmaps are missing and `@agenticros/explore` cannot run. Jazzy:

```bash
sudo apt-get install -y \
  ros-jazzy-navigation2 \
  ros-jazzy-nav2-bringup \
  ros-jazzy-rtabmap-ros \
  ros-jazzy-realsense2-camera   # if you have a D435 / D455
```

Humble: replace `jazzy` with `humble`. `nav2-bringup` alone does **not** pull the full Nav2 stack on Jazzy.

If RTAB-Map / Nav2 fails at startup with `libdiagnostic_updater.so: cannot open shared object file` (or undefined `diagnostic_updater::Updater` symbols), the apt package is headers-only on some distros. Build the shared library into this workspace once:

```bash
./scripts/install_diagnostic_updater.sh humble   # or jazzy
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
```

```bash
cd /path/to/agenticros/ros2_ws
source /opt/ros/jazzy/setup.bash   # or humble
colcon build --packages-select agenticros_msgs agenticros_explore agenticros_bringup
source install/setup.bash

npx agenticros skills install --bundle mapping
# same as: start-slam + explore + navigate-to
```

## Bringup (physical RGB-D robot)

Calibrated extrinsics, a `base_link` / `base_footprint` TF tree, and (ideally) wheel `/odom` **or** RTAB-Map visual odometry.

```bash
# Default: camera + SLAM + Nav2 + explore action server (does not drive until a mission).
# Wipes ~/.ros/rtabmap.db unless delete_db_on_start:=false. Pass robot_namespace if needed.
ros2 launch agenticros_bringup rtabmap_nav2.launch.py

# Wheel odom instead of visual odometry:
ros2 launch agenticros_bringup rtabmap_nav2.launch.py visual_odometry:=false odom_topic:=/odom

# Already have camera + SLAM elsewhere:
ros2 launch agenticros_bringup rtabmap_nav2.launch.py \
  use_realsense:=false use_rtabmap:=false
```

### Jetson / D457 (GMSL) notes

Some GMSL RealSense setups publish broken or desynced hardware timestamps, and motor stacks may not publish `base_link` yet. Use the built-in stamp rewriter and temporary static TFs (disable once you have a URDF + good clocks):

```bash
# Camera already running elsewhere (recommended profiles: 424x240x15):
ros2 launch agenticros_bringup rtabmap_nav2.launch.py \
  use_realsense:=false \
  rewrite_camera_stamps:=true \
  use_static_robot_tf:=true \
  depth_topic:=/camera/camera/depth/image_rect_raw \
  frame_id:=base_link \
  base_frame:=base_link
```

- `rewrite_camera_stamps:=true` republishes synced ROS-time frames on `/camera_fixed/*` and points RTAB-Map there.
- `use_static_robot_tf:=true` publishes `base_link`→`base_footprint` and `base_link`→`camera_link` (override `camera_x/y/z` as needed).
- Prefer raw depth (`depth/image_rect_raw`) if `aligned_depth_to_color` never publishes on your device.
Confirm:

```bash
ros2 topic echo /map --once          # occupancy from RTAB-Map
ros2 action list | grep -E 'explore|wander|navigate_to_pose'
ros2 service list | grep rtabmap
```

There must be **no AMCL** competing for `map` → `odom`. If you previously used `sim_amr_nav2.launch.py`, stop it first.

## Mission: map the room

Natural language (rule-based planner, once both skills are installed): *"map the room"* → `start_slam` → `explore` → `save_map`.

Declarative:

```json
{
  "mission": {
    "name": "map the room",
    "steps": [
      { "id": "slam", "capability": "start_slam", "inputs": { "request": {} } },
      { "id": "cover", "capability": "explore", "inputs": { "timeout_s": 180 } },
      { "id": "save", "capability": "save_map", "inputs": { "request": {} } },
      { "id": "localize", "capability": "set_localization_mode", "inputs": { "request": {} } }
    ]
  }
}
```

`save_map` calls `rtabmap/backup` and writes `<database_path>.back` (default `~/.ros/rtabmap.db.back`). `/map` is already live for Nav2. Optional occupancy dump:

```bash
ros2 run nav2_map_server map_saver_cli -f ~/maps/room
```

Reload later:

```json
{
  "id": "load",
  "capability": "load_map",
  "inputs": { "database_path": "/home/user/.ros/rtabmap.db", "clear": true }
}
```

Then `set_localization_mode` and `navigate_to`.

## Wander (no completeness goal)

Needs a live `/map` (SLAM in progress or a loaded map). Nav2 still avoids obstacles.

```json
{
  "mission": {
    "name": "wander",
    "steps": [
      { "id": "walk", "capability": "wander", "inputs": { "timeout_s": 60 } }
    ]
  }
}
```

Or say *"wander around"*.

## Frames and sensors

| Piece | Typical names |
|---|---|
| RGB | `/camera/camera/color/image_raw` |
| Depth aligned to color | `/camera/camera/aligned_depth_to_color/image_raw` |
| Camera info | `/camera/camera/color/camera_info` |
| Occupancy | `/map` |
| Base TF | `base_footprint` (fallback `base_link`) |
| Nav2 params | `agenticros_bringup/config/nav2_rtabmap.yaml` (`use_sim_time: false`, `allow_unknown: true`) |

If your URDF uses only `base_link`, pass `frame_id:=base_link` and `base_frame:=base_link`.

RTAB-Map is CPU-heavy. On a small Jetson, lower RGB-D rate, tighten voxel size, and prefer wheel odom (`visual_odometry:=false`).

## Troubleshooting (Jetson)

The FastRTPS `Failed init_port fastrtps_port7006` lines are noisy but not fatal — DDS falls back to UDP.

### `Parameter 'use_realsense' is not supported`

That warning comes from `realsense2_camera/rs_launch.py` treating **every** parent launch argument as a camera parameter. Current `rtabmap_nav2.launch.py` starts `realsense2_camera_node` directly, so those warnings should be gone after you pull and `colcon build --packages-select agenticros_bringup`.

### `Device or resource busy` / `xioctl(VIDIOC_S_FMT) errno=16`

Only one process can open the D436. Stop the other owner first:

```bash
agenticros stop realsense        # if you used agenticros start realsense
# or: pkill -f realsense2_camera_node
# confirm: fuser /dev/video0 /dev/video4
```

Then either let this launch own the camera, or keep the existing node and skip a second one:

```bash
ros2 launch agenticros_bringup rtabmap_nav2.launch.py use_realsense:=false
```

Default profiles here are `640x480x15` (override with `color_profile` / `depth_profile`). The D436 IMU HID warnings are expected — gyro/accel are left off.

### `No critics defined for FollowPath` / `Failed to change state for node: smoother_server`

Nav2 loaded its **compiled defaults** (DWB, no critics) instead of `config/nav2_rtabmap.yaml`. That happens when `rtabmap.launch.py` sets launch `namespace:=rtabmap` and Nav2's `RewrittenYaml` nests every param under that key. Pull this repo, rebuild `agenticros_bringup`, and confirm you are launching **this** file (not a stale install without `--symlink-install`).

```bash
cd ~/Projects/agenticros
git pull
cd ros2_ws
source /opt/ros/jazzy/setup.bash
colcon build --packages-select agenticros_bringup agenticros_explore agenticros_msgs --symlink-install
source install/setup.bash
ros2 launch agenticros_bringup rtabmap_nav2.launch.py
```

On configure you should see `Created smoother : simple_smoother` and **not** `No critics defined for FollowPath`.

### `VWDictionary addWordRef() Not found word` (robot never moved)

That spam means `~/.ros/rtabmap.db` was not closed cleanly (Ctrl-C, crash, power loss). Word ids in the occupancy graph do not exist in the vocabulary. Visual odometry can still print `Odom: quality=…` while the loaded grid is junk.

This launch **does not drive**. It only brings up camera + SLAM + Nav2 + the explore *action server*. After it is healthy, say *"wander around"* / *"map the room"*, or:

```bash
ros2 action send_goal /wander agenticros_msgs/action/Explore "{mode: wander, timeout_s: 60}"
```

Fresh map (default as of this bringup):

```bash
# Stop the launch, then either rely on delete_db_on_start:=true (default) or:
rm -f ~/.ros/rtabmap.db ~/.ros/rtabmap.db.back
ros2 launch agenticros_bringup rtabmap_nav2.launch.py \
  use_static_robot_tf:=true \
  robot_namespace:=YOUR_NS    # if motors subscribe to /YOUR_NS/cmd_vel
```

To **resume** a good map: `delete_db_on_start:=false`. To try repairing a crashed db: `rtabmap-recovery ~/.ros/rtabmap.db`.

If wander runs but the base never moves, Nav2 is publishing `/cmd_vel` and the firmware is listening on `/<namespace>/cmd_vel`. Pass `robot_namespace` (same as `robot.namespace` in `~/.agenticros/config.json`).

## What not to do

- Do not `drive_base` around the room and hope SLAM + the LLM avoid furniture. That bypasses Nav2’s costmap.
- Do not run AMCL and RTAB-Map at the same time (two publishers of `map` → `odom`).
- Do not expect `start_slam` alone to cover the room — it only resumes the mapper.

## Related

- [Skills](skills.md) — capability contract
- [Missions](missions.md) — chaining
- [Cameras](cameras.md) — RealSense topics
- [Simulation](simulation.md) — static-map Nav2 on `sim-amr`
- [`agenticros_explore`](../ros2_ws/src/agenticros_explore/README.md) — action server
- [`agenticros_bringup`](../ros2_ws/src/agenticros_bringup/README.md) — launch files
