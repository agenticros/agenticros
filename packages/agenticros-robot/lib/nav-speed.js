/**
 * Match Nav2's cmd_vel to the ARC remote-control speed slider.
 *
 * The slider is 0–100. Joystick and WASD already send that as a Twist
 * fraction (50 → linear.x 0.50). Map clicks send the same number as `speed`.
 * Nav2 still plans inside the bringup limits (max_vel_x 0.65). While a goal
 * is active the motor node multiplies that command so the top of the range
 * lands on the slider. Curvature stays the same because linear and angular
 * share the scale. Below the TT-motor duty floor the wheels are lifted later
 * by twistToWheelDuty, so a slider under 35 still starts the motors.
 *
 * NAV_VEL_REFERENCE must stay equal to FollowPath.max_vel_x in
 * ros2_ws/src/agenticros_bringup/config/nav2_rtabmap.yaml.
 */

import { WHEEL_MIN_DUTY } from './twist-duty.js';

export const NAV_VEL_REFERENCE = 0.65;

export function navCruiseTopic(cmdVelTopic) {
  const topic = String(cmdVelTopic || '/cmd_vel');
  if (topic.endsWith('/cmd_vel')) return `${topic.slice(0, -'cmd_vel'.length)}nav_cruise`;
  if (topic.endsWith('cmd_vel')) return `${topic.slice(0, -'cmd_vel'.length)}nav_cruise`;
  return `${topic}_nav_cruise`;
}

/**
 * ARC sends 0–100. A value already in (0, 1] is a duty fraction.
 * Returns null when the field is missing. Explicit 0 is kept so the
 * slider-at-zero path can still use the motor floor.
 */
export function cruiseFromSlider(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return null;
  if (raw === 0) return 0;
  const fraction = raw > 1 ? raw / 100 : raw;
  return Math.min(1, fraction);
}

/** Remember the last non-zero teleop command. A stop does not erase it. */
export function noteTeleopCruise(current, linearX, angularZ) {
  const peak = Math.max(Math.abs(Number(linearX) || 0), Math.abs(Number(angularZ) || 0));
  if (peak < 0.02) return current ?? null;
  return Math.min(1, peak);
}

/**
 * Speed to publish on nav_cruise while a goal is active.
 * null means "do not scale" (no slider seen yet).
 * Anything else is clamped to the duty that actually starts the motors.
 */
export function navCruiseCommand(fraction) {
  if (fraction == null || !Number.isFinite(Number(fraction))) return 0;
  const raw = Number(fraction);
  if (raw <= 0) return WHEEL_MIN_DUTY;
  return Math.min(1, Math.max(WHEEL_MIN_DUTY, raw));
}

/**
 * Scale a Nav2 twist so its fastest sample matches `cruise` (already floored).
 * cruise <= 0 leaves the command alone, which is teleop and "goal finished".
 */
export function scaleTwistToCruise(linearX, angularZ, cruise) {
  const lin = Number(linearX) || 0;
  const ang = Number(angularZ) || 0;
  const speed = Number(cruise);
  if (!(speed > 0)) return { linearX: lin, angularZ: ang };
  if (Math.abs(lin) < 0.02 && Math.abs(ang) < 0.02) return { linearX: 0, angularZ: 0 };
  const scale = speed / NAV_VEL_REFERENCE;
  return { linearX: lin * scale, angularZ: ang * scale };
}

export function navCruiseQos(rclnodejs) {
  if (!rclnodejs?.QoS) return null;
  try {
    return new rclnodejs.QoS(
      rclnodejs.QoS.HistoryPolicy.RMW_QOS_POLICY_HISTORY_KEEP_LAST,
      1,
      rclnodejs.QoS.ReliabilityPolicy.RMW_QOS_POLICY_RELIABILITY_RELIABLE,
      rclnodejs.QoS.DurabilityPolicy.RMW_QOS_POLICY_DURABILITY_TRANSIENT_LOCAL,
    );
  } catch {
    return null;
  }
}

export function subscribeNavCruise(node, cmdVelTopic, onCruise, rclnodejs) {
  const topic = navCruiseTopic(cmdVelTopic);
  const qos = navCruiseQos(rclnodejs);
  const callback = (msg) => {
    onCruise(Number(msg?.data) || 0);
  };
  if (qos) {
    try {
      node.createSubscription('std_msgs/msg/Float64', topic, { qos }, callback);
      return topic;
    } catch {
      /* fall through to the default QoS */
    }
  }
  node.createSubscription('std_msgs/msg/Float64', topic, callback);
  return topic;
}
