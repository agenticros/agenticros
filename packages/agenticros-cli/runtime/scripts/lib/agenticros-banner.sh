#!/usr/bin/env bash

agenticros_banner() {
  if [[ "${AGENTICROS_NO_BANNER:-}" == "1" ]]; then
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

  cat <<EOF
${green}    _                     _   _       ____   ___  ____
   / \   __ _  ___ _ __ | |_(_) ___ |  _ \ / _ \/ ___|
  / _ \ / _\` |/ _ \ '_ \| __| |/ __|| |_) | | | \___ \\
 / ___ \ (_| |  __/ | | | |_| | (__ |  _ <| |_| |___) |
/_/   \_\__, |\___|_| |_|\__|_|\___||_| \_\\___/|____/
        |___/${reset}
${yellow}  AgenticROS${reset} ${dim}- agentic AI for ROS-powered robots${reset}
EOF
}
