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
| `camera-2d-ros.js` | V4L 2D camera → `/camera2d` |
| `ros-topics.js` | Topic naming + portal config fetch |
| `robot-config.js` | Robot ID / token store + cloud helpers |

## Motors backend selection

1. Portal `compute === "Raspberry Pi"` → `motors-rpi5.js`
2. Otherwise → `motors-firmata.js`
3. Overrides: `-b rpi` | `-b firmata` | `-b jetson`

`motors-jetson.js` is never auto-selected. It requires system JETGPIO
(`libjetgpio.so`) and optional npm `koffi`, and often needs root / `/dev/mem`.

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
