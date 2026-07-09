/**
 * Local validation of skill package.json manifests.
 * Keep in sync with agenticros-skills/functions/src/util/manifest.ts
 */

export interface AgenticROSBlock {
  id: string;
  displayName?: string;
  description?: string;
  tutorial?: boolean;
  categories?: string[];
  screenshots?: string[];
  demoVideoUrl?: string;
  capabilities?: Capability[];
}

export interface Capability {
  id: string;
  verb: string;
  description: string;
  inputs?: Record<string, string>;
  outputs?: Record<string, string>;
  interruptible?: boolean;
  blocks_base?: boolean;
}

export interface SkillManifest {
  name: string;
  version: string;
  description?: string;
  main?: string;
  homepage?: string;
  bugs?: string | { url?: string };
  keywords?: string[];
  repository?: string | { url?: string };
  dependencies?: Record<string, string>;
  agenticros?: AgenticROSBlock;
  agenticrosSkill?: unknown;
}

export interface ValidatedManifest {
  manifest: SkillManifest;
  block: AgenticROSBlock;
  warnings: string[];
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestError";
  }
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function validateManifest(raw: unknown): ValidatedManifest {
  if (!raw || typeof raw !== "object") {
    throw new ManifestError("package.json is missing or empty");
  }
  const m = raw as SkillManifest;

  if (!m.name || typeof m.name !== "string") {
    throw new ManifestError("package.json must declare a `name`");
  }
  if (!m.version || typeof m.version !== "string") {
    throw new ManifestError("package.json must declare a `version`");
  }
  if (!m.main || typeof m.main !== "string") {
    throw new ManifestError(
      "package.json must declare a `main` entry (e.g. `dist/index.js`).",
    );
  }
  if (!m.agenticros || typeof m.agenticros !== "object") {
    throw new ManifestError(
      "package.json must declare an `agenticros` block. See https://skills.agenticros.com",
    );
  }
  const block = m.agenticros;
  if (!block.id || typeof block.id !== "string" || !isValidSlug(block.id)) {
    throw new ManifestError(
      "`agenticros.id` is required and must be a kebab-case slug (2-64 chars, [a-z0-9-]).",
    );
  }

  const warnings: string[] = [];
  if (m.agenticrosSkill !== undefined) {
    warnings.push(
      "The legacy `agenticrosSkill` field is deprecated. Move metadata into the `agenticros` block.",
    );
  }
  const coreDep = m.dependencies?.["@agenticros/core"];
  if (coreDep?.startsWith("file:")) {
    warnings.push(
      "`@agenticros/core` is declared as a `file:` path. Publish a version from npm (e.g. `^0.5.0`) before others can install your skill.",
    );
  }
  if (!block.description && !m.description) {
    warnings.push("Add a one-sentence `description` (top-level or in `agenticros`).");
  }
  if (!block.capabilities || block.capabilities.length === 0) {
    warnings.push(
      "Declare at least one capability in `agenticros.capabilities` so the agent planner can reason about your skill.",
    );
  } else {
    for (const cap of block.capabilities) {
      if (!cap || typeof cap !== "object" || typeof (cap as { id?: unknown }).id !== "string") {
        warnings.push("Each capability must be an object with a string `id`.");
        continue;
      }
      const c = cap as {
        id: string;
        verb?: string;
        implementation?: { kind?: string; action?: string; service?: string; topic?: string; msg_type?: string };
      };
      if (!c.verb || typeof c.verb !== "string") {
        warnings.push(`Capability "${c.id}" should declare a string \`verb\`.`);
      }
      const impl = c.implementation;
      if (impl && typeof impl === "object" && impl.kind === "external_ros_node") {
        if (!impl.action && !impl.service && !impl.topic) {
          warnings.push(
            `Capability "${c.id}" external_ros_node should set action, service, or topic.`,
          );
        }
        if ((impl.action || impl.service || impl.topic) && !impl.msg_type) {
          warnings.push(
            `Capability "${c.id}" external_ros_node should set msg_type for action/service/topic dispatch.`,
          );
        }
      }
    }
  }
  if (!block.screenshots || block.screenshots.length === 0) {
    warnings.push(
      "Add at least one entry to `agenticros.screenshots` so the marketplace card has a preview image.",
    );
  }

  return { manifest: m, block, warnings };
}

export function manifestRepoUrl(m: SkillManifest): string | null {
  if (!m.repository) return null;
  if (typeof m.repository === "string") return m.repository;
  return m.repository.url ?? null;
}

export function firestoreDocId(ownerLogin: string, skillSlug: string): string {
  return `${ownerLogin.toLowerCase()}__${skillSlug}`;
}

export function marketplaceRef(ownerLogin: string, skillSlug: string): string {
  return `${ownerLogin.toLowerCase()}/${skillSlug}`;
}

export function parseMarketplaceRef(
  ref: string,
): { owner: string; skill: string } | null {
  const trimmed = ref.trim();
  const slash = trimmed.indexOf("/");
  if (slash <= 0 || slash === trimmed.length - 1) return null;
  const owner = trimmed.slice(0, slash).toLowerCase();
  const skill = trimmed.slice(slash + 1);
  if (!/^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/.test(owner)) return null;
  if (!isValidSlug(skill)) return null;
  return { owner, skill };
}
