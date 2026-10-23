/**
 * Unified MCP host setup for Codex, Hermes, Claude, and Antigravity CLI (Option C).
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
  claudeUserConfigPath,
  projectMcpJsonPath,
  writeClaudeAgenticrosConfig,
  writeClaudeMcpAllowRule,
} from "./claude-config.js";
import {
  claudeInstructionPath,
  codexInstructionPath,
  grokInstructionPath,
  hermesInstructionPath,
  writeCursorRule,
  writeEmbodimentFile,
} from "./embodiment.js";
import {
  buildAgyDoctorChecks,
  globalAgyMcpConfigPath,
  globalAgySkillPath,
  projectAgyMcpConfigPath,
  projectAgySkillPath,
  writeAgyAgenticrosConfig,
  globalAgySettingsPath,
  writeAgyMcpAllowRule,
  writeAgySkill,
} from "./agy-config.js";
import { findMcpEntry } from "./mcp-discovery.js";
import { buildAgenticrosMcpServerEntry, upsertAgenticrosMcpJson } from "./claude-config.js";
import { colors, info, ok, warn, err } from "./logger.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import {
  ensureToolsAlsoAllow,
  isAgenticrosOpenclawPluginInstalled,
  openclawConfigExists,
  readAgenticrosContractTools,
} from "./openclaw-config.js";
import { getCliPaths } from "./paths.js";

export type McpHostId = "codex" | "hermes" | "claude" | "agy" | "cursor" | "grok" | "openclaw";

const MCP_HOSTS = ["codex", "hermes", "claude", "agy"] as const satisfies readonly McpHostId[];
const EXTRA_HOSTS = ["cursor", "grok", "openclaw"] as const satisfies readonly McpHostId[];

export interface McpSetupOptions {
  /** Configure all hosts (default when no host flags). */
  all?: boolean;
  codex?: boolean;
  hermes?: boolean;
  claude?: boolean;
  agy?: boolean;
  /** Codex project `.codex/config.toml`, Claude `.mcp.json`, and/or Antigravity `.agents/mcp_config.json`. */
  project?: boolean;
  /** Claude Desktop `claude_desktop_config.json` only (with --claude). */
  desktop?: boolean;
  /** Codex scope when only codex is targeted via legacy `codex setup --project`. */
  codexScope?: CodexConfigScope;
  cursor?: boolean;
  grok?: boolean;
  openclaw?: boolean;
  /** Configure only agents whose CLI is already on PATH, including Cursor, Grok, and OpenClaw. */
  onlyInstalled?: boolean;
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

export async function agyOnPath(): Promise<boolean> {
  try {
    const { exitCode } = await execa("agy", ["--version"], { reject: false });
    return exitCode === 0;
  } catch {
    return false;
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
  const explicit = [...MCP_HOSTS, ...EXTRA_HOSTS].filter((h) => opts[h]);
  if (explicit.length > 0) return [...explicit];
  if (opts.all !== false) return [...MCP_HOSTS];
  return [...MCP_HOSTS];
}

async function commandOnPath(bin: string, args: string[]): Promise<boolean> {
  try {
    const { exitCode } = await execa(bin, args, { reject: false });
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function cursorOnPath(): Promise<boolean> {
  try {
    const { stdout, exitCode } = await execa("bash", ["-lc", "command -v agent"], { reject: false });
    if (exitCode !== 0 || !stdout.trim()) return false;
    const { stdout: real } = await execa("readlink", ["-f", stdout.trim()], { reject: false });
    return `${real || stdout}`.includes("cursor-agent");
  } catch {
    return false;
  }
}

export async function grokOnPath(): Promise<boolean> {
  return commandOnPath("grok", ["--version"]);
}

export async function openclawOnPath(): Promise<boolean> {
  return commandOnPath("openclaw", ["--version"]);
}

export async function hostOnPath(host: McpHostId): Promise<boolean> {
  switch (host) {
    case "codex":
      return codexOnPath();
    case "hermes":
      return hermesOnPath();
    case "claude":
      return claudeOnPath();
    case "agy":
      return agyOnPath();
    case "cursor":
      return cursorOnPath();
    case "grok":
      return grokOnPath();
    case "openclaw":
      return openclawOnPath();
  }
}

export function cursorMcpConfigPath(): string {
  return join(homedir(), ".cursor", "mcp.json");
}

export function grokConfigPath(): string {
  return join(homedir(), ".grok", "config.toml");
}

export function writeCursorMcpConfig(mcpEntry: string): string {
  const path = cursorMcpConfigPath();
  const entry = buildAgenticrosMcpServerEntry(mcpEntry, "");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : null;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, upsertAgenticrosMcpJson(existing, entry), "utf8");
  writeCursorRule();
  return path;
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
    target === "project"
      ? projectMcpJsonPath(cwd)
      : target === "user"
        ? claudeUserConfigPath()
        : claudeDesktopConfigPath();
  writeClaudeAgenticrosConfig(configPath, mcpEntry, { namespace: "" });
  return configPath;
}

/** Write Antigravity MCP config and the AgenticROS skill for one scope. */
export function setupAgyMcp(mcpEntry: string, scope: "global" | "project", cwd?: string): string[] {
  if (scope === "global") {
    const configPath = globalAgyMcpConfigPath();
    const skillPath = globalAgySkillPath();
    writeAgyAgenticrosConfig(configPath, mcpEntry, { namespace: "" });
    writeAgySkill(skillPath);
    return [configPath, skillPath];
  }
  const root = cwd ?? process.cwd();
  const configPath = projectAgyMcpConfigPath(root);
  const skillPath = projectAgySkillPath(root);
  writeAgyAgenticrosConfig(configPath, mcpEntry, { namespace: "" });
  writeAgySkill(skillPath);
  return [configPath, skillPath];
}

async function installedHosts(opts: McpSetupOptions): Promise<McpHostId[]> {
  if (opts.onlyInstalled) {
    const present: McpHostId[] = [];
    for (const host of [...MCP_HOSTS, ...EXTRA_HOSTS]) {
      if (await hostOnPath(host)) present.push(host);
    }
    return present;
  }
  const hosts = resolveMcpHosts(opts);
  const explicit = [...MCP_HOSTS, ...EXTRA_HOSTS].filter((h) => opts[h]);
  if (explicit.length === 0) {
    for (const extra of EXTRA_HOSTS) {
      if (!hosts.includes(extra) && (await hostOnPath(extra))) hosts.push(extra);
    }
  }
  return hosts;
}

async function setupOpenClaw(repoRoot: string | undefined, quiet: boolean): Promise<string[]> {
  const written: string[] = [];
  if (!(await openclawOnPath())) return written;
  if (!isAgenticrosOpenclawPluginInstalled()) {
    if (quiet) return written;
    const script = join(getCliPaths().scriptsDir, "setup_gateway_plugin.sh");
    if (existsSync(script)) {
      await execa("bash", [script], { stdio: "inherit", reject: false });
      written.push(script);
    }
  }
  if (openclawConfigExists()) {
    const tools = readAgenticrosContractTools(repoRoot ?? getCliPaths().repoRoot);
    if (tools) ensureToolsAlsoAllow(tools);
  }
  return written;
}

export async function mcpSetupCommand(opts: McpSetupOptions = {}): Promise<void> {
  const mcpEntry = requireMcpEntry();
  const hosts = await installedHosts(opts);
  const repoRoot = opts.repoRoot;
  const cwd = opts.cwd ?? process.cwd();
  const say = (fn: (message: string) => void, message: string) => {
    if (!opts.quiet) fn(message);
  };

  if (!opts.quiet) {
    info(`Configuring AgenticROS MCP for: ${hosts.join(", ") || "(none installed)"}`);
    info(`MCP server: ${mcpEntry}\n`);
  }

  const written: string[] = [];
  const explicitHosts = MCP_HOSTS.filter((h) => opts[h]);
  const isFullSetup = explicitHosts.length === 0 || explicitHosts.length === MCP_HOSTS.length;

  if (hosts.includes("codex")) {
    if (opts.codexScope === "project") {
      written.push(setupCodexMcp(mcpEntry, "project", repoRoot ?? cwd));
    } else {
      written.push(setupCodexMcp(mcpEntry, "global"));
      writeEmbodimentFile(codexInstructionPath());
      written.push(codexInstructionPath());
      if (opts.project || (isFullSetup && repoRoot)) {
        written.push(setupCodexMcp(mcpEntry, "project", repoRoot ?? cwd));
      }
    }
  }

  if (hosts.includes("hermes")) {
    written.push(setupHermesMcp(mcpEntry));
    writeEmbodimentFile(hermesInstructionPath());
    written.push(hermesInstructionPath());
  }

  if (hosts.includes("claude")) {
    const desktopOnly = opts.desktop && !opts.project;
    const projectOnly = opts.project && !opts.desktop;

    if (!desktopOnly) {
      written.push(setupClaudeMcp(mcpEntry, "user"));
      writeClaudeMcpAllowRule();
      writeEmbodimentFile(claudeInstructionPath());
      written.push(claudeInstructionPath());
    }
    if (!projectOnly) {
      written.push(setupClaudeMcp(mcpEntry, "desktop"));
    }
    if (!desktopOnly && (opts.project || (isFullSetup && repoRoot) || projectOnly)) {
      written.push(setupClaudeMcp(mcpEntry, "project", repoRoot ?? cwd));
    }
  }

  if (hosts.includes("agy")) {
    written.push(...setupAgyMcp(mcpEntry, "global"));
    if (opts.project || (isFullSetup && repoRoot)) {
      written.push(...setupAgyMcp(mcpEntry, "project", repoRoot ?? cwd));
    }
    const settingsPath = globalAgySettingsPath();
    writeAgyMcpAllowRule(settingsPath);
    written.push(settingsPath);
  }

  if (hosts.includes("cursor")) {
    written.push(writeCursorMcpConfig(mcpEntry));
    written.push(join(homedir(), ".cursor", "rules", "agenticros.mdc"));
  }

  if (hosts.includes("grok")) {
    const path = grokConfigPath();
    writeCodexAgenticrosConfig(path, mcpEntry, { namespace: "" });
    writeEmbodimentFile(grokInstructionPath());
    written.push(path, grokInstructionPath());
  }

  if (hosts.includes("openclaw")) {
    written.push(...(await setupOpenClaw(repoRoot, opts.quiet === true)));
  }

  for (const path of written) {
    say(ok, `Wrote: ${path}`);
  }

  if (opts.quiet) return;

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
  if (hosts.includes("agy")) {
    const hasAgy = await agyOnPath();
    if (hasAgy) {
      info("Antigravity CLI detected — verify with `/mcp` in an `agy` session.");
      info("Headless `agenticros agy run` can call AgenticROS MCP tools. Other tools still need approval, or pass `--yes`.");
      info("Sign in once with interactive `agy` before `agenticros agy run`.");
    } else {
      warn("Antigravity CLI (agy) not on PATH.");
    }
  }
}

export function buildMcpDoctorChecks(
  mcpEntryExpected: string | undefined,
  repoRoot?: string,
  hosts?: McpHostId[],
): Array<{ id: string; label: string; severity: "green" | "yellow" | "red"; hint?: string; detail?: string }> {
  const active = hosts ?? [...MCP_HOSTS];
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
  if (active.includes("agy")) {
    checks.push(...buildAgyDoctorChecks(mcpEntryExpected, repoRoot));
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
  const hosts = opts.hosts ?? [...MCP_HOSTS];
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
  if (hosts.includes("agy")) {
    const on = await agyOnPath();
    cliChecks.push({
      id: "agy-cli",
      label: on ? "Antigravity CLI installed" : "Antigravity CLI not detected",
      severity: on ? "green" : "yellow",
      hint: on ? undefined : "Install from https://antigravity.google/docs/cli/",
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
