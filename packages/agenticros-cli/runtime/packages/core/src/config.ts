import { z } from "zod";
import type { TransportConfig } from "./transport/types.js";

const IceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export const AgenticROSConfigSchema = z.object({
  transport: z
    .object({
      /**
       * Default is "local" — assumes the gateway is co-located with the robot
       * (Mode A: DDS direct via rclnodejs, no router). Switch to "rosbridge",
       * "zenoh", or "webrtc" when the gateway runs off-robot.
       */
      mode: z.enum(["rosbridge", "local", "webrtc", "zenoh"]).default("local"),
    })
    .default({}),

  zenoh: z
    .object({
      /** WebSocket URL for zenoh-ts (zenoh-plugin-remote-api). Not tcp/ — use e.g. ws://localhost:10000 */
      routerEndpoint: z.string().default("ws://localhost:10000"),
      domainId: z.number().default(0),
      /** "ros2dds" = zenoh-bridge-ros2dds key format (slashes kept). "rmw_zenoh" = rmw_zenoh key format (domain + %). */
      keyFormat: z.enum(["ros2dds", "rmw_zenoh"]).default("ros2dds"),
      /**
       * Must match zenoh-bridge-ros2dds `plugins.ros2dds.namespace` when it is not the default "/".
       * Example: bridge has `namespace: "/bot1"` → set `bridgeNamespace` to "/bot1" or "bot1".
       * Omit or use "/" when the bridge uses the default (only the ROS topic path is the zenoh key).
       */
      bridgeNamespace: z.string().optional(),
    })
    .default({}),

  rosbridge: z
    .object({
      url: z.string().default("ws://localhost:9090"),
      reconnect: z.boolean().default(true),
      reconnectInterval: z.number().default(3000),
    })
    .default({}),

  local: z
    .object({
      domainId: z.number().default(0),
    })
    .default({}),

  webrtc: z
    .object({
      signalingUrl: z.string().default(""),
      apiUrl: z.string().default(""),
      robotId: z.string().default(""),
      robotKey: z.string().default(""),
      iceServers: z
        .array(IceServerSchema)
        .default([{ urls: "stun:stun.l.google.com:19302" }]),
    })
    .default({}),

  robot: z
    .object({
      name: z.string().default("Robot"),
      namespace: z.string().default(""),
      /** Camera topic for "what do you see?" (e.g. /camera/camera/color/image_raw/compressed). If set, used as default in ros2_camera_snapshot and in context. */
      cameraTopic: z.string().default(""),
    })
    .default({}),

  /** Phase 3 teleop web app: camera + twist controls. */
  teleop: z
    .object({
      /** Default camera topic when only one source or as default selection. Falls back to robot.cameraTopic then RealSense default. */
      cameraTopic: z.string().default(""),
      /** Explicit list of camera sources for the selector; if empty, derived from listTopics() filtered by Image/CompressedImage. */
      cameraTopics: z
        .array(z.object({ topic: z.string(), label: z.string().optional() }))
        .default([]),
      /** cmd_vel topic override (default from robot namespace). */
      cmdVelTopic: z.string().default(""),
      /** Default linear speed (m/s) for teleop. */
      speedDefault: z.coerce.number().min(0).max(2).default(0.3),
      /** Camera poll interval in ms for the teleop page. */
      cameraPollMs: z.number().min(50).max(2000).default(150),
    })
    .default({}),

  safety: z
    .object({
      maxLinearVelocity: z.number().default(1.0),
      maxAngularVelocity: z.number().default(1.5),
      workspaceLimits: z
        .object({
          xMin: z.number().default(-10),
          xMax: z.number().default(10),
          yMin: z.number().default(-10),
          yMax: z.number().default(10),
        })
        .default({}),
    })
    .default({}),

  /**
   * Optional in-plugin image describer.
   *
   * When the primary chat model is text-only (e.g. Ollama qwen2.5:7b),
   * OpenClaw filters image content blocks out of tool results before the
   * LLM ever sees them, so `ros2_camera_snapshot` cannot be described.
   * Configuring an OpenAI-compatible chat completions endpoint here lets
   * the plugin call a vision model itself and embed the description text
   * directly in the snapshot tool result.
   *
   * Recommended Jetson setup: point at local Ollama with a VL model:
   *   url: "http://host.docker.internal:11434/v1/chat/completions"
   *   model: "qwen2.5vl:7b"
   *
   * If `enabled: false`, the snapshot result includes only the camera URL
   * and the agent is on its own (suitable when the primary model is
   * multimodal and OpenClaw does not need to filter images).
   */
  describer: z
    .object({
      enabled: z.boolean().default(false),
      /** OpenAI-compat chat completions endpoint URL. */
          url: z
            .string()
            // host.openshell.internal:11435 is the nemoclaw ollama-auth-proxy
            // bound to the docker bridge — it's the ONLY way to reach the
            // host's Ollama from a NemoClaw sandbox. Two reasons:
            //   1. The default Ollama daemon binds 127.0.0.1:11434 on the
            //      host, which is not reachable from the bridge.
            //   2. The built-in `local-inference` policy permits POST to
            //      host.openshell.internal:11435 (and 11434/8000) but the
            //      OPA proxy will refuse a forward to any other port.
            // The auth-proxy requires `Authorization: Bearer <token>` from
            // ~/.nemoclaw/ollama-proxy-token — set ``describer.apiKey``.
            .default("http://host.openshell.internal:11435/v1/chat/completions"),
      /** Optional Bearer token / API key for the endpoint. */
      apiKey: z.string().optional(),
      /** Vision model id (must accept OpenAI `image_url` content blocks). */
      model: z.string().default("qwen2.5vl:7b"),
      /** Prompt sent alongside the image. */
      prompt: z
        .string()
        .default(
          "Describe what is visible in this camera frame from a mobile robot. " +
            "Focus on the physical scene: objects, materials, layout, colors, lighting, distances. " +
            "Be concrete and specific. Do not speculate or add detail you cannot see.",
        ),
      /** Max tokens for the description. */
      maxTokens: z.number().int().min(50).max(2048).default(400),
      /** Request timeout in ms. */
      timeoutMs: z.number().int().min(1000).max(180000).default(60000),
      /**
       * Resize images larger than this max dimension before sending to the
       * VL model. Reduces token usage and latency. Set to 0 to disable.
       */
      maxImageDimension: z.number().int().min(0).max(4096).default(896),
    })
    .default({}),

  /**
   * Optional cross-adapter semantic memory subsystem.
   *
   * When `enabled: true`, OpenClaw, Claude Code, and Gemini adapters all
   * register four memory tools (memory_remember / memory_recall /
   * memory_forget / memory_status) backed by a shared store. Default is
   * off — zero new deps when disabled.
   *
   * See docs/memory.md for ready-to-paste recipes.
   */
  memory: z
    .object({
      /** Master switch. When false, adapters skip registering memory tools. */
      enabled: z.boolean().default(false),
      /** Which backend to use. "local" has no extra deps; "mem0" needs `pnpm add mem0ai`. */
      backend: z.enum(["local", "mem0"]).default("local"),
      /** Override the per-record namespace. Defaults to robot.namespace at call time. */
      namespace: z.string().optional(),
      local: z
        .object({
          /** JSON-on-disk store path. Supports leading "~/". */
          storePath: z.string().default("~/.agenticros/memory.json"),
        })
        .default({}),
      mem0: z
        .object({
          /**
           * When true, mem0 runs its LLM-driven fact extraction on `add`.
           * When false (default), content is stored as-is — predictable,
           * no LLM call on write, agent stays in explicit control.
           */
          inferOnWrite: z.boolean().default(false),
          /** SQLite history db path (mem0 historyDbPath). Supports leading "~/". */
          historyDbPath: z
            .string()
            .default("~/.agenticros/memory-history.db"),
          /**
           * Embedder passed verbatim to `new Memory({ embedder })`.
           * When omitted, the factory auto-detects: Ollama (if reachable)
           * → OpenAI (if OPENAI_API_KEY set) → error.
           */
          embedder: z
            .object({
              provider: z.string(),
              config: z.record(z.string(), z.unknown()),
            })
            .optional(),
          /** Vector store passed verbatim to `new Memory({ vectorStore })`. */
          vectorStore: z
            .object({
              provider: z.string(),
              config: z.record(z.string(), z.unknown()),
            })
            .optional(),
          /** LLM passed verbatim to `new Memory({ llm })`. Only used when inferOnWrite is true. */
          llm: z
            .object({
              provider: z.string(),
              config: z.record(z.string(), z.unknown()),
            })
            .optional(),
        })
        .default({}),
    })
    .default({}),

  /** Per-skill config. Keys are skill ids (e.g. followme). Each skill validates its own slice. */
  skills: z.record(z.string(), z.unknown()).default({}),

  /** Directories to scan for skill packages (package.json with "agenticrosSkill": true). Resolved at gateway start. */
  skillPaths: z.array(z.string()).default([]),

  /** Npm (or local) package names to load as skills. Resolved via require.resolve from plugin context. */
  skillPackages: z.array(z.string()).default([]),
});

export type AgenticROSConfig = z.infer<typeof AgenticROSConfigSchema>;

/**
 * Parse and validate raw config against the schema.
 * Returns a fully-defaulted, typed config object.
 * Backward compat: if raw.followMe is set, it is merged into raw.skills.followme before parsing.
 */
export function parseConfig(raw: Record<string, unknown>): AgenticROSConfig {
  const normalized = { ...raw };
  const followMe = raw.followMe;
  if (followMe !== undefined && followMe !== null && typeof followMe === "object") {
    const skills = (normalized.skills as Record<string, unknown>) ?? {};
    if (!(typeof skills === "object" && skills !== null && !Array.isArray(skills))) {
      (normalized as Record<string, unknown>).skills = { followme: followMe };
    } else if (!("followme" in skills)) {
      (normalized as Record<string, unknown>).skills = { ...skills, followme: followMe };
    }
  }
  return AgenticROSConfigSchema.parse(normalized);
}

/**
 * Build TransportConfig from full config for createTransport().
 */
export function getTransportConfig(config: AgenticROSConfig): TransportConfig {
  const mode = config.transport?.mode ?? "local";
  switch (mode) {
    case "rosbridge":
      return { mode: "rosbridge", rosbridge: config.rosbridge ?? { url: "ws://localhost:9090" } };
    case "local":
      return { mode: "local", local: config.local };
    case "webrtc":
      return { mode: "webrtc", webrtc: config.webrtc ?? {} };
    case "zenoh":
      return { mode: "zenoh", zenoh: config.zenoh ?? {} };
    default:
      return { mode: "local", local: config.local ?? { domainId: 0 } };
  }
}
