# AgenticROS on NVIDIA NemoClaw

[NVIDIA NemoClaw](https://github.com/NVIDIA/NemoClaw) packages OpenClaw inside an OpenShell sandbox container with policy-enforced egress and managed inference. This guide covers:

1. **Installing NemoClaw** on a Jetson (or any Linux box).
2. **Two ways to give the agent access to ROS 2, RealSense, and the AgenticROS plugin:**
   - **Method A — Hybrid (recommended):** ROS / RealSense / rosbridge on the **host**, only the AgenticROS plugin **inside the sandbox**, bridged over `host.docker.internal:9090`.
   - **Method B — Full embed:** ROS / RealSense / AgenticROS baked into a custom NemoClaw sandbox image via `nemoclaw onboard --from`.
3. **Daily commands** — what to type after the install to start, stop, watch logs, redeploy, and chat.

> Method A is the path the rest of this repo's scripts target. Method B is a sketch with a starting-point Dockerfile and the open issues you have to solve (USB passthrough, custom egress policy).

> **Vanilla OpenClaw or Hermes on your laptop?** See **[local-vlm.md](local-vlm.md)** for Ollama setup without NemoClaw. This guide adds sandbox policy, Jetson tuning, and `nemoclaw inference set` on top of that.

## Part 1 — Installing NemoClaw

These are the exact steps that succeeded on this Jetson (`nemoclaw v0.0.48`, NemoClaw sandbox build `1779389075`, OpenClaw `2026.4.24`, OpenShell `0.0.39`, Tegra L4T kernel 5.15).

### 1.1 Prerequisites

- Linux host with Docker installed (`docker --version`).
- The NemoClaw CLI (`nemoclaw`) on `PATH`. (NVIDIA's installer drops it at `~/.local/bin/nemoclaw`.)
- An inference provider you can reach from the host. The setup below uses **local Ollama** with `qwen3-vl:8b-instruct` — install with `ollama pull qwen3-vl:8b-instruct` first, and make sure `ollama serve` is up on `127.0.0.1:11434`. This single model handles both tool calling and vision natively, so no second describer model is needed. (Requires Ollama 0.12.7+.)

### 1.2 Disable iptables in the Docker daemon (required on Jetson)

NemoClaw spawns an OpenShell sandbox on a dedicated Docker bridge network (`openshell-docker`, `172.19.0.0/16`). On Jetson kernels (Tegra 5.15) the default Docker iptables rules conflict with the bridge creation, so set `"iptables": false` in `/etc/docker/daemon.json` before onboarding.

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "iptables": false
}
EOF
sudo systemctl restart docker
```

If `daemon.json` already exists, merge the `"iptables": false` key with `jq` instead of clobbering the file.

### 1.3 (Optional) Pre-pull the sandbox base image

The first `nemoclaw onboard` pulls + builds an ~80-layer sandbox image. On Jetson the full build takes around 25 minutes. Pre-pulling the cached base layer first cuts a chunk of that:

```bash
docker pull ghcr.io/nvidia/nemoclaw/sandbox-base:latest
```

### 1.4 Onboard a sandbox

Run `nemoclaw onboard` for a brand-new install, or `nemoclaw onboard --resume` to pick up where a previous interrupted run left off (this is what the terminal log used). The wizard asks for inference provider, model, messaging channels, and sandbox name.

```bash
nemoclaw onboard --resume
# or:
nemoclaw onboard
```

What to expect:

- `[1/8] Preflight checks` — verifies Docker, glibc, network.
- `[2/8] Starting OpenShell gateway` — on Jetson you'll see: `OpenShell gateway compatibility patch active (host glibc 2.35 is older than openshell-gateway requirement 2.39). Running openshell-gateway inside a Docker compatibility container.` This is expected and fine.
- `[3-4/8] Configuring inference` — for `ollama-local`, NemoClaw drops a systemd override to bind Ollama to `127.0.0.1:11434` (uses sudo).
- `[5/8] Messaging channels` — press Enter to skip if you just want a local agent.
- `[6/8] Creating sandbox` — builds the sandbox image (long). If the default port `18789` is taken, NemoClaw automatically picks `18790`.
- `[7/8] Setting up OpenClaw inside sandbox`.
- `[8/8] Policy presets` — the defaults that get applied: `npm, pypi, huggingface, brew, slack, discord, telegram, jira, outlook, github, local-inference`.

At the end:

```
NemoClaw is ready
  Sandbox:  nemo
  Model:    qwen3-vl:8b-instruct (Local Ollama)
  Browser:  http://127.0.0.1:18790/
  Terminal: nemoclaw nemo connect  →  openclaw tui
```

### 1.5 First-run sanity check

```bash
nemoclaw nemo status                  # phase: Ready, gateway: healthy
nemoclaw nemo dashboard-url --quiet   # authenticated URL with token
nemoclaw nemo connect                 # opens a shell inside the sandbox
sandbox@…:/sandbox$ openclaw tui      # local TUI chat (alt to the browser UI)
```

`Ctrl-C`, `/exit`, then `exit` returns you to the host shell.

At this point the agent has no robot capabilities — it's just `qwen3-vl:8b-instruct` talking to itself. The next part adds AgenticROS, RealSense, and ROS 2.

## Part 2 — Two ways to add ROS 2 + RealSense + AgenticROS

### Method A — Hybrid (host-side ROS, sandbox-side AgenticROS)

#### Why this method

The NemoClaw sandbox image is based on `node:22-trixie-slim` (Debian 13). Official ROS 2 binaries (Humble / Jazzy) are built for Ubuntu, and the librealsense apt repo is keyed to Ubuntu. Embedding the whole stack means either swapping the NemoClaw base for Ubuntu or building both from source for Debian trixie on arm64 — plus arranging USB device passthrough that NemoClaw doesn't expose by default.

The hybrid layout keeps ROS 2 and the RealSense driver on the host (where they already work on Jetson) and only puts the small AgenticROS Node plugin inside the sandbox. NemoClaw's policy model handles this cleanly: a single custom egress preset opens `host.docker.internal:9090` for the OpenClaw `node` binary, and nothing else changes in the base image.

```
┌──────────────── host (Jetson / Linux box) ────────────────┐
│                                                           │
│   /opt/ros/<distro>   +   librealsense2                   │
│                                                           │
│   ros2 launch agenticros_bringup realsense_rosbridge.launch.py
│       realsense2_camera   →  /camera/camera/color/image_raw[/compressed]
│                              /camera/camera/depth/image_rect_raw
│                              /camera/camera/aligned_depth_to_color/image_raw
│       rosbridge_server    →  ws://0.0.0.0:9090
│       cmd_vel_relay       →  /<robot_namespace>/cmd_vel → /cmd_vel
│                                                           │
└──────────────────────────┬────────────────────────────────┘
                           │ WebSocket over docker bridge
                           │   ws://172.19.0.1:9090
                           │   (host.docker.internal:9090)
                           ▼
┌───────────────── NemoClaw sandbox ────────────────────────┐
│   OpenClaw 2026.x   +   @agenticros/agenticros plugin     │
│   plugins.entries.agenticros.config.rosbridge.url         │
│       = ws://host.docker.internal:9090                    │
└───────────────────────────────────────────────────────────┘
```

#### A.1 Install ROS 2 + RealSense + rosbridge on the host

For ROS 2 Humble (what's installed on a Jetson Orin with JetPack 6 / Ubuntu 22.04):

```bash
# ROS 2 base + the three things AgenticROS needs on the host
sudo apt-get install -y \
  ros-humble-ros-base \
  ros-humble-realsense2-camera \
  ros-humble-rosbridge-suite \
  ros-humble-image-transport-plugins

# RealSense SDK runtime + udev rules (so USB device shows up without root)
sudo apt-get install -y \
  librealsense2-utils \
  librealsense2-udev-rules

# Plug in the camera, then verify the host sees it:
. /opt/ros/humble/setup.bash
rs-enumerate-devices -s        # should print your D-series device + firmware
ros2 pkg list | grep -E 'realsense2|rosbridge|image_transport'
```

If you're on a different distro (`jazzy` / `iron`), substitute the distro everywhere.

#### A.2 Build the AgenticROS plugin into an offline-ready bundle

The NemoClaw sandbox sets `NPM_CONFIG_OFFLINE=true`, so the plugin needs every workspace dependency materialised on disk before we copy it in. `pnpm deploy --prod` does exactly that.

```bash
cd ~/Projects/agenticros
pnpm install
pnpm build
rm -rf /tmp/agenticros-deploy
pnpm --filter @agenticros/agenticros deploy --prod /tmp/agenticros-deploy

# pnpm leaves a self-reference symlink that docker cp refuses; drop it.
rm -f /tmp/agenticros-deploy/node_modules/.pnpm/node_modules/@agenticros/agenticros
```

#### A.3 Copy the bundle into the sandbox

The OpenShell sandbox is just a Docker container; `docker cp` works. The plugin files must be owned by the `sandbox` user (UID 998) so OpenClaw can read them.

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec "$CONTAINER" rm -rf /sandbox/agenticros
docker exec "$CONTAINER" mkdir -p /sandbox/agenticros
docker cp /tmp/agenticros-deploy/. "$CONTAINER:/sandbox/agenticros/"
docker exec "$CONTAINER" chown -R sandbox:sandbox /sandbox/agenticros
```

#### A.4 Register the plugin with OpenClaw inside the sandbox

`-l` (link) mode skips the npm-install step that would otherwise fail on the offline registry. The CLI writes `plugins.entries.agenticros = { enabled: true }` and `plugins.installs.agenticros = { source: path, sourcePath: /sandbox/agenticros, ... }` into `/sandbox/.openclaw/openclaw.json`.

```bash
# HOME=/sandbox is required — without it openclaw writes to /root/.openclaw.
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" \
    openclaw plugins install -l /sandbox/agenticros
```

When the CLI prints the OpenClaw banner and starts spamming `ROS2 transport status: connecting/disconnected`, the plugin is loaded. Hit `Ctrl-C` (or `pkill -f "openclaw plugins"` from another shell).

#### A.5 Add the AgenticROS config block

Edit the sandbox `openclaw.json` so the plugin knows where rosbridge lives, what your robot's ROS namespace is, and which camera topic to snapshot. Replace `<YOUR_NAMESPACE>` with your robot's namespace (UUID with dashes is fine; many setups also use no-dashes form):

```bash
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  cd /sandbox/.openclaw && \
  jq ".plugins.entries.agenticros = {
    enabled: true,
    config: {
      transport: { mode: \"rosbridge\" },
      rosbridge: { url: \"ws://host.docker.internal:9090\" },
      robot: {
        name: \"My Robot\",
        namespace: \"<YOUR_NAMESPACE>\",
        cameraTopic: \"/camera/camera/color/image_raw/compressed\"
      },
      safety: { maxLinearVelocity: 0.4, maxAngularVelocity: 1.0 }
    }
  }" openclaw.json > openclaw.json.tmp && mv openclaw.json.tmp openclaw.json
'
```

#### A.6 Open the host port in NemoClaw's network policy

NemoClaw enforces per-binary egress. Apply the `agenticros-rosbridge` preset that ships with this repo:

```bash
cd ~/Projects/agenticros
nemoclaw nemo policy-add --from-file scripts/agenticros-rosbridge.policy.yaml --yes
```

The preset whitelists `host.docker.internal:9090` and `host.openshell.internal:9090` (both resolve to the docker bridge gateway, e.g. `172.19.0.1`) for the OpenClaw `node` process, and uses `access: full, tls: skip` so the OPA proxy treats it as a raw L4 CONNECT tunnel (no HTTP/2 ALPN negotiation, no body inspection) — that's what `ws://` over WebSocket needs.

The preset also lists `allowed_ips: [10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16]` for each endpoint. **This is required**: NemoClaw runs a separate SSRF guard in front of OPA that default-denies any private/RFC1918 destination, and `host.docker.internal` resolves to one. Without `allowed_ips`, the proxy returns `403 Forbidden` with `engine:ssrf` and `reason:host.docker.internal resolves to internal address ..., connection rejected` even though OPA itself would allow it. The CIDRs intentionally cover the whole RFC1918 space so the same preset works regardless of which subnet docker picked for its default bridge on your machine; you can narrow them to your actual docker bridge (e.g. `172.19.0.0/16`) if you want to silence the policy-load `very broad CIDR` warnings.

To peek at what the gateway is actually running, dump the live policy bundle:

```bash
openshell policy get --full nemo | sed -n '/network_policies:/,/^[a-z_]*:$/p'
```

Look for `policy:agenticros_rosbridge engine:opa` in `/var/log/openshell.*.log` inside the sandbox container to confirm allows; look for `engine:ssrf` to spot SSRF denials separately.

#### A.7 Restart the sandbox gateway

```bash
nemoclaw nemo recover
```

`recover` restarts the OpenClaw gateway with the updated config. Verify the plugin picked it up:

```bash
docker logs $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') 2>&1 | grep -i agenticros | tail -5
# Look for: "Connecting to ROS2 via rosbridge transport..." followed by either
#   - "WebSocket error connecting to ws://host.docker.internal:9090"  (rosbridge not up yet) OR
#   - "ROS2 transport status: connected"                              (success)
```

#### A.8 Start the host stack

`scripts/run_nemoclaw_host_stack.sh` sources Humble, sources the local workspace install (building `agenticros_msgs` and `agenticros_bringup` if needed), and runs `agenticros_bringup realsense_rosbridge.launch.py`, which brings up RealSense + rosbridge + a cmd_vel relay.

```bash
cd ~/Projects/agenticros
./scripts/run_nemoclaw_host_stack.sh humble \
    robot_namespace:=<YOUR_NAMESPACE> \
    align_depth:=true
```

Launch args you can append (anything after the distro is forwarded to `ros2 launch`):

| Arg | Default | Purpose |
|---|---|---|
| `robot_namespace` | `3946b404-c33e-4aa3-9a8d-16deb1c5c593` | ROS 2 namespace the plugin publishes cmd_vel under. |
| `dst_cmd_vel` | `/cmd_vel` | Topic the robot base subscribes to. |
| `relay_cmd_vel` | `true` | Set `false` to skip the cmd_vel relay (use raw namespaced topic). |
| `enable_color` / `enable_depth` | `true` / `true` | Enable / disable RealSense streams. |
| `align_depth` | `true` | Aligns depth to color so `ros2_depth_distance` sampling matches the snapshot. |
| `color_profile` | `640x480x15` | RealSense color profile WxHxFPS. Lower fps cuts rosbridge bandwidth. |
| `depth_profile` | `640x480x15` | RealSense depth profile. |
| `rosbridge_address` | `0.0.0.0` | Keep as `0.0.0.0` so the docker bridge can reach it. |
| `rosbridge_port` | `9090` | Port rosbridge_server binds. |

Leave the launch running in its own terminal. The gateway log should flip from `WebSocket error connecting…` to `ROS2 transport status: connected` within a second or two.

#### A.9 Verify the bridge end-to-end

`scripts/smoke_test_nemoclaw.sh` runs six checks in order — container up, policy loaded with `allowed_ips`, rosbridge bound on `:9090`, last proxy decision was `ALLOWED policy:agenticros_rosbridge`, a live WebSocket call to `/rosapi/topics` through the proxy returns a topic list, and the dashboard HTTP endpoint serves a non-empty body. Run it any time you suspect something has drifted:

```bash
./scripts/smoke_test_nemoclaw.sh
```

A healthy hybrid stack looks like:

```
PASS sandbox container: openshell-nemo-<uuid>
PASS agenticros_rosbridge policy is loaded with allowed_ips (SSRF guard satisfied)
PASS rosbridge_server is listening on host :9090
PASS last proxy decision: ALLOWED via agenticros_rosbridge
PASS WebSocket roundtrip: {"count":24,"sample":[".../color/image_raw", ...]}
PASS dashboard at http://127.0.0.1:18790/ returns 2742-byte body
    URL with token: http://127.0.0.1:18790/#token=...
```

If `last proxy decision` shows `DENIED by SSRF guard`, the `allowed_ips` block is missing from the loaded policy — re-apply the preset from A.6. If `DENIED by OPA`, the endpoint isn't in the policy at all. If the WebSocket roundtrip fails with `proxy 403`, the policy hasn't picked up the change yet — `nemoclaw nemo recover` and re-run.

#### A.10 Chat with the robot

```bash
# Browser
xdg-open "$(nemoclaw nemo dashboard-url --quiet)"
# or just visit http://127.0.0.1:18790/

# Terminal TUI
nemoclaw nemo connect
sandbox@…$ openclaw tui
```

Then ask the agent things like:

- "List the ROS 2 topics." → `ros2_list_topics`
- "What do you see?" → `ros2_camera_snapshot` (uses the configured `cameraTopic`)
- "How far is the nearest obstacle in front?" → `ros2_depth_distance`
- "Drive forward at 0.2 m/s for 1 second, then stop." → `ros2_publish` to `/<namespace>/cmd_vel`

If the model doesn't reach for the tools, prompt it explicitly: *"Use the AgenticROS tools — call `ros2_list_topics` and then `ros2_camera_snapshot`."* Small local models (the 8 B `qwen3-vl:8b-instruct`) sometimes need that nudge on the first turn while the prompt cache is cold; larger or function-tuned models pick it up on their own.

#### A.11 Updating the plugin after a code change

The plugin lives at `/sandbox/agenticros` in the sandbox, and OpenClaw's `plugins.installs.agenticros.sourcePath` points there, so a redeploy + gateway restart is all that's needed — no `openclaw plugins install` again:

```bash
cd ~/Projects/agenticros
pnpm build
pnpm --filter @agenticros/agenticros deploy --prod /tmp/agenticros-deploy
rm -f /tmp/agenticros-deploy/node_modules/.pnpm/node_modules/@agenticros/agenticros

CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec "$CONTAINER" rm -rf /sandbox/agenticros
docker cp /tmp/agenticros-deploy/. "$CONTAINER:/sandbox/agenticros/"
docker exec "$CONTAINER" chown -R sandbox:sandbox /sandbox/agenticros
nemoclaw nemo recover
```

### Method B — Full embed (custom NemoClaw sandbox image)

Build a custom sandbox image with ROS 2, RealSense, and AgenticROS baked in, then point NemoClaw at it. Heavier, but gives you a single deployable artifact and no host-side ROS install.

#### Trade-offs vs. hybrid

| Concern | Hybrid (Method A) | Full embed (Method B) |
|---|---|---|
| Sandbox image base | NemoClaw default (`node:22-trixie-slim`) | Custom (Ubuntu 22.04 or 24.04 — must replicate the NemoClaw base layers) |
| Host install | Needs ROS 2 + RealSense + rosbridge | None — runs only Docker |
| RealSense USB | Just works (host udev) | Needs `--device /dev/bus/usb` passthrough into the sandbox |
| Build time | ~10 s plugin redeploy | 30+ min per sandbox image rebuild |
| Egress policy | One preset (`agenticros-rosbridge.policy.yaml`) | Add presets for `packages.ros.org`, `librealsense.intel.com`, etc., **at build time** to allow apt installs |
| Single artifact | No | Yes |
| Recommended when | Host already runs ROS / robot is the host | Need a portable image with everything embedded |

#### B.1 Author a custom Dockerfile

Start from the NemoClaw base reference at `~/.nemoclaw/source/Dockerfile.base` and overlay ROS + RealSense + AgenticROS. Key things you must preserve from the NemoClaw base:

- `sandbox` / `gateway` users (uid 998), `/sandbox` workdir.
- `/sandbox/.openclaw` directory layout with `agents/`, `credentials/`, `plugins/`, `extensions/`, etc.
- `gosu` for privilege separation.
- OpenClaw CLI at `/usr/local/bin/openclaw`.
- `pip install pyyaml==6.0.3`.

A minimal starting point (save somewhere outside the agenticros repo so `nemoclaw onboard --from` can find it):

```dockerfile
# Custom NemoClaw sandbox image with ROS 2 Humble + RealSense + AgenticROS.
# Replaces node:22-trixie-slim with Ubuntu 22.04 so ROS Humble apt packages work.

FROM ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8

# --- node 22 (NemoClaw expects /usr/local/bin/node) --------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg locales jq python3 python3-pip python3-venv \
        git vim-tiny iproute2 iptables libcap2-bin procps e2fsprogs dos2unix \
        openssh-sftp-server \
    && locale-gen en_US.UTF-8 \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# --- ROS 2 Humble ------------------------------------------------------------
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
        -o /usr/share/keyrings/ros-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu jammy main" \
        > /etc/apt/sources.list.d/ros2.list \
    && apt-get update && apt-get install -y --no-install-recommends \
        ros-humble-ros-base \
        ros-humble-rosbridge-suite \
        ros-humble-image-transport-plugins \
        python3-colcon-common-extensions \
    && rm -rf /var/lib/apt/lists/*

# --- librealsense + realsense2_camera ---------------------------------------
RUN install -d /etc/apt/keyrings \
    && curl -sSf https://librealsense.intel.com/Debian/librealsense.pgp \
        | tee /etc/apt/keyrings/librealsense.pgp > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/librealsense.pgp] https://librealsense.intel.com/Debian/apt-repo jammy main" \
        > /etc/apt/sources.list.d/librealsense.list \
    && apt-get update && apt-get install -y --no-install-recommends \
        librealsense2-utils librealsense2-dev librealsense2-udev-rules \
        ros-humble-realsense2-camera \
    && rm -rf /var/lib/apt/lists/*

# --- NemoClaw sandbox layout (matches Dockerfile.base) ----------------------
#     gosu, openclaw CLI, /sandbox user, /sandbox/.openclaw dirs.
#     Easiest: COPY from the cached NemoClaw base, or replicate the layers
#     from ~/.nemoclaw/source/Dockerfile.base.
COPY --from=ghcr.io/nvidia/nemoclaw/sandbox-base:latest \
        /usr/local/lib/node_modules/openclaw /usr/local/lib/node_modules/openclaw
COPY --from=ghcr.io/nvidia/nemoclaw/sandbox-base:latest \
        /usr/local/bin/openclaw /usr/local/bin/openclaw
COPY --from=ghcr.io/nvidia/nemoclaw/sandbox-base:latest \
        /usr/local/bin/gosu /usr/local/bin/gosu
RUN groupadd -g 1000 gateway && useradd -u 1000 -g 1000 -m -s /bin/bash gateway \
 && groupadd -g 998  sandbox && useradd -u 998  -g 998  -m -d /sandbox -s /bin/bash sandbox \
 && mkdir -p /sandbox/.openclaw && chown -R sandbox:sandbox /sandbox

# --- Pre-bake the AgenticROS plugin -----------------------------------------
# Run `pnpm --filter @agenticros/agenticros deploy --prod ./agenticros-bundle`
# in the build context first, then COPY it in.
COPY --chown=sandbox:sandbox agenticros-bundle /sandbox/agenticros

USER sandbox
WORKDIR /sandbox

# Register the plugin against the sandbox user's openclaw config.
ENV HOME=/sandbox
RUN openclaw plugins install -l /sandbox/agenticros || true

USER root
ENTRYPOINT ["/usr/local/bin/nemoclaw-start"]
CMD ["/bin/bash"]
```

This is intentionally a sketch — the production NemoClaw base does a lot more (sandbox-init scripts, plugin-runtime-deps, blueprints). Read `~/.nemoclaw/source/Dockerfile.base` for the canonical layers and copy what you need.

#### B.2 Build via `nemoclaw onboard --from`

```bash
# Destroy the existing sandbox first (or pass --recreate-sandbox below).
nemoclaw nemo destroy --yes

nemoclaw onboard \
  --from /absolute/path/to/Dockerfile \
  --name nemo \
  --recreate-sandbox \
  --yes-i-accept-third-party-software
```

NemoClaw will use your Dockerfile as the base layer and append its standard plugin/blueprint/config layers on top (Dockerfile steps 8 through 74 from the upstream sandbox build, visible in the install log).

#### B.3 USB device passthrough for the RealSense

The default NemoClaw sandbox is spawned without `--device` flags. To make the RealSense visible inside the container you have to extend the OpenShell sandbox spec (NemoClaw doesn't have a first-class flag for this yet). Two practical options:

1. **Modify the sandbox spec** — patch the OpenShell sandbox template (`~/.local/state/nemoclaw/...`) to mount `/dev/bus/usb` into the sandbox and add `--device-cgroup-rule 'c 189:* rmw'`. This persists across `nemoclaw nemo recover` but does not survive a `--recreate-sandbox`.
2. **Run a side-container** — keep the RealSense in a privileged side-container (`docker run --device=/dev/bus/usb …`) that runs `realsense2_camera` + rosbridge, then point the sandbox plugin at it on the `openshell-docker` bridge IP. This is closer to "Method A with the host removed" and is usually simpler than patching the sandbox spec.

#### B.4 Custom egress policies for ROS / RealSense apt repos

If you ever rebuild inside the sandbox (e.g. `apt-get install ros-humble-…`) you'll need a NemoClaw policy preset that opens:

- `packages.ros.org:443`
- `librealsense.intel.com:443`
- `archive.ubuntu.com:80,443`, `security.ubuntu.com:80,443` (transitive apt deps)

Author the preset the same way `scripts/agenticros-rosbridge.policy.yaml` is structured, then apply with `nemoclaw nemo policy-add --from-file <preset>.yaml --yes`.

#### B.5 Configure + use

Steps A.5 (config block) and A.9 (chat) still apply. You can skip A.1 (host install), A.3–A.4 (copy + register — the Dockerfile did that already), and A.6 (rosbridge policy — internal traffic, no policy needed unless OpenShell decides otherwise).

## Part 3 — Daily commands cheat sheet

### NemoClaw lifecycle

```bash
# Status / health
nemoclaw nemo status                       # phase, model, policies, network policy
nemoclaw nemo doctor --json                # in-depth health check
nemoclaw list                              # all sandboxes

# Connect / chat
nemoclaw nemo dashboard-url --quiet        # authenticated URL with token (paste into browser)
nemoclaw nemo connect                      # ssh-style shell inside the sandbox
sandbox@…$ openclaw tui                    # local terminal chat

# Logs
nemoclaw nemo logs --follow                # all sandbox stdout/stderr
nemoclaw nemo logs -n 200                  # last 200 lines, no follow
docker logs $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') -f \
    2>&1 | grep -i agenticros              # just AgenticROS plugin lines

# Restart / recover
nemoclaw nemo recover                      # restart gateway only (keeps state)
docker restart $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
                                           # nuclear option — restarts the whole sandbox container

# Destroy
nemoclaw nemo destroy --yes                # stop + remove sandbox
                                           # (the built sandbox image remains in docker)
```

### Method A — Hybrid runtime

```bash
# Terminal 1 — host ROS stack (RealSense + rosbridge + cmd_vel relay)
cd ~/Projects/agenticros
./scripts/run_nemoclaw_host_stack.sh humble \
    robot_namespace:=<YOUR_NAMESPACE> \
    align_depth:=true

# Terminal 2 — chat
nemoclaw nemo dashboard-url --quiet    # browser-based chat
# OR
nemoclaw nemo connect
sandbox@…$ openclaw tui

# Terminal 3 — watch the bridge
docker logs $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') -f \
    2>&1 | grep -E "agenticros|ROS2 transport|rosbridge"

# One-shot health check — runs 6 assertions (container, policy, rosbridge,
# proxy decision, live WS roundtrip, dashboard body). Exits 0 if all green.
./scripts/smoke_test_nemoclaw.sh

# Plugin redeploy after code change
cd ~/Projects/agenticros
pnpm build && pnpm --filter @agenticros/agenticros deploy --prod /tmp/agenticros-deploy
rm -f /tmp/agenticros-deploy/node_modules/.pnpm/node_modules/@agenticros/agenticros
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec "$CONTAINER" rm -rf /sandbox/agenticros
docker cp /tmp/agenticros-deploy/. "$CONTAINER:/sandbox/agenticros/"
docker exec "$CONTAINER" chown -R sandbox:sandbox /sandbox/agenticros
nemoclaw nemo recover
```

### Method B — Full embed runtime

```bash
# Rebuild the sandbox image after edits to the Dockerfile
nemoclaw nemo destroy --yes
nemoclaw onboard --from /path/to/Dockerfile --name nemo \
                 --recreate-sandbox \
                 --yes-i-accept-third-party-software

# Inside the sandbox, ROS 2 commands work as normal (since they're baked in):
nemoclaw nemo connect
sandbox@…$ source /opt/ros/humble/setup.bash
sandbox@…$ ros2 launch realsense2_camera rs_launch.py
sandbox@…$ ros2 launch rosbridge_server rosbridge_websocket_launch.xml &
sandbox@…$ openclaw tui
```

### Policy management

```bash
# Inspect current policies
nemoclaw nemo policy-list

# Add the AgenticROS rosbridge preset (Method A)
cd ~/Projects/agenticros
nemoclaw nemo policy-add --from-file scripts/agenticros-rosbridge.policy.yaml --yes

# Remove a preset
nemoclaw nemo policy-remove agenticros-rosbridge --yes

# Dry-run any policy change
nemoclaw nemo policy-add --from-file ./mypolicy.yaml --dry-run

# /etc/hosts aliases inside the sandbox
nemoclaw nemo hosts-list
nemoclaw nemo hosts-add my-robot.local 192.168.1.50
```

### Inspecting the sandbox config

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')

# Show the AgenticROS plugin entry only
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" \
    jq '.plugins.entries.agenticros' /sandbox/.openclaw/openclaw.json

# Show all enabled plugins
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" \
    jq '[.plugins.entries | to_entries[] | select(.value.enabled == true) | .key]' \
    /sandbox/.openclaw/openclaw.json
```

## Switching the inference model

NemoClaw routes every chat through whatever model `nemoclaw inference get` reports. The current value is set during `nemoclaw onboard` but can be changed at any time without re-onboarding. The two situations covered below are configuring the recommended local-Ollama setup (a single multimodal model that handles both tool calling and vision), and switching the whole provider over to OpenAI or NVIDIA-hosted inference.

> **Important — vision vs. text-only:** the `ros2_camera_snapshot` tool returns a structured image content block (`{ type: "image", data: base64, mimeType }`), which means the model *only* describes what's in the frame if it actually has a vision encoder. The recommended `qwen3-vl:8b-instruct` route handles this end-to-end, but if you ever switch to a text-only model (e.g. `nemotron-3-super-120b-a12b`, `llama3.1:8b`, `qwen2.5:7b`) the agent will run the tool successfully, embed the snapshot URL in the chat UI, and say something like *"Here is a snapshot."* without describing the scene — that is the model literally not being able to see the image, not a tool bug. For "what does the robot see?" you need a **VLM / multimodal model**.

> **TL;DR for Jetson Orin AGX:** the [Local Ollama setup](#local-ollama-unified-qwen3-vl8b-instruct-recommended) below is what we recommend and what NemoClaw is onboarded with by default. One 6 GB model (`qwen3-vl:8b-instruct`), handles tool calling and vision natively, no second describer model needed. The hosted-provider sub-sections (`OpenAI`, `NVIDIA-hosted`) are kept for x86 NemoClaw — on Jetson L4T they hit an unfixed streaming-router bug; see those sections for details.

### Local Ollama: unified `qwen3-vl:8b-instruct` (recommended)

This is the **simplest** working setup on Jetson L4T with NemoClaw `v0.0.48` + OpenClaw `2026.4.24`: **one model that handles both tool calling and vision natively, no auto-describer needed, no in-plugin describer needed**. `qwen3-vl` is the first Qwen-family VLM that Ollama also tags as `tools`-capable, so the same weights answer the chat, emit OpenAI-style `tool_calls`, and see the image attached to a tool result — without OpenClaw having to filter image blocks out or route to a second model.

**Use the `-instruct` variant, NOT the bare tag.** `qwen3-vl:8b` is the reasoning/"thinking" build; on Ollama it ignores `think: false` and burns the entire `num_predict` budget on hidden `<think>` tokens before emitting any visible content, so every tool call returns `finish_reason: length` with `tool_calls: []`. Upstream maintainers explicitly say "if you don't want thinking, use the instruct version" ([ollama/ollama#14798](https://github.com/ollama/ollama/issues/14798), [#13353](https://github.com/ollama/ollama/issues/13353)). The `-instruct` tag is a separate model file, ~6.1 GB Q4_K_M, same 8.8 B params.

**Memory budget on Orin AGX (30 GiB iGPU pool).** `qwen3-vl:8b-instruct` resident with the 32 K context KV cache is ~12 GiB; the OpenClaw system prompt + 35-tool catalog adds another ~5 GiB of compute-side memory. Headroom is fine for one model. Do **not** try to keep `llama3.1:8b` or `qwen2.5vl:7b` resident at the same time — they'll co-evict (we observed the auto-describer take a 32 s cold-load hit between every snapshot in the two-model setup). Just unload them:

```bash
curl -s http://localhost:11434/api/generate -d '{"model":"llama3.1:8b","keep_alive":0}'   >/dev/null
curl -s http://localhost:11434/api/generate -d '{"model":"qwen2.5vl:7b","keep_alive":0}'  >/dev/null
ollama rm llama3.1:8b qwen2.5vl:7b   # optional — saves ~11 GB disk if you don't need them
```

#### Setup (5 steps)

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')

# 1. Pull the instruct variant (6.1 GB). Requires Ollama 0.12.7+.
ollama pull qwen3-vl:8b-instruct

# 2. Pre-warm with a 60-min keep-alive (cold-load is ~32 s on Orin AGX).
curl -s -m 90 http://localhost:11434/api/generate \
    -d '{"model":"qwen3-vl:8b-instruct","prompt":"hi","stream":false,"keep_alive":"60m"}' >/dev/null

# 3. Point NemoClaw's inference route at it (this also syncs the per-agent model identity).
nemoclaw inference set --provider ollama-local --model qwen3-vl:8b-instruct --sandbox nemo --no-verify
nemoclaw inference get
# → Provider: ollama-local
#   Model:    qwen3-vl:8b-instruct

# 4. CRITICAL: `nemoclaw inference set` writes `input: ["text"]` for the
#    new model regardless of its actual capabilities, which causes OpenClaw
#    to OMIT image content blocks from tool results (the `image-ChxVuvXM.js`
#    image filter resolves it as text-only and tags every snapshot tool
#    result with "(tool image omitted: model does not support images)").
#    Patch the catalog to declare it multimodal in BOTH the root config
#    AND the per-agent override:
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  for f in /sandbox/.openclaw/openclaw.json /sandbox/.openclaw/agents/main/agent/models.json; do
    jq "
      ((.models.providers.inference.models // .providers.inference.models)[]
        | select(.id == \"qwen3-vl:8b-instruct\")
        | .input) = [\"text\", \"image\"]
    " \"$f\" > \"$f.tmp\" && mv \"$f.tmp\" \"$f\"
  done
'

# 5. Bump the LLM idle timeout from 120 s → 480 s. The 35-tool OpenClaw
#    catalog + 29 KB system prompt expands to ~20 K input tokens; prompt
#    processing on the Orin AGX iGPU takes 3–4 min for the FIRST cold
#    pass through the prompt (subsequent passes hit the KV cache and
#    finish in 10–60 s). At 120 s the gateway gives up before Ollama
#    even returns the first token, retries, and ping-pongs forever.
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  jq ".agents.defaults.llm.idleTimeoutSeconds = 480" \
     /sandbox/.openclaw/openclaw.json > /sandbox/.openclaw/openclaw.json.tmp && \
  mv /sandbox/.openclaw/openclaw.json.tmp /sandbox/.openclaw/openclaw.json
'

# 6. (Optional but recommended) Disable the in-plugin describer — the
#    primary now sees images directly, so the side-call to a VL model is
#    pure overhead. Skip this step if you also want a guaranteed text
#    description embedded in the tool result text (belt and suspenders).
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  jq ".plugins.entries.agenticros.config.describer.enabled = false" \
     /sandbox/.openclaw/openclaw.json > /sandbox/.openclaw/openclaw.json.tmp && \
  mv /sandbox/.openclaw/openclaw.json.tmp /sandbox/.openclaw/openclaw.json
'
```

OpenClaw watches `openclaw.json` and hot-reloads `models.providers.inference.models` and `agents.defaults.llm` without a gateway restart. The describer change requires a restart (`nemoclaw nemo recover`).

#### Verify the wiring

```bash
docker exec $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') \
    openclaw models list 2>&1 | grep qwen3-vl
# Expected:
#   inference/qwen3-vl:8b-instruct   text+image   128k   yes   yes   default
```

The Input column **must** read `text+image`. If it reads `text` alone, step 4 didn't apply and the model will hallucinate scene descriptions from the snapshot URL filename instead of the bytes (we observed exactly this: "wall with a light switch and a door", "tiled floor" — none of which were in the actual frame).

#### Sanity prompt + expected end-to-end timing

> *"Use ros2_camera_snapshot and tell me in detail what you see."*

Flow (one user prompt → ~6 minutes wall-clock on the first turn, ~1 minute on subsequent turns once Ollama's prompt-prefix cache is warm):

```
user prompt
   │ ~3–4 min prompt processing on cold cache
   ▼
qwen3-vl:8b-instruct ── tool_calls: [ros2_camera_snapshot] ──▶ agenticros plugin
                                                                    │
                                                          captured JPEG bytes
                                                                    │
   ┌── tool result (text-only "Captured one frame..." + markdown link)
   │   PLUS a follow-up user message OpenClaw adds:
   │   { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
   ▼
qwen3-vl:8b-instruct ── final assistant message with grounded scene description
                       (matches the actual frame: people, objects, colors, layout)
```

Two characteristics to watch for on the wire (`/tmp/ollama-proxy-requests.log` if you have the auth-proxy logging build running):

- **Request 1** is ~80 KB, `msgs_count=2`, `tools_count=35`, `model: qwen3-vl:8b-instruct`. Response is ~700 bytes with `finish_reason: tool_calls` and a structured `tool_calls[]` array. If `finish_reason` is `stop` and `aggregated_content` contains a JSON snippet with ```{"name":"ros2_camera_snapshot","parameters":{...}}``` wrapped in backticks, the model emitted a text-based fake tool call. That means OpenClaw's meta-tool catalog is enabled — see the next subsection on patching `selection-*.js`.
- **Request 2** is ~200 KB. The 120 KB jump is the `data:image/jpeg;base64,...` block OpenClaw appends as a follow-up user message after the tool result. If request 2 is only ~85 KB and `msg[4]` is missing entirely (or `msg[3]` says "(tool image omitted: model does not support images)" in its text), the catalog `input` array doesn't include `image` — step 4 above didn't take, or `nemoclaw inference set` was re-run and wiped it.

#### Disable OpenClaw's meta-tool catalog (one-time patch)

NemoClaw by default wraps every OpenClaw tool behind three meta-tools — `tool_call`, `tool_describe`, `tool_search` — so the model only sees those three in its `tools` array and has to nest the real tool name + arguments inside `tool_call.arguments`. The wrapper schema declares `tool_call.arguments` as an *object*, but the OpenAI spec says `function.arguments` is a JSON-encoded *string*. Capable models (`llama3.1:8b`, `qwen3-vl:8b-instruct`) follow the spec, serialize their arguments as a string, and OpenClaw's validator then rejects them — so the tool never runs and the model emits text-based fallback JSON. To bypass:

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec -u root "$CONTAINER" sh -c '
  SEL=$(ls /usr/local/lib/node_modules/openclaw/dist/selection-*.js | head -1)
  # Invert the env-var default: opt-IN to the meta-tool catalog instead of opt-out
  sed -i "s/process.env.NEMOCLAW_TOOL_CATALOG !== \"0\"/process.env.NEMOCLAW_TOOL_CATALOG === \"1\"/" "$SEL"
  grep nemoClawToolCatalogEnabled "$SEL"
'
nemoclaw nemo recover
```

After this, OpenClaw exposes the 35 ROS + system tools directly to the model as normal OpenAI functions. The model picks them by name and OpenClaw routes them to the underlying handlers without the meta-wrapper roundtrip. The patch is forward-compatible — set `NEMOCLAW_TOOL_CATALOG=1` in the container env to opt back into the meta-catalog if a future model can't handle the direct tool list. *Note: a NemoClaw upgrade overwrites `selection-*.js`; re-apply after upgrading.*

#### Why a single multimodal model is the right shape on Jetson

Earlier iterations of this guide ran two Ollama models in parallel — a text+tools primary (`qwen2.5:7b`) and a vision-only auto-describer (`qwen2.5vl:7b`) wired via `agents.defaults.imageModel`. That setup is no longer recommended on Jetson Orin AGX, for three reasons that all surface as the same user-visible failure (generic hallucinated scene descriptions):

| | Two-model auto-describer (legacy) | Unified `qwen3-vl:8b-instruct` |
|---|---|---|
| Models resident in VRAM | 2 (≈ 12 GB + 11 GB = 23 GB) | 1 (≈ 12 GB) |
| Eviction risk on 30 GB iGPU | High — co-eviction adds ~32 s cold-load per snapshot | None |
| LLM round-trips per snapshot | 3 (primary → tool → describer → primary) | 2 (primary → tool → primary) |
| Image handling | VL captions to text; primary never sees pixels | Primary sees the JPEG directly — grounded descriptions, follow-up questions about the image work |
| Tool catalog clobbered by `inference set` | Both models' `input` arrays get wiped | One model's `input` array gets wiped (easier to re-patch) |
| Ollama tool-call compatibility | `qwen2.5vl:7b` rejects tool calls outright (`does not support tools`) | `qwen3-vl` is tagged `tools`-capable by Ollama |

The unified setup is strictly simpler and gives strictly more accurate descriptions, *if* you accept the 3–4 min cold-prompt-processing penalty on the first turn after a long idle. Subsequent turns reuse Ollama's prompt-prefix cache and finish in 10–60 s. Keep the model resident across idle gaps with `keep_alive: "60m"` (see [Setup step 2](#setup-5-steps)) and you only pay that penalty once per Ollama restart.

### Switching from local Ollama to OpenAI

> **Known Jetson limitation — read this first.** On Jetson L4T running NemoClaw `v0.0.48` + OpenClaw `2026.4.24`, **no public-TLS inference provider works end-to-end for streaming chat** — confirmed broken for both `openai-api` (gpt-4o, gpt-4o-mini) and `nvidia-prod` (nemotron-3-super-120b-a12b). Every individual layer reports healthy: the non-streaming `/v1/models` probes succeed (`nemoclaw nemo doctor` confirms `Provider health: ... reachable`), `nemoclaw inference set` validates `/v1/chat/completions` with HTTP 200, the egress policy is loaded, and the credential is stored — but actual chat from the dashboard fails with `503 "inference service unavailable"` returned by the openshell-router itself, before the request leaves the sandbox. The `/var/log/openshell.*.log` fingerprint is identical for both providers:
>
> ```
> ALLOWED inference.local:443
> INFO openshell_router: routing proxy inference request (streaming)
> OCSF NET:FAIL [LOW] inference.local:443
> ```
>
> and in `/tmp/openclaw/openclaw-*.log` (substituting whichever provider/model you're testing):
>
> ```
> embedded run agent end: ... model=<model> provider=<provider>
>     error=LLM request timed out. rawError=503 "inference service unavailable"
> ```
>
> The 503 originates inside the openshell-router (`/opt/openshell/bin/openshell-sandbox`) on the **streaming** path specifically — not from the upstream, not from a policy denial, not from missing credentials. We've reproduced this with `gpt-4o`, `gpt-4o-mini`, and `nvidia/nemotron-3-super-120b-a12b` after applying every plausible policy shape (`access: full`, `protocol: rest` + `rules: allow GET/POST /**`, with and without `binaries:` restrictions). The non-streaming validation paths work for all of them — which is why `nemoclaw inference set` happily reports `Validated Endpoints` with HTTP 200 and `nemoclaw nemo doctor` reports `reachable`. This is an unfixed bug in the streaming-routing path of NemoClaw's bundled openshell-router on Jetson.
>
> The working upstream pattern on Jetson today is the **private host bridge** (`host.openshell.internal:11434/11435`, used by `ollama-local`); everything routed through a public-TLS endpoint hits the streaming-path 503.
>
> **What to do until upstream fixes it:** stay on local Ollama. The [unified `qwen3-vl:8b-instruct` setup](#local-ollama-unified-qwen3-vl8b-instruct-recommended) gives you tool calling AND scene description from a single 6 GB model with zero API cost. The instructions below are kept for the case where you're on x86 NemoClaw or a future Jetson NemoClaw release fixes the streaming path — they're known to work on x86 NemoClaw.

Use this when local inference is too slow on your hardware, the model isn't strong enough for your prompts, or you want GPT-4o's vision quality (which is currently the gold standard for "describe what you see"). Requires an OpenAI API key and outbound network access from the sandbox.

```bash
# 1. Provide the key in your shell. The --credential flag below accepts
#    either KEY=VALUE inline or a bare KEY that's read from the
#    environment. The env-lookup form keeps the secret out of shell
#    history.
export OPENAI_API_KEY=sk-...

# 2. Register OpenAI as a provider in the OpenShell gateway. Two things
#    to know:
#      - --type is the provider *profile* (what credentials and base URL
#        to use). Run `openshell provider list-profiles` to see all
#        available; for OpenAI it's `openai`.
#      - --name is what NemoClaw expects when it later sets the route.
#        On Jetson NemoClaw v0.0.48 the expected name is `openai-api`,
#        NOT `openai`. If you register as `openai`, the inference set
#        step below fails with "provider 'openai-api' not found".
#    The credential is stored encrypted in OpenShell's secrets store;
#    you don't need OPENAI_API_KEY exported afterwards.
openshell provider create --name openai-api --type openai --credential OPENAI_API_KEY

# Sanity-check the provider was registered
openshell provider list

# 3. Switch the active inference route. NemoClaw uses the alias
#    `openai-api` (matching the provider name registered in step 2),
#    not `openai`. gpt-4o is the recommended default — multimodal +
#    tools, so the camera tool just works. gpt-4o-mini is the
#    cheap/fast fallback.
nemoclaw inference set --provider openai-api --model gpt-4o --sandbox nemo

# 4. Verify
nemoclaw inference get
# → {"provider":"openai-api","model":"gpt-4o"}
```

#### Open `api.openai.com:443` in the sandbox egress policy

The default sandbox policy does not include OpenAI's host, so without this step the agent will fail with `DENIED ... -> api.openai.com:443` in `/var/log/openshell.*.log` inside the sandbox container. NemoClaw ships a built-in `openai` preset for exactly this:

```bash
# Check whether the preset exists in your CLI version
nemoclaw nemo policy-list

# Apply it
nemoclaw nemo policy-add --preset openai --yes
```

Some NemoClaw CLI versions don't ship an `openai` built-in (NemoClaw `v0.0.48` on Jetson, for example, has presets for `discord`, `github`, `huggingface`, `slack`, `telegram`, `outlook`, `brave`, `wechat` — but no `openai`). In that case use the custom preset that ships in this repo (`scripts/openai.policy.yaml`). The preset must declare a `preset.name` block — without it `policy-add` rejects the file with *"Preset must declare preset.name (lowercase, hyphenated RFC 1123 label)"*. The shape:

```yaml
# scripts/openai.policy.yaml
preset:
  name: openai
  description: "OpenAI API access for inference (api.openai.com + cdn.openai.com)"

network_policies:
  openai:
    name: openai
    endpoints:
      - host: api.openai.com
        port: 443
        access: full
      - host: cdn.openai.com
        port: 443
        access: full
    binaries:
      - { path: /usr/local/bin/openclaw }
      - { path: /usr/local/bin/node }
      - { path: /usr/bin/node }
```

Apply it against the actual sandbox container name (NemoClaw expects the container name, not the sandbox alias `nemo`, for `--from-file`):

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
nemoclaw nemo policy-add --yes \
    --from-file scripts/openai.policy.yaml \
    "$CONTAINER"
```

Note: unlike the rosbridge preset, `allowed_ips` isn't needed here — `api.openai.com` resolves to public IPs, so the OpenShell SSRF guard (which only default-denies RFC1918 destinations) doesn't fire.

#### Bounce and verify

```bash
nemoclaw nemo recover

# Watch for the agent to come up against OpenAI
docker logs $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') -f \
    2>&1 | grep -iE 'inference|openai|provider'

# Smoke-test the robot bridge is still healthy
./scripts/smoke_test_nemoclaw.sh
```

Then ask the same vision verification prompt as above. With `gpt-4o`, expect a detailed scene description in 1–3 seconds (Jetson-bound latency is now network round-trip, not local GPU).

### Switching to NVIDIA-hosted inference (`nemotron-3-super-120b-a12b` via build.nvidia.com)

NemoClaw ships a built-in `nvidia` provider profile that talks to NVIDIA's hosted inference endpoints (`integrate.api.nvidia.com` and `inference-api.nvidia.com`). This is the natural alternative when:

- OpenAI doesn't work (see the [Jetson streaming-router warning](#switching-from-local-ollama-to-openai) — `openai-api` returns `503 "inference service unavailable"` on Jetson L4T at the time of writing),
- Local Ollama is too slow for your prompts,
- You want a recent NVIDIA-trained model (the `nemoclaw inference set --help` output recommends `nvidia/nemotron-3-super-120b-a12b` as the default route — 120B parameters, 12B active MoE, native tool calling).

> **Confirmed broken on Jetson L4T (NemoClaw v0.0.48 + OpenClaw 2026.4.24).** `nvidia-prod` hits exactly the same router-internal `503 "inference service unavailable"` as `openai-api` — verified with `nvidia/nemotron-3-super-120b-a12b` on May 22, 2026. The dashboard hangs after the opening message, and `/var/log/openshell.*.log` shows the identical `NET:FAIL [LOW] inference.local:443` fingerprint after `routing proxy inference request (streaming)`. Same bug, same `/opt/openshell/bin/openshell-sandbox` streaming-proxy code path. The setup steps below are still correct — they're known to work on x86 NemoClaw — but on Jetson all hosted inference (public-TLS upstreams) currently fails. Fall back to the [unified `qwen3-vl:8b-instruct` setup](#local-ollama-unified-qwen3-vl8b-instruct-recommended) until upstream fixes the router.

#### 1. Get an NVIDIA API key

1. Open <https://build.nvidia.com> and sign in (free NVIDIA developer account).
2. Browse to any inference model card — `nvidia/nemotron-3-super-120b-a12b`, `meta/llama-3.1-70b-instruct`, etc.
3. On the model card, click **Get API Key** in the right rail. You'll get a key starting with `nvapi-`. Keys are account-wide, not model-scoped — any model card hands you the same key.

Free-tier quotas at the time of writing are ~1000 credits/month for personal accounts (more for corporate emails). `nemotron-3-super-120b-a12b` is in NVIDIA's free eval program; if it ever gets gated behind paid credits, `meta/llama-3.1-70b-instruct` is firmly in the free tier and also supports tool calling.

#### 2. Register the provider and switch the route

```bash
# 1. Drop the key into your shell. The --credential lookup below is
#    in-memory; the value is stored encrypted in OpenShell's credential
#    store after registration. You do NOT need this env var afterwards.
export NVIDIA_API_KEY=nvapi-...

# 2. Register the provider. --type nvidia uses the built-in NVIDIA
#    profile (which already has the right base URL and the egress
#    policy is preloaded — see "Egress" below). --name nvidia-prod is
#    the alias used by `nemoclaw inference set --provider` afterwards;
#    you can pick any name, but `nvidia-prod` matches the example in
#    `nemoclaw inference set --help`.
openshell provider create --name nvidia-prod --type nvidia --credential NVIDIA_API_KEY

# Sanity check
openshell provider list   # should show nvidia-prod alongside ollama-local

# 3. Switch the active inference route. The hosted model identifier is
#    namespaced (publisher/model-id), as you can see on each model card.
nemoclaw inference set \
  --provider nvidia-prod \
  --model nvidia/nemotron-3-super-120b-a12b \
  --sandbox nemo

# 4. Verify the route was synced into the sandbox (the inference set
#    command does this automatically, but it's a good sanity check).
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" jq \
  '{primary: .agents.defaults.model.primary, providers: (.models.providers | keys)}' \
  /sandbox/.openclaw/openclaw.json
# Expected:
#   primary:   "nvidia-prod/nvidia/nemotron-3-super-120b-a12b"
#   providers: ["inference", "nvidia-prod", ...]
```

#### 3. Egress — no policy work required

Unlike OpenAI (which needs you to apply `scripts/openai.policy.yaml` by hand), the `nvidia` preset is **already loaded** as a built-in:

```bash
openshell policy get --full nemo | grep -A 20 '^  nvidia:'
```

The built-in policy uses the REST-aware shape (`protocol: rest`, narrowly scoped `rules: allow POST /v1/chat/completions`, etc.) and covers both `integrate.api.nvidia.com:443` and `inference-api.nvidia.com:443`. If for some reason `policy get` shows the `nvidia` block missing, force-apply it with `nemoclaw nemo policy-add --preset nvidia --yes`.

#### 4. Live test (DO NOT `nemoclaw nemo recover`)

Skip `nemoclaw nemo recover` — it gives false-negative probe failures on Jetson (see the [recover false-negative bullet](#troubleshooting) in Troubleshooting). The gateway hot-reloads the inference route automatically. Refresh the dashboard tab and ask:

> *"Reply with exactly the word PONG, nothing else."*

If you get `PONG` back in a couple of seconds, the route works end-to-end. Then try the camera prompt:

> *"Use ros2_camera_snapshot, then describe what you see."*

#### 5. Vision for a text-only hosted primary

`nvidia/nemotron-3-super-120b-a12b` is a text + tools model — at this writing it has no native vision encoder. If you need scene description while keeping a hosted text primary, switch the primary to an NVIDIA-hosted multimodal model instead — `meta/llama-3.2-90b-vision-instruct` is the most established free-tier option, the same `nvidia-prod` provider entry handles both (no second provider registration needed):

```bash
nemoclaw inference set --provider nvidia-prod --model meta/llama-3.2-90b-vision-instruct --sandbox nemo
```

If you specifically need `nemotron-3-super-120b-a12b` for its reasoning/tool quality AND scene description on the same chat, the cleanest path today is to **leave the hosted route alone for tool reasoning** and **fall back to local `qwen3-vl:8b-instruct` whenever you want to describe what the robot sees** — switch routes with one `nemoclaw inference set` call, no media-understanding/auto-describer wiring required. (The legacy `agents.defaults.imageModel` flow that previously layered a local VL on top of the hosted text primary depended on the same two-model auto-describer Jetson can no longer keep both resident — see [Why a single multimodal model is the right shape on Jetson](#why-a-single-multimodal-model-is-the-right-shape-on-jetson).)

#### 6. Available NVIDIA-hosted models worth knowing

| Model | What it's good for | Free-tier | Vision |
|---|---|---|---|
| `nvidia/nemotron-3-super-120b-a12b` | Tool calling, reasoning, long context — the recommended default per the `nemoclaw inference set` example | yes (eval program) | no |
| `meta/llama-3.1-70b-instruct` | Generic tool-capable instruct model, well-tested | yes | no |
| `meta/llama-3.2-90b-vision-instruct` | Multimodal primary — use as the active model when you need scene description with hosted inference | yes | yes |
| `nvidia/nv-embedqa-e5-v5` | Embeddings (if you wire memory) | yes | n/a |

Browse the full catalog at <https://build.nvidia.com/explore/discover> — anything that exposes `/v1/chat/completions` will work as a route here.

### Switching back

To go back to local Ollama from any hosted provider (OpenAI, NVIDIA, Anthropic, etc.):

```bash
# Recommended on Jetson: unified qwen3-vl:8b-instruct (tools + vision in one model)
nemoclaw inference set --provider ollama-local --model qwen3-vl:8b-instruct --sandbox nemo --no-verify
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
# Re-apply the multimodal input-array patch — `nemoclaw inference set` always writes
# input: ["text"] regardless of the model's actual capabilities.
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  for f in /sandbox/.openclaw/openclaw.json /sandbox/.openclaw/agents/main/agent/models.json; do
    jq "((.models.providers.inference.models // .providers.inference.models)[]
          | select(.id == \"qwen3-vl:8b-instruct\") | .input) = [\"text\",\"image\"]" \
       \"$f\" > \"$f.tmp\" && mv \"$f.tmp\" \"$f\"
  done
'
# NO `nemoclaw nemo recover` — hot-reload picks it up and the probe gives
# false negatives anyway. See the troubleshooting bullet.
```

Hosted provider entries (`openai-api`, `nvidia-prod`, …) stay registered in OpenShell with their credentials, so you don't need to recreate them next time you switch. To wipe a credential entirely:

```bash
openshell provider delete openai-api
openshell provider delete nvidia-prod
```

### Inspecting / debugging the inference route

```bash
# What NemoClaw thinks the active route is
nemoclaw inference get --json

# Full list of provider *aliases* NemoClaw accepts for --provider
# (the union of built-in NVIDIA routes and any providers you've
# registered via `openshell provider create`)
nemoclaw inference set --help

# What provider *profiles* OpenShell ships (use one of these as --type
# when registering a provider)
openshell provider list-profiles

# What the OpenShell gateway has registered (the actual providers, by
# --name from `openshell provider create`)
openshell inference get
openshell provider list

# What OpenClaw inside the sandbox sees, with per-model capability flags
docker exec $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') \
    openclaw models list

# Live network decisions (handy when the model fails silently — e.g. an
# OpenAI request that's getting blocked by the egress policy)
docker exec $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') \
    tail -50 /var/log/openshell.$(date +%Y-%m-%d).log \
    | grep -E 'api.openai.com|ollama|inference|DENIED'
```

## Troubleshooting

- **`docker cp` complains `invalid symlink … -> "../../../../../../home/nvidia/Projects/agenticros/..."`** — pnpm leaves a self-reference symlink in `node_modules/.pnpm/node_modules/@agenticros/agenticros` that points back into the source tree. Delete it before `docker cp`:
  ```bash
  rm -f /tmp/agenticros-deploy/node_modules/.pnpm/node_modules/@agenticros/agenticros
  ```

- **`EACCES: permission denied, mkdir '/root/.openclaw/...'`** when running `openclaw plugins install` as the sandbox user — the default `HOME` inherited from `docker exec` is `/root`, not the sandbox user's home. Pass `-e HOME=/sandbox`:
  ```bash
  docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" openclaw plugins install -l /sandbox/agenticros
  ```

- **Gateway logs `WebSocket error connecting to ws://host.docker.internal:9090` forever** — four usual causes:
  1. Rosbridge isn't running on the host yet — start `./scripts/run_nemoclaw_host_stack.sh humble …` and check `ss -ltnp | grep 9090` shows it bound to `0.0.0.0:9090`.
  2. The policy preset wasn't applied — re-run `nemoclaw nemo policy-add --from-file scripts/agenticros-rosbridge.policy.yaml --yes`.
  3. Rosbridge bound to `127.0.0.1` instead of `0.0.0.0` — pass `rosbridge_address:=0.0.0.0` (the default in our launch file).
  4. The policy preset is loaded but missing `allowed_ips` — see the SSRF bullet below.

  Fastest one-shot diagnosis: `./scripts/smoke_test_nemoclaw.sh`. Sanity check from inside the sandbox:
  ```bash
  docker exec "$CONTAINER" getent hosts host.docker.internal   # should print 172.19.0.1
  ```

- **Proxy returns `HTTP/1.1 403 Forbidden` for `CONNECT host.docker.internal:9090`** — there are two completely separate denial paths and the proxy returns the same 403 for both, so always check `/var/log/openshell.*.log` inside the sandbox to find out which one:
  ```bash
  docker exec "$CONTAINER" tail -50 /var/log/openshell.$(date +%Y-%m-%d).log | grep host.docker.internal
  ```
  - `engine:opa` with `reason:endpoint host.docker.internal:9090 not in policy 'X'` — the preset isn't loaded at all. Apply it and `nemoclaw nemo recover`.
  - `engine:ssrf` with `reason:host.docker.internal resolves to internal address 172.19.0.1, connection rejected` — the preset is loaded but the SSRF guard, which runs *in front of* OPA, default-denies private IPs. Add `allowed_ips: [10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16]` to each endpoint in `scripts/agenticros-rosbridge.policy.yaml`, re-apply with `nemoclaw nemo policy-add --yes …`, and verify with `openshell policy get --full nemo | grep -A 12 agenticros_rosbridge`.

  The shipped `scripts/agenticros-rosbridge.policy.yaml` already includes both `access: full, tls: skip` (so the proxy makes a raw L4 CONNECT tunnel for `ws://`) and `allowed_ips`. If you regenerate the file by hand, both blocks are required.

- **`openclaw plugins list` hangs** — listing instantiates plugins, and AgenticROS's reconnect loop keeps it alive. Inspect the registered config directly instead (see "Inspecting the sandbox config" above).

- **Multimodal primary describes a generic scene instead of the actual frame, and the gateway log contains `tool image omitted: model does not support images`** — OpenClaw's `resolveGatewayModelSupportsImages` checks the active model's `input` array in `/sandbox/.openclaw/openclaw.json → models.providers.inference.models[]`. `nemoclaw inference set` writes `input: ["text"]` for every new model regardless of its actual capabilities, so even after switching to `qwen3-vl:8b-instruct` the gateway thinks it's text-only and filters the image bytes out before the second LLM call. **Fix**: patch the `input` field for the model in *both* the root `openclaw.json` and the per-agent `agents/main/agent/models.json`:
  ```bash
  CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
  docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
    for f in /sandbox/.openclaw/openclaw.json /sandbox/.openclaw/agents/main/agent/models.json; do
      jq "((.models.providers.inference.models // .providers.inference.models)[]
            | select(.id == \"qwen3-vl:8b-instruct\") | .input) = [\"text\",\"image\"]" \
         \"$f\" > \"$f.tmp\" && mv \"$f.tmp\" \"$f\"
    done
  '
  ```
  Confirm `inference/qwen3-vl:8b-instruct` shows `text+image` in the Input column:
  ```bash
  docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" openclaw models list | grep qwen3-vl
  ```
  OpenClaw hot-reloads `openclaw.json` — no gateway restart needed. (See [Setup step 4](#setup-5-steps) in the unified-model section for the full recipe.)

- **First chat turn after a long idle times out with `LLM request timed out`, even though Ollama eventually produces a valid response** — on Jetson Orin AGX the iGPU takes 3–4 minutes to prompt-process the ~20 K input tokens from OpenClaw's 35-tool catalog + 29 KB system prompt on a cold cache. The gateway's default `agents.defaults.llm.idleTimeoutSeconds` is 120 s, so it gives up before Ollama emits a single token, retries, and ping-pongs forever. Subsequent turns hit Ollama's prompt-prefix cache and finish in 10–60 s, but the first turn after the LLM cools off (`keep_alive` default 5 min) is always slow. **Fix**: bump the idle timeout to ~480 s in the root openclaw.json — the path is `agents.defaults.llm.idleTimeoutSeconds`, **not** `agents.defaults.llmIdleTimeout` or similar:
  ```bash
  CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
  docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
    jq ".agents.defaults.llm.idleTimeoutSeconds = 480" \
       /sandbox/.openclaw/openclaw.json > /sandbox/.openclaw/openclaw.json.tmp && \
    mv /sandbox/.openclaw/openclaw.json.tmp /sandbox/.openclaw/openclaw.json
  '
  ```
  Also set Ollama's keep-alive to keep the model resident across idle gaps, eliminating the cold-load entirely after the first warmup:
  ```bash
  curl -s -m 90 http://localhost:11434/api/generate \
      -d '{"model":"qwen3-vl:8b-instruct","prompt":"hi","stream":false,"keep_alive":"60m"}' >/dev/null
  ```

- **`qwen3-vl:8b` returns `finish_reason: length` with empty content and an empty `tool_calls[]` array even at `max_tokens: 2000`** — the bare `qwen3-vl:8b` tag is the *thinking* variant. It opens every response with a long internal `<think>...</think>` block, burns the entire `num_predict` budget on hidden reasoning tokens, and never reaches the visible answer. Ollama strips the `<think>` block from the streamed content but doesn't return it as a separate field, so to the gateway it just looks like a model that exhausted its token budget producing nothing. **Fix**: use the explicit non-thinking variant `qwen3-vl:8b-instruct` (separate model file, ~6.1 GB):
  ```bash
  ollama pull qwen3-vl:8b-instruct
  nemoclaw inference set --provider ollama-local --model qwen3-vl:8b-instruct --sandbox nemo --no-verify
  # Then re-apply the multimodal input-array patch (see image-omitted entry above).
  ```
  Upstream maintainers confirm `think: false` is silently ignored on the base variant ([ollama/ollama#14798](https://github.com/ollama/ollama/issues/14798), [#13353](https://github.com/ollama/ollama/issues/13353)) — the `-instruct` tag is the only way to disable thinking. Same model family, same weights, same context window, just without the reasoning tokens.

- **Agent describes a generic indoor scene that doesn't match what the camera is actually showing** — classic "model never saw the image" hallucination. With the recommended `qwen3-vl:8b-instruct` setup, this means one of two things has gone wrong:

  1. **OpenClaw thinks the model is text-only and is filtering the image out of the tool result.** Symptom: `/tmp/gateway.log` (or the proxy capture) contains `tool image omitted: model does not support images`. This is the `nemoclaw inference set` catalog-clobber bug — `inference set` writes `input: ["text"]` regardless of the model's actual capabilities. Re-apply the multimodal input-array patch from the [image-omitted entry above](#multimodal-primary-describes-a-generic-scene-instead-of-the-actual-frame-and-the-gateway-log-contains-tool-image-omitted-model-does-not-support-images) (and confirm `openclaw models list | grep qwen3-vl` shows the Input column reading `text+image`, not `text`).
  2. **The model is using a different (text-only) tag.** Run `nemoclaw inference get` and confirm it reports `qwen3-vl:8b-instruct`, not `qwen3-vl:8b` (the thinking variant — see the `finish_reason: length` entry above), not `llama3.1:8b`, and not `qwen2.5:7b`. If it doesn't, re-set:
     ```bash
     nemoclaw inference set --provider ollama-local --model qwen3-vl:8b-instruct --sandbox nemo --no-verify
     # Then re-apply the multimodal input-array patch.
     ```

  Historical note for context (no action needed if you're on `qwen3-vl:8b-instruct`): earlier iterations of this guide used `qwen2.5:7b` as the text+tools primary or `llama3.1:8b` after that. The Qwen2.5 family is **incompatible with OpenClaw's structured tool-call path on Ollama** — `qwen2.5:7b` emits arguments at the top level or drops `name` (`Validation failed for tool "tool_call": arguments: must have required properties arguments`), and `qwen2.5-coder:7b` emits the correct `{name, arguments}` JSON as a *string* in `content` instead of the OpenAI-structured `tool_calls` array, which Ollama's templates don't lift out. In either case the chat shows the model "calling" the tool, but `/tmp/gateway.log` has no `ros2_camera_snapshot:` line and the snapshot is never taken. The unified `qwen3-vl:8b-instruct` setup avoids this entirely — `qwen3-vl` is tagged `tools`-capable by Ollama and emits proper structured `tool_calls`.

- **`nemoclaw inference set` exits with `failed to verify inference endpoint for provider 'ollama-local' ... at 'http://host.openshell.internal:11435/v1': failed to connect`** — the verification probe runs from a place that can't resolve `host.openshell.internal` (the openshell-gateway container has no entry for it in `/etc/hosts` on Jetson). The runtime traffic still works because it goes through the OPA proxy from the sandbox netns, which does resolve the name. Re-run with `--no-verify` to skip the probe — but be aware that this also skips the capability probe (see previous bullet).

- **Dashboard chat hangs / times out with `LLM request timed out. rawError=503 "inference service unavailable"` when the inference provider is `openai-api` or `nvidia-prod` (or any other public-TLS upstream)** — on Jetson NemoClaw `v0.0.48` + OpenClaw `2026.4.24`, **all hosted inference providers are broken** at the openshell-router's streaming layer. Confirmed for both `openai-api` (gpt-4o, gpt-4o-mini) and `nvidia-prod` (nemotron-3-super-120b-a12b). The non-streaming validation paths (`nemoclaw inference set`, `nemoclaw nemo doctor`) report success because they don't exercise the broken code path. See [the warning at the top of the OpenAI section](#switching-from-local-ollama-to-openai) for the full diagnostic fingerprint. **There is no policy or credential fix from the user side.** Fall back to the [unified `qwen3-vl:8b-instruct` setup](#local-ollama-unified-qwen3-vl8b-instruct-recommended):
  ```bash
  nemoclaw inference set --provider ollama-local --model qwen3-vl:8b-instruct --sandbox nemo --no-verify
  CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
  # Re-apply the multimodal input-array patch (inference set always writes input: ["text"]).
  docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
    for f in /sandbox/.openclaw/openclaw.json /sandbox/.openclaw/agents/main/agent/models.json; do
      jq "((.models.providers.inference.models // .providers.inference.models)[]
            | select(.id == \"qwen3-vl:8b-instruct\") | .input) = [\"text\",\"image\"]" \
         \"$f\" > \"$f.tmp\" && mv \"$f.tmp\" \"$f\"
    done
  '
  ```
  Confirm with `docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" openclaw models list | grep qwen3-vl` — the Input column should read `text+image`.

- **`nemoclaw nemo recover` reports `Probe failed: OpenClaw gateway is not running in 'nemo' and automatic recovery failed`** — almost always a **false negative** on Jetson. The probe runs inside the sandbox's network namespace, where loopback access to the gateway's port is blocked by the sandbox sealing. Check the *real* state from the host instead:
  ```bash
  CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
  curl -sI http://127.0.0.1:18790/                              # the dashboard port on the host
  docker exec "$CONTAINER" ps -ef | grep openclaw-gateway        # pid should be present
  docker exec "$CONTAINER" tail -5 /tmp/gateway.log              # recent reload events
  ```
  If `curl` returns `HTTP/1.1 200 OK` and the gateway log shows `[gateway] ready` (and any subsequent `[reload] config hot reload applied` events), the gateway is fine — your config change has already been picked up by hot-reload and you don't need to recover. The dashboard URL is unchanged. You can safely ignore the probe failure.

  Note: `nemoclaw nemo recover` will also re-sync the active inference route from `/sandbox/.nemoclaw/config.json` if it decides the gateway is down. If you `nemoclaw inference set --provider X` and then `recover`, and `recover` thinks the gateway is dead, you may see the route revert to whatever `/sandbox/.nemoclaw/config.json` last had. **Just skip `recover` after a successful `inference set`** — the OpenShell router and OpenClaw both hot-reload the route automatically.

- **Camera frames don't show up but `ros2_list_topics` does** — check the topic exists and is `sensor_msgs/CompressedImage`:
  ```bash
  ros2 topic info /camera/camera/color/image_raw/compressed
  ```
  If only `/image_raw` is published, install `ros-<distro>-image-transport-plugins`. If you don't have compressed transport at all, set `robot.cameraTopic` in the sandbox config to `/camera/camera/color/image_raw` (raw); the AgenticROS plugin handles both `Image` and `CompressedImage`.

- **`Sandbox 'connect' does not exist.`** — `nemoclaw connect` (no sandbox name) doesn't work in this CLI version; always use `nemoclaw <name> connect` (e.g. `nemoclaw nemo connect`).

- **Port 18789 already in use** — NemoClaw automatically falls back to 18790 (visible in the install log). Both `nemoclaw nemo dashboard-url` and the browser URL track the actual port; don't hard-code 18789.

- **Onboarding got interrupted** — re-run `nemoclaw onboard --resume`. The wizard skips completed steps (preflight, provider selection, inference) and picks up where it stopped.

- **Jetson L4T quirk: `Failed to read host aliases. unknown shorthand flag: 'n' in -n`** — this is an upstream bug in `nemoclaw <name> hosts-list` on certain CLI versions (it shells out to `docker` with a wrong flag). Workaround: read host aliases via `docker inspect $CONTAINER --format '{{.HostConfig.ExtraHosts}}'`.

## What's installed where (cheat sheet)

| Thing | Host path | Sandbox path |
|---|---|---|
| NemoClaw CLI | `~/.local/bin/nemoclaw` | — |
| NemoClaw state | `~/.nemoclaw/`, `~/.local/state/nemoclaw/` | `/sandbox/.nemoclaw/` |
| OpenClaw CLI | — | `/usr/local/bin/openclaw` |
| OpenClaw config | — | `/sandbox/.openclaw/openclaw.json` |
| Built-in plugins | — | `/usr/local/lib/node_modules/openclaw/dist/extensions/` |
| Custom plugin extensions | — | `/sandbox/.openclaw/extensions/<plugin>` |
| AgenticROS plugin (Method A) | `~/Projects/agenticros/packages/agenticros` | `/sandbox/agenticros` (deploy bundle) |
| AgenticROS sources | `~/Projects/agenticros/` | — |
| ROS 2 | `/opt/ros/humble/` | (Method B only) |
| ROS workspace install | `~/Projects/agenticros/ros2_ws/install/` | — |
| librealsense | `/usr/lib/aarch64-linux-gnu/librealsense2.so.*` | (Method B only) |
| RealSense udev rules | `/lib/udev/rules.d/99-realsense-libusb.rules` | — |
| Docker daemon config | `/etc/docker/daemon.json` | — |
| NemoClaw policy preset (this repo) | `~/Projects/agenticros/scripts/agenticros-rosbridge.policy.yaml` | — |
| Host launch script | `~/Projects/agenticros/scripts/run_nemoclaw_host_stack.sh` | — |
| Host launch file | `~/Projects/agenticros/ros2_ws/src/agenticros_bringup/launch/realsense_rosbridge.launch.py` | — |
| Hybrid smoke test | `~/Projects/agenticros/scripts/smoke_test_nemoclaw.sh` | — |
| Sandbox decision log | — | `/var/log/openshell.YYYY-MM-DD.log` (read with `docker exec`) |
