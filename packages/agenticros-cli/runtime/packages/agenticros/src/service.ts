import type { TransportConfig } from "@agenticros/core";
import type { RosTransport } from "@agenticros/core";
import { createTransport, getTransportConfig } from "@agenticros/core";
import type { OpenClawPluginApi } from "./plugin-api.js";
import type { PluginLogger } from "./plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { readAgenticROSConfigFromFile } from "./config-file.js";
import { preflightWsEndpoint } from "./preflight.js";

/** Shared transport instance for all tools. */
let transport: RosTransport | null = null;

/** Tracks the active transport mode. */
let currentMode: TransportConfig["mode"] | null = null;

/** Concurrency guard — prevents overlapping switchTransport calls. */
let switching = false;

/**
 * Serialize every connect attempt (no TOCTOU gap). Two callers that both see `transport` disconnected
 * must not run `createTransport`+`connect()` in parallel — that duplicates Zenoh WebSockets and triggers
 * remote-api 1006 / camera 503.
 */
let transportConnectChain: Promise<void> = Promise.resolve();

/** Get the active transport. Throws if not connected. */
export function getTransport(): RosTransport {
  if (!transport) {
    throw new Error("Transport not initialized. Is the service running?");
  }
  return transport;
}

/** Get the active transport or null if not initialized. Use for status checks without throwing. */
export function getTransportOrNull(): RosTransport | null {
  return transport;
}

/** Get the current transport mode, or null if no transport is active. */
export function getTransportMode(): TransportConfig["mode"] | null {
  return currentMode;
}

/**
 * Switch the active transport at runtime.
 */
export async function switchTransport(config: TransportConfig, logger: PluginLogger): Promise<void> {
  if (switching) {
    throw new Error("A transport switch is already in progress. Please wait.");
  }

  switching = true;
  try {
    if (transport) {
      await transport.disconnect();
      transport = null;
      currentMode = null;
    }

    const newTransport = await createTransport(config);

    newTransport.onConnection((status: string) => {
      logger.info(`ROS2 transport status: ${status}`);
    });

    await newTransport.connect();

    transport = newTransport;
    currentMode = config.mode;

    logger.info(`ROS2 transport switched to ${config.mode}`);
  } finally {
    switching = false;
  }
}

/**
 * The plugin owns all reconnection logic (tryConnect + pollWhenDisconnected). Tell the
 * underlying transport client to NOT reconnect on its own — otherwise we get two
 * concurrent reconnect timers per client. When the plugin then drops the transport
 * reference (e.g. on poll-driven replace) the underlying client keeps reconnecting on
 * its own, leaking one live WebSocket per replace cycle and hammering rosbridge.
 */
function buildTransportConfig(transportCfg: TransportConfig): TransportConfig {
  if (transportCfg.mode === "rosbridge") {
    return {
      ...transportCfg,
      rosbridge: {
        ...(transportCfg.rosbridge ?? { url: "ws://localhost:9090" }),
        reconnect: false,
      },
    };
  }
  return transportCfg;
}

/**
 * Preflight state for the configured router WebSocket endpoint.
 *
 * We use this to:
 *  1. Suppress the noisy `WebSocket disconnected from remote-api-plugin: 1006` /
 *     `Restart connection (N/10)` spam emitted by zenoh-ts (and the analogous
 *     rosbridge reconnect chatter) when the user simply hasn't started the
 *     router yet. Instead of calling `Session.open()` against a dead port, we
 *     short-circuit with one clear actionable message.
 *  2. Re-print a single positive message when the router becomes reachable
 *     again, so the user can see in the log that AgenticROS recovered.
 */
const routerProbe = {
  /** True if the last preflight result was reachable. Drives the up/down log message. */
  lastReachable: null as boolean | null,
  /** True once the multiline "how to fix it" banner has been printed in the current down-cycle. */
  bannerPrinted: false,
};

/** What kind of `ws://`-style endpoint, if any, this transport mode talks to. */
function getRouterEndpoint(
  cfg: TransportConfig,
): { kind: "zenoh router" | "rosbridge"; url: string; startHint: string } | null {
  if (cfg.mode === "zenoh") {
    const url = (cfg.zenoh?.routerEndpoint ?? "").trim();
    if (!url) return null;
    return {
      kind: "zenoh router",
      url,
      startHint:
        "Start it with `zenohd -c scripts/zenohd-agenticros.json5` (port 10000, zenoh-plugin-remote-api). See docs/zenoh-agenticros.md.",
    };
  }
  if (cfg.mode === "rosbridge") {
    const url = (cfg.rosbridge?.url ?? "").trim();
    if (!url) return null;
    return {
      kind: "rosbridge",
      url,
      startHint: "Start `rosbridge_server` on the robot (default port 9090).",
    };
  }
  return null;
}

/**
 * TCP-probe the router endpoint and emit human-friendly log messages on state
 * transitions (down→up, up→down). Returns true when the endpoint is reachable
 * (caller may proceed to open the WebSocket session); returns false when it
 * isn't (caller should skip Session.open and let the next retry tick handle
 * recovery).
 */
async function checkRouterAndLog(
  endpoint: { kind: string; url: string; startHint: string },
  logger: PluginLogger,
): Promise<boolean> {
  const result = await preflightWsEndpoint(endpoint.url);

  if (result.reachable) {
    if (routerProbe.lastReachable === false) {
      logger.info(
        `AgenticROS: ${endpoint.kind} is now reachable at ${endpoint.url} — connecting…`,
      );
    }
    routerProbe.lastReachable = true;
    routerProbe.bannerPrinted = false;
    return true;
  }

  if (!routerProbe.bannerPrinted) {
    const target = result.host && result.port ? `${result.host}:${result.port}` : endpoint.url;
    logger.warn(
      [
        "",
        "─".repeat(72),
        `AgenticROS: ${endpoint.kind} not reachable (${result.reason ?? "unknown"}).`,
        `  endpoint: ${endpoint.url}  (TCP ${target})`,
        `  ${endpoint.startHint}`,
        "  Skipping WebSocket session open to avoid `remote-api-plugin: 1006` retry spam.",
        "  Will keep probing every 10–15s; this message reappears only if the router goes down again.",
        "─".repeat(72),
      ].join("\n"),
    );
    routerProbe.bannerPrinted = true;
  } else if (routerProbe.lastReachable !== false) {
    logger.warn(
      `AgenticROS: ${endpoint.kind} still not reachable at ${endpoint.url} (${result.reason ?? "unknown"}).`,
    );
  }
  routerProbe.lastReachable = false;
  return false;
}

/**
 * Connect the transport (create + connect). Idempotent: if already connected, no-op.
 */
async function ensureTransportConnected(
  api: OpenClawPluginApi,
  transportCfg: TransportConfig,
): Promise<void> {
  const task = async () => {
    if (transport && transport.getStatus() === "connected") {
      return;
    }
    if (transport) {
      try {
        await transport.disconnect();
      } catch {
        /* ignore */
      }
      transport = null;
      currentMode = null;
    }
    // Preflight the router endpoint for ws-based transports. If the port isn't
    // reachable we skip Session.open() entirely — that's what suppresses the
    // zenoh-ts internal `remote-api-plugin: 1006` / `Restart connection`
    // retry spam when the user simply hasn't started zenohd / rosbridge yet.
    const endpoint = getRouterEndpoint(transportCfg);
    if (endpoint) {
      const reachable = await checkRouterAndLog(endpoint, api.logger);
      if (!reachable) {
        return;
      }
    }
    api.logger.info(`Connecting to ROS2 via ${transportCfg.mode} transport...`);
    const newTransport = await createTransport(buildTransportConfig(transportCfg));
    newTransport.onConnection((status: string) => {
      api.logger.info(`ROS2 transport status: ${status}`);
    });
    await newTransport.connect();
    transport = newTransport;
    currentMode = transportCfg.mode;
    api.logger.info(`ROS2 transport connected (mode: ${transportCfg.mode})`);
  };

  const next = transportConnectChain.then(task, task);
  transportConnectChain = next.catch((err) => {
    api.logger.warn(
      "AgenticROS transport connect failed: " + (err instanceof Error ? err.message : String(err)),
    );
  });
  await next;
}

const RETRY_INTERVAL_MS = 10000;
const DISCONNECTED_POLL_MS = 15000;

/**
 * Register the ROS2 transport as an OpenClaw managed service and connect immediately
 * so teleop/tools work even if the gateway never calls start(). Retries on failure and
 * when the connection drops (e.g. Zenoh session closed).
 */
export function registerService(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const transportCfg = getTransportConfig(config);

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  api.registerService({
    id: "ros2-transport",

    async start(_ctx) {
      // OpenClaw awaits plugin service start() before marking sidecars ready and accepting
      // webchat WebSockets. Zenoh connect() can hang indefinitely when the router is down,
      // which would block the entire gateway. Connection is already initiated from register()
      // (eager connect + retries); do not await it here.
      void ensureTransportConnected(api, transportCfg).catch((err) => {
        api.logger.warn(
          "AgenticROS transport connect in service.start failed (retries continue): " +
            (err instanceof Error ? err.message : String(err)),
        );
      });
    },

    async stop(_ctx) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (transport) {
        await transport.disconnect();
        transport = null;
        currentMode = null;
        api.logger.info("ROS2 transport disconnected");
      }
    },
  });

  function tryConnect(): void {
    if (transport && transport.getStatus() === "connected") return;
    ensureTransportConnected(api, transportCfg)
      .then(() => {})
      .catch((err) => {
        api.logger.warn(
          "AgenticROS transport connect failed (retry in " + RETRY_INTERVAL_MS / 1000 + "s): " + (err instanceof Error ? err.message : String(err)),
        );
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(tryConnect, RETRY_INTERVAL_MS);
      });
  }

  // When we have a transport but it's disconnected (e.g. Zenoh session dropped), reconnect.
  //
  // IMPORTANT: do NOT drop the transport reference without calling disconnect() first.
  // ensureTransportConnected() already does the right thing — it disconnects the old
  // transport (which clears its timers and closes its WebSocket) before creating a new
  // one. The previous version of this function nulled `transport` directly, which
  // orphaned the WebSocket client and leaked one live connection per poll cycle.
  function pollWhenDisconnected(): void {
    if (transport && transport.getStatus() === "connected") return;
    ensureTransportConnected(api, transportCfg).catch((err) => {
      api.logger.warn(
        "AgenticROS transport poll-reconnect failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    });
  }

  // Connect eagerly; on failure retry every 10s
  ensureTransportConnected(api, transportCfg).catch((err) => {
    api.logger.warn("AgenticROS eager transport connect failed: " + (err instanceof Error ? err.message : String(err)));
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(tryConnect, RETRY_INTERVAL_MS);
  });

  // Every 15s, if disconnected (or session dropped), try to connect so we recover without restart
  pollInterval = setInterval(pollWhenDisconnected, DISCONNECTED_POLL_MS);
}

/**
 * Re-read config from file and try to connect the transport. Use from teleop "Reconnect" so the user
 * can connect after starting the Zenoh router without restarting the gateway.
 */
export async function tryReconnectFromFile(api: OpenClawPluginApi): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = readAgenticROSConfigFromFile();
    const transportCfg = getTransportConfig(config);
    if (transportCfg.mode === "zenoh") {
      const endpoint = (transportCfg.zenoh?.routerEndpoint ?? "").trim();
      if (!endpoint) {
        return { ok: false, error: "Zenoh router endpoint is empty. Set zenoh.routerEndpoint in config (e.g. ws://localhost:10000)." };
      }
      if (!/^wss?:\/\//i.test(endpoint)) {
        return { ok: false, error: `Zenoh endpoint must be a WebSocket URL (ws:// or wss://). Got: "${endpoint}". Use e.g. ws://localhost:10000.` };
      }
      try {
        new URL(endpoint);
      } catch {
        return { ok: false, error: `Invalid Zenoh URL: "${endpoint}". Use e.g. ws://localhost:10000.` };
      }
    }
    await ensureTransportConnected(api, transportCfg);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    api.logger.warn("AgenticROS tryReconnectFromFile failed: " + msg);
    return { ok: false, error: msg };
  }
}
