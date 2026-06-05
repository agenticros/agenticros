#!/usr/bin/env bash
# configure_for_sim.sh
#
# One-shot helper: copy the simulation-tuned AgenticROS config template into
# ~/.agenticros/config.json. Use this when you want the MCP server + OpenClaw
# plugin to talk to the sim AMR's topics (which use no robot-namespace
# prefix - so a fresh "real robot" config with a UUID namespace would miss
# every topic).
#
# Usage:
#   ./scripts/configure_for_sim.sh            # writes ~/.agenticros/config.json
#   ./scripts/configure_for_sim.sh --backup   # back up an existing config first
#   ./scripts/configure_for_sim.sh --print    # print the template to stdout
#
# After running, restart the MCP server (or run `agenticros up sim-amr`).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/ros2_ws/src/agenticros_sim/config/agenticros-sim.config.json"
DEST_DIR="$HOME/.agenticros"
DEST="$DEST_DIR/config.json"

PRINT_ONLY=false
DO_BACKUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --print)   PRINT_ONLY=true; shift ;;
    --backup)  DO_BACKUP=true; shift ;;
    -h|--help) sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ ! -f "$SRC" ]]; then
  echo "Template missing: $SRC" >&2
  echo "Did you build the ros2 workspace? (cd $ROOT/ros2_ws && colcon build)" >&2
  exit 1
fi

if [[ "$PRINT_ONLY" == "true" ]]; then
  cat "$SRC"
  exit 0
fi

mkdir -p "$DEST_DIR"

if [[ -f "$DEST" ]]; then
  if [[ "$DO_BACKUP" == "true" ]]; then
    BAK="${DEST}.real.$(date +%Y%m%d-%H%M%S).bak"
    cp -a "$DEST" "$BAK"
    echo "[configure_for_sim] Backed up existing config -> $BAK"
  else
    echo "[configure_for_sim] $DEST already exists. Re-run with --backup to keep a copy." >&2
    echo "[configure_for_sim] Aborting (use --backup to overwrite)." >&2
    exit 1
  fi
fi

cp "$SRC" "$DEST"
echo "[configure_for_sim] Wrote $DEST"
echo "[configure_for_sim] Inspect with: agenticros config show"
echo "[configure_for_sim] Bring up sim with: agenticros up sim-amr"
