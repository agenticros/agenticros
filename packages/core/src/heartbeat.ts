/**
 * RobotInfo heartbeat helpers — Phase 1.d completion.
 *
 * `agenticros_discovery` publishes `<ns>/agenticros/robot_info` at 1 Hz.
 * Consumers treat a robot as online when the last stamp is within
 * {@link DEFAULT_HEARTBEAT_STALENESS_MS} (5 s per strategy memo).
 *
 * Topic-scan path: when adapters only have `listTopics()`, presence of
 * `/<ns>/agenticros/robot_info` on the graph is a weak online signal
 * (same as cmd_vel). Prefer {@link mergeRobotHeartbeats} when message
 * payloads with stamps are available.
 */

import { effectiveCmdVelNamespace } from "./discovery.js";
import type { TopicInfo } from "./transport/types.js";
import type { RobotSensors } from "./robots.js";

/** Default staleness window — strategy §4(d): 1 Hz + 5 s. */
export const DEFAULT_HEARTBEAT_STALENESS_MS = 5_000;

/** Parsed robot_info payload (subset of agenticros_msgs/RobotInfo). */
export interface RobotHeartbeat {
  /** Stable id (falls back to namespace). */
  id: string;
  name: string;
  kind: string;
  /** ROS namespace without leading slash. */
  robot_namespace: string;
  capability_ids: string[];
  sensors: RobotSensors;
  /** Epoch ms of the heartbeat stamp (0 when unknown). */
  stamp_ms: number;
  /** Topic the heartbeat was observed on. */
  topic: string;
}

export interface HeartbeatOnlineOptions {
  /** Wall clock now (ms). Defaults to Date.now(). */
  nowMs?: number;
  /** Staleness window in ms. Defaults to 5000. */
  stalenessMs?: number;
}

/**
 * Extract namespace from `/<ns>/agenticros/robot_info` (or without leading slash).
 * Returns "" for unnamespaced `/agenticros/robot_info`.
 */
export function namespaceFromRobotInfoTopic(topic: string): string {
  const m = topic.match(/^\/?([^/]+)\/agenticros\/robot_info$/);
  if (m) return m[1]!;
  if (topic === "/agenticros/robot_info" || topic === "agenticros/robot_info") return "";
  return "";
}

/** True when the topic name is a robot_info heartbeat topic. */
export function isRobotInfoTopic(topic: string): boolean {
  return /(?:^|\/)agenticros\/robot_info$/.test(topic);
}

/**
 * Detect namespaces that advertise `agenticros/robot_info` on the topic graph
 * (no stamp available — treat as online for discovery fallback).
 */
export function detectHeartbeatNamespacesFromTopics(topics: TopicInfo[]): string[] {
  const out = new Set<string>();
  for (const t of topics) {
    if (!isRobotInfoTopic(t.name)) continue;
    out.add(namespaceFromRobotInfoTopic(t.name));
  }
  return [...out];
}

function rosTimeToMs(stamp: unknown): number {
  if (!stamp || typeof stamp !== "object") return 0;
  const s = stamp as Record<string, unknown>;
  const sec = Number(s.sec ?? s.secs ?? 0) || 0;
  const nanosec = Number(s.nanosec ?? s.nsecs ?? 0) || 0;
  return sec * 1000 + Math.floor(nanosec / 1e6);
}

/**
 * Parse a plain RobotInfo-like message into {@link RobotHeartbeat}.
 * Tolerates missing optional fields.
 */
export function parseRobotInfoMessage(
  topic: string,
  msg: Record<string, unknown>,
): RobotHeartbeat {
  const nsFromTopic = namespaceFromRobotInfoTopic(topic);
  const robot_namespace = String(msg.robot_namespace ?? msg.namespace ?? nsFromTopic ?? "");
  const id = String(msg.id ?? (robot_namespace || "default"));
  const capability_ids = Array.isArray(msg.capability_ids)
    ? msg.capability_ids.map((c) => String(c))
    : Array.isArray(msg.capabilities)
      ? (msg.capabilities as unknown[]).map((c) => String(c))
      : [];
  return {
    id,
    name: String(msg.name ?? "Robot"),
    kind: String(msg.kind ?? "amr"),
    robot_namespace,
    capability_ids,
    sensors: {
      has_realsense: Boolean(msg.has_realsense),
      has_lidar: Boolean(msg.has_lidar),
      has_arm: Boolean(msg.has_arm),
    },
    stamp_ms: rosTimeToMs(msg.stamp),
    topic,
  };
}

/** True when the heartbeat stamp is within the staleness window. */
export function isHeartbeatFresh(
  heartbeat: RobotHeartbeat,
  options: HeartbeatOnlineOptions = {},
): boolean {
  const now = options.nowMs ?? Date.now();
  const window = options.stalenessMs ?? DEFAULT_HEARTBEAT_STALENESS_MS;
  if (!heartbeat.stamp_ms) {
    // No stamp — treat as fresh if we just received the message (caller
    // should only pass live subscribe results here).
    return true;
  }
  return now - heartbeat.stamp_ms <= window;
}

/**
 * Merge heartbeats into an online-id set keyed by configured robot id
 * when `configuredIdByNamespace` is provided, else by heartbeat id /
 * effective namespace.
 */
export function onlineIdsFromHeartbeats(
  heartbeats: readonly RobotHeartbeat[],
  options: HeartbeatOnlineOptions & {
    /** Map effective cmd_vel namespace → configured robot id. */
    configuredIdByNamespace?: ReadonlyMap<string, string>;
  } = {},
): Set<string> {
  const online = new Set<string>();
  for (const hb of heartbeats) {
    if (!isHeartbeatFresh(hb, options)) continue;
    const eff = effectiveCmdVelNamespace(hb.robot_namespace);
    const cfgId = options.configuredIdByNamespace?.get(eff);
    online.add(cfgId ?? hb.id);
  }
  return online;
}

/**
 * Build a map of effective-namespace → latest fresh heartbeat.
 */
export function mergeRobotHeartbeats(
  heartbeats: readonly RobotHeartbeat[],
  options: HeartbeatOnlineOptions = {},
): Map<string, RobotHeartbeat> {
  const byNs = new Map<string, RobotHeartbeat>();
  for (const hb of heartbeats) {
    if (!isHeartbeatFresh(hb, options)) continue;
    const key = effectiveCmdVelNamespace(hb.robot_namespace);
    const prev = byNs.get(key);
    if (!prev || hb.stamp_ms >= prev.stamp_ms) {
      byNs.set(key, hb);
    }
  }
  return byNs;
}
