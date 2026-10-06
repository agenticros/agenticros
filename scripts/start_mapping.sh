#!/bin/bash
# Start RTAB-Map + Nav2 + explore (agenticros_bringup rtabmap_nav2.launch.py).
#
# Used by `agenticros up real --map`. Requires:
#   sudo apt install ros-$ROS_DISTRO-navigation2 ros-$ROS_DISTRO-nav2-bringup ros-$ROS_DISTRO-rtabmap-ros
#   colcon build --packages-select agenticros_msgs agenticros_explore agenticros_bringup
#
# Environment:
#   AGENTICROS_ROBOT_NAMESPACE   forwarded as robot_namespace:=
#   AGENTICROS_WHEEL_ODOM=1      visual_odometry:=false odom_topic:=/odom
#   AGENTICROS_KEEP_MAP=1        delete_db_on_start:=false (resume the active room)
#   AGENTICROS_MAP_DATABASE      database_path:= (default ~/.ros/rtabmap.db)
#   AGENTICROS_MAP_LOCALIZE=1    localization mode (new bringup; ignored by older launches)
#   AGENTICROS_NO_REALSENSE=1    use_realsense:=false (camera already running)
#
# Usage: ./scripts/start_mapping.sh [jazzy|humble]

set -euo pipefail

ROS_DISTRO="${1:-${ROS_DISTRO:-jazzy}}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

if [[ ! -f "/opt/ros/${ROS_DISTRO}/setup.bash" ]]; then
  echo "ROS 2 ${ROS_DISTRO} is not installed at /opt/ros/${ROS_DISTRO}." >&2
  exit 1
fi

# ROS setup scripts reference AMENT_TRACE_SETUP_FILES and other vars that are
# unset under `set -u`, which aborts this script before RTAB-Map launches.
set +u
source "/opt/ros/${ROS_DISTRO}/setup.bash"
if [[ -f "$REPO_ROOT/ros2_ws/install/setup.bash" ]]; then
  source "$REPO_ROOT/ros2_ws/install/setup.bash"
fi
set -u

missing=()
if [[ ! -d "/opt/ros/${ROS_DISTRO}/share/rtabmap_ros" && ! -d "/opt/ros/${ROS_DISTRO}/share/rtabmap_launch" ]]; then
  missing+=("ros-${ROS_DISTRO}-rtabmap-ros")
fi
if [[ ! -d "/opt/ros/${ROS_DISTRO}/share/nav2_bringup" ]]; then
  missing+=("ros-${ROS_DISTRO}-nav2-bringup")
fi
if [[ ! -d "/opt/ros/${ROS_DISTRO}/share/navigation2" && ! -d "/opt/ros/${ROS_DISTRO}/share/nav2_controller" ]]; then
  missing+=("ros-${ROS_DISTRO}-navigation2")
fi
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing ROS packages for mapping: ${missing[*]}" >&2
  echo "Install with:" >&2
  echo "  sudo apt-get install -y ${missing[*]}" >&2
  exit 2
fi

if ! ros2 pkg prefix agenticros_bringup >/dev/null 2>&1; then
  echo "agenticros_bringup is not in the ROS overlay." >&2
  echo "Build it from the workspace:" >&2
  echo "  cd $REPO_ROOT/ros2_ws && colcon build --packages-select agenticros_msgs agenticros_explore agenticros_bringup --symlink-install" >&2
  echo "  source install/setup.bash" >&2
  exit 2
fi

NS="${AGENTICROS_ROBOT_NAMESPACE:-}"
VO="true"
ODOM="/odom"
DELETE_DB="true"
USE_RS="true"
if [[ "${AGENTICROS_WHEEL_ODOM:-}" == "1" ]]; then
  VO="false"
fi
if [[ "${AGENTICROS_KEEP_MAP:-}" == "1" ]]; then
  DELETE_DB="false"
fi
if [[ "${AGENTICROS_NO_REALSENSE:-}" == "1" ]]; then
  USE_RS="false"
fi

MAP_DB="${AGENTICROS_MAP_DATABASE:-}"
LOCALIZE="${AGENTICROS_MAP_LOCALIZE:-0}"

# Stop a previous stack before this process becomes `ros2 launch ... rtabmap`.
# Do not pkill start_mapping.sh — that pattern matches this script.
# [r]tabmap keeps pkill from matching its own command line.
stopped=0
for pat in \
  '[r]tabmap_nav2.launch.py' \
  '[r]tabmap' \
  nav2_container bt_navigator controller_server planner_server \
  behavior_server smoother_server waypoint_follower velocity_smoother \
  route_server collision_monitor docking_server \
  lifecycle_manager_navigation agenticros_explore camera_stamp_fix \
  static_tf_base_link cmd_vel_relay
do
  if pgrep -f "$pat" >/dev/null 2>&1; then
    pkill -f "$pat" >/dev/null 2>&1 || true
    stopped=1
  fi
done
# Teleop RealSense is low-res and unaligned, and it holds the camera.
if [[ "${USE_RS}" == "true" ]] && pgrep -f '[r]ealsense2_camera_node' >/dev/null 2>&1; then
  echo "==> Stopping the current RealSense so mapping can start an aligned camera."
  pkill -f '[r]ealsense2_camera_node' >/dev/null 2>&1 || true
  pkill -f '[r]os2 launch realsense2_camera' >/dev/null 2>&1 || true
  stopped=1
fi
if [[ "$stopped" == "1" ]]; then
  sleep 1
fi

echo "==> Launching RTAB-Map + Nav2 (robot_namespace='${NS}' visual_odometry=${VO} use_realsense=${USE_RS} keep_map=${AGENTICROS_KEEP_MAP:-0} localize=${LOCALIZE})"
if [[ -n "${MAP_DB}" ]]; then
  echo "    database: ${MAP_DB}"
fi
echo "    Next: agenticros skills install --bundle mapping"
echo "    Then chat: \"map the room\" / \"save this place as kitchen\" / \"go to the kitchen\""

# An empty `name:=` is rejected by `ros2 launch` ("malformed launch argument").
# The launch file already defaults robot_namespace to "" and skips the cmd_vel relay.
launch_args=(
  "visual_odometry:=${VO}"
  "odom_topic:=${ODOM}"
  "delete_db_on_start:=${DELETE_DB}"
  "use_realsense:=${USE_RS}"
  # No URDF on this robot, so base_link does not exist and visual odometry
  # cannot look up base_link -> camera_color_optical_frame.
  "use_static_robot_tf:=true"
  # RealSense hardware stamps arrive out of order on this Jetson.
  "rewrite_camera_stamps:=true"
)
# An already-running teleop camera publishes unaligned depth. The mapping
# launch's own camera enables align_depth and should keep the default topic.
if [[ "${USE_RS}" != "true" ]]; then
  launch_args+=("depth_topic:=/camera/camera/depth/image_rect_raw")
fi
if [[ -n "${NS}" ]]; then
  launch_args+=("robot_namespace:=${NS}")
fi
if [[ -n "${MAP_DB}" ]]; then
  launch_args+=("database_path:=${MAP_DB}")
fi

exec ros2 launch agenticros_bringup rtabmap_nav2.launch.py "${launch_args[@]}"
