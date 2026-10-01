/**
 * On-robot hardware commands ported from robotics-npm:
 * connect / disconnect, start|stop motors|realsense|camera, id, set.
 *
 * Cloud defaults: https://cloud.agenticros.com / wss://cloud.agenticros.com
 */

import { spawn } from "node:child_process";
import { existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ensureActiveMap, type RobotMap } from "@agenticros/core";
import { execa } from "execa";

import {
  isNpmRuntimeRobotPkg,
  requireRobotPkgDir,
  robotPkgHasInlineStatus,
  robotPkgHasRuntimeDeps,
} from "../util/robot-pkg.js";
import { getCliPaths, resolveScriptPath } from "../util/paths.js";
import { detectRosDistro } from "../util/env.js";
import { getActiveRobotId, readConfigObject, readRobots } from "../util/robot-config.js";
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
  await new Promise((r) => setTimeout(r, 200));
  // Escalate leftovers — stale comms.js processes keep cloud presence / sockets around.
  await execa("pkill", ["-9", "-f", pattern], { reject: false });
}

async function listCommsPids(): Promise<string[]> {
  try {
    const { stdout, exitCode } = await execa("pgrep", ["-af", "comms.js"], { reject: false });
    if (exitCode !== 0 || !stdout.trim()) return [];
    return stdout
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function spawnDetached(
  command: string,
  args: string[],
  opts?: { cwd?: string; logFile?: string; env?: NodeJS.ProcessEnv },
): number | undefined {
  const stdio: ("ignore" | number)[] = opts?.logFile
    ? ["ignore", openSync(opts.logFile, "a"), openSync(opts.logFile, "a")]
    : ["ignore", "ignore", "ignore"];
  const child = spawn(command, args, {
    detached: true,
    stdio,
    cwd: opts?.cwd,
    env: opts?.env,
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
  await new Promise((r) => setTimeout(r, 400));
  const leftovers = await listCommsPids();
  if (leftovers.length > 0) {
    warn("comms.js still running after pkill — trying once more:");
    for (const line of leftovers) warn(`  ${line}`);
    await pkill("comms.js");
    await new Promise((r) => setTimeout(r, 400));
  }

  const id = await ensureRobotId();

  const args = ["--max-old-space-size=1024", "--expose-gc", comms];
  if (opts.server) {
    let s = opts.server.toLowerCase();
    if (!s.startsWith("ws")) s = `ws://${s}`;
    args.push("--server", s);
  }

  info(`Starting ${comms}`);
  info(`Logs: ${COMMS_LOG}`);
  info(`CLI: agenticros (inlineStatus=${robotPkgHasInlineStatus(dir) ? "yes" : "no"})`);
  if (!robotPkgHasInlineStatus(dir)) {
    warn(
      "This comms.js is outdated (no in-process remote status). /remote hardware indicators will fail.",
    );
    warn("Fix: cd ~/Projects/agenticros && git pull origin main");
    warn("  or: agenticros init --force && agenticros connect");
  }
  // Fresh log each connect so boot markers are easy to grep.
  try {
    writeFileSync(COMMS_LOG, "");
  } catch {
    /* ignore */
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

  const running = await listCommsPids();
  if (running.length > 1) {
    warn(`Multiple comms.js processes running (${running.length}) — presence/status will be wrong:`);
    for (const line of running) warn(`  ${line}`);
  }

  ok("Robot connected.");
  info(`ROBOT ID: ${id}`);
  info(`pid ${pid}`);
  info(`Cloud: ${CLOUD_REST} (override with -s)`);
  info("Verify: pgrep -af comms.js && tail -20 /tmp/agenticros-comms.log");
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
  odom?: boolean;
  noOdom?: boolean;
  tpr?: string;
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
  if (opts.odom) args.push("--odom");
  if (opts.noOdom) args.push("--no-odom");
  if (opts.tpr) args.push("--tpr", opts.tpr);

  try {
    await execa("node", args, { stdio: "inherit", cwd: dir });
    ok("Robot motors started.");
  } catch (e) {
    warn(`start motors failed: ${e instanceof Error ? e.message : String(e)}`);
    warn("See /tmp/agenticros-motors.log (or: agenticros logs motors)");
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
  extraEnv?: Record<string, string>;
  softFail?: boolean;
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
    await execa("bash", args, {
      stdio: "inherit",
      env: { ...process.env, ...opts.extraEnv },
    });
    ok("Robot realsense started.");
  } catch (e) {
    warn(`start realsense failed: ${e instanceof Error ? e.message : String(e)}`);
    if (opts.softFail) return;
    process.exit(1);
  }
}

export async function stopRealsenseCommand(opts: { quiet?: boolean } = {}): Promise<void> {
  const script = resolveScriptPath("stop_realsense.sh");
  if (existsSync(script)) {
    await execa("bash", [script], {
      stdio: opts.quiet ? "ignore" : "inherit",
      reject: false,
    });
  } else {
    await pkill("realsense2_camera_node");
    await pkill("ros2 launch realsense2_camera");
  }
  if (!opts.quiet) ok("Robot realsense stopped.");
}

function configuredNamespace(): string {
  const obj = readConfigObject();
  const { robots } = readRobots(obj);
  const activeId = getActiveRobotId(obj);
  const match = robots.find((r) => r.id === activeId);
  const fromRobot = (obj["robot"] as { namespace?: string } | undefined)?.namespace;
  return (match?.namespace ?? fromRobot ?? "").trim();
}

const MAPPING_LOG = "/tmp/agenticros-mapping.log";
const NAVIGATE_LOG = "/tmp/agenticros-navigate.log";

export interface MappingLaunchOptions {
  /** Room map to launch. Default: the active map, creating "Room" when none exist. */
  map?: RobotMap;
  /** Keep the database. Default: true when that database file already exists. */
  keep?: boolean;
  /** Launch RTAB-Map in localization mode (room switch). */
  localize?: boolean;
  /** Skip human status lines so --json stdout stays a single object. */
  quiet?: boolean;
}

export async function startMappingCommand(opts: MappingLaunchOptions = {}): Promise<void> {
  const script = resolveScriptPath("start_mapping.sh");
  if (!existsSync(script)) {
    err(`start_mapping.sh not found at ${script}`);
    err("Upgrade the CLI (`npm i -g agenticros@latest`) or run `agenticros init --force`.");
    process.exit(1);
  }
  const ros = detectRosDistro();
  if (!ros.distro) {
    err("No ROS 2 installation detected under /opt/ros/. Install ROS 2 Humble or Jazzy first.");
    process.exit(1);
  }
  const map = opts.map ?? ensureActiveMap();
  const keep = opts.keep ?? existsSync(map.databasePath);
  const say = (message: string) => {
    if (!opts.quiet) info(message);
  };
  // A second launch stacks Nav2 nodes until bt_navigator crashes.
  const { exitCode: mappingUp } = await execa("pgrep", ["-f", "[r]tabmap_nav2.launch.py"], {
    reject: false,
  });
  if (mappingUp === 0) {
    say("Stopping the mapping stack already running.");
    await stopMappingCommand({ quiet: true });
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Teleop RealSense is low-res and does not align depth to color, and it
  // holds the camera so this launch cannot start its own aligned stream.
  const { exitCode } = await execa("pgrep", ["-f", "[r]ealsense2_camera_node"], { reject: false });
  if (exitCode === 0) {
    say("Stopping the current RealSense so mapping can start an aligned camera.");
    await stopRealsenseCommand({ quiet: opts.quiet });
    await new Promise((r) => setTimeout(r, 1500));
  }
  const ns = configuredNamespace();
  const pid = spawnDetached("bash", [script, ros.distro], {
    logFile: MAPPING_LOG,
    env: {
      ...process.env,
      AGENTICROS_ROBOT_NAMESPACE: ns,
      AGENTICROS_MAP_DATABASE: map.databasePath,
      AGENTICROS_KEEP_MAP: keep ? "1" : "0",
      AGENTICROS_MAP_LOCALIZE: opts.localize ? "1" : "0",
    },
  });
  if (!opts.quiet) {
    const mode = opts.localize ? "localizing" : keep ? "resuming" : "mapping";
    ok(
      `${map.label}: ${mode}${pid ? ` (pid ${pid})` : ""}. Log: ${MAPPING_LOG}`,
    );
  }
}

export async function stopMappingCommand(opts: { quiet?: boolean } = {}): Promise<void> {
  const patterns = [
    "rtabmap_nav2.launch.py",
    "start_mapping.sh",
    "rtabmap",
    "nav2_container",
    "bt_navigator",
    "controller_server",
    "planner_server",
    "behavior_server",
    "smoother_server",
    "waypoint_follower",
    "velocity_smoother",
    "route_server",
    "collision_monitor",
    "docking_server",
    "lifecycle_manager_navigation",
    "agenticros_explore",
    "camera_stamp_fix",
    "static_tf_base_link",
    "cmd_vel_relay",
  ];
  for (const pattern of patterns) {
    await pkill(pattern);
  }
  if (!opts.quiet) ok("Mapping stack stopped.");
}

function finiteCoord(value: number, label: string, limit: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > limit) {
    err(`${label} must be a finite number within ±${limit}.`);
    process.exit(2);
  }
  return value;
}

export async function navigateCommand(opts: { x: number; y: number; yaw?: number }): Promise<void> {
  const script = resolveScriptPath("navigate_to.sh");
  if (!existsSync(script)) {
    err(`navigate_to.sh not found at ${script}`);
    err("Upgrade the CLI (`npm i -g agenticros@latest`) or run `agenticros init --force`.");
    process.exit(1);
  }
  const ros = detectRosDistro();
  if (!ros.distro) {
    err("No ROS 2 installation detected under /opt/ros/. Install ROS 2 Humble or Jazzy first.");
    process.exit(1);
  }
  const x = finiteCoord(opts.x, "x", 500);
  const y = finiteCoord(opts.y, "y", 500);
  const yaw = finiteCoord(opts.yaw ?? 0, "yaw", 6.3);
  const z = Math.sin(yaw / 2);
  const w = Math.cos(yaw / 2);
  const ns = configuredNamespace();
  const pid = spawnDetached(
    "bash",
    [script, ros.distro, x.toFixed(3), y.toFixed(3), z.toFixed(6), w.toFixed(6)],
    {
      logFile: NAVIGATE_LOG,
      env: {
        ...process.env,
        AGENTICROS_ROBOT_NAMESPACE: ns,
      },
    },
  );
  ok(
    `Navigate goal sent (${x.toFixed(3)}, ${y.toFixed(3)}, yaw ${yaw.toFixed(3)})${pid ? ` pid ${pid}` : ""}. Log: ${NAVIGATE_LOG}`,
  );
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
    case "mapping":
      await startMappingCommand();
      break;
    default:
      err(`Unknown start target "${target}". Use motors | realsense | camera | mapping.`);
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
    case "mapping":
      await stopMappingCommand();
      break;
    default:
      err(`Unknown stop target "${target}". Use motors | realsense | camera | mapping.`);
      process.exit(1);
  }
}
