/**
 * `agenticros claude` — thin wrapper around unified MCP setup (Claude hosts).
 */

import { header } from "../util/logger.js";
import { claudeOnPath, mcpDoctorCommand, mcpSetupCommand } from "../util/mcp-setup.js";
import { getCliPaths } from "../util/paths.js";

export interface ClaudeSetupOptions {
  project?: boolean;
  desktop?: boolean;
  quiet?: boolean;
}

export interface ClaudeDoctorOptions {
  json?: boolean;
}

export { claudeOnPath };

export async function claudeSetupCommand(opts: ClaudeSetupOptions = {}): Promise<void> {
  const paths = getCliPaths();
  const desktopOnly = opts.desktop && !opts.project;
  const projectOnly = opts.project && !opts.desktop;

  await mcpSetupCommand({
    codex: false,
    hermes: false,
    claude: true,
    all: false,
    project: projectOnly || (!desktopOnly && !!paths.repoRoot),
    desktop: desktopOnly || !projectOnly,
    repoRoot: paths.repoRoot,
    quiet: opts.quiet,
  });
}

export async function claudeDoctorCommand(opts: ClaudeDoctorOptions = {}): Promise<number> {
  if (!opts.json) {
    header("Claude MCP doctor");
  }
  const paths = getCliPaths();
  return mcpDoctorCommand({ json: opts.json, hosts: ["claude"], repoRoot: paths.repoRoot });
}
