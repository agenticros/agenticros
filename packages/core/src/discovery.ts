/**
 * Multi-robot discovery — Phase 1.d "fleet awareness on the wire".
 *
 * Configuration tells the gateway what robots the user wants to talk to.
 * The transport tells the gateway what's actually on the wire right now.
 * Discovery is the bridge: scan published ROS2 topics, infer robot
 * namespaces from `<ns>/cmd_vel` patterns, cross-reference against the
 * configured robot list, and surface three categories:
 *
 *   1. configured_online   — in config AND seen on the wire
 *   2. configured_offline  — in config but NOT seen on the wire
 *   3. unknown_detected    — on the wire but NOT in config
 *
 * The agent uses this to answer questions like "which robots can I talk
 * to right now?" without forcing the user to hand-edit
 * `~/.agenticros/config.json` every time a robot joins the network.
 *
 * Persistence is intentionally OUT of scope here: discovery is read-only.
 * Writing newly-detected robots into the user's config is a separate
 * UX decision handled by the CLI / OpenClaw config UI on top of this
 * function.
 *
 * ## Detection signal
 *
 * `<ns>/cmd_vel` (the velocity command topic) is the canonical signal —
 * a robot that can be driven publishes/subscribes there. Other topics
 * like `<ns>/odom`, `<ns>/joint_states`, and `<ns>/camera/...` corroborate
 * the same `<ns>`; we surface them as `topicCount` so consumers can
 * gauge how "alive" the namespace looks.
 *
 * The unnamespaced `/cmd_vel` topic (default namespace, common in
 * simulation) is detected as id="" — consumers can render it as
 * "default robot" or similar.
 *
 * ## Namespace rewrite
 *
 * `ros2_publish` rewrites a UUID-shaped namespace like
 * `3946b404-c33e-...` into `robot3946b404c33e...` (strip dashes,
 * prefix with "robot") because most robot firmware expects the
 * dashless form. Discovery applies the same rewrite when matching
 * configured robots against detected namespaces, so a UUID-style
 * config entry still matches the `/robot<no-dashes>/cmd_vel` topic
 * the robot is actually publishing on.
 */

import type { AgenticROSConfig } from "./config.js";
import type { ResolvedRobot } from "./robots.js";
import { listRobots } from "./robots.js";
import type { TopicInfo } from "./transport/types.js";

/** One robot inferred from the topic graph. */
export interface DetectedRobot {
  /** The namespace segment, e.g. "robot3946b...". Empty string = default namespace. */
  id: string;
  /** The full cmd_vel topic name we saw — e.g. "/robot3946b.../cmd_vel". */
  cmdVelTopic: string;
  /**
   * Total topics under `/<id>/`, INCLUDING the cmd_vel topic itself.
   * A topicCount of 1 means the robot is "barely there" (just cmd_vel,
   * no odom / joint_states / camera etc.); higher counts corroborate
   * that the namespace is actually a live robot, not a stale advert.
   * Always 0 for the unnamespaced default robot (id="").
   */
  topicCount: number;
  /**
   * The matching `robot.id` from `config.robots` (or the legacy fallback)
   * when this detected namespace maps to a configured robot, otherwise
   * `null`. Matching uses the same UUID→robot-no-dashes rewrite as the
   * publish path.
   */
  configuredRobotId: string | null;
}

/** Result of a discovery pass. */
export interface RobotDiscoveryResult {
  /** Every robot inferred from the topic graph, with config match annotations. */
  detected: DetectedRobot[];
  /** Configured robots that ARE present on the wire right now. */
  configured_online: ResolvedRobot[];
  /** Configured robots that are NOT present on the wire right now. */
  configured_offline: ResolvedRobot[];
  /** Detected robots that have no matching config entry — candidates to add. */
  unknown_detected: DetectedRobot[];
  /** Total topics scanned (echoed for diagnostics). */
  total_topics: number;
}

/**
 * Apply the same UUID→robot-no-dashes rewrite as `ros2_publish` uses
 * when normalising a `/<ns>/cmd_vel` target.
 *
 * `""` stays `""` (default namespace). Namespaces that already start
 * with "robot" are returned unchanged.
 */
export function effectiveCmdVelNamespace(robotNamespace: string): string {
  const ns = robotNamespace.trim();
  if (ns === "") return "";
  if (ns.toLowerCase().startsWith("robot")) return ns;
  return `robot${ns.replace(/-/g, "")}`;
}

/**
 * Find every robot-shaped namespace in a topic list.
 *
 * Detection rule: any `/<seg>/cmd_vel` topic implies a robot with
 * namespace `<seg>`. The unnamespaced `/cmd_vel` topic registers the
 * empty namespace (id=""). Topic count under each namespace is
 * accumulated so consumers can rank by liveness.
 *
 * The returned `DetectedRobot.configuredRobotId` is always `null` here —
 * call `discoverRobots()` (which wraps this function) to annotate with
 * config matches.
 */
export function detectRobotsFromTopics(topics: TopicInfo[]): DetectedRobot[] {
  const byNs = new Map<string, { cmdVelTopic: string; topicCount: number }>();

  for (const t of topics) {
    // Match /<seg>/cmd_vel exactly — sub-namespaces would imply a more
    // complex robot graph than this v1 wants to handle.
    const m = t.name.match(/^\/([^/]+)\/cmd_vel$/);
    if (m) {
      const ns = m[1]!;
      if (!byNs.has(ns)) byNs.set(ns, { cmdVelTopic: t.name, topicCount: 0 });
    } else if (t.name === "/cmd_vel" && !byNs.has("")) {
      byNs.set("", { cmdVelTopic: "/cmd_vel", topicCount: 0 });
    }
  }

  // Count topics under each detected namespace. Empty-namespace robots
  // (default) intentionally don't accumulate counts — every topic in
  // the system would otherwise "belong" to them, which is misleading.
  for (const t of topics) {
    for (const [ns, info] of byNs) {
      if (ns === "") continue;
      if (t.name.startsWith(`/${ns}/`)) {
        info.topicCount += 1;
      }
    }
  }

  return Array.from(byNs.entries()).map(([id, info]) => ({
    id,
    cmdVelTopic: info.cmdVelTopic,
    topicCount: info.topicCount,
    configuredRobotId: null,
  }));
}

/**
 * Top-level discovery: detect robots on the wire, match against the
 * configured robot list, and classify into online / offline / unknown.
 *
 * Pure function — feed it the topic list and the config, get a result
 * back. No transport access here; adapters wrap this with a call to
 * `transport.listTopics()`.
 */
export function discoverRobots(
  topics: TopicInfo[],
  config: AgenticROSConfig,
): RobotDiscoveryResult {
  const detected = detectRobotsFromTopics(topics);
  const configured = listRobots(config);

  // Map effective-namespace → configured robot for O(1) lookup.
  const effToCfg = new Map<string, ResolvedRobot>();
  for (const r of configured) {
    effToCfg.set(effectiveCmdVelNamespace(r.namespace), r);
  }

  const annotated = detected.map((d) => {
    const cfg = effToCfg.get(d.id);
    return cfg
      ? { ...d, configuredRobotId: cfg.id }
      : { ...d, configuredRobotId: null };
  });

  const detectedIds = new Set(annotated.map((d) => d.id));
  const configured_online = configured.filter((r) =>
    detectedIds.has(effectiveCmdVelNamespace(r.namespace)),
  );
  const configured_offline = configured.filter(
    (r) => !detectedIds.has(effectiveCmdVelNamespace(r.namespace)),
  );
  const unknown_detected = annotated.filter((d) => d.configuredRobotId === null);

  return {
    detected: annotated,
    configured_online,
    configured_offline,
    unknown_detected,
    total_topics: topics.length,
  };
}
