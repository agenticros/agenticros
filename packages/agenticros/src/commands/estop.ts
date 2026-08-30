import type { OpenClawPluginApi } from "../plugin-api.js";
import { emergencyStopRobot, resolveRobot, type AgenticROSConfig } from "@agenticros/core";
import { getTransport } from "../service.js";

/**
 * Register the /estop command.
 * This command bypasses the AI agent and immediately sends a zero-velocity
 * command to stop the robot. Uses the same cmd_vel topic as teleop/skills
 * (config.teleop.cmdVelTopic or robot namespace).
 */
export function registerEstopCommand(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.registerCommand({
    name: "estop",
    description: "Emergency stop — immediately halt the robot (bypasses AI)",

    async handler(_ctx) {
      try {
        const transport = getTransport();
        const robot = resolveRobot(config);
        const result = emergencyStopRobot(transport, robot, config);

        if (result.skipped === "no_mobile_base") {
          api.logger.warn("ESTOP: skipped — robot has no mobile base");
          return { text: "Emergency stop skipped — this robot has no mobile base." };
        }

        api.logger.warn(`ESTOP: Zero velocity command sent on ${result.topic ?? "cmd_vel"}`);
        return { text: "Emergency stop activated. Robot halted." };
      } catch (error) {
        api.logger.error(`ESTOP FAILED: ${String(error)}`);
        return { text: "Emergency stop failed — transport may be disconnected!" };
      }
    },
  });
}
