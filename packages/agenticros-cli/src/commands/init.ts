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

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { confirm, input, password, select } from "@inquirer/prompts";
import { execa } from "execa";

import { runDoctorChecks } from "./doctor.js";
import { getCliPaths, resetPathsCache } from "../util/paths.js";
import { header, info, ok, warn, err, dim, withSpinner } from "../util/logger.js";
import { writeState } from "../util/state.js";

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
  const before = await runDoctorChecks();

  // Step: workspace deps.
  if (opts.force || !nodeModulesPresent(repoRoot)) {
    await runStep("Installing JS workspace dependencies (pnpm install)", async () => {
      await execa("pnpm", ["install"], {
        cwd: repoRoot,
        stdio: "inherit",
      });
    });
  } else {
    ok("JS workspace deps already installed (skip).");
  }

  // Step: build TS workspace.
  if (opts.force || !mcpDistExists()) {
    await runStep("Building TypeScript workspace (pnpm build)", async () => {
      await execa("pnpm", ["build"], { cwd: repoRoot, stdio: "inherit" });
    });
  } else {
    ok("TypeScript dist already built (skip).");
  }

  // Step: colcon workspace.
  const ros2WsRoot = join(repoRoot, "ros2_ws");
  if (opts.force || !colconBuilt(ros2WsRoot)) {
    await runStep("Building ROS 2 workspace (colcon)", async () => {
      await runShell(
        `mkdir -p "${ros2WsRoot}" && cd "${ros2WsRoot}" && \
         . /opt/ros/$(ls /opt/ros 2>/dev/null | head -1)/setup.bash && \
         colcon build --symlink-install`,
      );
    });
  } else {
    ok("ROS 2 workspace already built (skip).");
  }

  // Step: OpenClaw plugin install.
  if (opts.force || !openclawPluginInstalled()) {
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
  if (red.length === 0) {
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

function nodeModulesPresent(repoRoot: string): boolean {
  return existsSync(join(repoRoot, "node_modules"));
}

function mcpDistExists(): boolean {
  return existsSync(getCliPaths().mcpDistDir);
}

function colconBuilt(ws: string): boolean {
  return existsSync(join(ws, "install", "setup.bash"));
}

function openclawPluginInstalled(): boolean {
  const home = process.env["HOME"] ?? "";
  return existsSync(join(home, ".openclaw", "openclaw.json"));
}

function userConfigExists(): boolean {
  return existsSync(join(getCliPaths().userDataDir, "config.json"));
}

function openAiKeyConfigured(_before: { checks: { id: string; severity: string }[] }): boolean {
  // Simple heuristic: env var set OR auth-profiles file present + non-empty.
  if ((process.env["OPENAI_API_KEY"] ?? "").length > 0) return true;
  const home = process.env["HOME"] ?? "";
  const authFile = join(home, ".openclaw", "agents", "main", "agent", "auth-profiles.json");
  return existsSync(authFile);
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
 * Copy the bundled monorepo snapshot (`packages/agenticros-cli/runtime/`) into
 * the user's install dir (default ~/agenticros) so colcon and pnpm have a full
 * tree to operate on. Idempotent by default; pass overwrite to clobber.
 */
async function syncBundleToInstallDir(
  targetDir: string,
  opts: { overwrite?: boolean } = {},
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
  if (existsSync(targetDir) && !opts.overwrite) {
    ok(`Install directory ${targetDir} already exists (skipping copy).`);
    return;
  }
  await withSpinner(`Copying bundled snapshot to ${targetDir}`, async () => {
    mkdirSync(targetDir, { recursive: true });
    // `cp -a SRC/. DEST` copies SRC's contents directly into DEST (preserving
    // hidden files like .npmrc), matching the live-monorepo layout exactly.
    await execa("cp", ["-a", `${source}/.`, targetDir]);
  });
}
