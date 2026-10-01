#!/bin/bash
# Send one Nav2 navigate_to_pose goal in the map frame, then wait for the result.
#
# Called by `agenticros navigate`. Arguments are already numeric; the namespace
# comes from the environment (the robot's own config), not from the network.
#
# Usage: ./scripts/navigate_to.sh <ros-distro> <x> <y> <qz> <qw>

set -euo pipefail

ROS_DISTRO="${1:-${ROS_DISTRO:-jazzy}}"
X="${2:?x}"
Y="${3:?y}"
QZ="${4:?qz}"
QW="${5:?qw}"

num='^-?[0-9]+([.][0-9]+)?$'
for v in "$X" "$Y" "$QZ" "$QW"; do
  if [[ ! "$v" =~ $num ]]; then
    echo "Refusing non-numeric goal component: $v" >&2
    exit 2
  fi
done

NS="${AGENTICROS_ROBOT_NAMESPACE:-}"
if [[ -n "$NS" && ! "$NS" =~ ^[A-Za-z0-9_./-]+$ ]]; then
  echo "Refusing robot namespace: $NS" >&2
  exit 2
fi

if [[ ! -f "/opt/ros/${ROS_DISTRO}/setup.bash" ]]; then
  echo "ROS 2 ${ROS_DISTRO} is not installed at /opt/ros/${ROS_DISTRO}." >&2
  exit 1
fi

# ROS setup scripts reference unset AMENT_* vars. Nounset would abort the goal.
set +u
source "/opt/ros/${ROS_DISTRO}/setup.bash"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ -f "$REPO_ROOT/ros2_ws/install/setup.bash" ]]; then
  source "$REPO_ROOT/ros2_ws/install/setup.bash"
fi
set -u

ACTION="navigate_to_pose"
if [[ -n "$NS" ]]; then
  ACTION="/${NS}/navigate_to_pose"
fi

echo "==> navigate_to_pose ${ACTION} x=${X} y=${Y} qz=${QZ} qw=${QW}"
exec ros2 action send_goal "$ACTION" nav2_msgs/action/NavigateToPose \
  "{pose: {header: {frame_id: map}, pose: {position: {x: ${X}, y: ${Y}, z: 0.0}, orientation: {x: 0.0, y: 0.0, z: ${QZ}, w: ${QW}}}}}"
