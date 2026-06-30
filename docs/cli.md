# `agenticros` CLI reference

`agenticros` is the single command-line entry point for the AgenticROS
project. It orchestrates the existing shell scripts (`scripts/start_demo.sh`,
`scripts/setup_gateway_plugin.sh`, …) and the simulation launchers, and adds
an interactive menu, a doctor, and a status/logs view on top.

## Install

| Audience | Command |
|---|---|
| One-off (no install) | `npx agenticros` |
| Per-user global      | `pnpm add -g agenticros` (or `npm install -g agenticros`) |
| Contributor (repo)   | `./agenticros` from the repo root, or `./scripts/install_cli.sh` |

The `npx` and `npm` flows ship a snapshot of the entire AgenticROS monorepo
inside the published tarball. The first `agenticros init` copies that
snapshot into `~/agenticros` (configurable via `$AGENTICROS_HOME` or
`--install-dir`), then runs `pnpm install`, `pnpm build`, and `colcon build`
there. After init, every subsequent `agenticros` invocation operates against
`~/agenticros` as the workspace root.

Contributors working from a clone get a third "workspace mode": the CLI auto-
detects the `agenticros-monorepo` package.json walking upward from its install
location and uses the live sources / dist directly.

## Commands

### `agenticros` (no args)

Opens the interactive top-level menu. The menu adapts to the doctor's output:
if any red checks are present, "First-time setup" is moved to the top.

### `agenticros up [target]`

Bring up a robot stack. Targets:

| Target    | What it does |
|-----------|-----|
| `real`    | Runs `scripts/start_demo.sh`: RealSense camera (unless `--no-camera`), MCP build, and motor controller only when the `robotics` CLI is installed (or unless `--no-motors`). |
| `sim-amr` | Launches the simulated 2-wheel AMR (Phase 2 - WIP). |
| `sim-arm` | Launches the simulated UR5e arm + MoveIt2 (Phase 3 - WIP). |

Flags:
- `--ros-distro humble|jazzy|…` override ROS distro detection
- `--namespace <ns>` override the robot namespace
- `--rviz` open RViz alongside the sim
- `--no-camera` skip starting the RealSense camera (real target)
- `--no-motors` skip starting the motor controller (real target)

### `agenticros down [--keep-camera] [--keep-gateway]`

SIGTERMs every process recorded in `/tmp/agenticros-*.pid` and stops the
`openclaw-gateway.service` user unit (unless `--keep-gateway`). Also cleans
up stray `gz sim`, `rviz2`, and `parameter_bridge` processes.

### `agenticros init [--force] [--install-dir <path>]`

Idempotent first-time setup wizard. Each step queries doctor first and is
skipped (with a checkmark) when already done:

1. JS workspace deps (`pnpm install`)
2. JS workspace build (`pnpm build`)
3. ROS 2 workspace build (`colcon build --symlink-install`)
4. OpenClaw plugin install (via `scripts/setup_gateway_plugin.sh`)
5. Robot config (writes `~/.agenticros/config.json`)
6. OpenAI API key (paste once → `scripts/configure_agenticros.sh`)
7. Final `agenticros doctor` summary

Pass `--force` to re-run every step regardless of state.

### `agenticros doctor [--json]`

Runs every health check and prints a coloured table. With `--json`, emits the
same report as a structured object for CI / scripting:

```json
{
  "checks": [{ "id": "ros-distro", "label": "...", "severity": "green" }, …],
  "summary": { "green": 10, "yellow": 1, "red": 0 }
}
```

Exits non-zero if any check is red.

### `agenticros status [--json]`

Shows running components (camera / sim / mcp / rosbridge / openclaw-gateway)
and the last-used mode/namespace from `~/.agenticros/cli-state.json`.

### `agenticros logs [target]`

Tails one of: `camera`, `mcp`, `sim`, `rosbridge`, `gateway`. Without a
target, prints the list of available log targets. Defaults to follow mode
(`-f`); pass `--no-follow` to disable.

### `agenticros config [action] [key=value]`

Read or edit `~/.agenticros/config.json`. Actions:

| Action | Example | Effect |
|---|---|---|
| `show`  | `agenticros config show` (or just `agenticros config`) | Pretty-print the file. |
| `set`   | `agenticros config set robot.namespace=sim_robot` | Write a single key (dot-paths supported). |
| `edit`  | `agenticros config edit` | Open in `$EDITOR`. |
| `reset` | `agenticros config reset` | Delete the file (with confirm). |

## Where state lives

| Path | Owner | Purpose |
|---|---|---|
| `~/.agenticros/config.json` | User | AgenticROS runtime config (transport mode, namespace, safety limits). |
| `~/.agenticros/cli-state.json` | CLI | Last-used mode/namespace for the menu's "(yesterday)" hint. |
| `~/agenticros/` | CLI (npm-install mode) | Copy of the monorepo, with built dist + colcon install. |
| `/tmp/agenticros-*.pid` | CLI | PIDs of background processes the CLI spawned. |
| `/tmp/agenticros-*.log` | CLI | Stdout/stderr from those processes. |
| `~/.openclaw/openclaw.json` | OpenClaw gateway | Plugin registration + per-plugin config (incl. AgenticROS). |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `AGENTICROS_HOME` | `~/agenticros` | Install root in npm-install mode. |
| `AGENTICROS_CONFIG_PATH` | (auto) | Override the path to `~/.agenticros/config.json`. |
| `AGENTICROS_ROBOT_NAMESPACE` | (from config) | Force a robot namespace at runtime. |
| `OPENAI_API_KEY` | (none) | If set, doctor reports green without requiring OpenClaw profile config. |
| `AGENTICROS_SKILLS_API` | `https://skills.agenticros.com/api` | Override marketplace API base URL. |
| `GH_TOKEN` / `GITHUB_TOKEN` | (none) | GitHub PAT for `agenticros publish`. |

### Skill authoring

| Command | Purpose |
|---|---|
| `agenticros create-skill <slug> [--template hello\|robot\|camera\|depth]` | Scaffold `./agenticros-skill-<slug>/` in cwd. |
| `agenticros skills dev [--invoke <tool>] [--live]` | Load the skill locally without OpenClaw. |
| `agenticros publish [--graduate]` | Validate, push to GitHub, submit to skills.agenticros.com. |
| `agenticros skills install <owner/skill>` | Install from marketplace (e.g. `agenticros/followme`). |
| `agenticros skills search <q>` | Search the marketplace. |

## Troubleshooting

- **`doctor` shows red checks** → run `agenticros init` to walk through every
  step. Re-run `doctor` afterward.
- **`up` exits immediately** → `agenticros logs <component>` (the CLI now
  records where every child wrote its output) and read the error in context.
- **`up sim-amr` warns "scripts/sim/run_sim.sh not found"** → simulation
  support is delivered in CLI Phase 2; until then the message tells you when
  to expect it.
- **`pnpm --filter agenticros build` builds two packages** → check the OpenClaw
  plugin's `packages/agenticros/package.json`; its npm name should be
  `@agenticros/openclaw`, not `agenticros`. If it's wrong, `pnpm --filter` will
  match both. (Fixed in this repo as of June 2026.)
