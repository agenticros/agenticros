/**
 * `agenticros codex` — thin wrapper around unified MCP setup (Codex host).
 */

import { type CodexConfigScope } from "../util/codex-config.js";
import { header } from "../util/logger.js";
import { codexOnPath, mcpDoctorCommand, mcpSetupCommand } from "../util/mcp-setup.js";

export type { CodexConfigScope };

export interface CodexSetupOptions {
  scope?: CodexConfigScope;
  yes?: boolean;
  quiet?: boolean;
}

export interface CodexDoctorOptions {
  json?: boolean;
}

export { codexOnPath };

export async function codexSetupCommand(opts: CodexSetupOptions = {}): Promise<void> {
  const scope = opts.scope ?? "global";

  if (scope === "project") {
    await mcpSetupCommand({
      codex: true,
      codexScope: "project",
      quiet: opts.quiet,
    });
    return;
  }

  await mcpSetupCommand({
    codex: true,
    hermes: false,
    claude: false,
    quiet: opts.quiet,
  });
}

export async function codexDoctorCommand(opts: CodexDoctorOptions = {}): Promise<number> {
  if (!opts.json) {
    header("Codex MCP doctor");
  }
  return mcpDoctorCommand({ json: opts.json, hosts: ["codex"] });
}
