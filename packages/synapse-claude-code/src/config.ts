import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { SynapseConfig } from "@corebrum/core";
import { parseConfig, withResolvedSkillRefs, applyCachedSkillRefs } from "@corebrum/core";

/**
 * Optional MCP / process env override: set `robot.namespace` without editing JSON.
 * Useful in `claude_desktop_config.json` or `.mcp.json` under `env`.
 * Must match the robot’s ROS namespace exactly (often no dashes in the UUID segment).
 */
function applyMcpEnvOverrides(config: SynapseConfig): SynapseConfig {
  const ns = process.env.SYNAPSE_ROBOT_NAMESPACE?.trim();
  if (!ns) return config;
  return {
    ...config,
    robot: {
      ...config.robot,
      namespace: ns,
    },
  };
}

/**
 * Resolve path to Corebrum Synapse config file.
 * Prefer SYNAPSE_CONFIG_PATH; else ~/.synapse/config.json.
 * Optional: fallback to OpenClaw config and read plugins.entries.synapse.config.
 */
function getConfigPath(): string {
  const env = process.env.SYNAPSE_CONFIG_PATH;
  if (env && env.trim().length > 0) {
    return path.resolve(env);
  }
  return path.join(os.homedir(), ".synapse", "config.json");
}

/**
 * Try to read config from OpenClaw file (plugins.entries.synapse.config).
 */
function tryOpenClawConfig(): Record<string, unknown> | null {
  const openclawEnv = process.env.OPENCLAW_CONFIG;
  const openclawPath = openclawEnv && openclawEnv.trim().length > 0
    ? path.resolve(openclawEnv)
    : path.join(os.homedir(), ".openclaw", "openclaw.json");
  try {
    const raw = fs.readFileSync(openclawPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = parsed?.plugins && typeof (parsed.plugins as Record<string, unknown>).entries === "object"
      ? (parsed.plugins as Record<string, unknown>).entries as Record<string, unknown>
      : null;
    const synapse = entries?.synapse && typeof entries.synapse === "object"
      ? entries.synapse as Record<string, unknown>
      : null;
    const config = synapse?.config;
    if (config !== null && typeof config === "object") {
      return config as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

function loadConfigSync(): SynapseConfig {
  const primaryPath = getConfigPath();
  try {
    const raw = fs.readFileSync(primaryPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object") {
      const cfg = parseConfig(parsed as Record<string, unknown>);
      if (process.stderr && typeof process.stderr.write === "function") {
        process.stderr.write(`[Corebrum Synapse] Config from ${primaryPath}\n`);
      }
      return applyMcpEnvOverrides(applyCachedSkillRefs(cfg));
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      const openclawConfig = tryOpenClawConfig();
      if (openclawConfig) {
        return applyMcpEnvOverrides(applyCachedSkillRefs(parseConfig(openclawConfig)));
      }
      throw new Error(
        `Corebrum Synapse config not found at ${primaryPath}. Create it or set SYNAPSE_CONFIG_PATH. ` +
        "See README for an example config.",
      );
    }
    throw err;
  }
  return applyMcpEnvOverrides(applyCachedSkillRefs(parseConfig({})));
}

/**
 * Load and parse Corebrum Synapse config (sync). Merges already-cached skillRefs into skillPaths.
 */
export function loadConfig(): SynapseConfig {
  return loadConfigSync();
}

/**
 * Load config and auto-fetch any missing skillRefs into the skills-cache (network).
 */
export async function loadConfigAsync(): Promise<SynapseConfig> {
  const base = loadConfigSync();
  if (!(base.skillRefs?.length)) return base;
  const { config, errors } = await withResolvedSkillRefs(base, {
    onLog: (msg) => {
      if (process.stderr && typeof process.stderr.write === "function") {
        process.stderr.write(`[Corebrum Synapse] ${msg}\n`);
      }
    },
  });
  for (const e of errors) {
    if (process.stderr && typeof process.stderr.write === "function") {
      process.stderr.write(`[Corebrum Synapse] skillRef ${e.ref}: ${e.error}\n`);
    }
  }
  return applyMcpEnvOverrides(config);
}
