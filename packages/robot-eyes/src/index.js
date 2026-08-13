#!/usr/bin/env node
/**
 * @agenticros/eyes — fullscreen robot face driven by ROS 2 cmd_vel Twist.
 *
 * Subscribes to CMD_VEL_TOPIC for gaze (left/right turns). Optionally publishes
 * the same topic from invisible WASD keyboard teleop (disabled with --no-teleop).
 * Plays procedural R2D2 chirps (idle) and excited bursts on active cmd_vel
 * (disabled with --no-sound). When idle, opportunistically follows a person in
 * the RealSense color frame if YOLO is already installed (never downloads it;
 * disable with --no-person-gaze).
 *
 * Env (set by `agenticros eyes` from ~/.agenticros/config.json):
 *   CMD_VEL_TOPIC, CAMERA_TOPIC, MAX_LINEAR_VELOCITY, MAX_ANGULAR_VELOCITY, PORT, …
 */
import { createRequire } from "module";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { spawn, execFileSync } from "child_process";
import { WebSocketServer } from "ws";

import {
  exciteFromTwist,
  startSoundLoop,
  stopSoundLoop,
} from "../lib/sounds.js";

const require = createRequire(import.meta.url);
let rclnodejs;
try {
  rclnodejs = require("rclnodejs");
} catch (e) {
  console.error(
    "Failed to load rclnodejs. Source ROS 2 and reinstall deps on the robot:\n" +
      "  source /opt/ros/<distro>/setup.bash && pnpm install --filter @agenticros/eyes\n" +
      String(e instanceof Error ? e.message : e),
  );
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const PORT = Number(process.env.PORT || 8765);
const TOPIC = process.env.CMD_VEL_TOPIC || "/cmd_vel";
const ANGULAR_DEADZONE = Number(process.env.ANGULAR_DEADZONE || 0.05);
const LINEAR_DEADZONE = Number(process.env.LINEAR_DEADZONE || 0.02);
const CMD_TIMEOUT_MS = Number(process.env.CMD_TIMEOUT_MS || 300);
const PERSON_GAZE_HZ = Number(process.env.PERSON_GAZE_HZ || 4);
const PERSON_TRACK_TIMEOUT_MS = Number(process.env.PERSON_TRACK_TIMEOUT_MS || 800);
const NO_BROWSER = process.argv.includes("--no-browser");
const NO_TELEOP =
  process.argv.includes("--no-teleop") ||
  process.env.AGENTICROS_EYES_NO_TELEOP === "1";
const NO_SOUND =
  process.argv.includes("--no-sound") ||
  process.env.AGENTICROS_EYES_NO_SOUND === "1";
const NO_PERSON_GAZE =
  process.argv.includes("--no-person-gaze") ||
  process.env.AGENTICROS_EYES_NO_PERSON_GAZE === "1";
const CAMERA_TOPIC =
  process.env.CAMERA_TOPIC ||
  "/camera/camera/color/image_raw/compressed";

const MAX_LINEAR = Number(process.env.MAX_LINEAR_VELOCITY || 1.0);
const MAX_ANGULAR = Number(process.env.MAX_ANGULAR_VELOCITY || 1.5);

const TELOP_LINEAR = Math.min(
  Number(process.env.TELOP_LINEAR || 0.25),
  MAX_LINEAR,
);
const TELOP_ANGULAR = Math.min(
  Number(process.env.TELOP_ANGULAR || 0.9),
  MAX_ANGULAR,
);
const TELOP_SCALE_STEP = Number(process.env.TELOP_SCALE_STEP || 0.15);
const TELOP_SCALE_MIN = Number(process.env.TELOP_SCALE_MIN || 0.2);
const TELOP_SCALE_MAX = Number(process.env.TELOP_SCALE_MAX || 3);
const TELOP_RATE_HZ = Number(process.env.TELOP_RATE_HZ || 20);

/** @type {{ gazeX: number, gazeY: number, driving: boolean, tracking: boolean, lastCmdAt: number, lastPersonAt: number }} */
const state = {
  gazeX: 0,
  gazeY: 0,
  driving: false,
  tracking: false,
  lastCmdAt: 0,
  lastPersonAt: 0,
};

const teleop = {
  /** @type {Map<object, { w: boolean, a: boolean, s: boolean, d: boolean }>} */
  clients: new Map(),
  scale: 1,
  publishing: false,
};

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function createHttpServer() {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.normalize(path.join(PUBLIC_DIR, rel));

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    // Gaze-only mode: serve HTML without the teleop script.
    if (NO_TELEOP && rel === "/index.html") {
      fs.readFile(filePath, "utf8", (err, html) => {
        if (err) {
          res.writeHead(404).end("Not found");
          return;
        }
        const stripped = html.replace(
          /\s*<script type="module" src="\/teleop\.js"><\/script>\s*/i,
          "\n",
        );
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(stripped);
      });
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mimeType(filePath) });
      res.end(data);
    });
  });
}

function broadcast(wss, payload) {
  const raw = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(raw);
    }
  }
}

function broadcastGaze(wss) {
  broadcast(wss, {
    type: "gaze",
    gazeX: state.gazeX,
    gazeY: state.gazeY,
    driving: state.driving,
    tracking: state.tracking,
  });
}

function gazeFromTwist(msg) {
  const z = msg?.angular?.z ?? 0;
  const x = msg?.linear?.x ?? 0;
  const turning = Math.abs(z) >= ANGULAR_DEADZONE;
  const translating = Math.abs(x) >= LINEAR_DEADZONE;
  const driving = turning || translating;
  // +angular.z = left turn → eyes look right (screen +X)
  return { gazeX: turning ? (z > 0 ? 1 : -1) : 0, driving };
}

function mergedKeys() {
  const keys = { w: false, a: false, s: false, d: false };
  for (const k of teleop.clients.values()) {
    keys.w ||= k.w;
    keys.a ||= k.a;
    keys.s ||= k.s;
    keys.d ||= k.d;
  }
  return keys;
}

function clampTwist(twist) {
  const { linear, angular } = twist;
  const lx = linear?.x ?? 0;
  const ly = linear?.y ?? 0;
  const lz = linear?.z ?? 0;
  const ax = angular?.x ?? 0;
  const ay = angular?.y ?? 0;
  const az = angular?.z ?? 0;

  const linMag = Math.sqrt(lx * lx + ly * ly + lz * lz);
  const scaleLin = linMag > MAX_LINEAR && linMag > 0 ? MAX_LINEAR / linMag : 1;
  const angMag = Math.abs(az);
  const scaleAng = angMag > MAX_ANGULAR && angMag > 0 ? MAX_ANGULAR / angMag : 1;

  return {
    linear: { x: lx * scaleLin, y: ly * scaleLin, z: lz * scaleLin },
    angular: {
      x: ax * scaleAng,
      y: ay * scaleAng,
      z: Math.max(-MAX_ANGULAR, Math.min(MAX_ANGULAR, az)),
    },
  };
}

function twistFromKeys(keys) {
  const linear = TELOP_LINEAR * teleop.scale;
  const angular = TELOP_ANGULAR * teleop.scale;
  let x = 0;
  let z = 0;
  if (keys.w) x += linear;
  if (keys.s) x -= linear;
  if (keys.a) z += angular;
  if (keys.d) z -= angular;
  return clampTwist({
    linear: { x, y: 0, z: 0 },
    angular: { x: 0, y: 0, z },
  });
}

function anyKeyDown(keys) {
  return keys.w || keys.a || keys.s || keys.d;
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    "firefox",
    "chromium-browser",
    "chromium",
    "google-chrome",
    "google-chrome-stable",
  ].filter(Boolean);

  for (const bin of candidates) {
    try {
      execFileSync("which", [bin], { stdio: "ignore" });
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

function launchKiosk(url) {
  const bin = findBrowser();
  if (!bin) {
    console.warn("No browser found. Open this URL fullscreen manually:", url);
    return null;
  }

  const args = bin.includes("firefox")
    ? ["--kiosk", url]
    : ["--kiosk", "--noerrdialogs", "--disable-infobars", `--app=${url}`, url];

  console.log(`Launching ${bin} in kiosk mode → ${url}`);
  const child = spawn(bin, args, {
    stdio: "ignore",
    detached: true,
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ":0" },
  });
  child.unref();
  child.on("error", (err) => {
    console.warn(`Failed to launch ${bin}:`, err.message);
    console.warn("Open this URL fullscreen manually:", url);
  });
  return child;
}

function logPersonGazeDisabled() {
  console.log("Person gaze disabled (YOLO not installed)");
}

/**
 * Idle person-follow gaze. Never adds YOLO as a dependency or downloads
 * weights — only runs if follow-me / find-object already installed them.
 * @param {object} node
 * @param {import("ws").WebSocketServer} wss
 */
async function tryStartPersonGaze(node, wss) {
  if (NO_PERSON_GAZE) {
    console.log("Person gaze disabled (--no-person-gaze)");
    return;
  }

  const {
    yolov8ModelExists,
    jpegFromCompressed,
    pickLargestPerson,
    gazeFromPerson,
  } = await import("../lib/person-gaze.js");

  if (!yolov8ModelExists()) {
    logPersonGazeDisabled();
    return;
  }

  const detectorDist = path.join(
    __dirname,
    "..",
    "..",
    "object-detection",
    "dist",
    "index.js",
  );
  if (!fs.existsSync(detectorDist)) {
    logPersonGazeDisabled();
    return;
  }

  let PersonDetector;
  try {
    const mod = await import(pathToFileURL(detectorDist).href);
    PersonDetector = mod.PersonDetector;
  } catch {
    logPersonGazeDisabled();
    return;
  }
  if (typeof PersonDetector !== "function") {
    logPersonGazeDisabled();
    return;
  }

  const detector = new PersonDetector();
  try {
    await detector.load({ download: false });
  } catch {
    logPersonGazeDisabled();
    return;
  }

  /** @type {{ buffer: Buffer, receivedAt: number } | null} */
  let latestJpeg = null;
  let inflight = false;

  node.createSubscription(
    "sensor_msgs/msg/CompressedImage",
    CAMERA_TOPIC,
    (msg) => {
      const buf = jpegFromCompressed(msg);
      if (buf) {
        latestJpeg = { buffer: buf, receivedAt: Date.now() };
      }
    },
  );

  const dropTrackingIfStale = () => {
    if (
      state.tracking &&
      Date.now() - state.lastPersonAt > PERSON_TRACK_TIMEOUT_MS
    ) {
      state.tracking = false;
      broadcastGaze(wss);
    }
  };

  const tick = async () => {
    if (inflight || state.driving) return;
    inflight = true;
    try {
      const frame = latestJpeg;
      if (!frame || Date.now() - frame.receivedAt > 2000) {
        dropTrackingIfStale();
        return;
      }
      const det = await detector.detect(frame.buffer);
      if (state.driving) return;
      const person = pickLargestPerson(det.persons);
      if (!person) {
        dropTrackingIfStale();
        return;
      }
      const gaze = gazeFromPerson(person, det.width, det.height);
      if (!gaze || state.driving) return;
      state.gazeX = gaze.gazeX;
      state.gazeY = gaze.gazeY;
      state.tracking = true;
      state.lastPersonAt = Date.now();
      broadcastGaze(wss);
    } catch {
      // skip a bad frame; twist + idle gaze still work
    } finally {
      inflight = false;
    }
  };

  setInterval(() => {
    void tick();
  }, Math.max(50, Math.round(1000 / PERSON_GAZE_HZ)));

  console.log(`Person gaze enabled (YOLO) on ${CAMERA_TOPIC}`);
}

async function main() {
  await rclnodejs.init();
  const node = rclnodejs.createNode("robot_eyes");
  const publisher = NO_TELEOP
    ? null
    : node.createPublisher("geometry_msgs/msg/Twist", TOPIC);

  const server = createHttpServer();
  const wss = new WebSocketServer({ server });

  const publishStop = () => {
    if (!publisher) return;
    publisher.publish({
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 },
    });
    teleop.publishing = false;
  };

  const tickTeleop = () => {
    if (NO_TELEOP || !publisher) return;
    const keys = mergedKeys();
    if (!anyKeyDown(keys)) {
      if (teleop.publishing) {
        publishStop();
      }
      return;
    }
    publisher.publish(twistFromKeys(keys));
    teleop.publishing = true;
  };

  if (!NO_TELEOP) {
    setInterval(tickTeleop, Math.max(10, Math.round(1000 / TELOP_RATE_HZ)));
  }

  wss.on("connection", (ws) => {
    if (!NO_TELEOP) {
      teleop.clients.set(ws, { w: false, a: false, s: false, d: false });
    }

    ws.send(
      JSON.stringify({
        type: "gaze",
        gazeX: state.gazeX,
        gazeY: state.gazeY,
        driving: state.driving,
        tracking: state.tracking,
      }),
    );

    ws.on("message", (raw) => {
      if (NO_TELEOP) return;
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (msg.type === "keys" && msg.keys && typeof msg.keys === "object") {
        teleop.clients.set(ws, {
          w: Boolean(msg.keys.w),
          a: Boolean(msg.keys.a),
          s: Boolean(msg.keys.s),
          d: Boolean(msg.keys.d),
        });
        tickTeleop();
        return;
      }

      if (msg.type === "speed" && (msg.delta === 1 || msg.delta === -1)) {
        const next = teleop.scale + msg.delta * TELOP_SCALE_STEP;
        teleop.scale = Math.min(
          TELOP_SCALE_MAX,
          Math.max(TELOP_SCALE_MIN, next),
        );
        console.log(
          `teleop speed scale: ${teleop.scale.toFixed(2)} ` +
            `(linear≈${(TELOP_LINEAR * teleop.scale).toFixed(2)} m/s, ` +
            `angular≈${(TELOP_ANGULAR * teleop.scale).toFixed(2)} rad/s)`,
        );
      }
    });

    ws.on("close", () => {
      if (!NO_TELEOP) {
        teleop.clients.delete(ws);
        tickTeleop();
      }
    });
  });

  node.createSubscription("geometry_msgs/msg/Twist", TOPIC, (msg) => {
    const next = gazeFromTwist(msg);
    if (next.driving) {
      state.gazeX = next.gazeX;
      state.gazeY = 0;
      state.driving = true;
      state.tracking = false;
    } else {
      state.driving = false;
    }
    state.lastCmdAt = Date.now();
    broadcastGaze(wss);
    if (!NO_SOUND) {
      exciteFromTwist(msg, ANGULAR_DEADZONE);
    }
  });

  setInterval(() => {
    if (!state.driving) return;
    if (Date.now() - state.lastCmdAt < CMD_TIMEOUT_MS) return;
    state.gazeX = 0;
    state.gazeY = 0;
    state.driving = false;
    state.tracking = false;
    broadcastGaze(wss);
  }, 50);

  server.listen(PORT, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${PORT}/`;
    console.log(`robot-eyes listening on ${url}`);
    console.log(
      `${NO_TELEOP ? "Subscribed" : "Subscribed + publishing"} ${TOPIC} ` +
        `(deadzone=${ANGULAR_DEADZONE}, maxLin=${MAX_LINEAR}, maxAng=${MAX_ANGULAR})`,
    );
    if (NO_TELEOP) {
      console.log("Keyboard teleop disabled (--no-teleop / gaze-only)");
    } else {
      console.log(
        `Keyboard teleop: WASD drive, Q faster, Z slower ` +
          `(base linear=${TELOP_LINEAR}, angular=${TELOP_ANGULAR})`,
      );
    }
    if (NO_SOUND) {
      console.log("R2D2 sounds disabled (--no-sound)");
    } else {
      startSoundLoop();
    }
    void tryStartPersonGaze(node, wss);
    if (!NO_BROWSER) {
      launchKiosk(url);
    } else {
      console.log("--no-browser: open the URL yourself for fullscreen");
    }
  });

  rclnodejs.spin(node);

  const shutdown = async () => {
    console.log("\nShutting down…");
    try {
      await stopSoundLoop();
      publishStop();
      wss.close();
      server.close();
      node.destroy();
      await rclnodejs.shutdown();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
