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
| `real`    | Runs `scripts/start_demo.sh`: RealSense camera (unless `--no-camera`), MCP build, and local motor controller via `@agenticros/robot` (unless `--no-motors`). |
| `sim-amr` | Launches the simulated 2-wheel AMR (`scripts/sim/run_sim.sh`). Add `--nav2` for map + AMCL + Nav2. |
| `sim-arm` | Launches the simulated UR5e-shaped arm (per-joint position control; MoveIt2 WIP). |

Flags:
- `--ros-distro humble|jazzy|…` override ROS distro detection
- `--namespace <ns>` override the robot namespace
- `--rviz` open RViz alongside the sim
- `--headless` / `--no-headless` control gz GUI (auto-headless on Jetson / no `$DISPLAY`)
- `--nav2` sim-amr only: also launch Nav2 (`sim_amr_nav2.launch.py`)
- `--no-camera` skip starting the RealSense camera (real target)
- `--no-motors` skip starting the motor controller (real target)
- `--eyes` also start robot eyes on the local display (see [eyes.md](eyes.md))
- `--eyes-no-teleop` with `--eyes`: gaze only (no WASD publish)
- `--eyes-no-browser` with `--eyes`: serve UI without opening a kiosk browser
- `--eyes-no-sound` with `--eyes`: mute R2D2 idle/excited chirps

### `agenticros eyes [--no-browser] [--no-teleop] [--no-sound] [--port <n>] [--topic <path>]`

Start fullscreen robot eyes on a tablet / face display. Subscribes to the
configured `cmd_vel` topic for left/right gaze; optionally publishes WASD
keyboard teleop; plays R2D2-style chirps (mute with `--no-sound`). Runs over
local DDS on the robot — not the OpenClaw remote teleop page. Full details:
[eyes.md](eyes.md).

### `agenticros web [--no-open]`

Prints the AgenticROS config/teleop page URL served by the OpenClaw plugin's
web dashboard (`/plugins/agenticros/`) and opens it in a browser (best-effort,
cross-platform `xdg-open` / `open` / `start`; `--no-open` just prints the
URL(s)). Reads `gateway.port`/`gateway.bind` from `~/.openclaw/openclaw.json`
to also print a LAN-reachable URL when the gateway is bound to `lan`. If the
page 404s/401s with gateway auth enabled, see
[openclaw-releases-and-plugin-routes.md](openclaw-releases-and-plugin-routes.md).

### `agenticros down [--keep-camera] [--stop-gateway]`

SIGTERMs every process recorded in `/tmp/agenticros-*.pid` (including eyes)
and leaves the OpenClaw gateway running unless `--stop-gateway`. Also cleans
up stray `gz sim`, `rviz2`, `parameter_bridge`, and motor controller processes.
Cloud `comms.js` is left running — use `agenticros disconnect` to stop it.

### On-robot hardware (cloud + motors + cameras)

Default cloud host is **`cloud.agenticros.com`** (REST + WebSocket). Credentials
live in `configstore('agenticros')` (`ROBOT_ID`, `API_TOKEN`); legacy
`configstore('robotics')` values are migrated on first read.

| Command | Purpose |
|---------|---------|
| `agenticros login [--no-open]` | Device-code login (GitHub in browser); saves `API_TOKEN` like `set --token`. |
| `agenticros logout` | Clear `API_TOKEN` (keeps `ROBOT_ID`). |
| `agenticros whoami` | Show cloud account and whether this robot is registered. |
| `agenticros register` | Interactive wizard (required: name, camera, compute). Mints/reuses local UUID and `POST /robots` to ARC. |
| `agenticros remote list` | List robots on your ARC account with online/offline presence. |
| `agenticros remote <action> [--robot <id>] [--skill <id>]` | Run a preset CLI action on an online robot via `POST /robot/:id/cli`. Actions: `start_motors`, `stop_motors`, `start_realsense`, `stop_realsense`, `start_camera`, `stop_camera`, `status`, `skills_list`, `skills_sync`, `skills_remove` (requires `--skill`), `gateway_restart`. |
| `agenticros gateway restart [--json]` | Restart the local OpenClaw gateway (`systemctl --user` then `openclaw gateway restart`). Also available remotely as `agenticros remote gateway_restart`. |
| `agenticros connect [-s host]` | Start cloud P2P/ROS bridge (`comms.js`). Default `wss://cloud.agenticros.com`. |
| `agenticros disconnect` | Stop `comms.js`. |
| `agenticros id` | Print (or create) robot ID. |
| `agenticros set --token=… [--id=…]` | Manual credential save (prefer `login`). Run `agenticros init` first so connect/motors deps are installed. |
| `agenticros start motors [-b rpi\|firmata\|jetson] [-p pins] [-e enc] [-d device]` | Start motor controller. Jetson GPIO is **opt-in** (`-b jetson` only). |
| `agenticros stop motors` | Stop all motor backends. |
| `agenticros start realsense [-p\|--pointcloud]` | Start RealSense (recovery preflight + pidfile). |
| `agenticros stop realsense` | Stop RealSense node. |
| `agenticros start camera [-d /dev/videoN] [-r WxH] [-f fps]` | Start 2D V4L camera → `/camera2d`. |
| `agenticros stop camera` | Stop 2D camera. |

Aliases: `agenticros motors start`, `agenticros camera stop`, etc.

The interactive menu includes **AgenticROS Cloud** (login / register / whoami)
and a **Robot hardware** submenu for connect/motors/camera.

### `agenticros init [--force] [--install-dir <path>]`

Idempotent first-time setup wizard. Each step queries doctor first and is
skipped (with a checkmark) when already done:

1. JS workspace deps (`pnpm install`)
2. JS workspace build (`pnpm build`)
3. ROS 2 workspace build (`colcon build --symlink-install`)
4. OpenClaw plugin install (via `scripts/setup_gateway_plugin.sh`)
5. Robot config (writes `~/.agenticros/config.json`)
6. AgenticROS Cloud login + register (optional — skip for local-only)
7. OpenAI API key (optional — skip when using local Ollama; see [local-vlm.md](local-vlm.md))
8. MCP client config (optional — `agenticros mcp setup` for Codex, Hermes, and Claude)
9. Final `agenticros doctor` summary

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

Checks include MCP server build status, OpenClaw plugin health, **MCP client configs**
(Codex, Hermes, Claude — path and namespace policy), and CLI presence on `PATH`.

### `agenticros mcp setup [--codex] [--hermes] [--claude] [--project] [--desktop]`

**Primary command** — register the AgenticROS MCP server for all MCP clients at once:

| Flag | Effect |
|---|---|
| (default) | Codex (`~/.codex/config.toml` + project `.codex/config.toml`), Hermes (`~/.hermes/config.yaml`), Claude Desktop + project `.mcp.json` |
| `--codex` | Codex global config only |
| `--hermes` | Hermes global config only |
| `--claude` | Claude Desktop + project `.mcp.json` |
| `--project` | Also write project-scoped Codex / Claude configs |
| `--desktop` | With `--claude`, Claude Desktop config only |

Uses an **absolute path** to the MCP server binary. Sets `AGENTICROS_ROBOT_NAMESPACE` empty so `agenticros mode real|sim` drives the active robot namespace.

Also offered as an optional step during `agenticros init`.

See **[docs/mcp-setup.md](mcp-setup.md)** for the unified onboarding guide.

### `agenticros mcp doctor [--json] [--codex] [--hermes] [--claude]`

Validate MCP configuration for Codex, Hermes, and Claude. Exits non-zero on red checks.

### `agenticros codex setup [--project]`

Register the AgenticROS MCP server for **OpenAI Codex CLI**:

| Flag | Effect |
|---|---|
| (default) | Writes `[mcp_servers.agenticros]` to `~/.codex/config.toml` |
| `--project` | Writes `.codex/config.toml` in the current repo root instead |

Uses an **absolute path** to the MCP server binary (`packages/agenticros-claude-code/dist/index.js` in workspace mode, or the bundled path after `npx agenticros init`). Sets `AGENTICROS_ROBOT_NAMESPACE = ""` so `agenticros mode real|sim` drives the active robot namespace.

Also offered as an optional step during `agenticros init`.

### `agenticros codex doctor [--json]`

Validate Codex MCP configuration: global and (when in a workspace) project `.codex/config.toml`, MCP binary path, and namespace policy. Exits non-zero on red checks. With `--json`, emits structured output for scripting.

See **[docs/codex-setup.md](codex-setup.md)** for the full Codex onboarding guide.

### `agenticros hermes setup`

Register the AgenticROS MCP server for **[Hermes Agent](https://github.com/NousResearch/hermes-agent)**:

Writes `mcp_servers.agenticros` to `~/.hermes/config.yaml` with an **absolute path** to the MCP server binary and `AGENTICROS_ROBOT_NAMESPACE: ""` so `agenticros mode real|sim` drives the active robot namespace.

Also offered as an optional step during `agenticros init`. After setup, run `/reload-mcp` in Hermes or `hermes mcp test agenticros`.

### `agenticros hermes doctor [--json]`

Validate Hermes MCP configuration: `~/.hermes/config.yaml`, MCP binary path, and namespace policy. Exits non-zero on red checks. With `--json`, emits structured output for scripting.

See **[docs/hermes-setup.md](hermes-setup.md)** for the full Hermes onboarding guide.

### `agenticros claude setup [--desktop] [--project]`

Register the AgenticROS MCP server for **Claude Code** and **Claude Desktop**:

| Flag | Effect |
|---|---|
| (default) | Claude Desktop config + project `.mcp.json` (when in a repo) |
| `--desktop` | `claude_desktop_config.json` only |
| `--project` | `.mcp.json` in repo root only |

Alias for `agenticros mcp setup --claude`. Restart Claude Desktop fully after desktop config changes.

### `agenticros claude doctor [--json]`

Validate Claude MCP configuration (desktop + project `.mcp.json`). Exits non-zero on red checks.

### `agenticros status [--json]`

Shows running components (camera / sim / mcp / rosbridge / eyes / openclaw-gateway)
and the last-used mode/namespace from `~/.agenticros/cli-state.json`.

### `agenticros logs [target]`

Tails one of: `camera`, `mcp`, `sim`, `rosbridge`, `eyes`, `gateway`. Without a
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
| `~/.config/configstore/agenticros.json` | CLI | Cloud `ROBOT_ID` + `API_TOKEN` (`login` / `set` / `id` / `register`). |
| `~/.agenticros/cli-state.json` | CLI | Last-used mode/namespace for the menu's "(yesterday)" hint. |
| `~/.hermes/config.yaml` | Hermes Agent | MCP server registrations (written by `agenticros mcp setup` or `agenticros hermes setup`). |
| `~/.codex/config.toml` | Codex CLI | MCP server registrations (written by `agenticros mcp setup` or `agenticros codex setup`). |
| `.codex/config.toml` | Codex CLI | Project-scoped MCP config (written by `agenticros mcp setup` or `agenticros codex setup --project`). |
| `.mcp.json` | Claude Code | Project-scoped MCP config (written by `agenticros mcp setup` or `agenticros claude setup`). |
| `~/Library/Application Support/Claude/claude_desktop_config.json` | Claude Desktop | MCP server registrations (written by `agenticros mcp setup` or `agenticros claude setup --desktop`). |
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
| `agenticros publish [--graduate]` | Validate, push to GitHub, submit to skills.agenticros.com; `npm publish` when name is `@agenticros/*`. |
| `agenticros skills list [--json]` | List registered / available / broken skills (JSON for remote/automation). |
| `agenticros skills remove <id> [--yes] [--no-restart]` | Unregister a skill; `--yes` skips prompts (required for remote). |
| `agenticros skills sync [--no-restart]` | Re-sync OpenClaw `contracts.tools` allowlist from registered skills. |
| `agenticros skills install <owner/skill\|@scope/pkg> [--yes] [--no-restart]` | Install from marketplace or npm; prefers npm when advertised; auto-restarts OpenClaw gateway unless `--no-restart`. |
| `agenticros skills search <q>` | Search the marketplace. |

## Troubleshooting

- **`doctor` shows red checks** → run `agenticros init` to walk through every
  step. Re-run `doctor` afterward. For MCP-specific issues, run
  `agenticros mcp doctor` (or `agenticros codex doctor`, `agenticros hermes doctor`, `agenticros claude doctor`).
- **MCP tools missing in any client** → run `agenticros mcp setup`. See [mcp-setup.md](mcp-setup.md).
- **Codex `/mcp` does not list agenticros** → run `agenticros mcp setup --codex`
  (absolute MCP path required). See [codex-setup.md](codex-setup.md).
- **Hermes MCP tools missing** → run `agenticros mcp setup --hermes`, then `/reload-mcp`
  in Hermes. See [hermes-setup.md](hermes-setup.md).
- **`up` exits immediately** → `agenticros logs <component>` (the CLI now
  records where every child wrote its output) and read the error in context.
- **`up sim-amr` warns "scripts/sim/run_sim.sh not found"** → simulation
  support is delivered in CLI Phase 2; until then the message tells you when
  to expect it.
- **`pnpm --filter agenticros build` builds two packages** → check the OpenClaw
  plugin's `packages/agenticros/package.json`; its npm name should be
  `@agenticros/openclaw`, not `agenticros`. If it's wrong, `pnpm --filter` will
  match both. (Fixed in this repo as of June 2026.)
