# Mapping a room (RTAB-Map + Nav2)

AgenticROS does not run SLAM or path planning in the agent process. Mapping a room is three operator-owned ROS pieces plus two marketplace skills:

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

```bash
sudo apt install \
  ros-$ROS_DISTRO-rtabmap-ros \
  ros-$ROS_DISTRO-nav2-bringup \
  ros-$ROS_DISTRO-realsense2-camera   # if you have a D435 / D455

cd /path/to/agenticros/ros2_ws
source /opt/ros/$ROS_DISTRO/setup.bash
colcon build --packages-select agenticros_msgs agenticros_explore agenticros_bringup
source install/setup.bash

npx agenticros skills install @agenticros/start-slam
npx agenticros skills install @agenticros/explore
npx agenticros skills install @agenticros/navigate-to
```

## Bringup (physical RGB-D robot)

Calibrated extrinsics, a `base_link` / `base_footprint` TF tree, and (ideally) wheel `/odom` **or** RTAB-Map visual odometry.

```bash
# Default: RealSense + RTAB-Map + Nav2 (no AMCL) + explore/wander actions
ros2 launch agenticros_bringup rtabmap_nav2.launch.py

# Wheel odom instead of visual odometry:
ros2 launch agenticros_bringup rtabmap_nav2.launch.py visual_odometry:=false odom_topic:=/odom

# Already have camera + SLAM elsewhere:
ros2 launch agenticros_bringup rtabmap_nav2.launch.py \
  use_realsense:=false use_rtabmap:=false
```

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
