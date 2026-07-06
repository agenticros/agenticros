/**
 * Read/write helpers for Claude MCP config (`.mcp.json` and Claude Desktop JSON).
 *
 * Claude Code uses project `.mcp.json` (or user scope via `claude mcp add`).
 * Claude Desktop uses `claude_desktop_config.json` under OS-specific paths.
 * We only manage the `agenticros` entry — other servers are preserved.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type ClaudeConfigTarget = "project" | "desktop";

export interface ClaudeAgenticrosConfig {
  configPath: string;
  exists: boolean;
  target: ClaudeConfigTarget;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ClaudeConfigIssue {
  severity: "red" | "yellow";
  message: string;
  hint?: string;
}

export interface ClaudeConfigValidation {
  ok: boolean;
  issues: ClaudeConfigIssue[];
}

const AGENTICROS_SERVER_KEY = "agenticros";

/** Project-scoped MCP config: `<cwd>/.mcp.json`. */
export function projectMcpJsonPath(cwd = process.cwd()): string {
  return join(cwd, ".mcp.json");
}

/** Claude Desktop MCP config (macOS / Windows). */
export function claudeDesktopConfigPath(): string {
  const home = homedir();
  if (platform() === "win32") {
    const appData = process.env["APPDATA"] ?? join(home, "AppData", "Roaming");
    return join(appData, "Claude", "claude_desktop_config.json");
  }
  return join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
}

export function resolveClaudeConfigPath(target: ClaudeConfigTarget, cwd = process.cwd()): string {
  return target === "project" ? projectMcpJsonPath(cwd) : claudeDesktopConfigPath();
}

/** Agenticros MCP server block (stdio + sh -c wrapper for log redirection). */
export function buildAgenticrosMcpServerEntry(mcpEntryAbs: string, namespace = ""): Record<string, unknown> {
  const escaped = mcpEntryAbs.replace(/\\/g, "\\\\");
  const shellCmd = `node ${escaped} 2>>/tmp/agenticros-mcp.log`;
  return {
    type: "stdio",
    command: "sh",
    args: ["-c", shellCmd],
    env: {
      AGENTICROS_ROBOT_NAMESPACE: namespace,
    },
  };
}

/** Merge agenticros into an MCP JSON document, preserving other keys and $comment. */
export function upsertAgenticrosMcpJson(
  existingContent: string | null,
  serverEntry: Record<string, unknown>,
): string {
  let root: Record<string, unknown> = {};
  if (existingContent?.trim()) {
    try {
      const parsed = JSON.parse(existingContent) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        root = { ...parsed };
      }
    } catch {
      root = {};
    }
  }

  const servers =
    root["mcpServers"] && typeof root["mcpServers"] === "object" && !Array.isArray(root["mcpServers"])
      ? { ...(root["mcpServers"] as Record<string, unknown>) }
      : {};

  servers[AGENTICROS_SERVER_KEY] = serverEntry;
  root["mcpServers"] = servers;

  return `${JSON.stringify(root, null, 2)}\n`;
}

export function writeClaudeAgenticrosConfig(
  configPath: string,
  mcpEntryAbs: string,
  options?: { namespace?: string },
): void {
  const abs = resolve(mcpEntryAbs);
  const entry = buildAgenticrosMcpServerEntry(abs, options?.namespace ?? "");
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  const merged = upsertAgenticrosMcpJson(existing, entry);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, merged, "utf8");
}

export function readClaudeAgenticrosConfig(
  configPath: string,
  target: ClaudeConfigTarget,
): ClaudeAgenticrosConfig {
  const base: ClaudeAgenticrosConfig = { configPath, exists: existsSync(configPath), target };
  if (!base.exists) return base;

  let content: string;
  try {
    content = readFileSync(configPath, "utf8");
  } catch {
    return base;
  }

  try {
    const root = JSON.parse(content) as Record<string, unknown>;
    const servers = root["mcpServers"] as Record<string, unknown> | undefined;
    const entry = servers?.[AGENTICROS_SERVER_KEY] as Record<string, unknown> | undefined;
    if (!entry) return base;

    base.command = typeof entry["command"] === "string" ? entry["command"] : undefined;
    base.args = Array.isArray(entry["args"])
      ? entry["args"].filter((a): a is string => typeof a === "string")
      : undefined;
    base.env =
      entry["env"] && typeof entry["env"] === "object" && !Array.isArray(entry["env"])
        ? Object.fromEntries(
            Object.entries(entry["env"] as Record<string, unknown>).filter(
              (e): e is [string, string] => typeof e[1] === "string",
            ),
          )
        : undefined;
  } catch {
    return base;
  }

  return base;
}

export function validateClaudeAgenticrosConfig(
  cfg: ClaudeAgenticrosConfig,
  mcpEntryExpected?: string,
): ClaudeConfigValidation {
  const issues: ClaudeConfigIssue[] = [];
  const setupHint =
    cfg.target === "desktop"
      ? "Run `agenticros claude setup --desktop` or `agenticros mcp setup --claude --desktop`."
      : "Run `agenticros claude setup` or `agenticros mcp setup --claude`.";

  if (!cfg.exists) {
    issues.push({
      severity: "yellow",
      message: `Claude MCP config missing (${cfg.configPath})`,
      hint: setupHint,
    });
    return { ok: false, issues };
  }

  if (!cfg.command && (!cfg.args || cfg.args.length === 0)) {
    issues.push({
      severity: "red",
      message: `Claude mcpServers.agenticros has no command or args (${cfg.target})`,
      hint: setupHint,
    });
  }

  const mcpPath = extractMcpPathFromArgs(cfg.args ?? []);
  if (mcpPath && !isAbsolute(mcpPath.split(/\s/)[0] ?? mcpPath)) {
    issues.push({
      severity: "red",
      message: "Claude MCP path is relative — Claude cwd is not the repo root",
      hint: setupHint,
    });
  }

  if (mcpEntryExpected && mcpPath) {
    const expected = resolve(mcpEntryExpected);
    const actual = resolve(mcpPath.split(/\s/)[0] ?? mcpPath);
    if (actual !== expected && !existsSync(actual)) {
      issues.push({
        severity: "red",
        message: "Claude MCP path does not point to a built server",
        hint: `Expected ${expected}. ${setupHint}`,
      });
    } else if (actual !== expected) {
      issues.push({
        severity: "yellow",
        message: "Claude MCP path differs from the CLI-resolved MCP entry",
        hint: `CLI expects ${expected}. ${setupHint}`,
      });
    }
  } else if (mcpEntryExpected && !mcpPath) {
    issues.push({
      severity: "yellow",
      message: "Could not parse MCP server path from Claude config",
      hint: setupHint,
    });
  }

  const ns = (cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"] ?? "").trim();
  if (ns.length > 0) {
    issues.push({
      severity: "yellow",
      message: `Claude AGENTICROS_ROBOT_NAMESPACE is hardcoded ('${ns}')`,
      hint:
        'Leave it empty so `agenticros mode real|sim` drives the namespace (same as Codex/Hermes).',
    });
  }

  const hasRed = issues.some((i) => i.severity === "red");
  return { ok: !hasRed && issues.length === 0, issues };
}

export function buildClaudeDoctorChecks(
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

  const candidates: Array<{ id: string; label: string; target: ClaudeConfigTarget; path: string }> = [
    { id: "claude-config-desktop", label: "Claude Desktop MCP", target: "desktop", path: claudeDesktopConfigPath() },
  ];
  if (repoRoot) {
    candidates.unshift({
      id: "claude-config-project",
      label: "Claude Code project MCP",
      target: "project",
      path: projectMcpJsonPath(repoRoot),
    });
  }

  for (const c of candidates) {
    const cfg = readClaudeAgenticrosConfig(c.path, c.target);
    if (!cfg.exists) {
      if (c.target === "desktop") {
        checks.push({
          id: c.id,
          label: "Claude Desktop MCP config missing",
          severity: "yellow",
          hint: "Run `agenticros mcp setup --claude` or `agenticros claude setup --desktop`.",
        });
      }
      continue;
    }

    const v = validateClaudeAgenticrosConfig(cfg, mcpEntryExpected);
    if (v.ok) {
      checks.push({
        id: c.id,
        label: `${c.label} OK`,
        severity: "green",
        detail: c.path,
      });
    } else {
      const worst = v.issues.some((i) => i.severity === "red") ? "red" : "yellow";
      const first = v.issues[0]!;
      checks.push({
        id: c.id,
        label: `${c.label}: ${first.message}`,
        severity: worst,
        hint: first.hint ?? "Run `agenticros mcp doctor`.",
      });
    }
  }

  return checks;
}

function extractMcpPathFromArgs(args: string[]): string | undefined {
  if (args.length === 0) return undefined;
  if (args[0] === "-c" && args[1]) {
    const nodeMatch = args[1].match(/node\s+(\S+)/);
    return nodeMatch?.[1];
  }
  if (args[0] === "node" || args[0]?.endsWith("/node")) {
    return args[1];
  }
  const joined = args.join(" ");
  const nodeMatch = joined.match(/node\s+(\S+)/);
  return nodeMatch?.[1];
}
