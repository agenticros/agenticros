# AgenticROS on NVIDIA NemoClaw

[NVIDIA NemoClaw](https://github.com/NVIDIA/NemoClaw) packages OpenClaw inside an OpenShell sandbox container with policy-enforced egress and managed inference. This guide covers:

1. **Installing NemoClaw** on a Jetson (or any Linux box).
2. **Two ways to give the agent access to ROS 2, RealSense, and the AgenticROS plugin:**
   - **Method A — Hybrid (recommended):** ROS / RealSense / rosbridge on the **host**, only the AgenticROS plugin **inside the sandbox**, bridged over `host.docker.internal:9090`.
   - **Method B — Full embed:** ROS / RealSense / AgenticROS baked into a custom NemoClaw sandbox image via `nemoclaw onboard --from`.
3. **Daily commands** — what to type after the install to start, stop, watch logs, redeploy, and chat.

> Method A is the path the rest of this repo's scripts target. Method B is a sketch with a starting-point Dockerfile and the open issues you have to solve (USB passthrough, custom egress policy).

## Part 1 — Installing NemoClaw

These are the exact steps that succeeded on this Jetson (`nemoclaw v0.0.48`, NemoClaw sandbox build `1779389075`, OpenClaw `2026.4.24`, OpenShell `0.0.39`, Tegra L4T kernel 5.15).

### 1.1 Prerequisites

- Linux host with Docker installed (`docker --version`).
- The NemoClaw CLI (`nemoclaw`) on `PATH`. (NVIDIA's installer drops it at `~/.local/bin/nemoclaw`.)
- An inference provider you can reach from the host. The setup below uses **local Ollama** with `qwen2.5:7b` — install with `ollama pull qwen2.5:7b` first, and make sure `ollama serve` is up on `127.0.0.1:11434`.

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
  Model:    qwen2.5:7b (Local Ollama)
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

At this point the agent has no robot capabilities — it's just `qwen2.5:7b` talking to itself. The next part adds AgenticROS, RealSense, and ROS 2.

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

If the model doesn't reach for the tools, prompt it explicitly: *"Use the AgenticROS tools — call `ros2_list_topics` and then `ros2_camera_snapshot`."* Small local models (qwen2.5:7b) usually need that nudge; larger or function-tuned models pick it up on their own.

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

NemoClaw routes every chat through whatever model `nemoclaw inference get` reports. The current value is set during `nemoclaw onboard` but can be changed at any time without re-onboarding. There are two situations covered below: swapping one local Ollama model for another, and switching the whole provider over to OpenAI (or any other hosted API).

> **Important — vision vs. text-only:** the `ros2_camera_snapshot` tool returns a structured image content block (`{ type: "image", data: base64, mimeType }`), which means the model *only* describes what's in the frame if it actually has a vision encoder. `qwen2.5:7b` is **text-only** (no vision encoder), and so is the default `nemotron-3-super-120b-a12b` text route. With a text model the agent will run the tool successfully, embed the snapshot URL in the chat UI, and say something like *"Here is a snapshot."* without describing the scene — that is the model literally not being able to see the image, not a tool bug. For "what does the robot see?" you need a **VLM / multimodal model**.

### Switching between Ollama models (e.g. `qwen2.5:7b` → `qwen2.5vl:7b`)

Use this when you want to stay on local Ollama (no API costs, no egress policy changes) but pick a different model — most commonly to gain vision capability.

```bash
# 1. Inventory what's installed and what's loaded right now
ollama list                       # everything on disk
ollama ps                         # what's actually loaded into GPU/RAM

# 2. Pull the model you want. qwen2.5vl:7b is the natural drop-in upgrade
#    from qwen2.5:7b — same family, same prompt style, plus a vision encoder.
#    (~5.5 GB download; needs about 8 GB GPU RAM loaded at the default
#    32k context window.)
ollama pull qwen2.5vl:7b

# 3. Point NemoClaw at the new model. --provider stays the same; only
#    --model changes. This updates both the OpenShell inference route
#    AND the OpenClaw sandbox's openclaw.json in one shot.
#
#    NOTE: NemoClaw's pre-flight verify probe hits
#    http://host.openshell.internal:11435 (the ollama-auth-proxy NemoClaw
#    runs in front of your host's `ollama serve`). On Jetson, that
#    hostname doesn't resolve from the openshell-gateway container, so
#    the probe always returns "failed to connect". The traffic itself
#    works fine end-to-end — pass --no-verify to skip the broken probe.
nemoclaw inference set --provider ollama-local --model qwen2.5vl:7b --sandbox nemo --no-verify

# 4. Verify
nemoclaw inference get
# → {"provider":"ollama-local","model":"qwen2.5vl:7b"}

# 5. Bounce the gateway so OpenClaw re-queries the model's capabilities
nemoclaw nemo recover

# 6. Confirm the sandbox flags it as a vision model. The Input column
#    should read 'text+image', NOT 'text'.
docker exec $(docker ps --format '{{.Names}}' | grep '^openshell-nemo-') \
    openclaw models list 2>&1 | grep -i qwen2.5vl
# Expected:
#   inference/qwen2.5vl:7b   text+image   128k   yes   yes   default

# 7. If step 6 shows Input=text instead of text+image, NemoClaw's sync
#    code wrote a hardcoded `input: ["text"]` into openclaw.json (this
#    happens whenever --no-verify is used, because the capability probe
#    is skipped along with the connection probe). Patch it in place:
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  cd /sandbox/.openclaw && \
  jq "(.models.providers.inference.models[] | select(.id == \"qwen2.5vl:7b\") | .input) = [\"text\", \"image\"]" openclaw.json > openclaw.json.tmp && \
  mv openclaw.json.tmp openclaw.json
'
nemoclaw nemo recover

# 8. (Optional) free the old text model from disk
ollama rm qwen2.5:7b
```

Other Ollama vision tags that work in NemoClaw `2026.4.24+` (the capability-detection bug from OpenClaw 2026.2.x is fixed in this version):

| Tag | Size on disk | Notes |
|---|---|---|
| `qwen2.5vl:3b` | ~3.2 GB | Smallest qwen-VL. OK on Jetson Orin Nano 8 GB. |
| `qwen2.5vl:7b` | ~5.5 GB | Recommended baseline on Orin AGX 32 GB. |
| `qwen2.5vl:32b` | ~21 GB | Only if you have the RAM. |
| `llama3.2-vision:11b` | ~7.9 GB | Meta vision model. Different prompt style than qwen. |
| `llava-llama3:8b` | ~5.5 GB | LLaVA on Llama 3. Older but well-tested. |
| `moondream` | ~1.7 GB | Tiny + fast. Good for quick "is there a person in front of me?" type prompts; weak at long answers. |

Verification prompt once you've switched and bounced the gateway:

> *"Use ros2_camera_snapshot, then describe in detail what you see in the image — objects, colors, lighting, anything you can identify."*

A vision model produces a real scene description. A text-only model says "Here is a snapshot." with no detail.

### Two-model setup: text+tools primary with a vision auto-describer (local Ollama)

Use this when you want **both tool-calling AND scene description** but each single Ollama model on your shelf only supports one or the other:

- `qwen2.5:7b` supports tool/function calling, but is text-only (no vision encoder).
- `qwen2.5vl:7b` has a vision encoder, but Ollama explicitly rejects tool calls against the VL variants (`registry.ollama.ai` returns `qwen2.5vl:7b does not support tools (status code: 400)` if OpenClaw tries to send a tool list with the request).

Picking one means giving up the other — unless you configure OpenClaw's **media-understanding** flow. OpenClaw can be told to use a *primary* model for the chat and a *separate* model that gets invoked automatically to caption any image content (chat upload, or a tool result like `ros2_camera_snapshot`). The caption is injected as plain text into the conversation the primary model sees, so the primary never needs to be multimodal.

The wiring is `agents.defaults.imageModel` in the sandbox's `openclaw.json` (the key is read by `coerceToolModelConfig(cfg.agents.defaults.imageModel)` inside OpenClaw and routed to `describeImagesWithModel` whenever a tool returns image content).

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')

# 1. Pull both models on the host. Ollama keeps them on disk; only the
#    one being invoked is resident in GPU memory at a time (default
#    OLLAMA_KEEP_ALIVE = 5 min), so you don't pay for two slots at once
#    unless requests interleave faster than the eviction timer.
ollama pull qwen2.5:7b           # text + tools (primary)
ollama pull qwen2.5vl:7b         # text + image (auto-describer)

# 2. Set the active inference route to the tool-capable text model.
#    Every chat message hits this by default.
nemoclaw inference set --provider ollama-local --model qwen2.5:7b --sandbox nemo --no-verify
nemoclaw inference get   # → {"provider":"ollama-local","model":"qwen2.5:7b"}

# 3. Teach OpenClaw about BOTH models and point imageModel at the VL one.
#    The patch does four things in one shot:
#      - adds qwen2.5vl:7b to models.providers.inference.models
#      - fixes the input-capability flags on both
#        (qwen2.5:7b → ["text"], qwen2.5vl:7b → ["text","image"])
#      - sets agents.defaults.model.primary = inference/qwen2.5:7b
#      - sets agents.defaults.imageModel    = inference/qwen2.5vl:7b
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  cd /sandbox/.openclaw && \
  jq "
    if (.models.providers.inference.models | map(.id) | index(\"qwen2.5vl:7b\")) == null then
      .models.providers.inference.models += [{
        id: \"qwen2.5vl:7b\",
        name: \"inference/qwen2.5vl:7b\",
        reasoning: false,
        input: [\"text\", \"image\"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 131072,
        maxTokens: 4096,
        api: \"openai-completions\"
      }]
    else . end
    | (.models.providers.inference.models[] | select(.id == \"qwen2.5:7b\")   | .input) = [\"text\"]
    | (.models.providers.inference.models[] | select(.id == \"qwen2.5vl:7b\") | .input) = [\"text\", \"image\"]
    | .agents.defaults.model.primary = \"inference/qwen2.5:7b\"
    | .agents.defaults.imageModel    = \"inference/qwen2.5vl:7b\"
  " openclaw.json > openclaw.json.tmp && mv openclaw.json.tmp openclaw.json
'

# 4. `nemoclaw inference set` only patches the system-level openclaw.json.
#    The per-agent file at agents/main/agent/models.json overrides the
#    system catalog for the actual chat agent — so it also needs both
#    models, otherwise `openclaw models list` and the chat runtime will
#    only see one of them. (Also drop any orphan "openai" provider entry
#    left over from a previous switch attempt.)
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
  cd /sandbox/.openclaw/agents/main/agent && \
  jq "
    del(.providers.openai)
    | if (.providers.inference.models | map(.id) | index(\"qwen2.5:7b\")) == null then
        .providers.inference.models = ([{
          id: \"qwen2.5:7b\",
          name: \"inference/qwen2.5:7b\",
          reasoning: false,
          input: [\"text\"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 131072,
          maxTokens: 4096,
          api: \"openai-completions\"
        }] + .providers.inference.models)
      else . end
    | (.providers.inference.models[] | select(.id == \"qwen2.5vl:7b\") | .input) = [\"text\", \"image\"]
  " models.json > models.json.tmp && mv models.json.tmp models.json
'

# 5. Bounce the gateway and confirm both models are visible with the
#    right flags. The KEY check: qwen2.5vl:7b should carry the `image`
#    TAG (rightmost column) — this is OpenClaw saying "I have wired this
#    model as the agents.defaults.imageModel auto-describer." Without
#    that tag the imageModel reference didn't resolve to anything.
nemoclaw nemo recover
docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" openclaw models list | grep qwen
# Expected:
#   inference/qwen2.5:7b      text         128k   yes   yes   default
#   inference/qwen2.5vl:7b    text+image   128k   yes   yes   image     ← note 'image' tag
```

How a chat turn actually flows once this is wired:

```
user: "use ros2_camera_snapshot then describe what you see"
   │
   ▼
qwen2.5:7b (primary)    ── tool call ──▶ ros2_camera_snapshot
   │                                              │
   │                                       returns { type: "image",
   │                                                 data: <base64 jpg>,
   │                                                 mimeType: "image/jpeg" }
   │                                              │
   │       qwen2.5vl:7b  ◀── auto-route ──────────┘
   │       (agents.defaults
   │        .imageModel)
   │              │
   │       returns text caption ("A living room with a couch on the left…")
   │              │
   ◀──────────────┘
   │
   ▼
qwen2.5:7b sees the caption as a normal text message and can call more
tools or synthesise its reply. It NEVER receives the image bytes.
```

Trade-offs and gotchas:

- **Latency.** Every image content block now triggers a second LLM call. On Orin AGX, the VL inference adds ~3–8 s per snapshot. Three `ros2_camera_snapshot` calls in one chat turn = three sequential VL calls.
- **GPU memory.** Two distinct Ollama models means two distinct GPU slots if both happen to be hot. Watch `ollama ps`. If you're on 16 GB shared memory and want to keep them both warm, drop `OLLAMA_KEEP_ALIVE` (e.g. `OLLAMA_KEEP_ALIVE=2m`) so the unused one evicts quickly; otherwise expect a 1–2 s reload penalty when switching.
- **The caption is not the primary model's "vision".** The primary only sees what the VL model wrote. If the user asks a follow-up like *"what's that red object in the top-left?"* and the VL caption didn't mention it, the primary will either hallucinate or have to re-issue `ros2_camera_snapshot` and let the VL model take another look.
- **The `image` tag in `openclaw models list` is how you confirm the wiring took.** If the tag is missing, OpenClaw didn't pick up `agents.defaults.imageModel` — usually because (a) the value doesn't match a registered model name *exactly*, (b) the per-agent `models.json` override (step 4) is stale, or (c) `openclaw models list` was run as `root` instead of as `sandbox`, so it loaded `/root/.openclaw/openclaw.json` instead of `/sandbox/.openclaw/openclaw.json` — always pass `-u sandbox -e HOME=/sandbox`.
- **The `nemoclaw inference set` cookie-cutter doesn't know about imageModel.** It writes only `agents.defaults.model.primary`, so the step-3 patch is required each time you change either model.

Sanity prompt once everything is wired and the gateway has recovered:

> *"Use ros2_camera_snapshot, then describe in detail what you see in the image — objects, colors, lighting, anything you can identify."*

You should see `qwen2.5:7b` issue the tool call, the `agenticros` plugin return a snapshot, a 3–10 s pause (the VL model running in the background), and then a real scene description in the chat — without the primary model ever having been multimodal.

### Switching from local Ollama to OpenAI

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

### Switching back

To go back to local Ollama:

```bash
nemoclaw inference set --provider ollama-local --model qwen2.5vl:7b --sandbox nemo --no-verify
nemoclaw nemo recover
```

The `openai-api` provider stays registered in OpenShell with its credential; you don't need to recreate it next time you want to switch back to GPT-4o. To wipe the credential entirely:

```bash
openshell provider delete openai-api
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

- **Agent runs `ros2_camera_snapshot` successfully but just says "Here is a snapshot" without describing the scene** — the configured model can't see images. Two common causes:
  1. **The model itself is text-only.** `qwen2.5:7b` and most "instruct" models without a `-vl` / `-vision` suffix have no vision encoder. You have two options:
     - Swap the active model for a multimodal one — drop-in: `ollama pull qwen2.5vl:7b` then `nemoclaw inference set --provider ollama-local --model qwen2.5vl:7b --sandbox nemo --no-verify && nemoclaw nemo recover`. Downside: most Ollama VL models (including `qwen2.5vl:7b`) reject tool calls, so the agent can still run tools, just won't auto-call them.
     - Keep `qwen2.5:7b` as the tool-capable primary and add `qwen2.5vl:7b` as the auto-describer via `agents.defaults.imageModel`. See [Two-model setup: text+tools primary with a vision auto-describer](#two-model-setup-texttools-primary-with-a-vision-auto-describer-local-ollama). This is the right path if you need tool calling AND scene description on local hardware.
  2. **The model is multimodal but OpenClaw thinks it's text-only.** `nemoclaw inference set --no-verify` writes a hardcoded `input: ["text"]` into `/sandbox/.openclaw/openclaw.json` because it skips the capability probe along with the connection probe. Diagnose with `docker exec $CONTAINER openclaw models list | grep <model>` — if the Input column reads `text` for a model you *know* is multimodal, patch the JSON in place:
     ```bash
     CONTAINER=$(docker ps --format '{{.Names}}' | grep '^openshell-nemo-')
     docker exec -u sandbox -e HOME=/sandbox "$CONTAINER" sh -c '
       cd /sandbox/.openclaw && \
       jq "(.models.providers.inference.models[] | select(.id == \"qwen2.5vl:7b\") | .input) = [\"text\", \"image\"]" openclaw.json > openclaw.json.tmp && \
       mv openclaw.json.tmp openclaw.json
     '
     nemoclaw nemo recover
     ```
     After the recover, the Input column should read `text+image`.

- **`nemoclaw inference set` exits with `failed to verify inference endpoint for provider 'ollama-local' ... at 'http://host.openshell.internal:11435/v1': failed to connect`** — the verification probe runs from a place that can't resolve `host.openshell.internal` (the openshell-gateway container has no entry for it in `/etc/hosts` on Jetson). The runtime traffic still works because it goes through the OPA proxy from the sandbox netns, which does resolve the name. Re-run with `--no-verify` to skip the probe — but be aware that this also skips the capability probe (see previous bullet).

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
