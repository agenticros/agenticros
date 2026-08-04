#!/usr/bin/env node
/**
 * Select motor backend and spawn the matching controller (detached).
 *
 * Usage:
 *   node start-motors.js [-b rpi|firmata|jetson] [-p pins] [-e encoderpins] [-d device]
 *
 * Defaults: Raspberry Pi (portal compute) → motors-rpi5.js; else firmata.
 * Jetson native GPIO is opt-in only via -b jetson (never auto-selected).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import minimist from "minimist";

import { ensureRobotId, getApiToken, fetchRobotDetails } from "./robot-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = minimist(process.argv.slice(2));

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

const child = spawn("node", options, {
  detached: true,
  stdio: "ignore",
});
child.unref();
console.log("Robot motors started.");
process.exit(0);
