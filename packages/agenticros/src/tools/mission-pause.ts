/**
 * Tool: mission_pause — pause a running mission at the next step boundary.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import { getMissionRegistry } from "../mission-registry.js";

export function registerMissionPauseTool(api: OpenClawPluginApi): void {
  api.registerTool({
    name: "mission_pause",
    label: "Pause Mission",
    description:
      "Pause a mission that's currently running in this OpenClaw plugin process. " +
      "Pass the mission_id returned by run_mission. The runner waits at the next step " +
      "boundary until mission_resume (or mission_cancel). Idempotent if already paused.",
    parameters: Type.Object({
      mission_id: Type.String({
        description: "The mission_id echoed by run_mission. Required.",
      }),
      reason: Type.Optional(
        Type.String({
          description: "Optional free-text reason — surfaced in the paused transcript entry.",
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      const missionId = typeof params["mission_id"] === "string" ? (params["mission_id"] as string).trim() : "";
      if (!missionId) {
        const text = "mission_pause requires 'mission_id' (a non-empty string returned by run_mission).";
        return { content: [{ type: "text", text }], details: { success: false, error: text } };
      }
      const reason = typeof params["reason"] === "string" ? (params["reason"] as string) : undefined;
      const outcome = getMissionRegistry().pause(missionId, reason);
      const details = {
        success: true,
        mission_id: missionId,
        found: outcome.found,
        already_paused: outcome.alreadyPaused,
        reason: reason ?? null,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(details) }],
        details,
      };
    },
  });
}
