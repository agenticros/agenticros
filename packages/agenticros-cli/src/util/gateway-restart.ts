/**
 * Restart the OpenClaw gateway so newly registered skills / plugin config
 * are picked up. Mid-session hot-reload is blocked on OpenClaw's sync
 * register() snapshot — restart is the pragmatic activation path.
 *
 * Tries systemctl --user first, then `openclaw gateway restart`.
 * systemctl --user can hang without a D-Bus session, so every attempt
 * is hard-timed out.
 */

import { execa } from "execa";

export interface GatewayRestartResult {
  ok: boolean;
  /** Which command succeeded, when ok. */
  method?: string;
  message: string;
}

const ATTEMPTS: Array<{ label: string; cmd: string; args: string[] }> = [
  {
    label: "systemctl --user restart openclaw-gateway.service",
    cmd: "systemctl",
    args: ["--user", "restart", "openclaw-gateway.service"],
  },
  {
    label: "openclaw gateway restart",
    cmd: "openclaw",
    args: ["gateway", "restart"],
  },
];

export async function restartOpenclawGateway(): Promise<GatewayRestartResult> {
  for (const a of ATTEMPTS) {
    try {
      const { exitCode } = await execa(a.cmd, a.args, {
        reject: false,
        timeout: 10000,
      });
      if (exitCode === 0) {
        return {
          ok: true,
          method: a.label,
          message: `Restarted OpenClaw gateway via: ${a.label}`,
        };
      }
    } catch {
      /* try next */
    }
  }
  return {
    ok: false,
    message:
      "Could not auto-restart the OpenClaw gateway. Try:\n" +
      "    systemctl --user restart openclaw-gateway.service\n" +
      "  (or: openclaw gateway restart)",
  };
}

export function gatewayRestartHint(): string {
  return (
    "Restart the OpenClaw gateway to pick up the new skill list:\n" +
    "    systemctl --user restart openclaw-gateway.service\n" +
    "  (or: openclaw gateway restart)"
  );
}
