/**
 * `agenticros eyes` — launch fullscreen robot eyes on a local display.
 *
 * Spawns @agenticros/eyes in the background (local DDS via rclnodejs),
 * records /tmp/agenticros-eyes.pid, and logs to /tmp/agenticros-eyes.log.
 */

import { openSync, readFileSync } from "node:fs";
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
  areEyesDepsInstalled,
  resolveCmdVelTopic,
  resolveEyesEntry,
  resolveEyesPkgDir,
  resolveSafetyLimits,
} from "../util/eyes.js";
import { buildRosSourcedShellCmd, detectRosDistro } from "../util/env.js";
import { getCliPaths } from "../util/paths.js";
import { ensureWorkspaceReady } from "../util/workspace.js";
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

const EYES_READY_MARK = "robot-eyes listening on";
const EYES_READY_TIMEOUT_MS = 12_000;

function lastLogLines(n = 20): string {
  try {
    const text = readFileSync(logPath("eyes"), "utf8").trimEnd();
    if (!text) return "(log empty)";
    const lines = text.split("\n");
    return lines.slice(-n).join("\n");
  } catch {
    return "(no log yet)";
  }
}

async function waitForEyesReady(
  timeoutMs = EYES_READY_TIMEOUT_MS,
): Promise<"ready" | "dead" | "timeout"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive("eyes")) return "dead";
    try {
      const text = readFileSync(logPath("eyes"), "utf8");
      if (text.includes(EYES_READY_MARK)) return "ready";
    } catch {
      // log not written yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return isPidAlive("eyes") ? "timeout" : "dead";
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
  let pkgDir = resolveEyesPkgDir();
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

  const paths = getCliPaths();
  if (paths.repoRoot && !areEyesDepsInstalled(pkgDir)) {
    warn(
      "Eyes dependencies missing (ws not linked). Healing workspace with pnpm install…",
    );
    try {
      await ensureWorkspaceReady(paths.repoRoot, "robot eyes");
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      const msg =
        `Failed to install eyes dependencies: ${detail}. ` +
        `Try: cd ${paths.repoRoot} && pnpm install`;
      if (opts.softFail) {
        warn(msg);
        return;
      }
      err(msg);
      process.exit(1);
    }
    pkgDir = resolveEyesPkgDir() ?? pkgDir;
    if (!areEyesDepsInstalled(pkgDir)) {
      const msg =
        `Eyes still missing node_modules/ws after install. ` +
        `Try: cd ${paths.repoRoot} && pnpm install`;
      if (opts.softFail) {
        warn(msg);
        return;
      }
      err(msg);
      process.exit(1);
    }
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

  // Wait for the Node process to finish sourcing ROS and print the listen line.
  // A short "pid alive" check is not enough: bash stays up while sourcing, then
  // node can crash on missing deps before the HTTP server binds.
  const ready = await waitForEyesReady();
  if (ready !== "ready") {
    if (ready === "dead") clearPid("eyes");
    const msg =
      ready === "dead"
        ? `Eyes exited before listening. Last log lines from ${logPath("eyes")}:\n${lastLogLines()}`
        : `Eyes did not report ready within ${EYES_READY_TIMEOUT_MS / 1000}s (pid still alive). Check ${logPath("eyes")}.`;
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
