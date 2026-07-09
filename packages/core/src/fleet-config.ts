/**
 * Static fleet file — Phase 1.d hybrid discovery.
 *
 * Precedence: `AGENTICROS_FLEET_PATH` → `~/.agenticros/fleet.json` →
 * `config.robots[]` (via listRobots). When a fleet file exists and
 * parses as a non-empty robot array (or `{ robots: [...] }`), it wins.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgenticROSConfig } from "./config.js";
import { AgenticROSConfigSchema } from "./config.js";

export const DEFAULT_FLEET_FILENAME = "fleet.json";

/** Resolve the fleet file path (env override or default under ~/.agenticros). */
export function resolveFleetPath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.AGENTICROS_FLEET_PATH?.trim();
  if (override) return override;
  return join(homedir(), ".agenticros", DEFAULT_FLEET_FILENAME);
}

export interface FleetFileResult {
  /** Absolute path that was checked. */
  path: string;
  /** True when the file exists and was used. */
  used: boolean;
  /** Parsed robot entries (empty when unused / invalid). */
  robots: NonNullable<AgenticROSConfig["robots"]>;
  /** Human-readable error when the file exists but failed to parse. */
  error?: string;
}

/**
 * Load `fleet.json` if present. Does not throw on missing file.
 * Invalid JSON / schema → `used: false` with `error` set so callers can warn.
 */
export function loadFleetFile(path?: string): FleetFileResult {
  const fleetPath = path ?? resolveFleetPath();
  if (!existsSync(fleetPath)) {
    return { path: fleetPath, used: false, robots: [] };
  }
  try {
    const raw = JSON.parse(readFileSync(fleetPath, "utf8")) as unknown;
    let robotsRaw: unknown;
    if (Array.isArray(raw)) {
      robotsRaw = raw;
    } else if (raw && typeof raw === "object" && Array.isArray((raw as { robots?: unknown }).robots)) {
      robotsRaw = (raw as { robots: unknown[] }).robots;
    } else {
      return {
        path: fleetPath,
        used: false,
        robots: [],
        error: "fleet.json must be an array of robots or { robots: [...] }",
      };
    }
    const parsed = AgenticROSConfigSchema.pick({ robots: true }).safeParse({ robots: robotsRaw });
    if (!parsed.success) {
      return {
        path: fleetPath,
        used: false,
        robots: [],
        error: parsed.error.message,
      };
    }
    const robots = parsed.data.robots ?? [];
    if (robots.length === 0) {
      return { path: fleetPath, used: false, robots: [] };
    }
    return { path: fleetPath, used: true, robots };
  } catch (err) {
    return {
      path: fleetPath,
      used: false,
      robots: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Return a config view where `robots` comes from fleet.json when present.
 * Does not mutate the input config object.
 */
export function applyFleetOverride(config: AgenticROSConfig, fleetPath?: string): AgenticROSConfig {
  const fleet = loadFleetFile(fleetPath);
  if (!fleet.used) return config;
  return { ...config, robots: fleet.robots };
}
