import type { AgenticROSConfig } from "../config.js";
import { HiveHttpClient, type HiveClientHooks, type HiveClientOverrides } from "./client.js";
import type { HiveClient } from "./types.js";

/**
 * Build a hive HTTP client, or `null` when hive is disabled.
 * Dynamic-import friendly: callers that never enable hive never construct this.
 */
export function createHiveClient(
  config: AgenticROSConfig,
  overrides?: HiveClientOverrides,
  hooks?: HiveClientHooks,
): HiveClient | null {
  if (!config.hive?.enabled) return null;
  return new HiveHttpClient(config, overrides ?? {}, hooks ?? {});
}

export function hiveRecipeOn(
  config: AgenticROSConfig,
  id: "detect" | "describe" | "health",
): boolean {
  return !!config.hive?.enabled && !!config.hive.recipes?.[id];
}
