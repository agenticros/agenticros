/**
 * `agenticros up [target]` - bring up a robot stack.
 *
 * target = "real" | "sim-amr" | "sim-arm"
 *
 * Orchestrates the existing shell scripts (start_demo.sh for real, scripts/sim/
 * run_sim.sh for simulation) rather than reimplementing their logic in TS.
 * That keeps phase-1 light and the scripts independently usable.
 */

import { existsSync } from "node:fs";

import { select } from "@inquirer/prompts";

import { runRealRobot } from "../runners/real-robot.js";
import { runSimAmr, runSimArm } from "../runners/sim.js";
import { err, info, warn } from "../util/logger.js";
import { writeState } from "../util/state.js";

export interface UpOptions {
  target?: string;
  rosDistro?: string;
  namespace?: string;
  rviz?: boolean;
  headless?: boolean;
  camera?: boolean;
  motors?: boolean;
}

type UpTarget = "real" | "sim-amr" | "sim-arm";

export async function upCommand(opts: UpOptions): Promise<void> {
  const target = await resolveTarget(opts.target);
  writeState({ lastMode: target, lastUpAt: new Date().toISOString() });

  switch (target) {
    case "real":
      await runRealRobot({
        rosDistro: opts.rosDistro,
        camera: opts.camera !== false,
        motors: opts.motors !== false,
      });
      break;
    case "sim-amr":
      await runSimAmr({
        namespace: opts.namespace,
        useRviz: opts.rviz === true,
        headless: resolveHeadless(opts.headless),
      });
      break;
    case "sim-arm":
      await runSimArm({
        namespace: opts.namespace,
        useRviz: opts.rviz === true,
        headless: resolveHeadless(opts.headless),
      });
      break;
  }
}

/**
 * If the user explicitly passed --headless / --no-headless, respect it.
 * Otherwise auto-detect headless when *either* of:
 *   - no DISPLAY env var (SSH session, CI, headless docker container)
 *   - this is a Jetson (Tegra). On Jetson L4T the gz GUI viewport renders
 *     as a solid white window because libEGL falls back through Mesa's
 *     nvidia-drm DRI driver (which doesn't exist on Tegra). We have no good
 *     workaround inside the CLI, so by default we skip the broken gz GUI
 *     and let RViz be the primary visualisation. Users who want to force
 *     the gz GUI anyway can pass `--no-headless` (and optionally set
 *     AGENTICROS_GZ_SOFTWARE_RENDER=1 to fall back to llvmpipe).
 */
function resolveHeadless(flag: boolean | undefined): boolean {
  if (flag !== undefined) return flag;
  if (!process.env["DISPLAY"]) return true;
  if (isJetson()) {
    warn(
      "Jetson detected (Tegra). The gz GUI viewport renders blank on Jetson;\n" +
        "  defaulting to --headless. Use RViz with --rviz to visualise the AMR\n" +
        "  (or override with `--no-headless` if you want to try the gz GUI).",
    );
    return true;
  }
  return false;
}

/** Detect NVIDIA Jetson / Tegra via the L4T release file. */
function isJetson(): boolean {
  return existsSync("/etc/nv_tegra_release");
}

async function resolveTarget(raw: string | undefined): Promise<UpTarget> {
  if (raw === "real" || raw === "sim-amr" || raw === "sim-arm") return raw;
  if (raw && raw !== "") {
    err(`Unknown target: ${raw}. Valid targets: real, sim-amr, sim-arm.`);
    process.exit(2);
  }
  info("No target given; pick one.");
  return select<UpTarget>({
    message: "What do you want to bring up?",
    choices: [
      { name: "Real robot (RealSense + motors + MCP)", value: "real" },
      { name: "Sim AMR (Gazebo + 2-wheel diff-drive)", value: "sim-amr" },
      { name: "Sim Arm (Gazebo + UR5e + MoveIt2)", value: "sim-arm" },
    ],
    default: "real",
  });
}
