/**
 * On-robot hardware commands ported from robotics-npm:
 * connect / disconnect, start|stop motors|realsense|camera, id, set.
 *
 * Cloud defaults: https://cloud.agenticros.com / wss://cloud.agenticros.com
 */

import { spawn } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import {
  isNpmRuntimeRobotPkg,
  requireRobotPkgDir,
  robotPkgHasInlineStatus,
  robotPkgHasRuntimeDeps,
} from "../util/robot-pkg.js";
import { getCliPaths, resolveScriptPath } from "../util/paths.js";
import { detectRosDistro } from "../util/env.js";
import {
  CLOUD_REST,
  ensureRobotId,
  fetchRobotDetails,
  getRobotId,
  setApiToken,
  setRobotId,
} from "../util/robot-cloud-config.js";
import { err, info, ok, warn } from "../util/logger.js";

const COMMS_LOG = "/tmp/agenticros-comms.log";

async function pkill(pattern: string): Promise<void> {
  await execa("pkill", ["-f", pattern], { reject: false });
}

function spawnDetached(
  command: string,
  args: string[],
  opts?: { cwd?: string; logFile?: string },
): number | undefined {
  const stdio: ("ignore" | number)[] = opts?.logFile
    ? ["ignore", openSync(opts.logFile, "a"), openSync(opts.logFile, "a")]
    : ["ignore", "ignore", "ignore"];
  const child = spawn(command, args, {
    detached: true,
    stdio,
    cwd: opts?.cwd,
  });
  child.unref();
  return child.pid;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tailLog(path: string, maxChars = 1200): string {
  try {
    const text = readFileSync(path, "utf8");
    return text.length <= maxChars ? text : text.slice(-maxChars);
  } catch {
    return "(no log)";
  }
}

export async function connectCommand(opts: { server?: string }): Promise<void> {
  const dir = requireRobotPkgDir();
  const comms = join(dir, "comms.js");
  if (!existsSync(comms)) {
    err(`comms.js not found at ${comms}`);
    process.exit(1);
  }

  if (!robotPkgHasRuntimeDeps(dir)) {
    const installRobot = join(getCliPaths().installDir, "packages", "agenticros-robot");
    err(`Robot package at ${dir} has no installed deps (socket.io-client, …).`);
    if (isNpmRuntimeRobotPkg(dir)) {
      err(
        `CLI fell back to the npm runtime/ snapshot (sources only). Expected a deps-installed tree at ${installRobot}.`,
      );
    }
    err(`Fix now:  cd ${getCliPaths().installDir} && pnpm install`);
    err("Or:       agenticros init --force");
    err("Then:     agenticros connect");
    process.exit(1);
  }

  // Avoid stacking multiple silent comms processes.
  await pkill("comms.js");
  await new Promise((r) => setTimeout(r, 300));

  const id = await ensureRobotId();

  const args = ["--max-old-space-size=1024", "--expose-gc", comms];
  if (opts.server) {
    let s = opts.server.toLowerCase();
    if (!s.startsWith("ws")) s = `ws://${s}`;
    args.push("--server", s);
  }

  info(`Starting ${comms}`);
  info(`Logs: ${COMMS_LOG}`);
  if (!robotPkgHasInlineStatus(dir)) {
    warn(
      "This comms.js is outdated (no in-process remote status). /remote hardware indicators will fail.",
    );
    warn("Fix: cd ~/Projects/agenticros && git pull origin main");
    warn("  or: agenticros init --force && agenticros connect");
  }
  const pid = spawnDetached("node", args, { cwd: dir, logFile: COMMS_LOG });
  if (pid === undefined) {
    err("Failed to spawn comms.js");
    process.exit(1);
  }

  // Give startup enough time to fail on missing native modules.
  await new Promise((r) => setTimeout(r, 1500));
  if (!isPidAlive(pid)) {
    err("comms.js exited immediately — robot did not stay connected.");
    err(`Last log output:\n${tailLog(COMMS_LOG)}`);
    process.exit(1);
  }

  ok("Robot connected.");
  info(`ROBOT ID: ${id}`);
  info(`pid ${pid}`);
  info(`Cloud: ${CLOUD_REST} (override with -s)`);
}

export async function disconnectCommand(): Promise<void> {
  await pkill("comms.js");
  ok("Robot disconnected.");
}

export async function idCommand(): Promise<void> {
  const id = (await ensureRobotId()) || getRobotId();
  process.stdout.write(`ROBOT ID: ${id ?? "(none)"}\n`);
}

export async function setCommand(opts: { token?: string; id?: string }): Promise<void> {
  if (!opts.token && !opts.id) {
    err("Provide --token and/or --id (API token from cloud.agenticros.com).");
    process.exit(1);
  }
  if (opts.token) {
    setApiToken(opts.token);
    ok(`API token saved.`);
  }
  if (opts.id) {
    setRobotId(opts.id);
    ok(`ROBOT ID: ${opts.id}`);
  }
}

export interface MotorsStartOptions {
  backend?: string;
  pins?: string;
  encoderpins?: string;
  device?: string;
}

export async function startMotorsCommand(opts: MotorsStartOptions = {}): Promise<void> {
  const dir = requireRobotPkgDir();
  const script = join(dir, "start-motors.js");
  if (!existsSync(script)) {
    err(`start-motors.js not found at ${script}`);
    process.exit(1);
  }

  const args = [script];
  if (opts.backend) args.push("-b", opts.backend);
  if (opts.pins) args.push("-p", opts.pins);
  if (opts.encoderpins) args.push("-e", opts.encoderpins);
  if (opts.device) args.push("-d", opts.device);

  try {
    await execa("node", args, { stdio: "inherit", cwd: dir });
    ok("Robot motors started.");
  } catch (e) {
    warn(`start motors failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

export async function stopMotorsCommand(): Promise<void> {
  await pkill("motors-rpi5.js");
  await pkill("motors-firmata.js");
  await pkill("motors-jetson.js");
  ok("Robot motors stopped.");
}

export async function startCameraCommand(opts: {
  device?: string;
  resolution?: string;
  fps?: string;
}): Promise<void> {
  const dir = requireRobotPkgDir();
  const script = join(dir, "camera-2d-ros.js");
  if (!existsSync(script)) {
    err(`camera-2d-ros.js not found at ${script}`);
    process.exit(1);
  }
  const args = [script];
  if (opts.device) args.push("--device", opts.device);
  if (opts.resolution) args.push("--resolution", opts.resolution);
  if (opts.fps) args.push("--fps", opts.fps);
  spawnDetached("node", args);
  ok("Robot camera started.");
}

export async function stopCameraCommand(): Promise<void> {
  await pkill("camera-2d-ros.js");
  ok("Robot camera stopped.");
}

export async function startRealsenseCommand(opts: {
  pointcloud?: boolean;
  full?: boolean;
  model?: string;
}): Promise<void> {
  const script = resolveScriptPath("start_realsense.sh");
  if (!existsSync(script)) {
    err(`start_realsense.sh not found at ${script}`);
    err("Upgrade the CLI (`npm i -g agenticros@latest`) or run `agenticros init --force` to refresh ~/agenticros/scripts.");
    process.exit(1);
  }
  const ros = detectRosDistro();
  const distro = ros.distro ?? "jazzy";
  const args = [script, distro];
  if (opts.pointcloud) args.push("--pointcloud");
  if (opts.full) args.push("--full");

  let model = opts.model;
  if (!model && !opts.full) {
    const details = await fetchRobotDetails();
    model = details.camera;
  }
  if (model) args.push(`--model=${model}`);

  try {
    await execa("bash", args, { stdio: "inherit" });
    ok("Robot realsense started.");
  } catch (e) {
    warn(`start realsense failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

export async function stopRealsenseCommand(): Promise<void> {
  const script = resolveScriptPath("stop_realsense.sh");
  if (existsSync(script)) {
    await execa("bash", [script], { stdio: "inherit", reject: false });
  } else {
    await pkill("realsense2_camera_node");
    await pkill("ros2 launch realsense2_camera");
  }
  ok("Robot realsense stopped.");
}

/** Dispatch for `agenticros start <target>` / `stop <target>`. */
export async function startServiceCommand(
  target: string,
  opts: MotorsStartOptions & {
    pointcloud?: boolean;
    full?: boolean;
    model?: string;
    device?: string;
    resolution?: string;
    fps?: string;
  },
): Promise<void> {
  switch (target.toLowerCase()) {
    case "motors":
      await startMotorsCommand(opts);
      break;
    case "realsense":
      await startRealsenseCommand({
        pointcloud: opts.pointcloud,
        full: opts.full,
        model: opts.model,
      });
      break;
    case "camera":
      await startCameraCommand(opts);
      break;
    default:
      err(`Unknown start target "${target}". Use motors | realsense | camera.`);
      process.exit(1);
  }
}

export async function stopServiceCommand(target: string): Promise<void> {
  switch (target.toLowerCase()) {
    case "motors":
      await stopMotorsCommand();
      break;
    case "realsense":
      await stopRealsenseCommand();
      break;
    case "camera":
      await stopCameraCommand();
      break;
    default:
      err(`Unknown stop target "${target}". Use motors | realsense | camera.`);
      process.exit(1);
  }
}
