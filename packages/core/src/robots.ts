/**
 * Multi-robot support — Phase 1.d of the AgenticROS strategy.
 *
 * For most deployments today the gateway talks to a single robot, so
 * config.robot (a single object) is all that's used. Phase 1.d adds a
 * `robots` array to the config so a single gateway / chat session can
 * address multiple robots by id.
 *
 * This module is the source of truth for that resolution: from the raw
 * AgenticROSConfig, what robots does the agent see, and which one is the
 * active default? Adapters call into it from:
 *   - `ros2_list_robots` (this phase) — list everything the gateway knows about.
 *   - `ros2_list_capabilities(robot_id?)` (next iteration) — scope to one robot.
 *   - `run_mission` (next iteration) — `mission.robot_id` field.
 *   - per-tool `robot_id` (next iteration) — `ros2_publish`, `ros2_subscribe_once`,
 *     `ros2_camera_snapshot`, etc.
 *
 * Backwards compatibility: when `robots` is empty (i.e. nothing in
 * config.robots), this module synthesises a one-entry list from the
 * legacy `config.robot` object so old configs and the single-robot
 * mental model keep working unchanged. The synthesised entry is marked
 * default so it's selected by `getActiveRobotId()`.
 */

import type { AgenticROSConfig } from "./config.js";
import { getTransportConfig } from "./config.js";
import type { TransportConfig } from "./transport/types.js";

/** Sensor/hardware tags on a robot (Phase 1.e). */
export interface RobotSensors {
  /** Intel RealSense depth+RGB camera. */
  has_realsense: boolean;
  /** 2D or 3D LiDAR sensor. */
  has_lidar: boolean;
  /** Robotic manipulator (arm) attached. */
  has_arm: boolean;
}

/** A resolved robot — what the agent + adapters operate on. */
export interface ResolvedRobot {
  /** Stable, human-readable identifier. Falls back to namespace when not set. */
  id: string;
  /** Display name used by the agent in chat replies. */
  name: string;
  /** ROS2 topic namespace prefix (e.g. "robot3946b404..." → /robot3946.../cmd_vel). */
  namespace: string;
  /** Default camera topic for `ros2_camera_snapshot`. Empty string when unset. */
  cameraTopic: string;
  /**
   * Phase 1.e robot kind ("amr" | "arm" | "drone" | "rover" | …).
   * Free-form string. Defaults to "amr" for back-compat (the legacy
   * fallback synthesises this too).
   */
  kind: string;
  /** Phase 1.e sensor/hardware tags. Defaults to all-false. */
  sensors: RobotSensors;
  /**
   * Phase 1.e optional per-robot capability allowlist. When `undefined`
   * the robot inherits the global capability registry (the common
   * case); when set it's the exact list `ros2_find_robots_for` will
   * filter against for this robot.
   */
  capabilities?: string[];
  /**
   * Source tag — handy for diagnostics ("Why is this robot in the list?").
   *   - "config":  from config.robots[]
   *   - "legacy":  synthesised from the legacy single config.robot object
   */
  source: "config" | "legacy";
}

/**
 * Read every robot the config knows about, in declaration order, with
 * the legacy single-robot fallback applied when config.robots is empty.
 *
 * Never throws — an empty list is returned when neither config.robots
 * nor config.robot.namespace is meaningfully set (and the synthesised
 * fallback uses "default" as the id in that degenerate case).
 */
/** All-false default for {@link RobotSensors}. */
const DEFAULT_SENSORS: RobotSensors = {
  has_realsense: false,
  has_lidar: false,
  has_arm: false,
};

export function listRobots(config: AgenticROSConfig): ResolvedRobot[] {
  const explicit = Array.isArray(config.robots) ? config.robots : [];
  if (explicit.length > 0) {
    return explicit.map((r) => ({
      id: String(r.id),
      name: r.name ?? "Robot",
      namespace: r.namespace ?? "",
      cameraTopic: r.cameraTopic ?? "",
      kind: r.kind ?? "amr",
      sensors: { ...DEFAULT_SENSORS, ...(r.sensors ?? {}) },
      capabilities: r.capabilities,
      source: "config" as const,
    }));
  }

  // Legacy fallback — synthesise one entry from config.robot. The
  // legacy schema doesn't carry kind/sensors/capabilities, so we
  // default them: kind="amr" (every existing real-robot deployment we
  // ship is an AMR with RealSense) and sensors all-false (which is
  // overly conservative but won't surface a false positive in
  // ros2_find_robots_for). Users on multi-robot deployments will have
  // promoted into config.robots[] anyway, where the fields are
  // explicit.
  const legacy = config.robot ?? { name: "Robot", namespace: "", cameraTopic: "" };
  const id = (legacy.namespace?.trim() || "default");
  return [
    {
      id,
      name: legacy.name ?? "Robot",
      namespace: legacy.namespace ?? "",
      cameraTopic: legacy.cameraTopic ?? "",
      kind: "amr",
      sensors: { ...DEFAULT_SENSORS },
      source: "legacy",
    },
  ];
}

/**
 * Pick the active robot's id according to these rules, in order:
 *   1. `override` argument (when truthy) — usually a per-tool-call robot_id.
 *   2. An entry in config.robots with `default: true`.
 *   3. The first entry in the resolved list (which includes the legacy
 *      fallback when nothing else is configured).
 *
 * Throws when no robots exist at all — that should be impossible because
 * the legacy fallback always produces at least one — but the guard is
 * there for robustness against a corrupted config.
 */
export function getActiveRobotId(config: AgenticROSConfig, override?: string): string {
  if (override && override.trim().length > 0) return override.trim();
  const explicit = Array.isArray(config.robots) ? config.robots : [];
  const flagged = explicit.find((r) => r.default === true);
  if (flagged) return flagged.id;
  const robots = listRobots(config);
  if (robots.length === 0) {
    throw new Error("No robots configured (config.robots is empty and config.robot has no namespace).");
  }
  return robots[0].id;
}

/**
 * Convenience wrapper for tool handlers: extract an optional `robot_id`
 * (a string) from a tool-args record and call `resolveRobot`. Returns
 * the active robot when `robot_id` is missing or not a string.
 *
 * Throws — with the known robot ids listed in the error — when
 * `robot_id` is set to an unknown value. Adapters surface that as a
 * tool error so the agent self-corrects via `ros2_list_robots`.
 */
export function resolveRobotFromArgs(
  config: AgenticROSConfig,
  args: Record<string, unknown>,
): ResolvedRobot {
  const raw = args["robot_id"];
  const robotId = typeof raw === "string" ? raw : undefined;
  return resolveRobot(config, robotId);
}

/**
 * Resolve a robot to its full record by id. When `robotId` is omitted or
 * empty, the active robot is returned. When `robotId` is provided but
 * doesn't match any configured robot, throws with the available ids in
 * the message so the agent can correct itself.
 */
export function resolveRobot(config: AgenticROSConfig, robotId?: string): ResolvedRobot {
  const robots = listRobots(config);
  if (!robotId || robotId.trim().length === 0) {
    const activeId = getActiveRobotId(config);
    const found = robots.find((r) => r.id === activeId);
    if (!found) {
      throw new Error(`Active robot id "${activeId}" is not in the resolved list. This is a bug.`);
    }
    return found;
  }
  const trimmed = robotId.trim();
  const found = robots.find((r) => r.id === trimmed);
  if (!found) {
    const known = robots.map((r) => r.id).join(", ");
    throw new Error(`Unknown robot_id "${trimmed}". Known ids: ${known || "(none)"}. Use ros2_list_robots to discover.`);
  }
  return found;
}

/**
 * Phase 1.d-resolve helper: compute the effective `TransportConfig` for
 * a given robot, honouring an optional per-robot override in
 * `config.robots[i].transport`.
 *
 * Precedence (most specific wins):
 *   1. The robot's `transport.<mode>` sub-section (e.g. the override's
 *      `zenoh: { routerEndpoint: ... }`).
 *   2. The top-level `config.<mode>` section (e.g. the global
 *      `config.zenoh`).
 *
 * When the robot has no `transport` override at all, this returns the
 * global transport from `getTransportConfig(config)` — so single-robot
 * deployments behave exactly as before.
 *
 * Why this lives here (and not next to `createTransport`):
 *   - The resolver owns "which robot are we talking about?"; the
 *     transport factory owns "given a TransportConfig, build an
 *     instance". Mixing them couples a multi-robot decision into the
 *     low-level transport layer, which is wrong: adapters that don't
 *     care about per-robot transports keep using `createTransport` and
 *     never see this helper.
 *   - Callers that DO want per-robot pools call this to materialise the
 *     right `TransportConfig` per id, then hand it to `createTransport`.
 *
 * Throws when `robotId` is given but doesn't match any configured robot
 * (delegated to `resolveRobot`'s error path).
 */
export function getTransportConfigForRobot(
  config: AgenticROSConfig,
  robotId?: string,
): TransportConfig {
  // No explicit robots[] AND no override possible — fast path.
  const explicit = Array.isArray(config.robots) ? config.robots : [];
  if (explicit.length === 0) return getTransportConfig(config);

  // Resolve the id to the *raw* entry (not the synthesised ResolvedRobot,
  // because that strips the override). `resolveRobot` validates the id
  // and throws on unknown — we reuse it for that side effect.
  const robot = resolveRobot(config, robotId);
  const raw = explicit.find((r) => r.id === robot.id);
  if (!raw || !raw.transport) return getTransportConfig(config);

  // Build a synthetic config whose top-level transport mirrors the
  // override, then run it through the standard `getTransportConfig`
  // path. This keeps the "what shape does TransportConfig take?" logic
  // in one place — if a new transport mode is added, only
  // getTransportConfig needs to change.
  const override = raw.transport;
  const synthetic: AgenticROSConfig = {
    ...config,
    transport: { mode: override.mode },
    rosbridge:
      override.mode === "rosbridge" && override.rosbridge
        ? { ...config.rosbridge, ...override.rosbridge }
        : config.rosbridge,
    local:
      override.mode === "local" && override.local
        ? { ...config.local, ...override.local }
        : config.local,
    zenoh:
      override.mode === "zenoh" && override.zenoh
        ? { ...config.zenoh, ...override.zenoh }
        : config.zenoh,
    webrtc:
      override.mode === "webrtc" && override.webrtc
        ? { ...config.webrtc, ...override.webrtc }
        : config.webrtc,
  };
  return getTransportConfig(synthetic);
}

/**
 * True when the named robot (or active robot when `robotId` is omitted)
 * has a per-robot transport override. Adapters use this as a cheap
 * branch to decide between "reuse the global transport" (fast path) and
 * "build a per-robot one via `getTransportConfigForRobot`" (pool path).
 */
export function hasRobotTransportOverride(
  config: AgenticROSConfig,
  robotId?: string,
): boolean {
  const explicit = Array.isArray(config.robots) ? config.robots : [];
  if (explicit.length === 0) return false;
  try {
    const robot = resolveRobot(config, robotId);
    const raw = explicit.find((r) => r.id === robot.id);
    return Boolean(raw?.transport);
  } catch {
    return false;
  }
}
