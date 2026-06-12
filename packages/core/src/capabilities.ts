/**
 * Capability registry — Phase 1.a/1.b of the AgenticROS strategy.
 *
 * A capability is a named, declarable verb an LLM can plan against
 * (`follow_person`, `find_object`, `take_snapshot`, `drive_base`).
 * It's deliberately shaped to match inter-agent protocol agent cards
 * (ACP / A2A) so a skill's capability today is readable as an agent
 * capability when Phase 4 lands — no rewrite required.
 *
 * Two kinds of capabilities:
 *  - **Intrinsic** — built into every AgenticROS deployment (drive_base,
 *    take_snapshot, measure_depth, list_topics, publish, subscribe). Lives
 *    in this file as `BUILTIN_CAPABILITIES`.
 *  - **Skill-declared** — comes from a skill package's `package.json`
 *    under `agenticrosSkill.capabilities[]` (or a sibling
 *    `capabilities.json`). Read at adapter startup.
 *
 * See: docs/strategy-ai-agents-plus-ros.md §4 (Phase 1).
 */

import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import type { AgenticROSConfig } from "./config.js";

/** Where a capability came from. */
export type CapabilitySource =
  | { kind: "builtin" }
  | { kind: "skill"; skillId: string; package: string; path?: string };

/** Implementation hint — in-process Node.js skill vs external ROS node. */
export type CapabilityImplementation =
  | { kind: "in_process" }
  | {
      kind: "external_ros_node";
      package?: string;
      launch?: string;
      action?: string;
      service?: string;
      topic?: string;
      msg_type?: string;
    };

/** Typed input/output schema — minimal, JSON-Schema-ish. */
export interface CapabilityField {
  type: string;
  description?: string;
  optional?: boolean;
  default?: unknown;
}

/**
 * One capability the agent can plan against.
 *
 * Required: `id`, `verb`, `description`.
 * Everything else is optional so a skill can adopt the manifest
 * incrementally.
 */
export interface Capability {
  /** Unique identifier within a robot (e.g. `follow_person`, `find_object`). */
  id: string;
  /** High-level verb (`follow`, `find`, `navigate`, `manipulate`, `map`, `detect`). */
  verb: string;
  /** One-line, human-readable description. */
  description: string;
  /** Optional structured inputs the agent can fill. */
  inputs?: Record<string, CapabilityField>;
  /** Optional structured outputs the skill emits. */
  outputs?: Record<string, CapabilityField>;
  /** Free-form preconditions ("depthTopic available", "person detected"). */
  preconditions?: string[];
  /** Can be canceled mid-execution? Default true for intrinsic, varies for skills. */
  interruptible?: boolean;
  /** Owns the robot base (cmd_vel); other base-owning skills should yield. */
  blocks_base?: boolean;
  /** How the capability is implemented. Defaults to `in_process` when unset. */
  implementation?: CapabilityImplementation;
  /** Set by the registry, not the skill author. */
  source?: CapabilitySource;
}

/**
 * Built-in robot verbs — wrap the raw MCP tools in agent-meaningful
 * capability names. The intrinsic set is intentionally small and stable
 * so the agent's planning surface stays understandable as skill catalogs
 * grow.
 */
export const BUILTIN_CAPABILITIES: readonly Capability[] = [
  {
    id: "drive_base",
    verb: "drive",
    description:
      "Drive the robot base by publishing geometry_msgs/Twist to the configured cmd_vel topic. " +
      "Linear/angular velocities are clamped server-side by safety.maxLinearVelocity / maxAngularVelocity.",
    inputs: {
      linear_x: { type: "number", description: "Forward velocity (m/s).", optional: true },
      angular_z: { type: "number", description: "Yaw velocity (rad/s).", optional: true },
    },
    interruptible: true,
    blocks_base: true,
    source: { kind: "builtin" },
  },
  {
    id: "take_snapshot",
    verb: "see",
    description:
      "Capture one frame from the configured camera topic. Returns base64-encoded JPEG/PNG.",
    inputs: {
      topic: { type: "string", description: "Camera topic (defaults to robot.cameraTopic).", optional: true },
    },
    outputs: {
      format: { type: "string", description: "Image format (jpeg / png)." },
      width: { type: "number", description: "Image width in pixels." },
      height: { type: "number", description: "Image height in pixels." },
    },
    interruptible: true,
    source: { kind: "builtin" },
  },
  {
    id: "measure_depth",
    verb: "measure",
    description:
      "Sample the center of a depth image and return a distance in meters. " +
      "Use to answer 'how far am I from X' style questions.",
    inputs: {
      topic: { type: "string", description: "Depth topic.", optional: true },
    },
    outputs: {
      distance_m: { type: "number", description: "Distance in meters at image center." },
      median_m: { type: "number", description: "Median distance across sampled pixels." },
    },
    interruptible: true,
    source: { kind: "builtin" },
  },
  {
    id: "list_topics",
    verb: "introspect",
    description:
      "List all reachable ROS 2 topics with their message types. Use for discovery when " +
      "no other capability fits or to confirm what the robot currently publishes.",
    interruptible: true,
    source: { kind: "builtin" },
  },
  {
    id: "publish_topic",
    verb: "publish",
    description:
      "Generic ROS 2 publish escape hatch. Prefer a named capability when one exists; " +
      "publishes are safety-checked but otherwise unmediated.",
    inputs: {
      topic: { type: "string", description: "ROS 2 topic name." },
      type: { type: "string", description: "ROS 2 message type (e.g. geometry_msgs/msg/Twist)." },
      message: { type: "object", description: "Message payload matching the type schema." },
    },
    interruptible: true,
    source: { kind: "builtin" },
  },
  {
    id: "subscribe_once",
    verb: "read",
    description: "Read one message from a ROS 2 topic. Use for one-shot sensor reads or state checks.",
    inputs: {
      topic: { type: "string", description: "ROS 2 topic name." },
      type: { type: "string", description: "ROS 2 message type (optional, often inferred).", optional: true },
      timeout: { type: "number", description: "Milliseconds to wait (default 5000).", optional: true },
    },
    interruptible: true,
    source: { kind: "builtin" },
  },
];

function isCapabilityLike(value: unknown): value is Partial<Capability> & { id: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && v.id.length > 0;
}

function normalizeCapability(
  raw: Partial<Capability> & { id: string },
  source: CapabilitySource,
): Capability {
  return {
    id: raw.id,
    verb: typeof raw.verb === "string" && raw.verb ? raw.verb : raw.id,
    description: typeof raw.description === "string" ? raw.description : "",
    ...(raw.inputs ? { inputs: raw.inputs } : {}),
    ...(raw.outputs ? { outputs: raw.outputs } : {}),
    ...(raw.preconditions ? { preconditions: raw.preconditions } : {}),
    ...(typeof raw.interruptible === "boolean" ? { interruptible: raw.interruptible } : {}),
    ...(typeof raw.blocks_base === "boolean" ? { blocks_base: raw.blocks_base } : {}),
    ...(raw.implementation ? { implementation: raw.implementation } : { implementation: { kind: "in_process" } }),
    source,
  };
}

/**
 * Read the `agenticros.capabilities[]` array from a skill's package.json.
 * Returns `null` if the package doesn't declare a valid `agenticros` block.
 *
 * The legacy `agenticrosSkill: true | { capabilities }` form is NOT supported
 * — every skill must use the single `agenticros` block as its source of truth.
 */
function readSkillManifestFromDir(
  packageDir: string,
): { packageName: string; skillId: string; rawCaps: Array<Partial<Capability> & { id: string }> } | null {
  const pkgJsonPath = join(packageDir, "package.json");
  if (!existsSync(pkgJsonPath)) return null;
  let pkg: {
    name?: string;
    agenticros?: { id?: unknown; capabilities?: unknown };
  };
  try {
    pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  } catch {
    return null;
  }
  if (!pkg.agenticros || typeof pkg.agenticros !== "object") return null;
  if (typeof pkg.agenticros.id !== "string") return null;

  const packageName = pkg.name ?? "unknown";
  const skillId = pkg.agenticros.id;
  const rawCaps: Array<Partial<Capability> & { id: string }> = [];

  const caps = pkg.agenticros.capabilities;
  if (Array.isArray(caps)) {
    for (const c of caps) if (isCapabilityLike(c)) rawCaps.push(c);
  }

  return { packageName, skillId, rawCaps };
}

function resolvePackageDir(packageName: string, searchPaths: string[]): string | null {
  const req = createRequire(import.meta.url);
  for (const base of [...searchPaths, process.cwd()]) {
    try {
      const entry = req.resolve(`${packageName}/package.json`, { paths: [base] });
      return entry.replace(/\/package\.json$/, "");
    } catch {
    }
  }
  try {
    const entry = req.resolve(`${packageName}/package.json`);
    return entry.replace(/\/package\.json$/, "");
  } catch {
    return null;
  }
}

/**
 * Read every capability declared by every skill referenced in `config`.
 * Sources both `skillPaths` (directories with a package.json) and
 * `skillPackages` (resolvable npm names).
 *
 * Failures are silent — a missing skill is logged elsewhere by the
 * skill loader; this function focuses on returning the capabilities
 * it can read.
 */
export function readSkillCapabilities(config: AgenticROSConfig): Capability[] {
  const out: Capability[] = [];
  const seen = new Set<string>();

  const skillPaths = config.skillPaths ?? [];
  const skillPackages = config.skillPackages ?? [];

  for (const dir of skillPaths) {
    const absDir = resolvePath(dir);
    const manifest = readSkillManifestFromDir(absDir);
    if (!manifest) continue;
    for (const raw of manifest.rawCaps) {
      const key = `${manifest.skillId}:${raw.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(
        normalizeCapability(raw, {
          kind: "skill",
          skillId: manifest.skillId,
          package: manifest.packageName,
          path: absDir,
        }),
      );
    }
  }

  for (const pkgName of skillPackages) {
    const packageDir = resolvePackageDir(pkgName, skillPaths.map((p) => resolvePath(p)));
    if (!packageDir) continue;
    const manifest = readSkillManifestFromDir(packageDir);
    if (!manifest) continue;
    for (const raw of manifest.rawCaps) {
      const key = `${manifest.skillId}:${raw.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(
        normalizeCapability(raw, {
          kind: "skill",
          skillId: manifest.skillId,
          package: manifest.packageName,
          path: packageDir,
        }),
      );
    }
  }

  return out;
}

/**
 * Return the full capability list: built-in robot verbs first, then
 * skill-declared capabilities. This is the shape returned by
 * `ros2_list_capabilities` across every adapter.
 */
export function listAllCapabilities(config: AgenticROSConfig): Capability[] {
  return [...BUILTIN_CAPABILITIES, ...readSkillCapabilities(config)];
}
