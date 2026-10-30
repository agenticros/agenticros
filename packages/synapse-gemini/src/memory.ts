import type { SynapseConfig, MemoryProvider } from "@corebrum/core";
import { createMemory } from "@corebrum/core";

let provider: MemoryProvider | null = null;
let initialized = false;

/**
 * Lazy-initialize the memory provider from config.
 *
 * Gemini CLI is one-shot (each `synapse-gemini "..."` invocation is a fresh
 * process), so this is effectively per-invocation. We still cache so the
 * `buildGeminiTools` and `executeTool` paths don't double-load it.
 */
export async function ensureMemory(
  config: SynapseConfig,
): Promise<MemoryProvider | null> {
  if (initialized) return provider;
  initialized = true;
  try {
    provider = await createMemory(config);
  } catch (err) {
    process.stderr?.write(
      `[Corebrum Synapse] memory: init failed — ${err instanceof Error ? err.message : String(err)}\n`,
    );
    provider = null;
  }
  return provider;
}

export function getMemory(): MemoryProvider | null {
  return provider;
}
