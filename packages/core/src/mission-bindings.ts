/**
 * Capability → tool bindings for `run_mission`.
 *
 * Builtins live here once; adapters import `buildMissionBindings()` instead
 * of triplicating MISSION_BINDINGS. Skill-declared capabilities get a
 * default tool name (`ros2_<id>`, or `capability.tool` when set) and a
 * passthrough `buildArgs` that forwards resolved inputs.
 *
 * External ROS-node capabilities map to the synthetic tool
 * `external:<capability_id>` so adapters can dispatch via
 * `executeExternalCapability` before looking up a real tool.
 */

import type { Capability } from "./capabilities.js";
import type { CapabilityToolBinding, CapabilityToolBindings } from "./mission.js";

/** Optional explicit tool name on a capability (skill authors may set this). */
export type CapabilityWithTool = Capability & { tool?: string };

function copyNumber(out: Record<string, unknown>, inputs: Record<string, unknown>, key: string): void {
  if (typeof inputs[key] === "number") out[key] = inputs[key];
}

function copyString(out: Record<string, unknown>, inputs: Record<string, unknown>, key: string): void {
  if (typeof inputs[key] === "string") out[key] = inputs[key];
}

function copyBoolean(out: Record<string, unknown>, inputs: Record<string, unknown>, key: string): void {
  if (typeof inputs[key] === "boolean") out[key] = inputs[key];
}

/** Built-in capability → tool mappings shared by all adapters. */
export const BUILTIN_MISSION_BINDINGS: CapabilityToolBindings = {
  drive_base: {
    tool: "ros2_publish",
    buildArgs: (inputs) => {
      const lx = Number(inputs.linear_x ?? 0) || 0;
      const az = Number(inputs.angular_z ?? 0) || 0;
      return {
        topic: "/cmd_vel",
        type: "geometry_msgs/msg/Twist",
        message: {
          linear: { x: lx, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: az },
        },
      };
    },
  },
  take_snapshot: {
    tool: "ros2_camera_snapshot",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = {};
      copyString(out, inputs, "topic");
      copyString(out, inputs, "message_type");
      copyNumber(out, inputs, "timeout");
      return out;
    },
  },
  measure_depth: {
    tool: "ros2_depth_distance",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = {};
      copyString(out, inputs, "topic");
      copyNumber(out, inputs, "timeout");
      return out;
    },
  },
  list_topics: {
    tool: "ros2_list_topics",
    buildArgs: () => ({}),
  },
  publish_topic: {
    tool: "ros2_publish",
    buildArgs: (inputs) => ({
      topic: String(inputs.topic ?? ""),
      type: String(inputs.type ?? inputs.msg_type ?? ""),
      message: inputs.message ?? inputs.msg ?? {},
    }),
  },
  subscribe_once: {
    tool: "ros2_subscribe_once",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = { topic: String(inputs.topic ?? "") };
      copyString(out, inputs, "type");
      copyNumber(out, inputs, "timeout");
      return out;
    },
  },
  follow_person: {
    tool: "ros2_follow_me_start",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = {};
      copyNumber(out, inputs, "target_distance");
      copyString(out, inputs, "mode");
      return out;
    },
  },
  find_object: {
    tool: "ros2_find_object",
    buildArgs: (inputs) => {
      const out: Record<string, unknown> = { target: String(inputs.target ?? "") };
      copyNumber(out, inputs, "angular_speed");
      copyBoolean(out, inputs, "clockwise");
      copyNumber(out, inputs, "timeout_seconds");
      copyNumber(out, inputs, "min_confidence");
      return out;
    },
  },
};

/** Synthetic tool prefix for external_ros_node capabilities. */
export const EXTERNAL_TOOL_PREFIX = "external:";

export function externalToolName(capabilityId: string): string {
  return `${EXTERNAL_TOOL_PREFIX}${capabilityId}`;
}

export function isExternalToolName(toolName: string): boolean {
  return toolName.startsWith(EXTERNAL_TOOL_PREFIX);
}

export function capabilityIdFromExternalTool(toolName: string): string {
  return toolName.slice(EXTERNAL_TOOL_PREFIX.length);
}

/**
 * Default tool name for a skill-declared capability.
 * Prefer explicit `tool`, then external synthetic name, else `ros2_<id>`.
 */
export function defaultToolForCapability(cap: CapabilityWithTool): string {
  if (typeof cap.tool === "string" && cap.tool.trim().length > 0) {
    return cap.tool.trim();
  }
  if (cap.implementation?.kind === "external_ros_node") {
    return externalToolName(cap.id);
  }
  return `ros2_${cap.id}`;
}

/** Passthrough: forward resolved inputs as tool args (skill tools). */
export function passthroughBuildArgs(inputs: Record<string, unknown>): Record<string, unknown> {
  return { ...inputs };
}

export interface BuildMissionBindingsOptions {
  /**
   * Override tool name resolution for a capability id.
   * Useful when OpenClaw registers a skill tool under a non-default name.
   */
  toolNameResolver?: (cap: Capability) => string | undefined;
  /**
   * Extra bindings merged last (win over builtins and auto-derived).
   */
  extra?: CapabilityToolBindings;
}

/**
 * Build the full capability → tool map for a mission run.
 *
 * Order: builtins → auto-derived from non-builtin capabilities → extra.
 */
export function buildMissionBindings(
  capabilities: readonly Capability[],
  options: BuildMissionBindingsOptions = {},
): CapabilityToolBindings {
  const out: CapabilityToolBindings = { ...BUILTIN_MISSION_BINDINGS };

  for (const cap of capabilities) {
    if (cap.source?.kind === "builtin") continue;
    // Skip if already covered by builtins (e.g. follow_person from a skill
    // that duplicates the builtin id — keep the richer builtin binding).
    if (out[cap.id] && BUILTIN_MISSION_BINDINGS[cap.id]) continue;

    const resolved =
      options.toolNameResolver?.(cap) ?? defaultToolForCapability(cap as CapabilityWithTool);

    const binding: CapabilityToolBinding = {
      tool: resolved,
      buildArgs: passthroughBuildArgs,
    };
    out[cap.id] = binding;
  }

  if (options.extra) {
    Object.assign(out, options.extra);
  }

  return out;
}
