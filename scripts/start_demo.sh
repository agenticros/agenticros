#!/bin/bash
# start_demo.sh - Prepare the Corebrum Synapse Claude Code demo (local DDS transport).
#
# What this does:
#   1. Sources ROS2 + the synapse workspace
#   2. Launches the RealSense camera in the background (logs to /tmp) unless skipped
#   3. Builds the @corebrum/claude-code MCP server
#   4. Starts the local motor controller via packages/synapse-robot
#      (skipped when SYNAPSE_NO_MOTORS=1)
#
# After this finishes, launch Claude Code from the repo root. The MCP server
# is auto-started by .mcp.json over stdio — nothing else to run on this host.
#
# Environment (set by `synapse up real`):
#   SYNAPSE_NO_CAMERA=1   skip RealSense launch
#   SYNAPSE_NO_MOTORS=1   skip motor controller
#
# Usage: ./scripts/start_demo.sh [jazzy|humble]

set -e

ROS_DISTRO="${1:-jazzy}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/synapse-camera.log
CAMERA_PID_FILE=/tmp/synapse-camera.pid
source "$REPO_ROOT/scripts/lib/synapse-banner.sh"
# shellcheck source=lib/realsense.sh
source "$REPO_ROOT/scripts/lib/realsense.sh"

start_motor_controller() {
    if [[ "${SYNAPSE_NO_MOTORS:-}" == "1" ]]; then
        echo "==> Skipping motor controller (SYNAPSE_NO_MOTORS=1)"
        return 0
    fi

    echo "==> Motor controller"
    local start_motors_js="$REPO_ROOT/packages/synapse-robot/start-motors.js"
    if [[ ! -f "$start_motors_js" ]]; then
        echo "   Skipping: packages/synapse-robot/start-motors.js not found."
        echo "   Using your own ROS motor controller is fine — Corebrum Synapse publishes to /<namespace>/cmd_vel."
        return 0
    fi

    echo "   Running: node packages/synapse-robot/start-motors.js"
    set +e
    node "$start_motors_js"
    local rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
        echo "   WARN: start-motors.js exited $rc — continuing." >&2
        echo "         You may already have your own ROS motor controller running." >&2
    fi
}

synapse_banner
echo "Starting Corebrum Synapse Claude Code demo"
echo ""

echo "==> Sourcing ROS2 ($ROS_DISTRO) and synapse workspace"
source "/opt/ros/$ROS_DISTRO/setup.bash"
if [[ -f "$REPO_ROOT/ros2_ws/install/setup.bash" ]]; then
    source "$REPO_ROOT/ros2_ws/install/setup.bash"
else
    echo "   (ros2_ws is not built — run: cd ros2_ws && colcon build --symlink-install)"
fi

if [[ "${SYNAPSE_NO_CAMERA:-}" == "1" ]]; then
    echo "==> Skipping RealSense camera (SYNAPSE_NO_CAMERA=1)"
else
    start_realsense_camera
fi

echo "==> Building TypeScript workspace (@corebrum/core, ros-camera, claude-code, ...)"
cd "$REPO_ROOT"
# pnpm 9: `<pkg>...` is the package plus its workspace dependencies.
# `...<pkg>` is dependents. claude-code is a leaf, so the leading-dots
# form builds only claude-code and tsc then sees a stale @corebrum/core dist.
# `--workspace-concurrency=1` keeps logs readable on slow Jetson SDs.
# Order is topological: core, ros-camera, object-detection, then claude-code.
if ! pnpm --filter '@corebrum/claude-code...' --workspace-concurrency=1 build; then
  echo ""
  echo "    Workspace build failed. If this is your first run, do:" >&2
  echo "      synapse init     # installs deps + builds workspace" >&2
  echo "    or, from this dir:" >&2
  echo "      pnpm install && pnpm build" >&2
  exit 2
fi

start_motor_controller

echo ""
echo "Demo ready. Launch Claude Code from $REPO_ROOT — .mcp.json starts the MCP server."
if [[ -f "$CAMERA_PID_FILE" ]]; then
    echo "Stop the camera with: synapse stop realsense   (or: synapse down)"
fi
