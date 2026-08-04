/**
 * On-robot hardware commands ported from robotics-npm:
 * connect / disconnect, start|stop motors|realsense|camera, id, set.
 *
 * Cloud defaults: https://cloud.agenticros.com / wss://cloud.agenticros.com
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import { requireRobotPkgDir } from "../util/robot-pkg.js";
import { resolveScriptPath } from "../util/paths.js";
import { detectRosDistro } from "../util/env.js";
import {
  CLOUD_REST,
  ensureRobotId,
  getRobotId,
  setApiToken,
  setRobotId,
} from "../util/robot-cloud-config.js";
import { err, info, ok, warn } from "../util/logger.js";

async function pkill(pattern: string): Promise<void> {
  await execa("pkill", ["-f", pattern], { reject: false });
}

function spawnDetached(command: string, args: string[]): void {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export async function connectCommand(opts: { server?: string }): Promise<void> {
  const dir = requireRobotPkgDir();
  const comms = join(dir, "comms.js");
  if (!existsSync(comms)) {
    err(`comms.js not found at ${comms}`);
    process.exit(1);
  }

  const id = await ensureRobotId();

  const args = ["--max-old-space-size=1024", "--expose-gc", comms];
  if (opts.server) {
    let s = opts.server.toLowerCase();
    if (!s.startsWith("ws")) s = `ws://${s}`;
    args.push("--server", s);
  }

  spawnDetached("node", args);
  ok("Robot connected.");
  info(`ROBOT ID: ${id}`);
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

export async function startRealsenseCommand(opts: { pointcloud?: boolean }): Promise<void> {
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
      await startRealsenseCommand({ pointcloud: opts.pointcloud });
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
