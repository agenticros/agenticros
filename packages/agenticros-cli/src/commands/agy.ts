/**
 * `agenticros agy` — Antigravity CLI setup, doctor, and headless prompt runner.
 *
 * Setup and doctor delegate to the unified MCP host writer. `run` execs `agy -p`
 * with stdio inherited so a terminal session stays a TTY.
 */

import { execa } from "execa";

import { header, info, err } from "../util/logger.js";
import { agyOnPath, mcpDoctorCommand, mcpSetupCommand } from "../util/mcp-setup.js";
import { getCliPaths } from "../util/paths.js";

export interface AgySetupOptions {
  quiet?: boolean;
}

export interface AgyDoctorOptions {
  json?: boolean;
}

export interface AgyRunOptions {
  cwd?: string;
  model?: string;
  /** Pass `--dangerously-skip-permissions` so tool calls (including motion) auto-approve. */
  yes?: boolean;
}

export { agyOnPath };

export async function agySetupCommand(opts: AgySetupOptions = {}): Promise<void> {
  const paths = getCliPaths();
  await mcpSetupCommand({
    codex: false,
    hermes: false,
    claude: false,
    agy: true,
    all: false,
    project: Boolean(paths.repoRoot),
    repoRoot: paths.repoRoot,
    quiet: opts.quiet,
  });
}

export async function agyDoctorCommand(opts: AgyDoctorOptions = {}): Promise<number> {
  if (!opts.json) {
    header("Antigravity MCP doctor");
  }
  const paths = getCliPaths();
  return mcpDoctorCommand({ json: opts.json, hosts: ["agy"], repoRoot: paths.repoRoot });
}

/**
 * Run one prompt through `agy` and exit. Does not auto-approve tools unless
 * `opts.yes` is set.
 */
export async function agyRunCommand(prompt: string, opts: AgyRunOptions = {}): Promise<void> {
  const text = prompt.trim();
  if (!text) {
    err("Prompt is empty.");
    process.exit(1);
  }

  if (!(await agyOnPath())) {
    err("Antigravity CLI (agy) is not on PATH.");
    info("Install it from https://antigravity.google/docs/cli/ and sign in with an interactive `agy` session.");
    process.exit(1);
  }

  const args = ["-p", text];
  if (opts.model) {
    args.push("--model", opts.model);
  }
  if (opts.yes) {
    args.push("--dangerously-skip-permissions");
  }

  const result = await execa("agy", args, {
    stdio: "inherit",
    cwd: opts.cwd ?? process.cwd(),
    reject: false,
  });
  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}
