/**
 * MCP tool definitions and handler. Mirrors OpenClaw adapter tools.
 */

import type {
  AgenticROSConfig,
  Capability,
  Mission,
  MissionToolDispatcher,
  ResolvedRobot,
} from "@agenticros/core";
import {
  resolveCameraSubscribeTopic,
  toNamespacedTopic,
  toNamespacedTopicFull,
  listAllCapabilities,
  listCapabilitiesWithDiscoverable,
  runMission,
  listRobots,
  getActiveRobotId,
  resolveRobotFromArgs,
  discoverRobots,
  findRobotsFor,
  type FindRobotsForResult,
  generateMissionId,
  createMemoryTranscriptSink,
  missionTranscriptNamespace,
  compileGoalToMission,
  buildMissionBindings,
  isExternalToolName,
  capabilityIdFromExternalTool,
  executeExternalCapability,
} from "@agenticros/core";
import { getMissionRegistry } from "./mission-registry.js";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  ROS_MSG_IMAGE,
  cameraSnapshotFromPlainMessage,
  mimeTypeForSnapshotBase64,
  rosNumericField,
} from "@agenticros/ros-camera";
import { resolveMemoryNamespace } from "@agenticros/core";
import { getTransportForRobot } from "./transport.js";
import { checkPublishSafety } from "./safety.js";
import { getDepthDistance } from "./depth.js";
import { getFollowMeLocal } from "./follow-me/loop.js";
import { getFollowMeDepth } from "./follow-me/depth-loop.js";
import { findObject } from "./find-object/find-object.js";
import { ensureMemory } from "./memory.js";

const DEFAULT_DEPTH_TOPIC = "/camera/camera/depth/image_rect_raw";

/**
 * Names of memory tools — dispatched separately from ROS tools so they can
 * work without the Zenoh/ROS transport.
 */
export const MEMORY_TOOL_NAMES = new Set<string>([
  "memory_remember",
  "memory_recall",
  "memory_forget",
  "memory_status",
]);

/**
 * Tools that read purely from local config / filesystem and don't need the
 * ROS transport. The MCP server entry point uses this to skip
 * `ensureConnected()` so these tools work even when zenohd is down.
 *
 * Memory tools are included because they're cross-adapter local storage.
 * `ros2_list_capabilities` is included because it reads skill manifests.
 */
export const NO_TRANSPORT_TOOL_NAMES = new Set<string>([
  ...MEMORY_TOOL_NAMES,
  "ros2_list_capabilities",
  "ros2_list_robots",
  // ros2_find_robots_for can run config-only (no online filter); the
  // tool falls back to a transport-driven discovery only when the caller
  // passes online=true. See the handler for the precise branch.
  "ros2_find_robots_for",
  // mission_cancel / mission_pause / mission_resume only mutate the
  // in-process MissionRegistry — they never publish to ROS, so they
  // must work even when zenohd is down.
  "mission_cancel",
  "mission_pause",
  "mission_resume",
  // run_mission's *outer* call doesn't need transport — its handler
  // first compiles the goal (Phase 1.g, no transport) or validates
  // the mission shape, then per-step calls go through the transport
  // pool individually. Gating the outer call would block the planner
  // from surfacing compile errors when the transport is down (e.g. a
  // user asking "paint the wall" should get suggestions, not an
  // ECONNREFUSED).
  "run_mission",
]);

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
    name: "ros2_list_capabilities",
    description:
      "List the high-level capabilities (named verbs) this robot can perform — built-in verbs like drive_base / take_snapshot / measure_depth plus every capability declared by installed AgenticROS skills (e.g. follow_person, find_object). PREFER this over ros2_list_topics for high-level planning: capabilities are agent-meaningful verbs with typed inputs/outputs, not raw topic names. Returns one structured response listing every capability the robot supports right now.",
    inputSchema: {
      type: "object",
      properties: {
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used. Today every robot exposes the same capabilities, but this parameter is accepted so per-robot capability declarations can extend the registry without a schema change." },
      },
    },
  },
  {
    name: "ros2_list_robots",
    description:
      "List the robots this gateway knows about (id, name, ROS2 namespace, default camera topic) and which one is the active default. Use this FIRST when the user mentions multiple robots, asks 'which robots can you see?', or names a specific robot you haven't heard of. The returned `id` is what later tools (in upcoming iterations) will accept as a `robot_id` parameter — today there's a single active robot, but the field will scope per-tool calls in fleet deployments.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ros2_discover_robots",
    description:
      "Scan the ROS2 topic graph and report which robots are actually on the wire right now, classified against the gateway's configured robot list. Returns: (1) every namespace inferred from `<ns>/cmd_vel` topics, with a topicCount that says how many corroborating topics live under that namespace, (2) configured_online — configured robots currently publishing, (3) configured_offline — configured robots that are silent, (4) unknown_detected — robots on the wire that aren't in config yet (candidates to add via the CLI / config UI). Use this when the user asks 'which robots are online right now', 'is my robot connected', or wants to find a robot that isn't in ros2_list_robots. Requires the ROS transport to be connected.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ros2_find_robots_for",
    description:
      "Find the robots in the configured fleet that match a capability + kind + online filter, ranked best-first. PREFER this over ros2_list_robots whenever the user names a verb ('which robot can find a chair', 'do I have an arm robot that can grasp', 'is there an AMR online that can follow a person'). Capability matches the verbs from ros2_list_capabilities — by default robots inherit the gateway-wide registry; declaring per-robot capabilities in config narrows it. Kind matches robot.kind exactly ('amr' | 'arm' | 'drone' | 'rover'). When online=true, only currently-reachable robots are returned (uses the same `<ns>/cmd_vel` heuristic as ros2_discover_robots and requires the transport). The result lists matched robots with id/name/namespace/kind/sensors/online flag, ranked so explicit capability declarations + online robots come first.",
    inputSchema: {
      type: "object",
      properties: {
        capability: {
          type: "string",
          description:
            "Capability id to match (e.g. 'follow_person', 'find_object', 'drive_base'). Case-sensitive — use ros2_list_capabilities to get the exact list.",
        },
        kind: {
          type: "string",
          description:
            "Robot kind filter (case-insensitive exact match). Common values: 'amr', 'arm', 'drone', 'rover'.",
        },
        online: {
          type: "boolean",
          description:
            "When true, only return robots currently reachable on the ROS2 graph (requires the transport to be connected). When false, only return robots NOT reachable. When omitted, online status is annotated on every match but doesn't filter the list.",
        },
      },
    },
  },
  {
    name: "ros2_publish",
    description:
      "Publish a message to a ROS2 topic. Use this to send commands to the robot (e.g., velocity commands to /cmd_vel, navigation goals). Pass robot_id (from ros2_list_robots) to target a specific robot in a multi-robot deployment; omitted = active robot.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The ROS2 topic name (e.g., '/cmd_vel')" },
        type: { type: "string", description: "The ROS2 message type (e.g., 'geometry_msgs/msg/Twist')" },
        message: { type: "object", description: "The message payload matching the ROS2 message type schema" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["topic", "type", "message"],
    },
  },
  {
    name: "ros2_subscribe_once",
    description:
      "Subscribe to a ROS2 topic and return the next message. Use this to read sensor data, check robot state, or get the current value of a topic. Pass robot_id to target a specific robot.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The ROS2 topic name (e.g., '/battery_state')" },
        type: { type: "string", description: "The ROS2 message type (optional)" },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 5000)" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["topic"],
    },
  },
  {
    name: "ros2_service_call",
    description:
      "Call a ROS2 service and return the response. Use for request/response operations like setting parameters or querying node state. Pass robot_id to target a specific robot.",
    inputSchema: {
      type: "object",
      properties: {
        service: { type: "string", description: "The ROS2 service name (e.g., '/spawn_entity')" },
        type: { type: "string", description: "The ROS2 service type (optional)" },
        args: { type: "object", description: "The service request arguments" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["service"],
    },
  },
  {
    name: "ros2_action_goal",
    description:
      "Send a goal to a ROS2 action server. Use for long-running operations like navigation or arm movements. Pass robot_id to target a specific robot.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "The ROS2 action server name (e.g., '/navigate_to_pose')" },
        actionType: { type: "string", description: "The ROS2 action type (e.g., 'nav2_msgs/action/NavigateToPose')" },
        goal: { type: "object", description: "The action goal parameters" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["action", "actionType", "goal"],
    },
  },
  {
    name: "ros2_param_get",
    description: "Get the value of a ROS2 parameter from a node. Use to check robot configuration values. Pass robot_id to target a specific robot.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "The fully qualified node name (e.g., '/turtlebot3/controller')" },
        parameter: { type: "string", description: "The parameter name (e.g., 'max_velocity')" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["node", "parameter"],
    },
  },
  {
    name: "ros2_param_set",
    description: "Set the value of a ROS2 parameter on a node. Use to change robot configuration at runtime. Pass robot_id to target a specific robot.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "The fully qualified node name" },
        parameter: { type: "string", description: "The parameter name" },
        value: { type: "object", description: "The new parameter value" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["node", "parameter", "value"],
    },
  },
  {
    name: "ros2_camera_snapshot",
    description:
      "Capture a single image from a ROS2 camera topic. Use when the user asks what the robot sees or requests a photo. Supports CompressedImage and raw Image. Pass robot_id to capture from a specific robot's camera; the per-robot default cameraTopic is used when no topic is given.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Camera image topic (default from the robot's cameraTopic in ~/.agenticros/config.json). Run ros2 topic list and match your driver." },
        message_type: { type: "string", description: "'CompressedImage' (JPEG topics, names often contain /compressed) or 'Image' for raw sensor_msgs/Image—required if there is no compressed topic." },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 10000)" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
    },
  },
  {
    name: "ros2_depth_distance",
    description:
      "Get distance in meters from the robot's depth camera. Samples the center of the depth image. Use when the user asks how far they are from the robot. Pass robot_id to sample a specific robot's depth camera.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: `Depth image topic (default: ${DEFAULT_DEPTH_TOPIC})` },
        timeout: { type: "number", description: "Timeout in ms (default 5000)" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
    },
  },
  {
    name: "ros2_follow_me_start",
    description:
      "Start the follow-me skill — the robot follows a person. Optional target description to lock onto a specific person; otherwise follows the closest. Modes: 'depth' (default) runs an in-process depth-only loop in the MCP server (no neural net, no model file, just RealSense depth — drives toward the closest blob in [0.5, 4.0] m); 'node' sends a command to the agenticros_follow_me ROS2 node running on the robot; 'local' runs an in-process YOLOv8n loop (requires yolov8n.onnx, ~8 Hz). Pass robot_id (from ros2_list_robots) to start follow-me on a specific robot in a multi-robot deployment; each robot keeps its own independent follow loop.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          description: "'depth' (default) for the in-process depth-only loop, 'node' for the ROS2 node, or 'local' for the in-process YOLO loop.",
        },
        target_description: {
          type: "string",
          description: "Optional description of the person to follow (e.g., 'person in red shirt'). Empty = follow closest. Note: depth mode ignores this — it always follows the closest object.",
        },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
    },
  },
  {
    name: "ros2_follow_me_stop",
    description: "Stop the follow-me skill. Robot will stop sending follow velocity commands. Pass mode='local' for the YOLO loop or mode='depth' for the depth-only loop. Pass robot_id to stop a specific robot; omitted = active robot.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "'depth' (default), 'node', or 'local'." },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
    },
  },
  {
    name: "ros2_follow_me_status",
    description:
      "Read the current follow-me status (enabled, tracking, target distance, persons detected). For mode='node' returns the latest message from follow_me/status; for mode='depth' or 'local' returns the in-process loop status. Pass robot_id to read a specific robot's status; omitted = active robot.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "'depth' (default), 'node', or 'local'." },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 3000). Only used for mode='node'." },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
    },
  },
  {
    name: "ros2_follow_me_set_distance",
    description: "Set the follow-me target distance in meters. Clamped server-side to [0.2, 5.0]. Pass robot_id to target a specific robot's loop; omitted = active robot.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "'depth' (default), 'node', or 'local'." },
        distance: { type: "number", description: "Target distance in meters (0.2 to 5.0)" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["distance"],
    },
  },
  {
    name: "ros2_follow_me_set_target",
    description:
      "Lock the follow-me tracker onto a person described by text. Locks onto the closest visible person and stores the description for future re-identification. Pass robot_id to target a specific robot's loop; omitted = active robot.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "'depth' (default), 'node', or 'local'." },
        description: { type: "string", description: "Description of the person to follow" },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["description"],
    },
  },
  {
    name: "memory_remember",
    description:
      "Store a durable fact in long-term memory. Call this when the user says \"remember that ...\", \"note that ...\", \"from now on ...\", or shares a stable personal fact (preferences, names, places, routines, robot hardware like the camera/eyes the robot has). The store is shared across all AgenticROS adapters talking to this robot (OpenClaw, Claude Desktop, Claude Code, Gemini). Do NOT auto-store chat transcripts or transient state. Namespace defaults to the robot namespace. Only available when memory is enabled in config.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The fact to remember, written as a self-contained sentence." },
        tags: { type: "array", description: "Optional list of tag strings for filtering later (e.g. ['preference', 'speed'])." },
        path: { type: "string", description: "Optional hierarchical hint (e.g. 'preferences.movement.speed')." },
        namespace: { type: "string", description: "Optional namespace override; defaults to the robot namespace." },
      },
      required: ["content"],
    },
  },
  {
    name: "memory_recall",
    description:
      "Semantic search of long-term memory. ALWAYS call this BEFORE answering a personal-context question, including: \"what do I have for X?\", \"what's my Y?\", \"where is the Z?\", \"what did I tell you about ...?\", \"do you remember ...?\". The store is shared across every adapter for this robot — a fact saved from Claude Desktop or Claude Code lives in the same store. Returns the top matches ranked by relevance. Only available when memory is enabled in config.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text query describing what you want to recall." },
        limit: { type: "number", description: "Max number of matches to return (default 5)." },
        namespace: { type: "string", description: "Optional namespace override; defaults to the robot namespace." },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_forget",
    description:
      "Delete memories. Provide either an `id` (delete one), a `query` (delete all matches in the namespace), or just `namespace` (delete every memory in that namespace). Use sparingly — irreversible.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Record id (returned by memory_remember)." },
        query: { type: "string", description: "Free-text query; deletes every matching memory in the namespace." },
        namespace: { type: "string", description: "Namespace to delete from (defaults to the robot namespace)." },
      },
    },
  },
  {
    name: "memory_status",
    description:
      "One-call health check for the memory subsystem. Returns whether memory is enabled, which backend is active, how many memories exist for the current namespace, the last write timestamp, and the embedder configuration when applicable.",
    inputSchema: {
      type: "object",
      properties: {
        namespace: { type: "string", description: "Optional namespace override; defaults to the robot namespace." },
      },
    },
  },
  {
    name: "ros2_find_object",
    description:
      "Rotate the robot in place (clockwise by default) until a target object is detected by YOLOv8n in the camera feed, then stop. Target must be a COCO class name (e.g., 'cell phone', 'chair', 'bottle', 'cup', 'laptop'). Returns whether the object was found, its confidence, bounding box, and horizontal offset from image center (-1=left edge, 0=center, +1=right edge). Pass robot_id (from ros2_list_robots) to scan with a specific robot's camera; omitted = active robot.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description:
            "COCO class name to search for (e.g., 'cell phone', 'chair', 'bottle').",
        },
        angular_speed: {
          type: "number",
          description: "Rotation speed in rad/s (default 0.3). Clamped to safety.maxAngularVelocity.",
        },
        clockwise: {
          type: "boolean",
          description: "Rotate clockwise (default true). Set false for counterclockwise.",
        },
        timeout_seconds: {
          type: "number",
          description: "Give up after this many seconds (default 30).",
        },
        min_confidence: {
          type: "number",
          description: "Minimum detection confidence to accept (default 0.5).",
        },
        robot_id: { type: "string", description: "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used." },
      },
      required: ["target"],
    },
  },
  {
    name: "run_mission",
    description:
      "Execute a multi-step mission by chaining capabilities (the verbs returned by ros2_list_capabilities). PASS EITHER a natural-language `goal` (recommended for simple verbs like 'find a chair', 'take a picture', 'follow me', 'find a chair and drive toward it') AND/OR an explicit `mission.steps[]` plan when you need precise control. Steps run sequentially; each step's outputs are available to later steps via {{stepId.outputs.fieldName}} template references. Returns a per-step result list, a summary line, a mission_id you can pass to mission_cancel to abort mid-run, and (when a goal was provided) the compiled plan + candidate match list so you can see what the planner did. When memory is enabled, every step is also written to the shared memory under namespace mission:<mission_id> so a second agent can recall the timeline via memory_recall. Today the runner supports: drive_base, take_snapshot, measure_depth, list_topics, publish_topic, subscribe_once, follow_person, find_object. Pass mission.robot_id (or robot_id at the top level when using goal) to target every step at one robot.",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description:
            "Natural-language goal — the local planner compiles it into a mission against the capability registry. Examples: 'find a chair', 'find a chair and drive toward it', 'take a picture', 'follow me', 'measure depth', 'drive forward at 0.3 m/s', 'turn left', 'stop'. Either goal OR mission must be provided; if both are given, mission takes precedence (goal is then ignored).",
        },
        mission: {
          type: "object",
          description:
            'Declarative mission plan. Shape: { name?: string, goal?: string, robot_id?: string, steps: [{ id: string, capability: string, inputs?: object, on_fail?: "stop"|"continue" }] }. mission.robot_id (from ros2_list_robots) is the default robot for every step; individual steps can override via inputs.robot_id. Example: { "name": "find then approach chair", "robot_id": "robotA", "steps": [{ "id": "find", "capability": "find_object", "inputs": { "target": "chair" } }, { "id": "go", "capability": "drive_base", "inputs": { "linear_x": 0.2, "angular_z": "{{find.outputs.horizontal_offset}}" } }] }',
        },
        robot_id: {
          type: "string",
          description: "Optional robot id (from ros2_list_robots) — used when 'goal' is provided to scope every compiled step to one robot.",
        },
      },
    },
  },
  {
    name: "mission_cancel",
    description:
      "Cancel a mission that's currently running in this MCP server. Pass the mission_id returned by run_mission. The mission runner stops at the next step boundary (the in-flight step finishes naturally), marks remaining steps as 'cancelled', and returns. If the mission has already finished (or the id is unknown), this is a no-op that returns found=false. Optional 'reason' is recorded in the cancelled step results for traceability.",
    inputSchema: {
      type: "object",
      properties: {
        mission_id: {
          type: "string",
          description: "The mission_id echoed by run_mission. Required.",
        },
        reason: {
          type: "string",
          description: "Optional free-text reason — surfaced in the cancelled mission result.",
        },
      },
      required: ["mission_id"],
    },
  },
  {
    name: "mission_pause",
    description:
      "Pause a mission that's currently running in this MCP server. Pass the mission_id returned by run_mission. The runner waits at the next step boundary until mission_resume (or mission_cancel). Idempotent if already paused.",
    inputSchema: {
      type: "object",
      properties: {
        mission_id: {
          type: "string",
          description: "The mission_id echoed by run_mission. Required.",
        },
        reason: {
          type: "string",
          description: "Optional free-text reason — surfaced in the paused transcript entry.",
        },
      },
      required: ["mission_id"],
    },
  },
  {
    name: "mission_resume",
    description:
      "Resume a mission previously paused with mission_pause. Pass the mission_id returned by run_mission. Idempotent if the mission is not paused.",
    inputSchema: {
      type: "object",
      properties: {
        mission_id: {
          type: "string",
          description: "The mission_id echoed by run_mission. Required.",
        },
      },
      required: ["mission_id"],
    },
  },
];

export type ToolContent = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

function followMeMode(args: Record<string, unknown>): "node" | "local" | "depth" {
  const raw = String(args["mode"] ?? "depth").toLowerCase().trim();
  if (raw === "local") return "local";
  if (raw === "depth") return "depth";
  return "node";
}

async function publishFollowMeCmd(
  config: AgenticROSConfig,
  robot: ResolvedRobot,
  payload: Record<string, unknown>,
): Promise<{ topic: string; payload: Record<string, unknown> }> {
  // Route through the per-robot pool so a robot with a custom transport
  // override (e.g. zenoh-on-router) gets its own connection while
  // single-transport deployments still share `__global__`.
  const transport = await getTransportForRobot(config, robot);
  if (transport.getStatus() !== "connected") {
    throw new Error(
      "Transport not connected. Check zenohd (ws://localhost:10000) and config in ~/.agenticros/config.json.",
    );
  }
  const topic = toNamespacedTopicFull(robot.namespace, "/follow_me/cmd");
  const data = JSON.stringify(payload);
  const PUBLISH_TIMEOUT_MS = 5_000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Publish to ${topic} timed out after ${PUBLISH_TIMEOUT_MS / 1000}s`)),
      PUBLISH_TIMEOUT_MS,
    );
  });
  await Promise.race([
    transport.publish({ topic, type: "std_msgs/msg/String", msg: { data } }),
    timeoutPromise,
  ]);
  return { topic, payload };
}

/**
 * Format the capability list for tool responses — shared by claude-code,
 * OpenClaw, and Gemini so every adapter returns the same JSON shape.
 */
function formatCapabilitiesResponse(
  caps: Array<Capability & { discoverable?: boolean; installed?: boolean; install_ref?: string }>,
): string {
  const intrinsic = caps.filter((c) => c.source?.kind === "builtin").length;
  const skill = caps.filter((c) => c.installed !== false && c.source?.kind === "skill").length;
  const discoverable = caps.filter((c) => c.discoverable === true).length;
  return JSON.stringify({
    success: true,
    total: caps.length,
    intrinsic_count: intrinsic,
    skill_count: skill,
    discoverable_count: discoverable,
    capabilities: caps,
  });
}

/**
 * Convert an unknown-robot_id error from resolveRobotFromArgs into a
 * tool-level error response. The error message already lists known ids
 * and recommends ros2_list_robots, so the agent has everything it
 * needs to recover without us re-formatting.
 */
function robotResolveError(err: unknown): { content: ToolContent[]; isError: true } {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: message }], isError: true };
}

/**
 * Format the robot list for tool responses — shared by claude-code,
 * OpenClaw, and Gemini so every adapter returns the same JSON shape.
 */
function formatRobotsResponse(robots: ResolvedRobot[], activeId: string): string {
  return JSON.stringify({
    success: true,
    total: robots.length,
    active_robot_id: activeId,
    robots,
  });
}

/**
 * Render the find_robots_for result as a single LLM-friendly JSON
 * payload. We flatten each `FindRobotsForMatch` so the agent doesn't
 * have to dig through `.robot.*` to read id/name/namespace — those are
 * the fields it'll pass to the next tool call.
 */
function formatFindRobotsForResponse(result: FindRobotsForResult): string {
  return JSON.stringify({
    success: true,
    query: result.query,
    total: result.total,
    robots: result.robots.map((m) => ({
      id: m.robot.id,
      name: m.robot.name,
      namespace: m.robot.namespace,
      kind: m.robot.kind,
      sensors: m.robot.sensors,
      capabilities: m.robot.capabilities ?? null,
      cameraTopic: m.robot.cameraTopic,
      online: m.online,
      matched_capability_explicitly: m.matched_capability_explicitly,
      score: m.score,
    })),
  });
}

/**
 * Phase 1.f — `mission_cancel` handler. Lives at module scope so the
 * outer `handleToolCall` can invoke it WITHOUT first resolving a
 * transport (the cancel never touches ROS — see the registry note in
 * `mission-registry.ts`).
 */
function handleMissionCancel(
  args: Record<string, unknown>,
): { content: ToolContent[]; isError?: boolean } {
  const missionId = typeof args["mission_id"] === "string" ? args["mission_id"].trim() : "";
  if (!missionId) {
    return {
      content: [
        {
          type: "text",
          text: "mission_cancel requires 'mission_id' (a non-empty string returned by run_mission).",
        },
      ],
      isError: true,
    };
  }
  const reason = typeof args["reason"] === "string" ? args["reason"] : undefined;
  const outcome = getMissionRegistry().cancel(missionId, reason);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          mission_id: missionId,
          found: outcome.found,
          already_cancelled: outcome.alreadyCancelled,
          reason: reason ?? null,
        }),
      },
    ],
  };
}

function handleMissionPause(
  args: Record<string, unknown>,
): { content: ToolContent[]; isError?: boolean } {
  const missionId = typeof args["mission_id"] === "string" ? args["mission_id"].trim() : "";
  if (!missionId) {
    return {
      content: [
        {
          type: "text",
          text: "mission_pause requires 'mission_id' (a non-empty string returned by run_mission).",
        },
      ],
      isError: true,
    };
  }
  const reason = typeof args["reason"] === "string" ? args["reason"] : undefined;
  const outcome = getMissionRegistry().pause(missionId, reason);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          mission_id: missionId,
          found: outcome.found,
          already_paused: outcome.alreadyPaused,
          reason: reason ?? null,
        }),
      },
    ],
  };
}

function handleMissionResume(
  args: Record<string, unknown>,
): { content: ToolContent[]; isError?: boolean } {
  const missionId = typeof args["mission_id"] === "string" ? args["mission_id"].trim() : "";
  if (!missionId) {
    return {
      content: [
        {
          type: "text",
          text: "mission_resume requires 'mission_id' (a non-empty string returned by run_mission).",
        },
      ],
      isError: true,
    };
  }
  const outcome = getMissionRegistry().resume(missionId);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          mission_id: missionId,
          found: outcome.found,
          was_paused: outcome.wasPaused,
        }),
      },
    ],
  };
}

/**
 * Phase 1.c + 1.f + 1.g — `run_mission` handler. Lives at module scope
 * so the outer `handleToolCall` can short-circuit BEFORE
 * `getTransportForRobot()` (the per-step dispatcher resolves transport
 * tool-by-tool; the outer call must not). Accepts either an explicit
 * `mission.steps[]` plan OR a natural-language `goal` (compiled via
 * the local rule-based planner).
 */
async function handleRunMission(
  args: Record<string, unknown>,
  config: AgenticROSConfig,
): Promise<{ content: ToolContent[]; isError?: boolean }> {
  const caps = listAllCapabilities(config);
  const missionArg = args["mission"];
  const goalArg = args["goal"];
  const topLevelRobotId = typeof args["robot_id"] === "string" ? (args["robot_id"] as string) : undefined;

  // Phase 1.g — when no explicit mission is provided, compile from
  // the natural-language goal. We surface the planner's candidates
  // + suggestions in the response so the agent can self-correct on
  // a failed compile without a second round-trip.
  let mission: Mission;
  let plannerInfo:
    | { compiled_from_goal: string; candidates: unknown[]; unmatched_verbs?: string[] }
    | undefined;
  if (missionArg && typeof missionArg === "object" && !Array.isArray(missionArg)) {
    mission = missionArg as Mission;
    if (!Array.isArray(mission.steps)) {
      return {
        content: [{ type: "text", text: "mission.steps must be an array of step objects." }],
        isError: true,
      };
    }
  } else if (typeof goalArg === "string" && goalArg.trim().length > 0) {
    const planned = compileGoalToMission(goalArg, caps, { robot_id: topLevelRobotId });
    if (!planned.mission) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: planned.error,
              goal: goalArg,
              suggestions: planned.suggestions,
              ...(planned.unmatched_verbs ? { unmatched_verbs: planned.unmatched_verbs } : {}),
            }),
          },
        ],
        isError: true,
      };
    }
    mission = planned.mission;
    plannerInfo = {
      compiled_from_goal: goalArg,
      candidates: planned.candidates,
      ...(planned.unmatched_verbs ? { unmatched_verbs: planned.unmatched_verbs } : {}),
    };
  } else {
    return {
      content: [
        {
          type: "text",
          text: 'run_mission requires either "mission" (object with steps[]) or "goal" (natural-language string). Pass at least one.',
        },
      ],
      isError: true,
    };
  }
  if (typeof mission.robot_id === "string" && mission.robot_id.trim().length > 0) {
    try {
      resolveRobotFromArgs(config, { robot_id: mission.robot_id });
    } catch (err) {
      return robotResolveError(err);
    }
  }
  const dispatcher: MissionToolDispatcher = async (toolName, toolArgs, ctx) => {
    if (isExternalToolName(toolName)) {
      const capId = capabilityIdFromExternalTool(toolName);
      const cap = caps.find((c) => c.id === capId);
      if (!cap) {
        return {
          text: `Unknown external capability "${capId}".`,
          isError: true,
        };
      }
      let robot;
      try {
        robot = resolveRobotFromArgs(config, toolArgs);
      } catch (err) {
        return {
          text: err instanceof Error ? err.message : String(err),
          isError: true,
        };
      }
      const transport = await getTransportForRobot(config, robot);
      const ext = await executeExternalCapability(cap, toolArgs, transport, {
        namespace: robot.namespace,
        signal: ctx?.signal,
      });
      return { text: ext.text, outputs: ext.outputs, isError: ext.isError };
    }
    const res = await handleToolCall(toolName, toolArgs, config, { signal: ctx?.signal });
    const text = res.content
      .map((c) => (c.type === "text" ? c.text : `[image: ${c.mimeType}]`))
      .join("\n");
    return { text, isError: res.isError };
  };

  const missionId = generateMissionId();
  const registry = getMissionRegistry();
  const { entry: regEntry, dispose: disposeRegistry } = registry.register(missionId, {
    name: mission.name,
  });

  const memory = await ensureMemory(config);
  const transcript = memory ? createMemoryTranscriptSink(memory, missionId) : undefined;

  let result;
  try {
    result = await runMission(mission, caps, buildMissionBindings(caps), dispatcher, {
      mission_id: missionId,
      cancellation: regEntry.cancellation,
      transcript,
      adapter: "claude-code",
    });
  } finally {
    disposeRegistry();
  }
  const compact = {
    status: result.status,
    mission_id: result.mission_id,
    ...(result.cancellation_reason ? { cancellation_reason: result.cancellation_reason } : {}),
    ...(transcript ? { transcript_namespace: missionTranscriptNamespace(missionId) } : {}),
    ...(plannerInfo ? { planner: plannerInfo } : {}),
    steps_run: result.steps_run,
    steps_total: result.steps_total,
    duration_ms: result.duration_ms,
    summary: result.summary,
    steps: result.steps.map((s) => ({
      id: s.id,
      capability: s.capability,
      status: s.status,
      inputs: s.inputs,
      outputs: s.outputs,
      ...(s.error ? { error: s.error } : {}),
      duration_ms: s.duration_ms,
    })),
  };
  return {
    content: [{ type: "text", text: `${result.summary}\n${JSON.stringify(compact)}` }],
    isError: result.status === "error",
  };
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  config: AgenticROSConfig,
  opts?: { signal?: AbortSignal },
): Promise<{ content: ToolContent[]; isError?: boolean }> {
  // Memory tools are self-contained — they never touch the ROS transport, so
  // dispatch them before getTransport() (which throws when zenohd is down).
  if (MEMORY_TOOL_NAMES.has(name)) {
    return handleMemoryToolCall(name, args, config);
  }
  // ros2_list_capabilities reads skill manifests + intrinsic verbs from
  // local config — no transport required. robot_id is accepted but
  // doesn't change today's response (every robot exposes the same
  // capabilities); we still validate it so an unknown id surfaces as a
  // tool error instead of being silently ignored.
  if (name === "ros2_list_capabilities") {
    try {
      resolveRobotFromArgs(config, args);
    } catch (err) {
      return robotResolveError(err);
    }
    const caps = await listCapabilitiesWithDiscoverable(config);
    return { content: [{ type: "text", text: formatCapabilitiesResponse(caps) }] };
  }
  // ros2_list_robots reads the multi-robot section of the config (with
  // legacy fallback) — no transport required either.
  if (name === "ros2_list_robots") {
    const robots = listRobots(config);
    const active = getActiveRobotId(config);
    return {
      content: [{ type: "text", text: formatRobotsResponse(robots, active) }],
    };
  }
  // ros2_find_robots_for is config-driven by default and only touches
  // the transport when the caller filters by online status. Putting it
  // here (above the unconditional transport resolution) lets agents
  // call it offline — useful for static-fleet planning and for the
  // CLI's `agenticros robots` family which reuses this MCP tool.
  if (name === "ros2_find_robots_for") {
    const cap = typeof args["capability"] === "string" ? args["capability"] : undefined;
    const kind = typeof args["kind"] === "string" ? args["kind"] : undefined;
    const online = typeof args["online"] === "boolean" ? args["online"] : undefined;
    let onlineIds: Set<string> | undefined;
    if (online !== undefined) {
      // Online filtering needs ONE live transport to list topics with.
      // The active robot's transport works fine here — discoverRobots()
      // operates on the global topic graph and doesn't care which
      // namespace we listed from.
      let activeRobot;
      try {
        activeRobot = resolveRobotFromArgs(config, {});
      } catch (err) {
        return robotResolveError(err);
      }
      const transport = await getTransportForRobot(config, activeRobot);
      if (transport.getStatus() !== "connected") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error:
                  "online filter requires the ROS transport to be connected. Drop the 'online' arg to run config-only, or check that zenohd / rosbridge is up.",
              }),
            },
          ],
        };
      }
      const topics = await transport.listTopics();
      const disc = discoverRobots(topics, config);
      onlineIds = new Set(disc.configured_online.map((r) => r.id));
    }
    try {
      const result = findRobotsFor(config, { capability: cap, kind, online }, onlineIds);
      return { content: [{ type: "text", text: formatFindRobotsForResponse(result) }] };
    } catch (e) {
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }) },
        ],
      };
    }
  }
  // mission_cancel / pause / resume + run_mission must NOT trigger a
  // transport connect at this outer layer.
  if (name === "mission_cancel") {
    return handleMissionCancel(args);
  }
  if (name === "mission_pause") {
    return handleMissionPause(args);
  }
  if (name === "mission_resume") {
    return handleMissionResume(args);
  }
  if (name === "run_mission") {
    return handleRunMission(args, config);
  }
  // Resolve target robot once for every transport-bound tool. Unknown
  // robot_id surfaces as a tool error (not a thrown exception) so the
  // LLM sees a clean self-correctable response.
  let robot;
  try {
    robot = resolveRobotFromArgs(config, args);
  } catch (err) {
    return robotResolveError(err);
  }
  // Per-robot transport pool: returns the shared `__global__` entry
  // when this robot has no override (the common case), OR materialises
  // a dedicated transport on first use when the robot declares its own
  // (e.g. one robot via local DDS + another via a zenoh router).
  const transport = await getTransportForRobot(config, robot);

  switch (name) {
    case "ros2_list_topics": {
      const topics = await transport.listTopics();
      const MAX = 50;
      const truncated = topics.length > MAX ? topics.slice(0, MAX) : topics;

      // Surface task-specific control hints so the agent (and any LLM
      // calling list_topics to figure out what's available) doesn't have to
      // memorise the topic surface for each demo. Cheap to compute and only
      // included when matching topics are actually present.
      const hints: Record<string, string> = {};
      const armJoints = topics
        .filter((t) => /^\/arm\/[a-z0-9_]+\/cmd_pos$/i.test(t.name))
        .map((t) => t.name.replace(/^\/arm\/(.+)\/cmd_pos$/, "$1"));
      if (armJoints.length > 0) {
        hints["arm"] =
          `Detected the AgenticROS sim arm (joints: ${armJoints.join(", ")}). ` +
          "To move a joint, call ros2_publish with topic '/arm/<joint>/cmd_pos', " +
          "type 'std_msgs/msg/Float64', message {data: <radians>}. " +
          "Example: rotate shoulder_pan 90 degrees left -> publish {data: 1.5707} " +
          "to /arm/shoulder_pan/cmd_pos. Listen to /joint_states (sensor_msgs/msg/JointState) " +
          "to read current positions.";
      }
      const baseTwistTopics = topics.filter(
        (t) => /\/cmd_vel$/.test(t.name) && t.type === "geometry_msgs/msg/Twist",
      );
      if (baseTwistTopics.length > 0) {
        hints["base"] =
          "To drive the base, publish geometry_msgs/msg/Twist to a cmd_vel topic. " +
          `Available cmd_vel topics: ${baseTwistTopics.map((t) => t.name).join(", ")}. ` +
          "When in sim mode the unnamespaced /cmd_vel is the one the simulator listens on.";
      }

      const text = JSON.stringify({
        success: true,
        topics: truncated,
        total: topics.length,
        truncated: topics.length > MAX,
        ...(Object.keys(hints).length > 0 ? { hints } : {}),
      });
      return { content: [{ type: "text", text }] };
    }

    case "ros2_discover_robots": {
      // Scan the live topic graph, then classify against the configured
      // robot list using the shared pure-function in @agenticros/core.
      // Discovery is read-only — nothing is written to config here. The
      // agent (or the CLI / config UI on top) decides whether to
      // promote an unknown_detected entry into config.robots[].
      const topics = await transport.listTopics();
      const result = discoverRobots(topics, config);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              total_topics: result.total_topics,
              detected: result.detected,
              configured_online: result.configured_online,
              configured_offline: result.configured_offline,
              unknown_detected: result.unknown_detected,
            }),
          },
        ],
      };
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
          : toNamespacedTopic(robot.namespace, rawTopicIn);
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
      const topic = toNamespacedTopic(robot.namespace, rawTopic);
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
      const service = toNamespacedTopic(robot.namespace, rawService);
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
      const action = toNamespacedTopic(robot.namespace, rawAction);
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
      const node = toNamespacedTopic(robot.namespace, rawNode);
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
      const node = toNamespacedTopic(robot.namespace, rawNode);
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
        (robot.cameraTopic ?? "").trim() || "/camera/camera/color/image_raw/compressed";
      const rawTopic = (args["topic"] as string | undefined) ?? defaultTopic;
      const topic = resolveCameraSubscribeTopic(robot.namespace, rawTopic);
      const rawMsgType = args["message_type"] as string | undefined;
      const messageType: "CompressedImage" | "Image" = rawMsgType === "Image" ? "Image" : "CompressedImage";
      const timeout = (args["timeout"] as number | undefined) ?? 10000;
      const type = messageType === "Image" ? ROS_MSG_IMAGE : ROS_MSG_COMPRESSED_IMAGE;

      try {
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text:
                `Camera snapshot failed: ${message}. Check robot.cameraTopic and transport in ~/.agenticros/config.json; try ros2_camera_snapshot with topic=<exact topic from ros2 topic list> and message_type=Image if you only have raw Image (not /compressed).`,
            },
          ],
          isError: true,
        };
      }
    }

    case "ros2_depth_distance": {
      const rawTopic = (args["topic"] as string | undefined)?.trim() || DEFAULT_DEPTH_TOPIC;
      const topic = resolveCameraSubscribeTopic(robot.namespace, rawTopic);
      const timeout = (args["timeout"] as number | undefined) ?? 5000;
      try {
        const result = await getDepthDistance(transport, topic, timeout);
        const text = result.valid
          ? `Distance at center (~12th percentile, nearer surfaces): **${result.distance_m} m** (median: ${result.median_m} m; range ${result.min_m}–${result.max_m} m; ${result.sample_count} pixels). Topic: ${result.topic}.`
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

    case "ros2_follow_me_start": {
      const mode = followMeMode(args);
      const desc = String(args["target_description"] ?? "").trim();
      if (mode === "local") {
        if (transport.getStatus() !== "connected") {
          return {
            content: [{ type: "text", text: "Transport not connected. Check zenohd and config." }],
            isError: true,
          };
        }
        try {
          const loop = getFollowMeLocal(robot, config, transport);
          await loop.start({ targetDescription: desc || undefined });
          const text = `Follow-me (local) started on ${robot.id}${desc ? ` (target: ${desc})` : " (closest person)"}. Use ros2_follow_me_status with mode='local' to check tracking state.`;
          return { content: [{ type: "text", text }] };
        } catch (err) {
          return { content: [{ type: "text", text: `Follow-me local start failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
        }
      }
      if (mode === "depth") {
        if (transport.getStatus() !== "connected") {
          return {
            content: [{ type: "text", text: "Transport not connected. Check ROS2/transport and config." }],
            isError: true,
          };
        }
        try {
          const loop = getFollowMeDepth(robot, config, transport);
          await loop.start({ targetDescription: desc || undefined });
          const text = `Follow-me (depth-only) started on ${robot.id} — driving toward the closest blob in [0.5, 4.0] m. No person recognition; will follow whatever object is closest. Use ros2_follow_me_status with mode='depth' to check tracking state.`;
          return { content: [{ type: "text", text }] };
        } catch (err) {
          return { content: [{ type: "text", text: `Follow-me depth start failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
        }
      }
      try {
        const { topic } = await publishFollowMeCmd(config, robot, {
          action: "start",
          ...(desc ? { target: desc } : {}),
        });
        const text = `Follow-me start sent to ${topic}${desc ? ` (target: ${desc})` : " (closest person)"}. Use ros2_follow_me_status to verify the node received it.`;
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Follow-me start failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }

    case "ros2_follow_me_stop": {
      const mode = followMeMode(args);
      if (mode === "local") {
        try {
          const loop = getFollowMeLocal(robot, config, transport);
          await loop.stop();
          return { content: [{ type: "text", text: `Follow-me (local) stopped on ${robot.id}. cmd_vel zeroed.` }] };
        } catch (err) {
          return { content: [{ type: "text", text: `Follow-me local stop failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
        }
      }
      if (mode === "depth") {
        try {
          const loop = getFollowMeDepth(robot, config, transport);
          await loop.stop();
          return { content: [{ type: "text", text: `Follow-me (depth) stopped on ${robot.id}. cmd_vel zeroed.` }] };
        } catch (err) {
          return { content: [{ type: "text", text: `Follow-me depth stop failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
        }
      }
      try {
        const { topic } = await publishFollowMeCmd(config, robot, { action: "stop" });
        return { content: [{ type: "text", text: `Follow-me stop sent to ${topic}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Follow-me stop failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }

    case "ros2_follow_me_set_distance": {
      const distance = Number(args["distance"]);
      if (!Number.isFinite(distance)) {
        return { content: [{ type: "text", text: "distance must be a finite number" }], isError: true };
      }
      if (distance < 0.2 || distance > 5.0) {
        return { content: [{ type: "text", text: `distance ${distance} out of range [0.2, 5.0]` }], isError: true };
      }
      const mode = followMeMode(args);
      if (mode === "local") {
        getFollowMeLocal(robot, config, transport).setTargetDistance(distance);
        return { content: [{ type: "text", text: `Follow-me (local) target distance on ${robot.id} set to ${distance} m.` }] };
      }
      if (mode === "depth") {
        getFollowMeDepth(robot, config, transport).setTargetDistance(distance);
        return { content: [{ type: "text", text: `Follow-me (depth) target distance on ${robot.id} set to ${distance} m.` }] };
      }
      try {
        const { topic } = await publishFollowMeCmd(config, robot, { action: "set_distance", distance });
        return { content: [{ type: "text", text: `Follow-me set_distance=${distance} sent to ${topic}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Follow-me set_distance failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }

    case "ros2_follow_me_set_target": {
      const description = String(args["description"] ?? "").trim();
      if (!description) {
        return { content: [{ type: "text", text: "description is required" }], isError: true };
      }
      const mode = followMeMode(args);
      if (mode === "local") {
        getFollowMeLocal(robot, config, transport).setTargetDescription(description);
        return { content: [{ type: "text", text: `Follow-me (local) target description on ${robot.id} set: ${description}. (Note: local mode currently follows the largest person; description is recorded but not yet used for re-id.)` }] };
      }
      if (mode === "depth") {
        getFollowMeDepth(robot, config, transport).setTargetDescription(description);
        return { content: [{ type: "text", text: `Follow-me (depth) target description on ${robot.id} recorded: ${description}. (Depth mode has no semantic recognition; it always follows the closest blob.)` }] };
      }
      try {
        const { topic } = await publishFollowMeCmd(config, robot, { action: "set_target", description });
        return { content: [{ type: "text", text: `Follow-me set_target sent to ${topic} (description: ${description}).` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Follow-me set_target failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }

    case "ros2_follow_me_status": {
      const mode = followMeMode(args);
      if (mode === "local") {
        const status = getFollowMeLocal(robot, config, transport).status();
        return { content: [{ type: "text", text: JSON.stringify({ success: true, mode: "local", robot_id: robot.id, status }) }] };
      }
      if (mode === "depth") {
        const status = getFollowMeDepth(robot, config, transport).status();
        return { content: [{ type: "text", text: JSON.stringify({ success: true, mode: "depth", robot_id: robot.id, status }) }] };
      }
      const topic = toNamespacedTopicFull(robot.namespace, "/follow_me/status");
      const timeout = (args["timeout"] as number | undefined) ?? 3000;
      try {
        const message = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const sub = transport.subscribe(
            { topic, type: "std_msgs/msg/String" },
            (msg: Record<string, unknown>) => {
              clearTimeout(timer);
              sub.unsubscribe();
              resolve(msg);
            },
          );
          const timer = setTimeout(() => {
            sub.unsubscribe();
            reject(new Error(`Timeout waiting for status on ${topic} — is the agenticros_follow_me node running?`));
          }, timeout);
        });
        let parsed: unknown = null;
        const data = (message["data"] as string | undefined) ?? "";
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = null;
        }
        const text = JSON.stringify({ success: true, topic, status: parsed ?? data });
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Follow-me status failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }

    case "ros2_find_object": {
      if (transport.getStatus() !== "connected") {
        return {
          content: [{ type: "text", text: "Transport not connected to Zenoh/ROS2." }],
          isError: true,
        };
      }
      const target = String(args["target"] ?? "").trim();
      if (!target) {
        return { content: [{ type: "text", text: "Missing required argument: target" }], isError: true };
      }
      const result = await findObject(robot, config, transport, {
        target,
        angularSpeed: args["angular_speed"] as number | undefined,
        clockwise: args["clockwise"] as boolean | undefined,
        timeoutSeconds: args["timeout_seconds"] as number | undefined,
        minConfidence: args["min_confidence"] as number | undefined,
        signal: opts?.signal,
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
        content: [{ type: "text", text: summary + "\n" + JSON.stringify(result) }],
        isError: !!result.error && result.error !== "Cancelled",
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

/**
 * Dispatcher for the four memory_* tools. Kept separate from the ROS tool
 * switch because memory tools must work without the ROS transport (zenohd
 * may not be running on the agent host).
 */
async function handleMemoryToolCall(
  name: string,
  args: Record<string, unknown>,
  config: AgenticROSConfig,
): Promise<{ content: ToolContent[]; isError?: boolean }> {
  const memory = await ensureMemory(config);
  if (!memory) {
    return {
      content: [
        {
          type: "text",
          text:
            "Memory is not enabled. Set memory.enabled=true in ~/.agenticros/config.json (backend: 'local' for zero deps, 'mem0' for semantic search). See docs/memory.md.",
        },
      ],
      isError: true,
    };
  }
  const namespace = resolveMemoryNamespace(config, args["namespace"] as string | undefined);
  try {
    if (name === "memory_remember") {
      const content = String(args["content"] ?? "").trim();
      if (!content) {
        return { content: [{ type: "text", text: "memory_remember requires 'content'." }], isError: true };
      }
      const tags = Array.isArray(args["tags"]) ? (args["tags"] as unknown[]).map(String) : undefined;
      const pathHint = typeof args["path"] === "string" ? (args["path"] as string) : undefined;
      const record = await memory.remember({ content, namespace, tags, path: pathHint });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, id: record.id, namespace: record.namespace, backend: memory.backend }),
          },
        ],
      };
    }
    if (name === "memory_recall") {
      const query = String(args["query"] ?? "").trim();
      if (!query) {
        return { content: [{ type: "text", text: "memory_recall requires 'query'." }], isError: true };
      }
      const limit = typeof args["limit"] === "number" ? (args["limit"] as number) : 5;
      const hits = await memory.recall({ query, namespace, limit });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              namespace,
              backend: memory.backend,
              count: hits.length,
              results: hits,
            }),
          },
        ],
      };
    }
    if (name === "memory_forget") {
      const id = typeof args["id"] === "string" ? (args["id"] as string) : undefined;
      const query = typeof args["query"] === "string" ? (args["query"] as string) : undefined;
      const result = await memory.forget({ id, query, namespace });
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: true, ...result, namespace, backend: memory.backend }) },
        ],
      };
    }
    const status = await memory.status(namespace);
    return { content: [{ type: "text", text: JSON.stringify({ success: true, ...status }) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `${name} failed: ${message}` }], isError: true };
  }
}
