/**
 * `synapse mcp` — configure all MCP hosts (Codex, Hermes, Claude, Antigravity) at once.
 */

import { header } from "../util/logger.js";
import { mcpDoctorCommand, mcpSetupCommand, type McpHostId } from "../util/mcp-setup.js";
import { getCliPaths } from "../util/paths.js";

export interface McpCommandSetupOptions {
  all?: boolean;
  codex?: boolean;
  hermes?: boolean;
  claude?: boolean;
  agy?: boolean;
  cursor?: boolean;
  grok?: boolean;
  openclaw?: boolean;
  onlyInstalled?: boolean;
  quiet?: boolean;
  project?: boolean;
  desktop?: boolean;
}

export interface McpCommandDoctorOptions {
  json?: boolean;
  codex?: boolean;
  hermes?: boolean;
  claude?: boolean;
  agy?: boolean;
}

export async function mcpSetupCliCommand(opts: McpCommandSetupOptions = {}): Promise<void> {
  if (!opts.quiet) header("Configure Corebrum Synapse MCP");
  const paths = getCliPaths();
  await mcpSetupCommand({
    all: opts.all,
    codex: opts.codex,
    hermes: opts.hermes,
    claude: opts.claude,
    agy: opts.agy,
    cursor: opts.cursor,
    grok: opts.grok,
    openclaw: opts.openclaw,
    onlyInstalled: opts.onlyInstalled,
    quiet: opts.quiet,
    project: opts.project,
    desktop: opts.desktop,
    repoRoot: paths.repoRoot,
  });
}

export async function mcpDoctorCliCommand(opts: McpCommandDoctorOptions = {}): Promise<number> {
  const paths = getCliPaths();
  const hosts: McpHostId[] | undefined =
    opts.codex || opts.hermes || opts.claude || opts.agy
      ? ([
          opts.codex && "codex",
          opts.hermes && "hermes",
          opts.claude && "claude",
          opts.agy && "agy",
        ].filter(Boolean) as McpHostId[])
      : undefined;

  return mcpDoctorCommand({ json: opts.json, hosts, repoRoot: paths.repoRoot });
}
