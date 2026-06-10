/**
 * Tool: ros2_find_robots_for — Phase 1.e of the AgenticROS strategy.
 *
 * Capability-aware fleet filter: given a (capability, kind, online)
 * query, returns the configured robots that match, ranked best-first.
 * This is the tool that lets an LLM ask "which robot can find a chair"
 * or "is there an AMR online that can follow a person" and get a
 * structured answer it can plan against — without scanning topic lists.
 *
 * Config-only by default (no transport touched). When the caller sets
 * `online: true|false`, we list topics via the global transport and
 * cross-reference against `<ns>/cmd_vel` patterns to compute the live
 * set — same heuristic as ros2_discover_robots, sharing
 * `discoverRobots()` from @agenticros/core. The transport is only
 * acquired in that branch; offline-mode planning still works.
 *
 * Mirrored across all three adapters (Claude Code, OpenClaw, Gemini)
 * with identical request/response shapes — see
 * `packages/agenticros-claude-code/src/tools.ts` for the canonical one.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { discoverRobots, findRobotsFor } from "@agenticros/core";
import { getTransport } from "../service.js";

export function registerFindRobotsForTool(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  api.registerTool({
    name: "ros2_find_robots_for",
    label: "ROS2 Find Robots For",
    description:
      "Find the robots in the configured fleet that match a capability + kind + online filter, " +
      "ranked best-first. PREFER this over ros2_list_robots whenever the user names a verb " +
      "('which robot can find a chair', 'do I have an arm robot that can grasp', 'is there an " +
      "AMR online that can follow a person'). Capability matches the verbs from " +
      "ros2_list_capabilities — by default robots inherit the gateway-wide registry; declaring " +
      "per-robot capabilities in config narrows it. Kind matches robot.kind exactly ('amr' | " +
      "'arm' | 'drone' | 'rover'). When online=true, only currently-reachable robots are " +
      "returned (uses the same `<ns>/cmd_vel` heuristic as ros2_discover_robots and requires " +
      "the transport). The result lists matched robots with id/name/namespace/kind/sensors/" +
      "online flag, ranked so explicit capability declarations + online robots come first.",
    parameters: Type.Object({
      capability: Type.Optional(
        Type.String({
          description:
            "Capability id to match (e.g. 'follow_person', 'find_object', 'drive_base'). " +
            "Case-sensitive — use ros2_list_capabilities to get the exact list.",
        }),
      ),
      kind: Type.Optional(
        Type.String({
          description:
            "Robot kind filter (case-insensitive exact match). Common values: 'amr', 'arm', " +
            "'drone', 'rover'.",
        }),
      ),
      online: Type.Optional(
        Type.Boolean({
          description:
            "When true, only return robots currently reachable on the ROS2 graph (requires the " +
            "transport to be connected). When false, only return robots NOT reachable. When " +
            "omitted, online status is annotated on every match but doesn't filter the list.",
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      const p = (params ?? {}) as { capability?: string; kind?: string; online?: boolean };
      let onlineIds: Set<string> | undefined;
      if (p.online !== undefined) {
        const transport = getTransport();
        if (transport.getStatus() !== "connected") {
          const fail = {
            success: false,
            error:
              "online filter requires the ROS transport to be connected. Drop the 'online' " +
              "arg to run config-only, or check that zenohd / rosbridge is up.",
          };
          return { content: [{ type: "text", text: JSON.stringify(fail) }], details: fail };
        }
        const topics = await transport.listTopics();
        const disc = discoverRobots(topics, config);
        onlineIds = new Set(disc.configured_online.map((r) => r.id));
      }
      try {
        const result = findRobotsFor(
          config,
          { capability: p.capability, kind: p.kind, online: p.online },
          onlineIds,
        );
        // Flatten the FindRobotsForMatch shape into one object per
        // robot so the LLM doesn't have to dig through .robot.* —
        // identical shape to the claude-code adapter's formatter.
        const payload = {
          success: true,
          query: result.query,
          total: result.total,
          robots: result.robots.map((m) => ({
            id: m.robot.id,
            name: m.robot.name,
            namespace: m.robot.namespace,
            kind: m.robot.kind,
            sensors: m.robot.sensors,
            capabilities: m.robot.capabilities ?? null,
            cameraTopic: m.robot.cameraTopic,
            online: m.online,
            matched_capability_explicitly: m.matched_capability_explicitly,
            score: m.score,
          })),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(payload) }],
          details: payload,
        };
      } catch (e) {
        const fail = {
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
        return { content: [{ type: "text", text: JSON.stringify(fail) }], details: fail };
      }
    },
  });
}
