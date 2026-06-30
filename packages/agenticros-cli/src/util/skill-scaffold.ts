/**
 * Skill scaffolding — copy embedded templates into cwd/agenticros-skill-<slug>/.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export type SkillTemplate = "hello" | "robot" | "camera" | "depth";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

const TEMPLATE_ALIASES: Record<string, SkillTemplate> = {
  hello: "hello",
  h: "hello",
  robot: "robot",
  r: "robot",
  camera: "camera",
  c: "camera",
  depth: "depth",
  d: "depth",
};

const TEMPLATE_DEFAULTS: Record<
  SkillTemplate,
  { displayName: string; description: string }
> = {
  hello: {
    displayName: "Hello World",
    description: "My first AgenticROS skill — returns a friendly greeting.",
  },
  robot: {
    displayName: "Wave Hand",
    description: "Wave the robot base with a brief cmd_vel gesture.",
  },
  camera: {
    displayName: "Describe Scene",
    description: "Capture one frame from the robot camera.",
  },
  depth: {
    displayName: "Measure Distance",
    description: "Sample depth at the center of the depth image.",
  },
};

/** Minimal 1×1 PNG (valid placeholder for docs/icon.png). */
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function normalizeTemplate(input: string | undefined): SkillTemplate {
  const key = (input ?? "hello").toLowerCase().trim();
  const t = TEMPLATE_ALIASES[key];
  if (!t) {
    throw new Error(
      `Unknown template "${input}". Use: hello, robot, camera, or depth.`,
    );
  }
  return t;
}

export function normalizeSkillSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/^@[^/]+\//, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error(
      "Skill slug must be kebab-case (2–64 chars, [a-z0-9-]), e.g. hello-world or follow-me.",
    );
  }
  return slug;
}

export function slugToToolName(slug: string): string {
  return slug.replace(/-/g, "_");
}

export function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function templatesRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "templates", "skills");
}

function substituteVars(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function copyTemplateTree(
  srcDir: string,
  destDir: string,
  vars: Record<string, string>,
): void {
  for (const name of readdirSync(srcDir)) {
    const src = join(srcDir, name);
    const dest = join(destDir, name);
    const st = statSync(src);
    if (st.isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyTemplateTree(src, dest, vars);
    } else {
      const raw = readFileSync(src, "utf8");
      writeFileSync(dest, substituteVars(raw, vars), "utf8");
    }
  }
}

export interface ScaffoldOptions {
  slug: string;
  template?: string;
  cwd?: string;
}

export interface ScaffoldResult {
  dir: string;
  slug: string;
  template: SkillTemplate;
  toolName: string;
}

export function scaffoldSkill(opts: ScaffoldOptions): ScaffoldResult {
  const slug = normalizeSkillSlug(opts.slug);
  const template = normalizeTemplate(opts.template);
  const cwd = opts.cwd ?? process.cwd();
  const dir = resolve(cwd, `agenticros-skill-${slug}`);

  if (existsSync(dir)) {
    throw new Error(`Directory already exists: ${dir}`);
  }

  const defaults = TEMPLATE_DEFAULTS[template];
  const displayName = slugToDisplayName(slug);
  const toolName = slugToToolName(slug);
  const vars = {
    slug,
    displayName,
    toolName,
    description: defaults.description,
  };

  const srcTemplate = join(templatesRoot(), template);
  if (!existsSync(srcTemplate)) {
    throw new Error(`Template not found on disk: ${srcTemplate}`);
  }

  mkdirSync(dir, { recursive: true });
  copyTemplateTree(srcTemplate, dir, vars);

  const docsDir = join(dir, "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "icon.png"), PLACEHOLDER_PNG);

  return { dir, slug, template, toolName };
}

/** SHA-256 of normalized template source (for tutorial graduation checks). */
export function hashSkillSource(source: string): string {
  const normalized = source.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export function getTemplateFingerprints(): Record<SkillTemplate, string> {
  const root = templatesRoot();
  const out = {} as Record<SkillTemplate, string>;
  for (const t of ["hello", "robot", "camera", "depth"] as SkillTemplate[]) {
    const indexPath = join(root, t, "src", "index.ts");
    if (existsSync(indexPath)) {
      out[t] = hashSkillSource(readFileSync(indexPath, "utf8"));
    }
  }
  return out;
}

export function isUnmodifiedTemplate(
  source: string,
  template: SkillTemplate,
): boolean {
  const fps = getTemplateFingerprints();
  const fp = fps[template];
  if (!fp) return false;
  return hashSkillSource(source) === fp;
}

export function readSkillIndexSource(skillDir: string): string | null {
  const path = join(skillDir, "src", "index.ts");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}
