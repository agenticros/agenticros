/**
 * `agenticros web` — open the AgenticROS config/teleop page served by the
 * OpenClaw plugin's web dashboard (`/plugins/agenticros/`).
 *
 * Prints the loopback URL (always reachable from the robot itself) and, when
 * the gateway is bound to `lan`, a second URL using the robot's LAN address
 * so it can be opened from another device (laptop, phone) on the same
 * network. See docs/openclaw-releases-and-plugin-routes.md for auth-related
 * pitfalls (token vs. no-auth mode, the 18790 proxy, device-identity checks).
 */

import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

import { info, ok, dim } from "../util/logger.js";
import { readOpenclawConfig } from "../util/openclaw-config.js";

export interface WebCommandOpts {
  open?: boolean;
}

const PLUGIN_PATH = "/plugins/agenticros/";
const DEFAULT_PORT = 18789;

function gatewaySection(): Record<string, unknown> {
  const cfg = readOpenclawConfig();
  const gateway = cfg?.["gateway"];
  return gateway && typeof gateway === "object" ? (gateway as Record<string, unknown>) : {};
}

function resolveGatewayPort(): number {
  const port = gatewaySection()["port"];
  return typeof port === "number" ? port : DEFAULT_PORT;
}

function resolveBindMode(): string {
  const bind = gatewaySection()["bind"];
  return typeof bind === "string" ? bind : "loopback";
}

function resolveAuthMode(): string {
  const auth = gatewaySection()["auth"];
  const mode =
    auth && typeof auth === "object" ? (auth as Record<string, unknown>)["mode"] : undefined;
  return typeof mode === "string" ? mode : "none";
}

/** First non-internal IPv4 address, if any — used to build a LAN-reachable URL. */
function firstLanAddress(): string | undefined {
  const ifaces = networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return undefined;
}

/** Best-effort, fire-and-forget browser launch. Never throws. */
export function openInBrowser(url: string): void {
  try {
    const [cmd, args] =
      process.platform === "darwin"
        ? ["open", [url]]
        : process.platform === "win32"
          ? ["cmd", ["/c", "start", "", url]]
          : ["xdg-open", [url]];
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => {
      /* no GUI / no xdg-open — the URL is already printed above */
    });
    child.unref();
  } catch {
    /* best-effort only */
  }
}

export async function webCommand(opts: WebCommandOpts = {}): Promise<void> {
  const port = resolveGatewayPort();
  const bind = resolveBindMode();
  const authMode = resolveAuthMode();
  const loopbackUrl = `http://127.0.0.1:${port}${PLUGIN_PATH}`;

  info("OpenClaw web dashboard (config + teleop):");
  ok(`  ${loopbackUrl}`);

  if (bind === "lan") {
    const lanIp = firstLanAddress();
    if (lanIp) {
      ok(`  http://${lanIp}:${port}${PLUGIN_PATH}  (from another device on the LAN)`);
    }
  }

  if (authMode !== "none") {
    dim(
      "  Gateway auth is enabled — if this 404s/401s in a plain browser, see docs/openclaw-releases-and-plugin-routes.md",
    );
  }

  if (opts.open !== false) {
    openInBrowser(loopbackUrl);
  } else {
    dim("  (--no-open: not launching a browser)");
  }
}
