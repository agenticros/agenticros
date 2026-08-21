/**
 * Live graph vs declared profile bindings.
 *
 * Duplicates `@agenticros/core` `checkLiveBindings` so the published CLI
 * can typecheck against `@agenticros/core@^0.8.1` (no `workspace:` dep).
 * Keep in lockstep with packages/core/src/safety.ts.
 */

import type { RobotEntry } from "./robot-config.js";

export type LiveCheckSeverity = "green" | "yellow" | "red";

export interface LiveBindingCheck {
  id: string;
  robotId: string;
  key: string;
  name: string;
  severity: LiveCheckSeverity;
  reason: string;
}

export interface LiveGraphSnapshot {
  topics: ReadonlyArray<{ name: string; type?: string }>;
  actions?: ReadonlyArray<{ name: string; type?: string }>;
}

const ACTION_BINDING_KEYS = new Set(["navigate_to_pose", "dock"]);

const EXPECTED_TYPE_FRAGMENT: Record<string, RegExp> = {
  cmd_vel: /Twist/i,
  odom: /Odometry/i,
  "camera.rgb": /Image/i,
  "camera.depth": /Image/i,
  lidar: /LaserScan|PointCloud/i,
  joint_states: /JointState/i,
  battery: /BatteryState/i,
};

function normalizeGraphName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || "/";
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

function resolveDeclaredName(robot: RobotEntry, key: string, raw: string): string {
  const ns = robot.namespace ?? "";
  if (key === "cmd_vel") return prefixRootTopic(ns, raw);
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return normalized;
}

function findGraphEntry(
  names: ReadonlyArray<{ name: string; type?: string }>,
  wanted: string,
): { name: string; type?: string } | undefined {
  const target = normalizeGraphName(wanted);
  return names.find((n) => normalizeGraphName(n.name) === target);
}

export function checkLiveBindings(
  robots: ReadonlyArray<RobotEntry>,
  graph: LiveGraphSnapshot,
): LiveBindingCheck[] {
  const checks: LiveBindingCheck[] = [];
  for (const robot of robots) {
    const profile = robot.profile;
    if (!profile) continue;
    const entries = Object.entries(profile.bindings);
    if (entries.length === 0) {
      checks.push({
        id: `live-${robot.id}-no-bindings`,
        robotId: robot.id,
        key: "",
        name: "",
        severity: "yellow",
        reason: `Robot "${robot.id}" has a profile but no bindings to verify`,
      });
      continue;
    }
    for (const [key, raw] of entries) {
      const resolved = resolveDeclaredName(robot, key, raw);
      if (!resolved) continue;
      const isAction = ACTION_BINDING_KEYS.has(key);
      const pool = isAction ? (graph.actions ?? []) : graph.topics;
      const found = findGraphEntry(pool, resolved);
      const checkId = `live-${robot.id}-${key}`;
      if (!found) {
        if (isAction && (graph.actions === undefined || graph.actions.length === 0)) {
          checks.push({
            id: checkId,
            robotId: robot.id,
            key,
            name: resolved,
            severity: "yellow",
            reason: `Could not verify action ${key}=${resolved} (transport returned no action list)`,
          });
          continue;
        }
        checks.push({
          id: checkId,
          robotId: robot.id,
          key,
          name: resolved,
          severity: "red",
          reason: `Declared ${key}=${resolved} is not on the live graph`,
        });
        continue;
      }
      const expected = EXPECTED_TYPE_FRAGMENT[key];
      if (expected && found.type && !expected.test(found.type)) {
        checks.push({
          id: checkId,
          robotId: robot.id,
          key,
          name: resolved,
          severity: "yellow",
          reason: `${key}=${resolved} type is ${found.type} (expected ${expected})`,
        });
        continue;
      }
      checks.push({
        id: checkId,
        robotId: robot.id,
        key,
        name: resolved,
        severity: "green",
        reason: `${key}=${resolved} present`,
      });
    }
  }
  return checks;
}
