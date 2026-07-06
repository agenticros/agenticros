import { z } from "zod";
import type { TransportConfig } from "./transport/types.js";

const IceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Transport sub-schemas. Extracted so both the top-level config and the
// per-robot override in `robots[i].transport` can share them without
// drifting. The shapes mirror packages/core/src/transport/types.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ZenohSettingsSchema = z.object({
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
});

const RosbridgeSettingsSchema = z.object({
  url: z.string().default("ws://localhost:9090"),
  reconnect: z.boolean().default(true),
  reconnectInterval: z.number().default(3000),
});

const LocalSettingsSchema = z.object({
  domainId: z.number().default(0),
});

const WebrtcSettingsSchema = z.object({
  signalingUrl: z.string().default(""),
  apiUrl: z.string().default(""),
  robotId: z.string().default(""),
  robotKey: z.string().default(""),
  iceServers: z
    .array(IceServerSchema)
    .default([{ urls: "stun:stun.l.google.com:19302" }]),
});

/**
 * Per-robot transport override sub-schemas (Phase 1.d-resolve).
 *
 * These intentionally MIRROR the top-level shapes but drop every
 * `.default(...)`. Why: when `getTransportConfigForRobot` merges an
 * override over the global config it does a per-field merge
 * (`{ ...global, ...override }`). If the override schema applied
 * defaults (e.g. `domainId: 0`), those defaults would silently clobber
 * the global values whenever the user omitted them — making the
 * "merge only the fields I actually wrote" contract impossible.
 *
 * Every field is optional here. Validation still rejects wrong types
 * (e.g. `routerEndpoint: 42`), which is what we want.
 */
const ZenohOverrideSettingsSchema = z.object({
  routerEndpoint: z.string().optional(),
  domainId: z.number().optional(),
  keyFormat: z.enum(["ros2dds", "rmw_zenoh"]).optional(),
  bridgeNamespace: z.string().optional(),
});

const RosbridgeOverrideSettingsSchema = z.object({
  url: z.string().optional(),
  reconnect: z.boolean().optional(),
  reconnectInterval: z.number().optional(),
});

const LocalOverrideSettingsSchema = z.object({
  domainId: z.number().optional(),
});

const WebrtcOverrideSettingsSchema = z.object({
  signalingUrl: z.string().optional(),
  apiUrl: z.string().optional(),
  robotId: z.string().optional(),
  robotKey: z.string().optional(),
  iceServers: z.array(IceServerSchema).optional(),
});

/**
 * Per-robot transport override schema (Phase 1.d-resolve).
 *
 * Discriminated union on `mode`, each variant `.strict()` so that a
 * typo like `{ mode: "zenoh", local: {...} }` fails fast at parse time
 * instead of being silently stripped. Sub-sections are optional —
 * `{ mode: "zenoh" }` is a valid override that inherits everything
 * from the top-level `config.zenoh`. A partial sub-section like
 * `{ mode: "zenoh", zenoh: { routerEndpoint: "ws://field:10000" } }`
 * is merged per-field over the global config — see the resolver.
 *
 * Why a discriminated union (vs the top-level shape of sibling fields):
 *   - Keeps the override self-contained at one JSON property
 *   - Matches TransportConfig's runtime discriminated union 1:1
 *   - Trivially validatable per-robot without leaking across siblings
 */
const RobotTransportOverrideSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("rosbridge"),
      rosbridge: RosbridgeOverrideSettingsSchema.optional(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("local"),
      local: LocalOverrideSettingsSchema.optional(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("zenoh"),
      zenoh: ZenohOverrideSettingsSchema.optional(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("webrtc"),
      webrtc: WebrtcOverrideSettingsSchema.optional(),
    })
    .strict(),
]);

export type RobotTransportOverride = z.infer<typeof RobotTransportOverrideSchema>;

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

  zenoh: ZenohSettingsSchema.default({}),

  rosbridge: RosbridgeSettingsSchema.default({}),

  local: LocalSettingsSchema.default({}),

  webrtc: WebrtcSettingsSchema.default({}),

  robot: z
    .object({
      name: z.string().default("Robot"),
      namespace: z.string().default(""),
      /** Camera topic for "what do you see?" (e.g. /camera/camera/color/image_raw/compressed). If set, used as default in ros2_camera_snapshot and in context. */
      cameraTopic: z.string().default(""),
    })
    .default({}),

  /**
   * Phase 1.d multi-robot list. When non-empty, this is the source of
   * truth for `ros2_list_robots` and (in a follow-up) the per-tool
   * `robot_id` parameter. When empty, the legacy single-robot
   * `config.robot` above is synthesised into a one-entry list at
   * resolution time (see packages/core/src/robots.ts). Existing configs
   * keep working unchanged; this field is opt-in.
   *
   * Mark one entry with `default: true` to make it the active robot
   * even when it isn't the first in the list. Otherwise the first entry
   * wins.
   */
  robots: z
    .array(
      z.object({
        /** Stable, human-readable identifier referenced by `robot_id` arguments. */
        id: z.string(),
        name: z.string().default("Robot"),
        namespace: z.string().default(""),
        cameraTopic: z.string().default(""),
        default: z.boolean().optional(),
        /**
         * Phase 1.e robot kind ("amr" | "arm" | "drone" | "rover" | …).
         *
         * Free-form string so users can invent their own taxonomy, but the
         * documented set is `amr` (autonomous mobile robot), `arm`,
         * `drone`, and `rover`. Consumed by `ros2_find_robots_for(kind=…)`
         * so an agent can ask "find me an AMR with a depth camera that
         * can follow_person" and the platform filters the fleet.
         *
         * Defaults to "amr" (back-compat: every existing robot today is
         * an AMR), so the field stays useful even when the user hasn't
         * tagged their robots explicitly.
         */
        kind: z.string().default("amr"),
        /**
         * Phase 1.e sensor/hardware tags.
         *
         * Lets `ros2_find_robots_for` answer questions like "which
         * robots have a depth camera" without subscribing to topics or
         * inspecting the URDF. All flags default to false — set them
         * explicitly per robot via the CLI (`--sensors=has_realsense`)
         * or by hand-editing `~/.agenticros/config.json`.
         *
         * The list is intentionally short for Phase 1; expand it as we
         * accumulate seed-catalog skills that depend on a specific
         * hardware capability (lidar SLAM, arm grasping, etc.).
         */
        sensors: z
          .object({
            has_realsense: z.boolean().default(false),
            has_lidar: z.boolean().default(false),
            has_arm: z.boolean().default(false),
          })
          .default({}),
        /**
         * Phase 1.e optional per-robot capability allowlist.
         *
         * When set, restricts which capabilities `ros2_find_robots_for`
         * considers this robot capable of. When unset (the common
         * case), the robot inherits the gateway's global capability
         * registry (the union of built-in verbs plus every loaded
         * skill's capabilities). Useful in heterogeneous fleets where
         * one robot has the arm skill loaded and another doesn't.
         */
        capabilities: z.array(z.string()).optional(),
        /**
         * Phase 1.d-resolve per-robot transport override.
         *
         * When set, this robot uses its own transport instead of the
         * top-level `config.transport.*`. Useful when one host drives
         * BOTH a local sim (mode: "local") AND a real robot reached via
         * an off-robot bridge (mode: "zenoh" / "rosbridge") — each
         * robot connects through the right path with no global config
         * juggling.
         *
         * Sub-sections (`zenoh`, `rosbridge`, `local`, `webrtc`) are
         * optional inside the override: omit them to inherit the global
         * `config.<section>` defaults; set them to override only the
         * fields you need (e.g. a different router endpoint).
         *
         * Consumed by `getTransportConfigForRobot(config, robotId)` in
         * robots.ts. Adapters opt in to multi-transport pools — when
         * the override is absent they keep using the single global
         * transport, so existing single-robot deployments are
         * unaffected.
         */
        transport: RobotTransportOverrideSchema.optional(),
      }),
    )
    .default([]),

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

  /** Directories to scan for skill packages (package.json with an `agenticros` block). Resolved at gateway start. */
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
 * Strip Zod defaults that were never present in the raw config before parse.
 * The config page validates via parseConfig() but should not inject keys the
 * user never set — e.g. `robots: []` from the schema default breaks OpenClaw's
 * strict plugin configSchema when that field isn't declared yet.
 */
export function prepareConfigForPersistence(
  parsed: AgenticROSConfig,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(raw, "robots")) {
    const robots = out.robots;
    if (Array.isArray(robots) && robots.length === 0) {
      delete out.robots;
    }
  }
  return out;
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
