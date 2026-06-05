# agenticros_bringup

Launch files and an RViz2 config for **TurtleBot3 in Gazebo** aligned with AgenticROS examples (`/cmd_vel`, `/scan`, rosbridge on port **9090**).

**`package 'agenticros_bringup' not found`:** you must build the workspace and **source the overlay** (not only `/opt/ros/jazzy`):

`cd …/agenticros/ros2_ws && source /opt/ros/jazzy/setup.bash && source install/setup.bash`

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

## Namespaced `cmd_vel` (AgenticROS `robot.namespace`)

Real robots often use **`/<namespace>/cmd_vel`** (e.g. `/robot3946b404c33e4aa39a8d16deb1c5c593/cmd_vel`). Stock TurtleBot3 Gazebo subscribes to **`/cmd_vel`**. To use the **same** AgenticROS namespace in sim without editing SDF plugins, pass **`robot_namespace`** (the namespace string **without** slashes—same as the plugin’s `robot.namespace` value):

```bash
ros2 launch agenticros_bringup mode_a_gazebo.launch.py \
  robot_namespace:=robot3946b404c33e4aa39a8d16deb1c5c593
```

That starts the package’s built-in **`cmd_vel_relay`** node, republishing `/<namespace>/cmd_vel` → `/cmd_vel` (no `topic_tools` install). It applies to **`gazebo_turtlebot3`**, **`mode_a_*`**, **`turtlebot3_gazebo_rviz`**, and **`rosbridge_gazebo`** launches.

If Gazebo is **already running** in another terminal, start **only** the relay (this does **not** open Gazebo or RViz):

```bash
ros2 launch agenticros_bringup cmd_vel_bridge.launch.py \
  src_cmd_vel:=/robot3946b404c33e4aa39a8d16deb1c5c593/cmd_vel
```

To open **Gazebo** (and optionally **RViz**), use **`mode_a_gazebo.launch.py`**, **`turtlebot3_gazebo_rviz.launch.py`**, or **`rosbridge_gazebo.launch.py`**—not `cmd_vel_bridge.launch.py`.

**RViz:** the bundled config still uses **`/scan`**, **`odom`**, and **`/robot_description`** because TurtleBot3 Gazebo publishes those at the root. If your **physical** robot also namespaces laser or TF, update the RViz displays (LaserScan topic, fixed frame) or add extra relays—only **`cmd_vel`** is bridged by default.

### Teleop / real base moves, but Gazebo (and RViz on the sim) does not

AgenticROS teleop and many stacks publish **`/<namespace>/cmd_vel`** (e.g. `/robot3946…/cmd_vel`). The **real** controller subscribes there, so the hardware moves. Stock **TurtleBot3 Gazebo** subscribes to **`/cmd_vel`** only, so the sim never sees those twists until you **relay** or launch with **`robot_namespace:=...`** so `cmd_vel_relay` is running.

1. Start Gazebo **first** (with or without `robot_namespace`—if without, you must run the bridge below).  
2. In **another terminal** (same machine, same `ROS_DOMAIN_ID`, both workspaces sourced):

   ```bash
   ros2 launch agenticros_bringup cmd_vel_bridge.launch.py \
     src_cmd_vel:=/robot3946b404c33e4aa39a8d16deb1c5c593/cmd_vel
   ```

   Or one launch that includes sim + relay:

   ```bash
   ros2 launch agenticros_bringup mode_a_gazebo_rviz.launch.py \
     robot_namespace:=robot3946b404c33e4aa39a8d16deb1c5c593
   ```

3. **Check** that something publishes `/cmd_vel` and Gazebo is a subscriber:

   ```bash
   ros2 topic info /cmd_vel -v
   ```

   While driving teleop, **`ros2 topic echo /cmd_vel`** should show `Twist` messages; if not, the relay source topic does not match where teleop publishes (run `ros2 topic list | grep cmd_vel`).

**RViz** is only showing the **sim** robot pose from Gazebo’s TF/odom. If the sim never receives `cmd_vel`, the model stays put. (To visualize the **physical** robot instead, point RViz at your real stack’s TF/odom topics—not the TurtleBot3 Gazebo defaults.)

## Launches

| Launch | Purpose |
|--------|--------|
| `rosbridge_gazebo.launch.py` | **Rosbridge WebSocket + TurtleBot3 world** — use in Docker or headless hosts. |
| `gazebo_turtlebot3.launch.py` | Gazebo + TurtleBot3 only (no rosbridge). |
| `rviz.launch.py` | RViz2 with `turtlebot3_agenticros.rviz` (`odom`, `/scan`, `/robot_description`). |
| `turtlebot3_gazebo_rviz.launch.py` | Gazebo + RViz on one machine (needs a display). |
| `mode_a_gazebo.launch.py` | **Mode A:** Gazebo + TurtleBot3 only; sets **`ROS_DOMAIN_ID`** (default `0`). Use with AgenticROS **local** transport—no rosbridge. |
| `mode_a_gazebo_rviz.launch.py` | **Mode A:** Gazebo + RViz + same domain ID setup. |
| `cmd_vel_bridge.launch.py` | Relay only: namespaced **`src_cmd_vel`** → **`dst_cmd_vel`** (default `/cmd_vel`). |

### Examples

```bash
source /opt/ros/jazzy/setup.bash
source install/setup.bash

# Mode A (local DDS): Gazebo sim on the same machine as OpenClaw + LocalTransport
ros2 launch agenticros_bringup mode_a_gazebo.launch.py
# Same + AgenticROS robot.namespace (cmd_vel relay to Gazebo):
# ros2 launch agenticros_bringup mode_a_gazebo.launch.py robot_namespace:=robot3946b404c33e4aa39a8d16deb1c5c593
# Optional: ros_domain_id:=1  — must match plugin local.domainId

# Mode A + RViz
ros2 launch agenticros_bringup mode_a_gazebo_rviz.launch.py
# …robot_namespace:=... as above if needed

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
