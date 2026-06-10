/**
 * Phase 1.d helper — shared by every OpenClaw ROS2 tool that accepts an
 * optional `robot_id` parameter. Keeping it in one place means the
 * schema definition and resolution error format stay consistent across
 * tools and match the claude-code adapter.
 *
 * Usage in a tool's parameters:
 *
 *     parameters: Type.Object({
 *       topic: Type.String({ description: "..." }),
 *       ...ROBOT_ID_SCHEMA,
 *     })
 *
 * Usage in execute():
 *
 *     const resolved = resolveRobotForTool(config, params);
 *     if ("error" in resolved) return resolved.error;
 *     const ns = resolved.robot.namespace;
 */

import { Type } from "@sinclair/typebox";
import { resolveRobotFromArgs, type ResolvedRobot } from "@agenticros/core";
import type { AgenticROSConfig } from "@agenticros/core";

/**
 * TypeBox schema fragment — spread into a tool's parameters object to
 * advertise an optional `robot_id` argument.
 */
export const ROBOT_ID_SCHEMA = {
  robot_id: Type.Optional(
    Type.String({
      description:
        "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used.",
    }),
  ),
};

/**
 * Try to resolve the target robot from the tool's params. On success
 * returns `{ robot }`. On unknown-id failure returns `{ error }` —
 * already shaped as an OpenClaw tool response (content + details) so
 * the caller can `return resolved.error` directly. The error text comes
 * from `@agenticros/core/resolveRobot` and already lists known ids +
 * recommends ros2_list_robots, so the agent can self-correct.
 */
export function resolveRobotForTool(
  config: AgenticROSConfig,
  params: Record<string, unknown>,
):
  | { robot: ResolvedRobot }
  | {
      error: {
        content: Array<{ type: "text"; text: string }>;
        details: { success: false; error: string };
      };
    } {
  try {
    return { robot: resolveRobotFromArgs(config, params) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      error: {
        content: [{ type: "text", text: msg }],
        details: { success: false, error: msg },
      },
    };
  }
}
