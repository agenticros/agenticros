# agenticros_bringup

Launch files and an RViz2 config for **TurtleBot3 in Gazebo** aligned with AgenticROS examples (`/cmd_vel`, `/scan`, rosbridge on port **9090**).

## Prerequisites (required for `*_gazebo*` launches)

`agenticros_bringup` does **not** vendor TurtleBot3 or Gazebo. Install them from ROS 2 (Ubuntu, **Jazzy** example):

```bash
sudo apt update
sudo apt install ros-jazzy-turtlebot3-gazebo ros-jazzy-rviz2 ros-jazzy-rosbridge-suite
```

Gazebo is pulled in as a dependency of **`ros-jazzy-turtlebot3-gazebo`**. If `apt` cannot find that package, run `apt search turtlebot3-gazebo` for your distro’s exact name.

Check before launching:

```bash
source /opt/ros/jazzy/setup.bash
ros2 pkg prefix turtlebot3_gazebo
```

If that prints a path under `/opt/ros/jazzy`, launches that use `FindPackageShare('turtlebot3_gazebo')` will work.

**Error: `package 'turtlebot3_gazebo' not found`** — the stack above is not installed (or you only sourced `install/setup.bash` without `/opt/ros/jazzy/setup.bash`). Always source **both**, in order: `source /opt/ros/jazzy/setup.bash` then `source …/ros2_ws/install/setup.bash`.

On **ARM boards** (e.g. Radxa), the binary packages must exist for your Ubuntu + ROS repo; if `apt install` has no candidate, build [turtlebot3_simulations](https://github.com/ROBOTIS-GIT/turtlebot3_simulations) from source into your workspace or use the repo’s **Docker** sim image on an `amd64` host.

## Launches

| Launch | Purpose |
|--------|--------|
| `rosbridge_gazebo.launch.py` | **Rosbridge WebSocket + TurtleBot3 world** — use in Docker or headless hosts. |
| `gazebo_turtlebot3.launch.py` | Gazebo + TurtleBot3 only (no rosbridge). |
| `rviz.launch.py` | RViz2 with `turtlebot3_agenticros.rviz` (`odom`, `/scan`, `/robot_description`). |
| `turtlebot3_gazebo_rviz.launch.py` | Gazebo + RViz on one machine (needs a display). |
| `mode_a_gazebo.launch.py` | **Mode A:** Gazebo + TurtleBot3 only; sets **`ROS_DOMAIN_ID`** (default `0`). Use with AgenticROS **local** transport—no rosbridge. |
| `mode_a_gazebo_rviz.launch.py` | **Mode A:** Gazebo + RViz + same domain ID setup. |

### Examples

```bash
source /opt/ros/jazzy/setup.bash
source install/setup.bash

# Mode A (local DDS): Gazebo sim on the same machine as OpenClaw + LocalTransport
ros2 launch agenticros_bringup mode_a_gazebo.launch.py
# Optional: ros_domain_id:=1  — must match plugin local.domainId

# Mode A + RViz
ros2 launch agenticros_bringup mode_a_gazebo_rviz.launch.py

# Simulation + rosbridge (Mode B–style; plugin uses ws://localhost:9090)
ros2 launch agenticros_bringup rosbridge_gazebo.launch.py

# Gazebo + RViz without forcing ROS_DOMAIN_ID via launch (set export ROS_DOMAIN_ID yourself)
ros2 launch agenticros_bringup turtlebot3_gazebo_rviz.launch.py

# RViz alone while sim is already running
ros2 launch agenticros_bringup rviz.launch.py use_sim_time:=true
```

### Parameters

- **`turtlebot3_model`** — `burger` (default), `waffle`, or `waffle_pi`
- **`rviz_config`** — path to a different `.rviz` file
- **`use_sim_time`** — set `true` with Gazebo

See the repository **README** for Docker and OpenClaw plugin settings.
