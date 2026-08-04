# Shared RealSense launch helpers for start_demo.sh and agenticros start realsense.
#
# Callers must set (or accept defaults):
#   ROS_DISTRO, CAMERA_LOG, CAMERA_PID_FILE
# And should have sourced /opt/ros/$ROS_DISTRO/setup.bash before start_realsense_camera.

CAMERA_LOG="${CAMERA_LOG:-/tmp/agenticros-camera.log}"
CAMERA_PID_FILE="${CAMERA_PID_FILE:-/tmp/agenticros-camera.pid}"

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
    echo "     agenticros stop realsense   # or: agenticros down" >&2
    echo "     rs-fw-update -r" >&2
    echo "     rs-enumerate-devices -s    # should show D4xx + real serial" >&2
    echo "     agenticros start realsense" >&2
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

# Optional: AGENTICROS_REALSENSE_POINTCLOUD=1 or first arg "pointcloud" enables pointcloud.
start_realsense_camera() {
    local enable_pointcloud=0
    if [[ "${1:-}" == "pointcloud" ]] || [[ "${AGENTICROS_REALSENSE_POINTCLOUD:-}" == "1" ]]; then
        enable_pointcloud=1
    fi

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
        echo "   WARN: ros-${ROS_DISTRO:-jazzy}-realsense2-camera is not installed." >&2
        echo "         Install with: sudo apt-get install -y ros-${ROS_DISTRO:-jazzy}-realsense2-camera" >&2
        echo "         Continuing without camera — start your own camera node or re-run after installing the package."
        return 0
    fi

    if ! realsense_preflight; then
        echo "   Skipping camera launch — recover firmware first (see above)." >&2
        return 0
    fi

    local launch_args=(launch realsense2_camera rs_launch.py)
    if [[ "$enable_pointcloud" == "1" ]]; then
        launch_args+=("pointcloud.enable:=true")
    fi

    : >"$CAMERA_LOG"
    nohup ros2 "${launch_args[@]}" >"$CAMERA_LOG" 2>&1 &
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
        echo "$launch_pid" >"$CAMERA_PID_FILE"
        echo "   Started (launch pid $launch_pid — node not yet visible; check $CAMERA_LOG if tools see no image)"
    fi
}

stop_realsense_camera() {
    echo "==> Stopping RealSense camera"
    if [[ -f "$CAMERA_PID_FILE" ]]; then
        local pid
        pid=$(cat "$CAMERA_PID_FILE" 2>/dev/null || true)
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$CAMERA_PID_FILE"
    fi
    pkill -TERM -f "realsense2_camera_node" 2>/dev/null || true
    pkill -TERM -f "ros2 launch realsense2_camera" 2>/dev/null || true
    sleep 1
    pkill -KILL -f "realsense2_camera_node" 2>/dev/null || true
    pkill -KILL -f "ros2 launch realsense2_camera" 2>/dev/null || true
    echo "   RealSense stopped."
}
