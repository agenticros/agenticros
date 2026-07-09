#!/usr/bin/env node
/**
 * check-cli-tarball-install.mjs
 *
 * Pre-publish guard that pretends to be a brand-new user on a fresh machine
 * running `npx agenticros init`. Catches the entire class of bugs we hit
 * across 0.1.2 -> 0.1.5:
 *
 *   * patches/ missing from the published tarball  (0.1.2 ENOENT)
 *   * .npmrc stripped by npm pack so pnpm sees strict-peer mode  (0.1.4)
 *   * --no-strict-peer-dependencies not actually wired up
 *   * runtime/scripts/sim/run_sim.sh accidentally dropped
 *   * etc.
 *
 * Flow:
 *   1. `npm pack` the agenticros CLI into a tmpdir
 *   2. Extract the tarball
 *   3. Sanity-check the extracted tree against CRITICAL_BUNDLE_FILES
 *   4. Copy runtime/ to a sibling install dir (what init.ts does)
 *   5. Write the inline .npmrc (mirrors init.ts writeInitNpmrcInline)
 *   6. Run `pnpm install` with the same flags init.ts uses
 *   7. Verify it exits 0 and that the zenoh-ts patch was actually applied
 *
 * Exits 0 on success, non-zero on any failure. Hooked into the CLI's
 * `prepublishOnly` chain so `npm publish` cannot succeed without it.
 *
 * Run manually:
 *   node scripts/check-cli-tarball-install.mjs
 *
 * Skip (e.g. air-gapped CI):
 *   AGENTICROS_SKIP_TARBALL_INSTALL=1 node scripts/check-cli-tarball-install.mjs
 */

import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- config ----------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CLI_DIR = join(REPO_ROOT, "packages", "agenticros-cli");

// Mirror of CRITICAL_BUNDLE_FILES in packages/agenticros-cli/src/commands/init.ts.
// Keep these in sync (small surface area, low maintenance cost).
const REQUIRED_RUNTIME_FILES = [
  "patches",
  "patches/@eclipse-zenoh__zenoh-ts@1.9.0.patch",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "package.json",
  "ros2_ws/src/agenticros_sim",
  "ros2_ws/src/agenticros_sim/urdf/agenticros_amr.urdf.xacro",
  "scripts/sim/run_sim.sh",
];

// ---------- logging ----------

function step(msg) {
  process.stdout.write(`\x1b[36m[tarball-test]\x1b[0m ${msg}\n`);
}
function ok(msg) {
  process.stdout.write(`\x1b[32m[tarball-test ✓]\x1b[0m ${msg}\n`);
}
function fail(msg) {
  process.stderr.write(`\x1b[31m[tarball-test ✗]\x1b[0m ${msg}\n`);
}

// ---------- helpers ----------

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    fail(`${cmd} ${args.join(" ")} exited ${r.status}`);
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
  return r;
}

function detectPnpm() {
  const r = spawnSync("pnpm", ["--version"], { encoding: "utf8" });
  if (r.status !== 0) {
    fail("pnpm is not on PATH. Install pnpm before publishing.");
    process.exit(2);
  }
  return r.stdout.trim();
}

// ---------- main ----------

if (process.env.AGENTICROS_SKIP_TARBALL_INSTALL === "1") {
  step("AGENTICROS_SKIP_TARBALL_INSTALL=1 set; skipping.");
  process.exit(0);
}

const pnpmVer = detectPnpm();
step(`Using pnpm ${pnpmVer}`);

const work = mkdtempSync(join(tmpdir(), "agenticros-tarball-test-"));
const packDir = join(work, "pack");
const extractDir = join(work, "extract");
const installDir = join(work, "install");
mkdirSync(packDir);
mkdirSync(extractDir);
mkdirSync(installDir);

try {
  // 1. npm pack
  step("npm pack...");
  const packResult = run("npm", ["pack", "--pack-destination", packDir, "--silent"], {
    cwd: CLI_DIR,
  });
  const tgz = readdirSync(packDir).find((f) => f.endsWith(".tgz"));
  if (!tgz) {
    fail("npm pack did not produce a .tgz file.");
    process.exit(1);
  }
  const tgzPath = join(packDir, tgz);
  ok(`Packed: ${tgz}`);

  // 2. extract
  step("Extracting tarball...");
  run("tar", ["-xzf", tgzPath, "-C", extractDir]);
  const pkgDir = join(extractDir, "package"); // npm tar convention
  if (!existsSync(pkgDir)) {
    fail(`Extract did not produce a 'package/' directory.`);
    process.exit(1);
  }
  ok(`Extracted to ${pkgDir}`);

  // 3a. published package.json must not contain pnpm workspace: protocol
  // (npm / npx consumers cannot resolve workspace:* — broke agenticros@0.4.0).
  step("Checking published package.json has no workspace: dependencies...");
  const publishedPkg = JSON.parse(
    readFileSync(join(pkgDir, "package.json"), "utf8"),
  );
  const badDeps = [];
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    const block = publishedPkg[section];
    if (!block || typeof block !== "object") continue;
    for (const [name, range] of Object.entries(block)) {
      if (typeof range === "string" && range.startsWith("workspace:")) {
        badDeps.push(`${section}.${name}=${range}`);
      }
    }
  }
  if (badDeps.length > 0) {
    fail(
      `Published package.json still has workspace: protocol (npm cannot install this):\n    ${badDeps.join("\n    ")}\n` +
        `Use a semver range against the published @agenticros/core (e.g. "^0.7.0").`,
    );
    process.exit(1);
  }
  ok("No workspace: protocol in published dependencies.");

  // 3. critical files present in the SHIPPED tarball
  step("Verifying critical runtime files are in the tarball...");
  const runtimeInTar = join(pkgDir, "runtime");
  const missing = REQUIRED_RUNTIME_FILES.filter((f) => !existsSync(join(runtimeInTar, f)));
  if (missing.length > 0) {
    fail(`Tarball is missing required runtime files:`);
    for (const m of missing) process.stderr.write(`    ${m}\n`);
    process.exit(1);
  }
  ok(`All ${REQUIRED_RUNTIME_FILES.length} critical runtime files present.`);

  // 4. simulate init: cp -a runtime/. installDir/
  step("Copying runtime/ into a fresh install dir (simulating `agenticros init`)...");
  run("cp", ["-a", `${runtimeInTar}/.`, installDir]);
  ok(`Install dir populated at ${installDir}`);

  // 5. write inline .npmrc (mirrors init.ts writeInitNpmrcInline)
  step("Writing inline .npmrc (mirroring writeInitNpmrcInline)...");
  writeFileSync(
    join(installDir, ".npmrc"),
    [
      "shamefully-hoist=false",
      "strict-peer-dependencies=false",
      "auto-install-peers=true",
      "",
    ].join("\n"),
  );
  ok(".npmrc written.");

  // 6. pnpm install with the same flags init.ts uses
  step("Running pnpm install with init.ts flags (this can take a minute)...");
  const installResult = spawnSync(
    "pnpm",
    [
      "install",
      "--no-strict-peer-dependencies",
      "--config.auto-install-peers=true",
      "--prefer-offline",
      "--ignore-scripts", // skip postinstalls to keep this guard fast
    ],
    {
      cwd: installDir,
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_strict_peer_dependencies: "false",
        npm_config_auto_install_peers: "true",
      },
    },
  );

  if (installResult.status !== 0) {
    fail(`pnpm install failed (exit ${installResult.status}):`);
    if (installResult.stdout) process.stdout.write(installResult.stdout);
    if (installResult.stderr) process.stderr.write(installResult.stderr);
    process.exit(1);
  }
  ok("pnpm install exited 0.");

  // 7. verify the zenoh-ts patch was applied (signature in the pnpm store path)
  step("Verifying zenoh-ts patch landed (looking for _patch_hash in .pnpm)...");
  const pnpmStore = join(installDir, "node_modules", ".pnpm");
  if (!existsSync(pnpmStore)) {
    fail(`Expected ${pnpmStore} after pnpm install.`);
    process.exit(1);
  }
  const entries = readdirSync(pnpmStore);
  const patched = entries.find(
    (e) => e.startsWith("@eclipse-zenoh+zenoh-ts@") && e.includes("_patch_hash="),
  );
  if (!patched) {
    fail(
      "Could not find a patched @eclipse-zenoh/zenoh-ts in the pnpm store.\n" +
        "    This means patches/ either wasn't shipped or wasn't applied.\n" +
        "    Looking for entry matching: @eclipse-zenoh+zenoh-ts@*_patch_hash=*",
    );
    process.exit(1);
  }
  ok(`Patched zenoh-ts present in store: ${patched.slice(0, 70)}...`);

  // 8. Refresh-over-existing-install coverage. Mirrors what init.ts does in
  // "installed mode" - overlay-copy bundle paths over an existing install
  // without nuking pnpm's per-package symlinks. Regression test for 0.1.7:
  // cp -a SRC/. DST/ blows up when DST is a file (e.g. tsconfig.base.json).
  step("Simulating refresh over a pre-existing snapshot (regression test for 0.1.7)...");
  const fakeOld = join(work, "old-install");
  mkdirSync(fakeOld);
  writeFileSync(join(fakeOld, "tsconfig.base.json"), '{"old":"to-be-overwritten"}');
  mkdirSync(join(fakeOld, "packages"), { recursive: true });
  writeFileSync(
    join(fakeOld, "packages", "preserved.txt"),
    "must survive overlay refresh",
  );

  // Replay the refresh logic from init.ts. If init.ts changes its branching,
  // update this block in lockstep.
  const refreshTargets = ["tsconfig.base.json", "packages"];
  for (const rel of refreshTargets) {
    const src = join(runtimeInTar, rel);
    const dst = join(fakeOld, rel);
    if (!existsSync(src)) continue;
    const srcIsDir = statSync(src).isDirectory();
    if (srcIsDir && existsSync(dst)) {
      run("cp", ["-a", `${src}/.`, `${dst}/`]);
    } else {
      if (existsSync(dst) && !srcIsDir) run("rm", ["-f", dst]);
      run("cp", ["-a", src, dst]);
    }
  }

  const tsStat = statSync(join(fakeOld, "tsconfig.base.json"));
  if (!tsStat.isFile()) {
    fail("Refresh turned tsconfig.base.json into a non-file. cp branching is wrong.");
    process.exit(1);
  }
  const tsContent = readFileSync(join(fakeOld, "tsconfig.base.json"), "utf8");
  if (tsContent.includes('"old":"to-be-overwritten"')) {
    fail("Refresh failed to overwrite tsconfig.base.json with the bundle's version.");
    process.exit(1);
  }
  if (!existsSync(join(fakeOld, "packages", "preserved.txt"))) {
    fail(
      "Refresh wiped a pre-existing file inside packages/. Overlay semantics " +
        "are broken - this is exactly what kills pnpm's per-package node_modules symlinks.",
    );
    process.exit(1);
  }
  ok("Refresh-over-existing-install preserves files and overwrites cleanly.");

  ok("ALL CHECKS PASSED. Tarball is publish-ready.");
} finally {
  // best-effort cleanup; don't mask earlier errors
  try {
    rmSync(work, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
