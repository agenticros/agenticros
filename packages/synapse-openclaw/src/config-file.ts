import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { SynapseConfig } from "@corebrum/core";
import { parseConfig } from "@corebrum/core";

/**
 * Resolve the OpenClaw config file path.
 * Same convention as scripts/configure_synapse.sh: OPENCLAW_CONFIG or ~/.openclaw/openclaw.json
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
 * Ensure plugins.entries.synapse exists in the config object (mutates in place).
 */
function ensureSynapseEntry(full: Record<string, unknown>): void {
  if (!full.plugins || typeof full.plugins !== "object") {
    full.plugins = {};
  }
  const plugins = full.plugins as Record<string, unknown>;
  if (!plugins.entries || typeof plugins.entries !== "object") {
    plugins.entries = {};
  }
  const entries = plugins.entries as Record<string, unknown>;
  if (!entries.synapse || typeof entries.synapse !== "object") {
    entries.synapse = {};
  }
}

/**
 * Write Corebrum Synapse plugin config into the OpenClaw config file.
 * Reads the file, sets plugins.entries.synapse.config, writes back.
 * @throws ConfigFileError on read/write errors
 */
export function writeSynapseConfig(pluginConfig: Record<string, unknown>): void {
  const configPath = getOpenClawConfigPath();
  const full = readOpenClawConfig();
  ensureSynapseEntry(full);
  const plugins = full.plugins as Record<string, unknown>;
  const entries = plugins.entries as Record<string, unknown>;
  const synapseEntry = entries.synapse as Record<string, unknown>;
  synapseEntry.config = pluginConfig;

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

/** Path the CLI / MCP already use: `$SYNAPSE_CONFIG_PATH` or `~/.synapse/config.json`. */
export function synapseHomeConfigPath(): string {
  const env = process.env.SYNAPSE_CONFIG_PATH;
  if (env && env.trim().length > 0) {
    return path.resolve(env);
  }
  return path.join(os.homedir(), ".synapse", "config.json");
}

function tryReadJsonObject(filePath: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // missing / unreadable / invalid — caller falls through
  }
  return null;
}

function pluginConfigFromOpenClawFile(): Record<string, unknown> {
  const full = readOpenClawConfig();
  const plugins = full.plugins as Record<string, unknown> | undefined;
  const entries = plugins?.entries as Record<string, unknown> | undefined;
  const synapseEntry = entries?.synapse as Record<string, unknown> | undefined;
  const raw = synapseEntry?.config;
  return raw && typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

/**
 * Read Corebrum Synapse config the same way MCP / `synapse up` do:
 *   1. `$SYNAPSE_CONFIG_PATH` or `~/.synapse/config.json` (mode profiles)
 *   2. `plugins.entries.synapse.config` in the OpenClaw config file
 *
 * Empty OpenClaw plugin config used to win and default `transport.mode` to
 * `local`, which breaks OpenClaw on Node 22+ (rclnodejs) even after the CLI
 * switched the sim profile to rosbridge.
 *
 * Preserves webrtc.robotKey from the OpenClaw plugin slice if set.
 */
export function readSynapseConfigFromFile(): SynapseConfig {
  const homePath = synapseHomeConfigPath();
  const fromHome = tryReadJsonObject(homePath);
  let obj: Record<string, unknown>;
  let openclawSlice: Record<string, unknown> = {};
  if (fromHome) {
    obj = fromHome;
    try {
      openclawSlice = pluginConfigFromOpenClawFile();
    } catch {
      openclawSlice = {};
    }
  } else {
    openclawSlice = pluginConfigFromOpenClawFile();
    obj = openclawSlice;
  }
  const parsed = parseConfig(obj);
  const existingKey = (openclawSlice.webrtc as Record<string, unknown> | undefined)?.robotKey;
  if (typeof existingKey === "string" && existingKey.length > 0) {
    parsed.webrtc.robotKey = existingKey;
  }
  return parsed;
}
