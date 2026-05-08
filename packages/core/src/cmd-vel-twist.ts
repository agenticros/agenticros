/**
 * Many mobile bases expect the opposite angular.z sign vs standard ROS base_link
 * (positive = CCW / "left"). Negate once at publish so teleop, chat, and skills agree.
 */

const TWIST_TYPE_RE = /geometry_msgs\/(msg\/)?Twist/i;

function isCmdVelTopic(topic: string): boolean {
  const normalized = topic.trim().replace(/\/+$/, "");
  return normalized === "/cmd_vel" || /\/cmd_vel$/i.test(normalized);
}

/**
 * If this is a geometry_msgs/Twist on a cmd_vel topic, return a copy with angular.z negated.
 */
export function applyCmdVelTwistSignConvention(topic: string, type: string, msg: Record<string, unknown>): Record<string, unknown> {
  const t = type.trim();
  if (!TWIST_TYPE_RE.test(t)) return msg;
  if (!isCmdVelTopic(topic)) return msg;
  const angular = msg["angular"];
  if (!angular || typeof angular !== "object") return msg;
  const a = angular as Record<string, unknown>;
  const z = Number(a["z"] ?? 0);
  return {
    ...msg,
    angular: {
      ...a,
      z: -z,
    },
  };
}
