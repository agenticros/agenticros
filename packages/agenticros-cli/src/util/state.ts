/**
 * Persistent CLI state stored in ~/.agenticros/cli-state.json.
 *
 * Used by the interactive menu to remember last-used choices so subsequent
 * runs default sensibly. Intentionally tiny — anything bigger belongs in
 * ~/.agenticros/config.json (the AgenticROS runtime config).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getCliPaths } from "./paths.js";

export interface CliState {
  /** "real" | "sim-amr" | "sim-arm" */
  lastMode?: string;
  /** Last AgenticROS robot namespace used (e.g. "sim_robot" or a UUID-derived id). */
  lastNamespace?: string;
  /** Last ROS distro choice for `up real` (e.g. "humble" / "jazzy"). */
  lastRosDistro?: string;
  /** Whether to show RViz by default for sim launches. */
  lastUseRviz?: boolean;
  /** ISO timestamp of the last `agenticros up` invocation, for "(yesterday)" hints. */
  lastUpAt?: string;
  /** Schema version — bump when we add migrations. */
  v?: number;
}

function statePath(): string {
  return join(getCliPaths().userDataDir, "cli-state.json");
}

export function readState(): CliState {
  const p = statePath();
  if (!existsSync(p)) return {};
  try {
    const raw = readFileSync(p, "utf8");
    const obj = JSON.parse(raw) as CliState;
    if (typeof obj === "object" && obj !== null) return obj;
    return {};
  } catch {
    return {};
  }
}

export function writeState(patch: Partial<CliState>): CliState {
  const p = statePath();
  mkdirSync(dirname(p), { recursive: true });
  const current = readState();
  const next: CliState = { v: 1, ...current, ...patch };
  writeFileSync(p, JSON.stringify(next, null, 2));
  return next;
}

/** Friendly age string for menu hints: "today", "yesterday", "3 days ago". */
export function formatAge(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return undefined;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
