/**
 * {{displayName}} — simple cmd_vel wave gesture.
 */

import { Type } from "@sinclair/typebox";
import type { RosTransport } from "@agenticros/core";

const TOOL_NAME = "{{toolName}}";
const CMD_VEL_TOPIC = "cmd_vel";

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function publishTwist(
  transport: RosTransport,
  linear: number,
  angular: number,
): Promise<void> {
  await transport.publish(CMD_VEL_TOPIC, "geometry_msgs/msg/Twist", {
    linear: { x: linear, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: angular },
  });
}

export function registerSkill(
  api: SkillPluginApi,
  _config: unknown,
  context: SkillContext,
): void {
  api.registerTool({
    name: TOOL_NAME,
    label: "{{displayName}}",
    description: "{{description}}",
    parameters: Type.Object({}),
    async execute() {
      const transport = context.getTransport();
      // Brief side-to-side angular motion as a "wave".
      await publishTwist(transport, 0, 0.4);
      await sleep(400);
      await publishTwist(transport, 0, -0.4);
      await sleep(400);
      await publishTwist(transport, 0, 0);
      const message = "I waved hello.";
      return {
        content: [{ type: "text", text: message }],
        details: { success: true, message },
      };
    },
  });
}
