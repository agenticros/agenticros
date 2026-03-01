import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Resolve the OpenClaw config file path.
 * Same convention as scripts/configure_agenticros.sh: OPENCLAW_CONFIG or ~/.openclaw/openclaw.json
 */
export function getOpenClawConfigPath(): string {
  const env = process.env.OPENCLAW_CONFIG;
  if (env && env.length > 0) {
    return path.resolve(env);
  }
  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

export class ConfigFileError extends Error {
  constructor(
    message: string,
    public readonly code?: "ENOENT" | "EACCES" | "INVALID_JSON",
  ) {
    super(message);
    this.name = "ConfigFileError";
  }
}

/**
 * Read and parse the full OpenClaw config file.
 * @throws ConfigFileError if file is missing or invalid JSON
 */
export function readOpenClawConfig(): Record<string, unknown> {
  const configPath = getOpenClawConfigPath();
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      throw new ConfigFileError(
        `Config file not found: ${configPath}. Create it by running OpenClaw configure once, or set OPENCLAW_CONFIG.`,
        "ENOENT",
      );
    }
    if (nodeErr.code === "EACCES") {
      throw new ConfigFileError(
        `Cannot read config file: ${configPath}. Check permissions.`,
        "EACCES",
      );
    }
    throw new ConfigFileError(
      nodeErr.message ?? "Failed to read config file",
      "EACCES",
    );
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new ConfigFileError("Config file is not valid JSON.", "INVALID_JSON");
  }
  throw new ConfigFileError("Config file is not valid JSON.", "INVALID_JSON");
}

/**
 * Ensure plugins.entries.agenticros exists in the config object (mutates in place).
 */
function ensureAgenticROSEntry(full: Record<string, unknown>): void {
  if (!full.plugins || typeof full.plugins !== "object") {
    full.plugins = {};
  }
  const plugins = full.plugins as Record<string, unknown>;
  if (!plugins.entries || typeof plugins.entries !== "object") {
    plugins.entries = {};
  }
  const entries = plugins.entries as Record<string, unknown>;
  if (!entries.agenticros || typeof entries.agenticros !== "object") {
    entries.agenticros = {};
  }
}

/**
 * Write AgenticROS plugin config into the OpenClaw config file.
 * Reads the file, sets plugins.entries.agenticros.config, writes back.
 * @throws ConfigFileError on read/write errors
 */
export function writeAgenticROSConfig(pluginConfig: Record<string, unknown>): void {
  const configPath = getOpenClawConfigPath();
  const full = readOpenClawConfig();
  ensureAgenticROSEntry(full);
  const plugins = full.plugins as Record<string, unknown>;
  const entries = plugins.entries as Record<string, unknown>;
  const agenticrosEntry = entries.agenticros as Record<string, unknown>;
  agenticrosEntry.config = pluginConfig;

  try {
    fs.writeFileSync(configPath, JSON.stringify(full, null, 2), "utf8");
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "EACCES" || nodeErr.code === "EPERM") {
      throw new ConfigFileError(
        `Cannot write config file: ${configPath}. Check permissions.`,
        "EACCES",
      );
    }
    throw new ConfigFileError(
      nodeErr.message ?? "Failed to write config file",
      "EACCES",
    );
  }
}
