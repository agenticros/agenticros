#!/bin/bash
# install_diagnostic_updater.sh — Build diagnostic_updater from source into ros2_ws.
#
# Ubuntu's ros-<distro>-diagnostic-updater is often headers-only. RTAB-Map /
# Nav2 binaries still need libdiagnostic_updater.so at runtime
# (undefined symbol: diagnostic_updater::Updater::…).
#
# Usage: ./scripts/install_diagnostic_updater.sh [humble|jazzy]
# Default: humble

set -euo pipefail

ROS_DISTRO="${1:-humble}"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROS2_WS="$REPO_ROOT/ros2_ws"
SRC="$ROS2_WS/src"
DIAG_REPO="$SRC/diagnostics_repo"

if [[ ! -d "/opt/ros/$ROS_DISTRO" ]]; then
  echo "ROS distro not found: /opt/ros/$ROS_DISTRO" >&2
  exit 1
fi

echo "Installing diagnostic_updater from source for ROS 2 $ROS_DISTRO"
echo "Workspace: $ROS2_WS"
echo ""

# ROS setup.bash references unset vars; allow that briefly.
set +u
# shellcheck disable=SC1090
source "/opt/ros/$ROS_DISTRO/setup.bash"
set -u


if [[ ! -d "$DIAG_REPO/.git" ]]; then
  echo "Cloning ros/diagnostics (branch ros2)..."
  rm -rf "$DIAG_REPO"
  git clone -b ros2 --depth 1 https://github.com/ros/diagnostics.git "$DIAG_REPO"
else
  echo "Repo already at $DIAG_REPO, fetching..."
  (cd "$DIAG_REPO" && git fetch origin ros2 && git checkout ros2 && git pull --ff-only || true)
fi

# Symlink only diagnostic_updater into src (avoid building the whole stack).
pkg=diagnostic_updater
if [[ -d "$DIAG_REPO/$pkg" ]]; then
  if [[ -L "$SRC/$pkg" ]]; then
    rm -f "$SRC/$pkg"
  fi
  if [[ ! -e "$SRC/$pkg" ]]; then
    ln -sfn "diagnostics_repo/$pkg" "$SRC/$pkg"
    echo "Linked $SRC/$pkg -> diagnostics_repo/$pkg"
  fi
else
  echo "Missing $DIAG_REPO/$pkg" >&2
  exit 1
fi

echo ""
echo "Building diagnostic_updater..."
cd "$ROS2_WS"
colcon build --symlink-install --packages-select diagnostic_updater --cmake-args -DBUILD_TESTING=OFF

echo ""
echo "Done. Source the workspace so RTAB-Map/Nav2 find the shared library:"
echo "  source /opt/ros/$ROS_DISTRO/setup.bash"
echo "  source $ROS2_WS/install/setup.bash"
echo ""
echo "Verify:"
echo "  ls \$(ros2 pkg prefix diagnostic_updater)/lib/libdiagnostic_updater.so"
