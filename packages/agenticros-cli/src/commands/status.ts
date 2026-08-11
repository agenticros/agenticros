/**
 * `agenticros status` - snapshot of which components are running.
 *
 * Pulls process info from /tmp/agenticros-*.pid (the same convention the rest
 * of the CLI uses), pgrep patterns for on-robot hardware helpers, and the
 * systemd state for the OpenClaw gateway, then prints a coloured table or JSON.
 */

import { execa } from "execa";

import { clearPid, isPidAlive, readPid, type ManagedProcess } from "../util/pidfile.js";
import { colors, header, info } from "../util/logger.js";
import { readState } from "../util/state.js";

const COMPONENTS: ManagedProcess[] = ["camera", "sim", "mcp", "rosbridge", "eyes"];

const HW_PATTERNS: { name: string; pattern: string }[] = [
  { name: "comms", pattern: "comms.js" },
  { name: "motors", pattern: "motors-" },
  { name: "camera2d", pattern: "camera-2d-ros.js" },
  { name: "realsense", pattern: "realsense2_camera_node" },
];

export interface StatusOptions {
  json?: boolean;
}

async function pgrepRunning(pattern: string): Promise<{ running: boolean; pid?: number }> {
  try {
    const { stdout, exitCode } = await execa("pgrep", ["-f", pattern], { reject: false });
    if (exitCode !== 0 || !stdout.trim()) return { running: false };
    const pid = Number.parseInt(stdout.trim().split("\n")[0] ?? "", 10);
    return { running: true, pid: Number.isFinite(pid) ? pid : undefined };
  } catch {
    return { running: false };
  }
}

export async function statusCommand(opts: StatusOptions): Promise<void> {
  const state = readState();
  const components: { name: string; running: boolean; pid: number | undefined }[] = COMPONENTS.map(
    (name) => {
      const alive = isPidAlive(name);
      const pid = readPid(name);
      // Auto-clean stale pidfiles so subsequent runs aren't confused by ghosts.
      if (!alive && pid !== undefined) {
        clearPid(name);
      }
      return { name, running: alive, pid: alive ? pid : undefined };
    },
  );

  const hardware: { name: string; running: boolean; pid: number | undefined }[] = [];
  for (const hw of HW_PATTERNS) {
    const result = await pgrepRunning(hw.pattern);
    hardware.push({ name: hw.name, running: result.running, pid: result.pid });
  }

  let gatewayActive = false;
  try {
    const { exitCode } = await execa(
      "systemctl",
      ["--user", "is-active", "openclaw-gateway.service"],
      {
        reject: false,
        // Detached cloud agents often lack a user D-Bus session; systemctl
        // --user can hang forever without a timeout.
        timeout: 2000,
      },
    );
    gatewayActive = exitCode === 0;
  } catch {
    // systemctl missing / timed out - leave false
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          components,
          hardware,
          openclawGatewayActive: gatewayActive,
          lastMode: state.lastMode,
          lastNamespace: state.lastNamespace,
          lastUpAt: state.lastUpAt,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  header("AgenticROS status");
  for (const c of components) {
    const dot = c.running ? colors.green("●") : colors.dim("○");
    const pidText = c.pid ? colors.dim(`pid ${c.pid}`) : colors.dim("—");
    process.stdout.write(`  ${dot}  ${c.name.padEnd(10)} ${pidText}\n`);
  }
  for (const h of hardware) {
    const dot = h.running ? colors.green("●") : colors.dim("○");
    const pidText = h.pid ? colors.dim(`pid ${h.pid}`) : colors.dim("—");
    process.stdout.write(`  ${dot}  ${h.name.padEnd(10)} ${pidText}\n`);
  }
  const gatewayDot = gatewayActive ? colors.green("●") : colors.dim("○");
  process.stdout.write(`  ${gatewayDot}  ${"openclaw".padEnd(10)} ${colors.dim(gatewayActive ? "active" : "inactive")}\n`);

  if (state.lastMode) {
    info(
      `Last mode: ${state.lastMode}${state.lastNamespace ? ` (namespace=${state.lastNamespace})` : ""}`,
    );
  }
}
