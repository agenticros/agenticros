import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { AgenticROSConfig } from "@agenticros/core";
import { parseConfig } from "@agenticros/core";

/**
 * Optional MCP / process env override: set `robot.namespace` without editing JSON.
 * Useful in `claude_desktop_config.json` or `.mcp.json` under `env`.
 * Must match the robot’s ROS namespace exactly (often no dashes in the UUID segment).
 */
function applyMcpEnvOverrides(config: AgenticROSConfig): AgenticROSConfig {
  const ns = process.env.AGENTICROS_ROBOT_NAMESPACE?.trim();
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
 * Resolve path to AgenticROS config file.
 * Prefer AGENTICROS_CONFIG_PATH; else ~/.agenticros/config.json.
 * Optional: fallback to OpenClaw config and read plugins.entries.agenticros.config.
 */
function getConfigPath(): string {
  const env = process.env.AGENTICROS_CONFIG_PATH;
  if (env && env.trim().length > 0) {
    return path.resolve(env);
  }
  return path.join(os.homedir(), ".agenticros", "config.json");
}

/**
 * Try to read config from OpenClaw file (plugins.entries.agenticros.config).
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
    const agenticros = entries?.agenticros && typeof entries.agenticros === "object"
      ? entries.agenticros as Record<string, unknown>
      : null;
    const config = agenticros?.config;
    if (config !== null && typeof config === "object") {
      return config as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Load and parse AgenticROS config.
 * 1) AGENTICROS_CONFIG_PATH or ~/.agenticros/config.json (full JSON object = config).
 * 2) If that file does not exist, try OpenClaw config and read plugins.entries.agenticros.config.
 */
export function loadConfig(): AgenticROSConfig {
  const primaryPath = getConfigPath();
  try {
    const raw = fs.readFileSync(primaryPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object") {
      const cfg = parseConfig(parsed as Record<string, unknown>);
      if (process.stderr && typeof process.stderr.write === "function") {
        process.stderr.write(`[AgenticROS] Config from ${primaryPath}\n`);
      }
      return applyMcpEnvOverrides(cfg);
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      const openclawConfig = tryOpenClawConfig();
      if (openclawConfig) {
        return applyMcpEnvOverrides(parseConfig(openclawConfig));
      }
      throw new Error(
        `AgenticROS config not found at ${primaryPath}. Create it or set AGENTICROS_CONFIG_PATH. ` +
        "See README for an example config.",
      );
    }
    throw err;
  }
  return applyMcpEnvOverrides(parseConfig({}));
}
