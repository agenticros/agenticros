/**
 * Read/write helpers for Hermes Agent MCP config (`~/.hermes/config.yaml`).
 *
 * Hermes stores MCP servers under `mcp_servers.<name>` in YAML. We only
 * manage the `agenticros` entry — other servers are preserved.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export interface HermesAgenticrosConfig {
  configPath: string;
  exists: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  connectTimeout?: number;
  timeout?: number;
  enabled?: boolean;
}

export interface HermesConfigIssue {
  severity: "red" | "yellow";
  message: string;
  hint?: string;
}

export interface HermesConfigValidation {
  ok: boolean;
  issues: HermesConfigIssue[];
}

const MCP_SERVERS_KEY = "mcp_servers:";
const AGENTICROS_KEY = "agenticros:";

/** Global Hermes config: `~/.hermes/config.yaml`. */
export function globalHermesConfigPath(): string {
  return join(homedir(), ".hermes", "config.yaml");
}

/**
 * Build the YAML block for the AgenticROS MCP server. Uses an absolute path
 * to index.js (required by Hermes stdio transport) and leaves namespace empty
 * so `~/.agenticros/config.json` / `agenticros mode` drives the active robot.
 */
export function buildAgenticrosMcpYamlBlock(mcpEntryAbs: string, namespace = ""): string {
  const escaped = mcpEntryAbs.replace(/\\/g, "\\\\");
  const nsYaml = namespace.replace(/"/g, '\\"');
  return `${MCP_SERVERS_KEY}
  ${AGENTICROS_KEY}
    command: "node"
    args: ["${escaped}"]
    env:
      AGENTICROS_ROBOT_NAMESPACE: "${nsYaml}"
    connect_timeout: 60
    timeout: 120
`;
}

/** Insert or replace the agenticros MCP block, preserving other YAML content. */
export function upsertAgenticrosBlock(existingContent: string | null, block: string): string {
  const trimmedBlock = block.trimEnd() + "\n";
  if (!existingContent?.trim()) {
    return trimmedBlock;
  }

  const lines = existingContent.split("\n");
  const mcpIdx = lines.findIndex((l) => l.trim() === MCP_SERVERS_KEY);
  if (mcpIdx < 0) {
    const sep = lines.length > 0 && lines[lines.length - 1]?.trim() !== "" ? "\n" : "";
    return lines.join("\n") + sep + trimmedBlock;
  }

  const agentIdx = findAgenticrosLineIndex(lines, mcpIdx);
  if (agentIdx < 0) {
    const insertAt = findMcpServersInsertPoint(lines, mcpIdx);
    const agentLines = trimmedBlock
      .split("\n")
      .slice(1)
      .filter((l) => l.trim().length > 0);
    const out = [...lines.slice(0, insertAt), ...agentLines, ...lines.slice(insertAt)];
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  const endIdx = findAgenticrosEndIndex(lines, agentIdx);
  const agentLines = trimmedBlock
    .split("\n")
    .slice(1)
    .filter((l) => l.startsWith("  "));
  const out = [...lines.slice(0, agentIdx), ...agentLines, ...lines.slice(endIdx)];
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Parse the agenticros MCP section from a Hermes config.yaml file. */
export function readHermesAgenticrosConfig(configPath: string): HermesAgenticrosConfig {
  const base: HermesAgenticrosConfig = { configPath, exists: existsSync(configPath) };
  if (!base.exists) return base;

  let content: string;
  try {
    content = readFileSync(configPath, "utf8");
  } catch {
    return base;
  }

  const lines = content.split("\n");
  const mcpIdx = lines.findIndex((l) => l.trim() === MCP_SERVERS_KEY);
  if (mcpIdx < 0) return base;

  const agentIdx = findAgenticrosLineIndex(lines, mcpIdx);
  if (agentIdx < 0) return base;

  const endIdx = findAgenticrosEndIndex(lines, agentIdx);
  const section = lines.slice(agentIdx, endIdx).join("\n");

  base.command = parseYamlString(section, "command");
  base.args = parseYamlStringArray(section, "args");
  base.env = parseYamlEnvBlock(section);
  base.connectTimeout = parseYamlNumber(section, "connect_timeout");
  base.timeout = parseYamlNumber(section, "timeout");
  base.enabled = parseYamlBoolean(section, "enabled");
  return base;
}

export function writeHermesAgenticrosConfig(
  configPath: string,
  mcpEntryAbs: string,
  options?: { namespace?: string },
): void {
  const abs = resolve(mcpEntryAbs);
  const block = buildAgenticrosMcpYamlBlock(abs, options?.namespace ?? "");
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  const merged = upsertAgenticrosBlock(existing, block);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, merged, "utf8");
}

/** Validate Hermes agenticros MCP config against expected MCP binary path. */
export function validateHermesAgenticrosConfig(
  cfg: HermesAgenticrosConfig,
  mcpEntryExpected?: string,
): HermesConfigValidation {
  const issues: HermesConfigIssue[] = [];

  if (!cfg.exists) {
    issues.push({
      severity: "yellow",
      message: `Hermes config missing (${cfg.configPath})`,
      hint: "Run `agenticros hermes setup` to register the AgenticROS MCP server.",
    });
    return { ok: false, issues };
  }

  if (!cfg.command && (!cfg.args || cfg.args.length === 0)) {
    issues.push({
      severity: "red",
      message: "Hermes mcp_servers.agenticros has no command or args",
      hint: "Run `agenticros hermes setup` to repair the entry.",
    });
  }

  const mcpPath = cfg.args?.[0];
  if (mcpPath && !isAbsolute(mcpPath)) {
    issues.push({
      severity: "red",
      message: "Hermes MCP path is relative — Hermes cwd is not the repo root",
      hint: "Run `agenticros hermes setup` to rewrite with an absolute path.",
    });
  }

  if (mcpEntryExpected && mcpPath) {
    const expected = resolve(mcpEntryExpected);
    const actual = resolve(mcpPath);
    if (actual !== expected && !existsSync(actual)) {
      issues.push({
        severity: "red",
        message: "Hermes MCP path does not point to a built server",
        hint: `Expected ${expected}. Run \`agenticros hermes setup\`.`,
      });
    } else if (actual !== expected) {
      issues.push({
        severity: "yellow",
        message: "Hermes MCP path differs from the CLI-resolved MCP entry",
        hint: `CLI expects ${expected}. Run \`agenticros hermes setup\` to sync.`,
      });
    }
  } else if (mcpEntryExpected && !mcpPath) {
    issues.push({
      severity: "yellow",
      message: "Could not parse MCP server path from Hermes config",
      hint: "Run `agenticros hermes setup` to rewrite the entry.",
    });
  }

  const ns = (cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"] ?? "").trim();
  if (ns.length > 0) {
    issues.push({
      severity: "yellow",
      message: `Hermes AGENTICROS_ROBOT_NAMESPACE is hardcoded ('${ns}')`,
      hint:
        'Leave it empty in ~/.hermes/config.yaml so `agenticros mode real|sim` drives the namespace (same as Codex).',
    });
  }

  if (cfg.enabled === false) {
    issues.push({
      severity: "yellow",
      message: "Hermes agenticros MCP server is disabled (enabled: false)",
      hint: "Remove enabled: false or re-run `agenticros hermes setup`.",
    });
  }

  const hasRed = issues.some((i) => i.severity === "red");
  return { ok: !hasRed && issues.length === 0, issues };
}

/** Doctor check entries for Hermes MCP config (used by `agenticros doctor`). */
export function buildHermesDoctorChecks(
  mcpEntryExpected: string | undefined,
): Array<{ id: string; label: string; severity: "green" | "yellow" | "red"; hint?: string; detail?: string }> {
  const checks: Array<{
    id: string;
    label: string;
    severity: "green" | "yellow" | "red";
    hint?: string;
    detail?: string;
  }> = [];

  const configPath = globalHermesConfigPath();
  const cfg = readHermesAgenticrosConfig(configPath);
  if (!cfg.exists) {
    checks.push({
      id: "hermes-config",
      label: "Hermes MCP config missing (~/.hermes/config.yaml)",
      severity: "yellow",
      hint: "Run `agenticros hermes setup` to register the AgenticROS MCP server.",
    });
    return checks;
  }

  const v = validateHermesAgenticrosConfig(cfg, mcpEntryExpected);
  if (v.ok) {
    checks.push({
      id: "hermes-config",
      label: "Hermes MCP config OK",
      severity: "green",
      detail: configPath,
    });
  } else {
    const worst = v.issues.some((i) => i.severity === "red") ? "red" : "yellow";
    const first = v.issues[0]!;
    checks.push({
      id: "hermes-config",
      label: `Hermes MCP: ${first.message}`,
      severity: worst,
      hint: first.hint ?? "Run `agenticros hermes setup`.",
    });
  }

  return checks;
}

function findAgenticrosLineIndex(lines: string[], mcpIdx: number): number {
  for (let i = mcpIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? "";
    if (/^\S/.test(lines[i] ?? "") && trimmed !== MCP_SERVERS_KEY) break;
    if (trimmed === AGENTICROS_KEY) return i;
  }
  return -1;
}

function findMcpServersInsertPoint(lines: string[], mcpIdx: number): number {
  let insertAt = mcpIdx + 1;
  for (let i = mcpIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\S/.test(line) && line.trim() !== MCP_SERVERS_KEY) break;
    if (/^  \S/.test(line)) insertAt = i + 1;
  }
  return insertAt;
}

function findAgenticrosEndIndex(lines: string[], agentIdx: number): number {
  for (let i = agentIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^  \S/.test(line) && !line.startsWith("    ") && line.trim() !== AGENTICROS_KEY) {
      return i;
    }
    if (/^\S/.test(line)) return i;
  }
  return lines.length;
}

function parseYamlString(section: string, key: string): string | undefined {
  const re = new RegExp(`^\\s*${key}:\\s*"([^"]*)"`, "m");
  const m = section.match(re);
  return m?.[1];
}

function parseYamlBoolean(section: string, key: string): boolean | undefined {
  const re = new RegExp(`^\\s*${key}:\\s*(true|false)`, "m");
  const m = section.match(re);
  if (!m) return undefined;
  return m[1] === "true";
}

function parseYamlNumber(section: string, key: string): number | undefined {
  const re = new RegExp(`^\\s*${key}:\\s*(\\d+)`, "m");
  const m = section.match(re);
  if (!m) return undefined;
  return Number(m[1]);
}

function parseYamlStringArray(section: string, key: string): string[] | undefined {
  const inline = section.match(new RegExp(`^\\s*${key}:\\s*\\[([^\\]]*)\\]`, "m"));
  if (inline?.[1]) {
    return [...inline[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
      m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    );
  }
  return undefined;
}

function parseYamlEnvBlock(section: string): Record<string, string> {
  const env: Record<string, string> = {};
  const envMatch = section.match(/^(\s*)env:\s*$/m);
  if (!envMatch) return env;
  const baseIndent = envMatch[1]?.length ?? 0;
  const envKeyIndent = baseIndent + 2;
  for (const line of section.split("\n")) {
    const m = line.match(new RegExp(`^\\s{${envKeyIndent}}([A-Z0-9_]+):\\s*"([^"]*)"`));
    if (m) env[m[1]!] = m[2]!;
  }
  return env;
}
