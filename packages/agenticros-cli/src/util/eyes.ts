/**
 * Helpers for launching @agenticros/eyes from the CLI.
 *
 * Resolves cmd_vel topic + safety limits from ~/.agenticros/config.json
 * (same conventions as OpenClaw teleop) and finds the eyes package entry.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { parseConfig, toNamespacedTopicFull } from "@agenticros/core";

import { readConfigObject } from "./robot-config.js";
import { getCliPaths } from "./paths.js";

/** Pure topic resolution (testable). Override → teleop.cmdVelTopic → namespaced /cmd_vel. */
export function cmdVelTopicFromConfig(
  raw: Record<string, unknown>,
  topicOverride?: string,
): string {
  const trimmed = (topicOverride ?? "").trim();
  if (trimmed) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  const config = parseConfig(raw);
  const fromTeleop = (config.teleop?.cmdVelTopic ?? "").trim();
  if (fromTeleop) return fromTeleop;
  return toNamespacedTopicFull(config, "/cmd_vel");
}

/** Resolve Twist topic from ~/.agenticros/config.json (+ optional CLI override). */
export function resolveCmdVelTopic(topicOverride?: string): string {
  return cmdVelTopicFromConfig(readConfigObject(), topicOverride);
}

export function safetyLimitsFromConfig(raw: Record<string, unknown>): {
  maxLinearVelocity: number;
  maxAngularVelocity: number;
} {
  const config = parseConfig(raw);
  return {
    maxLinearVelocity: config.safety?.maxLinearVelocity ?? 1.0,
    maxAngularVelocity: config.safety?.maxAngularVelocity ?? 1.5,
  };
}

export function resolveSafetyLimits(): {
  maxLinearVelocity: number;
  maxAngularVelocity: number;
} {
  return safetyLimitsFromConfig(readConfigObject());
}

/** Absolute path to packages/robot-eyes/src/index.js, or undefined if missing. */
export function resolveEyesEntry(): string | undefined {
  const paths = getCliPaths();
  if (!paths.repoRoot) return undefined;
  const entry = join(paths.repoRoot, "packages", "robot-eyes", "src", "index.js");
  return existsSync(entry) ? entry : undefined;
}

/** Package root (for cwd so node resolves ws/rclnodejs). */
export function resolveEyesPkgDir(): string | undefined {
  const paths = getCliPaths();
  if (!paths.repoRoot) return undefined;
  const dir = join(paths.repoRoot, "packages", "robot-eyes");
  return existsSync(dir) ? dir : undefined;
}

/**
 * True when pnpm has linked `ws` into packages/robot-eyes/node_modules.
 * Fresh installs after a CLI upgrade can ship robot-eyes source without
 * re-running pnpm install; Node then dies with ERR_MODULE_NOT_FOUND.
 */
export function areEyesDepsInstalled(pkgDir: string): boolean {
  return existsSync(join(pkgDir, "node_modules", "ws", "package.json"));
}
