# @agenticros/eyes

Fullscreen robot eyes for an Ubuntu tablet or robot display, driven by ROS 2 `cmd_vel` (`geometry_msgs/Twist`). Includes procedural R2D2-style chirps (idle + excited on motion). When idle, the pupils can follow a person in the RealSense camera if YOLO is already installed.

Part of the [AgenticROS](https://github.com/agenticros/agenticros) monorepo. Prefer launching via the CLI:

```bash
agenticros eyes
agenticros eyes --no-browser
agenticros eyes --no-teleop          # gaze only (no WASD publish)
agenticros eyes --no-sound           # mute R2D2 chirps
agenticros eyes --no-person-gaze     # skip idle person-follow even if YOLO is present
agenticros up real --eyes            # start eyes after the real-robot stack
```

See [docs/eyes.md](../../docs/eyes.md) for setup, config, sounds, and keyboard teleop.

## Gaze

Priority, highest first:

1. **Turning** (`cmd_vel` `|angular.z|` above the deadzone) — pupils look **right** on a left turn (`+angular.z`) and **left** on a right turn. Recenter when the command stops.
2. **Driving straight** (`|linear.x|` above the deadzone, no turn) — pupils recenter. Person-follow does not run while the robot is moving.
3. **Idle + YOLO already installed** — pupils follow a person in the RealSense color frame (largest bounding box, aimed at the head). This moves the painted eyes only; it does **not** drive the base.
4. **Idle + no person (or no YOLO)** — blinks and a slow look-around.

### If YOLO is already installed

Person-follow gaze uses the same YOLOv8n detector as follow-me / `ros2_find_object`. Eyes **do not** add YOLO as a dependency and **do not** download `yolov8n.onnx`. It only runs when:

- Weights already exist at `~/.agenticros/models/yolov8n.onnx` (or `AGENTICROS_YOLOV8_MODEL`)
- `@agenticros/object-detection` (and `onnxruntime-node` / `sharp`) are already present from another adapter

Startup log: `Person gaze enabled (YOLO) on <camera topic>`.

Color topic comes from `robot.cameraTopic` in `~/.agenticros/config.json` (raw Image paths get `/compressed` appended). Default: `/camera/camera/color/image_raw/compressed`.

Disable even when YOLO is present:

```bash
agenticros eyes --no-person-gaze
agenticros up real --eyes --eyes-no-person-gaze
```

### If YOLO is not installed

Person-follow is skipped. Twist gaze, idle blink / look-around, WASD, and sounds still work. Startup log: `Person gaze disabled (YOLO not installed)`.

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
