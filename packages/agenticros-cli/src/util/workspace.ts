/**
 * Workspace bring-up helpers used by `agenticros init` and any runner that
 * needs the JS workspace built before it can launch (currently `up real`;
 * sim runners don't need TS deps).
 *
 * Why shared: across 0.1.2 .. 0.1.6 we kept hitting "user picks Launch
 * without running init first" failures. Rather than asking the user to
 * pick the right menu item, we just auto-recover.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { execa } from "execa";

import { hasBin } from "./env.js";
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

  // robot-eyes is often added by refreshShippedCode after an older install.
  // Root node_modules can look healthy while packages/robot-eyes/node_modules/ws
  // was never linked — eyes then crashes with ERR_MODULE_NOT_FOUND.
  const eyesPkg = join(repoRoot, "packages", "robot-eyes", "package.json");
  if (existsSync(eyesPkg)) {
    const eyesWs = join(
      repoRoot,
      "packages",
      "robot-eyes",
      "node_modules",
      "ws",
      "package.json",
    );
    if (!existsSync(eyesWs)) return false;
  }

  // Same trap for agenticros-robot (cloud connect / motors): CLI upgrade drops
  // the package + refreshed lockfile, init skips pnpm install because root
  // .modules.yaml exists, then `agenticros connect` fails resolving
  // socket.io-client from a dep-less packages/agenticros-robot.
  const robotPkg = join(repoRoot, "packages", "agenticros-robot", "package.json");
  if (existsSync(robotPkg)) {
    const robotSocket = join(
      repoRoot,
      "packages",
      "agenticros-robot",
      "node_modules",
      "socket.io-client",
      "package.json",
    );
    if (!existsSync(robotSocket)) return false;
    // serialport is a direct robot dep (Firmata). Missing after a CLI/source
    // refresh means init skipped pnpm install.
    const robotSerial = join(
      repoRoot,
      "packages",
      "agenticros-robot",
      "node_modules",
      "serialport",
      "package.json",
    );
    if (!existsSync(robotSerial)) return false;
  }

  // node_modules from a previous Node major still look "installed" but NAN
  // addons (old serialport, canvas, …) crash with NODE_MODULE_VERSION.
  if (nativeAddonsNeedRebuild(repoRoot)) return false;

  return true;
}

const ABI_STAMP_REL = join("node_modules", ".agenticros-node-abi");

/** `process.versions.modules` — NODE_MODULE_VERSION (127 on Node 22, 147 on Node 26). */
export function currentNodeModuleAbi(): string {
  return String(process.versions.modules);
}

export function readWorkspaceNodeAbi(repoRoot: string): string | undefined {
  try {
    const v = readFileSync(join(repoRoot, ABI_STAMP_REL), "utf8").trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

export function writeWorkspaceNodeAbi(repoRoot: string, abi = currentNodeModuleAbi()): void {
  const nm = join(repoRoot, "node_modules");
  if (!existsSync(nm)) return;
  writeFileSync(join(repoRoot, ABI_STAMP_REL), `${abi}\n`);
}

/**
 * True when JS native addons were compiled for a different Node ABI than the
 * running interpreter. After `nvm use 26` without `agenticros init --force`,
 * `node_modules` still exists so init would otherwise skip `pnpm install`.
 */
export function nativeAddonsNeedRebuild(repoRoot: string): boolean {
  const stamped = readWorkspaceNodeAbi(repoRoot);
  if (stamped) return stamped !== currentNodeModuleAbi();
  return probeNativeAbiMismatch(repoRoot);
}

function probeNativeAbiMismatch(repoRoot: string): boolean {
  const requireFrom = [
    join(repoRoot, "package.json"),
    join(repoRoot, "packages", "agenticros-robot", "package.json"),
    join(repoRoot, "packages", "core", "package.json"),
  ];
  // NAN addons compiled for one NODE_MODULE_VERSION. N-API addons (sharp,
  // serialport v10+, koffi) typically survive a Node upgrade.
  const candidates = ["@serialport/bindings", "canvas", "node-datachannel"];
  for (const from of requireFrom) {
    const req = createRequire(from);
    for (const pkg of candidates) {
      try {
        req.resolve(`${pkg}/package.json`);
      } catch {
        continue;
      }
      try {
        req(pkg);
      } catch (e) {
        const err = e as { code?: string; message?: string };
        const msg = err.message ?? String(e);
        if (err.code === "ERR_DLOPEN_FAILED" || msg.includes("NODE_MODULE_VERSION")) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * `pnpm build` succeeded if the shared packages that adapters import have
 * been emitted. The agenticros-claude-code adapter is pre-built in the
 * published bundle so we don't check that one — but `object-detection`
 * (and ros-camera) are *not* prebuilt (pack-runtime drops their dist/),
 * and claude-code's tsc fails with "Cannot find module
 * '@agenticros/object-detection'" if those dist trees are missing.
 *
 * Checking only core/dist used to skip `pnpm -r build` on upgrade when
 * core was already built from an older CLI, leaving object-detection
 * unbuilt after refreshShippedCode dropped the new package.
 */
export function isWorkspaceBuilt(repoRoot: string): boolean {
  const required = [
    join(repoRoot, "packages", "core", "dist", "index.js"),
    join(repoRoot, "packages", "ros-camera", "dist", "index.js"),
    join(repoRoot, "packages", "object-detection", "dist", "index.js"),
  ];
  return required.every((p) => existsSync(p));
}

const PNPM_INSTALL_BASE_ARGS = [
  "install",
  "--no-strict-peer-dependencies",
  "--config.auto-install-peers=true",
] as const;

function pnpmInstallEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    npm_config_strict_peer_dependencies: "false",
    npm_config_auto_install_peers: "true",
  };
}

/** Write the same .npmrc init.ts writes inline (so pnpm install doesn't bail). */
function writeInstallNpmrc(repoRoot: string): void {
  writeFileSync(
    join(repoRoot, ".npmrc"),
    [
      "# Auto-written by AgenticROS CLI - keeps pnpm install from failing on",
      "# upstream peer-dep mismatches and optional native robotics deps",
      "# (node-datachannel, rclnodejs) that may not build in sandboxes.",
      "shamefully-hoist=false",
      "strict-peer-dependencies=false",
      "auto-install-peers=true",
      "",
    ].join("\n"),
  );
}

async function execPnpmInstall(repoRoot: string, extraArgs: string[] = []): Promise<void> {
  await execa("pnpm", [...PNPM_INSTALL_BASE_ARGS, ...extraArgs], {
    cwd: repoRoot,
    stdio: "inherit",
    env: pnpmInstallEnv(),
  });
}

/**
 * Run `pnpm install` with the same flags init.ts uses.
 *
 * Native robotics packages (`node-datachannel`, `rclnodejs`) are optional
 * deps of @agenticros/core. If their install scripts fail (common in
 * NemoClaw / minimal containers), retry with `--no-optional` so zenoh and
 * rosbridge transports still work.
 */
export async function runPnpmInstall(repoRoot: string): Promise<void> {
  if (!hasBin("pnpm")) {
    throw new Error(
      "pnpm is not installed (or not on PATH). Install it with: npm install -g pnpm " +
        "(or: corepack enable && corepack prepare pnpm@latest --activate)",
    );
  }
  writeInstallNpmrc(repoRoot);
  try {
    await execPnpmInstall(repoRoot);
  } catch {
    warn(
      "pnpm install failed — often optional native robotics deps " +
        "(node-datachannel, rclnodejs). Retrying with --no-optional so " +
        "zenoh/rosbridge transports still work.",
    );
    await execPnpmInstall(repoRoot, ["--no-optional"]);
  }
  writeWorkspaceNodeAbi(repoRoot);
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

  if (installed && built) {
    writeWorkspaceNodeAbi(repoRoot);
    return;
  }

  info(`Preparing workspace for ${what} (one-time setup):`);
  if (!installed) {
    if (nativeAddonsNeedRebuild(repoRoot)) {
      warn("  ↳ native modules were built for a different Node.js ABI; reinstalling");
    }
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
