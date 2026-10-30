import type { SynapseConfig, RobotSafetyOverlay } from "@corebrum/core";
import { checkPublishSafety as checkPublishSafetyCore } from "@corebrum/core";

/**
 * Twist + workspace gate for ros2_publish. Delegates to @corebrum/core
 * so per-robot overlays apply the same way as OpenClaw / Gemini / teleop.
 */
export function checkPublishSafety(
  config: SynapseConfig,
  params: Record<string, unknown>,
  robot?: { safety?: RobotSafetyOverlay } | null,
): { block: boolean; blockReason?: string } {
  return checkPublishSafetyCore(config, params, robot);
}
