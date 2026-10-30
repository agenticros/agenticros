# `synapse` CLI reference

`synapse` is the single command-line entry point for the Corebrum Synapse
project. It orchestrates the existing shell scripts (`scripts/start_demo.sh`,
`scripts/setup_gateway_plugin.sh`, …) and the simulation launchers, and adds
an interactive menu, a doctor, and a status/logs view on top.

## Install

| Audience | Command |
|---|---|
| One-off (no install) | `npx @corebrum/synapse` |
| Per-user global      | `pnpm add -g synapse` (or `npm install -g @corebrum/synapse`) |
| Contributor (repo)   | `./synapse` from the repo root, or `./scripts/install_cli.sh` |

The `npx` and `npm` flows ship a snapshot of the entire Corebrum Synapse monorepo
inside the published tarball. The first `synapse init` copies that
snapshot into `~/synapse` (configurable via `$SYNAPSE_HOME` or
`--install-dir`), then runs `pnpm install`, `pnpm build`, and `colcon build`
there. After init, every subsequent `synapse` invocation operates against
`~/synapse` as the workspace root.

Contributors working from a clone get a third "workspace mode": the CLI auto-
detects the `corebrum-synapse` package.json walking upward from its install
location and uses the live sources / dist directly.

## Commands

### `synapse` (no args)

Opens the interactive top-level menu. The menu adapts to the doctor's output:
if any red checks are present, "First-time setup" is moved to the top.

### `synapse up [target]`

Bring up a robot stack. Targets:

| Target    | What it does |
|-----------|-----|
| `real`    | Runs `scripts/start_demo.sh`: RealSense camera (unless `--no-camera`), MCP build, and local motor controller via `@corebrum/robot` (unless `--no-motors`). Add `--map` for RTAB-Map + Nav2. |
| `sim-amr` | Launches the simulated 2-wheel AMR (`scripts/sim/run_sim.sh`). Add `--nav2` for map + AMCL + Nav2. Add `--real-camera` for a live RealSense overlay on the sim body (implies `--rviz`). |
| `sim-arm` | Launches the simulated UR5e-shaped arm (per-joint `/arm/*/cmd_pos`). Add `--moveit` for MoveIt2 move_group + FollowJointTrajectory bridge. |

Flags:
- `--ros-distro humble|jazzy|…` override ROS distro detection
- `--namespace <ns>` override the robot namespace
- `--rviz` open RViz alongside the sim
- `--headless` / `--no-headless` control gz GUI (auto-headless on Jetson / no `$DISPLAY`)
- `--nav2` sim-amr only: also launch Nav2 (`sim_amr_nav2.launch.py`)
- `--real-camera` sim-amr only: USB RealSense as eyes, Gazebo AMR as the body in RViz (see [simulation.md](simulation.md#shadow-amr-real-realsense--simulated-body))
- `--moveit` sim-arm only: also launch MoveIt2 (`sim_arm_moveit.launch.py`)
- `--map` real only: also launch RTAB-Map + Nav2 (`scripts/start_mapping.sh`)
- `--wheel-odom` with `--map`: use wheel `/odom` instead of visual odometry
- `--no-camera` skip starting the RealSense camera (real target)
- `--no-motors` skip starting the motor controller (real target)
- `--eyes` also start robot eyes on the local display (see [eyes.md](eyes.md))
- `--eyes-no-teleop` with `--eyes`: gaze only (no WASD publish)
- `--eyes-no-browser` with `--eyes`: serve UI without opening a kiosk browser
- `--eyes-no-sound` with `--eyes`: mute R2D2 idle/excited chirps
- `--eyes-no-person-gaze` with `--eyes`: skip idle person-follow even if YOLO is already installed

### `synapse eyes [--no-browser] [--no-teleop] [--no-sound] [--no-person-gaze] [--port <n>] [--topic <path>]`

Start fullscreen robot eyes on a tablet / face display. Subscribes to the
configured `cmd_vel` topic for left/right gaze; when idle and YOLO is already
installed, follows a person in the RealSense color frame (never downloads YOLO);
optionally publishes WASD keyboard teleop; plays R2D2-style chirps (mute with
`--no-sound`). Runs over local DDS on the robot — not the OpenClaw remote teleop
page. Full details: [eyes.md](eyes.md).

### `synapse desktop [--foreground] [--test-pattern] [--port <n>] [--width <px>] [--height <px>] [--fps <n>]`

Share the Hyprland session with the Corebrum Cloud desktop page (screen,
mouse, and keyboard). Run it inside the Wayland session, alongside
`synapse connect`. The process listens on `127.0.0.1:8766` and does not
join the teleop data-channel peer. `--foreground` is for a systemd user unit.
Details and the session checks (`XDG_SESSION_TYPE`, PipeWire, the Hyprland
portal): [packages/synapse-desktop/README.md](../packages/synapse-desktop/README.md).

### `synapse web [--no-open]`

Prints the Corebrum Synapse config/teleop page URL served by the OpenClaw plugin's
web dashboard (`/plugins/synapse/`) and opens it in a browser (best-effort,
cross-platform `xdg-open` / `open` / `start`; `--no-open` just prints the
URL(s)). Reads `gateway.port`/`gateway.bind` from `~/.openclaw/openclaw.json`
to also print a LAN-reachable URL when the gateway is bound to `lan`. If the
page 404s/401s with gateway auth enabled, see
[openclaw-releases-and-plugin-routes.md](openclaw-releases-and-plugin-routes.md).

### `synapse down [--keep-camera] [--stop-gateway]`

SIGTERMs every process recorded in `/tmp/synapse-*.pid` (including eyes)
and leaves the OpenClaw gateway running unless `--stop-gateway`. Also cleans
up stray `gz sim`, `rviz2`, `parameter_bridge`, and motor controller processes.
Cloud `comms.js` is left running — use `synapse disconnect` to stop it.

### On-robot hardware (cloud + motors + cameras)

Default cloud host is **`cloud.corebrum.com`** (REST + WebSocket). Credentials
live in `configstore('synapse')` (`ROBOT_ID`, `API_TOKEN`); legacy
`configstore('robotics')` values are migrated on first read.

| Command | Purpose |
|---------|---------|
| `synapse login [--no-open]` | Device-code login (GitHub in browser); saves `API_TOKEN` like `set --token`. |
| `synapse logout` | Clear `API_TOKEN` (keeps `ROBOT_ID`). |
| `synapse whoami` | Show cloud account and whether this robot is registered. |
| `synapse register` | Interactive wizard (required: name, camera, compute). Mints/reuses local UUID and `POST /robots` to ARC. |
| `synapse remote list` | List robots on your ARC account with online/offline presence. |
| `synapse remote <action> [--robot <id>] [--skill <id>]` | Run a preset CLI action on an online robot via `POST /robot/:id/cli`. Actions: `start_motors`, `stop_motors`, `start_realsense`, `stop_realsense`, `start_camera`, `stop_camera`, `start_mapping`, `stop_mapping`, `navigate_to` (requires `--x` and `--y`, optional `--yaw`), `list_maps`, `create_map` (requires `--label`), `rename_map` / `use_map` / `delete_map` (require `--map`), `status`, `skills_list`, `skills_sync`, `skills_remove` (requires `--skill`), `gateway_restart`. |
| `synapse start mapping` / `synapse stop mapping` | Start or stop RTAB-Map + Nav2 (`scripts/start_mapping.sh`). The first start creates a room map named Room. Later starts resume that database. Skips a second RealSense launch when the camera node is already up. |
| `synapse maps list` | List room maps on this robot. `--json` prints `{ activeId, maps }`. |
| `synapse maps create --label <name> [--start]` | Add a room. `--start` launches a fresh database for it. |
| `synapse maps rename <id> --label <name>` | Rename a room. |
| `synapse maps use <id>` | Make that room active and relaunch it in localization mode. |
| `synapse maps delete <id> [--yes]` | Delete the database and places saved on that map. |
| `synapse navigate --x <m> --y <m> [--yaw <rad>]` | Send one Nav2 `navigate_to_pose` goal in the `map` frame. |
| `synapse gateway restart [--json]` | Restart the local OpenClaw gateway (`systemctl --user` then `openclaw gateway restart`). Also available remotely as `synapse remote gateway_restart`. |
| `synapse connect [-s host]` | Start cloud P2P/ROS bridge (`comms.js`). Default `wss://cloud.corebrum.com`. |
| `synapse disconnect` | Stop `comms.js`. |
| `synapse id` | Print (or create) robot ID. |
| `synapse set --token=… [--id=…]` | Manual credential save (prefer `login`). Run `synapse init` first so connect/motors deps are installed. |
| `synapse start motors [-b rpi\|firmata\|jetson] [-p pins] [-e enc] [-d device] [--odom] [--no-odom] [--tpr n]` | Start motor controller. Publishes `/odom` when ARC has wheel geometry (or `--odom`). `-e` enables Firmata encoder odom. Jetson GPIO is **opt-in** (`-b jetson` only). Hardware pin maps: [hardware.md](hardware.md). |
| `synapse stop motors` | Stop all motor backends. |
| `synapse start realsense [-p\|--pointcloud]` | Start RealSense (recovery preflight + pidfile). |
| `synapse stop realsense` | Stop RealSense node. |
| `synapse start camera [-d /dev/videoN] [-r WxH] [-f fps]` | Start 2D V4L camera → `/camera2d`. |
| `synapse stop camera` | Stop 2D camera. |

Aliases: `synapse motors start`, `synapse camera stop`, etc.

The interactive menu includes **Corebrum Cloud** (login / register / whoami)
and a **Robot hardware** submenu for connect, motors, cameras, **Start mapping** /
**Stop mapping**, and room maps (list, create, switch, rename, delete).

### `synapse init [--force] [--install-dir <path>]`

Idempotent first-time setup wizard. Each step queries doctor first and is
skipped (with a checkmark) when already done:

1. JS workspace deps (`pnpm install`)
2. JS workspace build (`pnpm build`)
3. ROS 2 workspace build (`colcon build --symlink-install`)
4. OpenClaw plugin install (via `scripts/setup_gateway_plugin.sh`)
5. Robot config (writes `~/.synapse/config.json`)
6. Corebrum Cloud login + register (optional — skip for local-only)
7. OpenAI API key (optional — skip when using local Ollama; see [local-vlm.md](local-vlm.md))
8. MCP client config (optional — `synapse mcp setup` for Codex, Hermes, and Claude)
9. Final `synapse doctor` summary

Pass `--force` to re-run every step regardless of state.

### `synapse doctor [--json] [--live]`

Runs every health check and prints a coloured table. With `--json`, emits the
same report as a structured object for CI / scripting:

```json
{
  "checks": [{ "id": "ros-distro", "label": "...", "severity": "green" }, …],
  "summary": { "green": 10, "yellow": 1, "red": 0 }
}
```

Exits non-zero if any check is red.

`--live` connects over the configured transport and verifies each hardware-profile
binding against the ROS graph (declared `cmd_vel` / camera / actions must exist).
Without `--live`, profile checks are static (schema + required bindings only).

Checks include MCP server build status, OpenClaw plugin health, **MCP client configs**
(Codex, Hermes, Claude, Antigravity — path and namespace policy), and CLI presence on `PATH`.

### `synapse mcp setup [--codex] [--hermes] [--claude] [--agy] [--project] [--desktop]`

**Primary command** — register the Corebrum Synapse MCP server for all MCP clients at once:

| Flag | Effect |
|---|---|
| (default) | Codex (`~/.codex/config.toml` + project `.codex/config.toml`), Hermes (`~/.hermes/config.yaml`), Claude Desktop + project `.mcp.json`, Antigravity (`~/.gemini/config/mcp_config.json` + project `.agents/mcp_config.json`) |
| `--codex` | Codex global config only |
| `--hermes` | Hermes global config only |
| `--claude` | Claude Desktop + project `.mcp.json` |
| `--agy` | Antigravity global config only |
| `--project` | Also write project-scoped Codex / Claude / Antigravity configs |
| `--desktop` | With `--claude`, Claude Desktop config only |

Uses an **absolute path** to the MCP server binary. Sets `SYNAPSE_ROBOT_NAMESPACE` empty so `synapse mode real|sim` drives the active robot namespace.

Also offered as an optional step during `synapse init`.

See **[docs/mcp-setup.md](mcp-setup.md)** for the unified onboarding guide.

### `synapse mcp doctor [--json] [--codex] [--hermes] [--claude] [--agy]`

Validate MCP configuration for Codex, Hermes, Claude, and Antigravity. Exits non-zero on red checks.

### `synapse codex setup [--project]`

Register the Corebrum Synapse MCP server for **OpenAI Codex CLI**:

| Flag | Effect |
|---|---|
| (default) | Writes `[mcp_servers.synapse]` to `~/.codex/config.toml` |
| `--project` | Writes `.codex/config.toml` in the current repo root instead |

Uses an **absolute path** to the MCP server binary (`packages/synapse-claude-code/dist/index.js` in workspace mode, or the bundled path after `npx @corebrum/synapse init`). Sets `SYNAPSE_ROBOT_NAMESPACE = ""` so `synapse mode real|sim` drives the active robot namespace.

Also offered as an optional step during `synapse init`.

### `synapse codex doctor [--json]`

Validate Codex MCP configuration: global and (when in a workspace) project `.codex/config.toml`, MCP binary path, and namespace policy. Exits non-zero on red checks. With `--json`, emits structured output for scripting.

See **[docs/codex-setup.md](codex-setup.md)** for the full Codex onboarding guide.

### `synapse hermes setup`

Register the Corebrum Synapse MCP server for **[Hermes Agent](https://github.com/NousResearch/hermes-agent)**:

Writes `mcp_servers.synapse` to `~/.hermes/config.yaml` with an **absolute path** to the MCP server binary and `SYNAPSE_ROBOT_NAMESPACE: ""` so `synapse mode real|sim` drives the active robot namespace.

Also offered as an optional step during `synapse init`. After setup, run `/reload-mcp` in Hermes or `hermes mcp test synapse`.

### `synapse hermes doctor [--json]`

Validate Hermes MCP configuration: `~/.hermes/config.yaml`, MCP binary path, and namespace policy. Exits non-zero on red checks. With `--json`, emits structured output for scripting.

See **[docs/hermes-setup.md](hermes-setup.md)** for the full Hermes onboarding guide.

### `synapse agy setup`

Register the Corebrum Synapse MCP server for **[Google Antigravity CLI](https://antigravity.google/docs/cli/)** (`agy`):

Writes `mcpServers.synapse` to `~/.gemini/config/mcp_config.json` and, when run inside a repo, `.agents/mcp_config.json`. Also installs a short Corebrum Synapse skill at `~/.gemini/antigravity-cli/skills/synapse/SKILL.md` (and `.agents/skills/synapse/SKILL.md` in a repo), and adds `mcp(synapse/*)` to `permissions.allow` in `~/.gemini/antigravity-cli/settings.json` so headless `agy` can call the robot tools. Uses an **absolute path** to the MCP server binary and `SYNAPSE_ROBOT_NAMESPACE: ""` so `synapse mode real|sim` drives the active robot namespace.

This uses your Antigravity subscription. It does not need `GEMINI_API_KEY`. Sign in once with interactive `agy` before headless runs.

### `synapse agy doctor [--json]`

Validate Antigravity MCP configuration and the Corebrum Synapse skill. Exits non-zero on red checks (wrong binary path or a hardcoded namespace). With `--json`, emits structured output for scripting.

### `synapse agy run <prompt...> [--yes] [--model <model>]`

Run one prompt through `agy -p` and exit. Stdio is inherited so the session stays attached to your terminal. After `synapse agy setup`, Corebrum Synapse MCP tools are allowed in headless mode. `--yes` passes `--dangerously-skip-permissions`, which auto-approves every tool call, including shell commands. Omit it to leave non-MCP tools on Ask.

See **[docs/agy-setup.md](agy-setup.md)** for the full Antigravity onboarding guide.

### `synapse claude setup [--desktop] [--project]`

Register the Corebrum Synapse MCP server for **Claude Code** and **Claude Desktop**:

| Flag | Effect |
|---|---|
| (default) | Claude Desktop config + project `.mcp.json` (when in a repo) |
| `--desktop` | `claude_desktop_config.json` only |
| `--project` | `.mcp.json` in repo root only |

Alias for `synapse mcp setup --claude`. Restart Claude Desktop fully after desktop config changes.

### `synapse claude doctor [--json]`

Validate Claude MCP configuration (desktop + project `.mcp.json`). Exits non-zero on red checks.

### `synapse status [--json]`

Shows running components (camera / sim / mcp / rosbridge / eyes / openclaw-gateway)
and the last-used mode/namespace from `~/.synapse/cli-state.json`.

### `synapse logs [target]`

Tails one of: `camera`, `mcp`, `sim`, `rosbridge`, `eyes`, `gateway`. Without a
target, prints the list of available log targets. Defaults to follow mode
(`-f`); pass `--no-follow` to disable.

### `synapse config [action] [key=value]`

Read or edit `~/.synapse/config.json`. Actions:

| Action | Example | Effect |
|---|---|---|
| `show`  | `synapse config show` (or just `synapse config`) | Pretty-print the file. |
| `set`   | `synapse config set robot.namespace=sim_robot` | Write a single key (dot-paths supported). |
| `edit`  | `synapse config edit` | Open in `$EDITOR`. |
| `reset` | `synapse config reset` | Delete the file (with confirm). |

### `synapse robots`

Fleet entries in `~/.synapse/config.json`. Profile flags gate advertised
verbs per body — see [robot-profile.md](robot-profile.md).

| Action | Example |
|---|---|
| `list` | `synapse robots list` |
| `add` | `synapse robots add warehouse-01 --features=base,camera --binding camera.rgb=/cam/compressed` |
| `profile show` | `synapse robots profile show warehouse-01` |
| `profile infer` | `synapse robots profile infer warehouse-01 --apply` |

### `synapse hive [on|off|doctor|recipes]`

Optional fleet hive (off by default). See [hive.md](hive.md).

| Action | Effect |
|---|---|
| `on` | Write `hive.enabled=true` and fill URL / robot id / org. Does not require YAML. |
| `off` | Turn hive off. Robot memory and driving are unchanged. |
| `doctor` | Plain-language reachability: running / not running / needs a hive plan. |
| `recipes` | Interactive list: detect, describe, health. |

## Where state lives

| Path | Owner | Purpose |
|---|---|---|
| `~/.synapse/config.json` | User | Corebrum Synapse runtime config (transport mode, namespace, safety limits). |
| `~/.config/configstore/synapse.json` | CLI | Cloud `ROBOT_ID` + `API_TOKEN` (`login` / `set` / `id` / `register`). |
| `~/.synapse/cli-state.json` | CLI | Last-used mode/namespace for the menu's "(yesterday)" hint. |
| `~/.hermes/config.yaml` | Hermes Agent | MCP server registrations (written by `synapse mcp setup` or `synapse hermes setup`). |
| `~/.gemini/config/mcp_config.json` | Antigravity CLI | MCP server registrations (written by `synapse mcp setup` or `synapse agy setup`). |
| `~/.gemini/antigravity-cli/skills/synapse/SKILL.md` | Antigravity CLI | When to use the Corebrum Synapse MCP tools. |
| `.agents/mcp_config.json` | Antigravity CLI | Project-scoped MCP config (written by `synapse agy setup` or `synapse mcp setup` inside a repo). |
| `.agents/skills/synapse/SKILL.md` | Antigravity CLI | Project-scoped Corebrum Synapse skill. |
| `~/.codex/config.toml` | Codex CLI | MCP server registrations (written by `synapse mcp setup` or `synapse codex setup`). |
| `.codex/config.toml` | Codex CLI | Project-scoped MCP config (written by `synapse mcp setup` or `synapse codex setup --project`). |
| `.mcp.json` | Claude Code | Project-scoped MCP config (written by `synapse mcp setup` or `synapse claude setup`). |
| `~/Library/Application Support/Claude/claude_desktop_config.json` | Claude Desktop | MCP server registrations (written by `synapse mcp setup` or `synapse claude setup --desktop`). |
| `~/synapse/` | CLI (npm-install mode) | Copy of the monorepo, with built dist + colcon install. |
| `/tmp/synapse-*.pid` | CLI | PIDs of background processes the CLI spawned. |
| `/tmp/synapse-*.log` | CLI | Stdout/stderr from those processes. |
| `~/.openclaw/openclaw.json` | OpenClaw gateway | Plugin registration + per-plugin config (incl. Corebrum Synapse). |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SYNAPSE_HOME` | `~/synapse` | Install root in npm-install mode. |
| `SYNAPSE_CONFIG_PATH` | (auto) | Override the path to `~/.synapse/config.json`. |
| `SYNAPSE_ROBOT_NAMESPACE` | (from config) | Force a robot namespace at runtime. |
| `OPENAI_API_KEY` | (none) | If set, doctor reports green without requiring OpenClaw profile config. |
| `SYNAPSE_SKILLS_API` | `https://skills.corebrum.com/api` | Override marketplace API base URL. |
| `GH_TOKEN` / `GITHUB_TOKEN` | (none) | GitHub PAT for `synapse publish`. |

### Skill authoring

| Command | Purpose |
|---|---|
| `synapse create-skill <slug> [--template hello\|robot\|camera\|depth]` | Scaffold `./corebrum-skill-<slug>/` in cwd. |
| `synapse skills dev [--invoke <tool>] [--live]` | Load the skill locally without OpenClaw. |
| `synapse publish [--graduate]` | Validate, push to GitHub, submit to skills.corebrum.com; `npm publish` when name is `@corebrum/*`. |
| `synapse skills list [--json]` | List registered / available / broken skills (JSON for remote/automation). |
| `synapse skills remove <id> [--yes] [--no-restart]` | Unregister a skill; `--yes` skips prompts (required for remote). |
| `synapse skills sync [--no-restart]` | Re-sync OpenClaw `contracts.tools` allowlist from registered skills. |
| `synapse skills install <owner/skill\|@scope/pkg> [--yes] [--no-restart]` | Install from marketplace or npm; prefers npm when advertised; auto-restarts OpenClaw gateway unless `--no-restart`. |
| `synapse skills install --bundle mapping` | Install `@corebrum/start-slam`, `explore`, and `navigate-to`. |
| `synapse skills search <q>` | Search the marketplace. |

Robot skills only. Third-party Agent Skills (`SKILL.md`) are not installed through these commands — see [Official catalogs](https://www.skills.sh/official), [Jetson Agent Skills](https://www.jetson-ai-lab.com/tutorials/jetson-agent-skills/), and the [Agent Skills spec](https://agentskills.io/home). Details in [skills.md](skills.md).

## Troubleshooting

- **`doctor` shows red checks** → run `synapse init` to walk through every
  step. Re-run `doctor` afterward. For MCP-specific issues, run
  `synapse mcp doctor` (or `synapse codex doctor`, `synapse hermes doctor`, `synapse claude doctor`, `synapse agy doctor`).
- **MCP tools missing in any client** → run `synapse mcp setup`. See [mcp-setup.md](mcp-setup.md).
- **Codex `/mcp` does not list synapse** → run `synapse mcp setup --codex`
  (absolute MCP path required). See [codex-setup.md](codex-setup.md).
- **Hermes MCP tools missing** → run `synapse mcp setup --hermes`, then `/reload-mcp`
  in Hermes. See [hermes-setup.md](hermes-setup.md).
- **Antigravity `/mcp` does not list synapse** → run `synapse agy setup`.
  Antigravity reads `~/.gemini/config/mcp_config.json` and `.agents/mcp_config.json`. See [agy-setup.md](agy-setup.md).
- **`up` exits immediately** → `synapse logs <component>` (the CLI now
  records where every child wrote its output) and read the error in context.
- **`up sim-amr` warns "scripts/sim/run_sim.sh not found"** → simulation
  support is delivered in CLI Phase 2; until then the message tells you when
  to expect it.
- **`pnpm --filter @corebrum/synapse build` builds two packages** → check the OpenClaw
  plugin's `packages/synapse-openclaw/package.json`; its npm name should be
  `@corebrum/openclaw`, not `synapse`. If it's wrong, `pnpm --filter` will
  match both. (Fixed in this repo as of June 2026.)
