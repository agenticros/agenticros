/**
 * Tool: mission_cancel — Phase 1.f of the AgenticROS strategy.
 *
 * Cancel a mission that's currently running in this OpenClaw plugin
 * process. Pass the `mission_id` returned by `run_mission`. The mission
 * runner stops at the next step boundary (the in-flight step finishes
 * naturally — per-tool preemption is out of scope for Phase 1.f),
 * marks remaining steps as "cancelled", and returns a result with
 * `status: "cancelled"`.
 *
 * Idempotent / safe-by-default:
 *  - Unknown mission_id → `found: false`, never an error
 *  - Calling twice on the same id → second call returns
 *    `already_cancelled: true` and is otherwise a no-op
 *  - No transport required — this only mutates an in-process
 *    `MissionRegistry`
 *
 * Mirrored across all three adapters (Claude Code, OpenClaw, Gemini)
 * with identical request/response shapes — see
 * `packages/agenticros-claude-code/src/tools.ts` for the canonical one.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import { getMissionRegistry } from "../mission-registry.js";

export function registerMissionCancelTool(api: OpenClawPluginApi): void {
  api.registerTool({
    name: "mission_cancel",
    label: "Cancel Mission",
    description:
      "Cancel a mission that's currently running in this OpenClaw plugin process. " +
      "Pass the mission_id returned by run_mission. The mission runner stops at the next " +
      "step boundary (the in-flight step finishes naturally), marks remaining steps as " +
      "'cancelled', and returns. If the mission has already finished (or the id is unknown), " +
      "this is a no-op that returns found=false. Optional 'reason' is recorded in the " +
      "cancelled step results for traceability.",
    parameters: Type.Object({
      mission_id: Type.String({
        description: "The mission_id echoed by run_mission. Required.",
      }),
      reason: Type.Optional(
        Type.String({
          description: "Optional free-text reason — surfaced in the cancelled mission result.",
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      const missionId = typeof params["mission_id"] === "string" ? (params["mission_id"] as string).trim() : "";
      if (!missionId) {
        const text = "mission_cancel requires 'mission_id' (a non-empty string returned by run_mission).";
        return { content: [{ type: "text", text }], details: { success: false, error: text } };
      }
      const reason = typeof params["reason"] === "string" ? (params["reason"] as string) : undefined;
      const outcome = getMissionRegistry().cancel(missionId, reason);
      const details = {
        success: true,
        mission_id: missionId,
        found: outcome.found,
        already_cancelled: outcome.alreadyCancelled,
        reason: reason ?? null,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(details) }],
        details,
      };
    },
  });
}
