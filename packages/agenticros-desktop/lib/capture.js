/**
 * PipeWire (or a test pattern) → H.264 Annex-B on stdout.
 * Software x264 is the default. VA-API is used when the element is installed.
 */

import { spawn, spawnSync } from "node:child_process";

import { createAccessUnitStream } from "./h264-rtp.js";

export const DEFAULT_WIDTH = 1280;
export const DEFAULT_HEIGHT = 720;
export const DEFAULT_FPS = 15;

/**
 * @param {{ fd?: number, nodeId?: number, width: number, height: number, fps: number, encoder: string, testPattern?: boolean }} opts
 * @returns {string[]}
 */
export function buildGstArgs(opts) {
  const width = opts.width || DEFAULT_WIDTH;
  const height = opts.height || DEFAULT_HEIGHT;
  const fps = opts.fps || DEFAULT_FPS;
  const src = opts.testPattern
    ? "videotestsrc is-live=true pattern=smpte"
    : `pipewiresrc fd=${opts.fd} path=${opts.nodeId} do-timestamp=true`;
  const scale = `videoconvert ! videoscale ! videorate ! video/x-raw,format=I420,width=${width},height=${height},framerate=${fps}/1`;
  const encode = encodeElement(opts.encoder, fps);
  return ["-q", `${src} ! ${scale} ! ${encode} ! fdsink fd=1 sync=false`];
}

function encodeElement(encoder, fps) {
  if (encoder === "vah264enc") {
    return "vah264enc ! h264parse config-interval=-1 ! video/x-h264,stream-format=byte-stream,alignment=au,profile=constrained-baseline";
  }
  if (encoder === "vaapih264enc") {
    return "vaapih264enc ! h264parse config-interval=-1 ! video/x-h264,stream-format=byte-stream,alignment=au";
  }
  const gop = Math.max(1, fps) * 2;
  return `x264enc tune=zerolatency speed-preset=ultrafast bitrate=2500 key-int-max=${gop} bframes=0 byte-stream=true aud=true`;
}

/**
 * Prefer a GPU encoder when GStreamer has one. Otherwise x264enc.
 * @returns {Promise<string>}
 */
export async function pickEncoder() {
  if (await gstHas("vah264enc")) return "vah264enc";
  if (await gstHas("vaapih264enc")) return "vaapih264enc";
  if (await gstHas("x264enc")) return "x264enc";
  throw new Error(
    "No H.264 encoder found. Install gstreamer1.0-plugins-ugly (x264enc) or a VA-API H.264 encoder.",
  );
}

function gstHas(element) {
  return new Promise((resolve) => {
    const child = spawn("gst-inspect-1.0", [element], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

/**
 * @param {{ args: string[], stdioFd?: number, onAccessUnit: (nals: Buffer[]) => void, log?: (line: string) => void }} opts
 */
export function startGstCapture(opts) {
  const log = opts.log || (() => {});
  const stdio = ["ignore", "pipe", "pipe"];
  if (typeof opts.stdioFd === "number") stdio.push(opts.stdioFd);
  const child = spawn("gst-launch-1.0", opts.args, { stdio });
  const demux = createAccessUnitStream(opts.onAccessUnit);
  let stderr = "";
  child.stdout?.on("data", (chunk) => demux.push(chunk));
  child.stderr?.on("data", (chunk) => {
    stderr = (stderr + chunk.toString("utf8")).slice(-4000);
  });
  child.on("error", (err) => {
    log(`gst-launch-1.0 failed to start: ${err.message}`);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) log(`gst-launch-1.0 exited ${code}: ${stderr.trim()}`);
  });
  return {
    stop() {
      try { child.kill("SIGTERM"); } catch { /* ignore */ }
    },
    get stderr() {
      return stderr;
    },
  };
}

/** True when the gst tools exist. Used by the agent before it answers. */
export function gstreamerAvailable() {
  const probe = spawnSync("gst-launch-1.0", ["--version"], { stdio: "ignore" });
  return probe.status === 0;
}
