/**
 * Tool: mission_resume — resume a paused mission.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import { getMissionRegistry } from "../mission-registry.js";

export function registerMissionResumeTool(api: OpenClawPluginApi): void {
  api.registerTool({
    name: "mission_resume",
    label: "Resume Mission",
    description:
      "Resume a mission previously paused with mission_pause. Pass the mission_id " +
      "returned by run_mission. Idempotent if the mission is not paused.",
    parameters: Type.Object({
      mission_id: Type.String({
        description: "The mission_id echoed by run_mission. Required.",
      }),
    }),

    async execute(_toolCallId, params) {
      const missionId = typeof params["mission_id"] === "string" ? (params["mission_id"] as string).trim() : "";
      if (!missionId) {
        const text = "mission_resume requires 'mission_id' (a non-empty string returned by run_mission).";
        return { content: [{ type: "text", text }], details: { success: false, error: text } };
      }
      const outcome = getMissionRegistry().resume(missionId);
      const details = {
        success: true,
        mission_id: missionId,
        found: outcome.found,
        was_paused: outcome.wasPaused,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(details) }],
        details,
      };
    },
  });
}
