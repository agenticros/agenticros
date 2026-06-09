#!/bin/bash
# start_demo.sh - Prepare the AgenticROS Claude Code demo (local DDS transport).
#
# What this does:
#   1. Sources ROS2 + the agenticros workspace
#   2. Launches the RealSense camera in the background (logs to /tmp)
#   3. Builds the @agenticros/claude-code MCP server
#   4. Starts the robot's motor controller via `robotics start motors`
#
# After this finishes, launch Claude Code from the repo root. The MCP server
# is auto-started by .mcp.json over stdio — nothing else to run on this host.
#
# Usage: ./scripts/start_demo.sh [jazzy|humble]

set -e

ROS_DISTRO="${1:-jazzy}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/agenticros-camera.log
CAMERA_PID_FILE=/tmp/agenticros-camera.pid
source "$REPO_ROOT/scripts/lib/agenticros-banner.sh"

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

echo "==> Starting RealSense camera (logs: $CAMERA_LOG)"
if [[ -f "$CAMERA_PID_FILE" ]] && kill -0 "$(cat "$CAMERA_PID_FILE")" 2>/dev/null; then
    echo "   Already running (pid $(cat "$CAMERA_PID_FILE")) — skipping"
elif pgrep -f "realsense2_camera_node" >/dev/null; then
    # Camera node from a prior session is still running but our pidfile is gone.
    # Re-adopt it so `agenticros down` can find and stop it (turning off the IR
    # projector). We point the pidfile at the actual node, not a launch parent,
    # because that's what's holding the USB device.
    existing_pid=$(pgrep -f "realsense2_camera_node" | head -n 1)
    echo "$existing_pid" >"$CAMERA_PID_FILE"
    echo "   Detected an existing realsense2_camera_node (pid $existing_pid) — adopted into $CAMERA_PID_FILE"
else
    nohup ros2 launch realsense2_camera rs_launch.py >"$CAMERA_LOG" 2>&1 &
    # $! is the `ros2 launch` parent; the actual camera node is a child that
    # comes up a moment later. Wait briefly so we can record the node's PID
    # (what holds the USB / projector) instead of the parent's.
    launch_pid=$!
    node_pid=""
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        node_pid=$(pgrep -f "realsense2_camera_node" | head -n 1 || true)
        [[ -n "$node_pid" ]] && break
        sleep 0.5
    done
    if [[ -n "$node_pid" ]]; then
        echo "$node_pid" >"$CAMERA_PID_FILE"
        echo "   Started (node pid $node_pid, launch pid $launch_pid)"
    else
        # Fallback: launch parent. `agenticros down` also pkills by name, so
        # this still gets cleaned up even if we miss the node PID.
        echo "$launch_pid" >"$CAMERA_PID_FILE"
        echo "   Started (launch pid $launch_pid — node not yet visible; pkill fallback will clean up)"
    fi
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

echo "==> Starting motor controller (robotics start motors)"
robotics start motors

echo ""
echo "Demo ready. Launch Claude Code from $REPO_ROOT — .mcp.json starts the MCP server."
echo "Stop the camera with: kill \$(cat $CAMERA_PID_FILE)"
