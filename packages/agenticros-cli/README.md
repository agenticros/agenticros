# agenticros

> agentic AI for ROS-powered robots

`agenticros` is the unified command-line tool for AgenticROS — bring up a real
robot or a simulated one, drive it from Claude Code, OpenAI Codex, Hermes Agent, or OpenClaw,
and keep your workspace healthy from a single binary.

```bash
# Brand new machine: one command end-to-end
npx agenticros init     # workspace + plugin + MCP clients + API key + doctor
agenticros              # interactive menu
agenticros mcp setup    # register AgenticROS MCP for Codex, Hermes, and Claude
agenticros up real      # bring up the real-robot stack
agenticros up sim-amr   # bring up a simulated 2-wheel AMR
agenticros up sim-arm   # bring up a simulated 6-DOF arm
agenticros doctor       # health check
agenticros down         # stop everything we started
```

## Why this exists

Before `agenticros`, the demo path was a chain of shell scripts:
`start_demo.sh`, `setup_gateway_plugin.sh`, `configure_agenticros.sh`,
`onboard_robot.sh`, … Each one solved a real problem but the cumulative
surface area was a barrier for new users and a brittle handoff for demos.

The CLI is the single entry point. It **orchestrates** the existing scripts
rather than replacing them, so they remain usable on their own. The published
npm tarball bundles those scripts plus the ROS 2 source packages and the
pre-built MCP server, so `npx agenticros init` works on a fresh machine with
no `git clone` step.

## Install

Three ways, listed easiest first:

1. **`npx agenticros`** — one command on any machine with Node ≥ 20. Pulls
   the latest published tarball, no local checkout required.
2. **Per-user global** — `npm install -g agenticros` (or `pnpm add -g agenticros`).
   Then `agenticros` is on your PATH from any working directory.
3. **Repo checkout (contributors)** — `git clone … && pnpm install && pnpm build`,
   then run the root `./agenticros` shim. The CLI auto-detects the workspace
   and uses live scripts / sources instead of the bundled snapshots.

## Commands

| Command | Purpose |
|---|---|
| `agenticros` | Interactive top-level menu. |
| `agenticros init` | First-time setup wizard. Idempotent. |
| `agenticros up real` | Bring up the real-robot stack (RealSense + motors + MCP). |
| `agenticros up sim-amr` | Bring up the simulated 2-wheel AMR. |
| `agenticros up sim-arm` | Bring up the simulated 6-DOF arm (UR5e-shaped, per-joint position control). |
| `agenticros down` | Stop everything we started. |
| `agenticros doctor` | Coloured health-check table; `--json` for CI. |
| `agenticros mcp setup` | Register AgenticROS MCP for Codex, Hermes, and Claude (primary). |
| `agenticros mcp doctor` | Validate all MCP client configs. |
| `agenticros codex setup` | Codex only — `~/.codex/config.toml` (or `--project`). |
| `agenticros codex doctor` | Validate Codex MCP config paths and namespace policy. |
| `agenticros hermes setup` | Hermes only — `~/.hermes/config.yaml`. |
| `agenticros hermes doctor` | Validate Hermes MCP config paths and namespace policy. |
| `agenticros claude setup` | Claude only — Desktop + project `.mcp.json`. |
| `agenticros claude doctor` | Validate Claude MCP config paths and namespace policy. |
| `agenticros status` | Snapshot of running components + last mode. |
| `agenticros logs [target]` | Tail `camera` / `mcp` / `sim` / `rosbridge` / `gateway`. |
| `agenticros config [show\|set\|edit\|reset]` | Read or edit `~/.agenticros/config.json`. |
| `agenticros create-skill <slug>` | Scaffold a new skill package in cwd. |
| `agenticros publish` | Publish skill in cwd to skills.agenticros.com. |
| `agenticros skills dev` | Local skill dev harness (`npm run dev` in skill repos). |
| `agenticros skills install <owner/skill>` | Install from the marketplace (e.g. `chrismatthieu/followme`). |
| `agenticros --help` | Full help text. |

## How `init` works

`agenticros init` is the wizard the menu's "First-time setup" entry runs. It
walks through:

1. JS workspace deps (`pnpm install`)
2. JS workspace build (`pnpm build`)
3. ROS 2 workspace build (`colcon build --symlink-install`)
4. OpenClaw plugin install (`scripts/setup_gateway_plugin.sh`)
5. Robot config (namespace, transport mode, sample `~/.agenticros/config.json`)
6. OpenAI API key (paste once → `scripts/configure_agenticros.sh`)
7. Codex MCP config (optional — `~/.codex/config.toml` and project `.codex/config.toml`)
8. Hermes MCP config (optional — `~/.hermes/config.yaml`)
9. Final `agenticros doctor` summary

Every step is **idempotent**: it checks doctor first and skips the work if
nothing is missing. Use `agenticros init --force` to redo everything.

## Where state lives

- `~/.agenticros/config.json` — AgenticROS runtime config (transport mode,
  robot namespace, safety limits, teleop defaults). Edited via `agenticros config`.
- `~/.codex/config.toml` — OpenAI Codex CLI MCP servers (written by `agenticros codex setup`).
- `~/.hermes/config.yaml` — Hermes Agent MCP servers (written by `agenticros hermes setup`).
- `~/.agenticros/cli-state.json` — CLI's own state (last mode, last namespace,
  for the menu's "(yesterday)" hint).
- `~/agenticros/` — the install dir when invoked via `npx`. Contains a copy of
  `scripts/`, `ros2_ws/src/agenticros_*`, the pre-built MCP, and sample configs.
  Skipped in repo-checkout mode.
- `/tmp/agenticros-*.pid` and `/tmp/agenticros-*.log` — pidfiles and logs for
  the background processes the CLI spawns (camera, sim, MCP, …). Same convention
  as the legacy `scripts/start_demo.sh`.

## Contributing

See the monorepo `README.md` and `CLAUDE.md` at the repository root for the
architecture overview. The CLI source lives at
[`packages/agenticros-cli/`](.); per-command sources are under `src/commands/`,
shared helpers under `src/util/`, and runners (the subprocess glue around the
existing shell scripts) under `src/runners/`.
