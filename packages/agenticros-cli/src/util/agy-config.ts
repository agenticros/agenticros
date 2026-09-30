/**
 * Read/write helpers for Google Antigravity CLI (`agy`) MCP config.
 *
 * Antigravity keeps MCP servers in a dedicated JSON file, not Claude's
 * `.mcp.json`:
 *   - global:    ~/.gemini/config/mcp_config.json
 *   - workspace: <repo>/.agents/mcp_config.json
 *
 * The AgenticROS skill (when to use the MCP server, not a tool catalog) is
 * installed at:
 *   - global:    ~/.gemini/antigravity-cli/skills/agenticros/SKILL.md
 *   - workspace: <repo>/.agents/skills/agenticros/SKILL.md
 *
 * We only manage the `agenticros` server entry — other servers are preserved.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export interface AgyAgenticrosConfig {
  configPath: string;
  exists: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface AgyConfigIssue {
  severity: "red" | "yellow";
  message: string;
  hint?: string;
}

export interface AgyConfigValidation {
  ok: boolean;
  issues: AgyConfigIssue[];
}

const AGENTICROS_SERVER_KEY = "agenticros";

/** Global Antigravity MCP config: `~/.gemini/config/mcp_config.json`. */
export function globalAgyMcpConfigPath(): string {
  return join(homedir(), ".gemini", "config", "mcp_config.json");
}

/** Workspace Antigravity MCP config: `<cwd>/.agents/mcp_config.json`. */
export function projectAgyMcpConfigPath(cwd = process.cwd()): string {
  return join(cwd, ".agents", "mcp_config.json");
}

/** Global Antigravity CLI skill. */
export function globalAgySkillPath(): string {
  return join(homedir(), ".gemini", "antigravity-cli", "skills", "agenticros", "SKILL.md");
}

/**
 * Global Antigravity CLI settings.
 * Headless `agy -p` cannot prompt, so MCP tools (Ask by default) are denied
 * unless this file allows them.
 */
export function globalAgySettingsPath(): string {
  return join(homedir(), ".gemini", "antigravity-cli", "settings.json");
}

/** Allow every tool on the AgenticROS MCP server. Other tools stay Ask/Deny. */
export const AGY_MCP_ALLOW_RULE = "mcp(agenticros/*)";

/** Workspace Antigravity skill. */
export function projectAgySkillPath(cwd = process.cwd()): string {
  return join(cwd, ".agents", "skills", "agenticros", "SKILL.md");
}

/**
 * Stdio server block for Antigravity. `command` is this Node binary;
 * `args` is the absolute MCP entry. Namespace stays empty so
 * `agenticros mode real|sim` selects the robot.
 */
export function buildAgyMcpServerEntry(
  mcpEntryAbs: string,
  namespace = "",
): Record<string, unknown> {
  return {
    command: process.execPath,
    args: [resolve(mcpEntryAbs)],
    env: {
      AGENTICROS_ROBOT_NAMESPACE: namespace,
    },
  };
}

/** Short skill: when to use the MCP server. Tool schemas come from MCP itself. */
export function generateAgySkillContent(): string {
  return `---
name: agenticros
description: Control a ROS 2 robot through the AgenticROS MCP server. Use when the user asks to drive, stop, navigate, inspect sensors, capture a camera image, or remember something about the robot.
---

# AgenticROS

The \`agenticros\` MCP server is connected. Use its tools for robot control, sensing, and memory.

- Prefer those tools over a \`ros2\` shell CLI.
- Velocity commands are clamped by the robot's safety limits.
- Call \`ros2_estop\` to halt motion immediately.
- Leave the robot namespace to AgenticROS config (\`agenticros mode real\` or \`agenticros mode sim\`). Do not hardcode a namespace unless the user names a specific robot.
`;
}

/** Merge the agenticros server into an MCP JSON document, preserving other keys. */
export function upsertAgyMcpJson(
  existingContent: string | null,
  serverEntry: Record<string, unknown>,
): string {
  let root: Record<string, unknown> = {};
  if (existingContent?.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(existingContent);
    } catch {
      throw new Error("Antigravity mcp_config.json is not valid JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Antigravity mcp_config.json must be a JSON object");
    }
    root = { ...(parsed as Record<string, unknown>) };
  }

  const servers =
    root["mcpServers"] && typeof root["mcpServers"] === "object" && !Array.isArray(root["mcpServers"])
      ? { ...(root["mcpServers"] as Record<string, unknown>) }
      : {};

  servers[AGENTICROS_SERVER_KEY] = serverEntry;
  root["mcpServers"] = servers;

  return `${JSON.stringify(root, null, 2)}\n`;
}

export function writeAgyAgenticrosConfig(
  configPath: string,
  mcpEntryAbs: string,
  options?: { namespace?: string },
): void {
  const entry = buildAgyMcpServerEntry(mcpEntryAbs, options?.namespace ?? "");
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  const merged = upsertAgyMcpJson(existing, entry);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, merged, "utf8");
}

export function writeAgySkill(skillPath: string): void {
  mkdirSync(dirname(skillPath), { recursive: true });
  writeFileSync(skillPath, generateAgySkillContent(), "utf8");
}

/**
 * Merge `mcp(agenticros/*)` into `permissions.allow`, preserving every other
 * settings key and any allow rules already present.
 */
export function upsertAgyMcpAllowRule(existingContent: string | null): string {
  let root: Record<string, unknown> = {};
  if (existingContent?.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(existingContent);
    } catch {
      throw new Error("Antigravity settings.json is not valid JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Antigravity settings.json must be a JSON object");
    }
    root = { ...(parsed as Record<string, unknown>) };
  }

  const permissions =
    root["permissions"] && typeof root["permissions"] === "object" && !Array.isArray(root["permissions"])
      ? { ...(root["permissions"] as Record<string, unknown>) }
      : {};

  const allow = Array.isArray(permissions["allow"]) ? [...permissions["allow"]] : [];
  if (!allow.includes(AGY_MCP_ALLOW_RULE)) {
    allow.push(AGY_MCP_ALLOW_RULE);
  }
  permissions["allow"] = allow;
  root["permissions"] = permissions;

  return `${JSON.stringify(root, null, 2)}\n`;
}

export function writeAgyMcpAllowRule(settingsPath: string): void {
  const existing = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : null;
  const merged = upsertAgyMcpAllowRule(existing);
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, merged, "utf8");
}

/** True when settings.json already allows the AgenticROS MCP server. */
export function agySettingsAllowsMcp(settingsPath: string): boolean {
  if (!existsSync(settingsPath)) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const permissions = (parsed as Record<string, unknown>)["permissions"];
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) return false;
  const allow = (permissions as Record<string, unknown>)["allow"];
  return Array.isArray(allow) && allow.includes(AGY_MCP_ALLOW_RULE);
}

export function readAgyAgenticrosConfig(configPath: string): AgyAgenticrosConfig {
  const base: AgyAgenticrosConfig = { configPath, exists: existsSync(configPath) };
  if (!base.exists) return base;

  let content: string;
  try {
    content = readFileSync(configPath, "utf8");
  } catch {
    return base;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return base;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;

  const servers = (parsed as Record<string, unknown>)["mcpServers"];
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) return base;

  const entry = (servers as Record<string, unknown>)[AGENTICROS_SERVER_KEY];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return base;

  const record = entry as Record<string, unknown>;
  if (typeof record["command"] === "string") base.command = record["command"];
  if (Array.isArray(record["args"])) {
    base.args = record["args"].filter((arg): arg is string => typeof arg === "string");
  }
  if (record["env"] && typeof record["env"] === "object" && !Array.isArray(record["env"])) {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(record["env"] as Record<string, unknown>)) {
      if (typeof value === "string") env[key] = value;
    }
    base.env = env;
  }
  return base;
}

/** Validate an Antigravity agenticros MCP entry against the expected binary. */
export function validateAgyAgenticrosConfig(
  cfg: AgyAgenticrosConfig,
  mcpEntryExpected?: string,
): AgyConfigValidation {
  const issues: AgyConfigIssue[] = [];
  const setupHint = "Run `agenticros agy setup` to repair the entry.";

  if (!cfg.exists) {
    issues.push({
      severity: "yellow",
      message: `Antigravity MCP config missing (${cfg.configPath})`,
      hint: "Run `agenticros agy setup` to register the AgenticROS MCP server.",
    });
    return { ok: false, issues };
  }

  if (!cfg.command || !cfg.args || cfg.args.length === 0) {
    issues.push({
      severity: "red",
      message: "Antigravity mcpServers.agenticros has no command or args",
      hint: setupHint,
    });
  }

  const mcpPath = cfg.args?.[0];
  if (mcpPath && !isAbsolute(mcpPath)) {
    issues.push({
      severity: "red",
      message: "Antigravity MCP path is relative",
      hint: setupHint,
    });
  }

  if (mcpEntryExpected && mcpPath) {
    const expected = resolve(mcpEntryExpected);
    const actual = resolve(mcpPath);
    if (actual !== expected && !existsSync(actual)) {
      issues.push({
        severity: "red",
        message: "Antigravity MCP path does not point to a built server",
        hint: `Expected ${expected}. ${setupHint}`,
      });
    } else if (actual !== expected) {
      issues.push({
        severity: "yellow",
        message: "Antigravity MCP path differs from the CLI-resolved MCP entry",
        hint: `CLI expects ${expected}. ${setupHint}`,
      });
    }
  } else if (mcpEntryExpected && !mcpPath) {
    issues.push({
      severity: "yellow",
      message: "Could not parse MCP server path from Antigravity config",
      hint: setupHint,
    });
  }

  const ns = (cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"] ?? "").trim();
  if (ns.length > 0) {
    issues.push({
      severity: "red",
      message: `Antigravity AGENTICROS_ROBOT_NAMESPACE is hardcoded ('${ns}')`,
      hint:
        'Leave it empty so `agenticros mode real|sim` drives the namespace (same as Codex and Hermes).',
    });
  }

  const hasRed = issues.some((i) => i.severity === "red");
  return { ok: !hasRed && issues.length === 0, issues };
}

/** Doctor checks for Antigravity MCP config and the AgenticROS skill. */
export function buildAgyDoctorChecks(
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

  const configs: Array<{ id: string; label: string; path: string }> = [
    {
      id: "agy-mcp-global",
      label: "Antigravity global MCP",
      path: globalAgyMcpConfigPath(),
    },
  ];
  if (repoRoot) {
    configs.push({
      id: "agy-mcp-project",
      label: "Antigravity project MCP",
      path: projectAgyMcpConfigPath(repoRoot),
    });
  }

  for (const candidate of configs) {
    const cfg = readAgyAgenticrosConfig(candidate.path);
    if (!cfg.exists) {
      checks.push({
        id: candidate.id,
        label: `${candidate.label} config missing`,
        severity: "yellow",
        hint: "Run `agenticros agy setup`.",
        detail: candidate.path,
      });
      continue;
    }

    const validation = validateAgyAgenticrosConfig(cfg, mcpEntryExpected);
    if (validation.ok) {
      checks.push({
        id: candidate.id,
        label: `${candidate.label} OK`,
        severity: "green",
        detail: candidate.path,
      });
    } else {
      const worst = validation.issues.some((issue) => issue.severity === "red") ? "red" : "yellow";
      const first = validation.issues[0]!;
      checks.push({
        id: candidate.id,
        label: `${candidate.label}: ${first.message}`,
        severity: worst,
        hint: first.hint ?? "Run `agenticros agy setup`.",
        detail: candidate.path,
      });
    }
  }

  const skills: Array<{ id: string; label: string; path: string }> = [
    {
      id: "agy-skill-global",
      label: "Antigravity AgenticROS skill",
      path: globalAgySkillPath(),
    },
  ];
  if (repoRoot) {
    skills.push({
      id: "agy-skill-project",
      label: "Antigravity project AgenticROS skill",
      path: projectAgySkillPath(repoRoot),
    });
  }

  for (const skill of skills) {
    if (existsSync(skill.path)) {
      checks.push({
        id: skill.id,
        label: `${skill.label} OK`,
        severity: "green",
        detail: skill.path,
      });
    } else {
      checks.push({
        id: skill.id,
        label: `${skill.label} missing`,
        severity: "yellow",
        hint: "Run `agenticros agy setup`.",
        detail: skill.path,
      });
    }
  }

  const settingsPath = globalAgySettingsPath();
  if (agySettingsAllowsMcp(settingsPath)) {
    checks.push({
      id: "agy-mcp-allow",
      label: "Antigravity allows AgenticROS MCP tools",
      severity: "green",
      detail: settingsPath,
    });
  } else {
    checks.push({
      id: "agy-mcp-allow",
      label: "Antigravity headless MCP allow rule missing",
      severity: "yellow",
      hint: "Run `agenticros agy setup` so `agy -p` can call AgenticROS tools without a prompt.",
      detail: settingsPath,
    });
  }

  return checks;
}
