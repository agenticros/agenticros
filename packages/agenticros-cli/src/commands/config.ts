/**
 * `agenticros config [action] [key=value]` - read or edit ~/.agenticros/config.json.
 *
 * Actions:
 *   show    pretty-print the current config (default)
 *   set     `agenticros config set robot.namespace=sim_robot`
 *   edit    open in $EDITOR (or vi)
 *   reset   delete the file (after confirm)
 *
 * Validation: when @agenticros/core's Zod schema is available we validate after
 * write. Phase 1 ships the looser, defensive version; the schema is layered in
 * as a follow-up once tsup config is finalised so we don't pull all of core's
 * native deps into the published bundle yet.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { confirm } from "@inquirer/prompts";
import { execa } from "execa";

import { getCliPaths } from "../util/paths.js";
import { header, info, ok, warn, err } from "../util/logger.js";

export interface ConfigOptions {
  action?: string;
  keyValue?: string;
}

function configPath(): string {
  return join(getCliPaths().userDataDir, "config.json");
}

export async function configCommand(opts: ConfigOptions): Promise<void> {
  const action = (opts.action ?? "show").toLowerCase();

  switch (action) {
    case "show":
      return showConfig();
    case "set":
      return setConfig(opts.keyValue);
    case "edit":
      return editConfig();
    case "reset":
      return resetConfig();
    default:
      err(`Unknown action '${opts.action}'. Use: show | set | edit | reset.`);
      process.exit(2);
  }
}

function showConfig(): void {
  const p = configPath();
  header(`AgenticROS config (${p})`);
  if (!existsSync(p)) {
    warn("Config file does not exist yet. Run `agenticros init` to create it.");
    return;
  }
  try {
    const raw = readFileSync(p, "utf8");
    process.stdout.write(`${raw}\n`);
  } catch (e) {
    err(`Failed to read config: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function setConfig(kv: string | undefined): void {
  if (!kv || !kv.includes("=")) {
    err("Usage: agenticros config set <key>=<value> (e.g. robot.namespace=sim_robot)");
    process.exit(2);
  }
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  const obj: Record<string, unknown> = existsSync(p) ? safeReadJson(p) ?? {} : {};
  const eq = kv.indexOf("=");
  const key = kv.slice(0, eq).trim();
  const valueRaw = kv.slice(eq + 1).trim();
  const value = parseScalar(valueRaw);
  setByPath(obj, key.split("."), value);
  writeFileSync(p, JSON.stringify(obj, null, 2));
  ok(`Wrote ${key} = ${JSON.stringify(value)} to ${p}.`);
}

async function editConfig(): Promise<void> {
  const p = configPath();
  if (!existsSync(p)) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "{}\n");
    info(`Created empty config at ${p}.`);
  }
  const editor = process.env["EDITOR"] ?? "vi";
  try {
    await execa(editor, [p], { stdio: "inherit" });
  } catch (e) {
    err(`Editor exited with error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function resetConfig(): Promise<void> {
  const p = configPath();
  if (!existsSync(p)) {
    info("Nothing to reset (config file does not exist).");
    return;
  }
  const yes = await confirm({ message: `Delete ${p}?`, default: false });
  if (!yes) return;
  unlinkSync(p);
  ok("Deleted.");
}

function safeReadJson(path: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
    return undefined;
  } catch {
    return undefined;
  }
}

function setByPath(obj: Record<string, unknown>, keys: string[], value: unknown): void {
  let cursor: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    const next = cursor[k];
    if (next && typeof next === "object" && !Array.isArray(next)) {
      cursor = next as Record<string, unknown>;
    } else {
      const newObj: Record<string, unknown> = {};
      cursor[k] = newObj;
      cursor = newObj;
    }
  }
  cursor[keys[keys.length - 1]!] = value;
}

function parseScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d*\.\d+$/.test(raw)) return Number(raw);
  // Strip surrounding quotes if present.
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}
