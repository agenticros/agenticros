# @agenticros/desktop

Remote control of the robot's Hyprland session from AgenticROS Cloud.

The cloud robots page opens `/desktop`. That browser talks only through the
session `agenticros connect` already holds. This process runs **inside** the
Wayland session, captures it with the XDG desktop portal and PipeWire, and
injects the pointer and keyboard with Hyprland's virtual devices. It listens
on `127.0.0.1:8766`. `comms.js` relays SDP and ICE to that socket. The teleop
data-channel peer is a different WebRTC session.

## Check the session

From a terminal inside Hyprland:

```bash
echo $XDG_SESSION_TYPE          # wayland
echo $XDG_CURRENT_DESKTOP       # Hyprland
echo $WAYLAND_DISPLAY           # wayland-0, or similar
systemctl --user status pipewire wireplumber
systemctl --user status xdg-desktop-portal-hyprland
```

`XDG_SESSION_TYPE` must be `wayland`. The portal unit must be running. Hyprland
has to import the session into systemd or a user service will not see
`WAYLAND_DISPLAY`:

```bash
dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP XDG_SESSION_TYPE
```

## Packages

Ubuntu Server 24.04 with Hyprland:

```bash
sudo apt install \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-pipewire \
  pipewire \
  wireplumber \
  xdg-desktop-portal \
  xdg-desktop-portal-hyprland
```

The encoder is `x264enc`. If `gst-inspect-1.0 vah264enc` or `vaapih264enc`
succeeds, that GPU encoder is used instead. The stream is H.264 Constrained
Baseline, 1280x720 at 15 fps unless you pass `--width`, `--height`, or `--fps`.

## Run

In the Hyprland session, after `agenticros connect`:

```bash
agenticros desktop
```

The first viewer triggers a portal dialog on the robot. Approve it once. The
restore token is stored in `~/.agenticros/desktop-restore-token` and later
sessions reuse it. The cloud page says "Waiting for screen-share approval on
the robot" until the dialog finishes.

Stop a CLI-launched agent with `agenticros down`. Logs: `agenticros logs desktop`
(`/tmp/agenticros-desktop.log`).

A user unit is in `agenticros-desktop.service`. Point `ExecStart` at the
`agenticros` binary and install it as a **user** unit so it inherits the
session bus and `WAYLAND_DISPLAY`. Use `--foreground` there.

`--test-pattern` sends a GStreamer test picture and skips the Wayland check.
It does not inject input.

## Input

The browser sends normalized pointer coordinates and DOM `KeyboardEvent.code`
values on a data channel named `desktop-input`. v1 maps a US layout to Linux
evdev codes. The virtual keyboard keymap is installed with `SCM_RIGHTS`, which
needs the optional `koffi` dependency. The pointer still works if that keymap
cannot be sent.
