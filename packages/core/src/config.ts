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
      mode: z.enum(["rosbridge", "local", "webrtc", "zenoh"]).default("rosbridge"),
    })
    .default({}),

  zenoh: z
    .object({
      /** WebSocket URL for zenoh-ts (zenoh-plugin-remote-api). Not tcp/ — use e.g. ws://localhost:10000 */
      routerEndpoint: z.string().default("ws://localhost:10000"),
      domainId: z.number().default(0),
      /** "ros2dds" = zenoh-bridge-ros2dds key format (slashes kept). "rmw_zenoh" = rmw_zenoh key format (domain + %). */
      keyFormat: z.enum(["ros2dds", "rmw_zenoh"]).default("ros2dds"),
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
  const mode = config.transport?.mode ?? "rosbridge";
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
      return { mode: "rosbridge", rosbridge: config.rosbridge ?? { url: "ws://localhost:9090" } };
  }
}
