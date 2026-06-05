import { createConnection, type Socket } from "node:net";

/**
 * Result of a TCP-level reachability probe for a `ws://` / `wss://` endpoint.
 *
 * We only check that *something* accepts a TCP connection on the host:port — not
 * that it speaks the WebSocket protocol. That is enough to distinguish "router
 * is not running" (the common failure mode for AgenticROS users who forget to
 * start zenohd) from "router is up but rejecting".
 */
export interface PreflightResult {
  /** True if the TCP socket connected within the timeout. */
  reachable: boolean;
  /** Resolved host:port (for messages). Empty when parsing failed. */
  host: string;
  port: number;
  /** Short human-readable reason when `reachable` is false. */
  reason?: string;
}

/**
 * TCP-level reachability probe for a WebSocket URL.
 *
 * Why TCP and not an actual WebSocket handshake?
 *  - It's instant when the port is closed (the OS returns ECONNREFUSED, no
 *    timeout wait).
 *  - It doesn't depend on `ws://` library handshake quirks; we just need to
 *    know whether zenohd / rosbridge is up.
 *  - Calling `zenoh-ts` `Session.open()` against a closed port triggers its
 *    own internal retry loop that spams `WebSocket disconnected from
 *    remote-api-plugin: 1006` and `Restart connection (N/10)` — we want to
 *    avoid invoking it at all when we already know the port is dead.
 */
export async function preflightWsEndpoint(
  endpoint: string,
  timeoutMs = 1500,
): Promise<PreflightResult> {
  const trimmed = (endpoint ?? "").trim();
  if (!trimmed) {
    return { reachable: false, host: "", port: 0, reason: "endpoint is empty" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { reachable: false, host: "", port: 0, reason: `invalid URL "${trimmed}"` };
  }

  if (!/^wss?:$/i.test(url.protocol)) {
    return {
      reachable: false,
      host: url.hostname,
      port: 0,
      reason: `expected ws:// or wss:// URL, got ${url.protocol}//`,
    };
  }

  const host = url.hostname;
  const defaultPort = url.protocol.toLowerCase() === "wss:" ? 443 : 80;
  const port = url.port ? Number.parseInt(url.port, 10) : defaultPort;
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return { reachable: false, host, port: 0, reason: `invalid port ${url.port}` };
  }

  return await new Promise<PreflightResult>((resolve) => {
    let settled = false;
    let socket: Socket | null = null;
    const finish = (result: PreflightResult): void => {
      if (settled) return;
      settled = true;
      if (socket) {
        try {
          socket.destroy();
        } catch {
          /* ignore */
        }
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ reachable: false, host, port, reason: `timeout after ${timeoutMs}ms` });
    }, timeoutMs);
    timer.unref?.();

    try {
      socket = createConnection({ host, port });
    } catch (err) {
      clearTimeout(timer);
      finish({
        reachable: false,
        host,
        port,
        reason: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    socket.once("connect", () => {
      clearTimeout(timer);
      finish({ reachable: true, host, port });
    });
    socket.once("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      const reason =
        err && typeof err.code === "string" ? `${err.code} (${err.message})` : err?.message ?? "connection error";
      finish({ reachable: false, host, port, reason });
    });
  });
}
