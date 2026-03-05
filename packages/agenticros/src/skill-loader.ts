/**
 * Load skill packages from skillPackages (npm names) and skillPaths (directories).
 * Each loaded skill is called with registerSkill(api, config, context).
 */

import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
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
 * Load a single module and call registerSkill if present.
 * Returns the skill id if successful.
 */
async function loadSkillModule(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
  context: SkillContext,
  entryPath: string,
  packageName: string,
): Promise<string | null> {
  const skillId = deriveSkillId(packageName);
  try {
    const url = pathToFileURL(entryPath).href;
    const mod = await import(/* webpackIgnore: true */ url);
    const registerSkill = mod.registerSkill ?? mod.default?.registerSkill ?? mod.default;
    if (typeof registerSkill !== "function") {
      api.logger.warn(`Skill ${packageName}: no registerSkill export, skipping`);
      return null;
    }
    await Promise.resolve(registerSkill(api, config, context));
    return skillId;
  } catch (err) {
    api.logger.error(`Failed to load skill ${packageName}: ${err}`);
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
  let pkg: { agenticrosSkill?: boolean; main?: string; name?: string };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
  if (!pkg.agenticrosSkill) return null;
  const main = pkg.main ?? "index.js";
  const entry = join(dirPath, main);
  if (!existsSync(entry)) return null;
  return { entry, packageName: pkg.name ?? "unknown" };
}

/**
 * Load all skills from config.skillPackages and config.skillPaths.
 * Builds context with getTransport, getDepthDistance, logger.
 */
export async function loadSkills(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): Promise<void> {
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
    const skillId = await loadSkillModule(api, config, context, entryPath, pkgName);
    if (skillId) loadedSkillIds.push(skillId);
  }

  for (const dir of paths) {
    const resolved = findSkillInPath(dir);
    if (!resolved) {
      api.logger.warn(`No agenticros skill in path: ${dir}`);
      continue;
    }
    const skillId = await loadSkillModule(
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
