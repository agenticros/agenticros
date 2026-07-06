/**
 * `agenticros hermes` — thin wrapper around unified MCP setup (Hermes host).
 */

import { header } from "../util/logger.js";
import { hermesOnPath, mcpDoctorCommand, mcpSetupCommand } from "../util/mcp-setup.js";

export interface HermesSetupOptions {
  quiet?: boolean;
}

export interface HermesDoctorOptions {
  json?: boolean;
}

export { hermesOnPath };

export async function hermesSetupCommand(opts: HermesSetupOptions = {}): Promise<void> {
  await mcpSetupCommand({
    codex: false,
    hermes: true,
    claude: false,
    quiet: opts.quiet,
  });
}

export async function hermesDoctorCommand(opts: HermesDoctorOptions = {}): Promise<number> {
  if (!opts.json) {
    header("Hermes MCP doctor");
  }
  return mcpDoctorCommand({ json: opts.json, hosts: ["hermes"] });
}
