/**
 * ros2_install_skill and ros2_create_skill.
 * Both wait for an operator grant before they change this machine.
 */

import { Type } from "../schema.js";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { createLocalSkillForOperator, installSkillForOperator } from "@agenticros/core";
import { ROBOT_ID_SCHEMA, resolveRobotForTool } from "./_robot-helpers.js";

export function registerSkillOperatorTools(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  api.registerTool({
    name: "ros2_install_skill",
    label: "ROS2 Install Skill",
    description:
      "Install one discoverable AgenticROS skill after the operator approves. " +
      "Pass install_ref from ros2_list_capabilities (owner/skill or @scope/name) and a short reason. " +
      "Refuses when the robot profile lacks a required feature. Does not start Nav2, MoveIt, or other external stacks. " +
      "Start the agent again before the new tools appear in this session.",
    parameters: Type.Object({
      ...ROBOT_ID_SCHEMA,
      install_ref: Type.String({
        description: "Marketplace ref such as agenticros/navigate-to, or an npm ref such as @agenticros/navigate-to.",
      }),
      reason: Type.Optional(
        Type.String({ description: "Why this mission needs the skill. Shown to the operator." }),
      ),
    }),
    async execute(_toolCallId, params) {
      const resolved = resolveRobotForTool(config, params);
      if ("error" in resolved) return resolved.error;
      const p = (params ?? {}) as { install_ref?: string; reason?: string };
      const result = await installSkillForOperator({
        ref: p.install_ref ?? "",
        reason: p.reason,
        profile: resolved.robot.profile,
      });
      const payload = { success: result.ok, message: result.text };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        details: payload,
      };
    },
  });

  api.registerTool({
    name: "ros2_create_skill",
    label: "ROS2 Create Skill",
    description:
      "Create a local AgenticROS skill when the catalog has nothing that fits. " +
      "The skill stays on this machine and is not published. Start the agent again before its tools appear.",
    parameters: Type.Object({
      slug: Type.String({ description: "Kebab-case skill name, such as wave-twice." }),
      reason: Type.Optional(
        Type.String({ description: "Why a local skill is needed. Shown to the operator." }),
      ),
      template: Type.Optional(
        Type.String({ description: "hello, robot, camera, or depth. Defaults to hello." }),
      ),
    }),
    async execute(_toolCallId, params) {
      const p = (params ?? {}) as { slug?: string; reason?: string; template?: string };
      const result = await createLocalSkillForOperator({
        slug: p.slug ?? "",
        reason: p.reason,
        template: p.template,
      });
      const payload = { success: result.ok, message: result.text };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        details: payload,
      };
    },
  });
}
