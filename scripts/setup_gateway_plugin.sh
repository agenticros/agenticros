#!/bin/bash
# setup_gateway_plugin.sh - One-time gateway-side setup for the AgenticROS plugin
#
# Run this on the machine where OpenClaw gateway runs (same as robot or another).
# Installs plugin deps, configures NODE_PATH for the gateway, allows the plugin,
# and optionally sets rosbridge URL and robot namespace.
#
# Usage: ./scripts/setup_gateway_plugin.sh [OPTIONS]
#   --repo PATH         Path to agenticros repo (default: parent of scripts/)
#   --rosbridge-url URL e.g. ws://localhost:9090 or ws://192.168.1.50:9090
#   --robot-namespace   ROS2 namespace for cmd_vel (e.g. robot3946b404c33e4aa39a8d16deb1c5c593)
#   --no-systemd        Skip systemd NODE_PATH override (e.g. if you don't use systemd)

set -e

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PLUGIN_DIR="$REPO_ROOT/packages/agenticros"
OPENCLAW_JSON="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"
ROSBRIDGE_URL=""
ROBOT_NAMESPACE=""
NO_SYSTEMD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)            REPO_ROOT="$2"; PLUGIN_DIR="$REPO_ROOT/packages/agenticros"; shift 2 ;;
    --rosbridge-url)   ROSBRIDGE_URL="$2"; shift 2 ;;
    --robot-namespace) ROBOT_NAMESPACE="$2"; shift 2 ;;
    --no-systemd)      NO_SYSTEMD=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=============================================="
echo "  AgenticROS gateway plugin setup"
echo "=============================================="
echo "  Plugin: $PLUGIN_DIR"
echo "  Config: $OPENCLAW_JSON"
echo ""

if [[ ! -f "$PLUGIN_DIR/package.json" ]]; then
  echo "Plugin directory not found or missing package.json: $PLUGIN_DIR"
  exit 1
fi

# 1. Install plugin dependencies (pnpm workspace: @agenticros/core, etc.)
echo "[1/4] Installing plugin dependencies (pnpm at repo root)..."
(cd "$REPO_ROOT" && pnpm install)
echo "Plugin dependencies OK."
echo ""

# 2. Install plugin into OpenClaw (so it appears in plugins list)
echo "[2/4] Registering plugin with OpenClaw..."
if command -v openclaw &>/dev/null; then
  openclaw plugins install -l "$PLUGIN_DIR" || true
  echo "Plugin registered."
else
  echo "openclaw CLI not in PATH; run manually later: openclaw plugins install -l $PLUGIN_DIR"
fi
echo ""

# 3. Systemd override so gateway process sees plugin node_modules
if [[ "$NO_SYSTEMD" != true ]]; then
  echo "[3/4] Configuring gateway process (NODE_PATH)..."
  USER_SVC="$HOME/.config/systemd/user/openclaw-gateway.service"
  OVERRIDE_D="$HOME/.config/systemd/user/openclaw-gateway.service.d"
  if [[ -f "$USER_SVC" ]]; then
    mkdir -p "$OVERRIDE_D"
    # Include repo root node_modules so workspace deps resolve when gateway loads the plugin
    PLUGIN_NM="$REPO_ROOT/node_modules"
    OVERRIDE_CONF="$OVERRIDE_D/override.conf"
    if ! grep -q "NODE_PATH" "$OVERRIDE_CONF" 2>/dev/null; then
      echo "[Service]" > "$OVERRIDE_CONF"
      echo "Environment=NODE_PATH=$PLUGIN_NM" >> "$OVERRIDE_CONF"
      echo "Added NODE_PATH to $OVERRIDE_CONF"
    else
      echo "NODE_PATH already set in override."
    fi
    echo "Reload systemd and restart gateway: systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service"
  else
    echo "No systemd user service found at $USER_SVC. If you start the gateway another way, set:"
    echo "  export NODE_PATH=$REPO_ROOT/node_modules"
  fi
else
  echo "[3/4] Skipping systemd (--no-systemd). Set NODE_PATH when starting the gateway:"
  echo "  NODE_PATH=$REPO_ROOT/node_modules openclaw gateway start"
fi
echo ""

# 4. Allow plugin and optional config in openclaw.json
echo "[4/4] OpenClaw config..."
if [[ -f "$OPENCLAW_JSON" ]]; then
  # Ensure plugins.allow includes agenticros (best-effort with sed/grep; optional jq if available)
  if ! grep -q '"allow".*agenticros\|"agenticros".*allow' "$OPENCLAW_JSON" 2>/dev/null; then
    # Try to add "allow": ["agenticros"] after "plugins": {
    if grep -q '"plugins"' "$OPENCLAW_JSON"; then
      echo "Add \"allow\": [\"agenticros\"] under plugins in $OPENCLAW_JSON if the plugin does not load."
    fi
  fi
  # Optional: write rosbridge URL and robot namespace into plugin config
  # (OpenClaw may expect plugins.entries.agenticros.config)
  if [[ -n "$ROSBRIDGE_URL" || -n "$ROBOT_NAMESPACE" ]]; then
    echo "To set rosbridge URL or robot namespace, edit $OPENCLAW_JSON:"
    [[ -n "$ROSBRIDGE_URL" ]]   && echo "  plugins.entries.agenticros.config.rosbridge.url = $ROSBRIDGE_URL"
    [[ -n "$ROBOT_NAMESPACE" ]] && echo "  plugins.entries.agenticros.config.robot.namespace = $ROBOT_NAMESPACE"
  fi
else
  echo "Config file not found: $OPENCLAW_JSON. Create it by running OpenClaw configure once."
fi
echo ""

echo "=============================================="
echo "  Gateway plugin setup complete"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Restart the OpenClaw gateway (e.g. systemctl --user restart openclaw-gateway.service)"
echo "  2. In the dashboard, enable the AgenticROS plugin if it is disabled"
echo "  3. Set rosbridge URL to your robot (e.g. ws://localhost:9090 or ws://<robot-ip>:9090)"
echo "  4. If your robot uses a namespaced cmd_vel, set robot.namespace in plugin config"
echo ""
echo "See docs/robot-setup.md for details."
echo ""
