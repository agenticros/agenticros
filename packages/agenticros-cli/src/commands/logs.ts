/**
 * `agenticros logs [target]` - tail logs from the components we know about.
 *
 * Targets:
 *   camera   /tmp/agenticros-camera.log  (started by start_demo.sh)
 *   mcp      /tmp/agenticros-mcp.log     (the MCP server)
 *   sim      /tmp/agenticros-sim.log     (the sim launcher)
 *   gateway  journalctl --user-unit openclaw-gateway.service
 *
 * Without a target, prints the list of available log targets.
 */

import { existsSync } from "node:fs";

import { execa } from "execa";

import { logPath, type ManagedProcess } from "../util/pidfile.js";
import { colors, header, info, warn } from "../util/logger.js";

type LogTarget = "camera" | "mcp" | "sim" | "rosbridge" | "gateway";

const TARGETS: LogTarget[] = ["camera", "mcp", "sim", "rosbridge", "gateway"];

export interface LogsOptions {
  target?: string;
  follow?: boolean;
  lines?: string;
}

export async function logsCommand(opts: LogsOptions): Promise<void> {
  const target = (opts.target ?? "").toLowerCase() as LogTarget;
  if (!target) {
    header("AgenticROS log targets");
    for (const t of TARGETS) printTargetAvailability(t);
    info("Pick one: `agenticros logs <target>` (e.g. `agenticros logs camera`).");
    return;
  }
  if (!TARGETS.includes(target)) {
    warn(`Unknown log target '${opts.target}'. Valid: ${TARGETS.join(", ")}.`);
    process.exit(2);
  }

  const follow = opts.follow === true;
  const n = Number(opts.lines ?? 200);

  if (target === "gateway") {
    const args = ["--user", "-u", "openclaw-gateway.service", "-n", String(n)];
    if (follow) args.push("-f");
    try {
      await execa("journalctl", args, { stdio: "inherit" });
    } catch (e) {
      warn(`journalctl failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return;
  }

  const path = logPath(target as ManagedProcess);
  if (!existsSync(path)) {
    warn(`No log file at ${path}.`);
    return;
  }
  const args = follow ? ["-n", String(n), "-F", path] : ["-n", String(n), path];
  try {
    await execa("tail", args, { stdio: "inherit" });
  } catch {
    // tail returns 130 on SIGINT (Ctrl-C). That's a clean exit for `-F`.
  }
}

function printTargetAvailability(t: LogTarget): void {
  if (t === "gateway") {
    process.stdout.write(`  ${colors.cyan("gateway")} ${colors.dim("(journalctl --user-unit openclaw-gateway.service)")}\n`);
    return;
  }
  const p = logPath(t as ManagedProcess);
  const exists = existsSync(p);
  const icon = exists ? colors.green("●") : colors.dim("○");
  process.stdout.write(`  ${icon}  ${t.padEnd(10)} ${colors.dim(p)}\n`);
}
