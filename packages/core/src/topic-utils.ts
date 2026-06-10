import type { AgenticROSConfig } from "./config.js";

/**
 * Topic-utility module — the single source of truth for namespace
 * prefixing across all adapters and the mission runner.
 *
 * Phase 1.d (multi-robot) extends every public helper to accept *either*
 * the full AgenticROSConfig (uses config.robot.namespace, the legacy
 * single-robot behaviour) *or* a bare namespace string. The string-arg
 * form is what per-tool `robot_id` routing goes through: callers resolve
 * a `ResolvedRobot` via `resolveRobot(config, robot_id)` and pass
 * `robot.namespace` directly.
 *
 * Every existing call site continues to work unchanged because the
 * config-arg form is preserved verbatim.
 */

/**
 * Normalize a ROS 2 topic name to a canonical form (leading slash, no trailing slash).
 */
function normalizeTopic(topic: string): string {
  const t = topic.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return t ? `/${t}` : "/";
}

/**
 * Return true if the topic is "root-level" (single segment, e.g. cmd_vel, battery_state).
 */
function isRootLevelTopic(normalized: string): boolean {
  const withoutLeading = normalized.replace(/^\/+/, "");
  return withoutLeading.length > 0 && !withoutLeading.includes("/");
}

/**
 * Resolve a namespace from either a string or an AgenticROSConfig. The
 * config form pulls from config.robot.namespace (legacy single-robot
 * behaviour); the string form is taken verbatim. Empty/whitespace
 * collapses to "" so the rest of the prefix logic short-circuits.
 */
function resolveNamespace(target: AgenticROSConfig | string): string {
  if (typeof target === "string") return target.trim();
  return (target.robot?.namespace ?? "").trim();
}

/**
 * Apply robot namespace to a topic (or service/action name) when configured.
 * If the namespace is set and the name is root-level (e.g. cmd_vel, battery_state),
 * returns /<namespace>/<name>. Otherwise returns the normalized name as-is.
 *
 * The first argument may be either an `AgenticROSConfig` (legacy single-
 * robot path) or a bare namespace string (used by per-tool `robot_id`
 * routing — pass `resolveRobot(config, robot_id).namespace`).
 *
 * Example: namespace "robot-uuid", topic "/cmd_vel" -> "/robot-uuid/cmd_vel"
 * Example: namespace "", topic "/cmd_vel" -> "/cmd_vel"
 * Example: namespace "robot-uuid", topic "/robot-uuid/odom" -> "/robot-uuid/odom" (unchanged)
 */
export function toNamespacedTopic(target: AgenticROSConfig | string, topic: string): string {
  const normalized = normalizeTopic(topic);
  const ns = resolveNamespace(target);
  if (!ns) return normalized;
  if (!isRootLevelTopic(normalized)) return normalized;
  const segment = normalized.replace(/^\/+/, "");
  return `/${ns}/${segment}`;
}

/**
 * Apply robot namespace to any topic when configured (for transport subscribe/publish).
 * Use this when the robot publishes/subscribes all topics under a namespace (e.g. Zenoh with
 * zenoh-bridge-ros2dds or rmw_zenoh). If a namespace is set, returns /<namespace>/<topic>
 * unless the topic already starts with /<namespace>/.
 *
 * The first argument may be either an `AgenticROSConfig` or a bare
 * namespace string (per-robot routing).
 *
 * Example: namespace "robot-uuid", topic "/cmd_vel" -> "/robot-uuid/cmd_vel"
 * Example: namespace "robot-uuid", topic "/camera/camera/color/image_raw/compressed" -> "/robot-uuid/camera/camera/color/image_raw/compressed"
 * Example: namespace "robot-uuid", topic "/robot-uuid/odom" -> "/robot-uuid/odom" (unchanged)
 */
export function toNamespacedTopicFull(target: AgenticROSConfig | string, topic: string): string {
  const normalized = normalizeTopic(topic);
  const ns = resolveNamespace(target);
  if (!ns) return normalized;
  const withoutLeading = normalized.replace(/^\/+/, "");
  if (!withoutLeading) return normalized;
  if (withoutLeading.startsWith(`${ns}/`) || withoutLeading === ns) return normalized;
  return `/${ns}/${withoutLeading}`;
}

/**
 * Canonical topic string for teleop UI and ?topic= query params: leading slash, no robot namespace prefix.
 * Subscribe/publish still uses {@link toNamespacedTopicFull} on the server so Zenoh keys match the bridge.
 *
 * Teleop is single-robot today, so this still takes the full config.
 */
export function toTeleopCameraTopicShort(config: AgenticROSConfig, topic: string): string {
  const normalized = normalizeTopic(topic);
  const ns = (config.robot?.namespace ?? "").trim();
  if (!ns) return normalized;
  const withoutLeading = normalized.replace(/^\/+/, "");
  if (!withoutLeading) return normalized;
  if (withoutLeading === ns) return "/";
  if (withoutLeading.startsWith(`${ns}/`)) {
    const rest = withoutLeading.slice(ns.length + 1);
    return rest ? `/${rest}` : "/";
  }
  return normalized;
}

/**
 * ROS topic to use when subscribing to camera streams (Zenoh / DDS).
 * Unlike {@link toNamespacedTopicFull}, common sensor topics stay at the graph root (`/camera/...`, `/zed/...`)
 * even when the namespace is set for cmd_vel. If the topic already starts with `/<namespace>/`, it is left as-is.
 * Other multi-segment paths get the namespace prefix (same as Full) for odd layouts.
 *
 * The first argument may be either an `AgenticROSConfig` or a bare
 * namespace string (per-robot routing).
 */
export function resolveCameraSubscribeTopic(target: AgenticROSConfig | string, topic: string): string {
  const normalized = normalizeTopic(topic);
  const ns = resolveNamespace(target);
  if (!ns) return normalized;
  const withoutLeading = normalized.replace(/^\/+/, "");
  if (!withoutLeading) return normalized;
  if (withoutLeading === ns || withoutLeading.startsWith(`${ns}/`)) return normalized;

  const first = withoutLeading.split("/")[0] ?? "";
  /** First path segment for topics that usually remain unprefixed while cmd_vel is namespaced. */
  const globalRoots = new Set(["camera", "zed", "usb_cam", "image_raw", "depth"]);
  if (first && globalRoots.has(first)) return normalized;

  return `/${ns}/${withoutLeading}`;
}
