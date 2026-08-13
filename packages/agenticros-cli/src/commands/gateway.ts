/**
 * `agenticros gateway` — OpenClaw gateway ops helpers.
 *
 *   agenticros gateway restart [--json]
 *
 * Used locally and as the allowlisted remote preset `gateway_restart`.
 */

import { restartOpenclawGateway } from "../util/gateway-restart.js";
import { err, info, ok, warn } from "../util/logger.js";

export interface GatewayOptions {
  action?: string;
  json?: boolean;
}

export async function gatewayCommand(opts: GatewayOptions): Promise<void> {
  const action = (opts.action ?? "restart").toLowerCase();
  if (action !== "restart") {
    err(`Unknown gateway action '${opts.action}'. Use: restart`);
    process.exit(2);
  }

  info("Restarting OpenClaw gateway …");
  const result = await restartOpenclawGateway();

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: result.ok,
          method: result.method ?? null,
          message: result.message,
        },
        null,
        2,
      )}\n`,
    );
  } else if (result.ok) {
    ok(result.message);
  } else {
    warn(result.message);
  }

  if (!result.ok) process.exit(1);
}
