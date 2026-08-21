/**
 * Robot hardware profile — features + ROS bindings.
 *
 * A profile declares what a *body* has (camera, base, arm, …) and where
 * those features live on this robot's ROS graph. Agent verbs
 * (`drive_base`, `follow_person`) are filtered against it; skills
 * address feature names, never a camera brand or URDF.
 *
 * Back-compat: `profile` is optional. No profile → no verb filtering
 * (today's gateway-wide registry). A declared profile is strict.
 */

import { z } from "zod";
import {
  resolveCameraSubscribeTopic,
  toNamespacedTopic,
  toNamespacedTopicFull,
} from "./topic-utils.js";

/** Frozen hardware vocabulary. Names are only added, never removed or repurposed. */
export const FEATURE_VOCABULARY = [
  "base",
  "arm",
  "gripper",
  "camera",
  "depth",
  "lidar",
  "imu",
  "dock",
  "display",
  "audio",
  "battery",
  "estop",
] as const;

export type FeatureName = (typeof FEATURE_VOCABULARY)[number];

export const FEATURE_VOCABULARY_SET: ReadonlySet<string> = new Set(FEATURE_VOCABULARY);

/** Frozen v1 binding keys. Values are ROS topic / action names. */
export const BINDING_KEYS = [
  "cmd_vel",
  "odom",
  "camera.rgb",
  "camera.depth",
  "lidar",
  "joint_states",
  "navigate_to_pose",
  "dock",
  "battery",
] as const;

export type BindingKey = (typeof BINDING_KEYS)[number];

export const BINDING_KEYS_SET: ReadonlySet<string> = new Set(BINDING_KEYS);

/**
 * Minimum binding expected for a declared feature. Used by doctor; a
 * feature without its v1 binding is a contract violation.
 */
export const FEATURE_REQUIRED_BINDING: Readonly<Partial<Record<FeatureName, BindingKey>>> = {
  base: "cmd_vel",
  camera: "camera.rgb",
  depth: "camera.depth",
  lidar: "lidar",
  arm: "joint_states",
  dock: "dock",
  battery: "battery",
};

export const PROFILE_SCHEMA_ID = "agenticros.profile.v1";

export const RobotProfileSchema = z.object({
  schema: z.literal(PROFILE_SCHEMA_ID).default(PROFILE_SCHEMA_ID),
  features: z.array(z.string().min(1)).default([]),
  bindings: z.record(z.string(), z.string()).default({}),
});

export type RobotProfile = z.infer<typeof RobotProfileSchema>;

/** Minimal robot shape the profile helpers need (avoids importing robots.ts). */
export interface ProfileRobot {
  namespace: string;
  cameraTopic: string;
  kind?: string;
  sensors?: {
    has_realsense?: boolean;
    has_lidar?: boolean;
    has_arm?: boolean;
  };
  profile?: RobotProfile;
}

export function isKnownFeature(name: string): name is FeatureName {
  return FEATURE_VOCABULARY_SET.has(name);
}

export function isKnownBindingKey(key: string): key is BindingKey {
  return BINDING_KEYS_SET.has(key);
}

export function unknownFeatures(features: readonly string[]): string[] {
  return features.filter((f) => !isKnownFeature(f));
}

export function unknownBindingKeys(bindings: Record<string, string>): string[] {
  return Object.keys(bindings).filter((k) => !isKnownBindingKey(k));
}

/** Features declared on a profile that lack their v1 binding. */
export function featuresMissingBindings(profile: RobotProfile): string[] {
  const missing: string[] = [];
  for (const feature of profile.features) {
    if (!isKnownFeature(feature)) continue;
    const key = FEATURE_REQUIRED_BINDING[feature];
    if (!key) continue;
    const value = profile.bindings[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      missing.push(feature);
    }
  }
  return missing;
}

export function resolveRobotProfile(robot: ProfileRobot): RobotProfile | undefined {
  return robot.profile;
}

/**
 * Map the deprecated Phase 1.e sensor booleans onto feature names.
 * Used only when `profile` is absent — so `--sensors=has_realsense`
 * still means something for fleet filtering / infer.
 */
export function featuresFromDeprecatedSensors(
  sensors: ProfileRobot["sensors"] | undefined,
): FeatureName[] {
  if (!sensors) return [];
  const out: FeatureName[] = [];
  if (sensors.has_realsense) {
    out.push("camera", "depth");
  }
  if (sensors.has_lidar) out.push("lidar");
  if (sensors.has_arm) out.push("arm");
  return out;
}

/** ALL-OF: every required feature is present on the profile. Empty requires always pass. */
export function featuresSatisfied(
  profile: RobotProfile | undefined,
  requires: readonly string[] | undefined,
): boolean {
  if (!requires || requires.length === 0) return true;
  if (!profile) return true;
  const have = new Set(profile.features);
  return requires.every((f) => have.has(f));
}

/** Required features the profile does not declare. Empty when satisfied or no profile. */
export function missingFeatures(
  profile: RobotProfile | undefined,
  requires: readonly string[] | undefined,
): string[] {
  if (!requires || requires.length === 0) return [];
  if (!profile) return [];
  const have = new Set(profile.features);
  return requires.filter((f) => !have.has(f));
}

function prefixBinding(namespace: string, key: string, raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  if (key === "camera.rgb" || key === "camera.depth") {
    return resolveCameraSubscribeTopic(namespace, value);
  }
  if (key === "cmd_vel") {
    return toNamespacedTopic(namespace, value);
  }
  return toNamespacedTopicFull(namespace, value);
}

/**
 * Resolve a binding key to a ROS name for this robot.
 *
 * Precedence: explicit `profile.bindings[key]`, then legacy fallbacks
 * (`cameraTopic` for `camera.rgb`, teleop/`/cmd_vel` for `cmd_vel`).
 * Relative names are namespace-prefixed.
 */
export function resolveBinding(
  robot: ProfileRobot,
  key: string,
  opts?: { cmdVelTopic?: string },
): string | undefined {
  const fromProfile = robot.profile?.bindings[key]?.trim();
  if (fromProfile) {
    return prefixBinding(robot.namespace, key, fromProfile);
  }
  if (key === "camera.rgb") {
    const cam = robot.cameraTopic.trim();
    if (cam) return resolveCameraSubscribeTopic(robot.namespace, cam);
    return undefined;
  }
  if (key === "cmd_vel") {
    const raw = (opts?.cmdVelTopic ?? "").trim() || "/cmd_vel";
    return toNamespacedTopic(robot.namespace, raw);
  }
  return undefined;
}

export interface InferProfileOptions {
  cmdVelTopic?: string;
}

/**
 * Draft a profile from kind, cameraTopic, deprecated sensors, and
 * namespaced cmd_vel. Used by `agenticros robots profile infer`.
 * Does not write config.
 */
export function inferProfileDraft(
  robot: ProfileRobot,
  opts?: InferProfileOptions,
): RobotProfile {
  const features = new Set<FeatureName>();
  const kind = (robot.kind ?? "amr").trim().toLowerCase();
  if (kind === "amr" || kind === "rover" || kind === "drone" || kind === "") {
    features.add("base");
  }
  if (kind === "arm" || kind === "mobile_manipulator") {
    features.add("arm");
  }
  if (kind === "mobile_manipulator") {
    features.add("base");
  }
  if (robot.cameraTopic.trim()) {
    features.add("camera");
  }
  for (const f of featuresFromDeprecatedSensors(robot.sensors)) {
    features.add(f);
  }

  const bindings: Record<string, string> = {};
  if (features.has("base")) {
    bindings["cmd_vel"] = resolveBinding(robot, "cmd_vel", opts) ?? "/cmd_vel";
  }
  if (features.has("camera")) {
    const rgb = resolveBinding(robot, "camera.rgb");
    if (rgb) bindings["camera.rgb"] = rgb;
  }
  if (features.has("depth")) {
    const depth =
      resolveBinding(robot, "camera.depth") ??
      resolveCameraSubscribeTopic(
        robot.namespace,
        "/camera/camera/depth/image_rect_raw",
      );
    bindings["camera.depth"] = depth;
  }

  return {
    schema: PROFILE_SCHEMA_ID,
    features: [...features],
    bindings,
  };
}
