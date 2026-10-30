import type { SynapseConfig, MemoryProvider } from "@corebrum/core";
import { createMemory } from "@corebrum/core";
import type { PluginLogger } from "./plugin-api.js";

let provider: MemoryProvider | null = null;
let initStarted = false;
let initError: string | null = null;

/**
 * Initialize the memory provider for the OpenClaw plugin.
 *
 * Called once during plugin registration. The provider is held as a module
 * singleton and looked up by the memory tools.
 */
export async function initMemory(
  config: SynapseConfig,
  logger: PluginLogger,
): Promise<MemoryProvider | null> {
  if (initStarted) return provider;
  initStarted = true;
  if (!config.memory?.enabled) {
    logger.info("Corebrum Synapse: memory disabled (config.memory.enabled=false)");
    return null;
  }
  try {
    provider = await createMemory(config);
    if (provider) {
      logger.info(`Corebrum Synapse: memory backend=${provider.backend} ready`);
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    logger.error("Corebrum Synapse: memory init failed: " + initError);
    provider = null;
  }
  return provider;
}

export function getMemory(): MemoryProvider | null {
  return provider;
}

export function getMemoryInitError(): string | null {
  return initError;
}
