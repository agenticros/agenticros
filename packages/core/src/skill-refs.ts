/**
 * skillRefs → ~/.agenticros/skills-cache resolver (marketplace auto-fetch v1).
 *
 * Declarative refs like `agenticros/navigate-to` or `owner/skill@main` are
 * resolved via the skills marketplace install API, cloned into the cache,
 * built if needed, and returned as absolute skillPaths for capability
 * reading / OpenClaw loading.
 *
 * Never auto-upgrades: if the cache dir for a pin already exists, reuse it
 * (optional pull when AGENTICROS_SKILLS_CACHE_PULL=1).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";
import type { AgenticROSConfig } from "./config.js";

export const DEFAULT_SKILLS_API = "https://skills.agenticros.com/api";
export const DEFAULT_SKILLS_CACHE_DIR = join(homedir(), ".agenticros", "skills-cache");

export interface ParsedSkillRef {
  /** owner/skill (lowercase) */
  marketplaceRef: string;
  owner: string;
  skill: string;
  /** git ref / branch pin; default main */
  gitRef: string;
}

export interface InstallDescriptor {
  slug: string;
  marketplaceRef?: string;
  skillId: string;
  packageName: string;
  githubUrl: string;
  ref: string;
  buildCmd: string;
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

/** Parse `owner/skill` or `owner/skill@branch`. */
export function parseSkillRef(raw: string): ParsedSkillRef | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
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
  if (!desc.githubUrl) {
    throw new Error(`Install descriptor for ${marketplaceRef} has no githubUrl`);
  }
  return desc;
}

function cachePathFor(
  cacheDir: string,
  owner: string,
  skill: string,
  gitRef: string,
): string {
  const safeRef = gitRef.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return join(cacheDir, owner, skill, safeRef);
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

function hasBin(name: string): boolean {
  try {
    execFileSync(name, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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
    throw new Error(`Invalid skillRef "${rawRef}" (expected owner/skill or owner/skill@ref)`);
  }
  const log = opts.onLog ?? (() => undefined);
  const cacheRoot = skillsCacheDir(opts.cacheDir);
  const dir = cachePathFor(cacheRoot, parsed.owner, parsed.skill, parsed.gitRef);

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

  const descriptor = await fetchInstallDescriptor(parsed.marketplaceRef, opts.apiBase);
  const gitRef = parsed.gitRef !== "main" ? parsed.gitRef : descriptor.ref || "main";
  const repoUrl = descriptor.githubUrl.endsWith(".git")
    ? descriptor.githubUrl
    : `${descriptor.githubUrl}.git`;

  mkdirSync(join(cacheRoot, parsed.owner, parsed.skill), { recursive: true });
  if (!existsSync(join(dir, ".git"))) {
    log(`Cloning ${repoUrl} (${gitRef}) → ${dir}`);
    try {
      run(
        "git",
        ["clone", "--branch", gitRef, "--single-branch", "--depth", "1", repoUrl, dir],
        join(cacheRoot, parsed.owner, parsed.skill),
        log,
      );
    } catch {
      // Branch pin may be a tag or default branch name mismatch — full clone + checkout.
      run("git", ["clone", "--depth", "1", repoUrl, dir], join(cacheRoot, parsed.owner, parsed.skill), log);
      try {
        run("git", ["checkout", gitRef], dir, log);
      } catch {
        /* stay on default branch */
      }
    }
  }

  // Marker for which marketplace ref produced this cache entry
  try {
    writeFileSync(
      join(dir, ".agenticros-skill-ref.json"),
      JSON.stringify(
        {
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
 * Sync-friendly path: if offline or empty refs, returns config unchanged
 * except merging any already-cached paths when possible without network.
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
    const dir = cachePathFor(cacheRoot, parsed.owner, parsed.skill, parsed.gitRef);
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
