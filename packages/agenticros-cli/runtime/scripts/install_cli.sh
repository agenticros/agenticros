#!/usr/bin/env bash
# install_cli.sh - put the AgenticROS CLI on PATH for the current user.
#
# Three install strategies are tried, in order of preference:
#   1. `pnpm link --global` against the workspace package (best for contributors;
#      live edits to packages/agenticros-cli/src/ are visible immediately after
#      `pnpm --filter agenticros build`).
#   2. PATH symlink under ~/.local/bin pointing at the repo's ./agenticros shim
#      (works without a global pnpm prefix).
#   3. Print clear next-step instructions.
#
# Usage:
#   ./scripts/install_cli.sh           # auto-pick the best strategy
#   ./scripts/install_cli.sh --method symlink   # force one
#
# After install, run `agenticros --version` to confirm.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_DIR="$ROOT/packages/agenticros-cli"
ROOT_SHIM="$ROOT/agenticros"
METHOD="auto"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --method) METHOD="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

log() { printf "\033[36m[install-cli]\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m[install-cli]\033[0m %s\n" "$*"; }
warn(){ printf "\033[33m[install-cli]\033[0m %s\n" "$*"; }
err() { printf "\033[31m[install-cli]\033[0m %s\n" "$*" >&2; }

ensure_built() {
  if [[ ! -f "$CLI_DIR/dist/index.js" ]]; then
    log "Building the CLI (one-time)..."
    (cd "$ROOT" && pnpm --filter agenticros build)
  fi
}

try_pnpm_link() {
  command -v pnpm >/dev/null || return 1
  ensure_built
  log "Installing via pnpm link --global from $CLI_DIR"
  (cd "$CLI_DIR" && pnpm link --global) || return 1
  ok  "Linked. Run: agenticros --version"
  return 0
}

try_symlink() {
  local target="$HOME/.local/bin"
  mkdir -p "$target"
  ensure_built
  if ln -sf "$ROOT_SHIM" "$target/agenticros"; then
    ok "Symlinked $ROOT_SHIM -> $target/agenticros"
    case ":$PATH:" in
      *":$target:"*) ok "$target is already on PATH." ;;
      *) warn "Add $target to PATH (e.g. add 'export PATH=\"\$HOME/.local/bin:\$PATH\"' to your shell rc)." ;;
    esac
    return 0
  fi
  return 1
}

print_instructions() {
  cat <<EOF >&2
Failed to install the CLI automatically. Manual options:

  1. Add the repo's shim to PATH for this shell:
       export PATH="$ROOT:\$PATH"

  2. Use pnpm directly:
       cd "$ROOT" && pnpm --filter agenticros build && pnpm --filter agenticros link --global

  3. Use the bundled root shim ad-hoc:
       $ROOT_SHIM --help

After any of the above, run: agenticros --version
EOF
  return 1
}

case "$METHOD" in
  pnpm-link) try_pnpm_link || print_instructions ;;
  symlink)   try_symlink   || print_instructions ;;
  auto)      try_pnpm_link || try_symlink || print_instructions ;;
  *)         err "Unknown --method $METHOD"; exit 2 ;;
esac
