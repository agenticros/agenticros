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
import { err, info, ok, warn } from "../util/logger.js";
import { ensureProfilesExist, readActiveMode, switchMode, type Mode } from "../util/profiles.js";
import { writeState } from "../util/state.js";

export interface UpOptions {
  target?: string;
  rosDistro?: string;
  namespace?: string;
  rviz?: boolean;
  headless?: boolean;
  nav2?: boolean;
  camera?: boolean;
  motors?: boolean;
}

type UpTarget = "real" | "sim-amr" | "sim-arm";

export async function upCommand(opts: UpOptions): Promise<void> {
  const target = await resolveTarget(opts.target);
  writeState({ lastMode: target, lastUpAt: new Date().toISOString() });

  // Make sure ~/.agenticros/config.json points at the right profile for
  // the requested target BEFORE the runner launches anything. Both sim
  // targets share the "sim" profile (empty namespace + /cmd_vel at root);
  // "real" gets the "real" profile.
  syncActiveProfile(target);
  warnIfMcpNamespaceShadowsMode(target);

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
        nav2: opts.nav2 === true,
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

/**
 * Ensure ~/.agenticros/config.json mirrors the profile for the requested
 * target. Idempotent: if we're already on the right profile we still
 * re-copy (cheap) so any out-of-band edits to the profile take effect.
 */
function syncActiveProfile(target: UpTarget): void {
  ensureProfilesExist();
  const desired: Mode = target === "real" ? "real" : "sim";
  const current = readActiveMode();
  switchMode(desired);
  if (current === desired) {
    info(`Active profile already '${desired}'. (~/.agenticros/config.json refreshed.)`);
  } else {
    ok(`Switched ~/.agenticros/config.json to '${desired}' profile (was: ${current ?? "unset"}).`);
    warn(
      "If an MCP server (Claude Code, Claude desktop, OpenClaw) is already running,\n" +
        "  restart it so it re-reads the namespace. New launches pick it up automatically.",
    );
  }
}

/**
 * Warn loudly if AGENTICROS_ROBOT_NAMESPACE is set in the process env to a
 * value that doesn't match the active mode. The MCP server's
 * applyMcpEnvOverrides() lets this env var unconditionally override the
 * config file's namespace, so a leftover value in .mcp.json (or shell
 * exports) silently breaks the mode switch.
 */
function warnIfMcpNamespaceShadowsMode(target: UpTarget): void {
  const env = process.env["AGENTICROS_ROBOT_NAMESPACE"];
  if (env === undefined) return;
  const trimmed = env.trim();
  if (trimmed.length === 0) return; // empty == falls through to config, fine
  // Real-robot mode: only warn if the env doesn't look like a robot id.
  // Sim mode: ANY non-empty value sabotages routing because sim publishes
  // /cmd_vel at the root.
  if (target === "real") {
    // Almost certainly intentional - the user has their real-robot namespace
    // exported. No warning.
    return;
  }
  warn(
    `AGENTICROS_ROBOT_NAMESPACE is set to '${trimmed}' but you're launching a sim.\n` +
      `  The MCP server will publish to /${trimmed}/cmd_vel; the sim listens on /cmd_vel.\n` +
      "  Robot will not move. Unset that env var (or edit .mcp.json / claude_desktop_config.json\n" +
      "  to set it to \"\") and restart your MCP client.",
  );
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
      { name: "Real robot (RealSense + MCP; motors if robotics CLI present)", value: "real" },
      { name: "Sim AMR (Gazebo + 2-wheel diff-drive; add --nav2 for Nav2)", value: "sim-amr" },
      { name: "Sim Arm (Gazebo + UR5e; MoveIt2 WIP)", value: "sim-arm" },
    ],
    default: "real",
  });
}
