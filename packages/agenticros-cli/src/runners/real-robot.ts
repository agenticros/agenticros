/**
 * Runner: `agenticros up real`.
 *
 * Spawns scripts/start_demo.sh as a child process and streams its output.
 * start_demo.sh always tries the RealSense camera (unless --no-camera) and
 * only starts the robotics motor controller when that CLI is installed.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import { getCliPaths } from "../util/paths.js";
import { detectRosDistro } from "../util/env.js";
import { err, header, info } from "../util/logger.js";
import { ensureWorkspaceReady } from "../util/workspace.js";

export interface RealRobotOptions {
  rosDistro?: string;
  camera?: boolean;
  motors?: boolean;
}

export async function runRealRobot(opts: RealRobotOptions): Promise<void> {
  header("AgenticROS - real robot");

  const paths = getCliPaths();
  const script = join(paths.scriptsDir, "start_demo.sh");
  if (!existsSync(script)) {
    err(`start_demo.sh not found at ${script}.`);
    err(
      "Run `agenticros init` first; if you're using `npx`, this is a CLI bug — file an issue.",
    );
    process.exit(1);
  }

  // Auto-recover if the workspace isn't installed/built. start_demo.sh would
  // also try to build, but it doesn't run `pnpm install` first - so a partial
  // ~/agenticros (node_modules dir exists but no .pnpm, .bin missing) breaks
  // it. Doing it here means picking "Launch with real robot" on a fresh
  // install just works without the user having to know about `init` first.
  if (paths.repoRoot) {
    await ensureWorkspaceReady(paths.repoRoot, "the real-robot demo");
  }

  const ros = detectRosDistro(opts.rosDistro);
  if (!ros.distro) {
    err("No ROS 2 installation detected under /opt/ros/. Install ROS 2 Humble or Jazzy first.");
    process.exit(1);
  }

  const env = { ...process.env };
  if (opts.camera === false) env["AGENTICROS_NO_CAMERA"] = "1";
  if (opts.motors === false) env["AGENTICROS_NO_MOTORS"] = "1";

  info(`Sourcing /opt/ros/${ros.distro}/setup.bash then running start_demo.sh…`);
  try {
    await execa("bash", [script, ros.distro], {
      env,
      stdio: "inherit",
    });
  } catch (e) {
    err(`start_demo.sh failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
