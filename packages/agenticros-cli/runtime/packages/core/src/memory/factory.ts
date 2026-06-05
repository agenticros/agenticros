import type { AgenticROSConfig } from "../config.js";
import type { MemoryProvider } from "./types.js";

/**
 * Build a MemoryProvider from full config.
 *
 * Returns `null` when memory is disabled (`config.memory.enabled === false`),
 * so adapters can short-circuit registering memory tools.
 *
 * The mem0 backend is loaded via dynamic import — `mem0ai` is an optional peer
 * dependency. Users on `backend: "local"` never load it.
 */
export async function createMemory(
  config: AgenticROSConfig,
): Promise<MemoryProvider | null> {
  if (!config.memory?.enabled) return null;

  const backend = config.memory.backend;
  switch (backend) {
    case "local": {
      const { LocalMemoryProvider } = await import("./local/provider.js");
      return new LocalMemoryProvider({
        storePath: config.memory.local.storePath,
      });
    }

    case "mem0": {
      const { createMem0Provider } = await import("./mem0/provider.js");
      return await createMem0Provider({
        config: {
          inferOnWrite: config.memory.mem0.inferOnWrite,
          historyDbPath: config.memory.mem0.historyDbPath,
          embedder: config.memory.mem0.embedder,
          vectorStore: config.memory.mem0.vectorStore,
          llm: config.memory.mem0.llm,
        },
      });
    }

    default: {
      const _exhaustive: never = backend;
      throw new Error(`Unknown memory backend: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Resolve the effective namespace used by memory tools.
 * Argument > config.memory.namespace > config.robot.namespace.
 */
export function resolveMemoryNamespace(
  config: AgenticROSConfig,
  argNamespace?: string,
): string {
  return (
    (argNamespace && argNamespace.trim().length > 0 ? argNamespace : undefined) ??
    (config.memory?.namespace && config.memory.namespace.trim().length > 0
      ? config.memory.namespace
      : undefined) ??
    config.robot?.namespace ??
    ""
  );
}
