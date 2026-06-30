/**
 * `agenticros create-skill <slug>` — scaffold a new skill package in cwd.
 */

import { basename } from "node:path";

import { scaffoldSkill } from "../util/skill-scaffold.js";
import { colors, dim, err, header, info, ok } from "../util/logger.js";

export interface CreateSkillOptions {
  slug: string;
  template?: string;
}

export async function createSkillCommand(opts: CreateSkillOptions): Promise<void> {
  if (!opts.slug?.trim()) {
    err("Usage: agenticros create-skill <slug> [--template hello|robot|camera|depth]");
    process.exit(1);
  }

  header("Creating skill");

  let result;
  try {
    result = scaffoldSkill({ slug: opts.slug, template: opts.template });
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  ok(`Creating skill ${result.slug}`);

  const dirName = basename(result.dir);
  info("");
  info("Skill created:");
  info("");
  info(`  ${dirName}/`);
  info("    src/index.ts");
  info("    package.json");
  info("    README.md");
  info("    demo.md");
  info("    docs/icon.png");
  info("");
  info("Next steps:");
  info("");
  info(`  cd ${dirName}`);
  info("  npm install");
  info("  npm run dev");
  info("");
  dim(`Template: ${result.template}  |  Tool: ${result.toolName}`);
}
