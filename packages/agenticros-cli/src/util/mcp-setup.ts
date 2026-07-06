/**
 * Unified MCP host setup for Codex, Hermes, and Claude (Option C).
 *
 * All hosts register the same `@agenticros/claude-code` stdio server with an
 * absolute path and empty AGENTICROS_ROBOT_NAMESPACE.
 */

import { execa } from "execa";

import {
  type CodexConfigScope,
  buildCodexDoctorChecks,
  globalCodexConfigPath,
  projectCodexConfigPath,
  writeCodexAgenticrosConfig,
} from "./codex-config.js";
import {
  buildHermesDoctorChecks,
  globalHermesConfigPath,
  writeHermesAgenticrosConfig,
} from "./hermes-config.js";
import {
  type ClaudeConfigTarget,
  buildClaudeDoctorChecks,
  claudeDesktopConfigPath,
  projectMcpJsonPath,
  writeClaudeAgenticrosConfig,
} from "./claude-config.js";
import { findMcpEntry } from "./mcp-discovery.js";
import { colors, info, ok, warn, err } from "./logger.js";

export type McpHostId = "codex" | "hermes" | "claude";

export interface McpSetupOptions {
  /** Configure all hosts (default when no host flags). */
  all?: boolean;
  codex?: boolean;
  hermes?: boolean;
  claude?: boolean;
  /** Codex project `.codex/config.toml` and/or Claude `.mcp.json` in repo root. */
  project?: boolean;
  /** Claude Desktop `claude_desktop_config.json` only (with --claude). */
  desktop?: boolean;
  /** Codex scope when only codex is targeted via legacy `codex setup --project`. */
  codexScope?: CodexConfigScope;
  quiet?: boolean;
  repoRoot?: string;
  cwd?: string;
}

export interface McpDoctorOptions {
  json?: boolean;
  quiet?: boolean;
  hosts?: McpHostId[];
  repoRoot?: string;
}

export async function codexOnPath(): Promise<boolean> {
  try {
    const { exitCode } = await execa("codex", ["--version"], { reject: false });
    return exitCode === 0;
  } catch {
    return false;
  }
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

export async function claudeOnPath(): Promise<boolean> {
  try {
    const { exitCode } = await execa("claude", ["--version"], { reject: false });
    return exitCode === 0;
  } catch {
    try {
      const { exitCode } = await execa("claude", ["--help"], { reject: false });
      return exitCode === 0;
    } catch {
      return false;
    }
  }
}

export function resolveMcpHosts(opts: McpSetupOptions): McpHostId[] {
  if (opts.codexScope === "project" && opts.codex !== false) {
    return ["codex"];
  }
  const explicit = (["codex", "hermes", "claude"] as const).filter((h) => opts[h]);
  if (explicit.length > 0) return [...explicit];
  if (opts.all !== false) return ["codex", "hermes", "claude"];
  return ["codex", "hermes", "claude"];
}

export function requireMcpEntry(): string {
  const mcpEntry = findMcpEntry();
  if (!mcpEntry) {
    err("AgenticROS MCP server is not built.");
    info("Run `pnpm --filter @agenticros/claude-code build` or `agenticros init` first.");
    process.exit(1);
  }
  return mcpEntry;
}

export function setupCodexMcp(mcpEntry: string, scope: CodexConfigScope, cwd?: string): string {
  const configPath = scope === "global" ? globalCodexConfigPath() : projectCodexConfigPath(cwd);
  writeCodexAgenticrosConfig(configPath, mcpEntry, { namespace: "" });
  return configPath;
}

export function setupHermesMcp(mcpEntry: string): string {
  const configPath = globalHermesConfigPath();
  writeHermesAgenticrosConfig(configPath, mcpEntry, { namespace: "" });
  return configPath;
}

export function setupClaudeMcp(
  mcpEntry: string,
  target: ClaudeConfigTarget,
  cwd?: string,
): string {
  const configPath =
    target === "project" ? projectMcpJsonPath(cwd) : claudeDesktopConfigPath();
  writeClaudeAgenticrosConfig(configPath, mcpEntry, { namespace: "" });
  return configPath;
}

export async function mcpSetupCommand(opts: McpSetupOptions = {}): Promise<void> {
  const mcpEntry = requireMcpEntry();
  const hosts = resolveMcpHosts(opts);
  const repoRoot = opts.repoRoot;
  const cwd = opts.cwd ?? process.cwd();

  if (!opts.quiet) {
    info(`Configuring AgenticROS MCP for: ${hosts.join(", ")}`);
    info(`MCP server: ${mcpEntry}\n`);
  }

  const written: string[] = [];
  const explicitHosts = (["codex", "hermes", "claude"] as const).filter((h) => opts[h]);
  const isFullSetup = explicitHosts.length === 0 || explicitHosts.length === 3;

  if (hosts.includes("codex")) {
    if (opts.codexScope === "project") {
      written.push(setupCodexMcp(mcpEntry, "project", repoRoot ?? cwd));
    } else {
      written.push(setupCodexMcp(mcpEntry, "global"));
      if (opts.project || (isFullSetup && repoRoot)) {
        written.push(setupCodexMcp(mcpEntry, "project", repoRoot ?? cwd));
      }
    }
  }

  if (hosts.includes("hermes")) {
    written.push(setupHermesMcp(mcpEntry));
  }

  if (hosts.includes("claude")) {
    const desktopOnly = opts.desktop && !opts.project;
    const projectOnly = opts.project && !opts.desktop;

    if (!projectOnly) {
      written.push(setupClaudeMcp(mcpEntry, "desktop"));
    }
    if (!desktopOnly && (opts.project || (isFullSetup && repoRoot) || projectOnly)) {
      written.push(setupClaudeMcp(mcpEntry, "project", repoRoot ?? cwd));
    }
  }

  for (const path of written) {
    ok(`Wrote: ${path}`);
  }

  if (hosts.includes("codex")) {
    const hasCodex = await codexOnPath();
    if (hasCodex) {
      info("Codex CLI detected — verify with `/mcp` in a Codex session.");
    } else {
      warn("Codex CLI not on PATH.");
    }
  }
  if (hosts.includes("hermes")) {
    const hasHermes = await hermesOnPath();
    if (hasHermes) {
      info("Hermes detected — run `/reload-mcp` or `hermes mcp test agenticros`.");
    } else {
      warn("Hermes CLI not on PATH.");
    }
  }
  if (hosts.includes("claude")) {
    const hasClaude = await claudeOnPath();
    if (hasClaude) {
      info("Claude Code CLI detected — run `claude` from the project with `.mcp.json`.");
    } else {
      warn("Claude CLI not on PATH (Desktop config may still apply).");
    }
    info("Restart Claude Desktop fully (Cmd+Q) after desktop config changes.");
  }
}

export function buildMcpDoctorChecks(
  mcpEntryExpected: string | undefined,
  repoRoot?: string,
  hosts?: McpHostId[],
): Array<{ id: string; label: string; severity: "green" | "yellow" | "red"; hint?: string; detail?: string }> {
  const active = hosts ?? (["codex", "hermes", "claude"] as McpHostId[]);
  const checks: Array<{
    id: string;
    label: string;
    severity: "green" | "yellow" | "red";
    hint?: string;
    detail?: string;
  }> = [];

  if (active.includes("codex")) {
    checks.push(...buildCodexDoctorChecks(mcpEntryExpected, repoRoot));
  }
  if (active.includes("hermes")) {
    checks.push(...buildHermesDoctorChecks(mcpEntryExpected));
  }
  if (active.includes("claude")) {
    checks.push(...buildClaudeDoctorChecks(mcpEntryExpected, repoRoot));
  }

  return checks;
}

export interface McpDoctorResult {
  hosts: McpHostId[];
  mcpEntry: string | undefined;
  checks: ReturnType<typeof buildMcpDoctorChecks>;
  exitCode: number;
}

export async function mcpDoctorCommand(opts: McpDoctorOptions = {}): Promise<number> {
  const mcpEntry = findMcpEntry();
  const hosts = opts.hosts ?? (["codex", "hermes", "claude"] as McpHostId[]);
  const checks = buildMcpDoctorChecks(mcpEntry, opts.repoRoot, hosts);

  const cliChecks: Array<{ id: string; label: string; severity: "green" | "yellow"; hint?: string }> = [];
  if (hosts.includes("codex")) {
    const on = await codexOnPath();
    cliChecks.push({
      id: "codex-cli",
      label: on ? "Codex CLI installed" : "Codex CLI not detected",
      severity: on ? "green" : "yellow",
      hint: on ? undefined : "Install from https://developers.openai.com/codex/",
    });
  }
  if (hosts.includes("hermes")) {
    const on = await hermesOnPath();
    cliChecks.push({
      id: "hermes-cli",
      label: on ? "Hermes CLI installed" : "Hermes CLI not detected",
      severity: on ? "green" : "yellow",
      hint: on ? undefined : "Install from https://github.com/NousResearch/hermes-agent",
    });
  }
  if (hosts.includes("claude")) {
    const on = await claudeOnPath();
    cliChecks.push({
      id: "claude-cli",
      label: on ? "Claude Code CLI installed" : "Claude Code CLI not detected",
      severity: on ? "green" : "yellow",
      hint: on ? undefined : "Install from https://claude.com/product/claude-code",
    });
  }

  const allChecks = [...checks, ...cliChecks];
  const exitCode = allChecks.some((c) => c.severity === "red")
    ? 1
    : allChecks.some((c) => c.severity === "yellow")
      ? 0
      : 0;

  if (opts.json) {
    process.stdout.write(JSON.stringify({ hosts, mcpEntry, checks: allChecks }, null, 2) + "\n");
    return allChecks.some((c) => c.severity === "red") ? 1 : 0;
  }

  if (!opts.quiet) {
    process.stdout.write(`${colors.bold("MCP doctor")}\n`);
    if (!mcpEntry) {
      err("MCP server not built.");
      return 1;
    }
    info(`Expected MCP entry: ${mcpEntry}\n`);
  }

  for (const c of allChecks) {
    const icon =
      c.severity === "green"
        ? colors.green("✓")
        : c.severity === "red"
          ? colors.red("✗")
          : colors.yellow("○");
    process.stdout.write(`  ${icon} ${c.label}\n`);
    if ("detail" in c && c.detail) {
      process.stdout.write(`     ${colors.dim(c.detail)}\n`);
    }
    if (c.hint) {
      process.stdout.write(`     ${colors.dim("→ " + c.hint)}\n`);
    }
  }

  return allChecks.some((c) => c.severity === "red") ? 1 : 0;
}
