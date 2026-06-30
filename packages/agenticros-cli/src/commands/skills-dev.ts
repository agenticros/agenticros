/**
 * `agenticros skills dev` — load a skill locally without the OpenClaw gateway.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { execa } from "execa";

import { validateManifest } from "../util/skill-manifest.js";
import { err, ok, info, warn } from "../util/logger.js";

export interface SkillsDevOptions {
  invoke?: string;
  watch?: boolean;
  live?: boolean;
  cwd?: string;
}

interface RegisteredTool {
  name: string;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}

function readPackageJson(dir: string): Record<string, unknown> {
  const path = join(dir, "package.json");
  if (!existsSync(path)) {
    throw new Error("No package.json in current directory. Run from your skill root.");
  }
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function stubContext(live: boolean) {
  const noopTransport = {
    async publish() {},
    async subscribeOnce() {
      return null;
    },
    async listTopics() {
      return [];
    },
    async callService() {
      return null;
    },
    async sendActionGoal() {
      return null;
    },
    async getParameter() {
      return null;
    },
    async setParameter() {},
    status: live ? "connected" : "disconnected",
  };

  return {
    getTransport() {
      if (!live) {
        throw new Error(
          "Transport not connected. Use --live when a gateway is running, or test tool registration only.",
        );
      }
      return noopTransport;
    },
    async getDepthDistance() {
      return {
        distance_m: 0,
        median_m: 0,
        valid: false,
        topic: "",
        encoding: "",
        width: 0,
        height: 0,
        sample_count: 0,
        min_m: 0,
        max_m: 0,
      };
    },
    async getDepthSectors() {
      return {
        left_m: 0,
        center_m: 0,
        right_m: 0,
        valid: false,
        topic: "",
      };
    },
    logger: {
      info: (...m: unknown[]) => console.log("[skill]", ...m),
      warn: (...m: unknown[]) => console.warn("[skill]", ...m),
      error: (...m: unknown[]) => console.error("[skill]", ...m),
      debug: () => {},
    },
  };
}

function loadRegisteredTools(entryPath: string, config: unknown, live: boolean): RegisteredTool[] {
  const tools: RegisteredTool[] = [];
  const api = {
    registerTool(tool: RegisteredTool & { label?: string; description?: string; parameters?: unknown }) {
      tools.push({ name: tool.name, execute: tool.execute });
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  };

  const require = createRequire(pathToFileURL(entryPath).href);
  const mod = require(entryPath) as { registerSkill?: (...args: unknown[]) => void };
  if (typeof mod.registerSkill !== "function") {
    throw new Error(`${entryPath} must export registerSkill(api, config, context).`);
  }
  mod.registerSkill(api, config, stubContext(live));
  return tools;
}

export async function skillsDevCommand(opts: SkillsDevOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const pkg = readPackageJson(cwd);
  const { block } = validateManifest(pkg);
  const skillId = block.id;

  if (!opts.watch) {
    try {
      await execa("npm", ["run", "build"], { cwd, stdio: "inherit" });
    } catch {
      err("Build failed. Fix TypeScript errors and retry.");
      process.exit(1);
    }
  }

  const main = typeof pkg.main === "string" ? pkg.main : "dist/index.js";
  const entryPath = resolve(cwd, main);
  if (!existsSync(entryPath)) {
    err(`Built entry not found: ${entryPath}. Run npm run build first.`);
    process.exit(1);
  }

  const agenticrosConfig = {
    skills: { [skillId]: {} },
    robot: {
      cameraTopic: "camera/color/image_raw",
      depthTopic: "depth/image_rect_raw",
    },
  };

  let tools: RegisteredTool[];
  try {
    tools = loadRegisteredTools(entryPath, agenticrosConfig, opts.live === true);
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  ok(`Skill loaded: ${skillId}`);
  info(`  Tools: ${tools.map((t) => t.name).join(", ") || "(none)"}`);

  if (opts.invoke) {
    const tool = tools.find((t) => t.name === opts.invoke);
    if (!tool) {
      err(`Tool not found: ${opts.invoke}`);
      process.exit(1);
    }
    try {
      const result = await tool.execute("dev", {}, undefined);
      info(JSON.stringify(result, null, 2));
    } catch (e) {
      if (!opts.live) {
        warn("Tool execution failed (expected without --live for robot/camera/depth tools).");
      }
      err(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  }
}
