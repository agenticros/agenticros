#!/bin/bash
# setup_gateway_plugin.sh - One-time gateway-side setup for the AgenticROS plugin
#
# Run this on the machine where the OpenClaw gateway runs (typically the robot
# itself, since the default transport is now `local`).
#
# What this does:
#   1. Builds all workspace packages (core, ros-camera, agenticros plugin)
#   2. Produces a flat deployment of the plugin via `pnpm deploy --prod`
#      (required by OpenClaw 2026.6+: the install-time code safety scan
#      rejects any node_modules symlink that points outside the install root,
#      which pnpm's workspace-symlink layout always trips)
#   3. Registers the deployed plugin with OpenClaw via `openclaw plugins install -l`
#   4. (Optional) Sets robot namespace / rosbridge URL via flags
#   5. (Optional) Adjusts the systemd user service so the gateway picks it up
#
# After this completes, restart the gateway:
#   systemctl --user restart openclaw-gateway.service
#
# Usage: ./scripts/setup_gateway_plugin.sh [OPTIONS]
#   --repo PATH         Path to agenticros repo (default: parent of scripts/)
#   --deploy-dir PATH   Where to write the flat plugin deployment
#                       (default: ~/.agenticros/plugin-deploy)
#   --transport MODE    Transport mode: local | rosbridge | zenoh | webrtc
#                       (default: leave plugin defaults; "local" out of the box)
#   --rosbridge-url URL e.g. ws://localhost:9090 or ws://192.168.1.50:9090
#                       (only used when --transport rosbridge)
#   --zenoh-endpoint U  e.g. ws://localhost:10000  (only used when --transport zenoh)
#   --robot-namespace N ROS2 namespace for cmd_vel (e.g. robot3946b404c33e4aa39a8d16deb1c5c593)
#   --camera-topic T    Camera topic for ros2_camera_snapshot / teleop
#   --skip-build        Skip `pnpm build` (assume it's already done)
#   --no-systemd        Skip systemd service tweaks
#   --no-restart        Don't restart the gateway at the end
#   -h, --help          Show this help

set -e

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEPLOY_DIR="$HOME/.agenticros/plugin-deploy"
TRANSPORT=""
ROSBRIDGE_URL=""
ZENOH_ENDPOINT=""
ROBOT_NAMESPACE=""
CAMERA_TOPIC=""
SKIP_BUILD=false
NO_SYSTEMD=false
NO_RESTART=false

source "$REPO_ROOT/scripts/lib/agenticros-banner.sh" 2>/dev/null || true

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)             REPO_ROOT="$2"; shift 2 ;;
    --deploy-dir)       DEPLOY_DIR="$2"; shift 2 ;;
    --transport)        TRANSPORT="$2"; shift 2 ;;
    --rosbridge-url)    ROSBRIDGE_URL="$2"; shift 2 ;;
    --zenoh-endpoint)   ZENOH_ENDPOINT="$2"; shift 2 ;;
    --robot-namespace)  ROBOT_NAMESPACE="$2"; shift 2 ;;
    --camera-topic)     CAMERA_TOPIC="$2"; shift 2 ;;
    --skip-build)       SKIP_BUILD=true; shift ;;
    --no-systemd)       NO_SYSTEMD=true; shift ;;
    --no-restart)       NO_RESTART=true; shift ;;
    -h|--help)          sed -n '2,38p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

PLUGIN_SRC="$REPO_ROOT/packages/agenticros"

if command -v agenticros_banner &>/dev/null; then agenticros_banner; fi
echo "AgenticROS gateway plugin setup"
echo "  Repo:       $REPO_ROOT"
echo "  Plugin src: $PLUGIN_SRC"
echo "  Deploy to:  $DEPLOY_DIR"
[[ -n "$TRANSPORT" ]] && echo "  Transport:  $TRANSPORT"
echo ""

if [[ ! -f "$PLUGIN_SRC/package.json" ]]; then
  echo "Plugin directory not found or missing package.json: $PLUGIN_SRC"
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  echo "pnpm is required but not on PATH. Install pnpm (https://pnpm.io) and re-run."
  exit 1
fi

if ! command -v openclaw &>/dev/null; then
  echo "openclaw CLI is required but not on PATH. Install OpenClaw and re-run."
  exit 1
fi

# 1. Install + build workspace deps
if [[ "$SKIP_BUILD" != true ]]; then
  echo "[1/5] Installing workspace deps..."
  (cd "$REPO_ROOT" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install)
  echo ""
  echo "[2/5] Building required packages (core, ros-camera, agenticros)..."
  (cd "$REPO_ROOT" && \
    pnpm --filter @agenticros/core build && \
    pnpm --filter @agenticros/ros-camera build && \
    pnpm --filter ./packages/agenticros build)
else
  echo "[1-2/5] Skipping install + build (--skip-build)."
fi
echo ""

# 3. Flatten the plugin into a deploy directory.
# OpenClaw 2026.6+ rejects `node_modules/<dep>` symlinks that resolve outside
# the plugin install root. `pnpm deploy --prod` materialises every dep inside
# the deploy directory, so all symlinks are safely contained.
echo "[3/5] Building flat plugin deployment at $DEPLOY_DIR ..."
mkdir -p "$(dirname "$DEPLOY_DIR")"
rm -rf "$DEPLOY_DIR"
(cd "$REPO_ROOT" && pnpm --filter ./packages/agenticros deploy --prod "$DEPLOY_DIR")
# pnpm leaves one self-reference symlink (.pnpm/node_modules/agenticros → the
# source path) that the safety scan will reject. It's not needed at runtime.
rm -f "$DEPLOY_DIR/node_modules/.pnpm/node_modules/agenticros"

# `pnpm deploy --prod` skips lifecycle scripts, so rclnodejs's postinstall
# (which runs `node scripts/generate_messages.js` to materialise ROS message
# bindings under `generated/`) never runs. Without that folder, the local
# transport fails on first connect with ENOENT. Reuse the workspace copy when
# available (fast, no ROS env needed in this script); otherwise regenerate in
# place against the active ROS env.
RCLN_DEPLOY=$(find "$DEPLOY_DIR/node_modules/.pnpm" -maxdepth 3 -type d -name rclnodejs 2>/dev/null | head -1)
if [[ -n "$RCLN_DEPLOY" ]]; then
  RCLN_WS=$(find "$REPO_ROOT/node_modules/.pnpm" -maxdepth 3 -type d -name rclnodejs 2>/dev/null | head -1)
  if [[ -n "$RCLN_WS" && -d "$RCLN_WS/generated" ]]; then
    cp -a "$RCLN_WS/generated" "$RCLN_DEPLOY/"
    echo "  rclnodejs/generated copied from workspace ($(find "$RCLN_DEPLOY/generated" -type f | wc -l) files)."
  elif [[ -n "$ROS_DISTRO" ]] || [[ -f /opt/ros/humble/setup.bash ]]; then
    echo "  rclnodejs/generated missing from workspace — regenerating in place against ROS..."
    DISTRO="${ROS_DISTRO:-humble}"
    ( cd "$RCLN_DEPLOY" && bash -c "source /opt/ros/$DISTRO/setup.bash && node scripts/generate_messages.js" ) || \
      echo "  WARNING: rclnodejs message generation failed; the 'local' transport may not work."
  else
    echo "  WARNING: no rclnodejs/generated in workspace and no ROS distro found; the 'local' transport may not work."
  fi
fi
echo "  Deployment built."
echo ""

# 4. Register with OpenClaw. We background the install because the CLI also
#    boots the plugin lifecycle to validate it (which sits in a reconnect
#    loop forever if ROS isn't reachable). We wait for the "Linked plugin
#    path" log line, then kill the supervisor.
echo "[4/5] Registering plugin with OpenClaw..."
LOG="$(mktemp -t agenticros-install.XXXX.log)"
( openclaw plugins install -l "$DEPLOY_DIR" >"$LOG" 2>&1 ) &
INSTALL_PID=$!
for _ in $(seq 1 60); do
  if grep -q "Linked plugin path" "$LOG" 2>/dev/null; then break; fi
  if ! kill -0 "$INSTALL_PID" 2>/dev/null; then break; fi
  sleep 1
done
# If still running, the install succeeded and we just need to stop the watchdog.
if kill -0 "$INSTALL_PID" 2>/dev/null; then
  kill -TERM "$INSTALL_PID" 2>/dev/null || true
  sleep 1
  kill -KILL "$INSTALL_PID" 2>/dev/null || true
fi
if grep -q "installation blocked\|Plugin .* installation blocked" "$LOG"; then
  echo "Plugin install FAILED. Last log lines:"
  tail -20 "$LOG"
  rm -f "$LOG"
  exit 1
fi
echo "  Plugin registered (log: $LOG)."
echo ""

# 5. Optionally patch plugin config block in ~/.openclaw/openclaw.json.
OPENCLAW_JSON="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"
if [[ ! -f "$OPENCLAW_JSON" ]]; then
  echo "[5/5] No OpenClaw config at $OPENCLAW_JSON — skipping config patch."
elif [[ -n "$TRANSPORT$ROSBRIDGE_URL$ZENOH_ENDPOINT$ROBOT_NAMESPACE$CAMERA_TOPIC" ]]; then
  echo "[5/5] Patching plugin config in $OPENCLAW_JSON ..."
  cp "$OPENCLAW_JSON" "$OPENCLAW_JSON.bak.$(date +%s)"
  if command -v jq &>/dev/null; then
    TMP=$(mktemp)
    jq \
      --arg transport "$TRANSPORT" \
      --arg rb       "$ROSBRIDGE_URL" \
      --arg zenoh    "$ZENOH_ENDPOINT" \
      --arg ns       "$ROBOT_NAMESPACE" \
      --arg cam      "$CAMERA_TOPIC" \
      '
        .plugins = (.plugins // {}) |
        .plugins.entries = (.plugins.entries // {}) |
        .plugins.entries.agenticros = (.plugins.entries.agenticros // {}) |
        .plugins.entries.agenticros.enabled = true |
        .plugins.entries.agenticros.config = (.plugins.entries.agenticros.config // {}) |
        ( if $transport != "" then .plugins.entries.agenticros.config.transport = { mode: $transport } else . end ) |
        ( if $rb       != "" then .plugins.entries.agenticros.config.rosbridge = { url: $rb } else . end ) |
        ( if $zenoh    != "" then .plugins.entries.agenticros.config.zenoh     = { routerEndpoint: $zenoh } else . end ) |
        ( if $ns       != "" or $cam != "" then
            .plugins.entries.agenticros.config.robot = ( (.plugins.entries.agenticros.config.robot // {})
              + ( if $ns  != "" then { namespace: $ns } else {} end )
              + ( if $cam != "" then { cameraTopic: $cam } else {} end ) )
          else . end )
      ' "$OPENCLAW_JSON" > "$TMP" && mv "$TMP" "$OPENCLAW_JSON"
    echo "  Config patched (via jq)."
  elif command -v python3 &>/dev/null; then
    TRANSPORT="$TRANSPORT" \
    ROSBRIDGE_URL="$ROSBRIDGE_URL" \
    ZENOH_ENDPOINT="$ZENOH_ENDPOINT" \
    ROBOT_NAMESPACE="$ROBOT_NAMESPACE" \
    CAMERA_TOPIC="$CAMERA_TOPIC" \
    OPENCLAW_JSON="$OPENCLAW_JSON" \
    python3 - <<'PYEOF'
import json, os, pathlib
p = pathlib.Path(os.environ["OPENCLAW_JSON"])
d = json.loads(p.read_text())
ag = d.setdefault("plugins", {}).setdefault("entries", {}).setdefault("agenticros", {})
ag["enabled"] = True
cfg = ag.setdefault("config", {})
t  = os.environ.get("TRANSPORT") or ""
rb = os.environ.get("ROSBRIDGE_URL") or ""
zn = os.environ.get("ZENOH_ENDPOINT") or ""
ns = os.environ.get("ROBOT_NAMESPACE") or ""
cm = os.environ.get("CAMERA_TOPIC") or ""
if t:  cfg["transport"] = {"mode": t}
if rb: cfg.setdefault("rosbridge", {})["url"] = rb
if zn: cfg.setdefault("zenoh", {})["routerEndpoint"] = zn
if ns or cm:
    robot = cfg.setdefault("robot", {})
    if ns: robot["namespace"] = ns
    if cm: robot["cameraTopic"] = cm
p.write_text(json.dumps(d, indent=2) + "\n")
PYEOF
    echo "  Config patched (via python3 fallback; install jq for the canonical path)."
  else
    echo "  Neither jq nor python3 is available; set these manually under plugins.entries.agenticros.config:"
    [[ -n "$TRANSPORT" ]]       && echo "    transport.mode = \"$TRANSPORT\""
    [[ -n "$ROSBRIDGE_URL" ]]   && echo "    rosbridge.url = \"$ROSBRIDGE_URL\""
    [[ -n "$ZENOH_ENDPOINT" ]]  && echo "    zenoh.routerEndpoint = \"$ZENOH_ENDPOINT\""
    [[ -n "$ROBOT_NAMESPACE" ]] && echo "    robot.namespace = \"$ROBOT_NAMESPACE\""
    [[ -n "$CAMERA_TOPIC" ]]    && echo "    robot.cameraTopic = \"$CAMERA_TOPIC\""
  fi
else
  echo "[5/5] No --transport / --rosbridge-url / --zenoh-endpoint / --robot-namespace / --camera-topic given; leaving config defaults (transport.mode = \"local\")."
fi
echo ""

# Systemd user service tweaks (only needed when the gateway runs from systemd).
# The "local" transport uses rclnodejs, which picks a prebuilt binary based on
# ROS_DISTRO. When the gateway runs from systemd it has no ROS env, so
# rclnodejs falls back to a from-source rebuild that almost always fails. We
# capture the ROS env once and feed it to the gateway via EnvironmentFile=.
if [[ "$NO_SYSTEMD" != true ]]; then
  USER_SVC="$HOME/.config/systemd/user/openclaw-gateway.service"
  if [[ -f "$USER_SVC" ]]; then
    # 6a. Generate ROS env file for the gateway.
    ROS_SETUP=""
    if [[ -n "$ROS_DISTRO" && -f "/opt/ros/$ROS_DISTRO/setup.bash" ]]; then
      ROS_SETUP="/opt/ros/$ROS_DISTRO/setup.bash"
    else
      for d in /opt/ros/*/setup.bash; do
        [[ -f "$d" ]] && ROS_SETUP="$d" && break
      done
    fi
    if [[ -n "$ROS_SETUP" ]]; then
      ENV_FILE="$HOME/.agenticros/gateway-ros.env"
      mkdir -p "$(dirname "$ENV_FILE")"
      # Diff env before/after sourcing ROS so we only export ROS-relevant vars.
      # NB: also forward any colcon overlay if one is present in $HOME/<ros2_ws>/install.
      OVERLAY=""
      for cand in "$REPO_ROOT/ros2_ws/install/setup.bash" "$HOME/ros2_ws/install/setup.bash"; do
        [[ -f "$cand" ]] && OVERLAY="$cand" && break
      done
      # ROS setup.bash relies on a few vars being declared but not necessarily
      # set, so we deliberately disable `set -u` (cleared via SHELLOPTS too in
      # case the parent shell inherited it).
      env -i HOME="$HOME" PATH="$PATH" bash <<EOSH > "$ENV_FILE"
set +u
unset SHELLOPTS 2>/dev/null || true
# shellcheck disable=SC1090
source "$ROS_SETUP"
if [ -n "$OVERLAY" ]; then source "$OVERLAY"; fi
for v in ROS_DISTRO ROS_VERSION ROS_PYTHON_VERSION ROS_DOMAIN_ID \\
         AMENT_PREFIX_PATH CMAKE_PREFIX_PATH COLCON_PREFIX_PATH \\
         LD_LIBRARY_PATH PYTHONPATH PKG_CONFIG_PATH \\
         RMW_IMPLEMENTATION ROS_LOCALHOST_ONLY; do
  val="\${!v-}"
  if [ -n "\$val" ]; then echo "\$v=\$val"; fi
done
EOSH
      echo "  ROS env written to $ENV_FILE (sourced from $ROS_SETUP${OVERLAY:+ + $OVERLAY})."

      # 6b. Drop-in pointing the gateway at the env file.
      DROPIN_DIR="$HOME/.config/systemd/user/openclaw-gateway.service.d"
      DROPIN="$DROPIN_DIR/agenticros-ros.conf"
      mkdir -p "$DROPIN_DIR"
      cat > "$DROPIN" <<EOF
# Auto-generated by scripts/setup_gateway_plugin.sh. Re-run that script after
# changing ROS distro / overlay to refresh $ENV_FILE.
[Service]
EnvironmentFile=$ENV_FILE
EOF
      echo "  Systemd drop-in written to $DROPIN."
      systemctl --user daemon-reload
    else
      echo "  No ROS installation found under /opt/ros/<distro>. The 'local' transport will not work until ROS is on PATH for the gateway."
    fi

    if [[ "$NO_RESTART" != true ]]; then
      echo "Restarting openclaw-gateway.service ..."
      systemctl --user restart openclaw-gateway.service
      sleep 2
      systemctl --user is-active openclaw-gateway.service || true
    else
      echo "Skipping restart (--no-restart). To pick up the plugin: systemctl --user restart openclaw-gateway.service"
    fi
  else
    echo "No systemd user service at $USER_SVC. Restart the gateway however you started it to pick up the plugin."
    echo "Make sure ROS (e.g. /opt/ros/$ROS_DISTRO/setup.bash) is sourced in the gateway's environment so rclnodejs can find its prebuilt binary."
  fi
fi
echo ""

echo "Gateway plugin setup complete."
echo ""
echo "Verify with:  openclaw plugins list | grep -i agenticros"
echo "Logs:         tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log"
echo ""
echo "Next time the plugin source changes, re-run this script (with --skip-build"
echo "if you've already run pnpm build) to refresh the deployment in $DEPLOY_DIR."
echo ""
echo "See docs/robot-setup.md for details on transport modes and robot wiring."
