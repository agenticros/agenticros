/**
 * `agenticros down` - stop AgenticROS components this CLI brought up.
 *
 * Kills processes recorded in /tmp/agenticros-*.pid (sim, camera, mcp,
 * rosbridge, eyes) plus stray gz / rviz / parameter_bridge.  The OpenClaw
 * gateway service is a persistent host service used by Claude Code / MCP -
 * leave it running unless the user explicitly passes --stop-gateway.
 */

import { execa } from "execa";

import { clearPid, isPidAlive, killPid, type ManagedProcess } from "../util/pidfile.js";
import { err, header, info, ok, warn, withSpinner } from "../util/logger.js";

export interface DownOptions {
  keepCamera?: boolean;
  /** Default false. When true, also stops openclaw-gateway.service. */
  stopGateway?: boolean;
}

const STOPPABLE: ManagedProcess[] = ["sim", "mcp", "rosbridge", "camera", "eyes"];

export async function downCommand(opts: DownOptions): Promise<void> {
  header("AgenticROS - shutting down");

  let stoppedAny = false;
  for (const name of STOPPABLE) {
    if (name === "camera" && opts.keepCamera) {
      info("Skipping camera (--keep-camera).");
      continue;
    }
    if (!isPidAlive(name)) continue;
    stoppedAny = true;
    await withSpinner(`Stopping ${name}`, async () => {
      const pid = killPid(name, "SIGTERM");
      if (pid === undefined) return;
      await waitForExit(pid);
      clearPid(name);
    });
  }

  // Mop up stray subprocesses that don't have a pidfile we own. Two common
  // sources of orphans:
  //   - `ros2 launch realsense2_camera rs_launch.py` writes the launch parent's
  //     PID to the pidfile, but the actual `realsense2_camera_node` is a
  //     detached child. If the launch parent dies (or start_demo.sh's "already
  //     running, skipping" path runs), the node keeps running with its IR
  //     projector lit and is invisible to our pidfile bookkeeping.
  //   - Sim children (gz sim, rviz, parameter_bridge) inherit termination from
  //     ros2 launch in most cases but not always.
  // We pkill them all by name. -f matches the full command line; SIGTERM first,
  // then a brief grace period, then SIGKILL anything still hanging on.
  if (!opts.keepCamera) {
    await pkillAndWait([
      "realsense2_camera_node",
      "ros2 launch realsense2_camera",
    ]);
  }
  await pkillAndWait(["gz sim", "ign gazebo", "rviz2", "parameter_bridge"]);

  if (opts.stopGateway) {
    await stopGatewayService();
  } else {
    info("Leaving openclaw-gateway running (use --stop-gateway to also stop it).");
  }

  if (!stoppedAny && !opts.stopGateway) {
    info("Nothing to stop.");
  }
  ok("Done.");
}

async function waitForExit(pid: number, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  // Force-kill after timeout.
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // probably gone
  }
}

async function tryKill(patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    try {
      await execa("pkill", ["-TERM", "-f", pattern], { reject: false });
    } catch {
      // ignore - pkill missing or no matches
    }
  }
}

/**
 * Send SIGTERM to anything matching `patterns`, wait for the kernel to schedule
 * the exits, then SIGKILL any survivors. Crucially, this is what actually turns
 * the RealSense IR projector off: SIGTERM gives the realsense2_camera_node a
 * chance to release the USB device cleanly, and the SIGKILL fallback handles
 * the case where it's wedged.
 */
async function pkillAndWait(
  patterns: string[],
  termGraceMs = 1500,
): Promise<void> {
  // Phase 1: gentle termination.
  let matchedAny = false;
  for (const pattern of patterns) {
    try {
      const { exitCode } = await execa("pkill", ["-TERM", "-f", pattern], {
        reject: false,
      });
      // pkill exits 0 when at least one process matched, 1 when nothing did.
      if (exitCode === 0) matchedAny = true;
    } catch {
      // pkill missing — nothing to do.
    }
  }
  if (!matchedAny) return;

  // Phase 2: brief wait so well-behaved processes can exit cleanly.
  await new Promise((r) => setTimeout(r, termGraceMs));

  // Phase 3: SIGKILL anything that's still around.
  for (const pattern of patterns) {
    try {
      await execa("pkill", ["-KILL", "-f", pattern], { reject: false });
    } catch {
      // ignore
    }
  }
}

async function stopGatewayService(): Promise<void> {
  try {
    const { exitCode } = await execa(
      "systemctl",
      ["--user", "is-active", "openclaw-gateway.service"],
      { reject: false },
    );
    if (exitCode !== 0) return; // not active or doesn't exist
    await withSpinner("Stopping openclaw-gateway.service", async () => {
      await execa("systemctl", ["--user", "stop", "openclaw-gateway.service"], {
        reject: false,
      });
    });
  } catch (e) {
    warn(`Could not stop openclaw-gateway.service: ${e instanceof Error ? e.message : String(e)}`);
  }
}

void err; // silence "unused" warning on broad imports until full impl
