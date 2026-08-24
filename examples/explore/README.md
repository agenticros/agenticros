# Explore / wander

Canonical package: **[agenticros-skill-explore](https://github.com/agenticros/agenticros-skill-explore)** (`@agenticros/explore`).

Frontier coverage (`explore`) and safe wandering (`wander`). The on-robot [`agenticros_explore`](../../ros2_ws/src/agenticros_explore) node sends Nav2 `NavigateToPose` goals; obstacle avoidance stays in Nav2. Pair with [`@agenticros/start-slam`](../start-slam/README.md) to persist an RTAB-Map database.

```bash
npx agenticros skills install @agenticros/explore
npx agenticros skills install @agenticros/start-slam
```

On the **robot**, install Nav2 + RTAB-Map before launching. Jazzy:

```bash
sudo apt-get install -y \
  ros-jazzy-navigation2 \
  ros-jazzy-nav2-bringup \
  ros-jazzy-rtabmap-ros
```

Humble: the same names with `ros-humble-…`. Then, from `agenticros/ros2_ws`:

```bash
source /opt/ros/jazzy/setup.bash
colcon build --packages-select agenticros_msgs agenticros_explore agenticros_bringup
source install/setup.bash
ros2 launch agenticros_bringup rtabmap_nav2.launch.py
```

Then `run_mission` with goal `"map the room"` or:

```json
{
  "mission": {
    "name": "map the room",
    "steps": [
      { "id": "slam", "capability": "start_slam", "inputs": { "request": {} } },
      { "id": "cover", "capability": "explore", "inputs": { "timeout_s": 180 } },
      { "id": "save", "capability": "save_map", "inputs": { "request": {} } }
    ]
  }
}
```

Wander only: `{ "capability": "wander", "inputs": { "timeout_s": 60 } }`.

`agenticros up sim-amr --nav2` has a complete static map, so `explore` finishes quickly (no frontiers). `wander` still hops between free cells.

Full bringup: **[docs/mapping.md](../../docs/mapping.md)**.
