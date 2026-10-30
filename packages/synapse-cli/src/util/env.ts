/**
 * Environment + system detection helpers shared by doctor, init, and the runners.
 */

import { existsSync, readdirSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Preferred order when more than one ROS 2 install is present. */
const KNOWN_DISTROS = ["humble", "iron", "jazzy", "kilted", "lyrical", "rolling"] as const;

function installedRosDistros(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "setup.bash")))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export interface RosInfo {
  distro: string | undefined;
  setupBash: string | undefined;
}

/**
 * Look for `<root>/<distro>/setup.bash`. Honors an explicit preference, then
 * `ROS_DISTRO`, then the known list, then any other installed distro such as
 * Lyrical. Returns the first that exists, or undefined.
 */
export function detectRosDistro(preferred?: string, root = "/opt/ros"): RosInfo {
  const installed = new Set(installedRosDistros(root));
  const candidates = [
    preferred,
    process.env.ROS_DISTRO,
    ...KNOWN_DISTROS,
    ...installed,
  ];
  const seen = new Set<string>();
  for (const distro of candidates) {
    if (!distro || seen.has(distro)) continue;
    seen.add(distro);
    if (!installed.has(distro)) continue;
    return { distro, setupBash: join(root, distro, "setup.bash") };
  }
  return { distro: undefined, setupBash: undefined };
}

/**
 * Build the bash command prelude that sources ROS and the Corebrum Synapse overlay
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

/** True when Gazebo Sim (`gz sim`) is installed (system or ROS vendor). */
export function hasGazeboHarmonic(): boolean {
  for (const dir of ["/usr/bin", "/usr/local/bin"]) {
    if (existsSync(join(dir, "gz"))) return true;
  }
  for (const distro of KNOWN_DISTROS) {
    if (
      existsSync(`/opt/ros/${distro}/opt/gz_tools_vendor/bin/gz`) ||
      existsSync(`/opt/ros/${distro}/opt/gz_sim_vendor/bin/gz`)
    ) {
      return true;
    }
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
