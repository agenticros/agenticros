/**
 * Environment + system detection helpers shared by doctor, init, and the runners.
 */

import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Common ROS 2 install locations under /opt/ros/<distro>/setup.bash. */
const KNOWN_DISTROS = ["humble", "iron", "jazzy", "rolling"] as const;

export interface RosInfo {
  distro: string | undefined;
  setupBash: string | undefined;
}

/** Look for /opt/ros/<distro>/setup.bash. Returns the first that exists, or undefined. */
export function detectRosDistro(preferred?: string): RosInfo {
  const candidates = preferred
    ? [preferred, ...KNOWN_DISTROS.filter((d) => d !== preferred)]
    : [...KNOWN_DISTROS];
  for (const distro of candidates) {
    const setupBash = `/opt/ros/${distro}/setup.bash`;
    if (existsSync(setupBash)) return { distro, setupBash };
  }
  return { distro: undefined, setupBash: undefined };
}

/**
 * Build the bash command prelude that sources ROS and the AgenticROS overlay
 * before running a subsequent command. Used by runners that invoke shell scripts
 * which expect `ros2`, `colcon`, etc. on PATH.
 */
export function buildRosSourcedShellCmd(
  body: string,
  opts: { distro?: string; overlay?: string } = {},
): string {
  const ros = detectRosDistro(opts.distro);
  const parts: string[] = [];
  if (ros.setupBash) parts.push(`source "${ros.setupBash}"`);
  if (opts.overlay && existsSync(opts.overlay)) parts.push(`source "${opts.overlay}"`);
  parts.push(body);
  return parts.join(" && ");
}

/** True when Gazebo Harmonic (`gz sim`) is installed. */
export function hasGazeboHarmonic(): boolean {
  for (const dir of ["/usr/bin", "/usr/local/bin"]) {
    if (existsSync(join(dir, "gz"))) return true;
  }
  return false;
}

export const isLinux = process.platform === "linux";
export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

/**
 * True when `name` resolves on PATH. Does not execute the binary.
 * On Windows also matches `.cmd` / `.exe` / `.bat` shims (e.g. `pnpm.cmd`).
 */
export function hasBin(name: string): boolean {
  const dirs = (process.env["PATH"] ?? "").split(delimiter);
  const names = isWindows ? [name, `${name}.cmd`, `${name}.exe`, `${name}.bat`] : [name];
  for (const dir of dirs) {
    if (!dir) continue;
    for (const n of names) {
      if (existsSync(join(dir, n))) return true;
    }
  }
  return false;
}

/** Whether we appear to be running on a Jetson (Tegra kernel). */
export function isJetson(): boolean {
  try {
    return existsSync("/etc/nv_tegra_release");
  } catch {
    return false;
  }
}
