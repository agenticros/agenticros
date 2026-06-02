import type { AgenticROSConfig, MemoryProvider } from "@agenticros/core";
import { createMemory } from "@agenticros/core";

let provider: MemoryProvider | null = null;
let initialized = false;
let initError: string | null = null;

/**
 * Lazy-initialize the memory provider from current config.
 *
 * Called by the MCP request handler before each tool call so config edits
 * (toggling memory.enabled, switching backend) take effect without
 * restarting the Claude Code MCP server.
 */
export async function ensureMemory(
  config: AgenticROSConfig,
): Promise<MemoryProvider | null> {
  if (initialized) return provider;
  initialized = true;
  try {
    provider = await createMemory(config);
    if (provider) {
      process.stderr?.write(
        `[AgenticROS] memory: ${provider.backend} backend ready (namespace defaults to robot.namespace)\n`,
      );
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    process.stderr?.write(`[AgenticROS] memory: init failed — ${initError}\n`);
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

/**
 * Force re-initialization on next ensureMemory() call.
 * Used by the request handler when config.memory has changed.
 */
export function resetMemory(): void {
  provider = null;
  initialized = false;
  initError = null;
}
