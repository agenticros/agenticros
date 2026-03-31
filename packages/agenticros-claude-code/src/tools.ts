/**
 * MCP tool definitions and handler. Mirrors OpenClaw adapter tools.
 */

import type { AgenticROSConfig } from "@agenticros/core";
import { toNamespacedTopic } from "@agenticros/core";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  ROS_MSG_IMAGE,
  cameraSnapshotFromPlainMessage,
  mimeTypeForSnapshotBase64,
  rosNumericField,
} from "@agenticros/ros-camera";
import { getTransport } from "./transport.js";
import { checkPublishSafety } from "./safety.js";
import { getDepthDistance } from "./depth.js";

const DEFAULT_DEPTH_TOPIC = "/camera/camera/depth/image_rect_raw";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, { type: string; description?: string; default?: unknown }>;
    required?: string[];
  };
}

export const TOOLS: McpTool[] = [
  {
    name: "ros2_list_topics",
    description:
      "List all available ROS2 topics and their message types. Use this to discover what data the robot publishes and what commands it accepts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ros2_publish",
    description:
      "Publish a message to a ROS2 topic. Use this to send commands to the robot (e.g., velocity commands to /cmd_vel, navigation goals).",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The ROS2 topic name (e.g., '/cmd_vel')" },
        type: { type: "string", description: "The ROS2 message type (e.g., 'geometry_msgs/msg/Twist')" },
        message: { type: "object", description: "The message payload matching the ROS2 message type schema" },
      },
      required: ["topic", "type", "message"],
    },
  },
  {
    name: "ros2_subscribe_once",
    description:
      "Subscribe to a ROS2 topic and return the next message. Use this to read sensor data, check robot state, or get the current value of a topic.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The ROS2 topic name (e.g., '/battery_state')" },
        type: { type: "string", description: "The ROS2 message type (optional)" },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 5000)" },
      },
      required: ["topic"],
    },
  },
  {
    name: "ros2_service_call",
    description:
      "Call a ROS2 service and return the response. Use for request/response operations like setting parameters or querying node state.",
    inputSchema: {
      type: "object",
      properties: {
        service: { type: "string", description: "The ROS2 service name (e.g., '/spawn_entity')" },
        type: { type: "string", description: "The ROS2 service type (optional)" },
        args: { type: "object", description: "The service request arguments" },
      },
      required: ["service"],
    },
  },
  {
    name: "ros2_action_goal",
    description:
      "Send a goal to a ROS2 action server. Use for long-running operations like navigation or arm movements.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "The ROS2 action server name (e.g., '/navigate_to_pose')" },
        actionType: { type: "string", description: "The ROS2 action type (e.g., 'nav2_msgs/action/NavigateToPose')" },
        goal: { type: "object", description: "The action goal parameters" },
      },
      required: ["action", "actionType", "goal"],
    },
  },
  {
    name: "ros2_param_get",
    description: "Get the value of a ROS2 parameter from a node. Use to check robot configuration values.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "The fully qualified node name (e.g., '/turtlebot3/controller')" },
        parameter: { type: "string", description: "The parameter name (e.g., 'max_velocity')" },
      },
      required: ["node", "parameter"],
    },
  },
  {
    name: "ros2_param_set",
    description: "Set the value of a ROS2 parameter on a node. Use to change robot configuration at runtime.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "The fully qualified node name" },
        parameter: { type: "string", description: "The parameter name" },
        value: { type: "object", description: "The new parameter value" },
      },
      required: ["node", "parameter", "value"],
    },
  },
  {
    name: "ros2_camera_snapshot",
    description:
      "Capture a single image from a ROS2 camera topic. Use when the user asks what the robot sees or requests a photo. Supports CompressedImage and raw Image.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Camera image topic (default from config or /camera/camera/color/image_raw/compressed)" },
        message_type: { type: "string", description: "'CompressedImage' or 'Image' (default: CompressedImage)" },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 10000)" },
      },
    },
  },
  {
    name: "ros2_depth_distance",
    description:
      "Get distance in meters from the robot's depth camera. Samples the center of the depth image. Use when the user asks how far they are from the robot.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: `Depth image topic (default: ${DEFAULT_DEPTH_TOPIC})` },
        timeout: { type: "number", description: "Timeout in ms (default 5000)" },
      },
    },
  },
];

export type ToolContent = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  config: AgenticROSConfig,
): Promise<{ content: ToolContent[]; isError?: boolean }> {
  const transport = getTransport();

  switch (name) {
    case "ros2_list_topics": {
      const topics = await transport.listTopics();
      const MAX = 50;
      const truncated = topics.length > MAX ? topics.slice(0, MAX) : topics;
      const text = JSON.stringify({
        success: true,
        topics: truncated,
        total: topics.length,
        truncated: topics.length > MAX,
      });
      return { content: [{ type: "text", text }] };
    }

    case "ros2_publish": {
      const rawTopicIn = String(args["topic"] ?? "").trim();
      if (process.stderr?.write) {
        process.stderr.write(`[AgenticROS] ros2_publish called topic=${JSON.stringify(rawTopicIn)}\n`);
      }
      if (transport.getStatus() !== "connected") {
        if (process.stderr?.write) {
          process.stderr.write(`[AgenticROS] ros2_publish abort: transport not connected\n`);
        }
        return {
          content: [{ type: "text", text: "Transport not connected to Zenoh/ROS2. Check zenohd is running (ws://localhost:10000) and config in ~/.agenticros/config.json." }],
          isError: true,
        };
      }
      const safe = checkPublishSafety(config, args);
      if (safe.block) {
        return { content: [{ type: "text", text: safe.blockReason ?? "Blocked by safety." }], isError: true };
      }
      // Unconditionally rewrite /<uuid>/cmd_vel → /robot<uuid-no-dashes>/cmd_vel (robot often expects UUID without dashes)
      const cmdVelMatch = rawTopicIn.match(/^\/([^/]+)\/cmd_vel$/i);
      const segment = cmdVelMatch?.[1] ?? "";
      const topic =
        cmdVelMatch && !segment.toLowerCase().startsWith("robot")
          ? `/robot${segment.replace(/-/g, "")}/cmd_vel`
          : toNamespacedTopic(config, rawTopicIn);
      if (process.stderr?.write) {
        process.stderr.write(`[AgenticROS] ros2_publish: → topic=${topic}\n`);
      }
      const type = args["type"] as string;
      const message = args["message"] as Record<string, unknown>;
      const PUBLISH_TIMEOUT_MS = 10_000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Publish timed out after " + PUBLISH_TIMEOUT_MS / 1000 + "s (Zenoh put may be hanging). Check zenohd and MCP server logs.")), PUBLISH_TIMEOUT_MS);
      });
      try {
        await Promise.race([transport.publish({ topic, type, msg: message }), timeoutPromise]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Publish failed: ${msg}` }], isError: true };
      }
      const summary = cmdVelMatch && topic.startsWith("/robot") ? `Published to ${topic} (robot prefix applied).` : `Published to ${topic}.`;
      return { content: [{ type: "text", text: summary + "\n" + JSON.stringify({ success: true, topic, type }) }] };
    }

    case "ros2_subscribe_once": {
      const rawTopic = args["topic"] as string;
      const topic = toNamespacedTopic(config, rawTopic);
      let msgType = args["type"] as string | undefined;
      const timeout = (args["timeout"] as number | undefined) ?? 5000;
      if (!msgType && /\/?(camera|image|color|depth)/i.test(rawTopic)) {
        msgType = rawTopic.includes("compressed") ? "sensor_msgs/msg/CompressedImage" : "sensor_msgs/msg/Image";
      }
      const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const sub = transport.subscribe(
          { topic, type: msgType },
          (msg: Record<string, unknown>) => {
            clearTimeout(timer);
            sub.unsubscribe();
            resolve({ success: true, topic, message: msg });
          },
        );
        const timer = setTimeout(() => {
          sub.unsubscribe();
          reject(new Error(`Timeout waiting for message on ${topic}`));
        }, timeout);
      });
      let text = JSON.stringify(result);
      const MAX_CHARS = 8000;
      if (text.length > MAX_CHARS) {
        text = JSON.stringify({
          success: true,
          topic,
          message: "[truncated: message too large]",
          originalSize: text.length,
        }) + "\n(Use ros2_camera_snapshot for image topics.)";
      }
      return { content: [{ type: "text", text }] };
    }

    case "ros2_service_call": {
      const rawService = args["service"] as string;
      const service = toNamespacedTopic(config, rawService);
      const type = args["type"] as string | undefined;
      const reqArgs = args["args"] as Record<string, unknown> | undefined;
      const response = await transport.callService({ service, type, args: reqArgs });
      const text = JSON.stringify({
        success: response.result,
        service,
        response: response.values,
      });
      return { content: [{ type: "text", text }] };
    }

    case "ros2_action_goal": {
      const rawAction = args["action"] as string;
      const action = toNamespacedTopic(config, rawAction);
      const actionType = args["actionType"] as string;
      const goal = args["goal"] as Record<string, unknown>;
      const actionResult = await transport.sendActionGoal({ action, actionType, args: goal });
      const text = JSON.stringify({
        success: actionResult.result,
        action,
        result: actionResult.values,
      });
      return { content: [{ type: "text", text }] };
    }

    case "ros2_param_get": {
      const rawNode = args["node"] as string;
      const node = toNamespacedTopic(config, rawNode);
      const parameter = args["parameter"] as string;
      const response = await transport.callService({
        service: `${node}/get_parameters`,
        type: "rcl_interfaces/srv/GetParameters",
        args: { names: [parameter] },
      });
      const text = JSON.stringify({
        success: response.result,
        node,
        parameter,
        value: response.values,
      });
      return { content: [{ type: "text", text }] };
    }

    case "ros2_param_set": {
      const rawNode = args["node"] as string;
      const node = toNamespacedTopic(config, rawNode);
      const parameter = args["parameter"] as string;
      const value = args["value"];
      const response = await transport.callService({
        service: `${node}/set_parameters`,
        type: "rcl_interfaces/srv/SetParameters",
        args: { parameters: [{ name: parameter, value }] },
      });
      const text = JSON.stringify({
        success: response.result,
        node,
        parameter,
      });
      return { content: [{ type: "text", text }] };
    }

    case "ros2_camera_snapshot": {
      const defaultTopic =
        (config.robot?.cameraTopic ?? "").trim() || "/camera/camera/color/image_raw/compressed";
      const rawTopic = (args["topic"] as string | undefined) ?? defaultTopic;
      const topic = toNamespacedTopic(config, rawTopic);
      const rawMsgType = args["message_type"] as string | undefined;
      const messageType: "CompressedImage" | "Image" = rawMsgType === "Image" ? "Image" : "CompressedImage";
      const timeout = (args["timeout"] as number | undefined) ?? 10000;
      const type = messageType === "Image" ? ROS_MSG_IMAGE : ROS_MSG_COMPRESSED_IMAGE;

      const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const subscription = transport.subscribe(
          { topic, type },
          (msg: Record<string, unknown>) => {
            clearTimeout(timer);
            subscription.unsubscribe();
            try {
              const payload = cameraSnapshotFromPlainMessage(messageType, msg);
              resolve({
                success: true,
                topic,
                format: payload.formatLabel,
                data: payload.dataBase64,
                width: payload.width,
                height: payload.height,
              });
            } catch (e) {
              reject(e instanceof Error ? e : new Error(String(e)));
            }
          },
        );
        const timer = setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error(`Timeout waiting for camera frame on ${topic}`));
        }, timeout);
      });

      const base64 = (result.data as string) ?? "";
      const format = String((result.format as string) ?? "jpeg").toLowerCase();
      const mimeType = mimeTypeForSnapshotBase64(base64, format);
      const wNum = result.width != null ? rosNumericField(result.width, "width") : undefined;
      const hNum = result.height != null ? rosNumericField(result.height, "height") : undefined;
      const summary = `Captured one frame from ${topic}${wNum != null && hNum != null ? ` (${wNum}×${hNum})` : ""}.`;
      const content: ToolContent[] = [{ type: "text", text: summary }];
      if (base64 && /^[A-Za-z0-9+/=]+$/.test(base64) && base64.length >= 100) {
        content.push({ type: "image", data: base64, mimeType });
      } else if (base64 && (!/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length < 100)) {
        content.push({
          type: "text",
          text: " (Image payload was present but not valid base64 or too small—check topic, message_type, or transport.)",
        });
      } else if (!base64) {
        content.push({
          type: "text",
          text: " (No image data received—topic may be idle or transport returned empty.)",
        });
      }
      return { content };
    }

    case "ros2_depth_distance": {
      const rawTopic = (args["topic"] as string | undefined)?.trim() || DEFAULT_DEPTH_TOPIC;
      const topic = toNamespacedTopic(config, rawTopic);
      const timeout = (args["timeout"] as number | undefined) ?? 5000;
      try {
        const result = await getDepthDistance(transport, topic, timeout);
        const text = result.valid
          ? `Distance at center of depth image: **${result.distance_m} m** (range in sample: ${result.min_m}–${result.max_m} m, ${result.sample_count} pixels). Topic: ${result.topic}.`
          : `No valid depth in center region (topic: ${result.topic}, ${result.width}×${result.height}, encoding ${result.encoding}).`;
        return { content: [{ type: "text", text }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Depth distance failed: ${message}` }],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}
