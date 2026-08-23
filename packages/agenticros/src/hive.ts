import { homedir } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgenticROSConfig, HiveClient } from "@agenticros/core";
import { createHiveClient, mergeHiveConfig, parseConfig } from "@agenticros/core";
import type { PluginLogger } from "./plugin-api.js";

let client: HiveClient | null = null;
let initStarted = false;
let initError: string | null = null;

function agenticrosConfigPath(): string {
  const env = process.env.AGENTICROS_CONFIG_PATH?.trim();
  if (env) return env;
  return join(homedir(), ".agenticros", "config.json");
}

function readRawConfig(): Record<string, unknown> {
  const path = agenticrosConfigPath();
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fallthrough */
  }
  return {};
}

export function persistHivePatch(patch: {
  enabled?: boolean;
  url?: string;
  identityId?: string;
  hiveId?: string;
  recipes?: { detect?: boolean; describe?: boolean; health?: boolean };
}): AgenticROSConfig {
  const next = mergeHiveConfig(readRawConfig(), patch);
  const path = agenticrosConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  return parseConfig(next);
}

export async function initHive(
  config: AgenticROSConfig,
  logger: PluginLogger,
): Promise<HiveClient | null> {
  if (initStarted) return client;
  initStarted = true;
  if (!config.hive?.enabled) {
    logger.info("AgenticROS: hive disabled (config.hive.enabled=false)");
    return null;
  }
  try {
    client = createHiveClient(config, {}, {
      persist: (ids) => {
        persistHivePatch({ identityId: ids.identityId, hiveId: ids.hiveId });
      },
      persistRecipes: (recipes) => {
        persistHivePatch({ recipes });
      },
    });
    if (client) {
      logger.info("AgenticROS: fleet hive client ready");
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    logger.error("AgenticROS: hive init failed: " + initError);
    client = null;
  }
  return client;
}

export function getHive(): HiveClient | null {
  return client;
}

export function setHive(next: HiveClient | null): void {
  client = next;
}

export function getHiveInitError(): string | null {
  return initError;
}
