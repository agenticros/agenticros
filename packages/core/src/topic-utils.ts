import type { AgenticROSConfig } from "./config.js";

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
 * Apply robot namespace to a topic (or service/action name) when configured.
 * If config.robot.namespace is set and the name is root-level (e.g. cmd_vel, battery_state),
 * returns /<namespace>/<name>. Otherwise returns the normalized name as-is.
 *
 * Example: namespace "robot-uuid", topic "/cmd_vel" -> "/robot-uuid/cmd_vel"
 * Example: namespace "", topic "/cmd_vel" -> "/cmd_vel"
 * Example: namespace "robot-uuid", topic "/robot-uuid/odom" -> "/robot-uuid/odom" (unchanged)
 */
export function toNamespacedTopic(config: AgenticROSConfig, topic: string): string {
  const normalized = normalizeTopic(topic);
  const ns = (config.robot?.namespace ?? "").trim();
  if (!ns) return normalized;
  if (!isRootLevelTopic(normalized)) return normalized;
  const segment = normalized.replace(/^\/+/, "");
  return `/${ns}/${segment}`;
}

/**
 * Apply robot namespace to any topic when configured (for transport subscribe/publish).
 * Use this when the robot publishes/subscribes all topics under a namespace (e.g. Zenoh with
 * zenoh-bridge-ros2dds or rmw_zenoh). If config.robot.namespace is set, returns /<namespace>/<topic>
 * unless the topic already starts with /<namespace>/.
 *
 * Example: namespace "robot-uuid", topic "/cmd_vel" -> "/robot-uuid/cmd_vel"
 * Example: namespace "robot-uuid", topic "/camera/camera/color/image_raw/compressed" -> "/robot-uuid/camera/camera/color/image_raw/compressed"
 * Example: namespace "robot-uuid", topic "/robot-uuid/odom" -> "/robot-uuid/odom" (unchanged)
 */
export function toNamespacedTopicFull(config: AgenticROSConfig, topic: string): string {
  const normalized = normalizeTopic(topic);
  const ns = (config.robot?.namespace ?? "").trim();
  if (!ns) return normalized;
  const withoutLeading = normalized.replace(/^\/+/, "");
  if (!withoutLeading) return normalized;
  if (withoutLeading.startsWith(`${ns}/`) || withoutLeading === ns) return normalized;
  return `/${ns}/${withoutLeading}`;
}
