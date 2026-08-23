import { homedir } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgenticROSConfig, HiveClient } from "@agenticros/core";
import { createHiveClient, mergeHiveConfig, parseConfig } from "@agenticros/core";

let client: HiveClient | null = null;
let initialized = false;

function configPath(): string {
  const env = process.env.AGENTICROS_CONFIG_PATH?.trim();
  if (env) return env;
  return join(homedir(), ".agenticros", "config.json");
}

function readRaw(): Record<string, unknown> {
  const path = configPath();
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
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
  const next = mergeHiveConfig(readRaw(), patch);
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  return parseConfig(next);
}

export async function ensureHive(config: AgenticROSConfig): Promise<HiveClient | null> {
  if (initialized) return client;
  initialized = true;
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
      process.stderr?.write("[AgenticROS] hive: client ready\n");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr?.write(`[AgenticROS] hive: init failed — ${msg}\n`);
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

export function resetHive(): void {
  client = null;
  initialized = false;
}
