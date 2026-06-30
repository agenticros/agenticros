/**
 * `agenticros publish` — validate, push to GitHub, submit to skills marketplace.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { checkbox, confirm, input } from "@inquirer/prompts";
import { execa } from "execa";

import { skillsDevCommand } from "./skills-dev.js";
import {
  isUnmodifiedTemplate,
  readSkillIndexSource,
} from "../util/skill-scaffold.js";
import {
  validateManifest,
  type SkillManifest,
} from "../util/skill-manifest.js";
import {
  apiBase,
  submitSkillToMarketplace,
  validateSkillOnMarketplace,
} from "../util/marketplace.js";
import { colors, dim, err, header, info, ok, warn } from "../util/logger.js";

const MARKETPLACE_CATEGORIES = [
  "navigation",
  "vision",
  "human-interaction",
  "manipulation",
  "search",
  "audio",
  "communication",
  "telemetry",
];

export interface PublishSkillOptions {
  graduate?: boolean;
  cwd?: string;
  yes?: boolean;
}

async function getGithubToken(): Promise<string | null> {
  const env = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (env?.trim()) return env.trim();
  try {
    const { stdout } = await execa("gh", ["auth", "token"], { reject: false });
    const t = stdout.trim();
    return t || null;
  } catch {
    return null;
  }
}

async function getGithubLogin(token: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agenticros-cli",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub auth failed (${res.status}). Run: gh auth login -s public_repo`);
  }
  const data = (await res.json()) as { login?: string };
  if (!data.login) throw new Error("Could not read GitHub login from token.");
  return data.login;
}

function readSkillPackage(cwd: string): SkillManifest {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) {
    throw new Error("No package.json in current directory. Run from your skill root.");
  }
  return JSON.parse(readFileSync(path, "utf8")) as SkillManifest;
}

function writeSkillPackage(cwd: string, manifest: SkillManifest): void {
  writeFileSync(join(cwd, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function detectTemplate(manifest: SkillManifest): "hello" | "robot" | "camera" | "depth" | null {
  if (manifest.agenticros?.tutorial === true) return "hello";
  const source = readSkillIndexSource(process.cwd());
  if (!source) return null;
  for (const t of ["hello", "robot", "camera", "depth"] as const) {
    if (isUnmodifiedTemplate(source, t)) return t;
  }
  return null;
}

async function ensureGitRemote(cwd: string, slug: string): Promise<string> {
  try {
    const { stdout } = await execa("git", ["remote", "get-url", "origin"], { cwd });
    const url = stdout.trim();
    if (url) return normalizeGithubUrl(url);
  } catch {
    // no remote
  }

  const token = await getGithubToken();
  if (!token) {
    throw new Error(
      "No git remote origin. Create a GitHub repo and run:\n" +
        `  gh repo create agenticros-skill-${slug} --public --source=. --remote=origin --push`,
    );
  }

  const login = await getGithubLogin(token);
  const repoName = `agenticros-skill-${slug}`;
  info(`Creating GitHub repo ${login}/${repoName}…`);
  await execa(
    "gh",
    ["repo", "create", repoName, "--public", "--source=.", "--remote=origin", "--push"],
    { cwd, stdio: "inherit" },
  );
  const { stdout } = await execa("git", ["remote", "get-url", "origin"], { cwd });
  return normalizeGithubUrl(stdout.trim());
}

function normalizeGithubUrl(url: string): string {
  let u = url.replace(/\.git$/, "");
  if (u.startsWith("git@github.com:")) {
    u = `https://github.com/${u.slice("git@github.com:".length)}`;
  }
  return u;
}

export async function publishSkillCommand(opts: PublishSkillOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  header("Publish skill to marketplace");

  let manifest = readSkillPackage(cwd);
  const { block, warnings } = validateManifest(manifest);

  if (block.tutorial === true && !opts.graduate) {
    err(
      "This is a tutorial skill (agenticros.tutorial: true). " +
        "Customize src/index.ts and run with --graduate to publish to the public catalog, " +
        "or use --template robot|camera|depth for a publish-ready skill.",
    );
    process.exit(1);
  }

  const source = readSkillIndexSource(cwd);
  const detectedTemplate = detectTemplate(manifest);
  if (opts.graduate) {
    if (!source || (detectedTemplate && isUnmodifiedTemplate(source, detectedTemplate))) {
      err("Source still matches the default template. Customize src/index.ts before --graduate.");
      process.exit(1);
    }
    const yes = await confirm({
      message: "Remove tutorial flag and publish to the public catalog?",
      default: false,
    });
    if (!yes) {
      info("Publish cancelled.");
      return;
    }
    if (manifest.agenticros) {
      manifest.agenticros.tutorial = false;
      writeSkillPackage(cwd, manifest);
    }
  }

  try {
    await execa("npm", ["run", "build"], { cwd, stdio: "inherit" });
  } catch {
    err("Build failed.");
    process.exit(1);
  }

  try {
    await skillsDevCommand({ cwd, live: false });
  } catch {
    // skillsDevCommand exits on failure
    return;
  }

  if (!opts.yes) {
    if (!block.description) {
      const description = await input({
        message: "Description (one sentence):",
        validate: (v) => v.trim().length > 0 || "Required",
      });
      manifest.agenticros = { ...block, description: description.trim() };
      manifest.description = description.trim();
      writeSkillPackage(cwd, manifest);
    }

    if (!block.categories || block.categories.length === 0) {
      const categories = await checkbox({
        message: "Categories:",
        choices: MARKETPLACE_CATEGORIES.map((c) => ({ name: c, value: c })),
      });
      manifest.agenticros = {
        ...(manifest.agenticros ?? block),
        categories,
      };
      writeSkillPackage(cwd, manifest);
    }
  }

  manifest = readSkillPackage(cwd);
  const remoteUrl = await ensureGitRemote(cwd, block.id);

  try {
    await execa("git", ["add", "-A"], { cwd });
    const { stdout: status } = await execa("git", ["status", "--porcelain"], { cwd });
    if (status.trim()) {
      await execa("git", ["commit", "-m", `chore: prepare ${block.id} for marketplace`], {
        cwd,
        stdio: "inherit",
      });
    }
    await execa("git", ["push", "-u", "origin", "HEAD"], { cwd, stdio: "inherit" });
  } catch (e) {
    warn(`Git push issue: ${e instanceof Error ? e.message : String(e)}`);
  }

  const remoteValidation = await validateSkillOnMarketplace(manifest);
  if (!remoteValidation.ok) {
    for (const e of remoteValidation.errors) err(e);
    process.exit(1);
  }
  for (const w of [...warnings, ...remoteValidation.warnings]) {
    warn(w);
  }

  const token = await getGithubToken();
  if (!token) {
    err("GitHub token required. Run: gh auth login -s public_repo");
    info(`Or submit manually: ${apiBase().replace("/api", "")}/submit`);
    process.exit(1);
  }

  const login = await getGithubLogin(token);
  let result;
  try {
    result = await submitSkillToMarketplace({ githubUrl: remoteUrl, githubAccessToken: token });
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const ref = result.marketplaceRef ?? `${login}/${block.id}`;
  const site = apiBase().replace(/\/api$/, "");
  ok("Published to skills.agenticros.com");
  info(`  ${site}/${ref}`);
  info(`  Profile: ${site}/${login}`);
  info("");
  info(`Install: ${colors.bold(`npx agenticros skills install ${ref}`)}`);
  if (result.warnings?.length) {
    for (const w of result.warnings) warn(w);
  }
}
