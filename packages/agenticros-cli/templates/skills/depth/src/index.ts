/**
 * {{displayName}} — sample depth at image center (RealSense / depth camera).
 */

import { Type } from "@sinclair/typebox";
import type { RosTransport } from "@agenticros/core";

const TOOL_NAME = "{{toolName}}";

interface DepthSampleResult {
  distance_m: number;
  valid: boolean;
  topic: string;
}

interface SkillContext {
  getTransport(): RosTransport;
  getDepthDistance(
    transport: RosTransport,
    topic: string,
    timeoutMs?: number,
  ): Promise<DepthSampleResult>;
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
  config: { robot?: { depthTopic?: string } },
  context: SkillContext,
): void {
  api.registerTool({
    name: TOOL_NAME,
    label: "{{displayName}}",
    description: "{{description}}",
    parameters: Type.Object({
      topic: Type.Optional(
        Type.String({ description: "Depth topic override (default: depth/image_rect_raw)." }),
      ),
    }),
    async execute(_id, params) {
      const transport = context.getTransport();
      const topic =
        (typeof params.topic === "string" && params.topic) ||
        config.robot?.depthTopic ||
        "depth/image_rect_raw";
      const sample = await context.getDepthDistance(transport, topic, 5000);
      const text = sample.valid
        ? `Object is ${sample.distance_m.toFixed(1)} meters away.`
        : `No valid depth reading on ${topic}.`;
      return {
        content: [{ type: "text", text }],
        details: sample,
      };
    },
  });
}
