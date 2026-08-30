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
#   AGENTICROS_KEEP_MAP=1        delete_db_on_start:=false
#
# Usage: ./scripts/start_mapping.sh [jazzy|humble]

set -euo pipefail

ROS_DISTRO="${1:-${ROS_DISTRO:-jazzy}}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

if [[ ! -f "/opt/ros/${ROS_DISTRO}/setup.bash" ]]; then
  echo "ROS 2 ${ROS_DISTRO} is not installed at /opt/ros/${ROS_DISTRO}." >&2
  exit 1
fi

source "/opt/ros/${ROS_DISTRO}/setup.bash"
if [[ -f "$REPO_ROOT/ros2_ws/install/setup.bash" ]]; then
  source "$REPO_ROOT/ros2_ws/install/setup.bash"
fi

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
if [[ "${AGENTICROS_WHEEL_ODOM:-}" == "1" ]]; then
  VO="false"
fi
if [[ "${AGENTICROS_KEEP_MAP:-}" == "1" ]]; then
  DELETE_DB="false"
fi

echo "==> Launching RTAB-Map + Nav2 (robot_namespace='${NS}' visual_odometry=${VO})"
echo "    Next: agenticros skills install --bundle mapping"
echo "    Then chat: \"map the room\" / \"save this place as kitchen\" / \"go to the kitchen\""

exec ros2 launch agenticros_bringup rtabmap_nav2.launch.py \
  "robot_namespace:=${NS}" \
  "visual_odometry:=${VO}" \
  "odom_topic:=${ODOM}" \
  "delete_db_on_start:=${DELETE_DB}"
