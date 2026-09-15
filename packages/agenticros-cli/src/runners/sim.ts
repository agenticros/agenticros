/**
 * Runners for the simulation modes.
 *
 * `agenticros up sim-amr` -> scripts/sim/run_sim.sh --robot amr
 * `agenticros up sim-arm` -> scripts/sim/run_sim.sh --robot arm
 *
 * Phase 1 ships these as stubs that point the user at the Phase 2 work; once
 * scripts/sim/run_sim.sh + the agenticros_sim ROS 2 package land, the two
 * functions below become single-line execa invocations of run_sim.sh.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import { startRealsenseCommand } from "../commands/robot-hw.js";
import { getCliPaths } from "../util/paths.js";
import { err, header, info, warn } from "../util/logger.js";
import { writeState } from "../util/state.js";

export interface SimRunOptions {
  namespace?: string;
  useRviz?: boolean;
  /** True = headless gz (-s --headless-rendering). Auto-detected from $DISPLAY upstream. */
  headless?: boolean;
  /** AMR only: launch Nav2 (map + AMCL + navigation) via sim_amr_nav2.launch.py. */
  nav2?: boolean;
  /** Arm only: launch MoveIt2 move_group + trajectory bridge via sim_arm_moveit.launch.py. */
  moveit?: boolean;
  /** AMR only: USB RealSense overlay (shadow AMR). Starts the camera node first. */
  realCamera?: boolean;
}

async function runSim(robot: "amr" | "arm", opts: SimRunOptions): Promise<void> {
  header(`AgenticROS - sim ${robot.toUpperCase()}`);

  const paths = getCliPaths();
  const script = join(paths.scriptsDir, "sim", "run_sim.sh");
  if (!existsSync(script)) {
    warn(
      `scripts/sim/run_sim.sh not found at ${script}.\n` +
        "  Simulation support is delivered in Phase 2 of the CLI plan. Until then,\n" +
        "  use `agenticros up real` against a real robot, or check back after the\n" +
        "  agenticros_sim ROS 2 package is published.",
    );
    return;
  }

  const ns = opts.namespace ?? "sim_robot";
  writeState({ lastNamespace: ns });

  const args = ["--robot", robot, "--namespace", ns];
  if (opts.useRviz) args.push("--rviz");
  if (opts.headless) args.push("--no-gui");
  if (opts.nav2) {
    if (robot !== "amr") {
      err("--nav2 is only supported with sim-amr.");
      process.exit(2);
    }
    args.push("--nav2");
  }
  if (opts.realCamera) {
    if (robot !== "amr") {
      err("--real-camera is only supported with sim-amr.");
      process.exit(2);
    }
    info("Starting RealSense on /realsense/camera (overlay will republish to /camera/camera)…");
    await startRealsenseCommand({
      pointcloud: true,
      full: true,
      extraEnv: {
        AGENTICROS_REALSENSE_CAMERA_NAMESPACE: "realsense",
        AGENTICROS_REALSENSE_PUBLISH_TF: "false",
        AGENTICROS_REALSENSE_ALIGN_DEPTH: "1",
      },
      softFail: true,
    });
    args.push("--real-camera");
  }
  if (opts.moveit) {
    if (robot !== "arm") {
      err("--moveit is only supported with sim-arm.");
      process.exit(2);
    }
    args.push("--moveit");
  }

  info(`Invoking ${script} ${args.join(" ")}…`);
  try {
    await execa("bash", [script, ...args], {
      env: { ...process.env, AGENTICROS_ROBOT_NAMESPACE: ns },
      stdio: "inherit",
    });
  } catch (e) {
    err(`Sim launch failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

export async function runSimAmr(opts: SimRunOptions): Promise<void> {
  return runSim("amr", opts);
}

export async function runSimArm(opts: SimRunOptions): Promise<void> {
  return runSim("arm", opts);
}
