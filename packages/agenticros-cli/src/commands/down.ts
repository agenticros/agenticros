/**
 * `agenticros down` - stop AgenticROS components this CLI brought up.
 *
 * Kills processes recorded in /tmp/agenticros-*.pid (consistent with
 * scripts/start_demo.sh), publishes a zero-twist cmd_vel, optionally leaves
 * camera or gateway running.
 */

import { execa } from "execa";

import { clearPid, isPidAlive, killPid, type ManagedProcess } from "../util/pidfile.js";
import { err, header, info, ok, warn, withSpinner } from "../util/logger.js";

export interface DownOptions {
  keepCamera?: boolean;
  keepGateway?: boolean;
}

const STOPPABLE: ManagedProcess[] = ["sim", "mcp", "rosbridge", "camera"];

export async function downCommand(opts: DownOptions): Promise<void> {
  header("AgenticROS - shutting down");

  for (const name of STOPPABLE) {
    if (name === "camera" && opts.keepCamera) {
      info("Skipping camera (--keep-camera).");
      continue;
    }
    if (!isPidAlive(name)) continue;
    await withSpinner(`Stopping ${name}`, async () => {
      const pid = killPid(name, "SIGTERM");
      if (pid === undefined) return;
      await waitForExit(pid);
      clearPid(name);
    });
  }

  // Also clean up any stray gz / rviz from the sim that did not write a pidfile.
  await tryKill(["gz sim", "rviz2", "parameter_bridge"]);

  if (!opts.keepGateway) {
    await stopGatewayService();
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
