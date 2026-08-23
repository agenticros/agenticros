# @agenticros/robot

On-robot hardware helpers for AgenticROS. These Node scripts are spawned by the
`agenticros` CLI (`connect`, `start motors`, `start camera`, …) — they are not
a separate npm bin.

## Cloud defaults

| Role | URL |
|------|-----|
| REST portal | `https://cloud.agenticros.com` |
| Signaling WebSocket | `wss://cloud.agenticros.com` |

Override the signaling host with `agenticros connect -s <host>`.

Robot ID and API token live in `configstore('agenticros')`. Legacy values from
`configstore('robotics')` are copied once on first read.

## Scripts

| File | Purpose |
|------|---------|
| `comms.js` | Cloud P2P + ROS bridge (`agenticros connect`) |
| `start-motors.js` | Pick backend and spawn a motor controller |
| `motors-rpi5.js` | Raspberry Pi GPIO motors |
| `motors-firmata.js` | Firmata / Arduino motors (default for non-Pi, including Jetson+Arduino) |
| `motors-jetson.js` | Experimental Jetson native GPIO via JETGPIO — **opt-in only** (`-b jetson`) |
| `lib/odometry.js` | Shared differential-drive odom (ARC mm → meters; `/odom` + TF) |
| `lib/firmata-encoders.js` | Native Firmata encoder poller (no Johnny-Five) |
| `camera-2d-ros.js` | V4L 2D camera → `/camera2d` |
| `ros-topics.js` | Topic naming + portal config fetch |
| `robot-config.js` | Robot ID / token store + cloud helpers |

## Motors backend selection

1. Portal `compute === "Raspberry Pi"` → `motors-rpi5.js`
2. Otherwise → `motors-firmata.js`
3. Overrides: `-b rpi` | `-b firmata` | `-b jetson`

`motors-jetson.js` is never auto-selected. It requires system JETGPIO
(`libjetgpio.so`) and optional npm `koffi`, and often needs root / `/dev/mem`.

## Odometry

When the ARC robot profile has `wheelDiameter` and `wheelBetween` (mm), every
motor backend publishes `nav_msgs/Odometry` on `/odom` (namespaced when the
portal has `rosNamespace`) plus `odom` → `base_link` TF at 20 Hz.

- **Dead-reckon** (rpi / firmata / jetson): integrates the last `cmd_vel` twist.
- **Encoder** (firmata only): pass `-e/--encoderpins` (four pins: leftA,leftB,rightA,rightB). Uses native Firmata `pinMode` / digital reads — not Johnny-Five.

Force on with `--odom` (defaults 64 mm diameter / 135 mm track if ARC is unset).
Disable with `--no-odom`. Encoder TPR: `--tpr` → portal `ticksPerRevolution` → `351`.

## Usage

Prefer the CLI:

```bash
agenticros set --token=<api-token>
agenticros id
agenticros connect
agenticros start motors
agenticros start camera
agenticros start realsense
agenticros disconnect
agenticros stop motors
```
