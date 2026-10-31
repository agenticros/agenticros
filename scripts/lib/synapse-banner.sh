#!/usr/bin/env bash

synapse_banner() {
  if [[ "${SYNAPSE_NO_BANNER:-}" == "1" ]]; then
    return 0
  fi

  local reset=""
  local green=""
  local yellow=""
  local dim=""
  if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
    reset="$(tput sgr0 || true)"
    green="$(tput setaf 10 || true)"
    yellow="$(tput setaf 11 || true)"
    dim="$(tput dim || true)"
  fi

  printf '%s' "$green"
  cat <<'EOF'
  ____                                   
 / ___| _   _ _ __   __ _ _ __  ___  ___ 
 \___ \| | | | '_ \ / _` | '_ \/ __|/ _ \
  ___) | |_| | | | | (_| | |_) \__ \  __/
 |____/ \__, |_| |_|\__,_| .__/|___/\___|
        |___/            |_|             
EOF
  printf '%s\n' "$reset"
  printf '%s  Corebrum Synapse%s %s- agentic AI for ROS-powered robots%s\n' \
    "$yellow" "$reset" "$dim" "$reset"
}
