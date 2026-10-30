import type { SynapseConfig, RobotSafetyOverlay } from "@corebrum/core";
import { checkPublishSafety as checkPublishSafetyCore } from "@corebrum/core";

/**
 * Twist + workspace gate for ros2_publish. Same core helper as the
 * other adapters so per-robot overlays cannot drift.
 */
export function checkPublishSafety(
  config: SynapseConfig,
  params: Record<string, unknown>,
  robot?: { safety?: RobotSafetyOverlay } | null,
): { block: boolean; blockReason?: string } {
  return checkPublishSafetyCore(config, params, robot);
}
