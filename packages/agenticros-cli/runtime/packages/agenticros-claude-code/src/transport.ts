import type { RosTransport } from "@agenticros/core";
import { createTransport, getTransportConfig } from "@agenticros/core";
import type { AgenticROSConfig } from "@agenticros/core";

let transport: RosTransport | null = null;

/**
 * Get the active transport. Throws if not connected.
 */
export function getTransport(): RosTransport {
  if (!transport) {
    throw new Error("Transport not initialized. Ensure config is loaded and connect() has been called.");
  }
  return transport;
}

export function getTransportOrNull(): RosTransport | null {
  return transport;
}

const CONNECT_TIMEOUT_MS = 15_000;

/**
 * Create and connect the transport. Idempotent.
 * Fails after CONNECT_TIMEOUT_MS if Zenoh/router is unreachable.
 */
export async function connect(config: AgenticROSConfig): Promise<void> {
  if (transport && transport.getStatus() === "connected") {
    return;
  }
  if (transport) {
    await transport.disconnect();
    transport = null;
  }
  const transportCfg = getTransportConfig(config);
  const newTransport = await createTransport(transportCfg);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(
        `Transport connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s. ` +
        "Is zenohd running? (e.g. ws://localhost:10000). Check config and MCP log.",
      )),
      CONNECT_TIMEOUT_MS,
    );
  });
  await Promise.race([newTransport.connect(), timeoutPromise]);
  transport = newTransport;
}

/**
 * Disconnect and clear the transport. Call on process exit.
 */
export async function disconnect(): Promise<void> {
  if (transport) {
    await transport.disconnect();
    transport = null;
  }
}
