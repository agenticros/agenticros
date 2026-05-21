#!/usr/bin/env bash
#
# Start the host-side ROS 2 stack the NemoClaw sandbox talks to:
#
#   RealSense (realsense2_camera) + rosbridge_server + cmd_vel relay
#
# Architecture (hybrid NemoClaw setup):
#
#     ┌──────────────── host (Jetson) ────────────────┐
#     │  /opt/ros/humble  +  librealsense2            │
#     │  ros2 launch agenticros_bringup …             │
#     │      realsense2_camera   → /camera/camera/*   │
#     │      rosbridge_server    on 0.0.0.0:9090      │
#     │      cmd_vel_relay       /<ns>/cmd_vel→/cmd_vel│
#     └───────────────────┬───────────────────────────┘
#                         │  ws on 172.19.0.1:9090
#                         ▼
#     ┌──────────── NemoClaw sandbox ─────────────────┐
#     │  OpenClaw + AgenticROS plugin                 │
#     │  rosbridge.url = ws://host.docker.internal:9090│
#     └───────────────────────────────────────────────┘
#
# Usage:   ./scripts/run_nemoclaw_host_stack.sh [ros_distro] [extra args...]
#
# Example: ./scripts/run_nemoclaw_host_stack.sh humble \
#              robot_namespace:=3946b404-c33e-4aa3-9a8d-16deb1c5c593 \
#              align_depth:=true
#
# Defaults to ROS 2 Humble (matches what's installed on a Jetson Orin Nano).
# Pass jazzy etc. if your host runs a different distro.

set -e

ROS_DISTRO="${1:-humble}"
shift || true

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SETUP="/opt/ros/${ROS_DISTRO}/setup.bash"

if [[ ! -f "$SETUP" ]]; then
  echo "ROS 2 ${ROS_DISTRO} not found at ${SETUP}." >&2
  echo "Install ROS 2 (e.g. ros-${ROS_DISTRO}-desktop) or pass a different distro: $0 jazzy ..." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$SETUP"

WS_INSTALL="$REPO_ROOT/ros2_ws/install/setup.bash"
if [[ ! -f "$WS_INSTALL" ]]; then
  echo "agenticros_bringup not built yet. Building agenticros_msgs + agenticros_bringup …"
  (
    cd "$REPO_ROOT/ros2_ws"
    colcon build --packages-select agenticros_msgs agenticros_bringup
  )
fi
# shellcheck disable=SC1090
source "$WS_INSTALL"

for pkg in rosbridge_server realsense2_camera image_transport_plugins; do
  if ! ros2 pkg prefix "$pkg" >/dev/null 2>&1; then
    case "$pkg" in
      rosbridge_server)
        echo "Missing ros-${ROS_DISTRO}-rosbridge-suite. Install with:" >&2
        echo "    sudo apt-get install -y ros-${ROS_DISTRO}-rosbridge-suite" >&2
        ;;
      realsense2_camera)
        echo "Missing ros-${ROS_DISTRO}-realsense2-camera. Install with:" >&2
        echo "    sudo apt-get install -y ros-${ROS_DISTRO}-realsense2-camera" >&2
        ;;
      image_transport_plugins)
        echo "Missing ros-${ROS_DISTRO}-image-transport-plugins (needed for compressed camera topic). Install with:" >&2
        echo "    sudo apt-get install -y ros-${ROS_DISTRO}-image-transport-plugins" >&2
        ;;
    esac
    exit 1
  fi
done

echo "── agenticros: host stack for NemoClaw ─────────────────────────"
echo "  ROS:        ${ROS_DISTRO}"
echo "  RealSense:  realsense2_camera (color + depth, aligned)"
echo "  Rosbridge:  ws://0.0.0.0:9090   (sandbox connects via host.docker.internal:9090)"
echo "  cmd_vel:    /<robot_namespace>/cmd_vel → /cmd_vel"
echo "────────────────────────────────────────────────────────────────"

exec ros2 launch agenticros_bringup realsense_rosbridge.launch.py "$@"
