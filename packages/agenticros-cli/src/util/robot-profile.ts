/**
 * Robot profile helpers for the CLI.
 *
 * Mirrors `@agenticros/core` `robot-profile.ts` without importing core
 * (the published `agenticros` tarball must stay transport-free). Keep
 * the vocabulary in lockstep with packages/core/src/robot-profile.ts.
 */

export const PROFILE_SCHEMA_ID = "agenticros.profile.v1";

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

const FEATURE_SET = new Set<string>(FEATURE_VOCABULARY);
const BINDING_SET = new Set<string>(BINDING_KEYS);

export const FEATURE_REQUIRED_BINDING: Record<string, string> = {
  base: "cmd_vel",
  camera: "camera.rgb",
  depth: "camera.depth",
  lidar: "lidar",
  arm: "joint_states",
  dock: "dock",
  battery: "battery",
};

export interface RobotProfile {
  schema: string;
  features: string[];
  bindings: Record<string, string>;
}

export function isKnownFeature(name: string): boolean {
  return FEATURE_SET.has(name);
}

export function isKnownBindingKey(key: string): boolean {
  return BINDING_SET.has(key);
}

export function unknownFeatures(features: readonly string[]): string[] {
  return features.filter((f) => !isKnownFeature(f));
}

export function unknownBindingKeys(bindings: Record<string, string>): string[] {
  return Object.keys(bindings).filter((k) => !isKnownBindingKey(k));
}

export function featuresMissingBindings(profile: RobotProfile): string[] {
  const missing: string[] = [];
  for (const feature of profile.features) {
    const key = FEATURE_REQUIRED_BINDING[feature];
    if (!key) continue;
    const value = profile.bindings[key];
    if (typeof value !== "string" || value.trim().length === 0) missing.push(feature);
  }
  return missing;
}

export function parseFeaturesCsv(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const features = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const unknown = unknownFeatures(features);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown feature(s): ${unknown.join(", ")}. Accepted: ${FEATURE_VOCABULARY.join(", ")}.`,
    );
  }
  return features;
}

/**
 * Parse `--binding key=/topic` pairs. Throws on unknown keys or missing `=`.
 */
export function parseBindingPairs(pairs: string[] | undefined): Record<string, string> | undefined {
  if (pairs === undefined) return undefined;
  const bindings: Record<string, string> = {};
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      throw new Error(
        `Invalid --binding "${trimmed}". Expected key=/topic (e.g. --binding camera.rgb=/cam/compressed).`,
      );
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!isKnownBindingKey(key)) {
      throw new Error(`Unknown binding key "${key}". Accepted: ${BINDING_KEYS.join(", ")}.`);
    }
    if (!value) {
      throw new Error(`Binding "${key}" is missing a topic.`);
    }
    bindings[key] = value;
  }
  return bindings;
}

function prefixRootTopic(namespace: string, topic: string): string {
  const ns = namespace.trim();
  const normalized = topic.startsWith("/") ? topic : `/${topic}`;
  if (!ns) return normalized;
  const without = normalized.replace(/^\/+/, "");
  if (!without.includes("/")) return `/${ns}/${without}`;
  if (without === ns || without.startsWith(`${ns}/`)) return normalized;
  return normalized;
}

export function inferProfileDraft(input: {
  namespace?: string;
  cameraTopic?: string;
  kind?: string;
  sensors?: { has_realsense?: boolean; has_lidar?: boolean; has_arm?: boolean };
  cmdVelTopic?: string;
}): RobotProfile {
  const features = new Set<string>();
  const kind = (input.kind ?? "amr").trim().toLowerCase();
  if (kind === "amr" || kind === "rover" || kind === "drone" || kind === "") features.add("base");
  if (kind === "arm" || kind === "mobile_manipulator") features.add("arm");
  if (kind === "mobile_manipulator") features.add("base");
  const camera = (input.cameraTopic ?? "").trim();
  if (camera) features.add("camera");
  if (input.sensors?.has_realsense) {
    features.add("camera");
    features.add("depth");
  }
  if (input.sensors?.has_lidar) features.add("lidar");
  if (input.sensors?.has_arm) features.add("arm");

  const ns = input.namespace ?? "";
  const bindings: Record<string, string> = {};
  if (features.has("base")) {
    bindings["cmd_vel"] = prefixRootTopic(ns, (input.cmdVelTopic ?? "").trim() || "/cmd_vel");
    bindings["odom"] = prefixRootTopic(ns, "/odom");
  }
  if (features.has("camera") && camera) {
    bindings["camera.rgb"] = camera.startsWith("/") ? camera : `/${camera}`;
  }
  if (features.has("depth")) {
    bindings["camera.depth"] = "/camera/camera/depth/image_rect_raw";
  }

  return {
    schema: PROFILE_SCHEMA_ID,
    features: [...features],
    bindings,
  };
}

export function parseProfileObject(raw: unknown): RobotProfile | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const features = Array.isArray(o.features)
    ? o.features.filter((f): f is string => typeof f === "string" && f.length > 0)
    : [];
  const bindings: Record<string, string> = {};
  if (o.bindings && typeof o.bindings === "object" && !Array.isArray(o.bindings)) {
    for (const [k, v] of Object.entries(o.bindings as Record<string, unknown>)) {
      if (typeof v === "string") bindings[k] = v;
    }
  }
  return {
    schema: typeof o.schema === "string" ? o.schema : PROFILE_SCHEMA_ID,
    features,
    bindings,
  };
}
