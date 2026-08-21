/**
 * Shared safety gates: per-robot velocity limits, optional workspace
 * geofence, and fail-safe zero-Twist on transport loss.
 *
 * Adapters (MCP, OpenClaw, Gemini, teleop, skills) must call these
 * helpers rather than reading `config.safety` directly so a mixed
 * fleet does not share one clamp.
 */

import type { AgenticROSConfig, RobotSafetyOverlay, WorkspaceLimits } from "./config.js";
import type { ProfileRobot } from "./robot-profile.js";
import { resolveBinding } from "./robot-profile.js";
import type { RosTransport } from "./transport/transport.js";

export const TWIST_MSG_TYPE = "geometry_msgs/msg/Twist";

export const ZERO_TWIST: {
  linear: { x: number; y: number; z: number };
  angular: { x: number; y: number; z: number };
} = {
  linear: { x: 0, y: 0, z: 0 },
  angular: { x: 0, y: 0, z: 0 },
};

export interface SafetyLimits {
  maxLinearVelocity: number;
  maxAngularVelocity: number;
  workspaceLimits?: WorkspaceLimits;
}

export interface SafetyCheckResult {
  block: boolean;
  blockReason?: string;
}

export interface TwistComponents {
  linear: { x: number; y: number; z: number };
  angular: { x: number; y: number; z: number };
}

const PASS: SafetyCheckResult = { block: false };

function overlayOf(
  robot: { safety?: RobotSafetyOverlay } | null | undefined,
): RobotSafetyOverlay | undefined {
  return robot?.safety;
}

/**
 * Resolve velocity + workspace limits for a robot. Robot overlay fields
 * win; unset fields inherit the gateway `config.safety` defaults.
 */
export function resolveSafetyForRobot(
  config: AgenticROSConfig,
  robot?: { safety?: RobotSafetyOverlay } | null,
): SafetyLimits {
  const gateway = config.safety ?? {
    maxLinearVelocity: 1.0,
    maxAngularVelocity: 1.5,
  };
  const overlay = overlayOf(robot);
  return {
    maxLinearVelocity: overlay?.maxLinearVelocity ?? gateway.maxLinearVelocity ?? 1.0,
    maxAngularVelocity: overlay?.maxAngularVelocity ?? gateway.maxAngularVelocity ?? 1.5,
    workspaceLimits: overlay?.workspaceLimits ?? gateway.workspaceLimits,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** True when the payload looks like geometry_msgs/Twist. */
export function isTwistMessage(msg: unknown): boolean {
  const rec = asRecord(msg);
  if (!rec) return false;
  return asRecord(rec["linear"]) !== undefined || asRecord(rec["angular"]) !== undefined;
}

export function checkTwistMessage(limits: SafetyLimits, msg: unknown): SafetyCheckResult {
  if (!isTwistMessage(msg)) return PASS;
  const rec = asRecord(msg)!;
  const linear = asRecord(rec["linear"]);
  const angular = asRecord(rec["angular"]);

  if (linear) {
    const speed = Math.sqrt(num(linear["x"]) ** 2 + num(linear["y"]) ** 2 + num(linear["z"]) ** 2);
    if (speed > limits.maxLinearVelocity) {
      return {
        block: true,
        blockReason: `Linear velocity ${speed.toFixed(2)} m/s exceeds safety limit of ${limits.maxLinearVelocity} m/s`,
      };
    }
  }

  if (angular) {
    const rate = Math.abs(num(angular["z"]));
    if (rate > limits.maxAngularVelocity) {
      return {
        block: true,
        blockReason: `Angular velocity ${rate.toFixed(2)} rad/s exceeds safety limit of ${limits.maxAngularVelocity} rad/s`,
      };
    }
  }

  return PASS;
}

/** Scale a Twist down to the velocity ceilings (teleop / skills). */
export function clampTwistToLimits(
  limits: SafetyLimits,
  linearX: number,
  linearY: number,
  linearZ: number,
  angularX: number,
  angularY: number,
  angularZ: number,
): TwistComponents {
  const maxLin = limits.maxLinearVelocity;
  const maxAng = limits.maxAngularVelocity;
  const linMag = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
  const scaleLin = linMag > maxLin && linMag > 0 ? maxLin / linMag : 1;
  const angMag = Math.abs(angularZ);
  const scaleAng = angMag > maxAng && angMag > 0 ? maxAng / angMag : 1;
  return {
    linear: {
      x: linearX * scaleLin,
      y: linearY * scaleLin,
      z: linearZ * scaleLin,
    },
    angular: {
      x: angularX * scaleAng,
      y: angularY * scaleAng,
      z: Math.max(-maxAng, Math.min(maxAng, angularZ)),
    },
  };
}

function workspaceMalformed(bounds: WorkspaceLimits): string | undefined {
  if (bounds.xMin > bounds.xMax) {
    return `Malformed workspaceLimits: xMin (${bounds.xMin}) > xMax (${bounds.xMax})`;
  }
  if (bounds.yMin > bounds.yMax) {
    return `Malformed workspaceLimits: yMin (${bounds.yMin}) > yMax (${bounds.yMax})`;
  }
  return undefined;
}

export function checkWorkspacePosition(limits: SafetyLimits, x: number, y: number): SafetyCheckResult {
  const bounds = limits.workspaceLimits;
  if (!bounds) return PASS;
  const malformed = workspaceMalformed(bounds);
  if (malformed) return { block: true, blockReason: malformed };
  if (x < bounds.xMin || x > bounds.xMax || y < bounds.yMin || y > bounds.yMax) {
    return {
      block: true,
      blockReason:
        `Position (${x.toFixed(2)}, ${y.toFixed(2)}) is outside workspaceLimits ` +
        `[x ${bounds.xMin}..${bounds.xMax}, y ${bounds.yMin}..${bounds.yMax}]`,
    };
  }
  return PASS;
}

function pushPosition(out: Array<{ x: number; y: number }>, rec: Record<string, unknown> | undefined): void {
  if (!rec) return;
  if ("x" in rec && "y" in rec) {
    out.push({ x: num(rec["x"]), y: num(rec["y"]) });
    return;
  }
  const position = asRecord(rec["position"]);
  if (position && "x" in position && "y" in position) {
    out.push({ x: num(position["x"]), y: num(position["y"]) });
  }
}

/**
 * Pull map-frame (x, y) pairs from Twist-unrelated nav payloads:
 * `{x,y}`, Pose, PoseStamped, NavigateToPose goal, NavigateThroughPoses.
 */
export function extractWorkspacePositions(payload: unknown): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const rec = asRecord(payload);
  if (!rec) return out;

  if (Array.isArray(rec["poses"])) {
    for (const p of rec["poses"]) {
      out.push(...extractWorkspacePositions(p));
    }
  }

  const nestedGoal = rec["goal"] ?? rec["request"] ?? rec["message"];
  if (nestedGoal && nestedGoal !== payload) {
    out.push(...extractWorkspacePositions(nestedGoal));
  }

  const pose = asRecord(rec["pose"]);
  if (pose) {
    const inner = asRecord(pose["pose"]);
    if (inner) {
      pushPosition(out, inner);
    } else {
      pushPosition(out, pose);
    }
  }

  if ("x" in rec && "y" in rec && !asRecord(rec["linear"]) && !asRecord(rec["angular"])) {
    pushPosition(out, rec);
  }

  return out;
}

export function checkWorkspacePayload(limits: SafetyLimits, payload: unknown): SafetyCheckResult {
  if (!limits.workspaceLimits) return PASS;
  for (const pos of extractWorkspacePositions(payload)) {
    const hit = checkWorkspacePosition(limits, pos.x, pos.y);
    if (hit.block) return hit;
  }
  return PASS;
}

export function checkPublishSafety(
  config: AgenticROSConfig,
  params: Record<string, unknown>,
  robot?: { safety?: RobotSafetyOverlay } | null,
): SafetyCheckResult {
  const limits = resolveSafetyForRobot(config, robot);
  const msg = params["message"];
  const twist = checkTwistMessage(limits, msg);
  if (twist.block) return twist;
  return checkWorkspacePayload(limits, msg);
}

export function checkActionGoalSafety(
  config: AgenticROSConfig,
  params: Record<string, unknown>,
  robot?: { safety?: RobotSafetyOverlay } | null,
): SafetyCheckResult {
  const limits = resolveSafetyForRobot(config, robot);
  const goal = params["goal"] ?? params["args"] ?? params["inputs"] ?? params;
  return checkWorkspacePayload(limits, goal);
}

export function checkInputsWorkspace(
  config: AgenticROSConfig,
  inputs: Record<string, unknown>,
  robot?: { safety?: RobotSafetyOverlay } | null,
): SafetyCheckResult {
  return checkWorkspacePayload(resolveSafetyForRobot(config, robot), inputs);
}

/**
 * A body that accepts Twist. Profile `base` wins; with no profile,
 * anything except an arm-only cell is treated as having a base
 * (legacy configs default kind to "amr").
 */
export function robotHasMobileBase(robot: ProfileRobot): boolean {
  if (robot.profile) {
    return robot.profile.features.includes("base");
  }
  const kind = (robot.kind ?? "amr").trim().toLowerCase();
  return kind !== "arm";
}

const STOP_PUBLISH_BUDGET_MS = 500;

/** Best-effort zero Twist on every mobile-base robot sharing this transport. */
export async function publishStopForBases(
  transport: RosTransport,
  robots: readonly ProfileRobot[],
): Promise<void> {
  const pubs: Promise<unknown>[] = [];
  for (const robot of robots) {
    if (!robotHasMobileBase(robot)) continue;
    const topic = resolveBinding(robot, "cmd_vel");
    if (!topic) continue;
    try {
      transport.advertise?.({ topic, type: TWIST_MSG_TYPE });
    } catch {
      /* rosbridge advertise is optional */
    }
    try {
      const result = transport.publish({
        topic,
        type: TWIST_MSG_TYPE,
        msg: {
          linear: { ...ZERO_TWIST.linear },
          angular: { ...ZERO_TWIST.angular },
        },
      });
      if (result && typeof (result as Promise<unknown>).then === "function") {
        pubs.push(Promise.resolve(result).catch(() => {}));
      }
    } catch {
      /* socket may already be half-closed */
    }
  }
  if (pubs.length === 0) return;
  await Promise.race([
    Promise.all(pubs),
    new Promise<void>((resolve) => setTimeout(resolve, STOP_PUBLISH_BUDGET_MS)),
  ]);
}

/**
 * Publish zero Twist when the transport drops (and again on reconnect
 * so a stale last-command cannot resume). Returns an unsubscribe.
 */
export function attachDisconnectFailSafe(
  transport: RosTransport,
  robots: readonly ProfileRobot[],
): () => void {
  if (typeof transport.onConnection !== "function") return () => {};
  let everConnected = transport.getStatus() === "connected";
  return transport.onConnection((status) => {
    if (status === "connected") {
      if (everConnected) {
        void publishStopForBases(transport, robots);
      }
      everConnected = true;
      return;
    }
    if (status === "disconnected" && everConnected) {
      void publishStopForBases(transport, robots);
    }
  });
}

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

function findGraphEntry(
  names: ReadonlyArray<{ name: string; type?: string }>,
  wanted: string,
): { name: string; type?: string } | undefined {
  const target = normalizeGraphName(wanted);
  return names.find((n) => normalizeGraphName(n.name) === target);
}

/**
 * Compare declared profile bindings against a live topic/action list.
 * Missing declared hardware is red; type mismatch is yellow.
 */
export function checkLiveBindings(
  robots: ReadonlyArray<ProfileRobot & { id: string }>,
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
      const resolved =
        resolveBinding(robot, key) ??
        (typeof raw === "string" ? raw.trim() : "");
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
