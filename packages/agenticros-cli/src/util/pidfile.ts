/**
 * Pidfile management for processes the CLI spawns into the background
 * (RealSense camera, Gazebo, etc.). Same /tmp/agenticros-*.pid convention as
 * the existing scripts/start_demo.sh.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const PID_DIR = "/tmp";

export type ManagedProcess =
  | "camera"
  | "sim"
  | "mcp"
  | "rosbridge"
  | "eyes";

function pidPath(name: ManagedProcess): string {
  return `${PID_DIR}/agenticros-${name}.pid`;
}

export function writePid(name: ManagedProcess, pid: number): void {
  writeFileSync(pidPath(name), String(pid));
}

export function readPid(name: ManagedProcess): number | undefined {
  const p = pidPath(name);
  if (!existsSync(p)) return undefined;
  const raw = readFileSync(p, "utf8").trim();
  const pid = Number(raw);
  return Number.isFinite(pid) && pid > 0 ? pid : undefined;
}

/** True if the recorded PID exists and is still alive. */
export function isPidAlive(name: ManagedProcess): boolean {
  const pid = readPid(name);
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Kill the recorded process gently (SIGTERM). Returns the pid that was signalled. */
export function killPid(name: ManagedProcess, signal: NodeJS.Signals = "SIGTERM"): number | undefined {
  const pid = readPid(name);
  if (!pid) return undefined;
  try {
    process.kill(pid, signal);
    return pid;
  } catch {
    return undefined;
  }
}

export function clearPid(name: ManagedProcess): void {
  const p = pidPath(name);
  if (existsSync(p)) {
    try {
      unlinkSync(p);
    } catch {
      // best effort
    }
  }
}

/** Log file path for a managed process, matching the start_demo.sh convention. */
export function logPath(name: ManagedProcess): string {
  return `/tmp/agenticros-${name}.log`;
}
