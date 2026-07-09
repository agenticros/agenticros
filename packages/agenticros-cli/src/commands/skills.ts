/**
 * `agenticros skills` — manage the AgenticROS OpenClaw plugin's skill list.
 *
 * Subactions:
 *   list / show / ls        Print registered + discovered skills (default).
 *   discover / scan         Interactive picker over candidates found on disk.
 *   add <path|name>         Register a skill by directory path or npm name.
 *   remove / rm <id|name>   Unregister a skill from the OpenClaw config.
 *   sync                    Re-run `scripts/sync-skill-tools.mjs` so the
 *                           plugin manifest's `contracts.tools` allowlist
 *                           matches the skills currently registered.
 *
 * Mutations target OpenClaw config and (for marketplace installs) also write
 * `skillRefs` into `~/.agenticros/config.json` so MCP / Gemini can resolve
 * capability manifests from `~/.agenticros/skills-cache/`.
 */

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { checkbox, confirm, input } from "@inquirer/prompts";
import { execa } from "execa";

import {
  addSkillByPackage,
  addSkillByPath,
  addSkillRef,
  deriveSkillId,
  inspectSkillDir,
  listSkills,
  removeSkill,
  scanForSkills,
} from "../util/skills.js";
import {
  cloneAndBuild,
  displayRef,
  getInstallDescriptor,
  getSkill,
  MarketplaceError,
  searchSkills,
  type MarketplaceSkill,
} from "../util/marketplace.js";
import { ensureSkillRefCached, skillsCacheDir } from "@agenticros/core";
import { createSkillCommand } from "./create-skill.js";
import { publishSkillCommand } from "./publish-skill.js";
import { skillsDevCommand } from "./skills-dev.js";
import { getCliPaths } from "../util/paths.js";
import { colors, dim, err, header, info, isTty, ok, warn } from "../util/logger.js";
import {
  ensureToolsAlsoAllow,
  openclawConfigExists,
  openclawConfigPath,
  readAgenticrosContractTools,
} from "../util/openclaw-config.js";

export interface SkillsOptions {
  action?: string;
  arg?: string;
  /** Skip automatic OpenClaw gateway restart after install/sync. */
  noRestart?: boolean;
}

let skipGatewayRestart = false;

export async function skillsCommand(opts: SkillsOptions): Promise<void> {
  skipGatewayRestart = opts.noRestart === true;
  const action = (opts.action ?? "list").toLowerCase();
  switch (action) {
    case "list":
    case "ls":
    case "show":
      return showList();
    case "discover":
    case "scan":
      return discoverInteractive();
    case "add":
      return addAction(opts.arg);
    case "remove":
    case "rm":
    case "delete":
      return removeAction(opts.arg);
    case "sync":
      return syncManifest();
    case "search":
    case "find":
      return searchAction(opts.arg);
    case "install":
    case "i":
      return installAction(opts.arg);
    case "create":
      return createSkillCommand({ slug: opts.arg ?? "", template: undefined });
    case "dev":
      return skillsDevCommand({});
    case "publish":
      return publishSkillCommand({});
    default:
      err(`Unknown skills action '${opts.action}'.`);
      err(
        "Use: list | search <q> | install <owner/skill> | create <slug> | dev | publish | discover | add | remove | sync",
      );
      process.exit(2);
  }
}

function showList(): void {
  header("AgenticROS skills");
  const listing = listSkills();
  info(`OpenClaw config: ${openclawConfigPath()}`);

  if (listing.registered.length === 0) {
    dim("No skills registered yet.");
  } else {
    process.stdout.write(`\n${colors.bold("Registered:")}\n`);
    for (const s of listing.registered) {
      const via = s.registeredAs.join(" + ");
      const loc = s.dir ?? `(resolved from npm: ${s.packageName})`;
      const builtTag =
        s.dir === undefined
          ? ""
          : s.built
            ? ""
            : `  ${colors.yellow("(not built)")}`;
      process.stdout.write(
        `  ${colors.green("●")} ${colors.bold(s.id)}  ${colors.dim(s.packageName)}${builtTag}\n`,
      );
      process.stdout.write(`      via ${via}  →  ${colors.dim(loc)}\n`);
    }
  }

  if (listing.brokenPaths.length > 0) {
    process.stdout.write(`\n${colors.bold(colors.yellow("Broken entries:"))}\n`);
    for (const p of listing.brokenPaths) {
      process.stdout.write(`  ${colors.yellow("○")} ${p}\n`);
    }
    dim(`Use 'agenticros skills remove <path>' to clean these up.`);
  }

  if (listing.available.length > 0) {
    process.stdout.write(`\n${colors.bold("Available (not registered):")}\n`);
    for (const s of listing.available) {
      process.stdout.write(`  ${colors.dim("○")} ${colors.bold(s.id)}  ${colors.dim(s.packageName)}\n`);
      if (s.dir) process.stdout.write(`      ${colors.dim(s.dir)}\n`);
    }
    dim(`Add any of them with 'agenticros skills add <id>' or pick interactively via 'agenticros skills discover'.`);
  }

  process.stdout.write("\n");
}

async function discoverInteractive(): Promise<void> {
  header("Discover AgenticROS skills");
  const listing = listSkills();
  const registeredIds = new Set(listing.registered.map((r) => r.id));
  const candidates = scanForSkills().filter((s) => !registeredIds.has(s.id));
  if (candidates.length === 0) {
    info("No new skill clones found in the usual locations.");
    info("Searched: parent of repo / install, $HOME, $HOME/Projects, $HOME/Code, $HOME/agenticros-skills.");
    info("Already registered: " + (listing.registered.length === 0 ? "(none)" : listing.registered.map((r) => r.id).join(", ")));
    return;
  }
  if (!isTty) {
    info(`Found ${candidates.length} unregistered skill(s):`);
    for (const c of candidates) {
      process.stdout.write(`  ${c.id}  ${c.dir ?? c.packageName}\n`);
    }
    info("Run interactively to register them, or use `agenticros skills add <path>`.");
    return;
  }

  const picks = await checkbox<string>({
    message: `Found ${candidates.length} skill(s). Pick which to register:`,
    choices: candidates.map((c) => ({
      name: `${c.id}  (${c.dir})`,
      value: c.dir!,
      checked: true,
    })),
  });

  if (picks.length === 0) {
    info("Nothing selected.");
    return;
  }

  let added = 0;
  for (const dir of picks) {
    const result = addSkillByPath(dir);
    if (result.ok && result.skill) {
      ok(result.message);
      added++;
    } else {
      err(result.message);
    }
  }
  if (added > 0) await postChangeFollowup({ ranSync: false });
}

async function addAction(arg: string | undefined): Promise<void> {
  let target = arg?.trim();

  if (!target) {
    if (!isTty) {
      err("Usage: agenticros skills add <path-or-package-name>");
      process.exit(2);
    }
    target = (await input({
      message: "Path to skill directory, or npm package name:",
      validate: (v) => v.trim().length > 0 || "Required",
    })).trim();
  }

  const looksLikePath = target.startsWith("/") || target.startsWith(".") || target.includes("/");
  if (looksLikePath || (existsSync(target) && inspectSkillDir(target))) {
    const abs = isAbsolute(target) ? target : resolve(target);
    const info1 = inspectSkillDir(abs);
    if (!info1) {
      err(`Not a valid AgenticROS skill directory: ${abs}`);
      err('Expected a package.json with "agenticros": { "id": "..." }.');
      process.exit(1);
    }
    const result = addSkillByPath(abs);
    if (!result.ok) {
      err(result.message);
      process.exit(1);
    }
    ok(result.message);
    warnIfNotBuilt(info1.dir!, info1.entry);
    await postChangeFollowup({ ranSync: false });
    return;
  }

  // Bare name (no path separator). Prefer a local clone if one matches —
  // the absolute directory is more reliable than an npm name when the
  // gateway has no global node_modules. If the user typed a bare short id
  // (e.g. `find`) without a clone in sight, refuse rather than registering
  // a literal `find` as a package name; the typo cost is too high.
  const candidates = scanForSkills().filter(
    (s) => s.packageName === target || s.id === deriveSkillId(target) || s.id === target,
  );

  if (candidates.length > 0) {
    if (candidates.length === 1) {
      if (isTty) {
        const useDir = await confirm({
          message: `Found a local clone at ${candidates[0]!.dir}. Register the directory instead of the package name?`,
          default: true,
        });
        if (!useDir) {
          const result = addSkillByPackage(target);
          if (!result.ok) {
            err(result.message);
            process.exit(1);
          }
          ok(result.message);
          await postChangeFollowup({ ranSync: false });
          return;
        }
      } else {
        info(`Resolved '${target}' to local clone at ${candidates[0]!.dir}.`);
      }
      const result = addSkillByPath(candidates[0]!.dir!);
      if (!result.ok) {
        err(result.message);
        process.exit(1);
      }
      ok(result.message);
      warnIfNotBuilt(candidates[0]!.dir!, candidates[0]!.entry);
      await postChangeFollowup({ ranSync: false });
      return;
    }
    err(`Multiple local clones match '${target}'. Pass an absolute path to disambiguate:`);
    for (const c of candidates) err(`  ${c.dir}`);
    process.exit(1);
  }

  // No local clone — only register as a bare npm package when the user gave
  // a fully-qualified name. A short id like `find` with no matching clone is
  // almost certainly a typo, so guide the user rather than silently storing
  // an unresolvable name.
  if (!target.includes("-") && !target.startsWith("@")) {
    err(
      `No local clone found for '${target}' and the name doesn't look like an npm package.`,
    );
    err("Hint: clone the skill (e.g. `git clone https://… ../agenticros-skill-find`),");
    err("      or pass the full package name (e.g. `agenticros skills add agenticros-skill-find`).");
    process.exit(1);
  }

  const result = addSkillByPackage(target);
  if (!result.ok) {
    err(result.message);
    process.exit(1);
  }
  ok(result.message);
  await postChangeFollowup({ ranSync: false });
}

async function removeAction(arg: string | undefined): Promise<void> {
  let target = arg?.trim();
  if (!target) {
    const listing = listSkills();
    if (listing.registered.length === 0 && listing.brokenPaths.length === 0) {
      info("No registered skills to remove.");
      return;
    }
    if (!isTty) {
      err("Usage: agenticros skills remove <id-or-name>");
      process.exit(2);
    }
    const choices = [
      ...listing.registered.map<{ name: string; value: string }>((r) => ({
        name: `${r.id}  (${r.packageName})`,
        value: r.id,
      })),
      ...listing.brokenPaths.map<{ name: string; value: string }>((p) => ({
        name: `(broken) ${p}`,
        value: p,
      })),
    ];
    const picks = await checkbox<string>({
      message: "Which skill(s) to remove?",
      choices,
    });
    if (picks.length === 0) {
      info("Nothing selected.");
      return;
    }
    let any = false;
    for (const id of picks) {
      const r = removeSkill(id);
      if (r.ok) {
        ok(r.message);
        any = true;
      } else {
        err(r.message);
      }
    }
    if (any) await postChangeFollowup({ ranSync: false });
    return;
  }
  const r = removeSkill(target);
  if (!r.ok) {
    err(r.message);
    process.exit(1);
  }
  ok(r.message);
  await postChangeFollowup({ ranSync: false });
}

async function syncManifest(): Promise<void> {
  const paths = getCliPaths();
  const script = `${paths.scriptsDir}/sync-skill-tools.mjs`;
  if (!existsSync(script)) {
    warn(`sync-skill-tools.mjs not found at ${script}.`);
    warn("In workspace mode this should be at scripts/; in installed mode re-run `agenticros init`.");
    return;
  }
  info(`Running ${script} …`);
  try {
    const { exitCode, stdout, stderr } = await execa("node", [script], {
      reject: false,
      cwd: paths.repoRoot ?? paths.installDir,
    });
    if (stdout.trim()) process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
    if (stderr.trim()) process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
    if (exitCode === 0) {
      ok("sync-skill-tools complete.");
      syncAlsoAllowFromManifest(paths.repoRoot ?? paths.installDir);
      await restartGatewayIfPossible();
    } else {
      err(`sync-skill-tools exited with code ${exitCode}.`);
      process.exit(exitCode ?? 1);
    }
  } catch (e) {
    err(`Failed to run sync-skill-tools: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

/**
 * Mirror the plugin manifest's `contracts.tools` into the user's OpenClaw
 * `tools.alsoAllow`. This is the "chat actually sees the new skill's tools"
 * step — without it, OpenClaw 2026.6+ tool profiles (`coding`, `standard`,
 * …) silently drop any plugin-registered tool that the user hasn't opted
 * into. Run after every config-changing skill op so the allowlist tracks
 * whatever `sync-skill-tools.mjs` just wrote into `contracts.tools`.
 */
function syncAlsoAllowFromManifest(repoRoot: string): void {
  if (!openclawConfigExists()) return;
  const tools = readAgenticrosContractTools(repoRoot);
  if (!tools || tools.length === 0) return;
  const result = ensureToolsAlsoAllow(tools);
  if (!result || !result.changed) return;
  ok(
    `Added ${result.added.length} tool(s) to OpenClaw tools.alsoAllow so the chat agent can see them:`,
  );
  dim(`  + ${result.added.join(", ")}`);
}

interface FollowupOpts {
  ranSync: boolean;
}

/**
 * After any add/remove that modified the OpenClaw config, prompt to run the
 * tools-allowlist sync and remind the user to bounce the gateway. Skipping
 * sync would leave OpenClaw rejecting any tool the new skill tries to
 * register (the 2026+ contracts.tools enforcement).
 */
async function postChangeFollowup(opts: FollowupOpts): Promise<void> {
  if (!opts.ranSync) {
    if (isTty) {
      const yes = await confirm({
        message:
          "Run `sync-skill-tools` now so OpenClaw's contracts.tools allowlist picks up the change?",
        default: true,
      });
      if (yes) await syncManifest();
      else {
        warn("Skipping sync. Run `agenticros skills sync` later before relying on the new skill.");
        await restartGatewayIfPossible();
      }
    } else {
      warn("Don't forget: `agenticros skills sync` (gateway auto-restarts unless --no-restart).");
      await restartGatewayIfPossible();
    }
  } else {
    await restartGatewayIfPossible();
  }
}

/**
 * Try to bounce the OpenClaw gateway so newly installed skills appear.
 * True mid-session hot-reload is blocked on OpenClaw's sync register()
 * snapshot — auto-restart is the pragmatic Marketplace UX v2 activation.
 */
async function restartGatewayIfPossible(): Promise<void> {
  if (skipGatewayRestart) {
    info("Skipping gateway restart (--no-restart). Restart manually when ready.");
    hintRestartGateway();
    return;
  }
  const attempts: Array<{ label: string; cmd: string; args: string[] }> = [
    {
      label: "systemctl --user restart openclaw-gateway.service",
      cmd: "systemctl",
      args: ["--user", "restart", "openclaw-gateway.service"],
    },
    {
      label: "openclaw gateway restart",
      cmd: "openclaw",
      args: ["gateway", "restart"],
    },
  ];
  for (const a of attempts) {
    try {
      const { exitCode } = await execa(a.cmd, a.args, { reject: false });
      if (exitCode === 0) {
        ok(`Restarted OpenClaw gateway via: ${a.label}`);
        return;
      }
    } catch {
      /* try next */
    }
  }
  warn("Could not auto-restart the OpenClaw gateway.");
  hintRestartGateway();
}

function hintRestartGateway(): void {
  info(
    "Restart the OpenClaw gateway to pick up the new skill list:\n" +
      "    systemctl --user restart openclaw-gateway.service\n" +
      "  (or: openclaw gateway restart)",
  );
}

/**
 * Warn loudly when the skill's `main` entry is missing — both the OpenClaw
 * skill loader and `sync-skill-tools.mjs` need the built `dist/` to be there,
 * and forgetting `pnpm build` after a clone is the most common foot-gun.
 */
function warnIfNotBuilt(dir: string, entry?: string): void {
  if (!entry || !existsSync(entry)) {
    warn(`Skill at ${dir} is not built — entry ${entry ?? "?"} is missing.`);
    warn(`Build it before restarting the gateway:`);
    warn(`    cd ${dir} && pnpm install && pnpm build`);
    warn(`(or: cd ${dir} && npx tsc  -- if pnpm install is failing locally.)`);
  }
}

// ---------------------------------------------------------------------------
// Marketplace actions: search + install
// ---------------------------------------------------------------------------

/**
 * `agenticros skills search <query>` — look up skills on
 * https://skills.agenticros.com and print a ranked, copy-paste-ready table.
 */
async function searchAction(rawQuery: string | undefined): Promise<void> {
  const q = (rawQuery ?? "").trim();
  header(q ? `Searching the marketplace for "${q}"…` : "Browsing the marketplace…");
  let results: MarketplaceSkill[];
  try {
    results = await searchSkills(q, { limit: 25, sort: q ? "recent" : "popular" });
  } catch (e) {
    err(formatMarketplaceError(e));
    process.exit(1);
  }
  if (results.length === 0) {
    info("No skills match. Try a different keyword, or open the marketplace:");
    info("    https://skills.agenticros.com");
    return;
  }
  for (const s of results) {
    process.stdout.write(
      `  ${colors.green("●")} ${colors.bold(s.displayName || s.name)}  ${colors.dim(`@ ${s.maintainerLogin}  ★${s.starCount}`)}\n`,
    );
    process.stdout.write(`      ${colors.dim(s.description)}\n`);
    process.stdout.write(
      `      Install:  ${colors.bold(`agenticros skills install ${displayRef(s)}`)}\n`,
    );
  }
  process.stdout.write("\n");
  dim(`Browse the full catalog at https://skills.agenticros.com`);
}

/**
 * `agenticros skills install <owner/skill|@scope/pkg>` — pull install metadata
 * from the marketplace (or npm), cache under ~/.agenticros/skills-cache, and
 * register it locally. Prefers npm when the install descriptor advertises
 * `npmPackage`.
 */
async function installAction(rawRef: string | undefined): Promise<void> {
  const ref = (rawRef ?? "").trim();
  if (!ref) {
    err("Usage: agenticros skills install <owner/skill|@agenticros/name>");
    err("Example: agenticros skills install chrismatthieu/followme");
    err("Example: agenticros skills install @agenticros/navigate-to");
    err("Find skills at https://skills.agenticros.com or via `agenticros skills search`.");
    process.exit(2);
  }
  header(`Installing skill '${ref}'…`);

  // Direct npm scoped ref — skip marketplace descriptor.
  if (ref.startsWith("@")) {
    try {
      const cachePath = await ensureSkillRefCached(ref, {
        onLog: (msg) => info(msg),
      });
      ok(`Cached under ${cachePath}`);
      const info1 = inspectSkillDir(cachePath);
      if (!info1) {
        err(`Cached package at ${cachePath} is not an AgenticROS skill.`);
        process.exit(1);
      }
      const reg = addSkillByPath(cachePath);
      if (!reg.ok) {
        err(reg.message);
        process.exit(1);
      }
      ok(reg.message);
      if (info1.packageName?.startsWith("@")) {
        const pkgReg = addSkillByPackage(info1.packageName);
        if (pkgReg.ok) ok(pkgReg.message);
      }
      const refReg = addSkillRef(ref);
      if (refReg.ok) ok(refReg.message);
      else warn(refReg.message);
      warnIfNotBuilt(cachePath, info1.entry);
      await postChangeFollowup({ ranSync: false });
      return;
    } catch (e) {
      err(`npm install failed: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  }

  const marketplaceRef = ref.toLowerCase();

  // 1) Resolve metadata + install descriptor.
  let descriptor;
  let meta;
  try {
    [descriptor, meta] = await Promise.all([
      getInstallDescriptor(marketplaceRef),
      getSkill(marketplaceRef).catch(() => undefined),
    ]);
  } catch (e) {
    err(formatMarketplaceError(e));
    process.exit(1);
  }
  if (meta) {
    info(`Skill:    ${colors.bold(meta.displayName || meta.name)}`);
    info(`Package:  ${meta.packageName}`);
    if (descriptor.npmPackage) info(`npm:      ${descriptor.npmPackage}${descriptor.npmVersion ? `@${descriptor.npmVersion}` : ""}`);
    info(`Repo:     ${meta.githubUrl}`);
    info(`Author:   @${meta.maintainerLogin}`);
  } else {
    info(`Repo:     ${descriptor.githubUrl}`);
  }

  const preferNpm = Boolean(
    descriptor.npmPackage ||
      (descriptor.packageName && String(descriptor.packageName).startsWith("@")),
  );

  if (isTty) {
    const yes = await confirm({
      message: preferNpm
        ? `Install from npm and register this skill locally?`
        : `Clone, build, and register this skill locally?`,
      default: true,
    });
    if (!yes) {
      info("Cancelled.");
      return;
    }
  }

  let skillDir: string | undefined;

  // 2a) Prefer npm when advertised.
  if (preferNpm) {
    try {
      skillDir = await ensureSkillRefCached(marketplaceRef, {
        onLog: (msg) => info(msg),
      });
      ok(`Installed from npm into ${skillDir}`);
    } catch (e) {
      warn(
        `npm path failed (${e instanceof Error ? e.message : String(e)}); falling back to git clone.`,
      );
    }
  }

  // 2b) Git clone fallback (also warms adjacent discovery).
  if (!skillDir) {
    let result;
    try {
      result = await cloneAndBuild(descriptor, {
        onLog: (msg) => info(msg),
      });
    } catch (e) {
      err(`Clone/build failed: ${e instanceof Error ? e.message : String(e)}`);
      err(`Inspect the partial clone (if any), fix the build, then run:`);
      err(`    agenticros skills add <path>`);
      process.exit(1);
    }
    ok(
      result.alreadyExisted
        ? `Updated existing clone at ${result.cloneDir}.`
        : `Cloned and built at ${result.cloneDir}.`,
    );
    skillDir = result.cloneDir;
    try {
      const cachePath = await ensureSkillRefCached(marketplaceRef, {
        onLog: (msg) => info(msg),
      });
      ok(`Cached under ${cachePath} (skills-cache root: ${skillsCacheDir()}).`);
    } catch (e) {
      warn(
        `skills-cache warm failed (skillPaths registration still ok): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  // 3) Confirm the clone is a real skill and register it.
  const info1 = inspectSkillDir(skillDir);
  if (!info1) {
    err(`The install at ${skillDir} doesn't expose an AgenticROS skill manifest.`);
    err('(Expected package.json with "agenticros": { "id": "..." }.)');
    err("Report this on the skill's GitHub repo — the marketplace listing is stale.");
    process.exit(1);
  }
  const reg = addSkillByPath(skillDir);
  if (!reg.ok) {
    err(reg.message);
    process.exit(1);
  }
  ok(reg.message);
  if (info1.packageName?.startsWith("@")) {
    const pkgReg = addSkillByPackage(info1.packageName);
    if (pkgReg.ok) ok(pkgReg.message);
  }
  const refReg = addSkillRef(marketplaceRef);
  if (refReg.ok) ok(refReg.message);
  else warn(refReg.message);
  warnIfNotBuilt(skillDir, info1.entry);

  // 4) Sync the OpenClaw contracts.tools allowlist + auto-restart gateway.
  await postChangeFollowup({ ranSync: false });
}

function formatMarketplaceError(e: unknown): string {
  if (e instanceof MarketplaceError) return `Marketplace error: ${e.message}`;
  if (e instanceof Error) return `Marketplace error: ${e.message}`;
  return `Marketplace error: ${String(e)}`;
}
