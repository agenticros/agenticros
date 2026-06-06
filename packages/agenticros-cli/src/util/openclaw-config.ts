/**
 * Safe read/write helper for the OpenClaw gateway config file.
 *
 * The OpenClaw config (default: `~/.openclaw/openclaw.json`) is the source of
 * truth for the AgenticROS *plugin*'s skill configuration —
 * `plugins.entries.agenticros.config.skillPaths` and `.skillPackages` decide
 * which skill packages the plugin loads at gateway start. The MCP server and
 * the Gemini CLI read their config from `~/.agenticros/config.json` instead;
 * neither currently loads skills.
 *
 * This module exists so the rest of the CLI can mutate that nested
 * `plugins.entries.agenticros.config` slice without round-tripping the entire
 * JSON document or accidentally clobbering unrelated keys (gateway auth,
 * other plugins, etc). Every write goes through the full JSON parse → mutate
 * → stringify cycle to keep the file valid; comments are not supported in the
 * source JSON either way.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

/** Default location of the OpenClaw config. Overridable via `$OPENCLAW_CONFIG`. */
export function openclawConfigPath(): string {
  const env = process.env["OPENCLAW_CONFIG"];
  if (env && env.trim().length > 0) return env;
  return join(homedir(), ".openclaw", "openclaw.json");
}

export function openclawConfigExists(): boolean {
  return existsSync(openclawConfigPath());
}

/**
 * Read the OpenClaw config or return `undefined` if it doesn't exist / is
 * not valid JSON. We never throw — callers can decide how loudly to fail.
 */
export function readOpenclawConfig(): Record<string, unknown> | undefined {
  const p = openclawConfigPath();
  if (!existsSync(p)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Write the config back, pretty-printed (2-space indent), with a trailing newline. */
export function writeOpenclawConfig(cfg: Record<string, unknown>): void {
  const p = openclawConfigPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`);
}

/**
 * Locate (and lazily create) the `plugins.entries.agenticros.config` subtree.
 * Mutates `cfg` in place and returns the inner config object so callers can
 * read/modify its `skillPaths`, `skillPackages`, `skills`, etc.
 */
export function getAgenticrosPluginConfig(cfg: Record<string, unknown>): Record<string, unknown> {
  const plugins = asObject(cfg, "plugins");
  const entries = asObject(plugins, "entries");
  const agenticros = asObject(entries, "agenticros");
  return asObject(agenticros, "config");
}

function asObject(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const cur = parent[key];
  if (cur && typeof cur === "object" && !Array.isArray(cur)) {
    return cur as Record<string, unknown>;
  }
  const fresh: Record<string, unknown> = {};
  parent[key] = fresh;
  return fresh;
}

/**
 * Ensure `obj[key]` is an array of strings and return it (creating an empty
 * array if needed). Non-string entries in an existing array are preserved so
 * we don't silently drop opaque values, but lookups still operate on strings.
 */
export function ensureStringArray(
  obj: Record<string, unknown>,
  key: string,
): unknown[] {
  const cur = obj[key];
  if (Array.isArray(cur)) return cur;
  const fresh: unknown[] = [];
  obj[key] = fresh;
  return fresh;
}
