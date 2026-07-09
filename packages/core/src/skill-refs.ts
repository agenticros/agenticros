/**
 * skillRefs → ~/.agenticros/skills-cache resolver (marketplace auto-fetch).
 *
 * Declarative refs like `owner/skill`, `owner/skill@main`, or
 * `@agenticros/foo@^1.0.0` are resolved via the skills marketplace
 * install API (or directly from npm), cached under ~/.agenticros/skills-cache,
 * and returned as absolute skillPaths for capability reading / OpenClaw loading.
 *
 * Prefer npm when the install descriptor includes `npmPackage` (or the ref
 * is already a scoped npm name). Fall back to git clone + build.
 *
 * Never auto-upgrades: if the cache dir for a pin already exists, reuse it
 * (optional pull when AGENTICROS_SKILLS_CACHE_PULL=1 for git caches).
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir, homedir } from "node:os";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";
import type { AgenticROSConfig } from "./config.js";

export const DEFAULT_SKILLS_API = "https://skills.agenticros.com/api";
export const DEFAULT_SKILLS_CACHE_DIR = join(homedir(), ".agenticros", "skills-cache");

export interface ParsedSkillRef {
  kind: "marketplace" | "npm";
  /** owner/skill (lowercase) — marketplace refs only */
  marketplaceRef?: string;
  owner?: string;
  skill?: string;
  /** git ref / branch pin; default main — marketplace refs */
  gitRef?: string;
  /** Scoped npm package name — npm refs */
  npmPackage?: string;
  /** Semver range or exact version pin — npm refs (default: latest resolved) */
  npmVersion?: string;
}

export interface InstallDescriptor {
  slug: string;
  marketplaceRef?: string;
  skillId: string;
  packageName: string;
  githubUrl: string;
  ref: string;
  buildCmd: string;
  /** When set, prefer npm pack over git clone. */
  npmPackage?: string;
  /** Pinned npm version when known. */
  npmVersion?: string;
}

export interface ResolveSkillRefsOptions {
  apiBase?: string;
  cacheDir?: string;
  /** When true, git pull --ff-only if cache already exists. */
  pullIfPresent?: boolean;
  /** Skip network / clone (return only paths that already exist in cache). */
  offline?: boolean;
  onLog?: (msg: string) => void;
}

export interface ResolveSkillRefsResult {
  /** Absolute directories ready to merge into skillPaths. */
  paths: string[];
  errors: Array<{ ref: string; error: string }>;
}

/**
 * Parse `owner/skill`, `owner/skill@branch`, or `@scope/name[@semver]`.
 */
export function parseSkillRef(raw: string): ParsedSkillRef | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("@")) {
    // @scope/name or @scope/name@1.2.3 / @scope/name@^1.0.0
    const withoutAt = trimmed.slice(1);
    const slash = withoutAt.indexOf("/");
    if (slash <= 0) return null;
    const scope = withoutAt.slice(0, slash);
    const rest = withoutAt.slice(slash + 1);
    if (!scope || !rest) return null;
    // Version pin is the last @ after the package name segment.
    const at = rest.lastIndexOf("@");
    let pkgName = rest;
    let npmVersion: string | undefined;
    if (at > 0) {
      pkgName = rest.slice(0, at);
      npmVersion = rest.slice(at + 1).trim() || undefined;
    }
    if (!pkgName || pkgName.includes("/")) return null;
    return {
      kind: "npm",
      npmPackage: `@${scope}/${pkgName}`,
      npmVersion,
    };
  }

  const at = trimmed.lastIndexOf("@");
  let body = trimmed;
  let gitRef = "main";
  if (at > 0) {
    body = trimmed.slice(0, at);
    gitRef = trimmed.slice(at + 1).trim() || "main";
  }
  const parts = body.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0]!.toLowerCase();
  const skill = parts.slice(1).join("/").toLowerCase();
  if (!owner || !skill) return null;
  return {
    kind: "marketplace",
    marketplaceRef: `${owner}/${skill}`,
    owner,
    skill,
    gitRef,
  };
}

export function skillsApiBase(override?: string): string {
  return (override || process.env.AGENTICROS_SKILLS_API || DEFAULT_SKILLS_API).replace(
    /\/+$/,
    "",
  );
}

export function skillsCacheDir(override?: string): string {
  return override || process.env.AGENTICROS_SKILLS_CACHE || DEFAULT_SKILLS_CACHE_DIR;
}

function skillApiPath(apiBase: string, ref: string): string {
  const [owner, ...rest] = ref.split("/");
  const skill = rest.join("/");
  return `${apiBase}/skills/${encodeURIComponent(owner!)}/${encodeURIComponent(skill)}`;
}

export async function fetchInstallDescriptor(
  marketplaceRef: string,
  apiBase?: string,
): Promise<InstallDescriptor> {
  const base = skillsApiBase(apiBase);
  const url = `${skillApiPath(base, marketplaceRef)}/install`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Marketplace install ${res.status}: ${body.slice(0, 200)}`);
  }
  const desc = (await res.json()) as InstallDescriptor;
  if (!desc.githubUrl && !desc.npmPackage && !desc.packageName) {
    throw new Error(
      `Install descriptor for ${marketplaceRef} has neither githubUrl nor npmPackage`,
    );
  }
  return desc;
}

function cachePathForGit(
  cacheDir: string,
  owner: string,
  skill: string,
  gitRef: string,
): string {
  const safeRef = gitRef.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return join(cacheDir, owner, skill, safeRef);
}

function cachePathForNpm(cacheDir: string, npmPackage: string, version: string): string {
  const safeName = npmPackage.replace(/^@/, "").replace(/\//g, "__");
  const safeVer = version.replace(/[^a-zA-Z0-9._+-]+/g, "_");
  return join(cacheDir, "npm", safeName, safeVer);
}

function hasBuiltEntry(dir: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
      main?: string;
    };
    const main = pkg.main ?? "dist/index.js";
    return existsSync(join(dir, main));
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[], cwd: string, log: (m: string) => void): void {
  log(`$ ${cmd} ${args.join(" ")}  (in ${cwd})`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

function runCapture(cmd: string, args: string[], cwd: string): string {
  return execFileSync(cmd, args, { cwd, encoding: "utf8" }).trim();
}

function hasBin(name: string): boolean {
  try {
    execFileSync(name, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function safeNpmVersionPin(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "latest";
  return raw.trim();
}

/**
 * Resolve the exact version npm would install for a package@range.
 */
function resolveNpmVersion(npmPackage: string, versionRange: string, log: (m: string) => void): string {
  const spec = versionRange === "latest" ? npmPackage : `${npmPackage}@${versionRange}`;
  log(`Resolving npm version for ${spec}`);
  const out = runCapture("npm", ["view", spec, "version"], process.cwd());
  // npm view can return a single version or a JSON array for ranges — take last line.
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  // Strip quotes if JSON-ish
  const cleaned = last.replace(/^"|"$/g, "");
  if (!cleaned) throw new Error(`Could not resolve npm version for ${spec}`);
  return cleaned;
}

/**
 * Pack an npm package into the skills cache and return the absolute dir.
 */
export async function ensureNpmPackageCached(
  npmPackage: string,
  versionRange: string | undefined,
  opts: ResolveSkillRefsOptions = {},
): Promise<string> {
  const log = opts.onLog ?? (() => undefined);
  const cacheRoot = skillsCacheDir(opts.cacheDir);
  const pin = safeNpmVersionPin(versionRange);

  // Fast path: exact version already cached
  if (pin !== "latest" && !pin.startsWith("^") && !pin.startsWith("~") && !pin.includes("*")) {
    const exactDir = cachePathForNpm(cacheRoot, npmPackage, pin);
    if (existsSync(join(exactDir, "package.json"))) {
      if (!hasBuiltEntry(exactDir) && !opts.offline) {
        await buildInPlace(exactDir, log);
      }
      return exactDir;
    }
  }

  if (opts.offline) {
    // Best-effort: look for any cached version of this package
    const safeName = npmPackage.replace(/^@/, "").replace(/\//g, "__");
    const pkgRoot = join(cacheRoot, "npm", safeName);
    if (existsSync(pkgRoot)) {
      const versions = readdirSync(pkgRoot).filter((v) =>
        existsSync(join(pkgRoot, v, "package.json")),
      );
      if (versions.length > 0) {
        versions.sort();
        return join(pkgRoot, versions[versions.length - 1]!);
      }
    }
    throw new Error(`npm package ${npmPackage}@${pin} not in cache (offline)`);
  }

  const resolvedVersion = resolveNpmVersion(npmPackage, pin, log);
  const dir = cachePathForNpm(cacheRoot, npmPackage, resolvedVersion);
  if (existsSync(join(dir, "package.json"))) {
    if (!hasBuiltEntry(dir)) {
      await buildInPlace(dir, log);
    }
    return dir;
  }

  mkdirSync(join(cacheRoot, "npm", npmPackage.replace(/^@/, "").replace(/\//g, "__")), {
    recursive: true,
  });

  const tmp = mkdtempSync(join(tmpdir(), "agenticros-skill-npm-"));
  try {
    const spec = `${npmPackage}@${resolvedVersion}`;
    log(`npm pack ${spec} → ${tmp}`);
    const tgzName = runCapture("npm", ["pack", spec, "--pack-destination", tmp], tmp);
    const tgzPath = join(tmp, tgzName);
    const extractDir = join(tmp, "extract");
    mkdirSync(extractDir, { recursive: true });
    run("tar", ["-xzf", tgzPath, "-C", extractDir], tmp, log);
    const packedRoot = join(extractDir, "package");
    if (!existsSync(join(packedRoot, "package.json"))) {
      throw new Error(`npm pack for ${spec} did not produce package/package.json`);
    }
    mkdirSync(join(dir, ".."), { recursive: true });
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
    renameSync(packedRoot, dir);
    writeFileSync(
      join(dir, ".agenticros-skill-ref.json"),
      JSON.stringify(
        {
          kind: "npm",
          npmPackage,
          npmVersion: resolvedVersion,
          cachedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (!hasBuiltEntry(dir)) {
    await buildInPlace(dir, log);
  }
  return dir;
}

/**
 * Ensure one skillRef is present under the cache. Returns absolute path or throws.
 */
export async function ensureSkillRefCached(
  rawRef: string,
  opts: ResolveSkillRefsOptions = {},
): Promise<string> {
  const parsed = parseSkillRef(rawRef);
  if (!parsed) {
    throw new Error(
      `Invalid skillRef "${rawRef}" (expected owner/skill, owner/skill@ref, or @scope/name[@semver])`,
    );
  }
  const log = opts.onLog ?? (() => undefined);

  if (parsed.kind === "npm") {
    return ensureNpmPackageCached(parsed.npmPackage!, parsed.npmVersion, opts);
  }

  const cacheRoot = skillsCacheDir(opts.cacheDir);
  const dir = cachePathForGit(cacheRoot, parsed.owner!, parsed.skill!, parsed.gitRef!);

  if (existsSync(join(dir, "package.json"))) {
    if (opts.pullIfPresent || process.env.AGENTICROS_SKILLS_CACHE_PULL === "1") {
      try {
        run("git", ["pull", "--ff-only"], dir, log);
      } catch (e) {
        log(`git pull failed (keeping cache): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!hasBuiltEntry(dir) && !opts.offline) {
      await buildInPlace(dir, log);
    }
    return dir;
  }

  if (opts.offline) {
    throw new Error(`skillRef ${parsed.marketplaceRef} not in cache (offline)`);
  }

  const descriptor = await fetchInstallDescriptor(parsed.marketplaceRef!, opts.apiBase);

  // Prefer npm when the marketplace advertises an npm package.
  const npmPkg = descriptor.npmPackage || (descriptor.packageName?.startsWith("@") ? descriptor.packageName : undefined);
  if (npmPkg) {
    const version =
      parsed.gitRef && parsed.gitRef !== "main"
        ? parsed.gitRef
        : descriptor.npmVersion;
    log(`Install descriptor prefers npm: ${npmPkg}${version ? `@${version}` : ""}`);
    return ensureNpmPackageCached(npmPkg, version, opts);
  }

  if (!descriptor.githubUrl) {
    throw new Error(
      `Install descriptor for ${parsed.marketplaceRef} has no githubUrl or npmPackage`,
    );
  }

  const gitRef = parsed.gitRef !== "main" ? parsed.gitRef! : descriptor.ref || "main";
  const repoUrl = descriptor.githubUrl.endsWith(".git")
    ? descriptor.githubUrl
    : `${descriptor.githubUrl}.git`;

  mkdirSync(join(cacheRoot, parsed.owner!, parsed.skill!), { recursive: true });
  if (!existsSync(join(dir, ".git"))) {
    log(`Cloning ${repoUrl} (${gitRef}) → ${dir}`);
    try {
      run(
        "git",
        ["clone", "--branch", gitRef, "--single-branch", "--depth", "1", repoUrl, dir],
        join(cacheRoot, parsed.owner!, parsed.skill!),
        log,
      );
    } catch {
      run("git", ["clone", "--depth", "1", repoUrl, dir], join(cacheRoot, parsed.owner!, parsed.skill!), log);
      try {
        run("git", ["checkout", gitRef], dir, log);
      } catch {
        /* stay on default branch */
      }
    }
  }

  try {
    writeFileSync(
      join(dir, ".agenticros-skill-ref.json"),
      JSON.stringify(
        {
          kind: "git",
          marketplaceRef: parsed.marketplaceRef,
          gitRef,
          githubUrl: descriptor.githubUrl,
          cachedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch {
    /* ignore */
  }

  await buildInPlace(dir, log);
  return dir;
}

async function buildInPlace(dir: string, log: (m: string) => void): Promise<void> {
  if (hasBuiltEntry(dir)) return;
  const useNpm = !hasBin("pnpm");
  if (useNpm) {
    run("npm", ["install"], dir, log);
    run("npm", ["run", "build"], dir, log);
  } else {
    run("pnpm", ["install"], dir, log);
    run("pnpm", ["run", "build"], dir, log);
  }
}

/**
 * Resolve all config.skillRefs into absolute directories.
 * Does not mutate config — caller merges into skillPaths.
 */
export async function resolveSkillRefs(
  refs: string[],
  opts: ResolveSkillRefsOptions = {},
): Promise<ResolveSkillRefsResult> {
  const paths: string[] = [];
  const errors: ResolveSkillRefsResult["errors"] = [];
  const seen = new Set<string>();
  for (const raw of refs) {
    try {
      const dir = await ensureSkillRefCached(raw, opts);
      if (!seen.has(dir)) {
        seen.add(dir);
        paths.push(dir);
      }
    } catch (e) {
      errors.push({
        ref: raw,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { paths, errors };
}

/**
 * Return a config copy with skillRefs resolved into skillPaths (deduped).
 */
export async function withResolvedSkillRefs(
  config: AgenticROSConfig,
  opts: ResolveSkillRefsOptions = {},
): Promise<{ config: AgenticROSConfig; errors: ResolveSkillRefsResult["errors"] }> {
  const refs = config.skillRefs ?? [];
  if (refs.length === 0) {
    return { config, errors: [] };
  }
  const { paths, errors } = await resolveSkillRefs(refs, opts);
  const merged = [...(config.skillPaths ?? [])];
  const have = new Set(merged.map((p) => p));
  for (const p of paths) {
    if (!have.has(p)) {
      have.add(p);
      merged.push(p);
    }
  }
  return {
    config: { ...config, skillPaths: merged },
    errors,
  };
}

/**
 * Sync: merge skillRefs that are already present under the skills-cache
 * into skillPaths. No network — use CLI install / ensureSkillRefCached to
 * populate the cache first. Safe for OpenClaw's synchronous register().
 */
export function applyCachedSkillRefs(config: AgenticROSConfig): AgenticROSConfig {
  const refs = config.skillRefs ?? [];
  if (refs.length === 0) return config;
  const cacheRoot = skillsCacheDir();
  const merged = [...(config.skillPaths ?? [])];
  const have = new Set(merged);
  for (const raw of refs) {
    const parsed = parseSkillRef(raw);
    if (!parsed) continue;
    if (parsed.kind === "npm") {
      const safeName = parsed.npmPackage!.replace(/^@/, "").replace(/\//g, "__");
      const pkgRoot = join(cacheRoot, "npm", safeName);
      if (!existsSync(pkgRoot)) continue;
      const pin = parsed.npmVersion;
      if (pin && !pin.startsWith("^") && !pin.startsWith("~") && !pin.includes("*") && pin !== "latest") {
        const dir = cachePathForNpm(cacheRoot, parsed.npmPackage!, pin);
        if (existsSync(join(dir, "package.json")) && !have.has(dir)) {
          have.add(dir);
          merged.push(dir);
        }
        continue;
      }
      // Any cached version — prefer highest lexical version dir
      const versions = readdirSync(pkgRoot).filter((v) =>
        existsSync(join(pkgRoot, v, "package.json")),
      );
      if (versions.length === 0) continue;
      versions.sort();
      const dir = join(pkgRoot, versions[versions.length - 1]!);
      if (!have.has(dir)) {
        have.add(dir);
        merged.push(dir);
      }
      continue;
    }
    const dir = cachePathForGit(cacheRoot, parsed.owner!, parsed.skill!, parsed.gitRef!);
    if (existsSync(join(dir, "package.json")) && !have.has(dir)) {
      have.add(dir);
      merged.push(dir);
    }
  }
  if (merged.length === (config.skillPaths ?? []).length) return config;
  return { ...config, skillPaths: merged };
}

/** Repo name hint from github URL (for logging). */
export function githubRepoBasename(githubUrl: string): string {
  return basename(githubUrl.replace(/\.git$/, "").replace(/\/+$/, ""));
}
