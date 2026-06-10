#!/usr/bin/env node
/**
 * refresh-skill-deps.mjs
 *
 * Prevents the pnpm-hardlink-cascade we've hit three times running:
 *
 *   1. Add a new file to packages/core/src/ (e.g. capabilities.ts, mission.ts).
 *   2. Build core. The workspace's dist/ has the new file.
 *   3. External skill repos consume @agenticros/core via `file:` deps, so
 *      pnpm hardlinks them through a virtual store snapshot
 *      (.pnpm/@agenticros+core@file+..+agenticros+packages+core/...).
 *   4. That snapshot is taken once at install time and is NEVER refreshed
 *      automatically when the source's dist/ gains new files.
 *   5. The skill repo's @agenticros/core now silently lags behind. Imports
 *      that reference the new file fail with ERR_MODULE_NOT_FOUND.
 *   6. `sync-skill-tools.mjs` runs, fails to import the skill, and (prior
 *      to the hardening done alongside this script) silently strips the
 *      skill's tools from contracts.tools + tools.alsoAllow.
 *   7. The chat agent loses access to follow_robot, find_object, etc. The
 *      failure mode is silent until somebody asks "why can't the robot
 *      follow me anymore?"
 *
 * This script detects + repairs that cascade. It compares the workspace's
 * packages/core/dist/ file list against each skill repo's resolved
 * @agenticros/core/dist/. If anything is missing, it refreshes the skill
 * repo's node_modules (pnpm install, escalating to a clean reinstall if
 * pnpm decides to no-op).
 *
 * Usage
 * -----
 *   node scripts/refresh-skill-deps.mjs                # refresh stale skills
 *   node scripts/refresh-skill-deps.mjs --dry-run      # check + report only
 *   node scripts/refresh-skill-deps.mjs --verbose      # extra logging
 *   node scripts/refresh-skill-deps.mjs --force        # always reinstall
 *   node scripts/refresh-skill-deps.mjs --skill <path> # extra path (repeatable)
 *   node scripts/refresh-skill-deps.mjs --quiet        # suppress non-error log
 *
 * Discovery order for skill paths (deduped):
 *   1. --skill <path> CLI flags
 *   2. AGENTICROS_SKILL_PATHS env var (colon-separated)
 *   3. OpenClaw config (OPENCLAW_CONFIG or ~/.openclaw/openclaw.json)
 *      under plugins.entries.agenticros.config.skillPaths
 *   4. AgenticROS standalone config (AGENTICROS_CONFIG_PATH or
 *      ~/.agenticros/config.json) under skillPaths
 *
 * Exit codes:
 *   0 — nothing was stale, OR every stale repo was refreshed successfully
 *   1 — at least one stale repo could not be refreshed
 *   2 — invalid arguments / unexpected error
 */

import { readFileSync, existsSync, readdirSync, statSync, realpathSync, rmSync } from "node:fs";
import { join, resolve, dirname, relative, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const CORE_DIST = join(REPO_ROOT, "packages", "core", "dist");

// ---------- CLI parsing ----------

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    verbose: false,
    quiet: false,
    force: false,
    extraSkillPaths: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run" || a === "-n") opts.dryRun = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--quiet" || a === "-q") opts.quiet = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--skill") opts.extraSkillPaths.push(argv[++i]);
    else if (a.startsWith("--skill=")) opts.extraSkillPaths.push(a.slice("--skill=".length));
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (a.startsWith("-")) {
      console.error(`[refresh-skill-deps] Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`refresh-skill-deps — repair stale pnpm hardlinks in external skill repos.

Usage:
  node scripts/refresh-skill-deps.mjs [options]

Options:
  --dry-run, -n        Report what's stale, don't refresh.
  --verbose, -v        Print per-file comparison details.
  --quiet, -q          Suppress all output except errors and summary.
  --force              Always reinstall, even if not stale.
  --skill <path>       Additional skill path to check (repeatable).
  --help, -h           Show this help.

Exit codes:
  0 — nothing was stale, OR every stale repo was refreshed.
  1 — at least one skill could not be refreshed.
  2 — invalid arguments.
`);
}

// ---------- Skill discovery ----------

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function discoverSkillPaths({ extraSkillPaths = [] } = {}) {
  const out = new Set();
  for (const p of extraSkillPaths) if (p) out.add(resolve(p));

  if (process.env.AGENTICROS_SKILL_PATHS) {
    for (const p of process.env.AGENTICROS_SKILL_PATHS.split(":")) {
      if (p) out.add(resolve(p));
    }
  }

  const openclawConfigPath =
    process.env.OPENCLAW_CONFIG ||
    join(homedir(), ".openclaw", "openclaw.json");
  const openclawConfig = readJsonSafe(openclawConfigPath);
  const pluginCfg =
    openclawConfig?.plugins?.entries?.agenticros?.config ??
    openclawConfig?.plugins?.agenticros?.config ??
    null;
  if (pluginCfg?.skillPaths && Array.isArray(pluginCfg.skillPaths)) {
    for (const p of pluginCfg.skillPaths) if (p) out.add(resolve(p));
  }

  const agenticrosConfigPath =
    process.env.AGENTICROS_CONFIG_PATH ||
    join(homedir(), ".agenticros", "config.json");
  const agenticrosConfig = readJsonSafe(agenticrosConfigPath);
  if (agenticrosConfig?.skillPaths && Array.isArray(agenticrosConfig.skillPaths)) {
    for (const p of agenticrosConfig.skillPaths) if (p) out.add(resolve(p));
  }

  return [...out];
}

// ---------- Staleness detection ----------

/**
 * Recursively list relative file paths under a directory. Returns a sorted
 * array. Returns an empty array if the directory doesn't exist.
 */
export function listFilesRecursive(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(relative(dir, full));
    }
  }
  out.sort();
  return out;
}

/**
 * Compare a source file list (the truth) against a target file list (the
 * skill's hardlinked copy) and return any files present in source but
 * missing in target.
 *
 * Exported so unit tests can pin the comparison logic without touching fs.
 */
export function findMissingFiles(sourceFiles, targetFiles) {
  const targetSet = new Set(targetFiles);
  return sourceFiles.filter((f) => !targetSet.has(f));
}

/**
 * Check one skill repo for staleness against the workspace core's dist/.
 *
 * Returns: { skillPath, hasCoreLink, missingFiles, sourceCount, targetCount }
 *   - hasCoreLink: false → skill doesn't depend on @agenticros/core (skip).
 *   - missingFiles: non-empty → STALE; needs refresh.
 */
export function checkSkillStaleness(skillPath, opts = {}) {
  const sourceCoreDist = opts.sourceCoreDist ?? CORE_DIST;
  const coreLink = join(skillPath, "node_modules", "@agenticros", "core");
  if (!existsSync(coreLink)) {
    return {
      skillPath,
      hasCoreLink: false,
      missingFiles: [],
      sourceCount: 0,
      targetCount: 0,
    };
  }
  const skillDist = join(coreLink, "dist");
  const sourceFiles = listFilesRecursive(sourceCoreDist);
  const targetFiles = listFilesRecursive(skillDist);
  const missingFiles = findMissingFiles(sourceFiles, targetFiles);
  return {
    skillPath,
    hasCoreLink: true,
    missingFiles,
    sourceCount: sourceFiles.length,
    targetCount: targetFiles.length,
  };
}

// ---------- Refresh logic ----------

function log(opts, level, ...m) {
  if (level === "error") {
    console.error("[refresh-skill-deps]", ...m);
    return;
  }
  if (opts.quiet) return;
  if (level === "verbose" && !opts.verbose) return;
  console.log("[refresh-skill-deps]", ...m);
}

function runPnpm(args, cwd, opts) {
  // --ignore-workspace prevents pnpm from picking up the agenticros
  // workspace's pnpm-workspace.yaml when the skill repo sits next to it on
  // disk. Without it pnpm errors with "packages field missing or empty"
  // because it thinks the skill is part of a workspace that doesn't
  // declare it. The skill repos are standalone projects with their own
  // package.json + lockfile, so workspace mode is incorrect for them.
  const finalArgs = ["--ignore-workspace", ...args];
  log(opts, "verbose", `→ pnpm ${finalArgs.join(" ")}  (cwd=${cwd})`);
  const res = spawnSync("pnpm", finalArgs, {
    cwd,
    stdio: opts.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  return { code: res.status ?? 1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

function refreshSkill(skillPath, opts) {
  // First try: plain pnpm install. Cheap, no-op when up to date.
  const r1 = runPnpm(["install"], skillPath, opts);
  // ERR_PNPM_IGNORED_BUILDS is just a warning about postinstall scripts;
  // treat any non-zero with that marker as success.
  const isBenignWarn = (out) =>
    typeof out === "string" && out.includes("ERR_PNPM_IGNORED_BUILDS");
  if (r1.code !== 0 && !isBenignWarn(r1.stderr) && !isBenignWarn(r1.stdout)) {
    log(opts, "error", `pnpm install failed in ${skillPath}`);
    if (r1.stderr) log(opts, "error", r1.stderr.trim());
    return { ok: false, escalated: false };
  }

  const after = checkSkillStaleness(skillPath);
  if (after.missingFiles.length === 0) {
    log(opts, "info", `  ✓ refreshed via pnpm install`);
    return { ok: true, escalated: false };
  }

  // pnpm decided it was already up to date but the hardlinks are still
  // stale. This happens when the .pnpm virtual store hash matches even
  // though dist/ contents changed. Escalate to a clean reinstall.
  log(opts, "info", `  pnpm install no-op'd; escalating to clean reinstall`);
  const nm = join(skillPath, "node_modules");
  if (existsSync(nm)) {
    try {
      rmSync(nm, { recursive: true, force: true });
    } catch (e) {
      log(opts, "error", `failed to rm -rf ${nm}: ${e.message}`);
      return { ok: false, escalated: true };
    }
  }
  const r2 = runPnpm(["install"], skillPath, opts);
  if (r2.code !== 0 && !isBenignWarn(r2.stderr) && !isBenignWarn(r2.stdout)) {
    log(opts, "error", `clean pnpm install failed in ${skillPath}`);
    if (r2.stderr) log(opts, "error", r2.stderr.trim());
    return { ok: false, escalated: true };
  }
  const final = checkSkillStaleness(skillPath);
  if (final.missingFiles.length > 0) {
    log(opts, "error", `${skillPath} STILL stale after clean reinstall; missing ${final.missingFiles.length} file(s)`);
    return { ok: false, escalated: true };
  }
  log(opts, "info", `  ✓ refreshed via clean reinstall`);
  return { ok: true, escalated: true };
}

// ---------- Main ----------

async function main(argv) {
  const opts = parseArgs(argv);
  const skillPaths = discoverSkillPaths({ extraSkillPaths: opts.extraSkillPaths });
  if (skillPaths.length === 0) {
    log(opts, "info", "No skill paths discovered (checked --skill, AGENTICROS_SKILL_PATHS, ~/.openclaw/openclaw.json, ~/.agenticros/config.json).");
    return 0;
  }

  log(opts, "info", `Checking ${skillPaths.length} skill path(s) against ${CORE_DIST}`);
  if (!existsSync(CORE_DIST)) {
    log(opts, "error", `packages/core/dist/ does not exist. Run \`pnpm --filter @agenticros/core build\` first.`);
    return 2;
  }

  const sourceCount = listFilesRecursive(CORE_DIST).length;
  let stale = 0;
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;

  for (const skillPath of skillPaths) {
    if (!existsSync(skillPath)) {
      log(opts, "info", `· ${skillPath}: directory does not exist; skipping`);
      skipped++;
      continue;
    }
    const status = checkSkillStaleness(skillPath);
    if (!status.hasCoreLink && !opts.force) {
      log(opts, "verbose", `· ${skillPath}: no @agenticros/core dep; skipping`);
      skipped++;
      continue;
    }
    const isStale = status.missingFiles.length > 0;
    if (!isStale && !opts.force) {
      log(opts, "verbose", `· ${skillPath}: up to date (${status.targetCount}/${status.sourceCount} files)`);
      continue;
    }
    stale++;
    if (isStale) {
      log(
        opts,
        "info",
        `· ${skillPath}: STALE — missing ${status.missingFiles.length} file(s) in @agenticros/core/dist` +
          (opts.verbose ? `: ${status.missingFiles.join(", ")}` : ""),
      );
    } else {
      log(opts, "info", `· ${skillPath}: --force refresh`);
    }
    if (opts.dryRun) continue;
    const result = refreshSkill(skillPath, opts);
    if (result.ok) refreshed++;
    else failed++;
  }

  const sum = `Summary: ${skillPaths.length} skill(s) checked — ${stale} stale, ${refreshed} refreshed, ${failed} failed, ${skipped} skipped. Core source has ${sourceCount} file(s).`;
  if (opts.dryRun && stale > 0) {
    log(opts, "info", sum);
    log(opts, "info", "Re-run without --dry-run to refresh.");
    return 0;
  }
  log(opts, "info", sum);
  return failed > 0 ? 1 : 0;
}

// Run only when invoked directly (preserves importability for tests).
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("refresh-skill-deps.mjs")
) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("[refresh-skill-deps] Unexpected error:", err);
      process.exit(2);
    });
}
