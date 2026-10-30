/**
 * How an MCP client starts the Corebrum Synapse server.
 *
 * On Corebrum the process must source ROS and use rmw_zenoh_cpp. The desktop
 * profile installs that wrapper. Everywhere else the server is plain node.
 */

import { existsSync } from "node:fs";

export const COREBRUM_ROS_WRAPPER = "/usr/local/lib/corebrum/synapse-with-ros.sh";

/** Absolute wrapper path when this machine should launch MCP under Zenoh RMW. */
export function resolveRosWrapper(): string | undefined {
  const fromEnv = (process.env["SYNAPSE_ROS_WRAPPER"] ?? "").trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  if (existsSync(COREBRUM_ROS_WRAPPER)) return COREBRUM_ROS_WRAPPER;
  return undefined;
}

/** Shell line used by hosts that start the server with `sh -c`. */
export function mcpShellLine(mcpEntryAbs: string): string {
  const wrapper = resolveRosWrapper();
  const nodePart = wrapper ? `${wrapper} node ${mcpEntryAbs}` : `node ${mcpEntryAbs}`;
  return `${nodePart} 2>>/tmp/synapse-mcp.log`;
}
