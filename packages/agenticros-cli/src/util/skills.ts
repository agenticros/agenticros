/**
 * Skill discovery, validation, and config-file mutation primitives.
 *
 * An AgenticROS skill is a Node package whose `package.json` carries an
 * `agenticros` block (with at least an `id`) and exports a
 * `registerSkill(api, config, context)` function from its `main` entry. The OpenClaw AgenticROS plugin loads them
 * at gateway start by walking two arrays in its config:
 *
 *   - `skillPaths[]`     — absolute directories to scan (validate `package.json`)
 *   - `skillPackages[]`  — npm-resolvable names (e.g. `agenticros-skill-find`)
 *
 * This module is the single place the CLI talks to those arrays. It also
 * encapsulates discovery (where on disk users typically clone skill repos)
 * and the `deriveSkillId` convention shared with `@agenticros/agenticros`'s
 * skill-loader so menu / list output uses the same short ids the plugin
 * surfaces (e.g. `followme`, `find`).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { getCliPaths } from "./paths.js";
import {
  ensureStringArray,
  getAgenticrosPluginConfig,
  openclawConfigExists,
  openclawConfigPath,
  readOpenclawConfig,
  writeOpenclawConfig,
} from "./openclaw-config.js";

export interface SkillRef {
  /** Short id (matches what the OpenClaw plugin uses for `config.skills.<id>`). */
  id: string;
  /** npm package name (from `package.json.name`). */
  packageName: string;
  /** Absolute directory containing `package.json`, when known. */
  dir?: string;
  /** Where the skill is currently registered with the gateway. */
  registeredAs: ("path" | "package")[];
  /**
   * Absolute path the skill's `package.json` declares as its entry (`main`),
   * resolved against `dir`. Only set when we inspected the directory.
   */
  entry?: string;
  /** True when `entry` exists on disk; false when the skill needs `pnpm build`. */
  built?: boolean;
}

/**
 * Apply the same short-id transform the OpenClaw plugin's skill-loader uses,
 * so menu output and the plugin's `config.skills.<id>` keys line up exactly.
 * `agenticros-skill-followme` → `followme`; scoped packages drop the scope.
 */
export function deriveSkillId(packageName: string): string {
  const lower = packageName.toLowerCase();
  if (lower.startsWith("agenticros-skill-")) {
    return lower.slice("agenticros-skill-".length);
  }
  return lower.replace(/^@[^/]+\//, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Inspect a directory and decide whether it's a valid AgenticROS skill clone.
 * Returns a partial `SkillRef` (no `registeredAs`) or `undefined` when the
 * directory is missing, lacks `package.json`, or doesn't declare a valid
 * `agenticros` block (with at least `id`).
 */
export function inspectSkillDir(dir: string): Omit<SkillRef, "registeredAs"> | undefined {
  const absDir = isAbsolute(dir) ? dir : resolve(dir);
  if (!existsSync(absDir)) return undefined;
  let stat;
  try {
    stat = statSync(absDir);
  } catch {
    return undefined;
  }
  if (!stat.isDirectory()) return undefined;
  const pkgPath = join(absDir, "package.json");
  if (!existsSync(pkgPath)) return undefined;
  let pkg: {
    name?: string;
    main?: string;
    agenticros?: { id?: unknown };
  };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return undefined;
  }
  const block = pkg.agenticros;
  if (!block || typeof block !== "object" || typeof block.id !== "string") {
    return undefined;
  }
  const id = block.id;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return undefined;
  const packageName = (pkg.name ?? "unknown").toString();
  const mainRel = ((pkg as { main?: unknown }).main as string | undefined) ?? "index.js";
  const entry = join(absDir, mainRel);
  return {
    id,
    packageName,
    dir: absDir,
    entry,
    built: existsSync(entry),
  };
}

/**
 * Return a deduped list of "places we should look for skill clones" — the
 * directories whose children the CLI scans on `agenticros skills discover`.
 *
 * We include both the parent of the active repo / install dir (so siblings
 * of `agenticros/` work, e.g. `../agenticros-skill-find`) and `$HOME` /
 * `$HOME/Projects/` / `$HOME/Code/` so a vanilla clone-into-Projects flow
 * is found without configuration.
 */
export function discoveryRoots(extra: string[] = []): string[] {
  const paths = getCliPaths();
  const home = homedir();
  const roots: string[] = [];
  const push = (p: string | undefined): void => {
    if (!p) return;
    const abs = resolve(p);
    if (!roots.includes(abs)) roots.push(abs);
  };
  if (paths.repoRoot) push(dirname(paths.repoRoot));
  push(dirname(paths.installDir));
  push(home);
  push(join(home, "Projects"));
  push(join(home, "Code"));
  push(join(home, "agenticros-skills"));
  for (const e of extra) push(e);
  return roots.filter((r) => {
    try {
      return statSync(r).isDirectory();
    } catch {
      return false;
    }
  });
}

/**
 * Walk every directory in `roots`, returning a `SkillRef` for each child
 * directory that passes `inspectSkillDir`. Used by both `discover` and
 * `list` (which uses it to render orphaned-but-cloned skills).
 */
export function scanForSkills(extra: string[] = []): SkillRef[] {
  const out: SkillRef[] = [];
  const seenDirs = new Set<string>();
  for (const root of discoveryRoots(extra)) {
    let entries: string[];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const name of entries) {
      const child = join(root, name);
      if (seenDirs.has(child)) continue;
      seenDirs.add(child);
      const info = inspectSkillDir(child);
      if (info) {
        out.push({ ...info, registeredAs: [] });
      }
    }
  }
  return out;
}

interface OpenclawSkillsView {
  cfg: Record<string, unknown>;
  pluginCfg: Record<string, unknown>;
  paths: string[];
  packages: string[];
}

/**
 * Pull skill arrays out of the OpenClaw config in a shape that's easy to
 * mutate. The returned `paths` / `packages` arrays are filtered to strings
 * (non-string elements are silently skipped in the view but preserved in
 * the underlying arrays on disk).
 */
function loadOpenclawSkillsView(): OpenclawSkillsView | undefined {
  const cfg = readOpenclawConfig();
  if (!cfg) return undefined;
  const pluginCfg = getAgenticrosPluginConfig(cfg);
  const rawPaths = ensureStringArray(pluginCfg, "skillPaths");
  const rawPkgs = ensureStringArray(pluginCfg, "skillPackages");
  const paths = rawPaths.filter((x): x is string => typeof x === "string");
  const packages = rawPkgs.filter((x): x is string => typeof x === "string");
  return { cfg, pluginCfg, paths, packages };
}

export interface SkillsListing {
  /** Skills currently registered in the OpenClaw config (path-loaded or package-loaded). */
  registered: SkillRef[];
  /** Skill clones that exist on disk in known discovery roots but aren't registered. */
  available: SkillRef[];
  /** `skillPaths` entries that refer to a directory that no longer exists. */
  brokenPaths: string[];
}

/**
 * Build a snapshot of the user's current skill state: what's registered,
 * what's available-but-not-registered, and what registrations are broken.
 * The single source of truth for the `agenticros skills` (list) view.
 */
export function listSkills(): SkillsListing {
  const view = loadOpenclawSkillsView();
  const registered: SkillRef[] = [];
  const brokenPaths: string[] = [];
  const byId = new Map<string, SkillRef>();

  if (view) {
    for (const p of view.paths) {
      const info = inspectSkillDir(p);
      if (info) {
        const existing = byId.get(info.id);
        if (existing) {
          if (!existing.registeredAs.includes("path")) existing.registeredAs.push("path");
          if (existing.entry === undefined) {
            existing.entry = info.entry;
            existing.built = info.built;
          }
        } else {
          const ref: SkillRef = { ...info, registeredAs: ["path"] };
          byId.set(info.id, ref);
          registered.push(ref);
        }
      } else {
        brokenPaths.push(p);
      }
    }
    for (const name of view.packages) {
      const id = deriveSkillId(name);
      const existing = byId.get(id);
      if (existing) {
        if (!existing.registeredAs.includes("package")) existing.registeredAs.push("package");
      } else {
        const ref: SkillRef = { id, packageName: name, registeredAs: ["package"] };
        byId.set(id, ref);
        registered.push(ref);
      }
    }
  }

  const available: SkillRef[] = scanForSkills().filter((s) => !byId.has(s.id));
  return { registered, available, brokenPaths };
}

export interface AddResult {
  ok: boolean;
  /** Human-readable summary of what changed (or why nothing changed). */
  message: string;
  skill?: SkillRef;
}

/**
 * Add a skill to the OpenClaw plugin config by absolute directory path.
 * Idempotent: re-adding an existing entry is a no-op and returns `ok: true`
 * with an explanatory message. The directory must contain a valid
 * `package.json` with an `agenticros` block (with at least `id`).
 */
export function addSkillByPath(dir: string): AddResult {
  const info = inspectSkillDir(dir);
  if (!info) {
    return {
      ok: false,
      message: `Not an AgenticROS skill directory: ${dir} (need package.json with an "agenticros": { "id": "..." } block)`,
    };
  }
  if (!openclawConfigExists()) {
    return {
      ok: false,
      message:
        `OpenClaw config not found at ${openclawConfigPath()}. ` +
        "Run `agenticros init` first to install the OpenClaw plugin.",
    };
  }
  const cfg = readOpenclawConfig();
  if (!cfg) {
    return {
      ok: false,
      message: `Cannot parse OpenClaw config at ${openclawConfigPath()}.`,
    };
  }
  const pluginCfg = getAgenticrosPluginConfig(cfg);
  const paths = ensureStringArray(pluginCfg, "skillPaths");
  if (paths.includes(info.dir!)) {
    return {
      ok: true,
      message: `Skill '${info.id}' already registered at ${info.dir}.`,
      skill: { ...info, registeredAs: ["path"] },
    };
  }
  paths.push(info.dir!);
  writeOpenclawConfig(cfg);
  return {
    ok: true,
    message: `Registered skill '${info.id}' at ${info.dir} (${openclawConfigPath()} → skillPaths).`,
    skill: { ...info, registeredAs: ["path"] },
  };
}

/**
 * Add a skill by npm package name (must be resolvable on the gateway's
 * Node search path). Mainly intended for skills published to a registry —
 * for local clones, prefer `addSkillByPath` so the absolute directory is
 * recorded.
 */
export function addSkillByPackage(name: string): AddResult {
  if (!openclawConfigExists()) {
    return {
      ok: false,
      message:
        `OpenClaw config not found at ${openclawConfigPath()}. ` +
        "Run `agenticros init` first to install the OpenClaw plugin.",
    };
  }
  const cfg = readOpenclawConfig();
  if (!cfg) {
    return { ok: false, message: `Cannot parse OpenClaw config at ${openclawConfigPath()}.` };
  }
  const pluginCfg = getAgenticrosPluginConfig(cfg);
  const packages = ensureStringArray(pluginCfg, "skillPackages");
  if (packages.includes(name)) {
    return {
      ok: true,
      message: `Skill package '${name}' already registered.`,
      skill: { id: deriveSkillId(name), packageName: name, registeredAs: ["package"] },
    };
  }
  packages.push(name);
  writeOpenclawConfig(cfg);
  return {
    ok: true,
    message: `Registered skill package '${name}' (${openclawConfigPath()} → skillPackages).`,
    skill: { id: deriveSkillId(name), packageName: name, registeredAs: ["package"] },
  };
}

export interface RemoveResult {
  ok: boolean;
  message: string;
  removedPaths: string[];
  removedPackages: string[];
}

/**
 * Remove every registration that matches `idOrName` — either a derived skill
 * id (e.g. `find`), a full package name (e.g. `agenticros-skill-find`), or an
 * absolute path that appears in `skillPaths`. Both `skillPaths` (matched by
 * resolving each path back through `inspectSkillDir`) and `skillPackages`
 * are cleaned in a single pass.
 */
export function removeSkill(idOrName: string): RemoveResult {
  const cfg = readOpenclawConfig();
  if (!cfg) {
    return {
      ok: false,
      message: `OpenClaw config not found or unparseable at ${openclawConfigPath()}.`,
      removedPaths: [],
      removedPackages: [],
    };
  }
  const pluginCfg = getAgenticrosPluginConfig(cfg);
  const rawPaths = ensureStringArray(pluginCfg, "skillPaths");
  const rawPkgs = ensureStringArray(pluginCfg, "skillPackages");

  const wanted = idOrName.trim();
  const wantedAbs = isAbsolute(wanted) ? resolve(wanted) : undefined;

  const removedPaths: string[] = [];
  const keptPaths = rawPaths.filter((entry) => {
    if (typeof entry !== "string") return true;
    if (wantedAbs && resolve(entry) === wantedAbs) {
      removedPaths.push(entry);
      return false;
    }
    const info = inspectSkillDir(entry);
    if (info && (info.id === wanted || info.packageName === wanted)) {
      removedPaths.push(entry);
      return false;
    }
    return true;
  });

  const removedPackages: string[] = [];
  const keptPkgs = rawPkgs.filter((entry) => {
    if (typeof entry !== "string") return true;
    if (entry === wanted || deriveSkillId(entry) === wanted) {
      removedPackages.push(entry);
      return false;
    }
    return true;
  });

  if (removedPaths.length === 0 && removedPackages.length === 0) {
    return {
      ok: false,
      message: `No registered skill matches '${idOrName}'.`,
      removedPaths: [],
      removedPackages: [],
    };
  }

  pluginCfg["skillPaths"] = keptPaths;
  pluginCfg["skillPackages"] = keptPkgs;
  writeOpenclawConfig(cfg);
  const parts: string[] = [];
  if (removedPaths.length > 0) parts.push(`${removedPaths.length} path(s)`);
  if (removedPackages.length > 0) parts.push(`${removedPackages.length} package(s)`);
  return {
    ok: true,
    message: `Removed ${parts.join(" + ")} matching '${idOrName}' from ${openclawConfigPath()}.`,
    removedPaths,
    removedPackages,
  };
}
