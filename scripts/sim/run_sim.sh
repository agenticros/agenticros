#!/usr/bin/env bash
# scripts/sim/run_sim.sh
#
# Worker script invoked by `agenticros up sim-amr` (and later `sim-arm`). Sources
# ROS 2 + the AgenticROS overlay, runs `ros2 launch agenticros_sim ...`, writes
# its PID into /tmp/agenticros-sim.pid so `agenticros down` can stop it, and
# tees output to /tmp/agenticros-sim.log so `agenticros logs sim` works.
#
# Usage:
#   run_sim.sh --robot amr [--namespace sim_robot] [--rviz] [--no-gui]
#
# Flags:
#   --robot amr|arm        Which sim launch to start (default: amr).
#   --namespace <ns>       Robot namespace; exported as AGENTICROS_ROBOT_NAMESPACE.
#   --rviz                 Bring up RViz alongside Gazebo.
#   --no-gui               Run gz-sim headless (CI / docker).
#   --ros-distro <distro>  Override ROS 2 distro (auto-detect by default).
#   --colcon-ws <path>     Override the colcon workspace (default: <repo>/ros2_ws).
#   --help                 Print this help and exit.
#
# Exit codes:
#   0   sim exited cleanly
#   1   missing dependency (gz, ros2, ros_gz_*, our launch file)
#   2   bad CLI usage
#   3   sim crashed at runtime — check /tmp/agenticros-sim.log

# Strict mode, but `set -u` clashes with ROS setup scripts that reference
# AMENT_TRACE_SETUP_FILES etc. We toggle nounset off around each `source`.
set -eo pipefail
shopt -s expand_aliases || true

# ---------- args ----------
ROBOT="amr"
NAMESPACE=""
USE_RVIZ="false"
GUI="true"
ROS_DISTRO_OVERRIDE=""
COLCON_WS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --robot)        ROBOT="$2"; shift 2 ;;
    --namespace)    NAMESPACE="$2"; shift 2 ;;
    --rviz)         USE_RVIZ="true"; shift ;;
    --no-gui)       GUI="false"; shift ;;
    --ros-distro)   ROS_DISTRO_OVERRIDE="$2"; shift 2 ;;
    --colcon-ws)    COLCON_WS="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,24p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ "$ROBOT" != "amr" && "$ROBOT" != "arm" ]]; then
  echo "--robot must be 'amr' or 'arm' (got '$ROBOT')" >&2
  exit 2
fi

# ---------- paths ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COLCON_WS="${COLCON_WS:-$REPO_ROOT/ros2_ws}"

LOG_FILE="/tmp/agenticros-sim.log"
PID_FILE="/tmp/agenticros-sim.pid"

log() { printf "\033[36m[run_sim]\033[0m %s\n" "$*"; }
err() { printf "\033[31m[run_sim]\033[0m %s\n" "$*" >&2; }

# ---------- ROS 2 distro detection ----------
if [[ -n "$ROS_DISTRO_OVERRIDE" ]]; then
  ROS_DISTRO="$ROS_DISTRO_OVERRIDE"
elif [[ -n "${ROS_DISTRO:-}" ]]; then
  : # already sourced
else
  for d in humble jazzy iron rolling; do
    if [[ -f "/opt/ros/$d/setup.bash" ]]; then ROS_DISTRO="$d"; break; fi
  done
fi
if [[ -z "${ROS_DISTRO:-}" ]] || [[ ! -f "/opt/ros/$ROS_DISTRO/setup.bash" ]]; then
  err "ROS 2 not found under /opt/ros/. Install Humble or Jazzy first."
  exit 1
fi

log "ROS_DISTRO=$ROS_DISTRO"
log "COLCON_WS=$COLCON_WS"
log "robot=$ROBOT  namespace=${NAMESPACE:-<none>}  rviz=$USE_RVIZ  gui=$GUI"

# shellcheck disable=SC1090
source "/opt/ros/$ROS_DISTRO/setup.bash"

# ---------- Build agenticros_sim if not yet built ----------
if [[ ! -f "$COLCON_WS/install/agenticros_sim/share/agenticros_sim/launch/sim_amr.launch.py" ]]; then
  log "agenticros_sim not built in $COLCON_WS — building now..."
  (cd "$COLCON_WS" && colcon build --symlink-install --packages-select agenticros_sim agenticros_msgs)
fi

# shellcheck disable=SC1090
source "$COLCON_WS/install/setup.bash"

# ---------- Dependency checks ----------
for bin in gz ros2 rviz2; do
  if ! command -v "$bin" >/dev/null; then
    if [[ "$bin" == "rviz2" ]] && [[ "$USE_RVIZ" != "true" ]]; then
      continue
    fi
    err "Required binary '$bin' not found on PATH."
    exit 1
  fi
done

# ---------- Wire up environment ----------
if [[ -n "$NAMESPACE" ]]; then
  export AGENTICROS_ROBOT_NAMESPACE="$NAMESPACE"
fi

LAUNCH_ARGS=(
  "use_rviz:=$USE_RVIZ"
  "gui:=$GUI"
)

# ---------- Pick launch file ----------
case "$ROBOT" in
  amr) LAUNCH_FILE="sim_amr.launch.py" ;;
  arm) LAUNCH_FILE="sim_arm.launch.py" ;;  # Phase 3
esac

if ! ros2 launch --help >/dev/null 2>&1; then
  err "ros2 launch not available — is ROS sourced properly?"
  exit 1
fi

log "Logging to $LOG_FILE"
log "ros2 launch agenticros_sim $LAUNCH_FILE ${LAUNCH_ARGS[*]}"
log "Press Ctrl+C to stop (or run \`agenticros down\` from another terminal)."

# Run in foreground so Ctrl+C in the parent shell still works, but also tee to
# the log so `agenticros logs sim -f` can follow concurrently. The PID we record
# is this script's own PID so `agenticros down` SIGTERMs the whole subtree.
echo "$$" > "$PID_FILE"

# Use `exec` so the ros2 process replaces our shell — that way signals from the
# CLI (or Ctrl+C) hit ros2 directly instead of bash.
exec 1> >(tee -a "$LOG_FILE") 2>&1
exec ros2 launch agenticros_sim "$LAUNCH_FILE" "${LAUNCH_ARGS[@]}"
