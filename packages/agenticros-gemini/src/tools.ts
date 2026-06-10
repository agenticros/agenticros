/**
 * Gemini function declarations and tool execution. Same ROS2 tool set as Claude Code.
 */

import type {
  AgenticROSConfig,
  Capability,
  CapabilityToolBindings,
  Mission,
  MissionToolDispatcher,
} from "@agenticros/core";
import {
  resolveCameraSubscribeTopic,
  resolveMemoryNamespace,
  toNamespacedTopic,
  listAllCapabilities,
  runMission,
  listRobots,
  getActiveRobotId,
  resolveRobotFromArgs,
  discoverRobots,
  findRobotsFor,
  type ResolvedRobot,
  generateMissionId,
  createMemoryTranscriptSink,
  missionTranscriptNamespace,
  MissionRegistry,
  compileGoalToMission,
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
import { getTransportForRobot } from "./transport.js";
import { checkPublishSafety } from "./safety.js";
import { getDepthDistance } from "./depth.js";
import { ensureMemory } from "./memory.js";

const MEMORY_TOOL_NAMES = new Set([
  "memory_remember",
  "memory_recall",
  "memory_forget",
  "memory_status",
]);

/**
 * Per-process mission registry — Phase 1.f. Each `run_mission`
 * invocation registers a fresh mission_id; a sibling `mission_cancel`
 * tool call looks it up and flips the cancellation token. Module scope
 * so independent tool dispatches share state. Mirrors the singleton
 * pattern used by the Claude Code MCP server and the OpenClaw plugin.
 */
const MISSION_REGISTRY = new MissionRegistry();

/**
 * Capability → MCP tool dispatch table for `run_mission` (Phase 1.c).
 * Mirrors the table in packages/agenticros-claude-code/src/tools.ts and
 * packages/agenticros/src/tools/ros2-mission.ts — all three adapters
 * agree on what each capability does.
 */
const MISSION_BINDINGS: CapabilityToolBindings = {
  drive_base: {
    tool: "ros2_publish",
    buildArgs: (inputs) => {
      const lx = Number(inputs.linear_x ?? 0) || 0;
      const az = Number(inputs.angular_z ?? 0) || 0;
      return {
        topic: "/cmd_vel",
        type: "geometry_msgs/msg/Twist",
        message: {
          linear: { x: lx, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: az },
        },
      };
    },
  },
  take_snapshot: {
    tool: "ros2_camera_snapshot",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = {};
      if (typeof inputs.topic === "string") out.topic = inputs.topic;
      if (typeof inputs.message_type === "string") out.message_type = inputs.message_type;
      if (typeof inputs.timeout === "number") out.timeout = inputs.timeout;
      return out;
    },
  },
  measure_depth: {
    tool: "ros2_depth_distance",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = {};
      if (typeof inputs.topic === "string") out.topic = inputs.topic;
      if (typeof inputs.timeout === "number") out.timeout = inputs.timeout;
      return out;
    },
  },
  list_topics: {
    tool: "ros2_list_topics",
    buildArgs: () => ({}),
  },
  publish_topic: {
    tool: "ros2_publish",
    buildArgs: (inputs) => ({
      topic: String(inputs.topic ?? ""),
      type: String(inputs.type ?? inputs.msg_type ?? ""),
      message: inputs.message ?? inputs.msg ?? {},
    }),
  },
  subscribe_once: {
    tool: "ros2_subscribe_once",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = { topic: String(inputs.topic ?? "") };
      if (typeof inputs.type === "string") out.type = inputs.type;
      if (typeof inputs.timeout === "number") out.timeout = inputs.timeout;
      return out;
    },
  },
  follow_person: {
    tool: "ros2_follow_me_start",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = {};
      if (typeof inputs.target_distance === "number") out.target_distance = inputs.target_distance;
      if (typeof inputs.mode === "string") out.mode = inputs.mode;
      return out;
    },
  },
  find_object: {
    tool: "ros2_find_object",
    buildArgs: (inputs) => {
      const target = String(inputs.target ?? "");
      const out: Record<string, unknown> = { target };
      if (typeof inputs.angular_speed === "number") out.angular_speed = inputs.angular_speed;
      if (typeof inputs.clockwise === "boolean") out.clockwise = inputs.clockwise;
      if (typeof inputs.timeout_seconds === "number") out.timeout_seconds = inputs.timeout_seconds;
      if (typeof inputs.min_confidence === "number") out.min_confidence = inputs.min_confidence;
      return out;
    },
  },
};

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

/**
 * Phase 1.d — schema fragment for an optional `robot_id` parameter,
 * spread into every transport-bound tool's properties object. The
 * description matches the claude-code and OpenClaw adapters so the
 * agent gets a consistent contract across hosts.
 */
const ROBOT_ID_PROP = {
  robot_id: {
    type: "string",
    description:
      "Optional robot id (from ros2_list_robots) to scope this call. When omitted, the active robot is used.",
  },
} as const;

/**
 * Resolve the target robot from a function-call's args. On success
 * returns `{ robot }`; on unknown id returns `{ error }` already
 * formatted as a Gemini tool result so the caller can pass it straight
 * back. The error message already lists known ids and recommends
 * ros2_list_robots, so the agent self-corrects.
 */
function resolveRobotForTool(
  config: AgenticROSConfig,
  args: Record<string, unknown>,
): { robot: ResolvedRobot } | { error: { output: string } } {
  try {
    return { robot: resolveRobotFromArgs(config, args) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: { output: msg } };
  }
}

export const GEMINI_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "ros2_list_topics",
    description: "List all available ROS2 topics and their message types. Use this to discover what data the robot publishes and what commands it accepts.",
    parametersJsonSchema: schemaFromProps({}),
  },
  {
    name: "ros2_list_capabilities",
    description:
      "List the high-level capabilities (named verbs) this robot can perform — built-in verbs like drive_base / take_snapshot / measure_depth plus every capability declared by installed AgenticROS skills (e.g. follow_person, find_object). PREFER this over ros2_list_topics for high-level planning: capabilities are agent-meaningful verbs with typed inputs/outputs, not raw topic names. Returns one structured response listing every capability the robot supports right now.",
    parametersJsonSchema: schemaFromProps({ ...ROBOT_ID_PROP }),
  },
  {
    name: "ros2_list_robots",
    description:
      "List the robots this gateway knows about (id, name, ROS2 namespace, default camera topic) and which one is the active default. Use this FIRST when the user mentions multiple robots, asks 'which robots can you see?', or names a specific robot you haven't heard of. The returned `id` is what other tools accept as a `robot_id` parameter.",
    parametersJsonSchema: schemaFromProps({}),
  },
  {
    name: "ros2_discover_robots",
    description:
      "Scan the ROS2 topic graph and report which robots are actually on the wire right now, classified against the gateway's configured robot list. Returns: (1) every namespace inferred from `<ns>/cmd_vel` topics, with topicCount per namespace, (2) configured_online — configured robots currently publishing, (3) configured_offline — configured robots that are silent, (4) unknown_detected — robots on the wire that aren't in config yet. Use this when the user asks 'which robots are online right now', 'is my robot connected', or wants to find a robot that isn't in ros2_list_robots. Requires the ROS transport to be connected.",
    parametersJsonSchema: schemaFromProps({}),
  },
  {
    name: "ros2_find_robots_for",
    description:
      "Find the robots in the configured fleet that match a capability + kind + online filter, ranked best-first. PREFER this over ros2_list_robots whenever the user names a verb ('which robot can find a chair', 'do I have an arm robot that can grasp', 'is there an AMR online that can follow a person'). Capability matches the verbs from ros2_list_capabilities — by default robots inherit the gateway-wide registry; declaring per-robot capabilities in config narrows it. Kind matches robot.kind exactly ('amr' | 'arm' | 'drone' | 'rover'). When online=true, only currently-reachable robots are returned (uses the same `<ns>/cmd_vel` heuristic as ros2_discover_robots and requires the transport). The result lists matched robots with id/name/namespace/kind/sensors/online flag, ranked so explicit capability declarations + online robots come first.",
    parametersJsonSchema: schemaFromProps({
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
          "When true, only return robots currently reachable on the ROS2 graph (requires the transport). When false, only return robots NOT reachable. When omitted, online status is annotated on every match but doesn't filter.",
      },
    }),
  },
  {
    name: "ros2_publish",
    description: "Publish a message to a ROS2 topic. Use this to send commands to the robot (e.g., velocity commands to /cmd_vel, navigation goals). Pass robot_id (from ros2_list_robots) to target a specific robot.",
    parametersJsonSchema: schemaFromProps(
      {
        topic: { type: "string", description: "The ROS2 topic name (e.g., '/cmd_vel')" },
        type: { type: "string", description: "The ROS2 message type (e.g., 'geometry_msgs/msg/Twist')" },
        message: { type: "object", description: "The message payload matching the ROS2 message type schema" },
        ...ROBOT_ID_PROP,
      },
      ["topic", "type", "message"],
    ),
  },
  {
    name: "ros2_subscribe_once",
    description: "Subscribe to a ROS2 topic and return the next message. Use this to read sensor data, check robot state, or get the current value of a topic. Pass robot_id to target a specific robot.",
    parametersJsonSchema: schemaFromProps({
      topic: { type: "string", description: "The ROS2 topic name (e.g., '/battery_state')" },
      type: { type: "string", description: "The ROS2 message type (optional)" },
      timeout: { type: "number", description: "Timeout in milliseconds (default: 5000)" },
      ...ROBOT_ID_PROP,
    }, ["topic"]),
  },
  {
    name: "ros2_service_call",
    description: "Call a ROS2 service and return the response. Use for request/response operations like setting parameters or querying node state. Pass robot_id to target a specific robot.",
    parametersJsonSchema: schemaFromProps({
      service: { type: "string", description: "The ROS2 service name (e.g., '/spawn_entity')" },
      type: { type: "string", description: "The ROS2 service type (optional)" },
      args: { type: "object", description: "The service request arguments" },
      ...ROBOT_ID_PROP,
    }, ["service"]),
  },
  {
    name: "ros2_action_goal",
    description: "Send a goal to a ROS2 action server. Use for long-running operations like navigation or arm movements. Pass robot_id to target a specific robot.",
    parametersJsonSchema: schemaFromProps(
      {
        action: { type: "string", description: "The ROS2 action server name (e.g., '/navigate_to_pose')" },
        actionType: { type: "string", description: "The ROS2 action type (e.g., 'nav2_msgs/action/NavigateToPose')" },
        goal: { type: "object", description: "The action goal parameters" },
        ...ROBOT_ID_PROP,
      },
      ["action", "actionType", "goal"],
    ),
  },
  {
    name: "ros2_param_get",
    description: "Get the value of a ROS2 parameter from a node. Use to check robot configuration values. Pass robot_id to target a specific robot.",
    parametersJsonSchema: schemaFromProps(
      {
        node: { type: "string", description: "The fully qualified node name (e.g., '/turtlebot3/controller')" },
        parameter: { type: "string", description: "The parameter name (e.g., 'max_velocity')" },
        ...ROBOT_ID_PROP,
      },
      ["node", "parameter"],
    ),
  },
  {
    name: "ros2_param_set",
    description: "Set the value of a ROS2 parameter on a node. Use to change robot configuration at runtime. Pass robot_id to target a specific robot.",
    parametersJsonSchema: schemaFromProps(
      {
        node: { type: "string", description: "The fully qualified node name" },
        parameter: { type: "string", description: "The parameter name" },
        value: { type: "object", description: "The new parameter value" },
        ...ROBOT_ID_PROP,
      },
      ["node", "parameter", "value"],
    ),
  },
  {
    name: "ros2_camera_snapshot",
    description: "Capture a single image from a ROS2 camera topic. Use when the user asks what the robot sees or requests a photo. Supports CompressedImage and raw Image. Pass robot_id to capture from a specific robot's camera.",
    parametersJsonSchema: schemaFromProps({
      topic: { type: "string", description: "Camera image topic (default from the robot's cameraTopic or /camera/camera/color/image_raw/compressed)" },
      message_type: { type: "string", description: "'CompressedImage' or 'Image' (default: CompressedImage)" },
      timeout: { type: "number", description: "Timeout in milliseconds (default: 10000)" },
      ...ROBOT_ID_PROP,
    }),
  },
  {
    name: "ros2_depth_distance",
    description: "Get distance in meters from the robot's depth camera. Samples the center of the depth image. Use when the user asks how far they are from the robot. Pass robot_id to sample a specific robot's depth camera.",
    parametersJsonSchema: schemaFromProps({
      topic: { type: "string", description: `Depth image topic (default: ${DEFAULT_DEPTH_TOPIC})` },
      timeout: { type: "number", description: "Timeout in ms (default 5000)" },
      ...ROBOT_ID_PROP,
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
  {
    name: "run_mission",
    description:
      "Execute a multi-step mission by chaining capabilities (the verbs returned by ros2_list_capabilities). PASS EITHER a natural-language `goal` (recommended for simple verbs like 'find a chair', 'take a picture', 'follow me', 'find a chair and drive toward it') OR an explicit `mission.steps[]` plan when you need precise control. Steps run sequentially; each step's outputs are available to later steps via {{stepId.outputs.fieldName}} template references. Default on_fail behaviour is 'stop' (abort on first error). Returns a per-step result list, a summary line, a mission_id you can pass to mission_cancel to abort mid-run, and (when a goal was provided) the compiled plan + candidate match list so you can see what the planner did. When memory is enabled, every step is also written to the shared memory under namespace mission:<mission_id> so a second agent can recall the timeline via memory_recall. Today the runner supports: drive_base, take_snapshot, measure_depth, list_topics, publish_topic, subscribe_once, follow_person, find_object. Pass mission.robot_id (or top-level robot_id with goal) to target every step at one robot.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description:
            "Natural-language goal — the local planner compiles it into a mission against the capability registry. Examples: 'find a chair', 'find a chair and drive toward it', 'take a picture', 'follow me', 'measure depth', 'drive forward at 0.3 m/s', 'turn left', 'stop'. Either goal or mission must be provided; mission wins if both are set.",
        },
        robot_id: {
          type: "string",
          description: "Optional robot id (from ros2_list_robots) — used when 'goal' is provided to scope every compiled step to one robot.",
        },
        mission: {
          type: "object",
          description:
            'Declarative mission plan: { name?: string, goal?: string, robot_id?: string, steps: [{ id: string, capability: string, inputs?: object, on_fail?: "stop"|"continue" }] }. mission.robot_id (from ros2_list_robots) is the default robot for every step; individual steps can override via inputs.robot_id. Example: { "name": "find then approach chair", "robot_id": "robotA", "steps": [{ "id": "find", "capability": "find_object", "inputs": { "target": "chair" } }, { "id": "go", "capability": "drive_base", "inputs": { "linear_x": 0.2, "angular_z": "{{find.outputs.horizontal_offset}}" } }] }',
        },
      },
    },
  },
  {
    name: "mission_cancel",
    description:
      "Cancel a mission that's currently running in this Gemini CLI process. Pass the mission_id returned by run_mission. The mission runner stops at the next step boundary (the in-flight step finishes naturally), marks remaining steps as 'cancelled', and returns. If the mission has already finished (or the id is unknown), this is a no-op that returns found=false. Optional 'reason' is recorded in the cancelled step results for traceability.",
    parametersJsonSchema: {
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
  // ros2_list_capabilities reads skill manifests + intrinsic verbs from
  // local config — no transport required. robot_id is accepted but
  // doesn't change today's response (every robot exposes the same
  // capabilities); we still validate it so unknown ids surface as a
  // clean tool error.
  if (name === "ros2_list_capabilities") {
    const resolved = resolveRobotForTool(config, args);
    if ("error" in resolved) return resolved.error;
    const caps: Capability[] = listAllCapabilities(config);
    const intrinsic = caps.filter((c) => c.source?.kind === "builtin").length;
    const skill = caps.filter((c) => c.source?.kind === "skill").length;
    return {
      output: JSON.stringify({
        success: true,
        total: caps.length,
        intrinsic_count: intrinsic,
        skill_count: skill,
        capabilities: caps,
      }),
    };
  }
  // ros2_list_robots reads the multi-robot section of the config (with
  // legacy fallback) — no transport required either.
  if (name === "ros2_list_robots") {
    const robots = listRobots(config);
    const active = getActiveRobotId(config);
    return {
      output: JSON.stringify({
        success: true,
        total: robots.length,
        active_robot_id: active,
        robots,
      }),
    };
  }
  // ros2_find_robots_for is config-driven by default. Only the
  // online=true|false branch touches the transport (same heuristic as
  // ros2_discover_robots). Stays above the unconditional transport
  // resolution so static-fleet planning works offline.
  if (name === "ros2_find_robots_for") {
    const cap = typeof args["capability"] === "string" ? args["capability"] : undefined;
    const kind = typeof args["kind"] === "string" ? args["kind"] : undefined;
    const online = typeof args["online"] === "boolean" ? args["online"] : undefined;
    let onlineIds: Set<string> | undefined;
    if (online !== undefined) {
      // Need any one live transport — use the active robot's. Errors
      // here surface as `success: false` so the model can recover.
      const resolved = resolveRobotForTool(config, {});
      if ("error" in resolved) return resolved.error;
      const transport = await getTransportForRobot(config, resolved.robot);
      if (transport.getStatus() !== "connected") {
        return {
          output: JSON.stringify({
            success: false,
            error:
              "online filter requires the ROS transport to be connected. Drop the 'online' arg to run config-only, or check that zenohd / rosbridge is up.",
          }),
        };
      }
      const topics = await transport.listTopics();
      const disc = discoverRobots(topics, config);
      onlineIds = new Set(disc.configured_online.map((r) => r.id));
    }
    try {
      const result = findRobotsFor(config, { capability: cap, kind, online }, onlineIds);
      return {
        output: JSON.stringify({
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
        }),
      };
    } catch (e) {
      return {
        output: JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : String(e),
        }),
      };
    }
  }
  // mission_cancel mutates only the in-process MissionRegistry and
  // must work without a ROS transport — keep it above the
  // unconditional transport resolution.
  if (name === "mission_cancel") {
    const missionId = typeof args["mission_id"] === "string" ? (args["mission_id"] as string).trim() : "";
    if (!missionId) {
      return {
        output: JSON.stringify({
          success: false,
          error: "mission_cancel requires 'mission_id' (a non-empty string returned by run_mission).",
        }),
      };
    }
    const reason = typeof args["reason"] === "string" ? (args["reason"] as string) : undefined;
    const outcome = MISSION_REGISTRY.cancel(missionId, reason);
    return {
      output: JSON.stringify({
        success: true,
        mission_id: missionId,
        found: outcome.found,
        already_cancelled: outcome.alreadyCancelled,
        reason: reason ?? null,
      }),
    };
  }
  // run_mission dispatches to other tools recursively — let each sub-tool
  // handle its own transport gating instead of requiring a connection up
  // front. Validate the input shape here; defer execution to runMission().
  if (name === "run_mission") {
    const caps = listAllCapabilities(config);
    const missionArg = args["mission"];
    const goalArg = args["goal"];
    const topLevelRobotId = typeof args["robot_id"] === "string" ? (args["robot_id"] as string) : undefined;

    // Phase 1.g — accept either an explicit mission OR a natural-language
    // goal. We surface the planner's candidates + suggestions in the
    // response so the agent can self-correct without an extra round-trip.
    let mission: Mission;
    let plannerInfo:
      | { compiled_from_goal: string; candidates: unknown[]; unmatched_verbs?: string[] }
      | undefined;
    if (missionArg && typeof missionArg === "object" && !Array.isArray(missionArg)) {
      mission = missionArg as Mission;
      if (!Array.isArray(mission.steps)) {
        return { output: "mission.steps must be an array of step objects." };
      }
    } else if (typeof goalArg === "string" && goalArg.trim().length > 0) {
      const planned = compileGoalToMission(goalArg, caps, { robot_id: topLevelRobotId });
      if (!planned.mission) {
        return {
          output: JSON.stringify({
            success: false,
            error: planned.error,
            goal: goalArg,
            suggestions: planned.suggestions,
            ...(planned.unmatched_verbs ? { unmatched_verbs: planned.unmatched_verbs } : {}),
          }),
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
        output:
          'run_mission requires either "mission" (object with steps[]) or "goal" (natural-language string). Pass at least one.',
      };
    }
    // Validate mission.robot_id up-front so the agent gets a single
    // clean error (with known ids) instead of one per step.
    if (typeof mission.robot_id === "string" && mission.robot_id.trim().length > 0) {
      const resolved = resolveRobotForTool(config, { robot_id: mission.robot_id });
      if ("error" in resolved) return resolved.error;
    }
    const dispatcher: MissionToolDispatcher = async (toolName, toolArgs) => {
      const sub = await executeTool(toolName, toolArgs, config);
      return { text: sub.output };
    };

    // Phase 1.f — register a mission_id so a sibling mission_cancel
    // call can flip the cancellation token; wire a transcript sink
    // when memory is enabled so a second agent can recall the timeline.
    const missionId = generateMissionId();
    const { entry: regEntry, dispose: disposeRegistry } = MISSION_REGISTRY.register(
      missionId,
      { name: mission.name },
    );
    const memory = await ensureMemory(config);
    const transcript = memory ? createMemoryTranscriptSink(memory, missionId) : undefined;

    let result;
    try {
      result = await runMission(mission, caps, MISSION_BINDINGS, dispatcher, {
        mission_id: missionId,
        cancellation: regEntry.cancellation,
        transcript,
        adapter: "gemini",
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
    return { output: `${result.summary}\n${JSON.stringify(compact)}` };
  }
  // Resolve target robot once for every transport-bound tool. Unknown
  // robot_id surfaces as a tool error (not a thrown exception).
  const resolvedRobot = resolveRobotForTool(config, args);
  if ("error" in resolvedRobot) return resolvedRobot.error;
  const { robot } = resolvedRobot;

  // Route through the per-robot pool: returns the shared `__global__`
  // when this robot has no override (the common case), OR a dedicated
  // transport on first use when the robot declares its own.
  const transport = await getTransportForRobot(config, robot);

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

    case "ros2_discover_robots": {
      // Live discovery: detect /<ns>/cmd_vel namespaces, classify
      // against config. Pure-function classifier in @agenticros/core
      // so all three adapters return the same shape.
      const topics = await transport.listTopics();
      const result = discoverRobots(topics, config);
      return {
        output: JSON.stringify({
          success: true,
          total_topics: result.total_topics,
          detected: result.detected,
          configured_online: result.configured_online,
          configured_offline: result.configured_offline,
          unknown_detected: result.unknown_detected,
        }),
      };
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
          : toNamespacedTopic(robot.namespace, rawTopicIn);
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
      return { output: text };
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
      return { output: text };
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
      return { output: text };
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
      return { output: text };
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
      return { output: text };
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
      const topic = resolveCameraSubscribeTopic(robot.namespace, rawTopic);
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
