/**
 * Gemini function declarations and tool execution. Same ROS2 tool set as Claude Code.
 */

import type { AgenticROSConfig } from "@agenticros/core";
import {
  resolveCameraSubscribeTopic,
  resolveMemoryNamespace,
  toNamespacedTopic,
} from "@agenticros/core";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  ROS_MSG_IMAGE,
  cameraSnapshotFromPlainMessage,
  mimeTypeForSnapshotBase64,
  rosNumericField,
} from "@agenticros/ros-camera";
import type { FunctionDeclaration, FunctionResponsePart } from "@google/genai";
import { createFunctionResponsePartFromBase64 } from "@google/genai";
import { getTransport } from "./transport.js";
import { checkPublishSafety } from "./safety.js";
import { getDepthDistance } from "./depth.js";
import { ensureMemory } from "./memory.js";

const MEMORY_TOOL_NAMES = new Set([
  "memory_remember",
  "memory_recall",
  "memory_forget",
  "memory_status",
]);

const DEFAULT_DEPTH_TOPIC = "/camera/camera/depth/image_rect_raw";
const ENABLE_MULTIMODAL_FUNCTION_RESPONSE =
  (process.env.GEMINI_ENABLE_MULTIMODAL_TOOL_RESPONSE ?? "").toLowerCase() === "true";

/** JSON Schema for Gemini parameters (object with type, properties, required). */
function schemaFromProps(properties: Record<string, { type: string; description?: string }>, required?: string[]): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: "object", properties: {} };
  for (const [k, v] of Object.entries(properties)) {
    (schema.properties as Record<string, unknown>)[k] = { type: v.type, description: v.description };
  }
  if (required && required.length > 0) schema.required = required;
  return schema;
}

export const GEMINI_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "ros2_list_topics",
    description: "List all available ROS2 topics and their message types. Use this to discover what data the robot publishes and what commands it accepts.",
    parametersJsonSchema: schemaFromProps({}),
  },
  {
    name: "ros2_publish",
    description: "Publish a message to a ROS2 topic. Use this to send commands to the robot (e.g., velocity commands to /cmd_vel, navigation goals).",
    parametersJsonSchema: schemaFromProps(
      {
        topic: { type: "string", description: "The ROS2 topic name (e.g., '/cmd_vel')" },
        type: { type: "string", description: "The ROS2 message type (e.g., 'geometry_msgs/msg/Twist')" },
        message: { type: "object", description: "The message payload matching the ROS2 message type schema" },
      },
      ["topic", "type", "message"],
    ),
  },
  {
    name: "ros2_subscribe_once",
    description: "Subscribe to a ROS2 topic and return the next message. Use this to read sensor data, check robot state, or get the current value of a topic.",
    parametersJsonSchema: schemaFromProps({
      topic: { type: "string", description: "The ROS2 topic name (e.g., '/battery_state')" },
      type: { type: "string", description: "The ROS2 message type (optional)" },
      timeout: { type: "number", description: "Timeout in milliseconds (default: 5000)" },
    }, ["topic"]),
  },
  {
    name: "ros2_service_call",
    description: "Call a ROS2 service and return the response. Use for request/response operations like setting parameters or querying node state.",
    parametersJsonSchema: schemaFromProps({
      service: { type: "string", description: "The ROS2 service name (e.g., '/spawn_entity')" },
      type: { type: "string", description: "The ROS2 service type (optional)" },
      args: { type: "object", description: "The service request arguments" },
    }, ["service"]),
  },
  {
    name: "ros2_action_goal",
    description: "Send a goal to a ROS2 action server. Use for long-running operations like navigation or arm movements.",
    parametersJsonSchema: schemaFromProps(
      {
        action: { type: "string", description: "The ROS2 action server name (e.g., '/navigate_to_pose')" },
        actionType: { type: "string", description: "The ROS2 action type (e.g., 'nav2_msgs/action/NavigateToPose')" },
        goal: { type: "object", description: "The action goal parameters" },
      },
      ["action", "actionType", "goal"],
    ),
  },
  {
    name: "ros2_param_get",
    description: "Get the value of a ROS2 parameter from a node. Use to check robot configuration values.",
    parametersJsonSchema: schemaFromProps(
      {
        node: { type: "string", description: "The fully qualified node name (e.g., '/turtlebot3/controller')" },
        parameter: { type: "string", description: "The parameter name (e.g., 'max_velocity')" },
      },
      ["node", "parameter"],
    ),
  },
  {
    name: "ros2_param_set",
    description: "Set the value of a ROS2 parameter on a node. Use to change robot configuration at runtime.",
    parametersJsonSchema: schemaFromProps(
      {
        node: { type: "string", description: "The fully qualified node name" },
        parameter: { type: "string", description: "The parameter name" },
        value: { type: "object", description: "The new parameter value" },
      },
      ["node", "parameter", "value"],
    ),
  },
  {
    name: "ros2_camera_snapshot",
    description: "Capture a single image from a ROS2 camera topic. Use when the user asks what the robot sees or requests a photo. Supports CompressedImage and raw Image.",
    parametersJsonSchema: schemaFromProps({
      topic: { type: "string", description: "Camera image topic (default from config or /camera/camera/color/image_raw/compressed)" },
      message_type: { type: "string", description: "'CompressedImage' or 'Image' (default: CompressedImage)" },
      timeout: { type: "number", description: "Timeout in milliseconds (default: 10000)" },
    }),
  },
  {
    name: "ros2_depth_distance",
    description: "Get distance in meters from the robot's depth camera. Samples the center of the depth image. Use when the user asks how far they are from the robot.",
    parametersJsonSchema: schemaFromProps({
      topic: { type: "string", description: `Depth image topic (default: ${DEFAULT_DEPTH_TOPIC})` },
      timeout: { type: "number", description: "Timeout in ms (default 5000)" },
    }),
  },
  {
    name: "memory_remember",
    description:
      "Store a durable fact in long-term memory. Call this when the user says \"remember that ...\", \"note that ...\", \"from now on ...\", or shares a stable personal fact (preferences, names, places, routines, robot hardware like the camera/eyes the robot has). The store is shared across all AgenticROS adapters talking to this robot (OpenClaw, Claude Desktop, Claude Code, Gemini). Do NOT auto-store chat transcripts. Only available when memory is enabled in config.",
    parametersJsonSchema: schemaFromProps(
      {
        content: { type: "string", description: "The fact to remember, written as a self-contained sentence." },
        tags: { type: "array", description: "Optional list of tag strings for filtering later." },
        path: { type: "string", description: "Optional hierarchical hint (e.g. 'preferences.movement.speed')." },
        namespace: { type: "string", description: "Optional namespace override; defaults to the robot namespace." },
      },
      ["content"],
    ),
  },
  {
    name: "memory_recall",
    description:
      "Semantic search of long-term memory. ALWAYS call this BEFORE answering a personal-context question, including: \"what do I have for X?\", \"what's my Y?\", \"where is the Z?\", \"what did I tell you about ...?\", \"do you remember ...?\". The store is shared across every adapter for this robot — a fact saved from Claude Desktop or Claude Code lives in the same store. Returns the top matches ranked by relevance.",
    parametersJsonSchema: schemaFromProps(
      {
        query: { type: "string", description: "Free-text query describing what you want to recall." },
        limit: { type: "number", description: "Max matches to return (default 5)." },
        namespace: { type: "string", description: "Optional namespace override; defaults to the robot namespace." },
      },
      ["query"],
    ),
  },
  {
    name: "memory_forget",
    description:
      "Delete memories. Provide id (one), query (matches in namespace), or just namespace (all in that namespace). Irreversible.",
    parametersJsonSchema: schemaFromProps({
      id: { type: "string", description: "Record id returned by memory_remember." },
      query: { type: "string", description: "Free-text query; deletes every matching memory in the namespace." },
      namespace: { type: "string", description: "Namespace to delete from." },
    }),
  },
  {
    name: "memory_status",
    description:
      "Health check for the memory subsystem. Returns enabled state, backend, record count, last write timestamp, and embedder info.",
    parametersJsonSchema: schemaFromProps({
      namespace: { type: "string", description: "Optional namespace override; defaults to the robot namespace." },
    }),
  },
];

/** Single tool object for Gemini (one item in config.tools array). */
export const GEMINI_TOOLS = [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS }];

/**
 * Build the per-invocation tools list for Gemini, filtering out memory tools
 * when memory is disabled. Call this from chat.ts so the model never sees
 * tools it cannot use.
 */
export async function buildGeminiTools(config: AgenticROSConfig) {
  const memory = await ensureMemory(config);
  const declarations = memory
    ? GEMINI_FUNCTION_DECLARATIONS
    : GEMINI_FUNCTION_DECLARATIONS.filter(
        (d) => !MEMORY_TOOL_NAMES.has(d.name ?? ""),
      );
  return [{ functionDeclarations: declarations }];
}

export interface ToolResult {
  output: string;
  parts?: FunctionResponsePart[];
  inlineImage?: { data: string; mimeType: string };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  config: AgenticROSConfig,
): Promise<ToolResult> {
  // Memory tools never need the ROS transport — dispatch them before
  // getTransport() (which throws when zenohd is down). Mirrors the gating in
  // packages/agenticros-claude-code/src/tools.ts.
  if (MEMORY_TOOL_NAMES.has(name)) {
    return executeMemoryTool(name, args, config);
  }
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
      return { output: text };
    }

    case "ros2_publish": {
      const rawTopicIn = String(args["topic"] ?? "").trim();
      if (process.stderr?.write) {
        process.stderr.write(`[AgenticROS] ros2_publish called topic=${JSON.stringify(rawTopicIn)}\n`);
      }
      if (transport.getStatus() !== "connected") {
        return {
          output: "Transport not connected to Zenoh/ROS2. Check zenohd is running (ws://localhost:10000) and config in ~/.agenticros/config.json.",
        };
      }
      const safe = checkPublishSafety(config, args);
      if (safe.block) {
        return { output: safe.blockReason ?? "Blocked by safety." };
      }
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
        setTimeout(() => reject(new Error("Publish timed out after " + PUBLISH_TIMEOUT_MS / 1000 + "s (Zenoh put may be hanging). Check zenohd and logs.")), PUBLISH_TIMEOUT_MS);
      });
      try {
        await Promise.race([transport.publish({ topic, type, msg: message }), timeoutPromise]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { output: `Publish failed: ${msg}` };
      }
      const summary = cmdVelMatch && topic.startsWith("/robot") ? `Published to ${topic} (robot prefix applied).` : `Published to ${topic}.`;
      return { output: summary + "\n" + JSON.stringify({ success: true, topic, type }) };
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
      return { output: text };
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
      return { output: text };
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
      return { output: text };
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
      return { output: text };
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
      return { output: text };
    }

    case "ros2_camera_snapshot": {
      const defaultTopic =
        (config.robot?.cameraTopic ?? "").trim() || "/camera/camera/color/image_raw/compressed";
      const rawTopic = (args["topic"] as string | undefined) ?? defaultTopic;
      const topic = resolveCameraSubscribeTopic(config, rawTopic);
      const rawMsgType = args["message_type"] as string | undefined;
      const messageType: "CompressedImage" | "Image" = rawMsgType === "Image" ? "Image" : "CompressedImage";
      const timeout = (args["timeout"] as number | undefined) ?? 10000;
      const type = messageType === "Image" ? ROS_MSG_IMAGE : ROS_MSG_COMPRESSED_IMAGE;

      let result: Record<string, unknown>;
      try {
        result = await new Promise<Record<string, unknown>>((resolve, reject) => {
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          output: `Camera snapshot failed: ${message}. Set robot.cameraTopic in config or pass topic= + message_type=Image if only raw Image exists.`,
        };
      }

      const base64 = (result.data as string) ?? "";
      const format = String((result.format as string) ?? "jpeg").toLowerCase();
      const mimeType = mimeTypeForSnapshotBase64(base64, format);
      const wNum = result.width != null ? rosNumericField(result.width, "width") : undefined;
      const hNum = result.height != null ? rosNumericField(result.height, "height") : undefined;
      const summary = `Captured one frame from ${topic}${wNum != null && hNum != null ? ` (${wNum}×${hNum})` : ""}.`;
      const parts: FunctionResponsePart[] = [];
      if (base64 && /^[A-Za-z0-9+/=]+$/.test(base64) && base64.length >= 100) {
        if (ENABLE_MULTIMODAL_FUNCTION_RESPONSE) {
          parts.push(createFunctionResponsePartFromBase64(base64, mimeType));
        }
      } else if (base64 && (!/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length < 100)) {
        return {
          output:
            summary +
            " (Image payload was present but not valid base64 or too small—check topic, message_type, or transport.)",
        };
      } else if (!base64) {
        return { output: summary + " (No image data received—topic may be idle or transport returned empty.)" };
      }
      if (!ENABLE_MULTIMODAL_FUNCTION_RESPONSE) {
        return {
          output:
            summary +
            " (Image bytes captured; multimodal function response disabled for compatibility with models that reject it.)",
          inlineImage: { data: base64, mimeType },
        };
      }
      return { output: summary, parts };
    }

    case "ros2_depth_distance": {
      const rawTopic = (args["topic"] as string | undefined)?.trim() || DEFAULT_DEPTH_TOPIC;
      const topic = resolveCameraSubscribeTopic(config, rawTopic);
      const timeout = (args["timeout"] as number | undefined) ?? 5000;
      try {
        const result = await getDepthDistance(transport, topic, timeout);
        const text = result.valid
          ? `Distance at center (~12th percentile, nearer surfaces): **${result.distance_m} m** (median: ${result.median_m} m; range ${result.min_m}–${result.max_m} m; ${result.sample_count} pixels). Topic: ${result.topic}.`
          : `No valid depth in center region (topic: ${result.topic}, ${result.width}×${result.height}, encoding ${result.encoding}).`;
        return { output: text };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { output: `Depth distance failed: ${message}` };
      }
    }

    default:
      return { output: `Unknown tool: ${name}` };
  }
}

/**
 * Dispatcher for the four memory_* Gemini tools. Kept separate from the ROS
 * tool switch because memory tools must work without the ROS transport.
 */
async function executeMemoryTool(
  name: string,
  args: Record<string, unknown>,
  config: AgenticROSConfig,
): Promise<ToolResult> {
  const memory = await ensureMemory(config);
  if (!memory) {
    return {
      output:
        "Memory is not enabled. Set memory.enabled=true in ~/.agenticros/config.json (backend: 'local' for zero deps, 'mem0' for semantic search). See docs/memory.md.",
    };
  }
  const namespace = resolveMemoryNamespace(config, args["namespace"] as string | undefined);
  try {
    if (name === "memory_remember") {
      const content = String(args["content"] ?? "").trim();
      if (!content) return { output: "memory_remember requires 'content'." };
      const tags = Array.isArray(args["tags"]) ? (args["tags"] as unknown[]).map(String) : undefined;
      const pathHint = typeof args["path"] === "string" ? (args["path"] as string) : undefined;
      const record = await memory.remember({ content, namespace, tags, path: pathHint });
      return {
        output: JSON.stringify({ success: true, id: record.id, namespace: record.namespace, backend: memory.backend }),
      };
    }
    if (name === "memory_recall") {
      const query = String(args["query"] ?? "").trim();
      if (!query) return { output: "memory_recall requires 'query'." };
      const limit = typeof args["limit"] === "number" ? (args["limit"] as number) : 5;
      const hits = await memory.recall({ query, namespace, limit });
      return {
        output: JSON.stringify({ success: true, namespace, backend: memory.backend, count: hits.length, results: hits }),
      };
    }
    if (name === "memory_forget") {
      const id = typeof args["id"] === "string" ? (args["id"] as string) : undefined;
      const query = typeof args["query"] === "string" ? (args["query"] as string) : undefined;
      const result = await memory.forget({ id, query, namespace });
      return { output: JSON.stringify({ success: true, ...result, namespace, backend: memory.backend }) };
    }
    const status = await memory.status(namespace);
    return { output: JSON.stringify({ success: true, ...status }) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: `${name} failed: ${message}` };
  }
}
