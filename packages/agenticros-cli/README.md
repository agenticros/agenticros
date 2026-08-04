# agenticros

> agentic AI for ROS-powered robots

`agenticros` is the unified command-line tool for AgenticROS — bring up a real
robot or a simulated one, drive it from Claude Code, OpenAI Codex, Hermes Agent, or OpenClaw
(with **local Ollama VLMs** or cloud models),
connect to [AgenticROS Cloud](https://cloud.agenticros.com), and keep your workspace
healthy from a single binary.

```bash
# On the robot (recommended first-time path)
npm install -g agenticros          # or: npx agenticros …
agenticros init                    # workspace + deps (required for connect/motors)
agenticros set --token=<API_TOKEN> # AgenticROS Cloud API key (see below)
agenticros id                      # print robot UUID; add it in the cloud portal
agenticros connect                 # P2P + ROS bridge → wss://cloud.agenticros.com
agenticros start motors            # /cmd_vel → GPIO / Firmata
agenticros start realsense         # or: agenticros start camera
agenticros                         # interactive menu
agenticros up real                 # RealSense + motors + MCP demo stack
agenticros doctor
agenticros down
```

## Install

| Method | Command |
|--------|---------|
| One-off | `npx agenticros …` |
| Global | `npm install -g agenticros` (or `pnpm add -g agenticros`) |
| Contributor | Clone the monorepo, `pnpm install && pnpm build`, run `./agenticros` |

Requires **Node.js ≥ 20**. Real robot / sim also need **ROS 2** Humble or Jazzy.

## First-time robot setup (`init` + Cloud token)

### 1. `agenticros init`

Idempotent wizard. Creates/refreshes `~/agenticros` (when using npm/npx), installs
JS deps (including on-robot helpers for connect/motors/camera), builds the MCP
server, optionally configures OpenClaw / MCP clients, and writes
`~/.agenticros/config.json`.

```bash
agenticros init
# Refresh scripts/deps after a CLI upgrade:
agenticros init --force
```

**You need `init` (or a full monorepo `pnpm install`) before `agenticros connect`
or `start motors`.** The published npm package ships sources; native deps are
installed into the workspace by init.

### 2. AgenticROS Cloud API token (`set --token`)

1. Sign in at **[https://cloud.agenticros.com](https://cloud.agenticros.com)**
2. Open **API** docs (or your account settings) and copy your **API token**
   (also called API key)
3. On the robot:

```bash
agenticros set --token=<your-api-token-from-cloud>
agenticros id                         # UUID for this robot
# Optional: pin a specific robot UUID from the portal
agenticros set --id=<robot-uuid>
```

Add that robot ID to your fleet in the cloud UI. Token and ID are stored in
`configstore('agenticros')` (legacy `robotics` store is migrated automatically).

### 3. Connect and start hardware

```bash
agenticros connect                 # default wss://cloud.agenticros.com
# agenticros connect -s wss://robotics.dev   # legacy host (same app)
agenticros start motors
agenticros start realsense         # depth + RGB via realsense2_camera
# or: agenticros start camera -d /dev/video0
```

Logs for connect: `/tmp/agenticros-comms.log`. Status: `agenticros status`.

---

## On-robot hardware commands

Default cloud host: **`cloud.agenticros.com`** (REST + WebSocket).

### Connect / disconnect

| Command | Description |
|---------|-------------|
| `agenticros connect [-s host]` | Start cloud P2P + ROS bridge (`comms.js`). Default `wss://cloud.agenticros.com`. |
| `agenticros disconnect` | Stop `comms.js`. |
| `agenticros id` | Print (or create) robot UUID. |
| `agenticros set --token=<t> [--id=<uuid>]` | Save Cloud API token and/or robot ID. |

### Motors

Subscribes to `/cmd_vel` (or the namespaced topic from the portal) and drives
differential-drive PWM.

| Command | Description |
|---------|-------------|
| `agenticros start motors [options]` | Start motor controller (detached). |
| `agenticros stop motors` | Stop all motor backends. |
| `agenticros motors start` / `motors stop` | Same (alias word order). |

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
| `-e, --encoderpins` | Firmata encoder pins | default `13,2,12,11` |
| `-d, --device` | Firmata serial device | `-d /dev/ttyACM0` |

```bash
# Raspberry Pi (GPIO)
agenticros start motors -b rpi -p 27,22,17,18

# Arduino Firmata (Radxa / LattePanda / Jetson+Arduino / NUC)
sudo usermod -aG dialout $USER   # once, then reboot
agenticros start motors -b firmata -d /dev/ttyACM0 -p 3,4,5,7,8,9

# Jetson native GPIO (manual; requires system JETGPIO)
agenticros start motors -b jetson -p 16,18,22,26
```

`agenticros up real` starts motors via the same local helper (skip with `--no-motors`).
`agenticros down` stops motor processes (not cloud `comms.js` — use `disconnect`).

### RealSense (3D)

| Command | Description |
|---------|-------------|
| `agenticros start realsense [-p\|--pointcloud]` | Launch `realsense2_camera` with **teleop profiles** (low res/FPS for WebRTC). |
| `agenticros start realsense --full` | Stock `rs_launch.py` defaults (higher bandwidth). |
| `agenticros start realsense --model=D421` | D421 depth-only teleop profile (also auto from cloud portal `camera`). |
| `agenticros stop realsense` | Stop the camera node. |

Default teleop profile (same as robotics-npm): RGB `320x180@6`, depth/infra `424x240@6`.  
Requires `ros-<distro>-realsense2-camera`. Logs: `/tmp/agenticros-camera.log`.

Restart after upgrading the CLI so an already-running high-res node is replaced:

```bash
agenticros stop realsense
agenticros start realsense
```

### 2D camera (V4L → `/camera2d`)

| Command | Description |
|---------|-------------|
| `agenticros start camera [-d device] [-r WxH] [-f fps]` | Start `camera-2d-ros.js`. |
| `agenticros stop camera` | Stop 2D camera. |

```bash
agenticros start camera -d /dev/video0 -r 320x240 -f 15
# RealSense RGB as 2D often appears as /dev/video4
agenticros start camera -d /dev/video4
```

---

## Commands (full list)

| Command | Purpose |
|---|---|
| `agenticros` | Interactive top-level menu (includes **Robot hardware** submenu). |
| `agenticros init` | First-time setup wizard. Idempotent. |
| `agenticros set --token` / `--id` | Cloud API token + robot ID. |
| `agenticros id` | Print robot UUID. |
| `agenticros connect` / `disconnect` | Cloud P2P bridge. |
| `agenticros start\|stop motors` | Local motor controller. |
| `agenticros start\|stop realsense` | RealSense ROS node. |
| `agenticros start\|stop camera` | 2D V4L → `/camera2d`. |
| `agenticros up real` | RealSense + motors + MCP demo stack. |
| `agenticros up sim-amr` | Simulated 2-wheel AMR. |
| `agenticros up sim-amr --nav2` | AMR + Nav2. |
| `agenticros up sim-arm` | Simulated 6-DOF arm. |
| `agenticros up … --eyes` | Also start robot eyes. |
| `agenticros eyes` | Fullscreen eyes display. |
| `agenticros down` | Stop sim/camera/mcp/eyes/motors. |
| `agenticros doctor` | Health-check table. |
| `agenticros status` | Running components (+ comms/motors/camera/realsense). |
| `agenticros logs [target]` | Tail logs. |
| `agenticros config` / `mode` | Edit `~/.agenticros/config.json`. |
| `agenticros mcp setup` | Codex + Hermes + Claude MCP. |
| `agenticros web` | Open cloud config/teleop dashboard URL. |
| `agenticros skills …` | Skill marketplace / local skills. |
| `agenticros --help` | Full help. |

## Local VLM (Ollama)

```bash
ollama pull qwen3-vl:8b-instruct
npx agenticros init                # skip OpenAI key when prompted
agenticros up sim-amr
```

See [docs/local-vlm.md](https://github.com/agenticros/agenticros/blob/main/docs/local-vlm.md).

## How `init` works

1. JS workspace deps (`pnpm install`) — includes `@agenticros/robot` for connect/motors
2. JS workspace build
3. ROS 2 workspace build (`colcon`)
4. OpenClaw plugin install
5. Robot config (`~/.agenticros/config.json`)
6. Optional OpenAI key / MCP client setup
7. Final `agenticros doctor`

Use `agenticros init --force` to refresh after upgrading the CLI.

## Where state lives

- `~/.agenticros/config.json` — transport, namespace, safety, teleop
- Configstore `agenticros` — Cloud `ROBOT_ID` + `API_TOKEN` (`agenticros set` / `id`)
- `~/agenticros/` — install tree after `npx`/`npm` init
- `/tmp/agenticros-*.pid`, `/tmp/agenticros-*.log`, `/tmp/agenticros-comms.log`

## Links

- Cloud portal: [https://cloud.agenticros.com](https://cloud.agenticros.com)
- Docs: [https://github.com/agenticros/agenticros](https://github.com/agenticros/agenticros)
- Site: [https://agenticros.com](https://agenticros.com)

## Contributing

CLI source: [`packages/agenticros-cli/`](.). On-robot helpers: [`packages/agenticros-robot/`](../agenticros-robot/).
