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
import { listAllCapabilities } from "@agenticros/core";
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
      "AgenticROS skills (e.g. follow_person, find_object). PREFER this over ros2_list_topics for " +
      "high-level planning: capabilities are agent-meaningful verbs with typed inputs/outputs, " +
      "not raw topic names. Returns one structured response listing every capability the robot " +
      "supports right now. Pass robot_id (from ros2_list_robots) to scope to a specific robot; " +
      "today every robot exposes the same capabilities, but the API is in place for per-robot " +
      "capability declarations.",
    parameters: Type.Object({ ...ROBOT_ID_SCHEMA }),

    async execute(_toolCallId, params) {
      // robot_id is validated even though the response doesn't depend on
      // it yet — unknown ids surface as a tool error, matching every
      // other tool in the suite.
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;

      const caps: Capability[] = listAllCapabilities(config);
      const intrinsic = caps.filter((c) => c.source?.kind === "builtin").length;
      const skill = caps.filter((c) => c.source?.kind === "skill").length;
      const result = {
        success: true,
        total: caps.length,
        intrinsic_count: intrinsic,
        skill_count: skill,
        capabilities: caps,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
      };
    },
  });
}
