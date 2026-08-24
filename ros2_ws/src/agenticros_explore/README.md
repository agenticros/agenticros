# agenticros_explore

ROS 2 node that advertises **`explore`** and **`wander`** actions. It reads `/map`, picks poses (occupancy-grid frontiers or random free cells), and sends Nav2 `NavigateToPose`. Obstacle avoidance stays in Nav2.

The marketplace skill [`@agenticros/explore`](https://www.npmjs.com/package/@agenticros/explore) dispatches those actions. AgenticROS does not launch this node for you.

## Build

```bash
cd ros2_ws
colcon build --packages-select agenticros_msgs agenticros_explore
source install/setup.bash
```

Requires `ros-$ROS_DISTRO-nav2-msgs` (pulled in by `nav2-bringup`).

## Run

```bash
# Combined RealSense + RTAB-Map + Nav2 (no AMCL) + this node:
ros2 launch agenticros_bringup rtabmap_nav2.launch.py

# Node only (Nav2 + /map already up):
ros2 launch agenticros_explore explore.launch.py
# or: ros2 run agenticros_explore explore_node
```

Parameters:

| Param | Default | Meaning |
|---|---|---|
| `map_topic` | `map` | Occupancy grid |
| `navigate_action` | `navigate_to_pose` | Nav2 action |
| `map_frame` | `map` | Goal / TF parent |
| `base_frame` | `base_footprint` | Robot frame (`base_link` fallback) |
| `default_explore_timeout_s` | `180` | Used when the goal sends `timeout_s: 0` |
| `default_wander_timeout_s` | `60` | Same for wander |
| `goal_timeout_s` | `30` | Per Nav2 goal |
| `min_frontier_m` | `0.5` | Ignore tiny frontier clusters |
| `wander_min_sep_m` | `1.0` | Minimum distance for a wander hop |
| `map_wait_s` | `15` | Wait for first `/map` |

## Actions

| Action | Type | Behaviour |
|---|---|---|
| `explore` | `agenticros_msgs/action/Explore` | Drive to frontiers until none remain, timeout, or cancel |
| `wander` | `agenticros_msgs/action/Explore` | Random free-space poses until timeout or cancel |

Goal fields: `mode` (optional; the server forces explore vs wander from the action name), `timeout_s`, `min_frontier_m`, `max_goals`.

See [docs/mapping.md](../../../../docs/mapping.md) for the RealSense + RTAB-Map + Nav2 stack.
