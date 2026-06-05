/**
 * Workspace bring-up helpers used by `agenticros init` and any runner that
 * needs the JS workspace built before it can launch (currently `up real`;
 * sim runners don't need TS deps).
 *
 * Why shared: across 0.1.2 .. 0.1.6 we kept hitting "user picks Launch
 * without running init first" failures. Rather than asking the user to
 * pick the right menu item, we just auto-recover.
 */

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import { info, ok, warn, withSpinner } from "./logger.js";

/**
 * `node_modules/` alone isn't proof that `pnpm install` completed - pnpm
 * creates the dir before it succeeds, and a half-finished install leaves it
 * empty or missing `.pnpm/` / `.bin/`. Checking for `.modules.yaml` (written
 * at the END of a successful install) is a reliable success marker.
 *
 * We ALSO verify that per-package symlinks exist - specifically the
 * agenticros-claude-code package's tsc binary. The CLI's heal flow can
 * accidentally clobber per-package node_modules even when root looks
 * healthy, which manifests as `sh: tsc: not found` later. Treating that
 * case as "not installed" forces a clean pnpm install on next launch.
 */
export function isWorkspaceInstalled(repoRoot: string): boolean {
  const nm = join(repoRoot, "node_modules");
  if (!existsSync(nm)) return false;
  if (!existsSync(join(nm, ".modules.yaml"))) return false;
  if (!existsSync(join(nm, ".pnpm"))) return false;
  // Verify a per-package symlink. `tsc` is in claude-code's devDeps and
  // gets symlinked into node_modules/.bin per workspace package; if it's
  // gone, downstream `pnpm build` will fail with `tsc: not found`.
  const tsc = join(
    repoRoot,
    "packages",
    "agenticros-claude-code",
    "node_modules",
    ".bin",
    "tsc",
  );
  if (!existsSync(tsc)) return false;
  return true;
}

/**
 * `pnpm build` succeeded if @agenticros/core has been emitted. The
 * agenticros-claude-code adapter is pre-built in the published bundle so
 * we don't check that one.
 */
export function isWorkspaceBuilt(repoRoot: string): boolean {
  return existsSync(join(repoRoot, "packages", "core", "dist", "index.js"));
}

/** Write the same .npmrc init.ts writes inline (so pnpm install doesn't bail). */
function writeInstallNpmrc(repoRoot: string): void {
  writeFileSync(
    join(repoRoot, ".npmrc"),
    [
      "# Auto-written by AgenticROS CLI - keeps pnpm install from failing on",
      "# upstream peer-dep mismatches (mem0ai @ qdrant/pg/redis).",
      "shamefully-hoist=false",
      "strict-peer-dependencies=false",
      "auto-install-peers=true",
      "",
    ].join("\n"),
  );
}

/**
 * Run `pnpm install` with the same flags init.ts uses.
 */
async function runPnpmInstall(repoRoot: string): Promise<void> {
  writeInstallNpmrc(repoRoot);
  await execa(
    "pnpm",
    [
      "install",
      "--no-strict-peer-dependencies",
      "--config.auto-install-peers=true",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        npm_config_strict_peer_dependencies: "false",
        npm_config_auto_install_peers: "true",
      },
    },
  );
}

/** Run `pnpm -r build` in repoRoot. */
async function runPnpmBuild(repoRoot: string): Promise<void> {
  await execa("pnpm", ["-r", "build"], { cwd: repoRoot, stdio: "inherit" });
}

/**
 * Idempotently make sure the workspace is install + build ready. Anything
 * already in place is left untouched.
 *
 * @param repoRoot  Path to the install or workspace root.
 * @param what      Short label describing what needs the workspace (used in
 *                  the user-facing notice).
 */
export async function ensureWorkspaceReady(
  repoRoot: string,
  what: string,
): Promise<void> {
  const installed = isWorkspaceInstalled(repoRoot);
  const built = isWorkspaceBuilt(repoRoot);

  if (installed && built) return;

  info(`Preparing workspace for ${what} (one-time setup):`);
  if (!installed) {
    warn("  ↳ pnpm install (~1-2 min on Jetson)");
  }
  if (!built) {
    warn("  ↳ pnpm -r build (~30-90 s)");
  }

  if (!installed) {
    await withSpinner("Installing JS workspace dependencies (pnpm install)", async () => {
      await runPnpmInstall(repoRoot);
    });
  } else {
    ok("JS workspace deps already installed.");
  }

  if (!built) {
    await withSpinner("Building TypeScript workspace (pnpm -r build)", async () => {
      await runPnpmBuild(repoRoot);
    });
  } else {
    ok("TypeScript workspace already built.");
  }

  ok("Workspace is ready.");
}
