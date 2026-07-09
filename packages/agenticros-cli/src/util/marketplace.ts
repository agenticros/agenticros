/**
 * Tiny client for the AgenticROS Skills marketplace REST API.
 *
 * The marketplace itself is at https://skills.agenticros.com — this CLI
 * talks to the REST endpoints exposed under /api/ (rewritten by Firebase
 * Hosting to the `api` Cloud Function). Read-only, no auth.
 *
 * Override the base URL via `AGENTICROS_SKILLS_API` for local emulator
 * testing or staging deployments.
 */
import { mkdirSync, existsSync } from "node:fs";
import { dirname, basename, join, resolve } from "node:path";
import { execa } from "execa";

import { discoveryRoots } from "./skills.js";

export const DEFAULT_API_BASE = "https://skills.agenticros.com/api";

export function apiBase(): string {
  return (process.env.AGENTICROS_SKILLS_API || DEFAULT_API_BASE).replace(/\/+$/, "");
}

export interface MarketplaceSkill {
  slug: string;
  marketplaceRef?: string;
  ownerLogin?: string;
  skillSlug?: string;
  name: string;
  displayName: string;
  description: string;
  packageName: string;
  skillId: string;
  version: string;
  githubUrl: string;
  categories: string[];
  keywords: string[];
  maintainerLogin: string;
  starCount: number;
  viewCount: number;
  visibility?: string;
}

export interface InstallDescriptor {
  slug: string;
  marketplaceRef?: string;
  skillId: string;
  packageName: string;
  githubUrl: string;
  ref: string;
  buildCmd: string;
  npmPackage?: string;
  npmVersion?: string;
}

export function skillApiPath(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.includes("/")) {
    const [owner, ...rest] = trimmed.split("/");
    const skill = rest.join("/");
    return `${apiBase()}/skills/${encodeURIComponent(owner)}/${encodeURIComponent(skill)}`;
  }
  return `${apiBase()}/skills/${encodeURIComponent(trimmed)}`;
}

export function displayRef(skill: MarketplaceSkill | InstallDescriptor): string {
  return skill.marketplaceRef ?? skill.slug;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    throw new MarketplaceError(
      `Marketplace API ${res.status} on ${url}: ${body.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

export class MarketplaceError extends Error {}

export async function searchSkills(
  q: string,
  opts: { limit?: number; category?: string; sort?: "recent" | "popular" } = {},
): Promise<MarketplaceSkill[]> {
  const u = new URL(`${apiBase()}/skills`);
  if (q) u.searchParams.set("q", q);
  if (opts.category) u.searchParams.set("category", opts.category);
  if (opts.sort) u.searchParams.set("sort", opts.sort);
  if (opts.limit) u.searchParams.set("limit", String(opts.limit));
  const body = await getJson<{ skills: MarketplaceSkill[] }>(u.toString());
  return body.skills;
}

export async function getSkill(ref: string): Promise<MarketplaceSkill> {
  const skill = await getJson<MarketplaceSkill>(skillApiPath(ref));
  if (!skill.marketplaceRef && ref.includes("/")) {
    skill.marketplaceRef = ref;
  }
  return skill;
}

export async function getInstallDescriptor(ref: string): Promise<InstallDescriptor> {
  const desc = await getJson<InstallDescriptor>(`${skillApiPath(ref)}/install`);
  if (!desc.marketplaceRef && ref.includes("/")) {
    desc.marketplaceRef = ref;
  }
  return desc;
}

export interface ValidateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateSkillOnMarketplace(
  manifest: unknown,
): Promise<ValidateResult> {
  const res = await fetch(`${apiBase()}/skills/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ manifest }),
  });
  const body = (await res.json()) as ValidateResult & { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      errors: body.errors ?? [body.error ?? `Validation failed (${res.status})`],
      warnings: body.warnings ?? [],
    };
  }
  return body;
}

export interface SubmitResult {
  marketplaceRef: string;
  ownerLogin: string;
  skillSlug: string;
  visibility: string;
  warnings?: string[];
}

export async function submitSkillToMarketplace(opts: {
  githubUrl: string;
  githubAccessToken: string;
}): Promise<SubmitResult> {
  const res = await fetch(`${apiBase()}/skills/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${opts.githubAccessToken}`,
    },
    body: JSON.stringify({ githubUrl: opts.githubUrl }),
  });
  const body = (await res.json()) as SubmitResult & { error?: string };
  if (!res.ok) {
    throw new MarketplaceError(body.error ?? `Submit failed (${res.status})`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Local clone + build
// ---------------------------------------------------------------------------

/**
 * Pick a sensible parent directory for `git clone` — the parent of the
 * agenticros repo if we can find it, otherwise `~/Projects`, otherwise
 * `$HOME`. This keeps cloned skills next to the rest of the user's robot
 * source so the existing discovery roots find them too.
 */
export function pickCloneParent(): string {
  const roots = discoveryRoots();
  // Prefer the parent of the user's agenticros checkout.
  for (const r of roots) {
    if (
      existsSync(join(r, "agenticros")) ||
      existsSync(join(r, "agenticros", "packages", "core"))
    ) {
      return r;
    }
  }
  // Else: ~/Projects if it exists in discoveryRoots.
  const projectsRoot = roots.find((r) => r.endsWith("/Projects"));
  if (projectsRoot) return projectsRoot;
  // Else: first root.
  return roots[0] ?? process.cwd();
}

export interface CloneAndBuildResult {
  cloneDir: string;
  alreadyExisted: boolean;
}

/**
 * `git clone` a skill from GitHub into a sibling of the agenticros repo,
 * then run its build command. Returns the absolute directory the skill
 * was cloned into so the caller can `addSkillByPath` it.
 */
export async function cloneAndBuild(
  descriptor: InstallDescriptor,
  opts: { intoDir?: string; force?: boolean; onLog?: (msg: string) => void } = {},
): Promise<CloneAndBuildResult> {
  const log = opts.onLog ?? (() => undefined);
  const repoUrl = descriptor.githubUrl.endsWith(".git")
    ? descriptor.githubUrl
    : `${descriptor.githubUrl}.git`;
  // Default to a sibling of the agenticros repo so existing discovery
  // roots find it (~/Projects/agenticros-skill-followme, etc.).
  const parent = opts.intoDir
    ? resolve(opts.intoDir)
    : pickCloneParent();
  const repoName = basename(
    descriptor.githubUrl.replace(/\.git$/, "").replace(/\/+$/, ""),
  );
  const cloneDir = join(parent, repoName);

  let alreadyExisted = false;
  if (existsSync(cloneDir)) {
    if (!opts.force) {
      log(`Already cloned at ${cloneDir} — pulling latest…`);
      alreadyExisted = true;
      await runIn(cloneDir, "git", ["pull", "--ff-only"], log);
    }
  } else {
    mkdirSync(parent, { recursive: true });
    log(`Cloning ${repoUrl} into ${cloneDir}…`);
    await runIn(parent, "git", ["clone", repoUrl, repoName], log);
  }

  // Run the build command (default: pnpm install && pnpm build). Falls
  // back to npm if pnpm isn't installed.
  const useNpm = !(await hasBin("pnpm"));
  if (useNpm) {
    log(`pnpm not found — falling back to npm.`);
    await runIn(cloneDir, "npm", ["install"], log);
    await runIn(cloneDir, "npm", ["run", "build"], log);
  } else {
    await runIn(cloneDir, "pnpm", ["install"], log);
    await runIn(cloneDir, "pnpm", ["run", "build"], log);
  }

  return { cloneDir, alreadyExisted };
}

async function runIn(
  cwd: string,
  cmd: string,
  args: string[],
  log: (msg: string) => void,
): Promise<void> {
  log(`$ ${cmd} ${args.join(" ")}  (in ${cwd})`);
  const sub = execa(cmd, args, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    reject: true,
  });
  await sub;
}

async function hasBin(name: string): Promise<boolean> {
  try {
    await execa(name, ["--version"], { stdout: "ignore", stderr: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Build the `dirname` re-export here so the consumer doesn't pull node:path.
export const utilDirname = dirname;
