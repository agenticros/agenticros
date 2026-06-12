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
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
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

/**
 * Read the `agenticros` block from a skill's package.json. The block is now
 * the single source of truth for the skill id, display name, and capability
 * manifest. The legacy `agenticrosSkill: true | { capabilities }` form is
 * NOT supported — every skill must declare a fully-formed `agenticros` block.
 */
interface AgenticROSBlock {
  id: string;
  displayName?: string;
  description?: string;
  categories?: string[];
  screenshots?: string[];
  demoVideoUrl?: string;
  capabilities?: unknown[];
}

interface SkillManifest {
  name?: string;
  main?: string;
  agenticros?: AgenticROSBlock;
}

function readSkillManifest(pkgJsonPath: string): SkillManifest | null {
  try {
    return JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as SkillManifest;
  } catch {
    return null;
  }
}

function isValidBlock(block: unknown): block is AgenticROSBlock {
  if (!block || typeof block !== "object") return false;
  const b = block as { id?: unknown };
  return typeof b.id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(b.id);
}

/**
 * Load a single skill module synchronously and call its `registerSkill`.
 *
 * Uses `require()` (which works for ESM in modern Node) so the call chain
 * — including any `api.registerTool(...)` the skill makes — completes before
 * we return, and therefore before the OpenClaw host snapshots `captured.tools`.
 *
 * Returns the declared skill id on success, or `null` (with a logged warning /
 * error) on any failure mode: missing export, top-level await (which surfaces
 * as `ERR_REQUIRE_ASYNC_MODULE`), or thrown initialization error.
 */
function loadSkillModuleSync(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
  context: SkillContext,
  entryPath: string,
  packageName: string,
  skillId: string,
): string | null {
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

interface ResolvedSkill {
  entry: string;
  packageName: string;
  skillId: string;
}

/**
 * Resolve an npm package name to a `ResolvedSkill` (entry + name + skill id).
 * Reads the package's package.json to extract `pkg.agenticros.id`; refuses
 * to register the skill if the block is missing or malformed.
 */
function resolveSkillByPackage(
  api: OpenClawPluginApi,
  packageName: string,
): ResolvedSkill | null {
  let entry: string;
  try {
    entry = require.resolve(packageName, { paths: [process.cwd()] });
  } catch {
    api.logger.warn(`Skill package not found: ${packageName}`);
    return null;
  }
  // Walk up from the resolved entry to find the package.json.
  const pkgJsonPath = findPackageJsonForEntry(entry);
  if (!pkgJsonPath) {
    api.logger.warn(`Skill ${packageName}: cannot locate package.json next to ${entry}`);
    return null;
  }
  const manifest = readSkillManifest(pkgJsonPath);
  if (!manifest || !isValidBlock(manifest.agenticros)) {
    api.logger.warn(
      `Skill ${packageName}: missing or invalid \`agenticros\` block in package.json. ` +
        "Declare an `agenticros.id` (kebab-case) to register as a skill.",
    );
    return null;
  }
  return {
    entry,
    packageName: manifest.name ?? packageName,
    skillId: manifest.agenticros!.id,
  };
}

/** Walk up from `entry` (a file inside the package) to find its package.json. */
function findPackageJsonForEntry(entry: string): string | null {
  let dir = dirname(entry);
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Scan a directory for a package.json with a valid `agenticros` block and
 * return its entry path + declared id.
 */
function findSkillInPath(dirPath: string): ResolvedSkill | null {
  if (!existsSync(dirPath)) return null;
  const pkgPath = join(dirPath, "package.json");
  if (!existsSync(pkgPath)) return null;
  const pkg = readSkillManifest(pkgPath);
  if (!pkg || !isValidBlock(pkg.agenticros)) return null;
  const main = pkg.main ?? "index.js";
  const entry = join(dirPath, main);
  if (!existsSync(entry)) return null;
  return {
    entry,
    packageName: pkg.name ?? "unknown",
    skillId: pkg.agenticros!.id,
  };
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
    const resolved = resolveSkillByPackage(api, pkgName);
    if (!resolved) continue;
    const skillId = loadSkillModuleSync(
      api,
      config,
      context,
      resolved.entry,
      resolved.packageName,
      resolved.skillId,
    );
    if (skillId) loadedSkillIds.push(skillId);
  }

  for (const dir of paths) {
    const resolved = findSkillInPath(dir);
    if (!resolved) {
      api.logger.warn(
        `No agenticros skill in path: ${dir} (missing \`agenticros\` block in package.json).`,
      );
      continue;
    }
    const skillId = loadSkillModuleSync(
      api,
      config,
      context,
      resolved.entry,
      resolved.packageName,
      resolved.skillId,
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
