/**
 * {{displayName}} — capture one frame from the robot camera.
 */

import { Type } from "@sinclair/typebox";
import type { RosTransport } from "@agenticros/core";

const TOOL_NAME = "{{toolName}}";

interface SkillContext {
  getTransport(): RosTransport;
}

interface SkillPluginApi {
  registerTool(tool: {
    name: string;
    label: string;
    description: string;
    parameters: unknown;
    execute: (
      toolCallId: string,
      params: Record<string, unknown>,
      signal?: AbortSignal,
    ) => Promise<{ content: { type: string; text: string }[]; details?: unknown }>;
  }): void;
}

export function registerSkill(
  api: SkillPluginApi,
  config: { robot?: { cameraTopic?: string } },
  context: SkillContext,
): void {
  api.registerTool({
    name: TOOL_NAME,
    label: "{{displayName}}",
    description: "{{description}}",
    parameters: Type.Object({
      topic: Type.Optional(
        Type.String({ description: "Camera topic override (default from robot config)." }),
      ),
    }),
    async execute(_id, params) {
      const transport = context.getTransport();
      const topic =
        (typeof params.topic === "string" && params.topic) ||
        config.robot?.cameraTopic ||
        "camera/color/image_raw";
      const msg = await transport.subscribeOnce(topic, 5000);
      const encoding =
        msg && typeof msg === "object" && "encoding" in msg
          ? String((msg as { encoding?: string }).encoding ?? "unknown")
          : "unknown";
      const width =
        msg && typeof msg === "object" && "width" in msg
          ? Number((msg as { width?: number }).width ?? 0)
          : 0;
      const height =
        msg && typeof msg === "object" && "height" in msg
          ? Number((msg as { height?: number }).height ?? 0)
          : 0;
      const summary = `Captured ${width}x${height} frame (${encoding}) from ${topic}.`;
      return {
        content: [{ type: "text", text: summary }],
        details: { topic, width, height, encoding, captured: Boolean(msg) },
      };
    },
  });
}
