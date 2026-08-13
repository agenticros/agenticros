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

/** True when this tree has the 0.7.5+ in-process remote status handler. */
export function robotPkgHasInlineStatus(dir: string): boolean {
  try {
    const src = readFileSync(join(dir, "comms.js"), "utf8");
    return src.includes("buildInlineStatusJson");
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
 * Prefers a tree that (1) has runtime deps and (2) includes the in-process
 * remote status handler — a stale git clone with deps otherwise silently wins
 * over a fresher npm/init install and breaks /remote status.
 */
export function getRobotPkgDir(): string | undefined {
  const paths = getCliPaths();
  const candidates: string[] = [];

  // installDir before repoRoot so `agenticros init` / npm upgrades win over a
  // stale ~/Projects/agenticros checkout when both have deps.
  candidates.push(join(paths.installDir, "packages", "agenticros-robot"));
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

  const scored = existing.map((dir) => ({
    dir,
    hasDeps: robotPkgHasRuntimeDeps(dir),
    hasInline: robotPkgHasInlineStatus(dir),
  }));

  return (
    scored.find((s) => s.hasDeps && s.hasInline)?.dir ??
    scored.find((s) => s.hasDeps)?.dir ??
    scored.find((s) => s.hasInline)?.dir ??
    scored[0]?.dir
  );
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

/** True when `dir` is the published npm runtime/ snapshot (sources only, no deps). */
export function isNpmRuntimeRobotPkg(dir: string): boolean {
  return /[/\\]runtime[/\\]packages[/\\]agenticros-robot$/.test(dir);
}
