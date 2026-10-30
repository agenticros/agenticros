/**
 * Robot config written by `synapse init --yes`.
 * Real robot, local ROS transport, empty namespace. Cloud and OpenAI stay unset.
 */

export interface DefaultRealRobotConfig {
  transport: { mode: "local" };
  robot: { namespace: string; name: string; cameraTopic: string };
  safety: { maxLinearVelocity: number; maxAngularVelocity: number };
  teleop: { cmdVelTopic: string; speedDefault: number };
}

export function defaultRealRobotConfig(): DefaultRealRobotConfig {
  return {
    transport: { mode: "local" },
    robot: {
      namespace: "",
      name: "My Robot",
      cameraTopic: "/camera/camera/color/image_raw",
    },
    safety: {
      maxLinearVelocity: 1.0,
      maxAngularVelocity: 1.5,
    },
    teleop: {
      cmdVelTopic: "/cmd_vel",
      speedDefault: 0.3,
    },
  };
}
