/**
 * Read/write helpers for OpenAI Codex CLI MCP config (`config.toml`).
 *
 * Codex stores MCP servers under `[mcp_servers.<name>]` in either
 * `~/.codex/config.toml` (global) or `<project>/.codex/config.toml` (project).
 * We only manage the `agenticros` entry — other servers are preserved.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type CodexConfigScope = "global" | "project";

export interface CodexAgenticrosConfig {
  configPath: string;
  exists: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface CodexConfigIssue {
  severity: "red" | "yellow";
  message: string;
  hint?: string;
}

export interface CodexConfigValidation {
  ok: boolean;
  issues: CodexConfigIssue[];
}

const AGENTICROS_BLOCK_START = "[mcp_servers.agenticros]";
const AGENTICROS_ENV_BLOCK = "[mcp_servers.agenticros.env]";

/** Global Codex config: `~/.codex/config.toml`. */
export function globalCodexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

/** Project-scoped Codex config: `<cwd>/.codex/config.toml`. */
export function projectCodexConfigPath(cwd = process.cwd()): string {
  return join(cwd, ".codex", "config.toml");
}

export function resolveCodexConfigPath(scope: CodexConfigScope, cwd = process.cwd()): string {
  return scope === "global" ? globalCodexConfigPath() : projectCodexConfigPath(cwd);
}

/**
 * Build the TOML block for the AgenticROS MCP server. Uses an absolute path
 * to index.js (required by Codex) and leaves namespace empty so
 * `~/.agenticros/config.json` / `agenticros mode` drives the active robot.
 */
export function buildAgenticrosMcpTomlBlock(mcpEntryAbs: string, namespace = ""): string {
  const escaped = mcpEntryAbs.replace(/\\/g, "\\\\");
  const shellCmd = `node ${escaped} 2>>/tmp/agenticros-mcp.log`;
  const nsValue = namespace.replace(/"/g, '\\"');
  return `${AGENTICROS_BLOCK_START}
command = "sh"
args = ["-c", "${shellCmd.replace(/"/g, '\\"')}"]
enabled = true
startup_timeout_sec = 30

${AGENTICROS_ENV_BLOCK}
AGENTICROS_ROBOT_NAMESPACE = "${nsValue}"
`;
}

/** Insert or replace the agenticros MCP block, preserving other TOML content. */
export function upsertAgenticrosBlock(existingContent: string | null, block: string): string {
  const trimmedBlock = block.trimEnd() + "\n";
  if (!existingContent?.trim()) {
    return trimmedBlock;
  }

  const lines = existingContent.split("\n");
  const out: string[] = [];
  let i = 0;
  let replaced = false;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === AGENTICROS_BLOCK_START) {
      if (!replaced) {
        out.push(trimmedBlock.trimEnd());
        replaced = true;
      }
      i++;
      while (i < lines.length) {
        const next = lines[i] ?? "";
        const trimmed = next.trim();
        if (/^\[mcp_servers\./.test(trimmed)) {
          if (trimmed !== AGENTICROS_BLOCK_START && trimmed !== AGENTICROS_ENV_BLOCK) {
            break;
          }
        }
        i++;
      }
      continue;
    }
    out.push(line);
    i++;
  }

  if (!replaced) {
    const sep = out.length > 0 && out[out.length - 1]?.trim() !== "" ? "\n" : "";
    return out.join("\n") + sep + trimmedBlock;
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Parse the agenticros MCP section from a Codex config.toml file. */
export function readCodexAgenticrosConfig(configPath: string): CodexAgenticrosConfig {
  const base: CodexAgenticrosConfig = { configPath, exists: existsSync(configPath) };
  if (!base.exists) return base;

  let content: string;
  try {
    content = readFileSync(configPath, "utf8");
  } catch {
    return base;
  }

  const serverSection = extractSection(content, AGENTICROS_BLOCK_START, AGENTICROS_ENV_BLOCK);
  const envSection = extractSection(content, AGENTICROS_ENV_BLOCK, /^\[/);

  base.command = parseTomlString(serverSection, "command");
  base.args = parseTomlStringArray(serverSection, "args");
  base.enabled = parseTomlBoolean(serverSection, "enabled");
  base.env = parseTomlEnvBlock(envSection);
  return base;
}

export function writeCodexAgenticrosConfig(
  configPath: string,
  mcpEntryAbs: string,
  options?: { namespace?: string },
): void {
  const abs = resolve(mcpEntryAbs);
  const block = buildAgenticrosMcpTomlBlock(abs, options?.namespace ?? "");
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  const merged = upsertAgenticrosBlock(existing, block);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, merged, "utf8");
}

/** Validate Codex agenticros MCP config against expected MCP binary path. */
export function validateCodexAgenticrosConfig(
  cfg: CodexAgenticrosConfig,
  mcpEntryExpected?: string,
): CodexConfigValidation {
  const issues: CodexConfigIssue[] = [];

  if (!cfg.exists) {
    issues.push({
      severity: "yellow",
      message: `Codex config missing (${cfg.configPath})`,
      hint: "Run `agenticros codex setup` to register the AgenticROS MCP server.",
    });
    return { ok: false, issues };
  }

  if (!cfg.command && (!cfg.args || cfg.args.length === 0)) {
    issues.push({
      severity: "red",
      message: "Codex [mcp_servers.agenticros] has no command or args",
      hint: "Run `agenticros codex setup` to repair the entry.",
    });
  }

  const mcpPathInArgs = extractMcpPathFromArgs(cfg.args ?? []);
  if (mcpPathInArgs && !isAbsolute(mcpPathInArgs.split(/\s/)[0] ?? "")) {
    issues.push({
      severity: "red",
      message: "Codex MCP path is relative — Codex cwd is not the repo root",
      hint: "Run `agenticros codex setup` to rewrite with an absolute path.",
    });
  }

  if (mcpEntryExpected && mcpPathInArgs) {
    const expected = resolve(mcpEntryExpected);
    const actual = resolve(mcpPathInArgs.split(/\s/)[0] ?? mcpPathInArgs);
    if (actual !== expected && !existsSync(actual)) {
      issues.push({
        severity: "red",
        message: "Codex MCP path does not point to a built server",
        hint: `Expected ${expected}. Run \`agenticros codex setup\`.`,
      });
    } else if (actual !== expected) {
      issues.push({
        severity: "yellow",
        message: "Codex MCP path differs from the CLI-resolved MCP entry",
        hint: `CLI expects ${expected}. Run \`agenticros codex setup\` to sync.`,
      });
    }
  } else if (mcpEntryExpected && !mcpPathInArgs) {
    issues.push({
      severity: "yellow",
      message: "Could not parse MCP server path from Codex config",
      hint: "Run `agenticros codex setup` to rewrite the entry.",
    });
  }

  const ns = (cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"] ?? "").trim();
  if (ns.length > 0) {
    issues.push({
      severity: "yellow",
      message: `Codex AGENTICROS_ROBOT_NAMESPACE is hardcoded ('${ns}')`,
      hint:
        'Leave it empty in ~/.codex/config.toml so `agenticros mode real|sim` drives the namespace (same as .mcp.json).',
    });
  }

  if (cfg.enabled === false) {
    issues.push({
      severity: "yellow",
      message: "Codex agenticros MCP server is disabled (enabled = false)",
      hint: "Set enabled = true or re-run `agenticros codex setup`.",
    });
  }

  const hasRed = issues.some((i) => i.severity === "red");
  return { ok: !hasRed && issues.length === 0, issues };
}

/** Collect Codex config paths to inspect (global + project when in a workspace). */
export function listCodexConfigCandidates(repoRoot?: string): string[] {
  const paths = [globalCodexConfigPath()];
  if (repoRoot) {
    paths.push(projectCodexConfigPath(repoRoot));
  }
  const cwdProject = projectCodexConfigPath(process.cwd());
  if (!paths.includes(cwdProject)) {
    paths.push(cwdProject);
  }
  return paths;
}

function extractSection(content: string, startMarker: string, endPattern: RegExp | string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === startMarker) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (typeof endPattern === "string") {
        if (trimmed === endPattern) break;
      } else if (endPattern.test(trimmed) && trimmed !== startMarker) {
        break;
      }
      out.push(line);
    }
  }
  return out.join("\n");
}

function parseTomlString(section: string, key: string): string | undefined {
  const re = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m");
  const m = section.match(re);
  return m?.[1];
}

function parseTomlBoolean(section: string, key: string): boolean | undefined {
  const re = new RegExp(`^${key}\\s*=\\s*(true|false)`, "m");
  const m = section.match(re);
  if (!m) return undefined;
  return m[1] === "true";
}

function parseTomlStringArray(section: string, key: string): string[] | undefined {
  const inline = section.match(new RegExp(`^${key}\\s*=\\s*\\[([^\\]]*)\\]`, "m"));
  if (inline?.[1]) {
    return [...inline[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
      m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    );
  }

  const start = section.match(new RegExp(`^${key}\\s*=\\s*\\[`, "m"));
  if (!start) return undefined;

  const after = section.slice(start.index ?? 0);
  const values: string[] = [];
  for (const m of after.matchAll(/"((?:\\.|[^"\\])*)"/g)) {
    values.push(m[1]!.replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }
  return values.length > 0 ? values : undefined;
}

function parseTomlEnvBlock(section: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of section.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"([^"]*)"/);
    if (m) env[m[1]!] = m[2]!;
  }
  return env;
}

/** Doctor check entries for Codex MCP config (used by `agenticros doctor`). */
export function buildCodexDoctorChecks(
  mcpEntryExpected: string | undefined,
  repoRoot?: string,
): Array<{ id: string; label: string; severity: "green" | "yellow" | "red"; hint?: string; detail?: string }> {
  const checks: Array<{
    id: string;
    label: string;
    severity: "green" | "yellow" | "red";
    hint?: string;
    detail?: string;
  }> = [];

  const globalPath = globalCodexConfigPath();
  const globalCfg = readCodexAgenticrosConfig(globalPath);
  if (!globalCfg.exists) {
    checks.push({
      id: "codex-config-global",
      label: "Codex global MCP config missing (~/.codex/config.toml)",
      severity: "yellow",
      hint: "Run `agenticros codex setup` to register the AgenticROS MCP server.",
    });
  } else {
    const v = validateCodexAgenticrosConfig(globalCfg, mcpEntryExpected);
    if (v.ok) {
      checks.push({
        id: "codex-config-global",
        label: "Codex global MCP config OK",
        severity: "green",
        detail: globalPath,
      });
    } else {
      const worst = v.issues.some((i) => i.severity === "red") ? "red" : "yellow";
      const first = v.issues[0]!;
      checks.push({
        id: "codex-config-global",
        label: `Codex global MCP: ${first.message}`,
        severity: worst,
        hint: first.hint ?? "Run `agenticros codex setup`.",
      });
    }
  }

  if (repoRoot) {
    const projectPath = projectCodexConfigPath(repoRoot);
    const projectCfg = readCodexAgenticrosConfig(projectPath);
    if (projectCfg.exists) {
      const v = validateCodexAgenticrosConfig(projectCfg, mcpEntryExpected);
      if (v.ok) {
        checks.push({
          id: "codex-config-project",
          label: "Codex project MCP config OK",
          severity: "green",
          detail: projectPath,
        });
      } else {
        const worst = v.issues.some((i) => i.severity === "red") ? "red" : "yellow";
        const first = v.issues[0]!;
        checks.push({
          id: "codex-config-project",
          label: `Codex project MCP: ${first.message}`,
          severity: worst,
          hint: first.hint ?? "Run `agenticros codex setup --project`.",
        });
      }
    }
  }

  return checks;
}

function extractMcpPathFromArgs(args: string[]): string | undefined {
  if (args.length === 0) return undefined;

  if (args[0] === "-c" && args[1]) {
    const cmd = args[1];
    const nodeMatch = cmd.match(/node\s+(\S+)/);
    return nodeMatch?.[1];
  }

  if (args[0] === "node" || args[0]?.endsWith("/node")) {
    return args[1];
  }

  const joined = args.join(" ");
  const nodeMatch = joined.match(/node\s+(\S+)/);
  return nodeMatch?.[1];
}
