#!/usr/bin/env node
/**
 * sync-skill-tools.mjs
 *
 * Discover AgenticROS skill tool names and merge them into the agenticros plugin's
 * `contracts.tools` allowlist in `packages/agenticros/openclaw.plugin.json`.
 *
 * OpenClaw 2026+ enforces `contracts.tools` as a strict allowlist: any tool that a
 * plugin registers at runtime but that is not declared in the manifest is rejected
 * with `plugin must declare contracts.tools for: <name>` and silently dropped.
 * Since AgenticROS skills register their own tools dynamically (e.g. `follow_robot`),
 * the manifest must list every skill tool that should be exposed.
 *
 * How it works
 * ------------
 * 1. Resolve the OpenClaw config (OPENCLAW_CONFIG or ~/.openclaw/openclaw.json).
 * 2. Read `plugins.entries.agenticros.config.skillPaths` and `.skillPackages`.
 * 3. For each entry, locate the skill's built entry (dist/index.js), import it,
 *    and call `registerSkill(api, config, context)` with a stub `api` whose
 *    `registerTool` is a spy that just records `tool.name`.
 * 4. Merge the discovered tool names with the static core tool list and write
 *    them back into `packages/agenticros/openclaw.plugin.json`.
 *
 * Usage
 * -----
 *   node scripts/sync-skill-tools.mjs            # write the manifest
 *   node scripts/sync-skill-tools.mjs --dry-run  # print what would change
 *   node scripts/sync-skill-tools.mjs --verbose  # show per-skill discovery details
 *
 * Run this whenever you add, remove, or rebuild a skill in `skillPaths` /
 * `skillPackages`. After it succeeds, refresh the OpenClaw plugin registry
 * (`openclaw plugins registry --refresh`) and restart the gateway so OpenClaw
 * re-reads the updated `contracts.tools`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = join(REPO_ROOT, "packages/agenticros/openclaw.plugin.json");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run") || args.has("-n");
const VERBOSE = args.has("--verbose") || args.has("-v");

const CORE_TOOLS = [
  "ros2_publish",
  "ros2_subscribe_once",
  "ros2_service_call",
  "ros2_action_goal",
  "ros2_param_get",
  "ros2_param_set",
  "ros2_list_topics",
  "ros2_camera_snapshot",
  "ros2_depth_distance",
  // Memory tools (registered conditionally at runtime when memory.enabled=true).
  // Listed here so they remain in the allowlist after sync-skill-tools rewrites it.
  "memory_remember",
  "memory_recall",
  "memory_forget",
  "memory_status",
];

function log(...m) {
  console.log("[sync-skill-tools]", ...m);
}
function vlog(...m) {
  if (VERBOSE) console.log("[sync-skill-tools]", ...m);
}
function warn(...m) {
  console.warn("[sync-skill-tools] WARN:", ...m);
}
function fail(msg) {
  console.error("[sync-skill-tools] ERROR:", msg);
  process.exit(1);
}

function getOpenClawConfigPath() {
  const env = process.env.OPENCLAW_CONFIG;
  if (env && env.length > 0) return resolve(env);
  return join(homedir(), ".openclaw", "openclaw.json");
}

function readOpenClawConfig() {
  const p = getOpenClawConfigPath();
  if (!existsSync(p)) {
    warn(`OpenClaw config not found: ${p} — assuming no skills configured.`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    fail(`Cannot parse ${p}: ${e?.message ?? e}`);
  }
}

function getSkillEntries(cfg) {
  const skillPaths = cfg?.plugins?.entries?.agenticros?.config?.skillPaths ?? [];
  const skillPackages = cfg?.plugins?.entries?.agenticros?.config?.skillPackages ?? [];
  return { skillPaths, skillPackages };
}

function findSkillEntryFromPath(dirPath) {
  if (!existsSync(dirPath)) {
    warn(`skillPaths entry does not exist: ${dirPath}`);
    return null;
  }
  const pkgPath = join(dirPath, "package.json");
  if (!existsSync(pkgPath)) {
    warn(`skillPaths entry missing package.json: ${dirPath}`);
    return null;
  }
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (e) {
    warn(`Invalid package.json in ${dirPath}: ${e?.message ?? e}`);
    return null;
  }
  if (!pkg.agenticrosSkill) {
    warn(`Not an AgenticROS skill (missing agenticrosSkill flag): ${dirPath}`);
    return null;
  }
  const main = pkg.main ?? "index.js";
  const entry = join(dirPath, main);
  if (!existsSync(entry)) {
    warn(`Skill entry not built (run pnpm build in the skill repo): ${entry}`);
    return null;
  }
  return { entry, packageName: pkg.name ?? dirPath, packageJson: pkg };
}

function resolvePackageEntry(packageName) {
  if (!packageName || packageName.trim() === "") return null;
  if (packageName.includes(" ")) {
    warn(`Invalid skillPackages entry (contains spaces): "${packageName}"`);
    return null;
  }
  try {
    const req = createRequire(join(REPO_ROOT, "package.json"));
    const entry = req.resolve(packageName);
    return entry;
  } catch {
    warn(`Skill package not resolvable from repo root: ${packageName}`);
    return null;
  }
}

/**
 * Create a stub OpenClawPluginApi that captures registerTool calls.
 * Other methods are no-ops so that registerSkill can complete without crashing.
 */
function createSpyApi() {
  const tools = [];
  const noop = () => {};
  const noopLog = {
    info: (m) => vlog("  skill.logger.info:", m),
    warn: (m) => vlog("  skill.logger.warn:", m),
    error: (m) => vlog("  skill.logger.error:", m),
  };
  return {
    tools,
    api: {
      pluginConfig: {},
      logger: noopLog,
      registerTool(tool) {
        if (tool && typeof tool.name === "string" && tool.name.length > 0) {
          tools.push(tool.name);
        }
      },
      registerService: noop,
      registerCommand: noop,
      registerHttpRoute: noop,
      on: noop,
    },
  };
}

function createStubContext() {
  return {
    getTransport() {
      throw new Error("stub: getTransport not available during contract discovery");
    },
    getDepthDistance() {
      return Promise.resolve({ valid: false, distance_m: 0 });
    },
    getDepthSectors() {
      return Promise.resolve({ valid: false, left_m: 0, center_m: 0, right_m: 0 });
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  };
}

async function discoverSkillTools(entryPath, packageName) {
  const url = pathToFileURL(entryPath).href;
  let mod;
  try {
    mod = await import(url);
  } catch (e) {
    warn(`Failed to import ${packageName} (${entryPath}): ${e?.message ?? e}`);
    return [];
  }
  const registerSkill =
    mod.registerSkill ?? mod.default?.registerSkill ?? mod.default;
  if (typeof registerSkill !== "function") {
    warn(`${packageName}: no registerSkill export — skipping discovery`);
    return [];
  }
  const { tools, api } = createSpyApi();
  const ctx = createStubContext();
  // Provide a config skeleton that matches AgenticROSConfig defaults loosely
  // enough that registration doesn't crash on access paths like config.skills.x.
  const stubConfig = {
    transport: { mode: "rosbridge" },
    robot: { name: "Robot", namespace: "", cameraTopic: "" },
    teleop: { cmdVelTopic: "", cameraTopic: "", speedDefault: 0.3, cameraPollMs: 150 },
    safety: { maxLinearVelocity: 1, maxAngularVelocity: 1.5 },
    skills: {},
    skillPaths: [],
    skillPackages: [],
  };
  try {
    await Promise.resolve(registerSkill(api, stubConfig, ctx));
  } catch (e) {
    warn(
      `${packageName} registerSkill threw during discovery — captured ${tools.length} tools before error: ${e?.message ?? e}`,
    );
  }
  return tools;
}

function uniqueOrdered(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const name of list) {
      if (typeof name !== "string") continue;
      const trimmed = name.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function main() {
  if (!existsSync(MANIFEST_PATH)) fail(`Manifest not found: ${MANIFEST_PATH}`);
  const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (e) {
    fail(`Cannot parse manifest: ${e?.message ?? e}`);
  }

  const cfg = readOpenClawConfig();
  const { skillPaths, skillPackages } = cfg ? getSkillEntries(cfg) : { skillPaths: [], skillPackages: [] };

  log(`Resolved OpenClaw config: ${getOpenClawConfigPath()}`);
  log(`skillPaths: ${skillPaths.length === 0 ? "(none)" : skillPaths.join(", ")}`);
  log(`skillPackages: ${skillPackages.length === 0 ? "(none)" : skillPackages.join(", ")}`);

  const discovered = new Map(); // skillId/packageName -> tools[]

  for (const pkg of skillPackages) {
    const entry = resolvePackageEntry(pkg);
    if (!entry) continue;
    vlog(`Resolving package "${pkg}" → ${entry}`);
    const tools = await discoverSkillTools(entry, pkg);
    if (tools.length > 0) discovered.set(pkg, tools);
    else vlog(`  no tools discovered for ${pkg}`);
  }

  for (const dir of skillPaths) {
    const absDir = isAbsolute(dir) ? dir : resolve(REPO_ROOT, dir);
    const resolved = findSkillEntryFromPath(absDir);
    if (!resolved) continue;
    vlog(`Resolving path "${absDir}" → ${resolved.entry} (${resolved.packageName})`);
    const tools = await discoverSkillTools(resolved.entry, resolved.packageName);
    if (tools.length > 0) discovered.set(resolved.packageName, tools);
    else vlog(`  no tools discovered for ${resolved.packageName}`);
  }

  if (discovered.size === 0) {
    log("No skill tools discovered. contracts.tools will contain only core tools.");
  } else {
    for (const [name, tools] of discovered.entries()) {
      log(`Discovered ${tools.length} tool(s) from ${name}: ${tools.join(", ")}`);
    }
  }

  const skillTools = [...discovered.values()].flat();
  const merged = uniqueOrdered(CORE_TOOLS, skillTools);
  const previous = Array.isArray(manifest?.contracts?.tools)
    ? manifest.contracts.tools.slice()
    : [];

  if (arraysEqual(previous, merged)) {
    log("Manifest is already up to date.");
    return;
  }

  log(`Updating contracts.tools:\n  before: [${previous.join(", ")}]\n  after:  [${merged.join(", ")}]`);

  if (DRY_RUN) {
    log("Dry run — manifest not modified.");
    return;
  }

  manifest.contracts = manifest.contracts ?? {};
  manifest.contracts.tools = merged;
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log(`Wrote ${MANIFEST_PATH}`);
  log("Next steps:");
  log("  1. openclaw plugins registry --refresh");
  log("  2. Restart the OpenClaw gateway so the new contracts take effect.");
}

main().catch((e) => fail(e?.stack ?? String(e)));
