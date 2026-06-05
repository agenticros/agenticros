/**
 * Mode profile storage for AgenticROS.
 *
 * Profiles live at ~/.agenticros/profiles/<mode>.json. The active profile is
 * copied into ~/.agenticros/config.json (which is what every adapter actually
 * reads). Swapping profiles is what `agenticros config use <mode>` (and the
 * up-runners) does so users can flip between real-robot and simulation
 * without hand-editing JSON.
 *
 * Why profiles instead of a single config: the real robot and the sim AMR
 * have different namespaces, transports, safety limits, and camera topics.
 * Tracking both in one file requires the MCP server to know "which mode is
 * active right now," which is exactly the problem `.mcp.json` env override
 * already tried to solve - badly, because env vars unconditionally win and
 * silently break the other mode. With profiles + a live ~/.agenticros/
 * config.json, everything reads from one place; the CLI just swaps it.
 *
 * Profile bootstrap policy:
 *   * On first use, if ~/.agenticros/config.json exists but no profiles do,
 *     we treat the current config as the user's last-used mode and seed
 *     profiles from defaults for both modes (preserving any namespace the
 *     user already had for whichever mode matches it).
 *   * Otherwise we write the canonical defaults below.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { getCliPaths } from "./paths.js";

export type Mode = "real" | "sim";

export function profilesDir(): string {
  return join(getCliPaths().userDataDir, "profiles");
}

export function profilePath(mode: Mode): string {
  return join(profilesDir(), `${mode}.json`);
}

export function activeConfigPath(): string {
  return join(getCliPaths().userDataDir, "config.json");
}

export function modeMarkerPath(): string {
  return join(getCliPaths().userDataDir, "active-mode");
}

export function readActiveMode(): Mode | null {
  try {
    const raw = readFileSync(modeMarkerPath(), "utf8").trim();
    if (raw === "real" || raw === "sim") return raw;
  } catch {
    // No marker yet.
  }
  return null;
}

/**
 * Canonical real-robot profile. The namespace is intentionally a placeholder
 * - users edit it once after `init` (or `config set robot.namespace=...`) to
 * match their robot. We DO NOT bake in the workspace's example UUID because
 * that gets shared in repos.
 */
function realProfileDefaults(namespaceFallback?: string): Record<string, unknown> {
  return {
    transport: { mode: "local" },
    robot: {
      namespace: namespaceFallback ?? "my_robot",
      name: "Real Robot",
      cameraTopic: "/camera/camera/color/image_raw",
    },
    safety: { maxLinearVelocity: 1.0, maxAngularVelocity: 1.5 },
    teleop: { cmdVelTopic: "/cmd_vel", speedDefault: 0.3 },
  };
}

/**
 * Canonical sim-AMR profile. Mirrors ros2_ws/src/agenticros_sim/config/
 * agenticros-sim.config.json - namespace MUST be empty because the sim
 * bridge in amr_bridge.yaml publishes /cmd_vel, /odom, etc. at the graph
 * root (no robot prefix). Setting a namespace here means Claude publishes
 * into a void during simulation.
 */
function simProfileDefaults(): Record<string, unknown> {
  return {
    transport: { mode: "local" },
    robot: {
      namespace: "",
      name: "Sim AMR",
      cameraTopic: "/camera/camera/color/image_raw",
    },
    safety: { maxLinearVelocity: 0.5, maxAngularVelocity: 1.0 },
    teleop: { cmdVelTopic: "/cmd_vel", speedDefault: 0.2 },
    skills: {
      followme: { depthTopic: "/camera/camera/depth/image_rect_raw" },
    },
  };
}

function safeReadJson(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Ensure both real and sim profile files exist. Returns true if anything was
 * written (so callers can log it).
 */
export function ensureProfilesExist(): boolean {
  const dir = profilesDir();
  mkdirSync(dir, { recursive: true });

  let wrote = false;
  const realPath = profilePath("real");
  const simPath = profilePath("sim");

  // Bootstrap: if a config.json already exists from before profiles existed,
  // try to preserve whatever namespace the user had set. We don't know which
  // mode that config represents, so we use the current namespace for the
  // real-mode default (most users had a real-robot setup) and leave sim
  // strictly empty.
  let existingNs: string | undefined;
  const active = activeConfigPath();
  if (existsSync(active)) {
    const cur = safeReadJson(active);
    const ns = (cur?.robot as Record<string, unknown> | undefined)?.namespace;
    if (typeof ns === "string" && ns.length > 0) existingNs = ns;
  }

  if (!existsSync(realPath)) {
    writeFileSync(realPath, JSON.stringify(realProfileDefaults(existingNs), null, 2) + "\n");
    wrote = true;
  }
  if (!existsSync(simPath)) {
    writeFileSync(simPath, JSON.stringify(simProfileDefaults(), null, 2) + "\n");
    wrote = true;
  }

  return wrote;
}

/**
 * Swap ~/.agenticros/config.json to the requested mode and persist the
 * active-mode marker. Returns the absolute path to the active config.
 *
 * Idempotent: calling switchMode("sim") when sim is already active just
 * re-copies the profile (cheap, ensures freshness).
 */
export function switchMode(mode: Mode): string {
  ensureProfilesExist();
  const src = profilePath(mode);
  const dst = activeConfigPath();
  mkdirSync(getCliPaths().userDataDir, { recursive: true });
  copyFileSync(src, dst);
  writeFileSync(modeMarkerPath(), mode + "\n");
  return dst;
}

/**
 * Mutate a single field inside the profile JSON (e.g. real.robot.namespace).
 * Use sparingly - profiles are normally edited by hand or via `agenticros
 * config set` against the active config.
 */
export function patchProfile(
  mode: Mode,
  path: string[],
  value: unknown,
): void {
  ensureProfilesExist();
  const p = profilePath(mode);
  const obj = safeReadJson(p) ?? {};
  let cursor: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]!;
    const next = cursor[k];
    if (next && typeof next === "object" && !Array.isArray(next)) {
      cursor = next as Record<string, unknown>;
    } else {
      const o: Record<string, unknown> = {};
      cursor[k] = o;
      cursor = o;
    }
  }
  cursor[path[path.length - 1]!] = value;
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
