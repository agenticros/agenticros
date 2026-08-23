/**
 * `agenticros hive on|off|doctor|recipes` — optional fleet hive.
 *
 * Owners never type URLs, key_ids, or YAML. `on` writes config and joins
 * this robot (ARC uuid) to the org hive. Doctor speaks in one sentence.
 */

import { checkbox } from "@inquirer/prompts";
import {
  createHiveClient,
  DEFAULT_HIVE_URL,
  HIVE_RECIPE_CATALOG,
  HiveUnavailableError,
  mergeHiveConfig,
  parseConfig,
  type HiveRecipeId,
} from "@agenticros/core";

import { dim, err, header, info, ok, warn } from "../util/logger.js";
import { readConfigObject, writeConfigObject } from "../util/robot-config.js";
import { fetchCurrentOrg, getRobotId } from "../util/robot-cloud-config.js";

export interface HiveCommandOptions {
  action?: string;
}

function persistHive(patch: {
  enabled?: boolean;
  url?: string;
  identityId?: string;
  hiveId?: string;
  recipes?: { detect?: boolean; describe?: boolean; health?: boolean };
}): Record<string, unknown> {
  const next = mergeHiveConfig(readConfigObject(), patch);
  writeConfigObject(next);
  return next;
}

export async function hiveCommand(opts: HiveCommandOptions): Promise<number> {
  const action = (opts.action ?? "doctor").toLowerCase();
  switch (action) {
    case "on":
      return hiveOn();
    case "off":
      return hiveOff();
    case "doctor":
    case "status":
      return hiveDoctor();
    case "recipes":
      return hiveRecipes();
    default:
      err(`Unknown action '${opts.action}'. Use: on | off | doctor | recipes.`);
      return 2;
  }
}

async function hiveOn(): Promise<number> {
  header("Fleet hive");
  const robotId = getRobotId();
  const org = await fetchCurrentOrg();
  const hiveName = org?.id || "local-fleet";
  const raw = persistHive({
    enabled: true,
    url: hiveUrlFromRaw(readConfigObject()) ?? DEFAULT_HIVE_URL,
    identityId: robotId,
  });
  const config = parseConfig(raw);
  const client = createHiveClient(
    config,
    { identityId: robotId, hiveName },
    {
      persist: (ids): void => {
        persistHive({ identityId: ids.identityId, hiveId: ids.hiveId });
      },
    },
  );
  if (!client) {
    err("Could not enable fleet hive.");
    return 1;
  }
  try {
    const result = await client.ensure();
    ok(result.message);
    const cameraTopic = typeof config.robot?.cameraTopic === "string" ? config.robot.cameraTopic.trim() : "";
    if (cameraTopic && !config.hive?.recipes?.detect) {
      try {
        const started = await client.setRecipe("detect", true, {
          robotId,
          cameraTopic,
          namespace: config.robot?.namespace,
        });
        persistHive({ recipes: { detect: true } });
        ok(started.message);
      } catch {
        dim("Detect recipe not started yet — run agenticros hive recipes when Corebrum is ready.");
      }
    }
    if (org?.name) dim(`Organization: ${org.name}`);
    else dim("No cloud org — using a local fleet hive. Ask your admin or run agenticros login.");
    info("Pick what to watch: agenticros hive recipes");
    return 0;
  } catch (e) {
    const msg = e instanceof HiveUnavailableError ? e.ownerMessage : ownerError(e);
    warn(msg);
    dim("Fleet hive is on in config. Robot memory and driving still work.");
    if (msg.includes("not running")) {
      dim("Self-host: install from corebrum.com, then run `corebrum daemon` and `corebrum web`.");
      dim("Or enable fleet hive on the ARC Organization page (Teams hosting).");
    }
    return 1;
  }
}

function hiveOff(): number {
  persistHive({ enabled: false });
  ok("Fleet hive off. This robot's memory and driving are unchanged.");
  return 0;
}

async function hiveDoctor(): Promise<number> {
  header("Fleet hive doctor");
  const raw = readConfigObject();
  const config = parseConfig(raw);
  if (!config.hive?.enabled) {
    info("Fleet hive is off.");
    dim("Turn it on with `agenticros hive on` or Share with my fleet in the config UI.");
    return 0;
  }
  const robotId = config.hive.identityId || getRobotId();
  const org = await fetchCurrentOrg();
  const client = createHiveClient(config, {
    identityId: robotId,
    hiveName: org?.id || "local-fleet",
  });
  if (!client) {
    info("Fleet hive is off.");
    return 0;
  }
  try {
    const status = await client.status();
    if (status.reachable) {
      ok(status.message);
      return 0;
    }
    warn(status.message);
    dim("Self-host: brew install corebrum (or download from corebrum.com), then `corebrum daemon` + `corebrum web`.");
    dim("Teams: ask your org admin — ARC can host this.");
    return 1;
  } catch (e) {
    warn(ownerError(e));
    return 1;
  }
}

async function hiveRecipes(): Promise<number> {
  const raw = readConfigObject();
  const config = parseConfig(raw);
  if (!config.hive?.enabled) {
    warn("Fleet hive is off. Run `agenticros hive on` first.");
    return 1;
  }
  const robotId = config.hive.identityId || getRobotId();
  const org = await fetchCurrentOrg();
  const cameraTopic = typeof (config.robot as { cameraTopic?: string } | undefined)?.cameraTopic === "string"
    ? config.robot.cameraTopic
    : "";
  const hasCamera = cameraTopic.trim().length > 0;
  const current = config.hive.recipes ?? {};
  const choices = HIVE_RECIPE_CATALOG.map((r) => ({
    name: r.requiresCamera && !hasCamera ? `${r.label} (needs a camera)` : r.label,
    value: r.id,
    checked: !!current[r.id],
    disabled: r.requiresCamera && !hasCamera ? "needs a camera" : false,
  }));
  const selected = (await checkbox({
    message: "What should the fleet watch?",
    choices,
  })) as HiveRecipeId[];
  const selectedSet = new Set(selected);
  const client = createHiveClient(
    config,
    { identityId: robotId, hiveName: org?.id || "local-fleet" },
    {
      persistRecipes: (recipes): void => {
        persistHive({ recipes });
      },
    },
  );
  if (!client) {
    err("Fleet hive is off.");
    return 1;
  }
  try {
    for (const entry of HIVE_RECIPE_CATALOG) {
      const want = selectedSet.has(entry.id);
      if (want === !!current[entry.id]) continue;
      const result = await client.setRecipe(entry.id, want, {
        robotId,
        cameraTopic,
        namespace: config.robot?.namespace,
      });
      ok(result.message);
    }
    persistHive({
      recipes: {
        detect: selectedSet.has("detect"),
        describe: selectedSet.has("describe"),
        health: selectedSet.has("health"),
      },
    });
    return 0;
  } catch (e) {
    warn(ownerError(e));
    return 1;
  }
}

function hiveUrlFromRaw(raw: Record<string, unknown>): string | undefined {
  const hive = raw.hive;
  if (hive && typeof hive === "object" && !Array.isArray(hive)) {
    const url = (hive as { url?: unknown }).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return undefined;
}

function ownerError(e: unknown): string {
  if (e instanceof HiveUnavailableError) return e.ownerMessage;
  const msg = e instanceof Error ? e.message : String(e);
  if (/ECONNREFUSED|fetch failed|ENOTFOUND|aborted/i.test(msg)) return "Corebrum is not running.";
  if (/license|403|forbidden/i.test(msg)) return "Fleet memory needs a hive plan.";
  return "Fleet memory is not available yet.";
}
