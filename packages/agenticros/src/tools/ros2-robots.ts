/**
 * Tool: ros2_list_robots — Phase 1.d of the AgenticROS strategy.
 *
 * Returns the list of robots this gateway knows about (id, name, ROS2
 * namespace, default camera topic) and which one is active. The agent
 * uses this to discover the fleet and (in a follow-up iteration) target
 * specific robots via a `robot_id` parameter on other tools.
 *
 * Read-only and transport-free: this tool reads the multi-robot section
 * of the config (with legacy single-robot fallback) so it works even
 * when the robot is offline. Mirrored across all three adapters
 * (OpenClaw, Claude Code, Gemini) — see
 * docs/strategy-ai-agents-plus-ros.md §4 Phase 1.d.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { getActiveRobotId, listRobots } from "@agenticros/core";

export function registerRobotsTool(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  api.registerTool({
    name: "ros2_list_robots",
    label: "ROS2 List Robots",
    description:
      "List the robots this gateway knows about (id, name, ROS2 namespace, default camera topic) " +
      "and which one is the active default. Use this FIRST when the user mentions multiple robots, " +
      "asks 'which robots can you see?', or names a specific robot you haven't heard of. The " +
      "returned `id` is what later tools (in upcoming iterations) will accept as a `robot_id` " +
      "parameter — today there's a single active robot, but the field will scope per-tool calls " +
      "in fleet deployments.",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params) {
      const robots = listRobots(config);
      const active = getActiveRobotId(config);
      const result = {
        success: true,
        total: robots.length,
        active_robot_id: active,
        robots,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
      };
    },
  });
}
