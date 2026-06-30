/**
 * {{displayName}} — AgenticROS hello-world skill (local dev / tutorial).
 */

import { Type } from "@sinclair/typebox";

const TOOL_NAME = "{{toolName}}";

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

export function registerSkill(api: SkillPluginApi): void {
  api.registerTool({
    name: TOOL_NAME,
    label: "{{displayName}}",
    description: "{{description}}",
    parameters: Type.Object({}),
    async execute() {
      const message = "Hello from AgenticROS!";
      return {
        content: [{ type: "text", text: message }],
        details: { success: true, message },
      };
    },
  });
}
