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
    // dont-reconnect is set here so PipeWire's DONT_RECONNECT flag does not
    // override it. WirePlumber otherwise errors the stream with
    // "target not found" when the portal node is not linkable yet.
    : `pipewiresrc fd=${opts.fd} path=${opts.nodeId} do-timestamp=true always-copy=true stream-properties=props,node.dont-reconnect=false`;
  // The portal advertises framerate 0/1. x264enc rejects that rate, so it
  // encodes a single buffer and the stream stops. videorate stamps a real
  // rate. skip-to-first avoids inventing frames before the first real one,
  // which would hold a PipeWire buffer and stall the portal.
  const scale = `videoconvert ! videoscale ! videorate skip-to-first=true ! video/x-raw,format=I420,width=${width},height=${height},framerate=${fps}/1`;
  const encode = encodeElement(opts.encoder, fps);
  return ["-q", `${src} ! ${scale} ! ${encode} ! fdsink fd=1 sync=false`];
}

let h264parseAvailable;

function h264ParsePrefix() {
  if (h264parseAvailable === undefined) {
    const probe = spawnSync("gst-inspect-1.0", ["h264parse"], { stdio: "ignore" });
    h264parseAvailable = probe.status === 0;
  }
  // plugins-bad is not always installed. x264enc with cabac and dct8x8 off
  // already writes Constrained Baseline; the caps keep that profile either way.
  return h264parseAvailable ? "h264parse config-interval=-1 ! " : "";
}

function encodeElement(encoder, fps) {
  const parsed = h264ParsePrefix();
  if (encoder === "vah264enc") {
    return `vah264enc ! ${parsed}video/x-h264,stream-format=byte-stream,alignment=au,profile=constrained-baseline`;
  }
  if (encoder === "vaapih264enc") {
    return `vaapih264enc ! ${parsed}video/x-h264,stream-format=byte-stream,alignment=au`;
  }
  const gop = Math.max(1, fps) * 2;
  // cabac and 8x8dct off is Constrained Baseline, which is the profile the
  // browser negotiated (profile-level-id=42e01f). High-profile NALs never paint.
  return `x264enc qos=false tune=zerolatency speed-preset=ultrafast bitrate=2500 key-int-max=${gop} bframes=0 byte-stream=true aud=true cabac=false dct8x8=false ! ${parsed}video/x-h264,stream-format=byte-stream,alignment=au,profile=constrained-baseline`;
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
 * @param {import("node:child_process").ChildProcess} child
 * @param {{ onAccessUnit: (nals: Buffer[]) => void, log?: (line: string) => void, label?: string, onRegion?: (width: number, height: number) => void }} opts
 */
function watchAnnexB(child, opts) {
  const log = opts.log || (() => {});
  const label = opts.label || "capture";
  const demux = createAccessUnitStream(opts.onAccessUnit);
  let stderr = "";
  let idleFlush = null;
  child.stdout?.on("data", (chunk) => {
    demux.push(chunk);
    clearTimeout(idleFlush);
    idleFlush = setTimeout(() => demux.flush(), 40);
  });
  child.stderr?.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    stderr = (stderr + text).slice(-4000);
    const region = text.match(/selected region \d+,\d+ (\d+)x(\d+)/);
    if (region && opts.onRegion) opts.onRegion(Number(region[1]), Number(region[2]));
    const line = text.trim();
    if (line) log(`${label}: ${line.slice(0, 500)}`);
  });
  child.on("error", (err) => {
    log(`${label} failed to start: ${err.message}`);
  });
  const exited = new Promise((resolve) => {
    child.on("error", () => resolve(1));
    child.on("exit", (code) => {
      clearTimeout(idleFlush);
      demux.flush();
      if (code && code !== 0 && code !== 255) log(`${label} exited ${code}: ${stderr.trim().slice(-300)}`);
      resolve(code ?? 0);
    });
  });
  return {
    stop() {
      try { child.kill("SIGINT"); } catch { /* ignore */ }
    },
    exited,
    get stderr() {
      return stderr;
    },
  };
}

/**
 * @param {{ args: string[], stdioFd?: number, onAccessUnit: (nals: Buffer[]) => void, log?: (line: string) => void }} opts
 */
export function startGstCapture(opts) {
  const stdio = ["ignore", "pipe", "pipe"];
  if (typeof opts.stdioFd === "number") stdio.push(opts.stdioFd);
  // gst-launch 1.28 treats one quoted pipeline string as a syntax error.
  // The same description split on whitespace is accepted.
  const args = opts.args.flatMap((arg) => String(arg) === "-q" ? [arg] : String(arg).split(/\s+/).filter(Boolean));
  const child = spawn("gst-launch-1.0", args, { stdio });
  return watchAnnexB(child, { ...opts, label: "gst" });
}

/**
 * wlroots capture. The desktop portal's image-copy session accepts the cast
 * and then stops delivering frames; wf-recorder reads the screen directly.
 * @param {{ width?: number, height?: number, fps?: number }} opts
 * @returns {string[]}
 */
export function buildWfArgs(opts) {
  const width = opts.width || DEFAULT_WIDTH;
  const height = opts.height || DEFAULT_HEIGHT;
  const fps = opts.fps || DEFAULT_FPS;
  return [
    "-r", String(fps),
    "-D",
    "-c", "libx264",
    "-m", "h264",
    "-x", "yuv420p",
    "-b", "0",
    "-p", "preset=ultrafast",
    "-p", "tune=zerolatency",
    "-p", "aud=1",
    // One slice per frame. A frame split into slices paints the top of the
    // desktop green and leaves the real picture in the bottom band.
    "-p", "threads=1",
    "-F", `scale=${width}:${height}`,
    "-f", "pipe:1",
  ];
}

/** True when wlroots screen recording is installed. */
export function wfRecorderAvailable() {
  const probe = spawnSync("wf-recorder", ["--version"], { stdio: "ignore" });
  return probe.status === 0;
}

/**
 * @param {{ width?: number, height?: number, fps?: number, onAccessUnit: (nals: Buffer[]) => void, onRegion?: (width: number, height: number) => void, log?: (line: string) => void }} opts
 */
export function startWfCapture(opts) {
  const child = spawn("wf-recorder", buildWfArgs(opts), { stdio: ["ignore", "pipe", "pipe"] });
  return watchAnnexB(child, { ...opts, label: "wf-recorder" });
}

/** True when the gst tools exist. Used by the agent before it answers. */
export function gstreamerAvailable() {
  const probe = spawnSync("gst-launch-1.0", ["--version"], { stdio: "ignore" });
  return probe.status === 0;
}
