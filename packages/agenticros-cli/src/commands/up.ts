/**
 * `agenticros up [target]` - bring up a robot stack.
 *
 * target = "real" | "sim-amr" | "sim-arm"
 *
 * Orchestrates the existing shell scripts (start_demo.sh for real, scripts/sim/
 * run_sim.sh for simulation) rather than reimplementing their logic in TS.
 * That keeps phase-1 light and the scripts independently usable.
 */

import { select } from "@inquirer/prompts";

import { runRealRobot } from "../runners/real-robot.js";
import { runSimAmr, runSimArm } from "../runners/sim.js";
import { err, info } from "../util/logger.js";
import { writeState } from "../util/state.js";

export interface UpOptions {
  target?: string;
  rosDistro?: string;
  namespace?: string;
  rviz?: boolean;
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
      });
      break;
    case "sim-arm":
      await runSimArm({
        namespace: opts.namespace,
        useRviz: opts.rviz === true,
      });
      break;
  }
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
