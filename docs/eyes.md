# Robot eyes (on-robot face display)

`@agenticros/eyes` is a fullscreen “robot face” for tablets and head units. Canvas eyes idle-blink and look left/right when anything publishes a turning Twist on the robot’s `cmd_vel` topic. Optional invisible **WASD** keyboard teleop lets an operator drive from the same screen. Procedural **R2D2-style chirps** play from the eyes Node process (idle chatter; excited bursts on active `cmd_vel`).

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

# Mute R2D2 chirps
agenticros eyes --no-sound

# Serve UI without opening a browser
agenticros eyes --no-browser

# Override topic / port
agenticros eyes --topic /my_robot/cmd_vel --port 8765

# With the real-robot stack
agenticros up real --eyes
agenticros up real --eyes --eyes-no-teleop --eyes-no-sound
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
| `safety.maxLinearVelocity` / `maxAngularVelocity` | Clamp WASD publishes (defaults 1.0 m/s / 1.5 rad/s) |

CLI `--topic` overrides the config topic. Env vars (`PORT`, `CMD_VEL_TOPIC`, `TELOP_*`, …) still work when running the package directly.

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

- Turning left (`angular.z > 0`) → eyes look **right**
- Turning right (`angular.z < 0`) → eyes look **left**
- Idle: occasional blinks and subtle look-around
- Recenters when `|angular.z|` is below the deadzone or commands stop

## Architecture

```
Browser (canvas + optional WASD)
    ↕ WebSocket (127.0.0.1:8765)
@agenticros/eyes (rclnodejs node /robot_eyes)
    ↕ local DDS                          ↕ synth → afplay/paplay/aplay
cmd_vel Twist  ← also written by MCP / OpenClaw / motors consumers
```

Package path: [`packages/robot-eyes`](../packages/robot-eyes).
