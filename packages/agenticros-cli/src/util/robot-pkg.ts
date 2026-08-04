/**
 * Resolve the on-robot helper package (`@agenticros/robot`) under the active
 * workspace / install / bundle tree.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { getCliPaths } from "./paths.js";

/**
 * Absolute path to packages/agenticros-robot, or undefined if not available
 * (e.g. pre-init bundle mode without packing that package yet).
 */
export function getRobotPkgDir(): string | undefined {
  const paths = getCliPaths();
  const candidates: string[] = [];
  if (paths.repoRoot) {
    candidates.push(join(paths.repoRoot, "packages", "agenticros-robot"));
  }
  if (paths.bundleDir) {
    candidates.push(join(paths.bundleDir, "packages", "agenticros-robot"));
  }
  for (const dir of candidates) {
    if (existsSync(join(dir, "package.json"))) return dir;
  }
  return undefined;
}

export function requireRobotPkgDir(): string {
  const dir = getRobotPkgDir();
  if (!dir) {
    throw new Error(
      "Robot hardware package not found (packages/agenticros-robot). Run `agenticros init` first.",
    );
  }
  return dir;
}
