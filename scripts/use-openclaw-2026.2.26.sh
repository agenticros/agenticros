#!/usr/bin/env bash
# Install OpenClaw 2026.2.26 so plugin HTTP routes (config, teleop) and web chat load.
# Use this when 2026.3.2 rejects every plugin route with "missing or invalid auth" and
# neither auth.mode=none nor requireAuth: false fix it.
set -e
echo ""
echo "  Installing OpenClaw 2026.2.26 (plugin routes work on this version)..."
echo ""
npm install -g openclaw@2026.2.26
echo ""
echo "  Done. Next steps:"
echo "  1. Restart the gateway:  openclaw gateway"
echo "  2. Open in your browser:"
echo "       AgenticROS:  http://127.0.0.1:18789/plugins/agenticros/"
echo "  3. Web chat: run  node scripts/openclaw-dashboard-url.cjs  and open the URL it prints"
echo "     (2026.2.26 needs the token in the URL for the web chat to connect)"
echo ""
echo "  To go back to latest OpenClaw later:  npm install -g openclaw@latest"
echo ""
