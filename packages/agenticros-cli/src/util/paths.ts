/**
 * Path discovery for the AgenticROS CLI.
 *
 * The CLI can be invoked three ways:
 *   1. Workspace mode  - from a cloned monorepo. Scripts live under
 *      <repo-root>/scripts/, ros2 sources under <repo-root>/ros2_ws/src/, and
 *      built MCP under <repo-root>/packages/agenticros-claude-code/dist/.
 *   2. Installed mode  - after `npx agenticros init` has copied the bundled
 *      snapshot into ~/agenticros (the install dir). Same layout as workspace
 *      mode but rooted at the install dir. This is the "post-init" steady state.
 *   3. Bundle mode  - first invocation of `npx agenticros` before init has run.
 *      Paths point into the package's own runtime/ directory, populated at
 *      publish time by scripts/pack-runtime.mjs. Only read-only tools (doctor,
 *      version, --help) are guaranteed to work in bundle mode.
 *
 * Workspace mode is preferred when detected so contributors see their live edits.
 * Installed mode is preferred over bundle mode so that init-time builds (which
 * write dist artifacts into ~/agenticros) are honoured on subsequent invocations.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

export type CliMode = "workspace" | "installed" | "bundle";

export interface CliPaths {
  /** Discovered execution mode. */
  mode: CliMode;
  /** Backwards-compat alias for code that just wants the workspace/installed branch. */
  workspaceMode: boolean;
  /** Directory containing the agenticros CLI package (where runtime/ would live). */
  pkgDir: string;
  /**
   * Active "repo root" the CLI is operating against. For workspace mode this is
   * the cloned monorepo. For installed mode this is the install dir. For bundle
   * mode this is undefined (no writable repo root yet).
   */
  repoRoot: string | undefined;
  /** Directory where AgenticROS user data lives ($HOME/.agenticros). */
  userDataDir: string;
  /** Default install directory written by `agenticros init` (~/agenticros). */
  installDir: string;
  /** Path to the scripts/ directory (live workspace or bundled snapshot). */
  scriptsDir: string;
  /** Path to ros2_ws/src/ source root (live workspace or bundled snapshot). */
  ros2WsSrcDir: string;
  /** Path to the MCP server build directory (agenticros-claude-code/dist or runtime/mcp). */
  mcpDistDir: string;
  /** Path to bundled sample configs (only meaningful in npm mode; falls back to repo docs/). */
  configsDir: string;
  /**
   * Path to the bundled snapshot of the monorepo (only set in bundle mode and
   * for `agenticros init` in installed mode where it's the source-of-truth for
   * the initial copy). Undefined in workspace mode.
   */
  bundleDir: string | undefined;
}

/**
 * True when `dir` looks like an AgenticROS monorepo root (live or installed
 * snapshot): its package.json is `agenticros-monorepo`.
 *
 * Exported so `agenticros init` can use the same predicate `getCliPaths()`
 * does when deciding whether an existing install dir is complete enough to
 * skip a re-copy. Keeping the two checks in sync avoids "skipped copy but
 * still detected as bundle mode -> CLI bug" loops after a crashed previous
 * install left a half-empty target dir behind.
 */
export function isAgenticrosMonorepo(dir: string): boolean {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    return pkg.name === "agenticros-monorepo";
  } catch {
    return false;
  }
}

/**
 * Walk up from `startDir` looking for an agenticros-monorepo package.json.
 * Returns the repo root or undefined.
 */
function findRepoRoot(startDir: string): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (isAgenticrosMonorepo(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

let cached: CliPaths | undefined;

export function getCliPaths(): CliPaths {
  if (cached) return cached;

  // moduleDir is .../packages/agenticros-cli/dist/util in workspace, or
  // .../node_modules/agenticros/dist/util in npm install. The published bundle
  // is a single file dist/index.js, so moduleDir will be .../dist.
  // Walk up to find the package dir (the one with our package.json).
  let pkgDir = moduleDir;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(pkgDir, "package.json"))) break;
    pkgDir = dirname(pkgDir);
  }

  const workspaceRoot = findRepoRoot(pkgDir);

  const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".";
  const userDataDir = join(home, ".agenticros");
  const installDir = process.env["AGENTICROS_HOME"] ?? join(home, "agenticros");
  const bundleDir = join(pkgDir, "runtime");

  // Workspace mode wins outright: contributors get live edits.
  if (workspaceRoot) {
    cached = {
      mode: "workspace",
      workspaceMode: true,
      pkgDir,
      repoRoot: workspaceRoot,
      userDataDir,
      installDir,
      scriptsDir: join(workspaceRoot, "scripts"),
      ros2WsSrcDir: join(workspaceRoot, "ros2_ws", "src"),
      mcpDistDir: join(
        workspaceRoot,
        "packages",
        "agenticros-claude-code",
        "dist",
      ),
      configsDir: join(workspaceRoot, "docs"),
      bundleDir: existsSync(bundleDir) ? bundleDir : undefined,
    };
    return cached;
  }

  // Installed mode: ~/agenticros has been populated by a prior `agenticros init`.
  if (isAgenticrosMonorepo(installDir)) {
    cached = {
      mode: "installed",
      workspaceMode: true,
      pkgDir,
      repoRoot: installDir,
      userDataDir,
      installDir,
      scriptsDir: join(installDir, "scripts"),
      ros2WsSrcDir: join(installDir, "ros2_ws", "src"),
      mcpDistDir: join(
        installDir,
        "packages",
        "agenticros-claude-code",
        "dist",
      ),
      configsDir: join(installDir, "docs"),
      bundleDir: existsSync(bundleDir) ? bundleDir : undefined,
    };
    return cached;
  }

  // Bundle mode: first invocation of `npx agenticros` before init.
  cached = {
    mode: "bundle",
    workspaceMode: false,
    pkgDir,
    repoRoot: undefined,
    userDataDir,
    installDir,
    scriptsDir: join(bundleDir, "scripts"),
    ros2WsSrcDir: join(bundleDir, "ros2_ws", "src"),
    mcpDistDir: join(bundleDir, "packages", "agenticros-claude-code", "dist"),
    configsDir: join(bundleDir, "docs"),
    bundleDir,
  };
  return cached;
}

/** For tests / dev — reset cached path detection. */
export function resetPathsCache(): void {
  cached = undefined;
}

export function resolveScriptPath(name: string): string {
  return resolve(getCliPaths().scriptsDir, name);
}
