import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { toNamespacedTopic } from "@agenticros/core";
import { getTransportForRobot } from "../service.js";
import { ROBOT_ID_SCHEMA, resolveRobotForTool } from "./_robot-helpers.js";

/**
 * Register the ros2_service_call tool with the AI agent.
 * Allows calling any ROS2 service.
 */
export function registerServiceTool(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.registerTool({
    name: "ros2_service_call",
    label: "ROS2 Service Call",
    description:
      "Call a ROS2 service and return the response. Use this for request/response operations " +
      "like setting parameters, triggering behaviors, or querying node state. " +
      "Pass robot_id (from ros2_list_robots) to target a specific robot.",
    parameters: Type.Object({
      service: Type.String({ description: "The ROS2 service name (e.g., '/spawn_entity')" }),
      type: Type.Optional(Type.String({ description: "The ROS2 service type (e.g., 'gazebo_msgs/srv/SpawnEntity')" })),
      args: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: "The service request arguments",
      })),
      ...ROBOT_ID_SCHEMA,
    }),

    async execute(_toolCallId, params) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;
      const { robot } = resolved;

      const rawService = params["service"] as string;
      const service = toNamespacedTopic(robot.namespace, rawService);
      const type = params["type"] as string | undefined;
      const args = params["args"] as Record<string, unknown> | undefined;

      const transport = await getTransportForRobot(config, robot);
      const response = await transport.callService({ service, type, args });

      const result = {
        success: response.result,
        service,
        response: response.values,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
      };
    },
  });
}
