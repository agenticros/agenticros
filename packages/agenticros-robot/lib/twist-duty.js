/**
 * Mix a geometry_msgs/Twist into left/right duty in [-1, 1].
 *
 * The Jetson and Pi motor drivers use that duty directly as PWM fraction.
 * Nav2 sends real m/s and rad/s, often 0.05–0.15 while lining up a short
 * goal. TT motors on an L298N do not start at that duty (teleop already
 * works at about 0.3). Scale a non-zero mix up so the faster wheel reaches
 * `minDuty`, and keep the left/right ratio so a turn stays a turn.
 */

export const WHEEL_MIN_DUTY = 0.35;
const WHEEL_STOP = 0.02;

function clampDuty(value) {
  return Math.max(-1, Math.min(1, value));
}

export function twistToWheelDuty(linearX, angularZ, minDuty = WHEEL_MIN_DUTY) {
  let left = linearX - angularZ;
  let right = linearX + angularZ;
  const peak = Math.max(Math.abs(left), Math.abs(right));
  if (peak < WHEEL_STOP) return { left: 0, right: 0 };
  if (peak < minDuty) {
    const scale = minDuty / peak;
    left *= scale;
    right *= scale;
  }
  return {
    left: Number(clampDuty(left).toFixed(2)),
    right: Number(clampDuty(right).toFixed(2)),
  };
}
