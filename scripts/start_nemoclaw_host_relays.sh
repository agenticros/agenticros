#!/usr/bin/env bash
# Start TCP relays inside the NemoClaw OpenShell container so the sandbox
# netns (10.200.0.2) can reach host rosbridge + Ollama auth proxy without
# going through the OPA HTTP proxy (which fails peer-binary lookup when
# Docker is configured with "iptables": false on Jetson).
#
# Sandbox OpenClaw should use:
#   rosbridge.url = ws://10.200.0.1:9090
#   ollama-direct baseUrl = http://10.200.0.1:11435/v1
#
# Re-run after sandbox recreate (veth / 10.200.0.1 is rebuilt).
set -euo pipefail

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if command -v sg >/dev/null 2>&1 && sg docker -c 'docker info' >/dev/null 2>&1; then
    DOCKER=(sg docker -c)
  else
    echo "docker not usable (try: newgrp docker, or run with a user in the docker group)" >&2
    exit 1
  fi
fi
d() {
  if [[ ${#DOCKER[@]} -eq 1 ]]; then
    docker "$@"
  else
    # sg docker -c 'docker ...'
    local q
    q=$(printf '%q ' "$@")
    sg docker -c "docker ${q}"
  fi
}

CONTAINER=$(d ps --format '{{.Names}}' | grep -E 'openshell.*nemo' | head -1 || true)
if [[ -z "${CONTAINER}" ]]; then
  echo "No openshell*nemo* container running" >&2
  exit 1
fi

HOST_GW=$(d exec "${CONTAINER}" sh -c "ip -4 route show default | awk '{print \$3; exit}'")
HOST_GW=${HOST_GW:-172.18.0.1}
RELAY_SRC="${RELAY_SRC:-$(cd "$(dirname "$0")" && pwd)/sandbox_rosbridge_relay.py}"

d cp "${RELAY_SRC}" "${CONTAINER}:/tmp/sandbox_rosbridge_relay.py"
d exec -u root "${CONTAINER}" sh -c 'pkill -f sandbox_rosbridge_relay.py || true'
sleep 1
# Must use docker exec -d so relays outlive this script (bash & dies with the exec session).
d exec -u root -d "${CONTAINER}" python3 /tmp/sandbox_rosbridge_relay.py \
  --bind 10.200.0.1:9090 --target "${HOST_GW}:9090"
d exec -u root -d "${CONTAINER}" python3 /tmp/sandbox_rosbridge_relay.py \
  --bind 10.200.0.1:11435 --target "${HOST_GW}:11435"
sleep 1
d exec -u root "${CONTAINER}" sh -c 'ss -ltn | grep -E "10.200.0.1:(9090|11435)" || exit 1'
echo "Relays up on ${CONTAINER}: 10.200.0.1:9090 -> ${HOST_GW}:9090, 10.200.0.1:11435 -> ${HOST_GW}:11435"
