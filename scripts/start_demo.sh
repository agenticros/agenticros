#!/bin/bash
# start_demo.sh - Prepare the AgenticROS Claude Code demo (local DDS transport).
#
# What this does:
#   1. Sources ROS2 + the agenticros workspace
#   2. Launches the RealSense camera in the background (logs to /tmp) unless skipped
#   3. Builds the @agenticros/claude-code MCP server
#   4. Starts the local motor controller via packages/agenticros-robot
#      (skipped when AGENTICROS_NO_MOTORS=1)
#
# After this finishes, launch Claude Code from the repo root. The MCP server
# is auto-started by .mcp.json over stdio — nothing else to run on this host.
#
# Environment (set by `agenticros up real`):
#   AGENTICROS_NO_CAMERA=1   skip RealSense launch
#   AGENTICROS_NO_MOTORS=1   skip motor controller
#
# Usage: ./scripts/start_demo.sh [jazzy|humble]

set -e

ROS_DISTRO="${1:-jazzy}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/agenticros-camera.log
CAMERA_PID_FILE=/tmp/agenticros-camera.pid
source "$REPO_ROOT/scripts/lib/agenticros-banner.sh"
# shellcheck source=lib/realsense.sh
source "$REPO_ROOT/scripts/lib/realsense.sh"

start_motor_controller() {
    if [[ "${AGENTICROS_NO_MOTORS:-}" == "1" ]]; then
        echo "==> Skipping motor controller (AGENTICROS_NO_MOTORS=1)"
        return 0
    fi

    echo "==> Motor controller"
    local start_motors_js="$REPO_ROOT/packages/agenticros-robot/start-motors.js"
    if [[ ! -f "$start_motors_js" ]]; then
        echo "   Skipping: packages/agenticros-robot/start-motors.js not found."
        echo "   Using your own ROS motor controller is fine — AgenticROS publishes to /<namespace>/cmd_vel."
        return 0
    fi

    echo "   Running: node packages/agenticros-robot/start-motors.js"
    set +e
    node "$start_motors_js"
    local rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
        echo "   WARN: start-motors.js exited $rc — continuing." >&2
        echo "         You may already have your own ROS motor controller running." >&2
    fi
}

agenticros_banner
echo "Starting AgenticROS Claude Code demo"
echo ""

echo "==> Sourcing ROS2 ($ROS_DISTRO) and agenticros workspace"
source "/opt/ros/$ROS_DISTRO/setup.bash"
if [[ -f "$REPO_ROOT/ros2_ws/install/setup.bash" ]]; then
    source "$REPO_ROOT/ros2_ws/install/setup.bash"
else
    echo "   (ros2_ws is not built — run: cd ros2_ws && colcon build --symlink-install)"
fi

if [[ "${AGENTICROS_NO_CAMERA:-}" == "1" ]]; then
    echo "==> Skipping RealSense camera (AGENTICROS_NO_CAMERA=1)"
else
    start_realsense_camera
fi

echo "==> Building TypeScript workspace (@agenticros/core, ros-camera, claude-code, ...)"
cd "$REPO_ROOT"
# Build claude-code AND all its dependencies (@agenticros/core, ros-camera).
# Without the leading dots we'd only build claude-code itself and TS would
# fail to resolve @agenticros/core because the dependency has no dist/ yet.
# `--workspace-concurrency=1` keeps logs readable on slow Jetson SDs.
if ! pnpm --filter '...@agenticros/claude-code' --workspace-concurrency=1 build; then
  echo ""
  echo "    Workspace build failed. If this is your first run, do:" >&2
  echo "      agenticros init     # installs deps + builds workspace" >&2
  echo "    or, from this dir:" >&2
  echo "      pnpm install && pnpm build" >&2
  exit 2
fi

start_motor_controller

echo ""
echo "Demo ready. Launch Claude Code from $REPO_ROOT — .mcp.json starts the MCP server."
if [[ -f "$CAMERA_PID_FILE" ]]; then
    echo "Stop the camera with: agenticros stop realsense   (or: agenticros down)"
fi
