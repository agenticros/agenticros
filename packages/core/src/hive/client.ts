import type { AgenticROSConfig } from "../config.js";
import { isDeniedActuationTopic, taskDefinitionMentionsActuation } from "./deny.js";
import { makeHiveEvent } from "./event.js";
import {
  DEFAULT_HIVE_URL,
  HIVE_RECIPE_CATALOG,
  HIVE_RECIPE_IDS,
  HiveUnavailableError,
  type HiveClient,
  type HiveEnableResult,
  type HiveMemoryItem,
  type HiveRecipeId,
  type HiveRecipeResult,
  type HiveStatus,
} from "./types.js";

const RECIPE_TEMPLATE_BASE = "https://corebrum.com/recipes";
const RECIPE_TASK_PREFIX = "agenticros/recipe/";

export interface HiveClientHooks {
  /** Injected fetch for tests. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Persist created identity/hive ids back to config (CLI / hive_enable). */
  persist?: (patch: { identityId?: string; hiveId?: string }) => void | Promise<void>;
  /** Persist recipe on/off after a successful setRecipe. */
  persistRecipes?: (
    recipes: { detect?: boolean; describe?: boolean; health?: boolean },
  ) => void | Promise<void>;
}

export interface HiveClientOverrides {
  url?: string;
  identityId?: string;
  hiveId?: string;
  /** Used to find or create a hive when hiveId is unset. */
  hiveName?: string;
}

type FetchFn = typeof fetch;

export class HiveHttpClient implements HiveClient {
  readonly url: string;
  private identityId: string | undefined;
  private hiveId: string | undefined;
  private readonly hiveName: string;
  private readonly robotId: string;
  private readonly recipes: { detect: boolean; describe: boolean; health: boolean };
  private readonly fetchFn: FetchFn;
  private readonly persist?: HiveClientHooks["persist"];
  private readonly persistRecipes?: HiveClientHooks["persistRecipes"];
  private ensured = false;

  constructor(config: AgenticROSConfig, overrides: HiveClientOverrides = {}, hooks: HiveClientHooks = {}) {
    this.url = stripTrailingSlash(overrides.url ?? config.hive?.url ?? DEFAULT_HIVE_URL);
    this.identityId = overrides.identityId ?? config.hive?.identityId;
    this.hiveId = overrides.hiveId ?? config.hive?.hiveId;
    this.hiveName = overrides.hiveName ?? config.hive?.hiveId ?? "local-fleet";
    this.robotId = this.identityId ?? "local";
    this.recipes = {
      detect: !!config.hive?.recipes?.detect,
      describe: !!config.hive?.recipes?.describe,
      health: !!config.hive?.recipes?.health,
    };
    this.fetchFn = hooks.fetch ?? fetch;
    this.persist = hooks.persist;
    this.persistRecipes = hooks.persistRecipes;
  }

  async ensure(): Promise<HiveEnableResult> {
    const identityId = await this.ensureIdentity();
    const hiveId = await this.ensureHive(identityId);
    await this.joinHive(hiveId, identityId);
    this.identityId = identityId;
    this.hiveId = hiveId;
    this.ensured = true;
    await this.persist?.({ identityId, hiveId });
    return {
      enabled: true,
      identityId,
      hiveId,
      message: "Fleet memory on.",
    };
  }

  async remember(
    content: string,
    opts?: { key?: string; tags?: string[]; path?: string },
  ): Promise<{ key: string }> {
    const { identityId, hiveId } = await this.requireJoin();
    const key = opts?.key?.trim() || `notes/${Date.now()}-${slug(content)}`;
    const event = makeHiveEvent({
      robotId: this.robotId,
      kind: "note",
      topic: "hive/notes",
      payload: {
        content,
        tags: opts?.tags,
        path: opts?.path,
      },
    });
    await this.request("PUT", `/api/hives/${enc(hiveId)}/memory/${enc(key)}?key_id=${enc(identityId)}`, {
      value: event,
      memory_type: "durable",
    });
    return { key };
  }

  async recall(query?: string, limit = 20): Promise<HiveMemoryItem[]> {
    const { identityId, hiveId } = await this.requireJoin();
    const data = await this.request("GET", `/api/hives/${enc(hiveId)}/memory?key_id=${enc(identityId)}`);
    const items = parseMemoryItems(data);
    const q = (query ?? "").trim().toLowerCase();
    const filtered = q
      ? items.filter((item) => JSON.stringify(item.value).toLowerCase().includes(q) || item.key.toLowerCase().includes(q))
      : items;
    return filtered.slice(0, Math.max(1, limit));
  }

  async forget(key?: string, query?: string): Promise<{ removed: number }> {
    const { identityId, hiveId } = await this.requireJoin();
    if (key?.trim()) {
      await this.request(
        "DELETE",
        `/api/hives/${enc(hiveId)}/memory/${enc(key.trim())}?key_id=${enc(identityId)}`,
      );
      return { removed: 1 };
    }
    const items = await this.recall(query, 500);
    let removed = 0;
    for (const item of items) {
      await this.request("DELETE", `/api/hives/${enc(hiveId)}/memory/${enc(item.key)}?key_id=${enc(identityId)}`);
      removed += 1;
    }
    return { removed };
  }

  async status(): Promise<HiveStatus> {
    const reachable = await this.ping();
    const recipeRows = HIVE_RECIPE_IDS.map((id) => ({
      id,
      label: HIVE_RECIPE_CATALOG.find((r) => r.id === id)?.label ?? id,
      on: this.recipes[id],
    }));
    if (!reachable) {
      return {
        enabled: true,
        reachable: false,
        message: "Corebrum is not running.",
        url: this.url,
        identityId: this.identityId,
        hiveId: this.hiveId,
        recipes: recipeRows,
      };
    }
    try {
      const { identityId, hiveId } = await this.requireJoin();
      const hive = await this.request("GET", `/api/hives/${enc(hiveId)}`);
      const memories = await this.request("GET", `/api/hives/${enc(hiveId)}/memory?key_id=${enc(identityId)}`);
      const items = parseMemoryItems(memories);
      const running = recipeRows.filter((r) => r.on).map((r) => r.label);
      const memberCount =
        typeof hive.member_count === "number" ? hive.member_count : undefined;
      const sharing =
        memberCount && memberCount > 0 ? ` ${memberCount} robots sharing.` : "";
      const recipeBit = running.length > 0 ? ` ${running.join("; ")}.` : "";
      return {
        enabled: true,
        reachable: true,
        message: `Fleet memory on.${sharing}${recipeBit}`,
        url: this.url,
        identityId,
        hiveId,
        hiveName: typeof hive.name === "string" ? hive.name : undefined,
        memberCount,
        recordCount: items.length,
        recipes: recipeRows,
      };
    } catch (err) {
      if (err instanceof HiveUnavailableError) {
        return {
          enabled: true,
          reachable: true,
          message: err.ownerMessage,
          url: this.url,
          identityId: this.identityId,
          hiveId: this.hiveId,
          recipes: recipeRows,
        };
      }
      throw err;
    }
  }

  async setRecipe(
    id: HiveRecipeId,
    on: boolean,
    bindings?: { robotId?: string; cameraTopic?: string; namespace?: string },
  ): Promise<HiveRecipeResult> {
    if (!HIVE_RECIPE_IDS.includes(id)) {
      throw new HiveUnavailableError(`Unknown recipe "${id}". Use detect, describe, or health.`);
    }
    const label = HIVE_RECIPE_CATALOG.find((r) => r.id === id)?.label ?? id;
    const { identityId, hiveId } = await this.requireJoin();
    const recipeKey = `${RECIPE_TASK_PREFIX}${id}`;

    if (!on) {
      const existing = await this.readRecipeTaskId(identityId, hiveId, recipeKey);
      if (existing) {
        await this.request("POST", `/api/cancel/${enc(existing)}`).catch(() => undefined);
      }
      await this.request(
        "DELETE",
        `/api/hives/${enc(hiveId)}/memory/${enc(recipeKey)}?key_id=${enc(identityId)}`,
      ).catch(() => undefined);
      this.recipes[id] = false;
      await this.persistRecipes?.({ ...this.recipes });
      return { id, on: false, label, message: `Stopped: ${label}.` };
    }

    const input = {
      recipe: id,
      robot_id: bindings?.robotId ?? this.robotId,
      camera_topic: bindings?.cameraTopic ?? "",
      namespace: bindings?.namespace ?? "",
    };
    if (isDeniedActuationTopic(input.camera_topic)) {
      throw new HiveUnavailableError("Hive recipes cannot target drive topics.");
    }

    let taskId: string | undefined;
    const v2 = await this.tryRecipesApi(id, { on: true, ...input, identity_id: identityId });
    if (v2) {
      taskId = v2;
    } else {
      const file = `${RECIPE_TEMPLATE_BASE}/agenticros-${id}.yaml`;
      const submitted = await this.request("POST", "/api/submit", {
        file,
        input: JSON.stringify(input),
        identity_id: identityId,
        capability: "python",
      });
      if (taskDefinitionMentionsActuation(submitted)) {
        throw new HiveUnavailableError("Hive recipes cannot include actuation.");
      }
      taskId = typeof submitted.task_id === "string" ? submitted.task_id : undefined;
    }

    await this.request("PUT", `/api/hives/${enc(hiveId)}/memory/${enc(recipeKey)}?key_id=${enc(identityId)}`, {
      value: makeHiveEvent({
        robotId: this.robotId,
        kind: id === "detect" ? "detection" : id === "describe" ? "caption" : "health",
        topic: recipeKey,
        payload: { ...input, task_id: taskId, on: true },
      }),
      memory_type: "durable",
    });
    this.recipes[id] = true;
    await this.persistRecipes?.({ ...this.recipes });
    return {
      id,
      on: true,
      label,
      taskId,
      message: `Watching: ${label}.`,
    };
  }

  private async tryRecipesApi(id: HiveRecipeId, body: Record<string, unknown>): Promise<string | undefined> {
    try {
      const data = await this.request("POST", `/api/recipes/${enc(id)}`, body);
      if (typeof data.task_id === "string") return data.task_id;
      return typeof data.id === "string" ? data.id : "ok";
    } catch (err) {
      if (err instanceof HiveUnavailableError && /not found|404/i.test(err.ownerMessage)) {
        return undefined;
      }
      // 404 from missing v2 route — fall back to submit
      if (err instanceof HiveHttpError && err.status === 404) return undefined;
      throw err;
    }
  }

  private async readRecipeTaskId(identityId: string, hiveId: string, recipeKey: string): Promise<string | undefined> {
    try {
      const data = await this.request(
        "GET",
        `/api/hives/${enc(hiveId)}/memory/${enc(recipeKey)}?key_id=${enc(identityId)}`,
      );
      const value = data.value ?? data;
      const payload =
        value && typeof value === "object" && "payload" in value
          ? (value as { payload?: { task_id?: unknown } }).payload
          : undefined;
      return typeof payload?.task_id === "string" ? payload.task_id : undefined;
    } catch {
      return undefined;
    }
  }

  private async requireJoin(): Promise<{ identityId: string; hiveId: string }> {
    if (!this.ensured || !this.identityId || !this.hiveId) {
      await this.ensure();
    }
    return { identityId: this.identityId!, hiveId: this.hiveId! };
  }

  private async ensureIdentity(): Promise<string> {
    const wanted = this.identityId?.trim();
    if (wanted) {
      const existing = await this.findIdentity(wanted);
      if (existing) return existing;
      const created = await this.request("POST", "/api/identity", {
        key_id: wanted,
        set_as_default: false,
      });
      if (typeof created.key_id === "string") return created.key_id;
      return wanted;
    }
    const created = await this.request("POST", "/api/identity", { set_as_default: false });
    if (typeof created.key_id !== "string" || !created.key_id) {
      throw new HiveUnavailableError("Fleet memory is not available yet.");
    }
    return created.key_id;
  }

  private async findIdentity(keyId: string): Promise<string | undefined> {
    try {
      const list = await this.request("GET", "/api/identity");
      const rows = Array.isArray(list) ? list : Array.isArray(list.identities) ? list.identities : [];
      for (const row of rows) {
        if (row && typeof row === "object" && (row as { key_id?: string }).key_id === keyId) {
          return keyId;
        }
      }
    } catch {
      // list can fail on a fresh install — create instead
    }
    return undefined;
  }

  private async ensureHive(identityId: string): Promise<string> {
    if (this.hiveId?.trim()) {
      try {
        await this.request("GET", `/api/hives/${enc(this.hiveId.trim())}`);
        return this.hiveId.trim();
      } catch (err) {
        if (!(err instanceof HiveHttpError && err.status === 404)) throw err;
      }
    }
    const listed = await this.request("GET", `/api/hives?key_id=${enc(identityId)}`);
    const hives = Array.isArray(listed.hives) ? listed.hives : [];
    const named = hives.find(
      (h) => h && typeof h === "object" && (h as { name?: string }).name === this.hiveName,
    ) as { hive_id?: string } | undefined;
    if (named?.hive_id) return named.hive_id;
    const created = await this.request("POST", `/api/hives?key_id=${enc(identityId)}`, {
      name: this.hiveName,
      description: "AgenticROS fleet hive",
    });
    if (typeof created.hive_id !== "string" || !created.hive_id) {
      throw new HiveUnavailableError("Fleet memory is not available yet.");
    }
    return created.hive_id;
  }

  private async joinHive(hiveId: string, identityId: string): Promise<void> {
    await this.request("PUT", `/api/hives/${enc(hiveId)}/members/${enc(identityId)}`);
  }

  private async ping(): Promise<boolean> {
    try {
      const res = await this.fetchFn(`${this.url}/api/compute-capacity`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(2500),
      });
      return res.ok || res.status === 401 || res.status === 403;
    } catch {
      try {
        const res = await this.fetchFn(`${this.url}/api/identity`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(2500),
        });
        return res.ok || res.status === 401 || res.status === 403;
      } catch {
        return false;
      }
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.url}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new HiveUnavailableError("Corebrum is not running.", err);
    }
    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        data = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { identities: parsed, value: parsed };
        if (Array.isArray(parsed)) {
          data = { identities: parsed };
        }
      } catch {
        data = { message: text };
      }
    }
    if (!res.ok) {
      throw mapHttpError(res.status, data, text);
    }
    return data;
  }
}

class HiveHttpError extends HiveUnavailableError {
  readonly status: number;
  constructor(status: number, ownerMessage: string) {
    super(ownerMessage);
    this.status = status;
    this.name = "HiveHttpError";
  }
}

function mapHttpError(status: number, data: Record<string, unknown>, text: string): HiveUnavailableError {
  const raw = String(data.error ?? data.message ?? text ?? "");
  if (status === 403 || /license|feature|plan|forbidden/i.test(raw)) {
    return new HiveHttpError(status, "Fleet memory needs a hive plan.");
  }
  if (status === 404) {
    return new HiveHttpError(status, raw || "not found");
  }
  return new HiveHttpError(status, "Fleet memory is not available yet.");
}

function parseMemoryItems(data: Record<string, unknown>): HiveMemoryItem[] {
  const items = data.items;
  if (Array.isArray(items)) {
    return items
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as { key?: unknown; value?: unknown };
        return typeof r.key === "string" ? { key: r.key, value: r.value } : null;
      })
      .filter((x): x is HiveMemoryItem => x !== null);
  }
  const keys = data.keys;
  if (Array.isArray(keys)) {
    return keys.filter((k): k is string => typeof k === "string").map((key) => ({ key, value: undefined }));
  }
  return [];
}

function slug(content: string): string {
  const s = content
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return s || "note";
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
