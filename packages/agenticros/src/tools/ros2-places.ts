import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import {
  executeNavigateToPlace,
  listPlaces,
  savePlaceFromArgs,
} from "@agenticros/core";
import { getTransportForRobot } from "../service.js";
import { ROBOT_ID_SCHEMA, resolveRobotForTool } from "./_robot-helpers.js";

function errResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: { success: false } };
}

export function registerPlacesTools(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.registerTool({
    name: "ros2_save_place",
    label: "Save Place",
    description:
      "Save a named map pose for later \"go to the kitchen\". Pass name plus optional x,y,yaw. If x/y are omitted, reads /amcl_pose.",
    parameters: Type.Object({
      name: Type.String({ description: "Place name (e.g. kitchen)." }),
      x: Type.Optional(Type.Number({ description: "Map-frame x (m)." })),
      y: Type.Optional(Type.Number({ description: "Map-frame y (m)." })),
      yaw: Type.Optional(Type.Number({ description: "Map-frame yaw (rad)." })),
      frame: Type.Optional(Type.String({ description: "Frame id (default map)." })),
      ...ROBOT_ID_SCHEMA,
    }),
    async execute(_id, params) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;
      try {
        const transport = await getTransportForRobot(config, resolved.robot);
        const place = await savePlaceFromArgs(params as Record<string, unknown>, {
          robot: resolved.robot,
          transport,
        });
        const text = JSON.stringify({ success: true, place });
        return { content: [{ type: "text", text }], details: place };
      } catch (err) {
        return errResult(err instanceof Error ? err.message : String(err));
      }
    },
  });

  api.registerTool({
    name: "ros2_list_places",
    label: "List Places",
    description: "List named places saved with ros2_save_place.",
    parameters: Type.Object({}),
    async execute() {
      const places = listPlaces();
      const text = JSON.stringify({ success: true, count: places.length, places });
      return { content: [{ type: "text", text }], details: { places } };
    },
  });

  api.registerTool({
    name: "ros2_navigate_to_place",
    label: "Navigate To Place",
    description:
      "Navigate to a named place via Nav2. Requires @agenticros/navigate-to (`agenticros skills install --bundle mapping`).",
    parameters: Type.Object({
      name: Type.String({ description: "Place name from ros2_list_places." }),
      ...ROBOT_ID_SCHEMA,
    }),
    async execute(_id, params) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;
      const name = String((params as { name?: string }).name ?? "").trim();
      if (!name) return errResult("ros2_navigate_to_place requires 'name'.");
      try {
        const transport = await getTransportForRobot(config, resolved.robot);
        const nav = await executeNavigateToPlace(config, resolved.robot, name, transport);
        return {
          content: [{ type: "text", text: nav.text }],
          details: { success: !nav.isError, place: nav.place },
        };
      } catch (err) {
        return errResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
