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

/**
 * Locate the AgenticROS plugin manifest whose `contracts.tools` the CLI
 * should treat as canonical.
 *
 * Order:
 *   1. The in-repo source manifest at
 *      `<installRoot>/packages/agenticros/openclaw.plugin.json`. This is
 *      the "future-proof" list — anything `sync-skill-tools.mjs` adds for
 *      a new skill lands here first, and the next `setup_gateway_plugin.sh`
 *      run propagates it into the deploy. Stamping `alsoAllow` from this
 *      file means the chat agent picks up the new tools the moment the
 *      gateway restarts, with no second sync round-trip.
 *   2. The deploy dir produced by `setup_gateway_plugin.sh`
 *      (`~/.agenticros/plugin-deploy/openclaw.plugin.json`) — used when
 *      the CLI runs without a workspace checkout (npx-from-tarball).
 *
 * `installRoot` is the agenticros workspace root (`getCliPaths().repoRoot`).
 * Returns `undefined` if neither file exists yet — callers should treat that
 * as "plugin not installed yet, skip the sync step".
 */
export function findAgenticrosPluginManifest(installRoot?: string): string | undefined {
  if (installRoot) {
    const inRepo = join(installRoot, "packages", "agenticros", "openclaw.plugin.json");
    if (existsSync(inRepo)) return inRepo;
  }
  const deployed = join(homedir(), ".agenticros", "plugin-deploy", "openclaw.plugin.json");
  if (existsSync(deployed)) return deployed;
  return undefined;
}

/**
 * Read `contracts.tools` from the AgenticROS plugin manifest, or `undefined`
 * if we can't find / parse it. This is the canonical list the CLI uses when
 * stamping `tools.alsoAllow` in the OpenClaw config.
 */
export function readAgenticrosContractTools(installRoot?: string): string[] | undefined {
  const manifestPath = findAgenticrosPluginManifest(installRoot);
  if (!manifestPath) return undefined;
  try {
    const m = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      contracts?: { tools?: unknown };
    };
    const tools = m.contracts?.tools;
    if (!Array.isArray(tools)) return undefined;
    return tools.filter((t): t is string => typeof t === "string");
  } catch {
    return undefined;
  }
}

export interface AlsoAllowSyncResult {
  /** Tools that were already in `alsoAllow` before we ran. */
  preExisting: string[];
  /** Tools we appended this run (anything from `tools` that wasn't already allowed). */
  added: string[];
  /** Full `alsoAllow` after the update — useful for logging. */
  final: string[];
  /** True when the on-disk config was modified. */
  changed: boolean;
}

/**
 * Make sure every tool id in `tools` is reachable from the chat agent's tool
 * picker by appending missing entries to `cfg.tools.alsoAllow`.
 *
 * Why this exists: OpenClaw 2026.6+ ships a `tools.profile` ("coding",
 * "standard", …) that is a *strict* allowlist applied before plugin-registered
 * tools are merged in. Plugins like AgenticROS can register tools all day, but
 * the chat agent will never see them unless the user opts each one in via
 * `tools.alsoAllow`. The gateway logs this as "Browser is configured, but the
 * current tool profile does not include the browser tool…" for built-ins; for
 * plugin tools you instead just see the agent claim "I don't have those tools"
 * in chat. We keep the user out of that footgun by syncing `alsoAllow` to the
 * plugin's `contracts.tools` whenever the CLI knows the canonical list.
 *
 * Idempotent. Never removes entries (other plugins may have added their own).
 * Returns a result rather than mutating cfg in-place + writing, because
 * callers sometimes want to combine this with other config mutations and
 * write once at the end. This function still writes when run standalone
 * (when `write` is true, the default) so simple callers stay one-liners.
 */
export function ensureToolsAlsoAllow(
  tools: string[],
  opts: { write?: boolean; cfg?: Record<string, unknown> } = {},
): AlsoAllowSyncResult | undefined {
  const cfg = opts.cfg ?? readOpenclawConfig();
  if (!cfg) return undefined;
  const toolsBlock = asObject(cfg, "tools");
  const rawAlso = ensureStringArray(toolsBlock, "alsoAllow");
  const preExisting: string[] = rawAlso.filter((x): x is string => typeof x === "string");
  const added: string[] = [];
  for (const t of tools) {
    if (typeof t !== "string" || t.length === 0) continue;
    if (preExisting.includes(t) || added.includes(t)) continue;
    rawAlso.push(t);
    added.push(t);
  }
  const final = [...preExisting, ...added];
  const changed = added.length > 0;
  if (opts.write !== false && changed) writeOpenclawConfig(cfg);
  return { preExisting, added, final, changed };
}
