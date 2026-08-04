#!/bin/bash
# Standalone RealSense stop (used by `agenticros stop realsense`).

set -e

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/agenticros-camera.log
CAMERA_PID_FILE=/tmp/agenticros-camera.pid

# shellcheck source=lib/realsense.sh
source "$REPO_ROOT/scripts/lib/realsense.sh"

stop_realsense_camera
