# Robot eyes (on-robot face display)

`@agenticros/eyes` is a fullscreen “robot face” for tablets and head units. Canvas eyes idle-blink and look left/right when anything publishes a turning Twist on the robot’s `cmd_vel` topic. When the robot is idle and YOLO is already installed (follow-me / `ros2_find_object`), the pupils follow a person in the RealSense color frame. Optional invisible **WASD** keyboard teleop lets an operator drive from the same screen. Procedural **R2D2-style chirps** play from the eyes Node process (idle chatter; excited bursts on active `cmd_vel`).

This is **not** the OpenClaw remote teleop page ([teleop.md](teleop.md)). Eyes run **on the robot** over local DDS (`rclnodejs`). Remote camera + twist controls stay in the OpenClaw plugin.

## Requirements

- Node.js 18+
- ROS 2 (Humble / Jazzy) with a working local graph
- Graphical display (`DISPLAY`, usually `:0`) for kiosk mode
- Firefox or Chromium (optional if you open the URL yourself)
- Speakers + a system audio player for sounds: `afplay` (macOS), or `paplay` / `aplay` (Linux)

## Launch

```bash
# From a workspace or after `agenticros init`
agenticros eyes

# Gaze only — do not publish WASD twists (agents/operators drive)
agenticros eyes --no-teleop

# Skip idle person-follow even if YOLO is already installed
agenticros eyes --no-person-gaze

# Mute R2D2 chirps
agenticros eyes --no-sound

# Serve UI without opening a browser
agenticros eyes --no-browser

# Override topic / port (only needed if your robot namespaces cmd_vel)
agenticros eyes --topic /cmd_vel --port 8765

# With the real-robot stack
agenticros up real --eyes
agenticros up real --eyes --eyes-no-teleop --eyes-no-sound
agenticros up real --eyes --eyes-no-person-gaze
```

Stop with `agenticros down` (or kill the process recorded in `/tmp/agenticros-eyes.pid`).

Logs: `agenticros logs eyes` → `/tmp/agenticros-eyes.log`.

Interactive menu: **Start robot eyes (local display)**.

## Config

Topic and safety limits come from `~/.agenticros/config.json` (same file as the rest of AgenticROS):

| Source | Effect |
|--------|--------|
| `teleop.cmdVelTopic` | Used as-is when set |
| else `robot.namespace` | Publishes/subscribes `/<namespace>/cmd_vel` |
| else | `/cmd_vel` |
| `robot.cameraTopic` | Color topic for idle person-follow (raw Image paths get `/compressed` appended). Default `/camera/camera/color/image_raw/compressed` |
| `safety.maxLinearVelocity` / `maxAngularVelocity` | Clamp WASD publishes (defaults 1.0 m/s / 1.5 rad/s) |

CLI `--topic` overrides the config `cmd_vel` topic. Env vars (`PORT`, `CMD_VEL_TOPIC`, `CAMERA_TOPIC`, `TELOP_*`, …) still work when running the package directly.

## Sounds (R2D2)

Sounds are synthesized in-process (no sample files) and played via the system audio player — not in the browser (avoids kiosk autoplay blocks).

| Mode | Trigger |
|------|---------|
| Idle | Random chirp / warble / beeps every ~300–2500 ms |
| Excited | Active `cmd_vel` (`|linear.x|` or `|angular.z|` above deadzone), rate-limited (~600 ms cooldown) |

Mute with `--no-sound`, `up --eyes-no-sound`, or `AGENTICROS_EYES_NO_SOUND=1`. If no player is found, eyes still run and a one-time warning is logged.

Optional env knobs:

| Variable | Default | Meaning |
|----------|---------|---------|
| `SOUND_MIN_GAP_MS` | `300` | Min idle gap between chirps |
| `SOUND_MAX_GAP_MS` | `2500` | Max idle gap |
| `SOUND_EXCITE_COOLDOWN_MS` | `600` | Min time between excited bursts |
| `SOUND_LINEAR_DEADZONE` | `0.02` | Ignore tiny `linear.x` for excitement |

Synth adapted from [r2d2](https://github.com/chrismatthieu/r2d2) (Apache-2.0); see `packages/robot-eyes/NOTICE`.

## Keyboard teleop

Focus must be on the eyes browser window. Nothing extra is drawn on screen.

| Key | Action |
|-----|--------|
| `W` / `S` | Forward / backward |
| `A` / `D` | Turn left / right |
| `Q` / `Z` | Faster / slower |
| `F` | Fullscreen |

Keys can be combined. Releasing all movement keys publishes a zero Twist. Multiple publishers on `cmd_vel` are last-writer-wins (normal for ROS teleop); gaze still follows agent-driven twists when WASD is unused or `--no-teleop` is set.

## Gaze behaviour

Priority, highest first:

- Turning left (`angular.z > 0`) → eyes look **right**
- Turning right (`angular.z < 0`) → eyes look **left**
- Driving straight (`|linear.x|` above the deadzone) → pupils recenter; person-follow does not run
- Idle + YOLO already installed → pupils follow a person in the RealSense color frame (largest bbox, aimed at the head). Painted pupils only — does **not** drive the base. Eyes never download YOLO; if weights / native deps are missing, person-follow is skipped (`Person gaze disabled (YOLO not installed)`).
- Idle + no person (or `--no-person-gaze`) → occasional blinks and subtle look-around
- Recenters when motion commands stop (`|angular.z|` and `|linear.x|` below deadzone)

Disable person-follow: `--no-person-gaze`, `up --eyes-no-person-gaze`, or `AGENTICROS_EYES_NO_PERSON_GAZE=1`.

## Telepresence

The same kiosk page can show an ARC operator and carry a two-way call. Teleop (joystick, WASD, robot camera) stays on the existing data-channel session. Video and voice use a second WebRTC connection between the ARC control page and this browser. Eyes keeps animating underneath; a live operator camera covers the canvas, and hanging up (or turning video off) shows the face again. Mic-only leaves the eyes up, plays the operator through the tablet speakers, and shows "On a call".

`agenticros connect` relays the call's signaling from ARC to `ws://127.0.0.1:8765`. Eyes has to be running or the ARC Video / Mic buttons report that the display is offline. The robot microphone is the kiosk browser's mic (`echoCancellation` on). R2D2 chirps pause while the call is up.

Chromium is launched with `--autoplay-policy=no-user-gesture-required` and `--use-fake-ui-for-media-stream` so the unattended tablet can capture the mic and play the operator. `http://127.0.0.1` is a secure context, so `getUserMedia` is allowed. Firefox kiosk does not auto-grant the microphone; use Chromium for telepresence.

Override the Eyes port with `EYES_PORT` on the `agenticros connect` process if it is not 8765.

## Architecture

```
Browser (canvas + optional WASD + telepresence video/audio)
    ↕ WebSocket (127.0.0.1:8765)
@agenticros/eyes (rclnodejs node /robot_eyes)
    ↕ local DDS                          ↕ synth → afplay/paplay/aplay
cmd_vel Twist  ← also written by MCP / OpenClaw / motors consumers
color CompressedImage  ← RealSense (idle person-follow if YOLO already installed)

ARC control page  ←WebRTC media→  Eyes kiosk
        ↕ signaling relay
agenticros connect (comms.js) ── local WebSocket ── Eyes
```

Package path: [`packages/robot-eyes`](../packages/robot-eyes).
