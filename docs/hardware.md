# Hardware getting started

Assemble a small differential-drive robot, wire compute GPIOs to an **L298N** dual H-bridge, publish `/cmd_vel` and `/odom`, then hand the same stack to an AI agent (OpenClaw, Claude, Codex, Hermes, Gemini).

**This page is hardware only.** After the base moves and RealSense publishes, continue with [Robot setup](robot-setup.md) (ROS 2 + OpenClaw plugin) and the [CLI README](../packages/agenticros-cli/README.md) (`npx agenticros init`).

## What you are building

```
cmd_vel  →  motor controller  →  GPIO / Firmata  →  L298N  →  left + right TT motors
                └── /odom  (dead-reckon from cmd_vel, or Firmata wheel encoders)
RealSense D4xx  →  /camera/...  (color + depth)
```

The reference robot is a [DFRobot 2WD chassis](https://www.dfrobot.com/product-65.html) with two encoded TT motors, an L298N, a RealSense depth camera, and a Jetson Orin Nano. Swap the compute for a Raspberry Pi 5, RADXA X4, LattePanda Delta 3, or any x86 box plus an Arduino running Firmata — the L298N wiring pattern stays the same; only the pin numbers and `agenticros start motors -b` backend change.

## Bill of materials (reference)

Prices are approximate USD (what this kit cost to buy). Shop around; they move.

| Qty | Item | Approx. | Link |
|-----|------|---------|------|
| 1 | NVIDIA Jetson Orin Nano Developer Kit | $384.90 | [Amazon](https://www.amazon.com/NVIDIA-Jetson-Orin-Nano-Developer/dp/B0BZJTQ5YP) |
| 1 | Intel RealSense Depth Camera **D436** | $354 | [RealSense store](https://store.realsenseai.com/buy-intel-realsense-depth-camera-d436.html) |
| 1 | DFRobot 2WD MiniQ chassis | $34.90 | [DFRobot](https://www.dfrobot.com/product-65.html) |
| 2 | TT geared motor with encoder, 6V 160RPM 120:1 L-shape (FIT0458) | $14.80 | [DFRobot](https://www.dfrobot.com/product-1458.html) |
| 1 | L298N H-bridge (from a 4-pack) | $2.50 | [Amazon](https://www.amazon.com/BOJACK-H-Bridge-Controller-Intelligent-Mega2560/dp/B0C5JCF5RS) |
| 1 | Patriot 512GB NVMe (Jetson has no onboard SSD) | $88 | [Amazon](https://www.amazon.com/dp/B0D4RCRNHG) |

**Accessories**

| Qty | Item | Approx. | Link |
|-----|------|---------|------|
| 1 | 3S LiPo (motors / L298N only — not the Jetson) | $27 | [Amazon](https://www.amazon.com/Zeee-Battery-5200mAh-Connector-Airplane/dp/B0FWB7486K) |
| 1 | Logitech wireless keyboard + trackpad | $27 | [Amazon](https://www.amazon.com/Logitech-Wireless-Keyboard-Touchpad-PC-connected/dp/B014EUQOGK) |
| 1 | DisplayPort cable | $9 | [Amazon](https://www.amazon.com/DisplayPort-Benfei-Compatible-ThinkPad-Desktop/dp/B07Y1XM998) |
| 1 | Velcro | $10 | — |
| 1 | Dupont / GPIO jumper wires | $5 | — |
| 1 | Adjustable AC/DC adapter (set to **19V** for the Orin Nano Dev Kit) | $15.49 | [Amazon](https://www.amazon.com/Adjustable-Universal-Switching-Minidodoca-Electronics/dp/B0C5QG946M) |

**Reference total ≈ $973** with a D436. A [RealSense D421](https://store.realsenseai.com/) (~$85) drops the kit to **≈ $704**. D421 is depth-oriented; color snapshots and “what do you see?” work better on D436 / D435 / D435i. Start RealSense with `agenticros start realsense --model=D421` if that is the camera you have (also auto-selected when the cloud portal `camera` field is D421).

### Optional: Arduino for encoder `/odom`

Wheel-encoder odometry is implemented on the **Firmata** motor backend only. Jetson GPIO and Raspberry Pi GPIO publish `/odom` by **dead-reckoning** `cmd_vel` (good enough to start). To use the TT motor encoder wires, add an Arduino and flash StandardFirmata:

| Qty | Item | Notes |
|-----|------|--------|
| 1 | Arduino Uno / Mega / Nano (USB) | Default Firmata device `/dev/ttyACM0`. LattePanda Delta 3 already has an onboard Leonardo — no extra board. |

### Alternate compute (instead of Jetson)

Jetson native GPIO is **opt-in** (`-b jetson`). Every other board in this table defaults to **Firmata** unless you pass `-b rpi`.

| Compute | Motor backend | Notes |
|---------|---------------|--------|
| [Jetson Orin Nano](https://www.amazon.com/NVIDIA-Jetson-Orin-Nano-Developer/dp/B0BZJTQ5YP) | `-b jetson` (must pass this) or `-b firmata` | Native: install [JETGPIO](https://github.com/Rubberazer/JETGPIO). Firmata: USB Arduino. |
| [Raspberry Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/) | `-b rpi` (auto if portal compute is Raspberry Pi) | BCM pin numbers via `@iiot2k/gpiox`. |
| [RADXA X4](https://radxa.com/products/x/x4/) | `-b firmata` (default) | USB Arduino running StandardFirmata. |
| [LattePanda Delta 3](https://www.lattepanda.com/lattepanda-3-delta) | `-b firmata` (default) | Flash StandardFirmata to the **onboard ATmega32u4** (Arduino Leonardo). |
| Any x86 Intel NUC / mini PC | `-b firmata` (default) | USB Arduino running StandardFirmata. |

Install Firmata once (Arduino IDE → **File → Examples → Firmata → StandardFirmata** → Upload). Official sketch and protocol: [firmata/arduino](https://github.com/firmata/arduino). Then `sudo usermod -aG dialout $USER` and reboot so `/dev/ttyACM0` is usable without root.

---

## Power (read this before you connect batteries)

- **Compute** (Jetson / Pi / NUC) gets its own supply. Orin Nano Dev Kit: barrel jack, typically **19V**. Do not feed the Jetson from the L298N 5V pin or from the 3S pack directly.
- **Motors** get the 3S LiPo on the L298N **+12V / VCC** screw terminal (motor supply), with **battery GND tied to L298N GND and compute GND**.
- The TT motors are **rated 6V** (3–7.5V). A 3S pack is ~11.1–12.6V; the L298N drops ~1.5–2V, so the motors still see more than 6V. Keep PWM conservative on first tests, or use a 2S pack if the gearboxes run hot.
- Encoder logic is **4.5–7.5V** ([FIT0458 wiki](https://wiki.dfrobot.com/fit0458/)). Power encoder VCC from Arduino **5V** or the Jetson/Pi header **5V** pin — **not** 3.3V.
- Remove the L298N **5V jumper** when motor voltage is ~12V, and feed the L298N **+5V** logic pin from the compute 5V rail (or leave the jumper only if your motor supply is well under 12V).
- Put the robot on blocks until `/cmd_vel` direction is correct.

---

## L298N terminals

One module drives both wheels:

| L298N | Role |
|-------|------|
| **IN1 / IN2** | Left motor direction (and, on Pi/Jetson, PWM) |
| **ENA** | Left motor enable / PWM (jumpered HIGH on Pi/Jetson; Arduino PWM pin on Firmata) |
| **OUT1 / OUT2** | Left motor `+` / `−` |
| **IN3 / IN4** | Right motor direction |
| **ENB** | Right motor enable / PWM |
| **OUT3 / OUT4** | Right motor `+` / `−` |
| **+12V** | Motor battery (3S +) |
| **GND** | Common ground |
| **+5V** | Logic (see jumper note above) |

`agenticros start motors` pin lists are **left-to-right**. If a side runs backward, swap that motor’s OUT leads or swap that side’s two IN numbers in `-p`.

---

## `cmd_vel` wiring

### Jetson Orin Nano — native GPIO (`-b jetson`)

BOARD numbering (physical 40-pin header). Defaults match `motors-jetson.js`: **16, 18, 22, 26**.

Drive style: **two-pin PWM per motor** (PWM on one IN, the other IN held low). **ENA and ENB stay jumpered / tied HIGH** — they are not in the pin list.

| `-p` order | Meaning | Orin Nano BOARD pin | L298N |
|------------|---------|---------------------|-------|
| 1 | Left forward PWM | **16** | **IN1** |
| 2 | Left reverse PWM | **18** | **IN2** |
| 3 | Right forward PWM | **22** | **IN3** |
| 4 | Right reverse PWM | **26** | **IN4** |
| — | Left enable | jumper / 5V | **ENA** |
| — | Right enable | jumper / 5V | **ENB** |
| — | Ground | header GND (e.g. pin 14, 20, 30, 34) | **GND** |

```
Jetson 40-pin                         L298N                      motors
  BOARD 16  ───────────────────────── IN1
  BOARD 18  ───────────────────────── IN2     OUT1/OUT2 ────── left TT  +/−
  BOARD 22  ───────────────────────── IN3
  BOARD 26  ───────────────────────── IN4     OUT3/OUT4 ────── right TT +/−
  5V        ── (logic, if 5V jumper off) +5V
  GND       ───────────────────────── GND ── LiPo −
                                          +12V ── LiPo +
  ENA/ENB jumpers ON (enable always high)
```

Requires system [JETGPIO](https://github.com/Rubberazer/JETGPIO) (`libjetgpio.so`) and often root / `/dev/mem`. This backend is **never auto-selected**.

```bash
agenticros start motors -b jetson -p 16,18,22,26 --odom
```

### Raspberry Pi 5 — native GPIO (`-b rpi`)

BCM numbers (not physical pin numbers). Defaults: **27, 22, 17, 18**. Same two-pin PWM + ENA/ENB jumpered as Jetson.

| `-p` order | Meaning | BCM | Header pin | L298N |
|------------|---------|-----|------------|-------|
| 1 | Left forward PWM | **27** | 13 | **IN1** |
| 2 | Left reverse PWM | **22** | 15 | **IN2** |
| 3 | Right forward PWM | **17** | 11 | **IN3** |
| 4 | Right reverse PWM | **18** | 12 | **IN4** |
| — | Enables | jumper | — | **ENA**, **ENB** |
| — | Ground | GND | 6, 9, 14, … | **GND** |

```bash
agenticros start motors -b rpi -p 27,22,17,18 --odom
```

### Arduino Firmata — RADXA / LattePanda / x86 / Jetson+Arduino (`-b firmata`)

Six pins: **dir, cdir, pwm** per motor. PWM goes to **ENA/ENB** (remove those jumpers). Defaults: **3, 4, 5, 7, 8, 9**. Pins 5 and 9 must be PWM-capable.

| `-p` order | Meaning | Arduino | L298N |
|------------|---------|---------|-------|
| 1 | Left dir | **3** | **IN1** |
| 2 | Left cdir | **4** | **IN2** |
| 3 | Left PWM | **5** | **ENA** (jumper **off**) |
| 4 | Right dir | **7** | **IN3** |
| 5 | Right cdir | **8** | **IN4** |
| 6 | Right PWM | **9** | **ENB** (jumper **off**) |

```bash
sudo usermod -aG dialout $USER   # once, then reboot
agenticros start motors -b firmata -d /dev/ttyACM0 -p 3,4,5,7,8,9 --odom
```

Flash **StandardFirmata** before this will enumerate: [Arduino Firmata README](https://github.com/firmata/arduino#usage) (IDE: **File → Examples → Firmata → StandardFirmata → Upload**). On LattePanda Delta 3, select board **Arduino Leonardo** and the onboard USB serial port.

---

## `/odom` wiring

Two modes share the same motor process. Geometry: DFRobot MiniQ + TT wheels are close to the code defaults **64 mm** diameter and **135 mm** track. Set those on the robot profile at `agenticros register`, or pass `--odom` to use the defaults.

| Mode | Backends | How it works |
|------|----------|----------------|
| **Dead-reckon** (`cmd_vel`) | rpi, jetson, firmata | Integrates the last Twist. No extra wires. Always start here. |
| **Encoders** | **firmata only** | `-e leftA,leftB,rightA,rightB`. Polls quadrature-lite on the Arduino. |

Dead-reckon (any backend):

```bash
agenticros start motors -b jetson -p 16,18,22,26 --odom
# or Pi / Firmata equivalents above
```

### Encoder wires (FIT0458 / product 1458)

Each motor has a 2-pin motor cable (to L298N OUT) and a 4-pin encoder cable:

| Encoder | Connect to |
|---------|------------|
| **VCC** | Arduino 5V or compute header 5V (4.5–7.5V) |
| **GND** | Common GND |
| **A** (phase A) | Firmata `leftA` / `rightA` |
| **B** (phase B) | Firmata `leftB` / `rightB` |

Default `-e` is **13, 2, 12, 11** (leftA, leftB, rightA, rightB) — chosen so it does not collide with motor pins 3,4,5,7,8,9.

```bash
agenticros start motors -b firmata -d /dev/ttyACM0 \
  -p 3,4,5,7,8,9 \
  -e 13,2,12,11 \
  --tpr 960 --odom
```

DFRobot documents **8 pulses per motor revolution × 120:1 ≈ 960 counts per wheel turn**. Pass `--tpr 960` (or set `ticksPerRevolution` on the cloud profile). If `/odom` distance is 2× or ½× a tape-measure run, double or halve `--tpr`. The CLI fallback **351** is a different robot — do not use it on these TT motors.

On Jetson/Pi **without** Arduino, leave the encoder signal wires unconnected (tape them). `/odom` still publishes from `cmd_vel` when `--odom` is set.

---

## First bring-up (before any AI agent)

On the robot, with ROS 2 Humble or Jazzy already installed (JetPack 6 → Ubuntu 22.04 → Humble is the usual Jetson path):

```bash
npx agenticros init
# optional cloud: agenticros login && agenticros register
#   compute: "Nvidia Orin"  |  camera: D436 (or D421)  |  wheels: 64 mm / 135 mm

agenticros start motors -b jetson -p 16,18,22,26 --odom
agenticros start realsense
```

Pi: `-b rpi -p 27,22,17,18`. Firmata boards: omit `-b jetson` / `-b rpi` and pass `-d /dev/ttyACM0`.

One-shot demo stack (RealSense + motors + MCP): `agenticros up real` (add `--no-motors` / `--no-camera` as needed). Full flags: [CLI README](../packages/agenticros-cli/README.md).

**Check motion** (robot on blocks). Publish a slow Twist on the topic your controller subscribed to (`/cmd_vel` or `/<namespace>/cmd_vel`):

```bash
# via AgenticROS MCP / OpenClaw later; for a smoke test from another ROS node:
# geometry_msgs/Twist linear.x = 0.15, angular.z = 0
```

Wheels should both spin “forward.” Swap OUT leads or the two IN pins for a side that is mirrored. Then:

- `ros2 topic echo /odom --once` (or the namespaced `/<ns>/odom`) should show a pose updating while you command motion.
- `ros2 topic hz /camera/camera/color/image_raw` (or the compressed topic) for RealSense. Recovery-mode cameras: [Cameras](cameras.md).
- If Twist publishes but nothing moves: [Robot not receiving cmd_vel](robot-not-receiving-cmd-vel.md).

---

## Next: AI agents (OpenClaw and friends)

Hardware is done when `/cmd_vel` turns wheels, `/odom` exists, and a camera topic is live. Then:

1. **[Robot setup](robot-setup.md)** — ROS 2 workspace, rosbridge or local DDS, and **installing the OpenClaw plugin** (`./scripts/setup_gateway_plugin.sh`).
2. **Root [README](../README.md)** — `npx agenticros`, **First-time setup**, `agenticros up real`.
3. **[CLI reference](cli.md)** and **[packages/agenticros-cli/README.md](../packages/agenticros-cli/README.md)** — motors, RealSense, cloud login.
4. **OpenClaw on the robot (Mode A)** or laptop (Mode B) — plugin tools, teleop, chat. LAN dashboard notes: [OpenClaw plugin routes](openclaw-releases-and-plugin-routes.md).
5. **[Local VLM / Ollama](local-vlm.md)** — no cloud API key.
6. Other agents, same robot: [MCP setup](mcp-setup.md), [Codex](codex-setup.md), [Hermes](hermes-setup.md), [NemoClaw on Jetson](nemoclaw.md).

Try: *“drive forward slowly”*, *“what do you see?”*, `/estop`.

---

## Troubleshooting (hardware)

| Symptom | Check |
|---------|--------|
| `start motors` does nothing on Jetson | You must pass **`-b jetson`**. Default for non-Pi compute is Firmata (expects `/dev/ttyACM0`). JETGPIO installed? May need `sudo`. |
| One wheel dead | ENA/ENB jumper (Pi/Jetson) or PWM pin actually on ENA/ENB (Firmata). Common GND. |
| Both wheels spin the wrong way | Invert by swapping both motors’ OUT leads, or swap each pair in `-p`. |
| Encoders ignored | Only **`-b firmata -e …`**. Encoder VCC must be 5V, not 3.3V. |
| Jetson brown-out when motors start | Motors on LiPo, compute on 19V adapter; common GND only. |
| RealSense no publishers | `rs-enumerate-devices`; recovery mode steps in [cameras.md](cameras.md). |
