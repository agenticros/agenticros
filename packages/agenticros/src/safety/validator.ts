import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { checkActionGoalSafety, checkPublishSafety, resolveRobotFromArgs } from "@agenticros/core";

/**
 * Register the before_tool_call safety validation hook.
 * Intercepts Twist publishes and navigation goals against per-robot limits.
 */
export function registerSafetyHook(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.on("before_tool_call", async (event, _ctx) => {
    let robot;
    try {
      robot = resolveRobotFromArgs(config, event.params);
    } catch {
      robot = undefined;
    }

    if (event.toolName === "ros2_publish") {
      const safe = checkPublishSafety(config, event.params, robot);
      if (safe.block) {
        api.logger.warn(`Blocked: ${safe.blockReason}`);
        return { block: true, blockReason: safe.blockReason };
      }
    }

    if (event.toolName === "ros2_action_goal") {
      const safe = checkActionGoalSafety(config, event.params, robot);
      if (safe.block) {
        api.logger.warn(`Blocked: ${safe.blockReason}`);
        return { block: true, blockReason: safe.blockReason };
      }
    }

    return undefined;
  });
}
