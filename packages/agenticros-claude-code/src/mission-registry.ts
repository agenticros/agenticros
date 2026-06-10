/**
 * Per-process singleton mission registry for the Claude Code MCP server.
 *
 * Each `run_mission` invocation registers a fresh `mission_id` here so
 * a sibling `mission_cancel` MCP call can flip the cancellation token
 * mid-run. The runner picks that up at the next step boundary and
 * gracefully marks remaining steps as "cancelled".
 *
 * Lives at the module scope (not as a per-request object) because MCP
 * tool calls are dispatched independently — the cancel tool has no
 * other way to find the in-flight mission. See
 * docs/strategy-ai-agents-plus-ros.md §4 Phase 1.f.
 */

import { MissionRegistry } from "@agenticros/core";

const registry = new MissionRegistry();

export function getMissionRegistry(): MissionRegistry {
  return registry;
}
