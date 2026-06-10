/**
 * Robot config R/W for the AgenticROS CLI.
 *
 * Lives in the CLI so the multi-robot persistence path does NOT pull
 * `@agenticros/core` (and its transport deps) into the published
 * `agenticros` tarball. The shape we read/write is intentionally a
 * subset of `@agenticros/core`'s `AgenticROSConfig.robots`:
 *
 *   robots: Array<{
 *     id: string;
 *     name?: string;
 *     namespace?: string;
 *     cameraTopic?: string;
 *     default?: boolean;
 *   }>
 *
 * Backwards compat with the legacy single-robot config:
 *   - If `config.robots` is absent/empty AND `config.robot` is set, we
 *     "promote" `config.robot` into `robots[0]` on the next write. The
 *     legacy `config.robot` field is LEFT in place (harmlessly — the
 *     core resolver prefers the explicit array when non-empty) so older
 *     adapters that only read `config.robot` keep working.
 *   - When the file is missing or empty we treat it as `{}`. Writes
 *     create both the file and its directory.
 *
 * All paths route through the CLI's own paths helper so workspace /
 * installed / bundle modes pick up the same `~/.agenticros/config.json`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { getCliPaths } from "./paths.js";

/** Sensor/hardware tags on a robot — mirrors @agenticros/core's RobotSensors. */
export interface RobotSensors {
  has_realsense?: boolean;
  has_lidar?: boolean;
  has_arm?: boolean;
}

/** What the CLI persists per robot. Matches the core config schema. */
export interface RobotEntry {
  id: string;
  name?: string;
  namespace?: string;
  cameraTopic?: string;
  default?: boolean;
  /**
   * Phase 1.e robot kind ("amr" | "arm" | "drone" | "rover" | …).
   * Free-form string; core defaults to "amr" when unset.
   */
  kind?: string;
  /**
   * Phase 1.e sensor/hardware tags. Same all-false default semantics
   * as core — only the keys the user sets are written through.
   */
  sensors?: RobotSensors;
  /**
   * Phase 1.e optional per-robot capability allowlist. When set, the
   * `ros2_find_robots_for` filter uses this list instead of the
   * gateway's global capability registry. Stored verbatim — the CLI
   * doesn't import the registry to validate against.
   */
  capabilities?: string[];
  /**
   * Optional per-robot transport override. Opaque JSON — the core's
   * `RobotTransportOverrideSchema` is the schema-of-truth and will Zod-
   * validate this at config-load time. The CLI doesn't import core, so
   * we only carry the field through as a plain object.
   */
  transport?: Record<string, unknown>;
}

/** Default value carried over when the legacy `config.robot` is promoted. */
const DEFAULT_ROBOT_NAME = "Robot";

export function robotConfigPath(): string {
  return join(getCliPaths().userDataDir, "config.json");
}

/** Parse `~/.agenticros/config.json` to a plain object, or `{}` when absent/bad. */
export function readConfigObject(path = robotConfigPath()): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fallthrough — return {} on parse error */
  }
  return {};
}

/** Write the config object back, creating directories as needed. */
export function writeConfigObject(obj: Record<string, unknown>, path = robotConfigPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
}

/**
 * Resolve the legacy `config.robot` to a RobotEntry, mirroring the core
 * resolver. `id` falls back to namespace (or "default"), `name` to "Robot".
 * Returns `null` if neither the legacy object nor a usable namespace exists.
 */
function legacyToEntry(legacy: unknown): RobotEntry | null {
  if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return null;
  const r = legacy as Record<string, unknown>;
  const namespace = typeof r["namespace"] === "string" ? r["namespace"] : "";
  const name = typeof r["name"] === "string" && r["name"].trim() ? r["name"] : DEFAULT_ROBOT_NAME;
  const cameraTopic = typeof r["cameraTopic"] === "string" ? r["cameraTopic"] : "";
  // Synthesise id from namespace, falling back to "default" — same as
  // @agenticros/core's `listRobots()` legacy fallback.
  const id = namespace.trim() || "default";
  return { id, name, namespace, cameraTopic };
}

/**
 * Return the robots[] view the agent would see (explicit array when
 * non-empty, otherwise a one-entry array synthesised from legacy
 * `config.robot`). Read-only — the CLI uses this to render `robots list`
 * without ever needing to import @agenticros/core.
 */
export function readRobots(
  obj: Record<string, unknown> = readConfigObject(),
): { robots: RobotEntry[]; from: "explicit" | "legacy" | "none" } {
  const explicit = Array.isArray(obj["robots"]) ? (obj["robots"] as unknown[]) : [];
  if (explicit.length > 0) {
    const robots = explicit
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
      .map((r) => ({
        id: String(r["id"] ?? ""),
        name: typeof r["name"] === "string" ? r["name"] : undefined,
        namespace: typeof r["namespace"] === "string" ? r["namespace"] : undefined,
        cameraTopic: typeof r["cameraTopic"] === "string" ? r["cameraTopic"] : undefined,
        default: r["default"] === true ? true : undefined,
        kind: typeof r["kind"] === "string" ? r["kind"] : undefined,
        sensors:
          r["sensors"] && typeof r["sensors"] === "object" && !Array.isArray(r["sensors"])
            ? (r["sensors"] as RobotSensors)
            : undefined,
        capabilities: Array.isArray(r["capabilities"])
          ? (r["capabilities"] as unknown[]).filter((c): c is string => typeof c === "string")
          : undefined,
        transport:
          r["transport"] && typeof r["transport"] === "object" && !Array.isArray(r["transport"])
            ? (r["transport"] as Record<string, unknown>)
            : undefined,
      }))
      .filter((r) => r.id.length > 0);
    return { robots, from: "explicit" };
  }

  const legacy = legacyToEntry(obj["robot"]);
  if (legacy) return { robots: [legacy], from: "legacy" };
  return { robots: [], from: "none" };
}

/**
 * Compute the active robot id using the same precedence the core
 * resolver does:
 *   1. explicit robots[] entry with `default: true`
 *   2. first entry in robots[] (with legacy fallback)
 *   3. undefined when there are no robots at all
 */
export function getActiveRobotId(obj: Record<string, unknown> = readConfigObject()): string | undefined {
  const explicit = Array.isArray(obj["robots"]) ? (obj["robots"] as unknown[]) : [];
  if (explicit.length > 0) {
    const flagged = explicit.find(
      (r) =>
        r != null &&
        typeof r === "object" &&
        !Array.isArray(r) &&
        (r as Record<string, unknown>)["default"] === true,
    ) as Record<string, unknown> | undefined;
    if (flagged && typeof flagged["id"] === "string" && flagged["id"]) {
      return flagged["id"];
    }
  }
  const { robots } = readRobots(obj);
  return robots[0]?.id;
}

export interface AddRobotResult {
  /** Whether the entry was actually written (false = a duplicate id was already present). */
  added: boolean;
  /** True when this write promoted the legacy `config.robot` into `robots[]`. */
  promotedLegacy: boolean;
  /** The final robots[] array after the write. */
  robots: RobotEntry[];
}

/**
 * Add a robot to `config.robots[]`.
 *
 * Promotes the legacy single-robot config on first multi-robot write —
 * `config.robot` is copied as the first entry in the array, and any
 * `default: true` flag we'd set on the new entry is held against that
 * promoted incumbent (it stays the default unless the caller explicitly
 * asks otherwise).
 *
 * Idempotent: re-adding an existing id updates name/namespace/cameraTopic
 * in place but returns `added: false` so the CLI can render the right
 * "already present" message.
 */
export function addRobot(
  entry: RobotEntry,
  opts: { setDefault?: boolean; obj?: Record<string, unknown> } = {},
): AddRobotResult {
  const obj = opts.obj ?? readConfigObject();
  const explicit = Array.isArray(obj["robots"]) ? [...(obj["robots"] as unknown[])] : [];

  let promotedLegacy = false;
  if (explicit.length === 0) {
    const legacy = legacyToEntry(obj["robot"]);
    if (legacy) {
      // Promote: legacy becomes the (default) first entry. We mark it
      // default so the existing behavior — "the single configured robot
      // is the active one" — is preserved unless the caller of this
      // add explicitly sets the new entry as default below.
      explicit.push({ ...legacy, default: true });
      promotedLegacy = true;
    }
  }

  // De-dup by id. If the id already exists, update in place and return
  // added=false. This is what makes `agenticros robots add <id>` a
  // safe idempotent operation.
  const existingIdx = explicit.findIndex(
    (r) =>
      r != null &&
      typeof r === "object" &&
      !Array.isArray(r) &&
      String((r as Record<string, unknown>)["id"] ?? "") === entry.id,
  );

  const next: Record<string, unknown> = {
    id: entry.id,
    name: entry.name ?? DEFAULT_ROBOT_NAME,
    namespace: entry.namespace ?? "",
    cameraTopic: entry.cameraTopic ?? "",
  };
  if (opts.setDefault) next["default"] = true;
  // Caller may carry an explicit per-robot transport override into the
  // entry. When omitted on an in-place update we preserve the prior
  // override (see below) so re-running `robots add` without --transport
  // doesn't silently drop a previously-configured override.
  if (entry.transport !== undefined) next["transport"] = entry.transport;
  // Same preserve-on-update story for kind / sensors / capabilities —
  // these are sticky Phase 1.e fleet-metadata fields that survive a
  // `robots add <id> --name=...`.
  if (entry.kind !== undefined) next["kind"] = entry.kind;
  if (entry.sensors !== undefined) next["sensors"] = entry.sensors;
  if (entry.capabilities !== undefined) next["capabilities"] = entry.capabilities;

  let added: boolean;
  if (existingIdx >= 0) {
    // Update in place. Preserve any `default` already on the entry
    // unless the caller is explicitly setting it.
    const prev = explicit[existingIdx] as Record<string, unknown>;
    if (opts.setDefault === undefined && prev["default"] === true) next["default"] = true;
    if (
      entry.transport === undefined &&
      prev["transport"] &&
      typeof prev["transport"] === "object" &&
      !Array.isArray(prev["transport"])
    ) {
      next["transport"] = prev["transport"];
    }
    if (entry.kind === undefined && typeof prev["kind"] === "string") {
      next["kind"] = prev["kind"];
    }
    if (
      entry.sensors === undefined &&
      prev["sensors"] &&
      typeof prev["sensors"] === "object" &&
      !Array.isArray(prev["sensors"])
    ) {
      next["sensors"] = prev["sensors"];
    }
    if (entry.capabilities === undefined && Array.isArray(prev["capabilities"])) {
      next["capabilities"] = prev["capabilities"];
    }
    explicit[existingIdx] = next;
    added = false;
  } else {
    explicit.push(next);
    added = true;
  }

  // If the caller is making this new entry the default, strip default
  // off every other entry — only one robot is default at a time.
  if (opts.setDefault) {
    for (let i = 0; i < explicit.length; i++) {
      const r = explicit[i] as Record<string, unknown>;
      if (i === (existingIdx >= 0 ? existingIdx : explicit.length - 1)) continue;
      if (r && r["default"] === true) {
        const { default: _drop, ...rest } = r;
        void _drop;
        explicit[i] = rest;
      }
    }
  }

  obj["robots"] = explicit;
  return {
    added,
    promotedLegacy,
    robots: explicit.map((r) => r as RobotEntry),
  };
}

/**
 * Remove a robot from `config.robots[]` by id.
 *
 * Returns `removed: false` when the id isn't present. Removing the last
 * entry leaves `robots: []` (which the core resolver then ignores in
 * favour of the legacy `config.robot` fallback — so the deployment
 * keeps working).
 *
 * Idempotent across re-runs.
 */
export function removeRobot(
  id: string,
  obj: Record<string, unknown> = readConfigObject(),
): { removed: boolean; robots: RobotEntry[] } {
  const explicit = Array.isArray(obj["robots"]) ? [...(obj["robots"] as unknown[])] : [];
  const idx = explicit.findIndex(
    (r) =>
      r != null &&
      typeof r === "object" &&
      !Array.isArray(r) &&
      String((r as Record<string, unknown>)["id"] ?? "") === id,
  );
  if (idx < 0) {
    return { removed: false, robots: explicit as RobotEntry[] };
  }
  explicit.splice(idx, 1);
  obj["robots"] = explicit;
  return { removed: true, robots: explicit as RobotEntry[] };
}

/**
 * Set `default: true` on exactly one robot in `config.robots[]`.
 *
 * Auto-promotes the legacy single-robot config first if needed (so
 * marking the first new robot as default doesn't lose the previous
 * incumbent). Throws when the id isn't present after promotion.
 */
export function setDefaultRobot(
  id: string,
  obj: Record<string, unknown> = readConfigObject(),
): { robots: RobotEntry[]; promotedLegacy: boolean } {
  const explicit = Array.isArray(obj["robots"]) ? [...(obj["robots"] as unknown[])] : [];
  let promotedLegacy = false;

  if (explicit.length === 0) {
    const legacy = legacyToEntry(obj["robot"]);
    if (legacy) {
      explicit.push({ ...legacy, default: false });
      promotedLegacy = true;
    }
  }

  const idx = explicit.findIndex(
    (r) =>
      r != null &&
      typeof r === "object" &&
      !Array.isArray(r) &&
      String((r as Record<string, unknown>)["id"] ?? "") === id,
  );

  if (idx < 0) {
    const known = explicit
      .map((r) => String((r as Record<string, unknown>)["id"] ?? ""))
      .filter((s) => s.length > 0)
      .join(", ");
    throw new Error(
      `Unknown robot id "${id}". Known: ${known || "(none — add it first with `agenticros robots add`)"}.`,
    );
  }

  for (let i = 0; i < explicit.length; i++) {
    const r = { ...(explicit[i] as Record<string, unknown>) };
    if (i === idx) r["default"] = true;
    else delete r["default"];
    explicit[i] = r;
  }

  obj["robots"] = explicit;
  return { robots: explicit as RobotEntry[], promotedLegacy };
}

/**
 * Apply a per-robot transport override to an existing robot.
 *
 * Auto-promotes legacy `config.robot` into `config.robots[]` so the
 * caller can target the historical single-robot config by its derived
 * id. Throws when the id can't be found after promotion — matching the
 * UX of `setDefaultRobot`.
 *
 * The `override` argument is the plain JSON shape the core's
 * `RobotTransportOverrideSchema` will validate at config-load time. The
 * CLI doesn't validate field shapes — that lives in `@agenticros/core`.
 */
export function setTransportForRobot(
  id: string,
  override: Record<string, unknown>,
  obj: Record<string, unknown> = readConfigObject(),
): { robots: RobotEntry[]; promotedLegacy: boolean } {
  const explicit = Array.isArray(obj["robots"]) ? [...(obj["robots"] as unknown[])] : [];
  let promotedLegacy = false;

  if (explicit.length === 0) {
    const legacy = legacyToEntry(obj["robot"]);
    if (legacy) {
      explicit.push({ ...legacy, default: true });
      promotedLegacy = true;
    }
  }

  const idx = explicit.findIndex(
    (r) =>
      r != null &&
      typeof r === "object" &&
      !Array.isArray(r) &&
      String((r as Record<string, unknown>)["id"] ?? "") === id,
  );

  if (idx < 0) {
    const known = explicit
      .map((r) => String((r as Record<string, unknown>)["id"] ?? ""))
      .filter((s) => s.length > 0)
      .join(", ");
    throw new Error(
      `Unknown robot id "${id}". Known: ${known || "(none — add it first with `agenticros robots add`)"}.`,
    );
  }

  explicit[idx] = { ...(explicit[idx] as Record<string, unknown>), transport: override };
  obj["robots"] = explicit;
  return { robots: explicit as RobotEntry[], promotedLegacy };
}

/**
 * Remove a per-robot transport override (so the robot inherits the
 * global transport config). Idempotent — returns `cleared: false` when
 * the robot didn't have an override to begin with. Throws on unknown id
 * (we'd rather complain loudly than silently no-op against a typo).
 */
export function clearTransportForRobot(
  id: string,
  obj: Record<string, unknown> = readConfigObject(),
): { cleared: boolean; robots: RobotEntry[]; promotedLegacy: boolean } {
  const explicit = Array.isArray(obj["robots"]) ? [...(obj["robots"] as unknown[])] : [];
  let promotedLegacy = false;

  if (explicit.length === 0) {
    const legacy = legacyToEntry(obj["robot"]);
    if (legacy) {
      explicit.push({ ...legacy, default: true });
      promotedLegacy = true;
    }
  }

  const idx = explicit.findIndex(
    (r) =>
      r != null &&
      typeof r === "object" &&
      !Array.isArray(r) &&
      String((r as Record<string, unknown>)["id"] ?? "") === id,
  );

  if (idx < 0) {
    const known = explicit
      .map((r) => String((r as Record<string, unknown>)["id"] ?? ""))
      .filter((s) => s.length > 0)
      .join(", ");
    throw new Error(
      `Unknown robot id "${id}". Known: ${known || "(none — add it first with `agenticros robots add`)"}.`,
    );
  }

  const prev = { ...(explicit[idx] as Record<string, unknown>) };
  const hadOverride = prev["transport"] !== undefined;
  delete prev["transport"];
  explicit[idx] = prev;
  obj["robots"] = explicit;
  return { cleared: hadOverride, robots: explicit as RobotEntry[], promotedLegacy };
}
