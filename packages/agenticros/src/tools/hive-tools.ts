import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi, ToolContent } from "../plugin-api.js";
import type { AgenticROSConfig, HiveRecipeId } from "@agenticros/core";
import { HIVE_RECIPE_IDS, HiveUnavailableError, createHiveClient } from "@agenticros/core";
import { getHive, persistHivePatch, setHive } from "../hive.js";

/**
 * Register hive tools only when hive is enabled and the client initialized.
 */
export function registerHiveTools(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  api.registerTool({
    name: "hive_remember",
    label: "Fleet hive: remember",
    description:
      "Store a fact for the whole fleet (every robot in this org). Use when the user says \"tell the other robots\", \"remember this for the fleet\", or shares a site-wide note. For facts that belong only to THIS robot, use memory_remember instead.",
    parameters: Type.Object({
      content: Type.String({ description: "The fleet fact, written as a self-contained sentence." }),
      tags: Type.Optional(Type.Array(Type.String(), { description: "Optional tags." })),
    }),
    async execute(_id, params) {
      const hive = getHive();
      if (!hive) return hiveDisabled();
      const content = String((params as { content?: unknown }).content ?? "").trim();
      if (!content) return errResult("hive_remember requires 'content'.");
      try {
        const tags = Array.isArray((params as { tags?: unknown }).tags)
          ? ((params as { tags: unknown[] }).tags).map(String)
          : undefined;
        const result = await hive.remember(content, { tags });
        return okResult({ success: true, ...result });
      } catch (err) {
        return errResult(ownerMessage(err));
      }
    },
  });

  api.registerTool({
    name: "hive_recall",
    label: "Fleet hive: recall",
    description:
      "Search fleet memory — what other robots have seen or been told. Use when the user asks \"what did the other robot see?\" or \"what does the fleet know about ...?\". For this robot only, use memory_recall.",
    parameters: Type.Object({
      query: Type.String({ description: "Free-text query." }),
      limit: Type.Optional(Type.Number({ description: "Max matches (default 10)." })),
    }),
    async execute(_id, params) {
      const hive = getHive();
      if (!hive) return hiveDisabled();
      const query = String((params as { query?: unknown }).query ?? "").trim();
      try {
        const limit = typeof (params as { limit?: unknown }).limit === "number"
          ? (params as { limit: number }).limit
          : 10;
        const results = await hive.recall(query || undefined, limit);
        return okResult({ success: true, count: results.length, results });
      } catch (err) {
        return errResult(ownerMessage(err));
      }
    },
  });

  api.registerTool({
    name: "hive_forget",
    label: "Fleet hive: forget",
    description: "Delete a fleet fact by key or query. Irreversible.",
    parameters: Type.Object({
      key: Type.Optional(Type.String({ description: "Key returned by hive_remember." })),
      query: Type.Optional(Type.String({ description: "Delete matching fleet facts." })),
    }),
    async execute(_id, params) {
      const hive = getHive();
      if (!hive) return hiveDisabled();
      try {
        const result = await hive.forget(
          typeof (params as { key?: unknown }).key === "string" ? (params as { key: string }).key : undefined,
          typeof (params as { query?: unknown }).query === "string" ? (params as { query: string }).query : undefined,
        );
        return okResult({ success: true, ...result });
      } catch (err) {
        return errResult(ownerMessage(err));
      }
    },
  });

  api.registerTool({
    name: "hive_status",
    label: "Fleet hive: status",
    description:
      "Plain-language fleet hive status: on/off, reachable, running recipes. Never ask the owner for URLs or key ids.",
    parameters: Type.Object({}),
    async execute() {
      const hive = getHive();
      if (!hive) return hiveDisabled();
      try {
        const status = await hive.status();
        return okResult({ success: true, ...status });
      } catch (err) {
        return errResult(ownerMessage(err));
      }
    },
  });

  api.registerTool({
    name: "hive_enable",
    label: "Fleet hive: enable",
    description:
      "Turn on fleet hive for this robot. Call when the user says \"turn on fleet memory\" or \"share with my fleet\". Do not ask for URLs or key ids.",
    parameters: Type.Object({}),
    async execute() {
      try {
        const next = persistHivePatch({ enabled: true });
        const hive =
          getHive() ??
          createHiveClient(next, {}, {
            persist: (ids) => {
              persistHivePatch({ identityId: ids.identityId, hiveId: ids.hiveId });
            },
          });
        if (!hive) return hiveDisabled();
        setHive(hive);
        const result = await hive.ensure();
        return okResult({ success: true, ...result });
      } catch (err) {
        return errResult(ownerMessage(err));
      }
    },
  });

  api.registerTool({
    name: "hive_set_recipe",
    label: "Fleet hive: set recipe",
    description:
      "Start or stop a named fleet recipe. ids: detect (watch cameras for objects), describe (captions), health (battery / robot_info). Never submit YAML. Use when the user says \"watch every camera\", \"detect people\", or \"stop watching\".",
    parameters: Type.Object({
      id: Type.String({ description: "Recipe id: detect | describe | health" }),
      on: Type.Boolean({ description: "true to start, false to stop." }),
    }),
    async execute(_id, params) {
      const hive = getHive();
      if (!hive) return hiveDisabled();
      const id = String((params as { id?: unknown }).id ?? "").trim() as HiveRecipeId;
      if (!HIVE_RECIPE_IDS.includes(id)) {
        return errResult("Unknown recipe. Use detect, describe, or health.");
      }
      const on = (params as { on?: unknown }).on !== false;
      try {
        const result = await hive.setRecipe(id, on, {
          cameraTopic: config.robot?.cameraTopic,
          namespace: config.robot?.namespace,
        });
        persistHivePatch({ recipes: { [id]: on } });
        return okResult({ success: true, ...result });
      } catch (err) {
        return errResult(ownerMessage(err));
      }
    },
  });
}

function hiveDisabled() {
  return errResult(
    "Fleet hive is off. Run `agenticros hive on` or flip Share with my fleet in the config UI. See docs/hive.md.",
  );
}

function ownerMessage(err: unknown): string {
  if (err instanceof HiveUnavailableError) return err.ownerMessage;
  const msg = err instanceof Error ? err.message : String(err);
  if (/ECONNREFUSED|fetch failed|ENOTFOUND/i.test(msg)) return "Corebrum is not running.";
  if (/license|403|forbidden/i.test(msg)) return "Fleet memory needs a hive plan.";
  return "Fleet memory is not available yet.";
}

function okResult(value: unknown) {
  const text = JSON.stringify(value);
  return { content: [{ type: "text" as const, text }], details: value };
}

function errResult(text: string) {
  const content: ToolContent[] = [{ type: "text", text }];
  return { content, details: { error: text } };
}
