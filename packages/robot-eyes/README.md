# @agenticros/eyes

Fullscreen robot eyes for an Ubuntu tablet or robot display, driven by ROS 2 `cmd_vel` (`geometry_msgs/Twist`). Includes procedural R2D2-style chirps (idle + excited on motion).

Part of the [AgenticROS](https://github.com/agenticros/agenticros) monorepo. Prefer launching via the CLI:

```bash
agenticros eyes
agenticros eyes --no-browser
agenticros eyes --no-teleop          # gaze only (no WASD publish)
agenticros eyes --no-sound           # mute R2D2 chirps
agenticros up real --eyes            # start eyes after the real-robot stack
```

See [docs/eyes.md](../../docs/eyes.md) for setup, config, sounds, and keyboard teleop.

## Direct run (development)

```bash
source /opt/ros/jazzy/setup.bash
cd packages/robot-eyes
pnpm install   # from monorepo root is preferred
pnpm start
```

Requires Node 18+, ROS 2, a graphical display (`DISPLAY`) for kiosk mode, and `afplay` / `paplay` / `aplay` for sounds.

## License

MIT. The synthesizer in `lib/synth.js` is adapted from [r2d2](https://github.com/chrismatthieu/r2d2) under Apache-2.0 (see [NOTICE](NOTICE)).
