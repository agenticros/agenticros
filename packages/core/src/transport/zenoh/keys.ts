/**
 * Key format used by the Zenoh router / bridge.
 * - rmw_zenoh: ROS2 with Zenoh RMW (domain prefix, slashes → %). Example: 0/%robot-uuid%cmd_vel
 * - ros2dds: zenoh-bridge-ros2dds (no domain prefix, slashes kept). Example: robot-uuid/cmd_vel
 */
export type ZenohKeyFormat = "rmw_zenoh" | "ros2dds";

/** Strip optional slashes; empty means bridge default "/" (no extra zenoh prefix). */
function normalizeBridgeNamespace(ns: string | undefined): string {
  const t = (ns ?? "").trim();
  if (!t || t === "/") return "";
  return t.replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Map ROS 2 topic name to a Zenoh key expression.
 * - rmw_zenoh: topic "/robot-uuid/cmd_vel", domainId 0 → "0/%robot-uuid%cmd_vel"
 * - ros2dds (zenoh-bridge-ros2dds): topic "/robot-uuid/cmd_vel" → "robot-uuid/cmd_vel"
 *   If the bridge sets plugins.ros2dds.namespace to e.g. "/bot1", pass `bridgeNamespace: "/bot1"`
 *   so keys become `bot1/robot-uuid/cmd_vel` (matches ros2_name_to_key_expr).
 */
export function rosTopicToZenohKey(
  topic: string,
  domainId: number,
  format: ZenohKeyFormat = "ros2dds",
  bridgeNamespace?: string,
): string {
  const normalized = topic.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized) return format === "rmw_zenoh" ? `${domainId}/` : "";
  if (format === "rmw_zenoh") {
    const keyPart = normalized.replace(/\//g, "%");
    return `${domainId}/%${keyPart}`;
  }
  const bridgeNs = normalizeBridgeNamespace(bridgeNamespace);
  if (!bridgeNs) return normalized;
  if (normalized === bridgeNs || normalized.startsWith(`${bridgeNs}/`)) return normalized;
  return `${bridgeNs}/${normalized}`;
}

/**
 * Map a Zenoh key expression back to a ROS 2 topic name.
 * - rmw_zenoh: "0/%robot-uuid%cmd_vel" → "/robot-uuid/cmd_vel"
 * - ros2dds: "robot-uuid/cmd_vel" → "/robot-uuid/cmd_vel"
 */
export function zenohKeyToRosTopic(key: string, format: ZenohKeyFormat = "ros2dds"): string {
  if (format === "ros2dds") return key.startsWith("/") ? key : `/${key}`;
  const match = /^\d+\/(.+)$/.exec(key);
  if (!match) return key;
  const part = match[1].replace(/%/g, "/");
  return part.startsWith("/") ? part : `/${part}`;
}
