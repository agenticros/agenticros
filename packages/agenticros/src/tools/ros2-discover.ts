/**
 * Tool: ros2_discover_robots — Phase 1.d "fleet awareness on the wire".
 *
 * Scans the ROS2 topic graph via `transport.listTopics()`, infers robot
 * namespaces from `<ns>/cmd_vel` patterns, and cross-references them
 * against the gateway's configured robot list. Returns four buckets so
 * the agent can answer "which robots are online right now?" without
 * forcing the user to hand-edit config:
 *
 *   - detected            — every robot inferred from the topic graph
 *   - configured_online   — configured AND on the wire
 *   - configured_offline  — configured but the wire is silent
 *   - unknown_detected    — on the wire but NOT in config (candidates)
 *
 * Read-only — nothing is written to config from this tool. Persistence
 * is a separate UX decision handled by the CLI / OpenClaw config UI.
 *
 * Pure-function detection + classification lives in @agenticros/core
 * (`discoverRobots()`) so all three adapters share the same semantics.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { discoverRobots } from "@agenticros/core";
import { getTransport } from "../service.js";

export function registerDiscoverRobotsTool(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  api.registerTool({
    name: "ros2_discover_robots",
    label: "ROS2 Discover Robots",
    description:
      "Scan the ROS2 topic graph and report which robots are actually on the wire right now, " +
      "classified against the gateway's configured robot list. Returns: (1) every namespace " +
      "inferred from `<ns>/cmd_vel` topics, with a topicCount that says how many corroborating " +
      "topics live under that namespace, (2) configured_online — configured robots currently " +
      "publishing, (3) configured_offline — configured robots that are silent, (4) " +
      "unknown_detected — robots on the wire that aren't in config yet (candidates to add via " +
      "the CLI / config UI). Use this when the user asks 'which robots are online right now', " +
      "'is my robot connected', or wants to find a robot that isn't in ros2_list_robots. " +
      "Requires the ROS transport to be connected.",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params) {
      const transport = getTransport();
      const topics = await transport.listTopics();
      const result = discoverRobots(topics, config);
      const payload = {
        success: true,
        total_topics: result.total_topics,
        detected: result.detected,
        configured_online: result.configured_online,
        configured_offline: result.configured_offline,
        unknown_detected: result.unknown_detected,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        details: payload,
      };
    },
  });
}
