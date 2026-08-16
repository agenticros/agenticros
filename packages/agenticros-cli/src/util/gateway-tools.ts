/**
 * Invoke a tool registered on the *running* OpenClaw gateway via its
 * `tools.invoke` RPC (over `openclaw gateway call`), without starting,
 * stopping, or restarting the gateway process itself.
 *
 * Used by `up`/`down` to start/stop skill-level background work (e.g. the
 * Jarvis voice loop) that would otherwise only toggle via `autoStart` on
 * gateway boot - which doesn't help once the gateway is a persistent host
 * service that `agenticros down` intentionally leaves running.
 */

import { execa } from "execa";

import { readOpenclawConfig } from "./openclaw-config.js";

export async function isGatewayActive(): Promise<boolean> {
  const { exitCode } = await execa(
    "systemctl",
    ["--user", "is-active", "openclaw-gateway.service"],
    { reject: false },
  );
  return exitCode === 0;
}

function gatewayToken(): string | undefined {
  const cfg = readOpenclawConfig();
  const gateway = cfg?.["gateway"] as Record<string, unknown> | undefined;
  const auth = gateway?.["auth"] as Record<string, unknown> | undefined;
  return typeof auth?.["token"] === "string" ? (auth["token"] as string) : undefined;
}

export interface InvokeGatewayToolResult {
  ok: boolean;
  message?: string;
}

/**
 * Call `tools.invoke` for `name` with `args` against the live gateway.
 * Returns `{ ok: false }` quietly (no throw) if the gateway isn't running or
 * has no auth token on file - callers should already have checked
 * `isGatewayActive()` when they want to skip attempting this entirely.
 */
export async function invokeGatewayTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<InvokeGatewayToolResult> {
  const token = gatewayToken();
  if (!token) return { ok: false, message: "no gateway auth token on file" };
  try {
    const { exitCode, stdout, stderr } = await execa(
      "openclaw",
      [
        "gateway",
        "call",
        "tools.invoke",
        "--token",
        token,
        "--json",
        "--params",
        JSON.stringify({ name, args }),
      ],
      { reject: false, timeout: 10000 },
    );
    if (exitCode !== 0) return { ok: false, message: stderr || stdout };
    return { ok: true, message: stdout };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
