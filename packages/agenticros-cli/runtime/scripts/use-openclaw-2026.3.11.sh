#!/usr/bin/env bash
# Install OpenClaw 2026.3.11 for testing (Gateway/Control UI and auth fixes).
# Use this branch (test-openclaw-2026.3.11) to try 2026.3.11; roll back by
# checking out main and running:  npm install -g openclaw@latest  (or use-openclaw-2026.2.26.sh)
set -e
echo ""
echo "  Installing OpenClaw 2026.3.11 (test branch)..."
echo ""
npm install -g openclaw@2026.3.11
echo ""
echo "  Done. Next steps:"
echo "  1. Restart the gateway:  openclaw gateway"
echo "  2. Open in your browser:"
echo "       AgenticROS:  http://127.0.0.1:18789/plugins/agenticros/"
echo "  3. Web chat: run  node scripts/openclaw-dashboard-url.cjs  and open the URL it prints"
echo ""
echo "  To roll back: checkout main and run  npm install -g openclaw@latest"
echo "  Or use  ./scripts/use-openclaw-2026.2.26.sh  to pin to 2026.2.26."
echo ""
