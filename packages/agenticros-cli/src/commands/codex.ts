/**
 * `agenticros codex` — configure OpenAI Codex CLI to use the AgenticROS MCP server.
 */

import { execa } from "execa";

import {
  type CodexConfigScope,
  globalCodexConfigPath,
  projectCodexConfigPath,
  readCodexAgenticrosConfig,
  resolveCodexConfigPath,
  validateCodexAgenticrosConfig,
  writeCodexAgenticrosConfig,
} from "../util/codex-config.js";
import { findMcpEntry } from "../util/mcp-discovery.js";
import { getCliPaths } from "../util/paths.js";
import { colors, header, info, ok, warn, err } from "../util/logger.js";

export interface CodexSetupOptions {
  scope?: CodexConfigScope;
  /** Skip interactive confirmation when codex CLI is missing. */
  yes?: boolean;
  /** Suppress the section header (e.g. when called from `agenticros init`). */
  quiet?: boolean;
}

export interface CodexDoctorOptions {
  json?: boolean;
}

export async function codexOnPath(): Promise<boolean> {
  try {
    const { exitCode } = await execa("codex", ["--version"], { reject: false });
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function codexSetupCommand(opts: CodexSetupOptions = {}): Promise<void> {
  if (!opts.quiet) {
    header("Configure Codex MCP");
  }

  const mcpEntry = findMcpEntry();
  if (!mcpEntry) {
    err("AgenticROS MCP server is not built.");
    info("Run `pnpm --filter @agenticros/claude-code build` or `agenticros init` first.");
    process.exit(1);
  }

  const scope = opts.scope ?? "global";
  const configPath = resolveCodexConfigPath(scope);
  writeCodexAgenticrosConfig(configPath, mcpEntry, { namespace: "" });

  ok(`Wrote Codex MCP config (${scope}): ${configPath}`);
  info(`MCP server: ${mcpEntry}`);

  const hasCodex = await codexOnPath();
  if (hasCodex) {
    info("Codex CLI detected. Verify in a Codex session with `/mcp` — you should see `agenticros` connected.");
  } else {
    warn("Codex CLI not found on PATH.");
    info("Install from https://developers.openai.com/codex/ then run `/mcp` in a Codex session.");
  }

  if (scope === "global") {
    dimHint(
      "Tip: for a repo-scoped config instead, run `agenticros codex setup --project` from the project root.",
    );
  }
}

export async function codexDoctorCommand(opts: CodexDoctorOptions = {}): Promise<number> {
  const paths = getCliPaths();
  const mcpEntry = findMcpEntry();
  const candidates = [
    { label: "global", path: globalCodexConfigPath() },
  ];
  if (paths.repoRoot) {
    candidates.push({ label: "project", path: projectCodexConfigPath(paths.repoRoot) });
  }

  const results = candidates.map((c) => {
    const cfg = readCodexAgenticrosConfig(c.path);
    const validation = validateCodexAgenticrosConfig(cfg, mcpEntry);
    return { ...c, cfg, validation };
  });

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ results, mcpEntry }, null, 2)}\n`);
    const anyRed = results.some((r) => r.validation.issues.some((i) => i.severity === "red"));
    return anyRed ? 1 : 0;
  }

  header("Codex MCP doctor");
  if (!mcpEntry) {
    err("MCP server not built.");
    return 1;
  }
  info(`Expected MCP entry: ${mcpEntry}\n`);

  let exitCode = 0;
  for (const r of results) {
    process.stdout.write(`${colors.bold(r.label)} (${r.path})\n`);
    if (!r.cfg.exists) {
      process.stdout.write(`  ${colors.yellow("○")} Config file not present\n`);
      process.stdout.write(`     ${colors.dim("→ Run `agenticros codex setup" + (r.label === "project" ? " --project" : "") + "`")}\n`);
      if (r.label === "global") exitCode = 1;
      continue;
    }

    if (r.validation.ok) {
      process.stdout.write(`  ${colors.green("✓")} agenticros MCP configured correctly\n`);
      continue;
    }

    for (const issue of r.validation.issues) {
      const icon = issue.severity === "red" ? colors.red("✗") : colors.yellow("○");
      process.stdout.write(`  ${icon} ${issue.message}\n`);
      if (issue.hint) {
        process.stdout.write(`     ${colors.dim("→ " + issue.hint)}\n`);
      }
      if (issue.severity === "red") exitCode = 1;
    }
  }

  return exitCode;
}

function dimHint(message: string): void {
  process.stdout.write(`${colors.dim(message)}\n`);
}
