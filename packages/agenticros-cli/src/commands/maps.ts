/**
 * `agenticros maps` — name, switch, and delete room maps on this robot.
 *
 *   agenticros maps list [--json]
 *   agenticros maps create --label Kitchen [--start] [--json]
 *   agenticros maps rename <id> --label "Living Room" [--json]
 *   agenticros maps use <id> [--json]
 *   agenticros maps delete <id> [--yes] [--json]
 */

import { existsSync } from "node:fs";

import { confirm } from "@inquirer/prompts";

import {
  createMap,
  deleteMap,
  findMap,
  loadCatalog,
  publicCatalog,
  renameMap,
  setActiveMap,
  type PublicMapCatalog,
  type RobotMap,
} from "@agenticros/core";

import { startMappingCommand, stopMappingCommand } from "./robot-hw.js";
import { err, info, isTty, ok } from "../util/logger.js";

export interface MapsOptions {
  action?: string;
  target?: string;
  label?: string;
  start?: boolean;
  yes?: boolean;
  json?: boolean;
}

function emit(catalog: PublicMapCatalog, asJson: boolean, message?: string): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(catalog)}\n`);
    return;
  }
  if (message) ok(message);
}

function printList(catalog: PublicMapCatalog): void {
  if (catalog.maps.length === 0) {
    info("No maps yet. Run `agenticros start mapping` or `agenticros maps create --label Kitchen --start`.");
    return;
  }
  for (const map of catalog.maps) {
    const mark = map.active ? "*" : " ";
    process.stdout.write(`  ${mark}  ${map.label}  ${map.id}${map.active ? "  active" : ""}\n`);
  }
}

function requireTarget(action: string, target?: string): string {
  const id = target?.trim() ?? "";
  if (!id) {
    err(`maps ${action} requires a map id (see \`agenticros maps list\`).`);
    process.exit(2);
  }
  return id;
}

function requireLabel(label?: string): string {
  const value = label?.trim() ?? "";
  if (!value) {
    err("Pass --label <name> (1–40 characters: letters, numbers, spaces, . _ -).");
    process.exit(2);
  }
  return value;
}

export async function mapsCommand(opts: MapsOptions): Promise<void> {
  const action = (opts.action ?? "list").trim().toLowerCase();
  const asJson = opts.json === true;

  try {
    switch (action) {
      case "list":
      case "ls": {
        const catalog = publicCatalog();
        if (asJson) emit(catalog, true);
        else printList(catalog);
        return;
      }
      case "create": {
        const label = requireLabel(opts.label);
        const map = createMap(label);
        if (opts.start) {
          await startMappingCommand({
            map,
            keep: existsSync(map.databasePath),
            localize: false,
            quiet: asJson,
          });
        }
        emit(publicCatalog(), asJson, `Created map "${map.label}"${opts.start ? " and started mapping" : ""}.`);
        return;
      }
      case "rename": {
        const id = requireTarget("rename", opts.target);
        const label = requireLabel(opts.label);
        const map = renameMap(id, label);
        emit(publicCatalog(), asJson, `Renamed map to "${map.label}".`);
        return;
      }
      case "use": {
        const id = requireTarget("use", opts.target);
        const map = setActiveMap(id);
        await startMappingCommand({ map, keep: true, localize: true, quiet: asJson });
        emit(publicCatalog(), asJson, `Using "${map.label}". Localization stack starting.`);
        return;
      }
      case "delete": {
        const id = requireTarget("delete", opts.target);
        const catalog = loadCatalog();
        const map: RobotMap | undefined = findMap(catalog, id);
        if (!map) {
          err(`No map named "${id}".`);
          process.exit(1);
        }
        if (!opts.yes) {
          if (!isTty) {
            err("Refusing to delete without --yes when stdin is not a terminal.");
            process.exit(2);
          }
          const confirmed = await confirm({
            message: `Delete map "${map.label}"? Places saved on it are removed. This cannot be undone.`,
            default: false,
          });
          if (!confirmed) {
            info("Delete cancelled.");
            return;
          }
        }
        // Stop whenever this is the live room. pgrep on the launch file misses
        // an orphaned rtabmap node, which keeps publishing the grid from memory
        // after the database file is gone.
        if (catalog.activeId === map.id) {
          await stopMappingCommand({ quiet: asJson });
        }
        const next = deleteMap(map.id);
        emit(next, asJson, `Deleted map "${map.label}".`);
        return;
      }
      default:
        err(`Unknown maps action '${opts.action}'.`);
        err("Use: list | create | rename | use | delete");
        process.exit(2);
    }
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
