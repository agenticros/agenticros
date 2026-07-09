/**
 * Tool: ros2_list_capabilities — Phase 1.b of the AgenticROS strategy.
 *
 * Returns the merged list of intrinsic robot verbs + every capability
 * declared by installed AgenticROS skills, as read by
 * @agenticros/core. Prefer this over `ros2_list_topics` for high-level
 * planning: capabilities are agent-meaningful verbs with typed
 * inputs/outputs, not raw topic names.
 *
 * Read-only and transport-free: this tool reads skill manifests from
 * local config + filesystem, so it works even when the robot is
 * offline. Mirrored across all three adapters (OpenClaw, Claude Code,
 * Gemini) — see docs/strategy-ai-agents-plus-ros.md §4.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig, Capability } from "@agenticros/core";
import { listCapabilitiesWithDiscoverable } from "@agenticros/core";
import { ROBOT_ID_SCHEMA, resolveRobotForTool } from "./_robot-helpers.js";

export function registerCapabilitiesTool(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  api.registerTool({
    name: "ros2_list_capabilities",
    label: "ROS2 List Capabilities",
    description:
      "List the high-level capabilities (named verbs) this robot can perform — built-in verbs like " +
      "drive_base / take_snapshot / measure_depth plus every capability declared by installed " +
      "AgenticROS skills (e.g. follow_person, find_object). Also includes discoverable marketplace " +
      "capabilities (discoverable:true, install_ref) that are not installed yet so you can propose " +
      "`agenticros skills install <install_ref>`. PREFER this over ros2_list_topics for high-level " +
      "planning. Pass robot_id to scope to a specific robot when using a multi-robot fleet.",
    parameters: Type.Object({ ...ROBOT_ID_SCHEMA }),

    async execute(_toolCallId, params) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;

      const caps = await listCapabilitiesWithDiscoverable(config);
      const intrinsic = caps.filter((c) => c.source?.kind === "builtin").length;
      const skill = caps.filter((c) => c.installed !== false && c.source?.kind === "skill").length;
      const discoverable = caps.filter((c) => c.discoverable === true).length;
      const result = {
        success: true,
        total: caps.length,
        intrinsic_count: intrinsic,
        skill_count: skill,
        discoverable_count: discoverable,
        capabilities: caps,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
      };
    },
  });
}
