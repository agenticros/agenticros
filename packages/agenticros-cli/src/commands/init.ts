/**
 * `agenticros init` - first-time setup wizard.
 *
 * Idempotent: every step queries doctor first and is skipped (with a green
 * checkmark) when the corresponding check already passes. Steps:
 *   1. Workspace deps    -> pnpm install
 *   2. Workspace build   -> pnpm build
 *   3. colcon workspace  -> ros2_ws colcon build
 *   4. OpenClaw plugin   -> scripts/setup_gateway_plugin.sh
 *   5. Robot config      -> prompt namespace + transport, write ~/.agenticros/config.json
 *   6. OpenAI key        -> prompt + scripts/configure_agenticros.sh
 *   7. Doctor summary
 *
 * Reuses the existing shell scripts as subprocesses (no logic duplication).
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { confirm, input, password, select } from "@inquirer/prompts";
import { execa } from "execa";

import { runDoctorChecks } from "./doctor.js";
import { isWindows } from "../util/env.js";
import { getCliPaths, isAgenticrosMonorepo, resetPathsCache } from "../util/paths.js";
import { header, info, ok, warn, err, dim, withSpinner } from "../util/logger.js";
import {
  ensureToolsAlsoAllow,
  openclawConfigExists,
  readAgenticrosContractTools,
} from "../util/openclaw-config.js";
import { ensureProfilesExist, switchMode } from "../util/profiles.js";
import { writeState } from "../util/state.js";
import { isWorkspaceBuilt, isWorkspaceInstalled } from "../util/workspace.js";

export interface InitOptions {
  force?: boolean;
  installDir?: string;
}

export async function initCommand(opts: InitOptions): Promise<void> {
  header("AgenticROS first-time setup");

  let paths = getCliPaths();
  const targetInstallDir = opts.installDir ?? paths.installDir;

  if (paths.mode === "workspace") {
    info("Workspace mode detected - using the live repository at:");
    dim(`  ${paths.repoRoot}`);
  } else if (paths.mode === "installed") {
    info("Installed mode detected - using existing install at:");
    dim(`  ${paths.repoRoot}`);
    if (opts.force) {
      warn("--force given; refreshing install dir from the published bundle.");
      await syncBundleToInstallDir(targetInstallDir, { overwrite: true });
    } else {
      // Step 1: always refresh shipped code (scripts/, packages/, patches/, ...)
      // from the bundle. These are CLI-controlled paths, not user data, so
      // overwriting them is safe and lets bug fixes propagate without --force.
      await refreshShippedCode(targetInstallDir);

      // Step 2: additive cp -an for any *missing* critical paths that weren't
      // covered by Step 1 (e.g. pnpm-lock.yaml). Never clobbers existing files.
      const missing = findMissingBundleFiles(paths.repoRoot!);
      if (missing.length > 0) {
        warn(
          `Existing install is missing ${missing.length} file(s) shipped in this CLI version:`,
        );
        for (const m of missing.slice(0, 5)) dim(`    ${m}`);
        if (missing.length > 5) dim(`    ... +${missing.length - 5} more`);
        await syncBundleToInstallDir(targetInstallDir, { overwrite: false, additive: true });
      }
    }
  } else {
    info("Bundle mode detected. Copying the published snapshot to:");
    dim(`  ${targetInstallDir}`);
    await syncBundleToInstallDir(targetInstallDir, { overwrite: opts.force === true });
    resetPathsCache();
    paths = getCliPaths();
    if (paths.mode === "bundle") {
      err(
        `Failed to set up install dir at ${targetInstallDir}. The snapshot was ` +
          "copied but path detection still reports bundle mode - this is a CLI bug.",
      );
      process.exit(1);
    }
  }

  const repoRoot = paths.repoRoot!;

  // Always (re)write the install dir's .npmrc from inline content. npm pack
  // strips .npmrc from the published tarball, so we can't ship it - and even
  // workspace-mode users benefit from having strict-peer-dependencies=false
  // for the init flow specifically. This is a no-op for live monorepos
  // because the root .npmrc takes precedence (pnpm walks UP for config).
  if (paths.mode !== "workspace") {
    writeInitNpmrcInline(repoRoot);
  }

  const before = await runDoctorChecks();

  // Step: workspace deps. We check for `.modules.yaml` (not just node_modules/)
  // so a partial / aborted previous install still triggers a fresh `pnpm
  // install`. Otherwise users got stuck in "node_modules exists but tsc isn't
  // in .bin" purgatory.
  if (opts.force || !isWorkspaceInstalled(repoRoot)) {
    await runStep("Installing JS workspace dependencies (pnpm install)", async () => {
      // Explicitly pass the flags here in addition to writing them to .npmrc.
      // Reason: in some environments (containers, ephemeral CI, certain pnpm
      // versions) the .npmrc is not picked up reliably from cwd. Passing
      // --no-strict-peer-dependencies on the CLI guarantees mem0ai-style peer
      // mismatches downgrade to a warning. --config.auto-install-peers=true
      // matches the inline .npmrc value so behaviour is identical either way.
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
    });
  } else {
    ok("JS workspace deps already installed (skip).");
  }

  // Step: build TS workspace. Check core/dist (not just MCP dist) - the MCP
  // dist is pre-built in the bundle but core/ros-camera need to be built so
  // claude-code's downstream consumers (and start_demo.sh) can find them.
  if (opts.force || !isWorkspaceBuilt(repoRoot)) {
    await runStep("Building TypeScript workspace (pnpm build)", async () => {
      await execa("pnpm", ["-r", "build"], { cwd: repoRoot, stdio: "inherit" });
    });
  } else {
    ok("TypeScript dist already built (skip).");
  }

  // Step: colcon workspace.
  // We rebuild whenever the colcon install/ is missing OR the build stamp
  // doesn't match this CLI version. The CLI-version stamp catches the
  // common "refreshShippedCode just dropped new launch/sdf files into
  // src/ but install/ is from the previous CLI version" case - without
  // it, init's skip-because-install-exists logic ships users a
  // stale install dir (e.g. 0.1.10 added sim_arm.launch.py but
  // colconBuilt() saw install/setup.bash from 0.1.9 and skipped the
  // rebuild).
  //
  // The colcon step is Linux-only: it sources /opt/ros/<distro>/setup.bash
  // which doesn't exist on macOS or Windows. macOS users typically run a
  // robotics stack remotely; Windows users need WSL 2. In both cases we
  // skip the step with a friendly note instead of failing the whole wizard.
  const ros2WsRoot = join(repoRoot, "ros2_ws");
  if (isWindows) {
    warn(
      "Skipping ROS 2 colcon build: not supported on native Windows. " +
        "Use WSL 2 (Ubuntu) for a full robot-side install, or keep " +
        "running this CLI on Windows for config / sim-client tasks only.",
    );
  } else if (opts.force || !colconBuiltForCurrentCli(ros2WsRoot)) {
    await runStep("Building ROS 2 workspace (colcon)", async () => {
      await runShell(
        `mkdir -p "${ros2WsRoot}" && cd "${ros2WsRoot}" && \
         . /opt/ros/$(ls /opt/ros 2>/dev/null | head -1)/setup.bash && \
         colcon build --symlink-install`,
      );
      writeRos2WsBuildStamp(ros2WsRoot);
    });
  } else {
    ok("ROS 2 workspace already built (skip).");
  }

  // Step: OpenClaw plugin install.
  // The installer is a bash script (`setup_gateway_plugin.sh`) and uses
  // OpenClaw's CLI which itself is shipped for Linux/macOS today. Skip
  // gracefully on Windows so the rest of the wizard (robot config,
  // OpenAI key) can still complete.
  if (isWindows) {
    warn(
      "Skipping OpenClaw plugin install: setup_gateway_plugin.sh requires " +
        "bash + OpenClaw CLI. Run it from WSL 2 or a Linux/macOS host.",
    );
  } else if (opts.force || !openclawPluginInstalled()) {
    const wantPlugin = await confirm({
      message: "Install the OpenClaw plugin now? (recommended)",
      default: true,
    });
    if (wantPlugin) {
      const script = join(paths.scriptsDir, "setup_gateway_plugin.sh");
      if (existsSync(script)) {
        await runStep("Installing OpenClaw plugin", async () => {
          await runShell(`bash "${script}"`);
        });
      } else {
        warn(`setup_gateway_plugin.sh not found at ${script}; skipping.`);
      }
    }
  } else {
    ok("OpenClaw plugin already installed (skip).");
  }

  // Step: keep `tools.alsoAllow` in sync with the plugin manifest.
  // OpenClaw 2026.6+ tool profiles (e.g. "coding") are strict allowlists; any
  // `api.registerTool(...)` call the plugin makes is silently filtered out
  // unless the tool id is opted into `tools.alsoAllow`. Without this step the
  // chat agent loads the AgenticROS plugin successfully yet still tells the
  // user "I don't have ros2_camera_snapshot / ros2_* tools exposed".
  syncToolsAlsoAllow(repoRoot);

  // Step: robot config.
  if (opts.force || !userConfigExists()) {
    await promptAndWriteRobotConfig();
  } else {
    ok("Robot config already exists at ~/.agenticros/config.json (skip).");
  }

  // Step: OpenAI key.
  if (opts.force || !openAiKeyConfigured(before)) {
    await promptAndConfigureOpenAi();
  } else {
    ok("OpenAI API key already configured (skip).");
  }

  // Step: doctor summary.
  info("Running doctor for a final health summary…");
  const after = await runDoctorChecks();
  const red = after.checks.filter((c) => c.severity === "red");
  if (isWindows) {
    // Windows is "config + remote client" only: colcon, the OpenClaw plugin
    // install, and `agenticros up real|sim-amr` all need bash + ROS 2 +
    // OpenClaw, none of which exist on native Win32. Point users at WSL for
    // the heavy lifting and skip the "Try `agenticros up ...`" suggestion
    // that would just fail.
    info(
      "Setup partially complete on Windows. The config + MCP server are " +
        "ready, but ROS 2, colcon, and the OpenClaw plugin require WSL 2 " +
        "(Ubuntu). See docs/robot-setup.md for the WSL path.",
    );
    if (red.length > 0) {
      warn(
        `${red.length} doctor check(s) red — many are expected on Windows ` +
          "(ROS 2, colcon, OpenClaw). Inspect with: agenticros doctor",
      );
    }
  } else if (red.length === 0) {
    ok("Setup complete. Try `agenticros up real` (or `agenticros up sim-amr`).");
  } else {
    warn(`${red.length} check(s) still red. Inspect with: agenticros doctor`);
  }

  writeState({});
}

async function runStep(label: string, body: () => Promise<void>): Promise<void> {
  info(label);
  try {
    await body();
    ok(label);
  } catch (e) {
    err(`${label} failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

async function runShell(cmd: string): Promise<void> {
  await execa("bash", ["-lc", cmd], { stdio: "inherit" });
}


/**
 * Read the CLI version from its own package.json. Mirrors the helper in
 * src/index.ts (kept local so init can import without circular deps).
 */
function readCliVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/commands -> ../../package.json (workspace) or ../package.json (bundle).
    const candidates = [
      join(here, "..", "..", "package.json"),
      join(here, "..", "package.json"),
    ];
    for (const c of candidates) {
      if (!existsSync(c)) continue;
      const pkg = JSON.parse(readFileSync(c, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "agenticros" && typeof pkg.version === "string") return pkg.version;
    }
  } catch {
    // ignore - we'll fall through to a sentinel.
  }
  return "0.0.0";
}

/** Path of the build-stamp file we write alongside the colcon install/. */
function ros2WsBuildStampPath(ws: string): string {
  return join(ws, ".agenticros-cli-build-stamp");
}

/** Record the CLI version that produced the current colcon install/. */
function writeRos2WsBuildStamp(ws: string): void {
  try {
    writeFileSync(ros2WsBuildStampPath(ws), readCliVersion() + "\n");
  } catch {
    // best-effort - a missing stamp just means we rebuild next time, which is safe.
  }
}

/**
 * The colcon workspace counts as "built" for THIS CLI version only if:
 *   1. ros2_ws/install/setup.bash exists (some colcon ran successfully).
 *   2. ros2_ws/.agenticros-cli-build-stamp matches our package.json version.
 *
 * (2) is what catches stale installs after a CLI upgrade: refreshShippedCode
 * may have just rewritten ros2_ws/src/, but if install/ is from an older CLI,
 * its install/<pkg>/share/ won't contain the new launch / model files.
 */
function colconBuiltForCurrentCli(ws: string): boolean {
  if (!existsSync(join(ws, "install", "setup.bash"))) return false;
  try {
    const stamp = readFileSync(ros2WsBuildStampPath(ws), "utf8").trim();
    return stamp === readCliVersion();
  } catch {
    // No stamp -> assume the install/ predates this CLI version's stamp
    // logic and force a fresh build so we end up in a known-good state.
    return false;
  }
}

function openclawPluginInstalled(): boolean {
  const home = process.env["HOME"] ?? "";
  return existsSync(join(home, ".openclaw", "openclaw.json"));
}

/**
 * Merge the plugin manifest's `contracts.tools` into the user's OpenClaw
 * `tools.alsoAllow`. No-op when either the OpenClaw config or the manifest
 * isn't present yet (e.g. a sim-only install where the OpenClaw plugin step
 * was skipped). Side-effect free in that case.
 */
function syncToolsAlsoAllow(repoRoot: string): void {
  if (!openclawConfigExists()) {
    dim("OpenClaw config not present; skipping tools.alsoAllow sync.");
    return;
  }
  const tools = readAgenticrosContractTools(repoRoot);
  if (!tools || tools.length === 0) {
    dim("AgenticROS plugin manifest not found yet; tools.alsoAllow sync deferred.");
    return;
  }
  const result = ensureToolsAlsoAllow(tools);
  if (!result) {
    warn("Could not read OpenClaw config to update tools.alsoAllow.");
    return;
  }
  if (result.changed) {
    ok(
      `Added ${result.added.length} AgenticROS tool(s) to OpenClaw tools.alsoAllow ` +
        "(strict tool profile would otherwise hide them from the chat agent).",
    );
    dim(`  + ${result.added.join(", ")}`);
  } else {
    ok("OpenClaw tools.alsoAllow already covers every AgenticROS tool (skip).");
  }
}

function userConfigExists(): boolean {
  return existsSync(join(getCliPaths().userDataDir, "config.json"));
}

function openAiKeyConfigured(_before: { checks: { id: string; severity: string }[] }): boolean {
  // Simple heuristic: env var set OR auth-profiles file present + non-empty.
  if ((process.env["OPENAI_API_KEY"] ?? "").length > 0) return true;
  // On Windows, $HOME is usually unset; fall back to $USERPROFILE so this
  // check doesn't incorrectly conclude "no key" and re-prompt forever.
  const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
  const authFile = join(home, ".openclaw", "agents", "main", "agent", "auth-profiles.json");
  if (existsSync(authFile)) return true;
  // Windows-only: we persist the key into ~/.agenticros/config.json under
  // openai.apiKey since there's no OpenClaw auth-profiles file to write to.
  try {
    const cfgPath = join(getCliPaths().userDataDir, "config.json");
    if (!existsSync(cfgPath)) return false;
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as {
      openai?: { apiKey?: string };
    };
    return typeof cfg.openai?.apiKey === "string" && cfg.openai.apiKey.length > 0;
  } catch {
    return false;
  }
}

async function promptAndWriteRobotConfig(): Promise<void> {
  const isSim = (await select<string>({
    message: "Which environment are you setting up first?",
    choices: [
      { name: "Real robot (RealSense, motors, local DDS transport)", value: "real" },
      { name: "Simulation (Gazebo Harmonic; works without robot hardware)", value: "sim" },
    ],
    default: "sim",
  })) === "sim";

  const defaultNs = isSim ? "sim_robot" : "my_robot";
  const namespace = await input({
    message: "Robot namespace (used as topic prefix, e.g. /<namespace>/cmd_vel)",
    default: defaultNs,
  });

  const userData = getCliPaths().userDataDir;
  mkdirSync(userData, { recursive: true });
  const cfg = {
    transport: { mode: "local" },
    robot: {
      namespace,
      name: isSim ? "Sim Robot" : "My Robot",
      cameraTopic: "/camera/camera/color/image_raw",
    },
    safety: {
      maxLinearVelocity: isSim ? 0.5 : 1.0,
      maxAngularVelocity: isSim ? 1.0 : 1.5,
    },
    teleop: {
      cmdVelTopic: "/cmd_vel",
      speedDefault: isSim ? 0.2 : 0.3,
    },
  };
  writeFileSync(join(userData, "config.json"), JSON.stringify(cfg, null, 2));
  ok(`Wrote ~/.agenticros/config.json (namespace=${namespace}).`);
  writeState({ lastNamespace: namespace });

  // Seed both mode profiles and persist which one this fresh install
  // represents. From here on, switching is a `agenticros mode <real|sim>`
  // away - no more hand-editing JSON between sim and real-robot runs.
  ensureProfilesExist();
  switchMode(isSim ? "sim" : "real");
  ok(`Mode profiles created at ~/.agenticros/profiles/. Active mode: ${isSim ? "sim" : "real"}.`);
}

async function promptAndConfigureOpenAi(): Promise<void> {
  const haveKey = await confirm({
    message: "Do you have an OpenAI API key you'd like to configure now?",
    default: true,
  });
  if (!haveKey) {
    warn(
      "Skipping OpenAI setup. You can run `agenticros config set openai.apiKey=sk-...` later.",
    );
    return;
  }
  const key = await password({ message: "Paste your OpenAI API key (input hidden)" });
  if (!key || !key.startsWith("sk-")) {
    warn("That doesn't look like a key. Skipping (config can be set later).");
    return;
  }
  // On Windows there's no system bash, and configure_agenticros.sh shells out
  // to `jq` to merge into the OpenClaw config — which doesn't exist on
  // Windows anyway since the OpenClaw plugin step was skipped. Just record
  // the key into the AgenticROS user config so other tools (and a future
  // `agenticros config set openai.apiKey=...`) can find it.
  if (isWindows) {
    const userData = getCliPaths().userDataDir;
    mkdirSync(userData, { recursive: true });
    const cfgPath = join(userData, "config.json");
    let cfg: Record<string, unknown> = {};
    try {
      if (existsSync(cfgPath)) {
        cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>;
      }
    } catch {
      // ignore malformed file — we'll rewrite it below
    }
    cfg["openai"] = { apiKey: key };
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    ok(`Stored OpenAI API key in ${cfgPath} (openai.apiKey).`);
    return;
  }
  const script = join(getCliPaths().scriptsDir, "configure_agenticros.sh");
  if (!existsSync(script)) {
    warn(`configure_agenticros.sh not found at ${script}; key was not persisted.`);
    return;
  }
  await withSpinner("Storing OpenAI key via configure_agenticros.sh", async () => {
    await execa("bash", [script], {
      env: { ...process.env, OPENAI_API_KEY: key },
      stdio: "pipe",
    });
  });
}

/**
 * Files / directories that MUST exist in the install dir for `pnpm install`
 * and `colcon build` to succeed. If any of these are missing on an existing
 * install (because the user previously installed an older CLI version that
 * didn't bundle them), the init flow re-syncs additively.
 *
 * NOTE: .npmrc is NOT in this list - it's never bundled (npm pack strips it).
 * We write it inline via writeInitNpmrcInline() instead.
 *
 * Order: most-likely-to-break-first.
 */
const CRITICAL_BUNDLE_FILES = [
  "patches",
  "patches/@eclipse-zenoh__zenoh-ts@1.9.0.patch",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "package.json",
  "ros2_ws/src/agenticros_sim",
  "ros2_ws/src/agenticros_sim/urdf/agenticros_amr.urdf.xacro",
  "scripts/sim/run_sim.sh",
];

/**
 * Files / directories the CLI considers "shipped code" - never user-modifiable
 * - that should ALWAYS be refreshed from the bundle on init, even if they
 * already exist. This is what lets the heal flow pick up downstream bug
 * fixes (e.g. start_demo.sh learning to build workspace deps) without the
 * user having to `rm -rf ~/agenticros && npx agenticros` every release.
 *
 * Add anything that is pure CLI-controlled code here. Do NOT add data dirs
 * like ros2_ws/build, node_modules, or user-touchable configs.
 */
const ALWAYS_REFRESH_FROM_BUNDLE = [
  "scripts",         // start_demo.sh, sim/run_sim.sh, setup_gateway_plugin.sh, ...
  "patches",         // patched dep tarballs - immutable, must match package.json
  "packages",        // workspace TS sources & the prebuilt MCP dist
  "ros2_ws/src",     // ROS 2 package sources (msgs, sim, follow_me, ...)
  "tsconfig.base.json",
  "pnpm-workspace.yaml",
];

function findMissingBundleFiles(installDir: string): string[] {
  return CRITICAL_BUNDLE_FILES.filter((f) => !existsSync(join(installDir, f)));
}

/**
 * Write an init-friendly .npmrc into the install dir.
 *
 * Why inline instead of bundled? `npm pack` ALWAYS strips .npmrc from the
 * published tarball (hardcoded denylist alongside .gitignore, .npmignore).
 * That means anything we put in runtime/.npmrc is invisible to end users.
 * Writing it from inline JS at init/heal time guarantees the file lands.
 *
 * We always overwrite (not append) so each CLI upgrade can refresh the
 * settings. If the user wants custom pnpm config they can edit
 * ~/.npmrc (user-level) which takes precedence.
 */
function writeInitNpmrcInline(installDir: string): void {
  const target = join(installDir, ".npmrc");
  const contents = [
    "# Auto-generated by `agenticros init` - safe defaults for end-user installs.",
    "# Devs working on the repo from a git clone use the repo root .npmrc.",
    "# Anything you want to customise goes in ~/.npmrc (user-level), which",
    "# takes precedence over this file.",
    "shamefully-hoist=false",
    "strict-peer-dependencies=false",
    "auto-install-peers=true",
    "",
  ].join("\n");
  writeFileSync(target, contents);
  ok(`Wrote install-friendly .npmrc to ${target}`);
}

/**
 * Recursively copy `src` into `dst` using Node's native `fs.cpSync`.
 *
 * Cross-platform replacement for the historic `cp -a SRC DST` invocations.
 * Behaviour:
 *   * Recursive directory copy (mirrors `cp -a`).
 *   * `overwrite=false` -> skip existing files (mirrors `cp -an`).
 *   * Symlinks copied verbatim (never dereferenced).
 *   * Errors when destination already exists are silenced when
 *     `overwrite=false` so additive heals don't crash on the first pre-existing
 *     file.
 *
 * Why we no longer shell out to `cp`: on Windows there is no `cp` binary
 * (PowerShell uses `Copy-Item`), so `execa("cp", ...)` would fail with
 * "'cp' is not recognized as an internal or external command" the moment
 * `npx agenticros init` tried to copy the bundle.
 */
function copyTree(
  src: string,
  dst: string,
  opts: { overwrite?: boolean } = {},
): void {
  const overwrite = opts.overwrite !== false;
  cpSync(src, dst, {
    recursive: true,
    dereference: false,
    force: overwrite,
    errorOnExist: false,
    preserveTimestamps: true,
  });
}

/**
 * Refresh paths in ALWAYS_REFRESH_FROM_BUNDLE from the bundled runtime/.
 *
 * Overlay copy semantics:
 *   * Files present in both bundle and install -> OVERWRITTEN with bundle version
 *   * Files in install but NOT in bundle -> PRESERVED (so pnpm's per-package
 *     node_modules symlinks inside packages/<pkg>/ survive a refresh)
 *   * Files in bundle but NOT in install -> ADDED
 *
 * We deliberately do NOT remove the destination directory first: doing so
 * destroys pnpm's per-package node_modules/.bin symlinks and breaks subsequent
 * builds even though root node_modules looks healthy.
 */
async function refreshShippedCode(installDir: string): Promise<void> {
  const paths = getCliPaths();
  const source = paths.bundleDir;
  if (!source || !existsSync(source)) return;

  const targets = ALWAYS_REFRESH_FROM_BUNDLE.filter((p) => existsSync(join(source, p)));
  if (targets.length === 0) return;

  await withSpinner("Refreshing CLI-shipped code from the new bundle", async () => {
    for (const rel of targets) {
      const src = join(source, rel);
      const dst = join(installDir, rel);
      mkdirSync(dirname(dst), { recursive: true });

      const srcIsDir = statSync(src).isDirectory();
      if (!srcIsDir && existsSync(dst)) {
        // Strip a stale dst first only when it's a non-dir leaf file we
        // need to overwrite (e.g. tsconfig.base.json). Avoids any chance
        // of fs.cpSync refusing to clobber the existing file on Windows.
        rmSync(dst, { force: true });
      }
      copyTree(src, dst, { overwrite: true });
    }
  });
}

/**
 * Copy the bundled monorepo snapshot (`packages/agenticros-cli/runtime/`) into
 * the user's install dir (default ~/agenticros) so colcon and pnpm have a full
 * tree to operate on.
 *
 * Modes:
 *   - default            ->  no-op if targetDir exists
 *   - overwrite=true     ->  recursive copy, clobbering existing files
 *   - additive=true      ->  recursive copy, never clobbering existing files
 */
async function syncBundleToInstallDir(
  targetDir: string,
  opts: { overwrite?: boolean; additive?: boolean } = {},
): Promise<void> {
  const paths = getCliPaths();
  const source = paths.bundleDir;
  if (!source || !existsSync(source)) {
    err(
      "No bundled runtime/ found in this CLI install. Either rebuild with " +
        "`pnpm --filter agenticros pack:runtime`, or run `agenticros init` from a " +
        "monorepo checkout.",
    );
    process.exit(1);
  }
  // Only skip when the destination is BOTH present AND looks like a real
  // agenticros-monorepo install. The bare `existsSync(targetDir)` check used
  // to be enough, but a previous CLI version that crashed mid-copy (e.g. the
  // pre-0.2.1 Windows `cp` bug) could leave behind a half-empty target dir.
  // On the next run the wizard would happily "skip" the copy, then immediately
  // fail with "snapshot copied but path detection still reports bundle mode -
  // this is a CLI bug" because `isAgenticrosMonorepo(installDir)` returned
  // false. Heal that case by treating an incomplete dir the same as a missing
  // dir and copying into it.
  if (existsSync(targetDir) && !opts.overwrite && !opts.additive) {
    if (isAgenticrosMonorepo(targetDir)) {
      ok(`Install directory ${targetDir} already exists (skipping copy).`);
      return;
    }
    warn(
      `Install directory ${targetDir} exists but is incomplete (no ` +
        "agenticros-monorepo package.json). Treating as a partial install " +
        "and re-copying the bundle on top.",
    );
  }
  const label = opts.additive
    ? `Healing install at ${targetDir} (adding missing files only)`
    : `Copying bundled snapshot to ${targetDir}`;
  await withSpinner(label, async () => {
    mkdirSync(targetDir, { recursive: true });
    try {
      copyTree(source, targetDir, { overwrite: !opts.additive });
    } catch (e) {
      if (!opts.additive) throw e;
      dim(`(copy returned non-zero; this is OK if some targets pre-existed)`);
    }
  });
}
