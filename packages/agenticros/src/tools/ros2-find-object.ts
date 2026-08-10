/**
 * Tool: rotate the robot in place until a target COCO-class object is
 * detected by YOLOv8n in the camera feed, then stop.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { findObject } from "@agenticros/object-detection";
import { getTransportForRobot } from "../service.js";
import { ROBOT_ID_SCHEMA, resolveRobotForTool } from "./_robot-helpers.js";

export function registerFindObjectTool(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.registerTool({
    name: "ros2_find_object",
    label: "ROS2 find object",
    description:
      "Rotate the robot in place (clockwise by default) until a target object is detected by YOLOv8n in the camera feed, then stop. " +
      "Target must be a COCO class name (e.g., 'cell phone', 'chair', 'bottle', 'cup', 'laptop'). " +
      "Returns whether the object was found, its confidence, bounding box, and horizontal offset from image center (-1=left edge, 0=center, +1=right edge). " +
      "Pass robot_id (from ros2_list_robots) to scan with a specific robot's camera; omitted = active robot.",

    parameters: Type.Object({
      target: Type.String({
        description: "COCO class name to search for (e.g., 'cell phone', 'chair', 'bottle').",
      }),
      angular_speed: Type.Optional(
        Type.Number({ description: "Rotation speed in rad/s (default 0.3). Clamped to safety.maxAngularVelocity." }),
      ),
      clockwise: Type.Optional(
        Type.Boolean({ description: "Rotate clockwise (default true). Set false for counterclockwise." }),
      ),
      timeout_seconds: Type.Optional(
        Type.Number({ description: "Give up after this many seconds (default 30)." }),
      ),
      min_confidence: Type.Optional(
        Type.Number({ description: "Minimum detection confidence to accept (default 0.5)." }),
      ),
      ...ROBOT_ID_SCHEMA,
    }),

    async execute(_toolCallId, params, signal) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;
      const { robot } = resolved;

      const target = String(params["target"] ?? "").trim();
      if (!target) {
        const msg = "Missing required argument: target";
        return {
          content: [{ type: "text" as const, text: msg }],
          details: { success: false, error: msg },
        };
      }

      try {
        const transport = await getTransportForRobot(config, robot);
        if (transport.getStatus() !== "connected") {
          const msg = `Transport not connected (status: ${transport.getStatus()}).`;
          return {
            content: [{ type: "text" as const, text: msg }],
            details: { success: false, error: msg },
          };
        }

        const result = await findObject(robot, config, transport, {
          target,
          angularSpeed: params["angular_speed"] as number | undefined,
          clockwise: params["clockwise"] as boolean | undefined,
          timeoutSeconds: params["timeout_seconds"] as number | undefined,
          minConfidence: params["min_confidence"] as number | undefined,
          signal,
        });

        const summary = result.error
          ? result.error
          : result.found
            ? `Found ${target} after ${result.elapsedSeconds.toFixed(1)}s rotating ${result.rotationDirection}. ` +
              `Confidence ${(result.detection!.confidence * 100).toFixed(0)}%, ` +
              `horizontal offset ${result.detection!.horizontalOffset.toFixed(2)} ` +
              `(${result.detection!.horizontalOffset < 0 ? "left" : "right"} of center). Robot stopped.`
            : `${target} not found within ${result.elapsedSeconds.toFixed(1)}s. Robot stopped.`;

        return {
          content: [{ type: "text" as const, text: summary }],
          details: result,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Find object failed: ${message}` }],
          details: { success: false, error: message },
        };
      }
    },
  });
}
