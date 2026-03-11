import type { AgenticROSConfig } from "@agenticros/core";

/**
 * Minimal safety check for ros2_publish (Twist velocity limits).
 * Copied from OpenClaw adapter so we don't depend on the full plugin.
 */
export function checkPublishSafety(
  config: AgenticROSConfig,
  params: Record<string, unknown>,
): { block: boolean; blockReason?: string } {
  const safety = config.safety ?? {};
  const maxLinear = safety.maxLinearVelocity ?? 1.0;
  const maxAngular = safety.maxAngularVelocity ?? 1.5;

  const msg = params["message"] as Record<string, unknown> | undefined;
  if (!msg) return { block: false };

  const linear = msg["linear"] as Record<string, number> | undefined;
  const angular = msg["angular"] as Record<string, number> | undefined;

  if (linear) {
    const speed = Math.sqrt(
      (linear["x"] ?? 0) ** 2 + (linear["y"] ?? 0) ** 2 + (linear["z"] ?? 0) ** 2,
    );
    if (speed > maxLinear) {
      return {
        block: true,
        blockReason: `Linear velocity ${speed.toFixed(2)} m/s exceeds safety limit of ${maxLinear} m/s`,
      };
    }
  }

  if (angular) {
    const rate = Math.abs(angular["z"] ?? 0);
    if (rate > maxAngular) {
      return {
        block: true,
        blockReason: `Angular velocity ${rate.toFixed(2)} rad/s exceeds safety limit of ${maxAngular} rad/s`,
      };
    }
  }

  return { block: false };
}
