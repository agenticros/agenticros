#!/usr/bin/env node
/**
 * Select motor backend and spawn the matching controller (detached).
 *
 * Usage:
 *   node start-motors.js [-b rpi|firmata|jetson] [-p pins] [-e encoderpins] [-d device]
 *                        [--odom] [--no-odom] [--tpr n]
 *
 * Defaults: Raspberry Pi (portal compute) → motors-rpi5.js; else firmata.
 * Jetson native GPIO is opt-in only via -b jetson (never auto-selected).
 *
 * The controller is only reported as started if it is still alive after a
 * short settle window. Native-addon crashes (common after a Node upgrade)
 * are written to /tmp/agenticros-motors.log and fail this script.
 */

import { execFile as execFileCb } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import minimist from "minimist";

import { ensureRobotId, getApiToken, fetchRobotDetails } from "./robot-config.js";
import { spawnDetachedVerified, tailLog } from "./lib/spawn-detached.js";

const execFile = promisify(execFileCb);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = minimist(process.argv.slice(2));
const MOTORS_LOG = "/tmp/agenticros-motors.log";

await ensureRobotId();
void getApiToken();
const { compute } = await fetchRobotDetails();

const rpi = path.join(__dirname, "motors-rpi5.js");
const firmata = path.join(__dirname, "motors-firmata.js");
const jetson = path.join(__dirname, "motors-jetson.js");

let script = compute === "Raspberry Pi" ? rpi : firmata;
if (argv.b === "rpi") script = rpi;
else if (argv.b === "firmata") script = firmata;
else if (argv.b === "jetson") script = jetson;

const options = [script];
if (argv.d) {
  options.push("--device", String(argv.d));
}
if (argv.p) {
  options.push("--pins", String(argv.p));
}
if (argv.e) {
  options.push("--encoderpins", String(argv.e));
}
if (argv.odom === true) {
  options.push("--odom");
}
if (argv.odom === false || argv["no-odom"]) {
  options.push("--no-odom");
}
if (argv.tpr != null && argv.tpr !== true) {
  options.push("--tpr", String(argv.tpr));
}

async function pkill(pattern) {
  try {
    await execFile("pkill", ["-f", pattern]);
  } catch {
    // pkill exits 1 when nothing matched
  }
}

await pkill("motors-rpi5.js");
await pkill("motors-firmata.js");
await pkill("motors-jetson.js");
await new Promise((r) => setTimeout(r, 200));

const name = path.basename(script);
try {
  const { pid } = await spawnDetachedVerified({
    command: process.execPath,
    args: options,
    cwd: __dirname,
    logFile: MOTORS_LOG,
  });
  console.log(`Motor controller running (${name} pid ${pid}).`);
  console.log(`Logs: ${MOTORS_LOG}`);
} catch (e) {
  const log = e && typeof e === "object" && "log" in e ? String(e.log) : tailLog(MOTORS_LOG);
  console.error(`Motor controller failed to stay running (${name}).`);
  console.error(`Last log output:\n${log}`);
  if (log.includes("NODE_MODULE_VERSION")) {
    console.error(
      "Native module ABI mismatch after a Node.js upgrade. Run: agenticros init --force",
    );
  }
  process.exit(1);
}
