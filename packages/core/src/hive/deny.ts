/**
 * Client-side deny-list: Corebrum publish is unclamped. AgenticROS never
 * calls POST /api/publish, and refuses any recipe/task payload that would
 * write Twist / joints / gripper / Nav2 goals.
 */

const ACTUATION_TOPIC_RE =
  /(^|\/)(cmd_vel|cmd_vel_stamped|joint_trajectory|joint_command|joint_commands|gripper|follow_joint_trajectory|navigate_to_pose|navigate_through_poses|follow_path)(\/|$)/i;

const ACTUATION_HINT_RE =
  /\b(cmd_vel|joint_trajectory|joint_command|gripper_cmd|navigate_to_pose|follow_path)\b/i;

export function isDeniedActuationTopic(topic: string): boolean {
  const t = topic.trim();
  if (!t) return false;
  return ACTUATION_TOPIC_RE.test(t);
}

export function taskDefinitionMentionsActuation(value: unknown): boolean {
  try {
    return ACTUATION_HINT_RE.test(JSON.stringify(value));
  } catch {
    return false;
  }
}

/**
 * The hive client has no publish method. Call this if a future caller
 * tries to route actuation through Corebrum.
 */
export function assertHivePublishDenied(topic: string): never {
  throw new Error(
    `Hive client refuses to publish to "${topic}". Driving and joints stay in AgenticROS.`,
  );
}
