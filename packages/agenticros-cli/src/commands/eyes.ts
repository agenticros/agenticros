/**
 * `agenticros eyes` — launch fullscreen robot eyes on a local display.
 *
 * Spawns @agenticros/eyes in the background (local DDS via rclnodejs),
 * records /tmp/agenticros-eyes.pid, and logs to /tmp/agenticros-eyes.log.
 */

import { openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

import {
  clearPid,
  isPidAlive,
  logPath,
  readPid,
  writePid,
} from "../util/pidfile.js";
import {
  resolveCmdVelTopic,
  resolveEyesEntry,
  resolveEyesPkgDir,
  resolveSafetyLimits,
} from "../util/eyes.js";
import { buildRosSourcedShellCmd, detectRosDistro } from "../util/env.js";
import { getCliPaths } from "../util/paths.js";
import { err, info, ok, warn } from "../util/logger.js";

export interface EyesOptions {
  noBrowser?: boolean;
  noTeleop?: boolean;
  /** Mute R2D2 idle/excited chirps. */
  noSound?: boolean;
  port?: string | number;
  topic?: string;
  /** When true, do not exit the process on launch failure (used by `up --eyes`). */
  softFail?: boolean;
}

export async function eyesCommand(opts: EyesOptions = {}): Promise<void> {
  if (isPidAlive("eyes")) {
    const pid = readPid("eyes");
    warn(`Eyes already running (pid ${pid}). Stop with: agenticros down`);
    info(`URL: http://127.0.0.1:${opts.port ?? process.env["PORT"] ?? "8765"}/`);
    info(`Logs: ${logPath("eyes")}`);
    return;
  }
  // Stale pidfile
  if (readPid("eyes") !== undefined) clearPid("eyes");

  const entry = resolveEyesEntry();
  const pkgDir = resolveEyesPkgDir();
  if (!entry || !pkgDir) {
    const msg =
      "Eyes package not found (packages/robot-eyes). Run `agenticros init` or use a full workspace clone.";
    if (opts.softFail) {
      warn(msg);
      return;
    }
    err(msg);
    process.exit(1);
  }

  const ros = detectRosDistro();
  if (!ros.setupBash) {
    const msg =
      "No ROS 2 installation under /opt/ros/. Eyes need local DDS (rclnodejs).";
    if (opts.softFail) {
      warn(msg);
      return;
    }
    err(msg);
    process.exit(1);
  }

  const topic = resolveCmdVelTopic(opts.topic);
  const safety = resolveSafetyLimits();
  const port = Number(opts.port ?? process.env["PORT"] ?? 8765);

  const paths = getCliPaths();
  const overlay = paths.repoRoot
    ? join(paths.repoRoot, "ros2_ws", "install", "setup.bash")
    : undefined;

  const nodeArgs = [entry];
  if (opts.noBrowser) nodeArgs.push("--no-browser");
  if (opts.noTeleop) nodeArgs.push("--no-teleop");
  if (opts.noSound) nodeArgs.push("--no-sound");

  // Quote for bash -c
  const nodeCmd = `node ${nodeArgs.map((a) => JSON.stringify(a)).join(" ")}`;
  const shellBody = buildRosSourcedShellCmd(nodeCmd, {
    distro: ros.distro,
    overlay,
  });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    CMD_VEL_TOPIC: topic,
    MAX_LINEAR_VELOCITY: String(safety.maxLinearVelocity),
    MAX_ANGULAR_VELOCITY: String(safety.maxAngularVelocity),
  };
  if (opts.noTeleop) env["AGENTICROS_EYES_NO_TELEOP"] = "1";
  if (opts.noSound) env["AGENTICROS_EYES_NO_SOUND"] = "1";
  if (!env["DISPLAY"]) env["DISPLAY"] = ":0";

  const logFd = openSync(logPath("eyes"), "a");
  const child = spawn("bash", ["-lc", shellBody], {
    cwd: pkgDir,
    env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();

  if (!child.pid) {
    const msg = "Failed to spawn eyes process.";
    if (opts.softFail) {
      warn(msg);
      return;
    }
    err(msg);
    process.exit(1);
  }

  writePid("eyes", child.pid);

  // Brief settle so a fast crash shows up in the log / pid check.
  await new Promise((r) => setTimeout(r, 400));
  if (!isPidAlive("eyes")) {
    clearPid("eyes");
    const msg = `Eyes exited immediately. Check ${logPath("eyes")} (ROS sourced? rclnodejs built?).`;
    if (opts.softFail) {
      warn(msg);
      return;
    }
    err(msg);
    process.exit(1);
  }

  ok(`Eyes started (pid ${child.pid})`);
  info(`  topic:  ${topic}`);
  info(`  URL:    http://127.0.0.1:${port}/`);
  info(`  teleop: ${opts.noTeleop ? "off (gaze only)" : "WASD enabled"}`);
  info(`  sound:  ${opts.noSound ? "off" : "R2D2 chirps on"}`);
  info(`  logs:   ${logPath("eyes")}`);
  info("Stop with: agenticros down");
}
