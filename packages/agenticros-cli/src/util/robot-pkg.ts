/**
 * Resolve the on-robot helper package (`@agenticros/robot`) under the active
 * workspace / install / bundle tree.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { getCliPaths } from "./paths.js";

/**
 * True when Node can resolve hard dependencies of comms.js from this package
 * dir. The published runtime/ snapshot ships sources only — without
 * `pnpm install` / `agenticros init`, connect will crash immediately.
 */
export function robotPkgHasRuntimeDeps(dir: string): boolean {
  try {
    const req = createRequire(join(dir, "package.json"));
    req.resolve("socket.io-client");
    req.resolve("configstore");
    return true;
  } catch {
    return false;
  }
}

function findMonorepoFrom(startDir: string): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "agenticros-monorepo") return dir;
      } catch {
        // continue
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * Absolute path to packages/agenticros-robot, or undefined if not available.
 *
 * Prefers a tree whose deps can actually be resolved so `npx agenticros connect`
 * does not silently spawn a dep-less runtime/ copy.
 */
export function getRobotPkgDir(): string | undefined {
  const paths = getCliPaths();
  const candidates: string[] = [];

  if (paths.repoRoot) {
    candidates.push(join(paths.repoRoot, "packages", "agenticros-robot"));
  }
  const cwdRoot = findMonorepoFrom(process.cwd());
  if (cwdRoot) {
    candidates.push(join(cwdRoot, "packages", "agenticros-robot"));
  }
  if (paths.bundleDir) {
    candidates.push(join(paths.bundleDir, "packages", "agenticros-robot"));
  }
  candidates.push(join(paths.pkgDir, "runtime", "packages", "agenticros-robot"));

  const existing = candidates.filter(
    (dir, i, arr) => existsSync(join(dir, "package.json")) && arr.indexOf(dir) === i,
  );
  if (existing.length === 0) return undefined;

  const withDeps = existing.find((dir) => robotPkgHasRuntimeDeps(dir));
  return withDeps ?? existing[0];
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
