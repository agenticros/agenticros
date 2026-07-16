#!/bin/bash
# start_demo.sh - Prepare the AgenticROS Claude Code demo (local DDS transport).
#
# What this does:
#   1. Sources ROS2 + the agenticros workspace
#   2. Launches the RealSense camera in the background (logs to /tmp) unless skipped
#   3. Builds the @agenticros/claude-code MCP server
#   4. Optionally starts the robot's motor controller via `robotics start motors`
#      when the robotics CLI is installed (skipped quietly otherwise — many users
#      run their own ROS motor controller)
#
# After this finishes, launch Claude Code from the repo root. The MCP server
# is auto-started by .mcp.json over stdio — nothing else to run on this host.
#
# Environment (set by `agenticros up real`):
#   AGENTICROS_NO_CAMERA=1   skip RealSense launch
#   AGENTICROS_NO_MOTORS=1   skip robotics motor controller
#
# Usage: ./scripts/start_demo.sh [jazzy|humble]

set -e

ROS_DISTRO="${1:-jazzy}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/agenticros-camera.log
CAMERA_PID_FILE=/tmp/agenticros-camera.pid
source "$REPO_ROOT/scripts/lib/agenticros-banner.sh"

# True when rs-enumerate-devices reports D4XX Recovery firmware (camera won't stream).
realsense_in_recovery_mode() {
    command -v rs-enumerate-devices >/dev/null 2>&1 || return 1
    rs-enumerate-devices 2>/dev/null | grep -qi 'recovery'
}

realsense_print_recovery_help() {
    echo "   ERROR: RealSense is stuck in firmware RECOVERY mode." >&2
    echo "          The camera node will start but publish no images on ROS topics." >&2
    echo "" >&2
    echo "   Fix (stop any running camera node first):" >&2
    echo "     agenticros down" >&2
    echo "     rs-fw-update -r" >&2
    echo "     rs-enumerate-devices -s    # should show D4xx + real serial" >&2
    echo "     npx agenticros             # re-launch real robot" >&2
    echo "" >&2
    echo "   If recovery fails: unplug USB 10s, use a USB 3.0 port + data cable." >&2
    echo "   Logs: $CAMERA_LOG" >&2
}

# Preflight before launch. Returns 0 when OK to launch, 1 to skip (recovery mode).
realsense_preflight() {
    if ! command -v rs-enumerate-devices >/dev/null 2>&1; then
        return 0
    fi
    if realsense_in_recovery_mode; then
        realsense_print_recovery_help
        return 1
    fi
    if ! rs-enumerate-devices 2>/dev/null | grep -qi 'Intel RealSense'; then
        echo "   WARN: no Intel RealSense detected on USB." >&2
        echo "         Camera launch will likely fail — check cable/port." >&2
    fi
    return 0
}

# After launch, detect the classic recovery-mode retry loop in the log.
realsense_verify_started() {
    local node_pid="${1:-}"
    sleep 3
    if [[ ! -f "$CAMERA_LOG" ]]; then
        return 0
    fi
    if grep -q "Serial Number not supported by the device" "$CAMERA_LOG" 2>/dev/null; then
        echo "   ERROR: RealSense failed to open the device (recovery mode or USB issue)." >&2
        realsense_print_recovery_help
        if [[ -n "$node_pid" ]]; then
            kill "$node_pid" 2>/dev/null || true
        fi
        pkill -f "realsense2_camera" 2>/dev/null || true
        rm -f "$CAMERA_PID_FILE"
        return 1
    fi
    return 0
}

start_realsense_camera() {
    echo "==> Starting RealSense camera (logs: $CAMERA_LOG)"
    if [[ -f "$CAMERA_PID_FILE" ]] && kill -0 "$(cat "$CAMERA_PID_FILE")" 2>/dev/null; then
        echo "   Already running (pid $(cat "$CAMERA_PID_FILE")) — skipping"
        if realsense_in_recovery_mode; then
            echo "   WARN: RealSense is in RECOVERY mode — no images will publish." >&2
            realsense_print_recovery_help
        fi
        return 0
    fi
    if pgrep -f "realsense2_camera_node" >/dev/null; then
        # Camera node from a prior session is still running but our pidfile is gone.
        # Re-adopt it so `agenticros down` can find and stop it (turning off the IR
        # projector). We point the pidfile at the actual node, not a launch parent,
        # because that's what's holding the USB device.
        local existing_pid
        existing_pid=$(pgrep -f "realsense2_camera_node" | head -n 1)
        echo "$existing_pid" >"$CAMERA_PID_FILE"
        echo "   Detected an existing realsense2_camera_node (pid $existing_pid) — adopted into $CAMERA_PID_FILE"
        if realsense_in_recovery_mode; then
            echo "   WARN: camera node is running but RealSense is in RECOVERY mode — no images will publish." >&2
            realsense_print_recovery_help
        fi
        return 0
    fi

    if ! ros2 pkg prefix realsense2_camera &>/dev/null; then
        echo "   WARN: ros-${ROS_DISTRO}-realsense2-camera is not installed." >&2
        echo "         Install with: sudo apt-get install -y ros-${ROS_DISTRO}-realsense2-camera" >&2
        echo "         Continuing without camera — start your own camera node or re-run after installing the package."
        return 0
    fi

    if ! realsense_preflight; then
        echo "   Skipping camera launch — recover firmware first (see above)." >&2
        return 0
    fi

    : >"$CAMERA_LOG"
    nohup ros2 launch realsense2_camera rs_launch.py >"$CAMERA_LOG" 2>&1 &
    # $! is the `ros2 launch` parent; the actual camera node is a child that
    # comes up a moment later. Wait briefly so we can record the node's PID
    # (what holds the USB / projector) instead of the parent's.
    local launch_pid=$!
    local node_pid=""
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        node_pid=$(pgrep -f "realsense2_camera_node" | head -n 1 || true)
        [[ -n "$node_pid" ]] && break
        sleep 0.5
    done
    if [[ -n "$node_pid" ]]; then
        echo "$node_pid" >"$CAMERA_PID_FILE"
        if ! realsense_verify_started "$node_pid"; then
            return 0
        fi
        echo "   Started (node pid $node_pid, launch pid $launch_pid)"
    else
        # Fallback: launch parent. `agenticros down` also pkills by name, so
        # this still gets cleaned up even if we miss the node PID.
        echo "$launch_pid" >"$CAMERA_PID_FILE"
        echo "   Started (launch pid $launch_pid — node not yet visible; check $CAMERA_LOG if tools see no image)"
    fi
}

start_motor_controller() {
    if [[ "${AGENTICROS_NO_MOTORS:-}" == "1" ]]; then
        echo "==> Skipping motor controller (AGENTICROS_NO_MOTORS=1)"
        return 0
    fi

    echo "==> Motor controller"
    if ! command -v robotics >/dev/null 2>&1; then
        echo "   Skipping: 'robotics' CLI not installed."
        echo "   Using your own ROS motor controller is fine — AgenticROS publishes to /<namespace>/cmd_vel."
        return 0
    fi

    echo "   Running: robotics start motors"
    set +e
    robotics start motors
    local rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
        echo "   WARN: robotics start motors exited $rc — continuing." >&2
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
    echo "Stop the camera with: kill \$(cat $CAMERA_PID_FILE)   (or: agenticros down)"
fi
