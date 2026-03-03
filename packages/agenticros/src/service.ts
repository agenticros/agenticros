import type { TransportConfig } from "@agenticros/core";
import type { RosTransport } from "@agenticros/core";
import { createTransport, getTransportConfig } from "@agenticros/core";
import type { OpenClawPluginApi } from "./plugin-api.js";
import type { PluginLogger } from "./plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { readAgenticROSConfigFromFile } from "./config-file.js";

/** Shared transport instance for all tools. */
let transport: RosTransport | null = null;

/** Tracks the active transport mode. */
let currentMode: TransportConfig["mode"] | null = null;

/** Concurrency guard — prevents overlapping switchTransport calls. */
let switching = false;

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
 * Connect the transport (create + connect). Idempotent: if already connected, no-op.
 */
async function ensureTransportConnected(
  api: OpenClawPluginApi,
  transportCfg: TransportConfig,
): Promise<void> {
  if (transport && transport.getStatus() === "connected") {
    return;
  }
  if (transport) {
    await transport.disconnect();
    transport = null;
    currentMode = null;
  }
  api.logger.info(`Connecting to ROS2 via ${transportCfg.mode} transport...`);
  const newTransport = await createTransport(transportCfg);
  newTransport.onConnection((status: string) => {
    api.logger.info(`ROS2 transport status: ${status}`);
  });
  await newTransport.connect();
  transport = newTransport;
  currentMode = transportCfg.mode;
  api.logger.info(`ROS2 transport connected (mode: ${transportCfg.mode})`);
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

  api.registerService({
    id: "ros2-transport",

    async start(_ctx) {
      await ensureTransportConnected(api, transportCfg);
    },

    async stop(_ctx) {
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
        setTimeout(tryConnect, RETRY_INTERVAL_MS);
      });
  }

  // When we have a transport but it's disconnected (e.g. Zenoh session dropped), reconnect
  function pollWhenDisconnected(): void {
    if (transport && transport.getStatus() !== "connected") {
      transport = null;
      currentMode = null;
      tryConnect();
    } else if (!transport) {
      tryConnect();
    }
  }

  // Connect eagerly; on failure retry every 10s
  ensureTransportConnected(api, transportCfg).catch((err) => {
    api.logger.warn("AgenticROS eager transport connect failed: " + (err instanceof Error ? err.message : String(err)));
    setTimeout(tryConnect, RETRY_INTERVAL_MS);
  });

  // Every 15s, if disconnected (or session dropped), try to connect so we recover without restart
  setInterval(pollWhenDisconnected, DISCONNECTED_POLL_MS);
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
