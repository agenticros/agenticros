import type { TransportConfig } from "@agenticros/core";
import type { RosTransport } from "@agenticros/core";
import { createTransport, getTransportConfig } from "@agenticros/core";
import type { OpenClawPluginApi } from "./plugin-api.js";
import type { PluginLogger } from "./plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";

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
 * Register the ROS2 transport as an OpenClaw managed service.
 */
export function registerService(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const transportCfg = getTransportConfig(config);

  api.registerService({
    id: "ros2-transport",

    async start(_ctx) {
      api.logger.info(`Connecting to ROS2 via ${transportCfg.mode} transport...`);

      transport = await createTransport(transportCfg);

      transport.onConnection((status: string) => {
        api.logger.info(`ROS2 transport status: ${status}`);
      });

      await transport.connect();
      currentMode = transportCfg.mode;
      api.logger.info(`ROS2 transport connected (mode: ${transportCfg.mode})`);
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
}
