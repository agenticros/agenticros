#!/usr/bin/env bash
# Fix Control UI 404 when OpenClaw is installed globally (npm install -g openclaw).
# The gateway's path resolver often fails to find dist/control-ui; this symlink fixes it.
# See: https://getclawkit.com/docs/troubleshooting/control-ui-assets-not-found
set -e
OPENCLAW_ROOT=$(npm root -g)/openclaw
if [[ ! -d "$OPENCLAW_ROOT" ]]; then
  echo "OpenClaw not found at $OPENCLAW_ROOT. Install it first: npm install -g openclaw@2026.2.26"
  exit 1
fi
if [[ ! -d "$OPENCLAW_ROOT/dist/control-ui" ]]; then
  echo "No dist/control-ui at $OPENCLAW_ROOT — reinstall OpenClaw: npm install -g openclaw@2026.2.26"
  exit 1
fi
ln -sf "$OPENCLAW_ROOT/dist/control-ui" "$OPENCLAW_ROOT/control-ui"
echo ""
echo "  Symlink created: $OPENCLAW_ROOT/control-ui -> dist/control-ui"
echo "  Restart the gateway, then open the dashboard URL (with #token=...)."
echo "  If you need the URL: node scripts/openclaw-dashboard-url.cjs"
echo ""
