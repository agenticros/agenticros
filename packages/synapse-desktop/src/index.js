#!/usr/bin/env node
/**
 * `synapse desktop` — Hyprland remote desktop agent.
 *
 * Listens on 127.0.0.1:8766 for SDP relayed by `synapse connect`.
 * Captures the session with the XDG desktop portal and PipeWire, encodes
 * H.264, and injects pointer and keyboard through Hyprland's virtual devices.
 */

import { parseArgs } from "node:util";

import { buildGstArgs, DEFAULT_FPS, DEFAULT_HEIGHT, DEFAULT_WIDTH, gstreamerAvailable, pickEncoder, startGstCapture, startWfCapture, wfRecorderAvailable } from "../lib/capture.js";
import {
  browserButtonToEvdev,
  buildUsKeymap,
  domCodeToEvdev,
  modifierMask,
  parseInputMessage,
  pointerToAbsolute,
  wheelToAxes,
} from "../lib/input-map.js";
import { createDesktopPeer } from "../lib/peer.js";
import { openScreenCast } from "../lib/portal.js";
import { startDesktopServer } from "../lib/server.js";
import { waylandSessionError, waylandSocketPath } from "../lib/session.js";
import { connectVirtualInput } from "../lib/wayland.js";

const { values } = parseArgs({
  options: {
    "test-pattern": { type: "boolean", default: false },
    port: { type: "string" },
    width: { type: "string" },
    height: { type: "string" },
    fps: { type: "string" },
  },
  strict: true,
});

const port = Number(values.port || process.env.SYNAPSE_DESKTOP_PORT || 8766);
const width = Number(values.width || DEFAULT_WIDTH);
const height = Number(values.height || DEFAULT_HEIGHT);
const fps = Number(values.fps || DEFAULT_FPS);
const testPattern = values["test-pattern"] === true;
const host = "127.0.0.1";

const log = (line) => {
  console.log(`[desktop] ${line}`);
};

let input = null;
let peer = null;
let capture = null;
/** @type {{ answering: boolean, queued: object[] } | null} */
let iceQueue = null;
const frame = { width, height };
const depressed = new Set();

function handleInput(raw) {
  const msg = parseInputMessage(raw);
  if (!msg || !input) return;
  if (msg.type === "pointer") {
    if (msg.action === "move") {
      input.motionAbsolute(pointerToAbsolute(msg.x, msg.y, frame.width, frame.height));
      return;
    }
    if (msg.action === "down" || msg.action === "up") {
      input.motionAbsolute(pointerToAbsolute(msg.x, msg.y, frame.width, frame.height));
      input.button({
        button: browserButtonToEvdev(msg.button),
        pressed: msg.action === "down",
      });
      return;
    }
    if (msg.action === "wheel") {
      for (const axis of wheelToAxes(msg.dx, msg.dy)) input.axis(axis);
    }
    return;
  }
  const evdev = domCodeToEvdev(msg.code);
  if (evdev == null) return;
  if (msg.action === "down") depressed.add(evdev);
  else depressed.delete(evdev);
  input.key({
    key: evdev,
    pressed: msg.action === "down",
    mask: modifierMask(depressed),
  });
}

async function stopSession() {
  const currentPeer = peer;
  const currentCapture = capture;
  peer = null;
  capture = null;
  iceQueue = null;
  depressed.clear();
  if (currentCapture) currentCapture.stop();
  if (currentPeer) await currentPeer.close();
}

async function startCapture(send) {
  const useRecorder = !testPattern && wfRecorderAvailable();
  if (!useRecorder && !gstreamerAvailable()) {
    throw new Error(
      "gst-launch-1.0 is not installed. Install gstreamer1.0-tools, gstreamer1.0-plugins-base, gstreamer1.0-plugins-good, gstreamer1.0-plugins-ugly, and gstreamer1.0-pipewire.",
    );
  }
  const encoder = useRecorder ? "wf-recorder" : await pickEncoder();
  log(`H.264 encoder: ${encoder}`);
  if (!testPattern) {
    send({ type: "desktop", signal: "status", state: "waiting-approval" });
  }
  let portal = null;
  let gst = null;
  const stop = () => {
    const currentGst = gst;
    const currentPortal = portal;
    gst = null;
    portal = null;
    currentGst?.stop();
    currentPortal?.close();
  };
  capture = { stop };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (!peer) {
      stop();
      return;
    }
    if (!testPattern && !useRecorder) {
      portal?.close();
      portal = null;
      portal = await openScreenCast({ log });
      if (portal.width > 0 && portal.height > 0) {
        frame.width = portal.width;
        frame.height = portal.height;
      }
    }
    if (!peer) {
      stop();
      return;
    }
    let sawFrame = false;
    let resolveFrame = () => {};
    const frameReady = new Promise((resolve) => {
      resolveFrame = resolve;
    });
    const onAccessUnit = (nals) => {
        if (!sawFrame) {
          sawFrame = true;
          log(`First encoded frame (${nals.length} NALs)`);
          resolveFrame();
        }
        peer?.pushAccessUnit(nals);
      };
    gst = useRecorder
      ? startWfCapture({
        width,
        height,
        fps,
        log,
        onAccessUnit,
        onRegion: (sourceWidth, sourceHeight) => {
          frame.width = sourceWidth;
          frame.height = sourceHeight;
          log(`Screen region ${sourceWidth}x${sourceHeight}`);
        },
      })
      : startGstCapture({
        args: buildGstArgs({
          testPattern,
          fd: 3,
          nodeId: portal?.nodeId,
          width,
          height,
          fps,
          encoder,
        }),
        stdioFd: portal ? portal.fd : undefined,
        log,
        onAccessUnit,
      });
    const failed = await Promise.race([
      gst.exited.then((code) => code ?? 0),
      frameReady.then(() => null),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 4000)),
    ]);
    if (!peer) {
      stop();
      return;
    }
    if (failed == null) break;
    log(`No screen frame yet (${failed})`);
    const finished = gst.exited;
    stop();
    await Promise.race([
      finished,
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]);
    if (attempt === 2) return;
  }

  send({
    type: "desktop",
    signal: "status",
    state: "streaming",
    width,
    height,
  });
  log(`Streaming ${width}x${height}@${fps}`);
}

async function onSignal(msg, send) {
  const signal = String(msg.signal || "").toLowerCase();
  if (signal === "end") {
    await stopSession();
    return;
  }
  if (signal === "candidate") {
    if (!peer) return;
    if (iceQueue?.answering) {
      iceQueue.queued.push(msg);
      return;
    }
    await peer.addIceCandidate(msg);
    return;
  }
  if (signal !== "offer" || !msg.sdp) return;

  await stopSession();
  peer = createDesktopPeer({
    iceServers: msg.iceServers,
    fps,
    onInput: handleInput,
    log,
  });
  iceQueue = { answering: true, queued: [] };
  const current = peer;
  const queue = iceQueue;
  try {
    const sdp = await current.acceptOffer(msg.sdp, (candidate) => {
      send({ type: "desktop", signal: "candidate", ...candidate });
    });
    if (peer !== current) return;
    send({ type: "desktop", signal: "answer", sdp });
    queue.answering = false;
    for (const candidate of queue.queued) await current.addIceCandidate(candidate);
    queue.queued = [];
    await startCapture(send);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log(reason);
    send({ type: "desktop", signal: "unavailable", reason });
    if (peer === current) await stopSession();
  }
}

async function main() {
  if (!testPattern) {
    const sessionError = waylandSessionError();
    if (sessionError) {
      console.error(sessionError);
      process.exit(1);
    }
    const socketPath = waylandSocketPath();
    log(`Connecting virtual input on ${socketPath}`);
    const virtual = connectVirtualInput({
      socketPath,
      keymap: buildUsKeymap(),
      log,
    });
    try {
      await virtual.ready;
      input = virtual;
      log("Virtual pointer ready");
    } catch (err) {
      virtual.close();
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  } else {
    log("Test pattern enabled; skipping the Wayland session check");
  }

  const server = startDesktopServer({
    port,
    host,
    log,
    onSignal: (msg, send) => {
      void onSignal(msg, send);
    },
  });

  await new Promise((resolve, reject) => {
    server.wss.once("listening", resolve);
    server.wss.once("error", reject);
  });
  console.log(`synapse desktop listening on ${host}:${port}`);

  const shutdown = async () => {
    await stopSession();
    input?.close();
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => { void shutdown(); });
  process.on("SIGTERM", () => { void shutdown(); });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
