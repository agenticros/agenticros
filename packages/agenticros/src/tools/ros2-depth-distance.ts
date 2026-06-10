/**
 * Tool to read distance (meters) from a ROS2 depth image topic (e.g. RealSense).
 * Use when the user asks "how far am I" or "distance to the robot" / "distance from the robot".
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { toNamespacedTopic } from "@agenticros/core";
import { getTransportForRobot } from "../service.js";
import { getDepthDistance } from "../depth.js";
import { REALSENSE_CAMERA_TOPICS } from "./ros2-camera.js";
import { ROBOT_ID_SCHEMA, resolveRobotForTool } from "./_robot-helpers.js";

const DEFAULT_DEPTH_TOPIC = REALSENSE_CAMERA_TOPICS.depth_raw;

export function registerDepthDistanceTool(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.registerTool({
    name: "ros2_depth_distance",
    label: "ROS2 depth distance",
    description:
      "Get distance in meters from the robot's depth camera (e.g. RealSense). " +
      "Samples the center of the depth image and returns distance biased toward nearer pixels (~12th percentile), not median (median often tracks walls when the person only covers part of the patch). " +
      "Use when the user asks how far they are from the robot, or distance to/from the robot. " +
      "Pass robot_id (from ros2_list_robots) to sample a specific robot's depth camera.",

    parameters: Type.Object({
      topic: Type.Optional(
        Type.String({
          description: `Depth image topic (sensor_msgs/Image, 16UC1 or 32FC1). Default: ${DEFAULT_DEPTH_TOPIC}.`,
        }),
      ),
      timeout: Type.Optional(Type.Number({ description: "Timeout in ms (default 5000)" })),
      ...ROBOT_ID_SCHEMA,
    }),

    async execute(_toolCallId, params) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;
      const { robot } = resolved;

      const rawTopic = (params["topic"] as string | undefined)?.trim() || DEFAULT_DEPTH_TOPIC;
      const topic = toNamespacedTopic(robot.namespace, rawTopic);
      const timeout = (params["timeout"] as number | undefined) ?? 5000;

      try {
        const transport = await getTransportForRobot(config, robot);
        const result = await getDepthDistance(transport, topic, timeout);
        const text = result.valid
          ? `Distance at center (~12th percentile, nearer surfaces): **${result.distance_m} m** (median in same patch: ${result.median_m} m; range ${result.min_m}–${result.max_m} m; ${result.sample_count} pixels). Topic: ${result.topic}.`
          : `No valid depth in center region (topic: ${result.topic}, ${result.width}×${result.height}, encoding ${result.encoding}). The scene may be out of range or obscured.`;
        return {
          content: [{ type: "text" as const, text }],
          details: result,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Depth distance failed: ${message}` }],
          details: { success: false, error: message, topic },
        };
      }
    },
  });
}
