# agenticros_sim

Gazebo Harmonic simulation assets for the AgenticROS project: an indoor world,
a 2-wheel diff-drive AMR (depth camera + 2D lidar + IMU), a 6-DOF UR5e-shaped
robotic arm, and a `ros_gz_bridge` config that exposes everything on the topic
names the real-robot plugin already expects.

## What's inside

```
agenticros_sim/
├── worlds/agenticros_indoor.sdf       12 x 12 m indoor room with obstacles
│                                      and one "person" target for follow-me
├── models/
│   ├── agenticros_amr/                 2-wheel diff-drive AMR with sensors
│   └── agenticros_arm/                 6-DOF UR5e-shaped robotic arm
├── urdf/
│   ├── agenticros_amr.urdf.xacro       URDF mirror for RViz (AMR)
│   └── agenticros_arm.urdf.xacro       URDF mirror for RViz (arm)
├── config/
│   ├── amr_bridge.yaml                 gz <-> ROS topic mapping (AMR)
│   ├── amr_view.rviz                   RViz config: camera, scan, TF
│   ├── arm_bridge.yaml                 gz <-> ROS topic mapping (arm)
│   └── arm_view.rviz                   RViz config: RobotModel + TF
├── launch/
│   ├── sim_amr.launch.py               One-stop launcher (AMR)
│   └── sim_arm.launch.py               One-stop launcher (arm)
├── env-hooks/                          Add the package's share/ to GZ_SIM_RESOURCE_PATH
└── CMakeLists.txt + package.xml        Standard ament_cmake skeleton
```

## Quick start

```bash
# Easiest: use the agenticros CLI (handles ROS sourcing + workspace build).
agenticros up sim-amr            # AMR: GUI
agenticros up sim-amr --rviz     # AMR: GUI + RViz panel
agenticros up sim-arm            # Arm: GUI
agenticros up sim-arm --rviz     # Arm: GUI + RViz (RobotModel + TF)

# Or run the launch files directly:
cd ros2_ws && colcon build --symlink-install --packages-select agenticros_sim
source install/setup.bash
ros2 launch agenticros_sim sim_amr.launch.py
ros2 launch agenticros_sim sim_amr.launch.py use_rviz:=true
ros2 launch agenticros_sim sim_amr.launch.py gui:=false      # headless
ros2 launch agenticros_sim sim_arm.launch.py
ros2 launch agenticros_sim sim_arm.launch.py use_rviz:=true
```

## Arm topic layout

The arm exposes one position-command topic per joint plus the usual
`/joint_states`, `/tf`, and `/clock`. Send a target angle in radians as a
`std_msgs/Float64` and the PD controller drives the joint there.

| Topic                              | Type                          | Direction |
|------------------------------------|-------------------------------|-----------|
| `/arm/shoulder_pan/cmd_pos`        | `std_msgs/msg/Float64`        | ROS -> GZ |
| `/arm/shoulder_lift/cmd_pos`       | `std_msgs/msg/Float64`        | ROS -> GZ |
| `/arm/elbow/cmd_pos`               | `std_msgs/msg/Float64`        | ROS -> GZ |
| `/arm/wrist_1/cmd_pos`             | `std_msgs/msg/Float64`        | ROS -> GZ |
| `/arm/wrist_2/cmd_pos`             | `std_msgs/msg/Float64`        | ROS -> GZ |
| `/arm/wrist_3/cmd_pos`             | `std_msgs/msg/Float64`        | ROS -> GZ |
| `/joint_states`                    | `sensor_msgs/msg/JointState`  | GZ -> ROS |
| `/tf`, `/tf_static`                | `tf2_msgs/msg/TFMessage`      | GZ -> ROS |
| `/clock`                           | `rosgraph_msgs/msg/Clock`     | GZ -> ROS |

Example - wave the elbow back and forth from the command line:

```bash
ros2 topic pub /arm/elbow/cmd_pos std_msgs/msg/Float64 'data: 1.0' --once
sleep 2
ros2 topic pub /arm/elbow/cmd_pos std_msgs/msg/Float64 'data: -0.5' --once
```

The same via an MCP `ros2_publish` tool call from Claude / Codex / Gemini works
identically.

## Topic layout

The bridge YAML deliberately matches the real-robot AgenticROS plugin's topic
names so any code that works against the real RealSense + diff-drive base
works against sim without configuration changes.

| Topic                                       | Type                            | Direction |
|---------------------------------------------|---------------------------------|-----------|
| `/cmd_vel`                                  | `geometry_msgs/msg/Twist`       | ROS -> GZ |
| `/odom`                                     | `nav_msgs/msg/Odometry`         | GZ -> ROS |
| `/tf`, `/tf_static`                         | `tf2_msgs/msg/TFMessage`        | GZ -> ROS |
| `/joint_states`                             | `sensor_msgs/msg/JointState`    | GZ -> ROS |
| `/camera/camera/color/image_raw`            | `sensor_msgs/msg/Image`         | GZ -> ROS |
| `/camera/camera/color/camera_info`          | `sensor_msgs/msg/CameraInfo`    | GZ -> ROS |
| `/camera/camera/depth/image_rect_raw`       | `sensor_msgs/msg/Image` (32FC1) | GZ -> ROS |
| `/camera/camera/depth/camera_info`          | `sensor_msgs/msg/CameraInfo`    | GZ -> ROS |
| `/camera/camera/depth/points`               | `sensor_msgs/msg/PointCloud2`   | GZ -> ROS |
| `/scan`                                     | `sensor_msgs/msg/LaserScan`     | GZ -> ROS |
| `/imu/data`                                 | `sensor_msgs/msg/Imu`           | GZ -> ROS |
| `/clock`                                    | `rosgraph_msgs/msg/Clock`       | GZ -> ROS |

## AMR specs

| Property                | Value                                     |
|-------------------------|-------------------------------------------|
| Footprint               | 0.40 m x 0.30 m chassis                   |
| Wheel diameter          | 0.16 m                                    |
| Wheel separation        | 0.36 m                                    |
| Front sensor (RGBD)     | 640 x 480, 30 Hz, 87° HFOV (D435-like)    |
| Depth encoding          | 32FC1 (float32 metres)                    |
| LIDAR                   | 360 samples, 12 Hz, 12 m range            |
| IMU                     | 100 Hz, mild gaussian noise               |
| Max linear acceleration | 1.0 m/s²                                  |
| Max angular acceleration| 2.0 rad/s²                                |

## Notes & gotchas

- **Depth encoding**: the `rgbd_camera` plugin actually emits **16UC1 in
  millimetres** when bridged via `ros_gz_bridge` on Humble. This matches the
  real RealSense D435 driver's default 16UC1/mm encoding — the AgenticROS
  depth-loop handles it natively. (Newer Gazebo versions may default to 32FC1;
  the depth-loop normaliser handles both.)
- **`use_sim_time`**: defaulted to `true`. Any downstream node that subscribes
  to bridged topics should also set `use_sim_time:=true`, or it will mismatch
  timestamps.
- **Heavy worlds**: the indoor world is intentionally tiny so it runs on
  Jetson-class hardware. For bigger demos, use the `world` launch arg with
  one of the upstream `gazebo_models_worlds_collection` SDFs.
- **Why two TF bridges?** `/tf` is bridged as a regular topic, while
  `/tf_static` rides over the pose_static endpoint with a transient_local QoS
  override applied in the launch file.

## Known sharp edges (Phase 2 smoke-test findings on Jetson + Humble)

These are non-fatal but worth knowing as you build sim demos:

1. **`/odom` does not flow through the bridge.** The gz-sim diff-drive plugin
   publishes `gz.msgs.Odometry` to `/odometry`, but `ros_gz_bridge` on Humble
   appears to expect `gz.msgs.OdometryWithCovariance` for the
   `nav_msgs/msg/Odometry` mapping. The other transforms (`/tf`, `/tf_static`)
   work and are usually enough for navigation demos. Fix candidates:
   add an `<odom_publisher_topic>` for `_with_covariance` in the diff-drive
   config, or write a tiny relay node. Tracked for Phase 4 polish.
2. **`/camera/camera/color/image_raw` is silent in headless mode** on this
   Jetson (`libEGL: failed to create dri2 screen`). Depth, lidar, IMU, and
   joint_states all stream correctly regardless. With `gui:=true` (a real
   display attached) RGB recovers. Run `gz sim --versions` to make sure
   you're on Harmonic; older Garden / Citadel may have a different EGL path.
3. **gz CLI tools (`gz topic -e`, `gz topic --info`) sometimes can't reach
   the running simulator** because gz publishes on the Docker bridge IP
   (`172.17.0.1`) on this host. The ROS-side bridge still subscribes
   successfully — you just won't be able to debug-echo at the gz layer. Use
   ROS-side `ros2 topic` commands instead.
4. **Depth values can saturate well past `<far>`** when no surface is in the
   camera frustum. The follow-me-depth algorithm clamps to `[0.5 m, 4.0 m]`,
   which inherently filters this; if you write your own depth consumer,
   add the same clamp.
5. **Two `set` lines:** `run_sim.sh` uses `set -eo pipefail` (not `set -u`)
   because the ROS 2 `setup.bash` references some variables before defining
   them, which would otherwise abort the script.
