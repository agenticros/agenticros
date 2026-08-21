import type { AgenticROSConfig, RobotSafetyOverlay } from "@agenticros/core";
import { checkPublishSafety as checkPublishSafetyCore } from "@agenticros/core";

/**
 * Twist + workspace gate for ros2_publish. Delegates to @agenticros/core
 * so per-robot overlays apply the same way as OpenClaw / Gemini / teleop.
 */
export function checkPublishSafety(
  config: AgenticROSConfig,
  params: Record<string, unknown>,
  robot?: { safety?: RobotSafetyOverlay } | null,
): { block: boolean; blockReason?: string } {
  return checkPublishSafetyCore(config, params, robot);
}
