#!/usr/bin/env bash
# Privileged host bootstrap for Isaac ROS + NemoClaw on Jetson Thor.
# Usage: sudo bash scripts/bootstrap_isaac_nemoclaw_host.sh
set -euo pipefail
TARGET_USER="${SUDO_USER:-nvidia}"

echo "==> Adding $TARGET_USER to docker group"
usermod -aG docker "$TARGET_USER"

echo "==> Ensuring /etc/docker/daemon.json has nvidia runtime + iptables:false"
python3 - <<'PY'
import json, pathlib
p = pathlib.Path('/etc/docker/daemon.json')
cfg = json.loads(p.read_text()) if p.exists() else {}
cfg.setdefault('runtimes', {}).setdefault('nvidia', {'path': 'nvidia-container-runtime', 'args': []})
cfg['iptables'] = False
p.write_text(json.dumps(cfg, indent=2) + '\n')
print(p.read_text())
PY

echo "==> Restarting docker"
systemctl restart docker
sleep 2

echo "==> Docker info (as root)"
docker info | grep -E 'Runtimes|Default Runtime|Server Version' || true

echo "==> Initializing Isaac ROS CLI in docker mode"
isaac-ros init docker --yes
isaac-ros status

echo "==> Done. Log out/in (or newgrp docker) so $TARGET_USER can use docker without sudo."
