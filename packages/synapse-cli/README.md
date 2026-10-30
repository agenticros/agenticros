# synapse

This project was previously known as AgenticROS.


> agentic AI for ROS-powered robots

`synapse` is the unified command-line tool for Corebrum Synapse — bring up a real
robot or a simulated one, drive it from Claude Code, OpenAI Codex, Hermes Agent, Antigravity CLI, or OpenClaw
(with **local Ollama VLMs** or cloud models),
connect to [Corebrum Cloud](https://cloud.corebrum.com), and keep your workspace
healthy from a single binary.

```bash
# On the robot (recommended first-time path)
npm install -g @corebrum/synapse          # or: npx @corebrum/synapse …
synapse init                    # workspace + deps + optional cloud login/register
# Or separately:
synapse login                   # browser device-code + GitHub → saves API token
synapse register                # wizard (name, camera, compute) → claims ROBOT ID on ARC
synapse connect                 # P2P + ROS bridge → wss://cloud.corebrum.com
synapse start motors            # /cmd_vel → GPIO / Firmata
synapse start realsense         # or: synapse start camera
synapse                         # interactive menu
synapse up real                 # RealSense + motors + MCP demo stack
synapse up real --map           # also RTAB-Map + Nav2 (add --wheel-odom if /odom exists)
synapse skills install --bundle mapping
synapse doctor
synapse down
```

## Install

| Method | Command |
|--------|---------|
| One-off | `npx @corebrum/synapse …` |
| Global | `npm install -g @corebrum/synapse` (or `pnpm add -g synapse`) |
| Contributor | Clone the monorepo, `pnpm install && pnpm build`, run `./synapse` |

Requires **Node.js ≥ 20**. Real robot / sim also need **ROS 2** Humble or Jazzy.

## First-time robot setup (`init` + Cloud token)

### 1. `synapse init`

Idempotent wizard. Creates/refreshes `~/synapse` (when using npm/npx), installs
JS deps (including on-robot helpers for connect/motors/camera), builds the MCP
server, optionally configures OpenClaw / MCP clients, and writes
`~/.synapse/config.json`.

```bash
synapse init
# Refresh scripts/deps after a CLI upgrade or a Node.js major upgrade (22 → 26):
synapse init --force
```

**You need `init` (or a full monorepo `pnpm install`) before `synapse connect`
or `start motors`.** The published npm package ships sources; native deps are
installed into the workspace by init. Skipping init after switching Node
versions leaves addons compiled for the old ABI — motors then exit immediately.

### 2. Corebrum Cloud (`login` + `register`)

Preferred — stay in the CLI (also offered during `synapse init`):

```bash
synapse login                   # opens /device; approve with GitHub
synapse whoami                  # confirm account + token
synapse register                # required: name, camera, compute
                                   # auto-assigns one UUID to local + ARC
```

`login` uses an OAuth device-code flow: the CLI prints a short code, opens the
browser when possible, and saves your existing developer API token (it is
**not** rotated). `register` mints/reuses `ROBOT_ID` via `POST /new` and claims
it with `POST /robots` so the robot and the portal share the same UUID.

**Manual fallback** (copy token from the API page):

```bash
synapse set --token=<your-api-token-from-cloud>
synapse id
synapse set --id=<robot-uuid>   # optional pin
```

Token and ID are stored in `configstore('synapse')` (legacy `robotics`
store is migrated automatically) — the same store `connect` / motors read.

### 3. Connect and start hardware

```bash
synapse connect                 # default wss://cloud.corebrum.com
# synapse connect -s wss://robotics.dev   # legacy host (same app)
synapse start motors
synapse start realsense         # depth + RGB via realsense2_camera
# or: synapse start camera -d /dev/video0
```

Logs for connect: `/tmp/synapse-comms.log`. Status: `synapse status`.

---

## On-robot hardware commands

Default cloud host: **`cloud.corebrum.com`** (REST + WebSocket).

### Connect / disconnect

| Command | Description |
|---------|-------------|
| `synapse login [--no-open]` | Device-code GitHub login; saves API token. |
| `synapse logout` | Clear stored API token (keeps ROBOT ID). |
| `synapse whoami` | Show cloud account + registration status. |
| `synapse hive on` / `off` / `doctor` / `recipes` | Optional fleet hive (off by default). |
| `synapse register` | Wizard to register this robot on ARC (name, camera, compute). |
| `synapse remote list` | List ARC account robots + online/offline. |
| `synapse maps` | List, create, rename, use, and delete room maps (`--label`, `--start`, `--yes`, `--json`). |
| `synapse remote <action> [--robot <id>]` | Preset remote CLI via `POST /robot/:id/cli` (`start_motors`, `stop_motors`, `start_realsense`, `stop_realsense`, `start_camera`, `stop_camera`, `start_mapping`, `stop_mapping`, `navigate_to`, `list_maps`, `create_map`, `rename_map`, `use_map`, `delete_map`, `status`). |
| `synapse connect [-s host]` | Start cloud P2P + ROS bridge (`comms.js`). Default `wss://cloud.corebrum.com`. |
| `synapse disconnect` | Stop `comms.js`. |
| `synapse id` | Print (or create) robot UUID. |
| `synapse set --token=<t> [--id=<uuid>]` | Manual credential save (prefer `login`). |

### Motors

Subscribes to `/cmd_vel` (or the namespaced topic from the portal) and drives
differential-drive PWM. When ARC has wheel diameter and track width (mm), also
publishes `/odom` and `odom`→`base_link` TF (cmd_vel dead-reckon; Firmata
encoders if `-e` is passed).

**BOM, L298N pin maps, and encoder wiring:** [docs/hardware.md](../../docs/hardware.md).

| Command | Description |
|---------|-------------|
| `synapse start motors [options]` | Start motor controller (detached). |
| `synapse stop motors` | Stop all motor backends. |
| `synapse motors start` / `motors stop` | Same (alias word order). |

**Backend selection** (`-b`):

| Backend | When | Hardware |
|---------|------|----------|
| `rpi` | Default when portal `compute` is Raspberry Pi | Pi GPIO via `@iiot2k/gpiox` |
| `firmata` | Default for everything else (Radxa, LattePanda, Jetson+Arduino, NUC) | Arduino Firmata serial |
| `jetson` | **Opt-in only** — never auto-selected | Jetson BOARD pins via JETGPIO + `koffi` |

**Options:**

| Flag | Meaning | Examples |
|------|---------|----------|
| `-b, --backend` | `rpi` \| `firmata` \| `jetson` | `-b firmata` |
| `-p, --pins` | Pin list left-to-right | Pi default `27,22,17,18`; Firmata `3,4,5,7,8,9`; Jetson BOARD `16,18,22,26` |
| `-e, --encoderpins` | Firmata encoder pins (enables encoder odom) | e.g. `13,2,12,11` |
| `--odom` | Force-enable `/odom` (ARC geometry; defaults if unset) | |
| `--no-odom` | Disable `/odom` | |
| `--tpr <n>` | Encoder ticks per revolution | default `351` |
| `-d, --device` | Firmata serial device | `-d /dev/ttyACM0` |

```bash
# Raspberry Pi (GPIO)
synapse start motors -b rpi -p 27,22,17,18

# Arduino Firmata (Radxa / LattePanda / Jetson+Arduino / NUC)
sudo usermod -aG dialout $USER   # once, then reboot
synapse start motors -b firmata -d /dev/ttyACM0 -p 3,4,5,7,8,9 --odom
synapse start motors -b firmata -d /dev/ttyACM0 -e 13,2,12,11 --tpr 351

# Jetson native GPIO (manual; requires system JETGPIO)
synapse start motors -b jetson -p 16,18,22,26
```

`synapse up real` starts motors via the same local helper (skip with `--no-motors`).
`synapse down` stops motor processes (not cloud `comms.js` — use `disconnect`).

### RealSense (3D)

| Command | Description |
|---------|-------------|
| `synapse start realsense [-p\|--pointcloud]` | Launch `realsense2_camera` with **teleop profiles** (low res/FPS for WebRTC). |
| `synapse start realsense --full` | Stock `rs_launch.py` defaults (higher bandwidth). |
| `synapse start realsense --model=D421` | D421 depth-only teleop profile (also auto from cloud portal `camera`). |
| `synapse stop realsense` | Stop the camera node. |

Default teleop profile (same as robotics-npm): RGB+depth `424x240@6` (note: `320x180` is not valid on many D4xx RGB sensors and silently falls back to high-res).  
Requires `ros-<distro>-realsense2-camera`. Logs: `/tmp/synapse-camera.log`.

Restart after upgrading the CLI so an already-running high-res node is replaced:

```bash
synapse stop realsense
synapse start realsense
```

### 2D camera (V4L → `/camera2d`)

| Command | Description |
|---------|-------------|
| `synapse start camera [-d device] [-r WxH] [-f fps]` | Start `camera-2d-ros.js`. |
| `synapse stop camera` | Stop 2D camera. |

```bash
synapse start camera -d /dev/video0 -r 320x240 -f 15
# RealSense RGB as 2D often appears as /dev/video4
synapse start camera -d /dev/video4
```

---

## Commands (full list)

| Command | Purpose |
|---|---|
| `synapse` | Interactive top-level menu (includes **Robot hardware** submenu). |
| `synapse init` | First-time setup wizard. Idempotent. |
| `synapse login` / `logout` / `whoami` / `register` | Cloud auth + robot claim. |
| `synapse set --token` / `--id` | Manual cloud credentials (prefer `login`). |
| `synapse id` | Print robot UUID. |
| `synapse connect` / `disconnect` | Cloud P2P bridge. |
| `synapse start\|stop motors` | Local motor controller. |
| `synapse start\|stop realsense` | RealSense ROS node. |
| `synapse start\|stop camera` | 2D V4L → `/camera2d`. |
| `synapse up real` | RealSense + motors + MCP demo stack. |
| `synapse up real --map` | Real robot + RTAB-Map + Nav2. Add `--wheel-odom` to use `/odom` instead of visual odom. |
| `synapse up sim-amr` | Simulated 2-wheel AMR. |
| `synapse up sim-amr --nav2` | AMR + Nav2. |
| `synapse up sim-arm` | Simulated 6-DOF arm. |
| `synapse up sim-arm --moveit` | Arm + MoveIt2 move_group + trajectory bridge. |
| `synapse up … --eyes` | Also start robot eyes. |
| `synapse eyes` | Fullscreen eyes display (`cmd_vel` gaze; idle person-follow if YOLO is already installed). |
| `synapse down` | Stop sim/camera/mcp/eyes/motors. |
| `synapse doctor` | Health-check table. |
| `synapse status` | Running components (+ comms/motors/camera/realsense). |
| `synapse logs [target]` | Tail logs. |
| `synapse config` / `mode` | Edit `~/.synapse/config.json`. |
| `synapse mcp setup` | Codex + Hermes + Claude + Antigravity MCP. |
| `synapse agy setup` | Antigravity MCP config, skill, and headless MCP allow rule. |
| `synapse agy run "<prompt>"` | One `agy` prompt (`--yes` auto-approves every tool). |
| `synapse web` | Open cloud config/teleop dashboard URL. |
| `synapse skills …` | Skill marketplace / local skills. Robot skills only — see [docs/skills.md](https://github.com/Corebrum/corebrum-synapse/blob/main/docs/skills.md). |
| `synapse skills install --bundle mapping` | Install `@corebrum/start-slam`, `explore`, and `navigate-to`. |
| `synapse --help` | Full help. |

## Local VLM (Ollama)

```bash
ollama pull qwen3-vl:8b-instruct
npx @corebrum/synapse init                # skip OpenAI key when prompted
synapse up sim-amr
```

See [docs/local-vlm.md](https://github.com/Corebrum/corebrum-synapse/blob/main/docs/local-vlm.md).

## How `init` works

1. JS workspace deps (`pnpm install`) — includes `@corebrum/robot` for connect/motors
2. JS workspace build
3. ROS 2 workspace build (`colcon`)
4. OpenClaw plugin install
5. Robot config (`~/.synapse/config.json`)
6. Optional Corebrum Cloud login + register
7. Optional OpenAI key / MCP client setup
8. Final `synapse doctor`

Use `synapse init --force` to refresh after upgrading the CLI.

## Where state lives

- `~/.synapse/config.json` — transport, namespace, safety, teleop
- Configstore `synapse` — Cloud `ROBOT_ID` + `API_TOKEN` (`login` / `register` / `set` / `id`)
- `~/synapse/` — install tree after `npx`/`npm` init
- `/tmp/synapse-*.pid`, `/tmp/synapse-*.log`, `/tmp/synapse-comms.log`

## Links

- Cloud portal: [https://cloud.corebrum.com](https://cloud.corebrum.com)
- Docs: [https://github.com/Corebrum/corebrum-synapse](https://github.com/Corebrum/corebrum-synapse)
- Site: [https://corebrum.com/synapse](https://corebrum.com/synapse)

## Contributing

CLI source: [`packages/synapse-cli/`](.). On-robot helpers: [`packages/synapse-robot/`](../synapse-robot/).
