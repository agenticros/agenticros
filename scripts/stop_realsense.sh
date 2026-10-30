#!/bin/bash
# Standalone RealSense stop (used by `synapse stop realsense`).

set -e

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CAMERA_LOG=/tmp/synapse-camera.log
CAMERA_PID_FILE=/tmp/synapse-camera.pid

# shellcheck source=lib/realsense.sh
source "$REPO_ROOT/scripts/lib/realsense.sh"

stop_realsense_camera
