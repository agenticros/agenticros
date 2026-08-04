#!/bin/bash
# Standalone RealSense start (used by `agenticros start realsense`).
# Usage: ./scripts/start_realsense.sh [jazzy|humble] [--pointcloud]

set -e

ROS_DISTRO="${1:-jazzy}"
shift || true
POINTCLOUD=""
for arg in "$@"; do
  if [[ "$arg" == "--pointcloud" ]] || [[ "$arg" == "-p" ]]; then
    POINTCLOUD="pointcloud"
  fi
done

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/agenticros-camera.log
CAMERA_PID_FILE=/tmp/agenticros-camera.pid

# shellcheck source=lib/realsense.sh
source "$REPO_ROOT/scripts/lib/realsense.sh"

if [[ -f "/opt/ros/$ROS_DISTRO/setup.bash" ]]; then
  # shellcheck disable=SC1090
  source "/opt/ros/$ROS_DISTRO/setup.bash"
fi
if [[ -f "$REPO_ROOT/ros2_ws/install/setup.bash" ]]; then
  # shellcheck disable=SC1090
  source "$REPO_ROOT/ros2_ws/install/setup.bash"
fi

start_realsense_camera "$POINTCLOUD"
