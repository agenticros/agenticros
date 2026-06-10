/**
 * Load skill packages from skillPackages (npm names) and skillPaths (directories).
 * Each loaded skill is called synchronously with registerSkill(api, config, context).
 *
 * Why sync (and not async): OpenClaw 2026.6's plugin host calls our `register(api)`
 * synchronously and immediately snapshots `captured.tools` (and friends) into the
 * gateway's registry. Anything we `api.registerTool(...)` after `register()` has
 * returned is silently dropped from the chat agent's tool inventory. Loading
 * skills via dynamic `import()` (Promise-returning) would push their `registerTool`
 * calls onto the microtask queue — after the snapshot — so the agent would see
 * "I don't have follow_robot / find_object" even though the gateway logged the
 * skill as loaded.
 *
 * Node ≥ 22.12 (and definitely Node 26) supports synchronous `require()` of ESM
 * modules as long as they don't use top-level await. We use that here: skills
 * are loaded via `createRequire(import.meta.url)` so `registerSkill(...)` runs
 * inline with the host's `register()` call, and the tools it registers land in
 * the snapshot.
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { OpenClawPluginApi } from "./plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import type { RegisterSkill, SkillContext } from "./skill-api.js";
import { getTransport } from "./service.js";
import { getDepthDistance, getDepthSectors } from "./depth.js";

const require = createRequire(import.meta.url);

/** Loaded skill ids (e.g. "followme") for robot context. */
const loadedSkillIds: string[] = [];

/**
 * Returns the list of skill ids that were successfully loaded.
 * Used by robot-context to build "Available skills".
 */
export function getLoadedSkillIds(): string[] {
  return [...loadedSkillIds];
}

function deriveSkillId(packageName: string): string {
  const lower = packageName.toLowerCase();
  if (lower.startsWith("agenticros-skill-")) {
    return lower.slice("agenticros-skill-".length);
  }
  return lower.replace(/^@[^/]+\//, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Load a single skill module synchronously and call its `registerSkill`.
 *
 * Uses `require()` (which works for ESM in modern Node) so the call chain
 * — including any `api.registerTool(...)` the skill makes — completes before
 * we return, and therefore before the OpenClaw host snapshots `captured.tools`.
 *
 * Returns the derived skill id on success, or `null` (with a logged warning /
 * error) on any failure mode: missing export, top-level await (which surfaces
 * as `ERR_REQUIRE_ASYNC_MODULE`), or thrown initialization error.
 */
function loadSkillModuleSync(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
  context: SkillContext,
  entryPath: string,
  packageName: string,
): string | null {
  const skillId = deriveSkillId(packageName);
  let mod: unknown;
  try {
    mod = require(entryPath);
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "ERR_REQUIRE_ASYNC_MODULE") {
      api.logger.error(
        `Skill ${packageName}: uses top-level await; OpenClaw needs sync registration. ` +
          "Refactor the skill to lazy-init its async resources from inside registerSkill().",
      );
    } else {
      api.logger.error(`Failed to load skill ${packageName}: ${err}`);
    }
    return null;
  }
  const m = mod as { registerSkill?: unknown; default?: unknown };
  const candidate = m.registerSkill
    ?? (m.default as { registerSkill?: unknown } | undefined)?.registerSkill
    ?? m.default;
  if (typeof candidate !== "function") {
    api.logger.warn(`Skill ${packageName}: no registerSkill export, skipping`);
    return null;
  }
  try {
    const result = (candidate as RegisterSkill)(api, config, context);
    if (result && typeof (result as { then?: unknown }).then === "function") {
      api.logger.warn(
        `Skill ${packageName}: registerSkill returned a Promise. Any tools registered ` +
          "after it resolves will be dropped by OpenClaw's sync-register snapshot. " +
          "Move tool registration above any awaits in registerSkill().",
      );
      (result as Promise<unknown>).catch((err: unknown) => {
        api.logger.error(`Skill ${packageName}: async registerSkill rejected: ${String(err)}`);
      });
    }
    return skillId;
  } catch (err) {
    api.logger.error(`Skill ${packageName}: registerSkill threw: ${String(err)}`);
    return null;
  }
}

/**
 * Resolve a package name to its main entry path (Node resolution).
 */
function resolvePackageEntry(packageName: string): string | null {
  try {
    const pkgPath = require.resolve(packageName, { paths: [process.cwd()] });
    return pkgPath;
  } catch {
    return null;
  }
}

/**
 * Scan a directory for package.json with "agenticrosSkill": true and return entry path.
 */
function findSkillInPath(dirPath: string): { entry: string; packageName: string } | null {
  if (!existsSync(dirPath)) return null;
  const pkgPath = join(dirPath, "package.json");
  if (!existsSync(pkgPath)) return null;
  let pkg: {
    agenticrosSkill?: boolean | Record<string, unknown>;
    main?: string;
    name?: string;
  };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
  // Accept either the legacy boolean (`"agenticrosSkill": true`) or the
  // Phase-1 object form (`"agenticrosSkill": { capabilities: [...] }`).
  // Anything truthy registers the package as a skill; the capability
  // schema is read separately by @agenticros/core.
  if (!pkg.agenticrosSkill) return null;
  const main = pkg.main ?? "index.js";
  const entry = join(dirPath, main);
  if (!existsSync(entry)) return null;
  return { entry, packageName: pkg.name ?? "unknown" };
}

/**
 * Load all skills from config.skillPackages and config.skillPaths SYNCHRONOUSLY.
 *
 * This MUST be called inline from the plugin's `register(api)` function so the
 * OpenClaw host captures every tool the skills register. See the file header
 * for the full async-vs-sync explanation.
 */
export function loadSkills(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  const context: SkillContext = {
    getTransport,
    getDepthDistance,
    getDepthSectors,
    logger: api.logger,
  };

  const packages = config.skillPackages ?? [];
  const paths = config.skillPaths ?? [];

  loadedSkillIds.length = 0;

  for (const pkgName of packages) {
    const entryPath = resolvePackageEntry(pkgName);
    if (!entryPath) {
      api.logger.warn(`Skill package not found: ${pkgName}`);
      continue;
    }
    const skillId = loadSkillModuleSync(api, config, context, entryPath, pkgName);
    if (skillId) loadedSkillIds.push(skillId);
  }

  for (const dir of paths) {
    const resolved = findSkillInPath(dir);
    if (!resolved) {
      api.logger.warn(`No agenticros skill in path: ${dir}`);
      continue;
    }
    const skillId = loadSkillModuleSync(
      api,
      config,
      context,
      resolved.entry,
      resolved.packageName,
    );
    if (skillId && !loadedSkillIds.includes(skillId)) loadedSkillIds.push(skillId);
  }

  if (loadedSkillIds.length > 0) {
    api.logger.info(`AgenticROS: loaded skills: ${loadedSkillIds.join(", ")}`);
  }
}

// Reserved for future use (e.g. file:// URL based loaders); keeps the import
// node:url's pathToFileURL referenced so editors don't flag it during the
// sync-only window.
void pathToFileURL;
