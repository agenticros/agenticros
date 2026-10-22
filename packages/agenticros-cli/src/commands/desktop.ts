/**
 * `agenticros desktop` — Hyprland remote desktop agent for AgenticROS Cloud.
 *
 * Foreground (`--foreground`) is what the systemd user unit runs. The default
 * detaches, writes /tmp/agenticros-desktop.pid, and logs to
 * /tmp/agenticros-desktop.log so `agenticros down` can stop it.
 */

import { existsSync, openSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

import {
  clearPid,
  isPidAlive,
  logPath,
  readPid,
  writePid,
} from "../util/pidfile.js";
import { getCliPaths } from "../util/paths.js";
import { err, info, ok, warn } from "../util/logger.js";

export interface DesktopOptions {
  foreground?: boolean;
  testPattern?: boolean;
  port?: string | number;
  width?: string | number;
  height?: string | number;
  fps?: string | number;
}

const READY_MARK = "agenticros desktop listening on";
const READY_TIMEOUT_MS = 8_000;

function desktopEntry(): { entry: string; pkgDir: string } | undefined {
  const paths = getCliPaths();
  if (!paths.repoRoot) return undefined;
  const pkgDir = join(paths.repoRoot, "packages", "agenticros-desktop");
  const entry = join(pkgDir, "src", "index.js");
  if (!existsSync(entry)) return undefined;
  return { entry, pkgDir };
}

function lastLogLines(n = 20): string {
  try {
    const text = readFileSync(logPath("desktop"), "utf8").trimEnd();
    if (!text) return "(log empty)";
    return text.split("\n").slice(-n).join("\n");
  } catch {
    return "(no log yet)";
  }
}

function childArgs(opts: DesktopOptions): string[] {
  const args: string[] = [];
  if (opts.testPattern) args.push("--test-pattern");
  if (opts.port != null) args.push("--port", String(opts.port));
  if (opts.width != null) args.push("--width", String(opts.width));
  if (opts.height != null) args.push("--height", String(opts.height));
  if (opts.fps != null) args.push("--fps", String(opts.fps));
  return args;
}

export async function desktopCommand(opts: DesktopOptions = {}): Promise<void> {
  const resolved = desktopEntry();
  if (!resolved) {
    err(
      "Desktop package not found (packages/agenticros-desktop). Run `agenticros init` or use a full workspace clone.",
    );
    process.exit(1);
  }

  const args = childArgs(opts);
  if (opts.foreground) {
    const child = spawn(process.execPath, [resolved.entry, ...args], {
      cwd: resolved.pkgDir,
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => process.exit(code ?? 1));
    return;
  }

  if (isPidAlive("desktop")) {
    const pid = readPid("desktop");
    warn(`Desktop agent already running (pid ${pid}). Stop with: agenticros down`);
    info(`Logs: ${logPath("desktop")}`);
    return;
  }
  if (readPid("desktop") !== undefined) clearPid("desktop");

  const logFd = openSync(logPath("desktop"), "a");
  const child = spawn(process.execPath, [resolved.entry, ...args], {
    cwd: resolved.pkgDir,
    env: process.env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  if (!child.pid) {
    err("Failed to spawn the desktop agent.");
    process.exit(1);
  }
  writePid("desktop", child.pid);

  const ready = await waitReady();
  if (ready !== "ready") {
    if (ready === "dead") clearPid("desktop");
    err(
      ready === "dead"
        ? `Desktop agent exited before listening. Last log lines from ${logPath("desktop")}:\n${lastLogLines()}`
        : `Desktop agent did not report ready within ${READY_TIMEOUT_MS / 1000}s. Check ${logPath("desktop")}.`,
    );
    process.exit(1);
  }

  ok(`Desktop agent started (pid ${child.pid})`);
  info(`  listen: 127.0.0.1:${opts.port ?? process.env["AGENTICROS_DESKTOP_PORT"] ?? "8766"}`);
  info(`  logs:   ${logPath("desktop")}`);
  info("Stop with: agenticros down");
  info("Cloud page: the desktop button on the robots list, after `agenticros connect`.");
}

async function waitReady(): Promise<"ready" | "dead" | "timeout"> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isPidAlive("desktop")) return "dead";
    try {
      const text = readFileSync(logPath("desktop"), "utf8");
      if (text.includes(READY_MARK)) return "ready";
    } catch {
      // log not written yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return isPidAlive("desktop") ? "timeout" : "dead";
}
