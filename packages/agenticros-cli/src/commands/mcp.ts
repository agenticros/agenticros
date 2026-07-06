/**
 * `agenticros mcp` — configure all MCP hosts (Codex, Hermes, Claude) at once.
 */

import { header } from "../util/logger.js";
import { mcpDoctorCommand, mcpSetupCommand, type McpHostId } from "../util/mcp-setup.js";
import { getCliPaths } from "../util/paths.js";

export interface McpCommandSetupOptions {
  all?: boolean;
  codex?: boolean;
  hermes?: boolean;
  claude?: boolean;
  project?: boolean;
  desktop?: boolean;
}

export interface McpCommandDoctorOptions {
  json?: boolean;
  codex?: boolean;
  hermes?: boolean;
  claude?: boolean;
}

export async function mcpSetupCliCommand(opts: McpCommandSetupOptions = {}): Promise<void> {
  header("Configure AgenticROS MCP");
  const paths = getCliPaths();
  await mcpSetupCommand({
    all: opts.all,
    codex: opts.codex,
    hermes: opts.hermes,
    claude: opts.claude,
    project: opts.project,
    desktop: opts.desktop,
    repoRoot: paths.repoRoot,
  });
}

export async function mcpDoctorCliCommand(opts: McpCommandDoctorOptions = {}): Promise<number> {
  const paths = getCliPaths();
  const hosts: McpHostId[] | undefined =
    opts.codex || opts.hermes || opts.claude
      ? ([
          opts.codex && "codex",
          opts.hermes && "hermes",
          opts.claude && "claude",
        ].filter(Boolean) as McpHostId[])
      : undefined;

  return mcpDoctorCommand({ json: opts.json, hosts, repoRoot: paths.repoRoot });
}
