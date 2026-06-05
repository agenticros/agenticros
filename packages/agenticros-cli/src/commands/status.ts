/**
 * `agenticros status` - snapshot of which components are running.
 *
 * Pulls process info from /tmp/agenticros-*.pid (the same convention the rest
 * of the CLI uses) and the systemd state for the OpenClaw gateway, then prints
 * a coloured table or JSON.
 */

import { execa } from "execa";

import { isPidAlive, readPid, type ManagedProcess } from "../util/pidfile.js";
import { colors, header, info } from "../util/logger.js";
import { readState } from "../util/state.js";

const COMPONENTS: ManagedProcess[] = ["camera", "sim", "mcp", "rosbridge"];

export interface StatusOptions {
  json?: boolean;
}

export async function statusCommand(opts: StatusOptions): Promise<void> {
  const state = readState();
  const components: { name: string; running: boolean; pid: number | undefined }[] = COMPONENTS.map(
    (name) => ({
      name,
      running: isPidAlive(name),
      pid: readPid(name),
    }),
  );

  let gatewayActive = false;
  try {
    const { exitCode } = await execa("systemctl", ["--user", "is-active", "openclaw-gateway.service"], {
      reject: false,
    });
    gatewayActive = exitCode === 0;
  } catch {
    // systemctl missing - leave false
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          components,
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
  const gatewayDot = gatewayActive ? colors.green("●") : colors.dim("○");
  process.stdout.write(`  ${gatewayDot}  ${"openclaw".padEnd(10)} ${colors.dim(gatewayActive ? "active" : "inactive")}\n`);

  if (state.lastMode) {
    info(
      `Last mode: ${state.lastMode}${state.lastNamespace ? ` (namespace=${state.lastNamespace})` : ""}`,
    );
  }
}
