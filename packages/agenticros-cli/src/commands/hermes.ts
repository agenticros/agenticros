/**
 * `agenticros hermes` — configure Hermes Agent to use the AgenticROS MCP server.
 */

import { execa } from "execa";

import {
  globalHermesConfigPath,
  readHermesAgenticrosConfig,
  validateHermesAgenticrosConfig,
  writeHermesAgenticrosConfig,
} from "../util/hermes-config.js";
import { findMcpEntry } from "../util/mcp-discovery.js";
import { colors, header, info, ok, warn, err } from "../util/logger.js";

export interface HermesSetupOptions {
  /** Suppress the section header (e.g. when called from `agenticros init`). */
  quiet?: boolean;
}

export interface HermesDoctorOptions {
  json?: boolean;
}

export async function hermesOnPath(): Promise<boolean> {
  try {
    const { exitCode } = await execa("hermes", ["--version"], { reject: false });
    return exitCode === 0;
  } catch {
    try {
      const { exitCode } = await execa("hermes", ["--help"], { reject: false });
      return exitCode === 0;
    } catch {
      return false;
    }
  }
}

export async function hermesSetupCommand(opts: HermesSetupOptions = {}): Promise<void> {
  if (!opts.quiet) {
    header("Configure Hermes MCP");
  }

  const mcpEntry = findMcpEntry();
  if (!mcpEntry) {
    err("AgenticROS MCP server is not built.");
    info("Run `pnpm --filter @agenticros/claude-code build` or `agenticros init` first.");
    process.exit(1);
  }

  const configPath = globalHermesConfigPath();
  writeHermesAgenticrosConfig(configPath, mcpEntry, { namespace: "" });

  ok(`Wrote Hermes MCP config: ${configPath}`);
  info(`MCP server: ${mcpEntry}`);

  const hasHermes = await hermesOnPath();
  if (hasHermes) {
    info(
      "Hermes CLI detected. Reload MCP with `/reload-mcp` in Hermes, or run `hermes mcp test agenticros`.",
    );
  } else {
    warn("Hermes CLI not found on PATH.");
    info("Install from https://github.com/NousResearch/hermes-agent then run `/reload-mcp`.");
  }
}

export async function hermesDoctorCommand(opts: HermesDoctorOptions = {}): Promise<number> {
  const mcpEntry = findMcpEntry();
  const configPath = globalHermesConfigPath();
  const cfg = readHermesAgenticrosConfig(configPath);
  const validation = validateHermesAgenticrosConfig(cfg, mcpEntry);

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify({ configPath, cfg, validation, mcpEntry }, null, 2)}\n`,
    );
    const anyRed = validation.issues.some((i) => i.severity === "red");
    return anyRed || !cfg.exists ? 1 : 0;
  }

  header("Hermes MCP doctor");
  if (!mcpEntry) {
    err("MCP server not built.");
    return 1;
  }
  info(`Expected MCP entry: ${mcpEntry}\n`);

  process.stdout.write(`${colors.bold("global")} (${configPath})\n`);
  if (!cfg.exists) {
    process.stdout.write(`  ${colors.yellow("○")} Config file not present\n`);
    process.stdout.write(`     ${colors.dim("→ Run `agenticros hermes setup`")}\n`);
    return 1;
  }

  if (validation.ok) {
    process.stdout.write(`  ${colors.green("✓")} agenticros MCP configured correctly\n`);
    return 0;
  }

  let exitCode = 0;
  for (const issue of validation.issues) {
    const icon = issue.severity === "red" ? colors.red("✗") : colors.yellow("○");
    process.stdout.write(`  ${icon} ${issue.message}\n`);
    if (issue.hint) {
      process.stdout.write(`     ${colors.dim("→ " + issue.hint)}\n`);
    }
    if (issue.severity === "red") exitCode = 1;
  }

  return exitCode;
}
