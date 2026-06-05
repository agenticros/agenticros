import { homedir } from "node:os";
import path from "node:path";

import type {
  ForgetInput,
  MemoryProvider,
  MemoryRecord,
  MemoryStatus,
  RecallInput,
  RememberInput,
} from "../types.js";

/**
 * Configuration shape for a single mem0 sub-component (embedder / vectorStore / llm).
 * Passed through verbatim to `new Memory({ ... })`.
 */
export interface Mem0ComponentConfig {
  provider: string;
  config: Record<string, unknown>;
}

export interface Mem0BackendConfig {
  /** When true, mem0 runs its LLM-driven fact extraction on `add`. Default false (raw store). */
  inferOnWrite: boolean;
  /** SQLite history db path (passed to mem0 as `historyDbPath`). */
  historyDbPath: string;
  embedder?: Mem0ComponentConfig;
  vectorStore?: Mem0ComponentConfig;
  llm?: Mem0ComponentConfig;
}

/**
 * Thin adapter over `mem0ai/oss`'s Memory class.
 *
 * The actual `mem0ai` module is loaded once via the factory's dynamic import
 * and passed into the constructor here. That keeps the optional peer dep out
 * of the load path for users on `backend: "local"`.
 */
export class Mem0MemoryProvider implements MemoryProvider {
  readonly backend = "mem0" as const;
  private readonly memory: any;
  private readonly inferOnWrite: boolean;
  private readonly embedderInfo: { provider: string; model?: string } | undefined;
  // mem0's search returns score + metadata.createdAt; we'll mirror those into MemoryRecord.

  constructor(args: {
    memory: any;
    inferOnWrite: boolean;
    embedder?: Mem0ComponentConfig;
  }) {
    this.memory = args.memory;
    this.inferOnWrite = args.inferOnWrite;
    this.embedderInfo = args.embedder
      ? {
          provider: args.embedder.provider,
          model:
            typeof args.embedder.config?.model === "string"
              ? (args.embedder.config.model as string)
              : undefined,
        }
      : undefined;
  }

  async remember(input: RememberInput): Promise<MemoryRecord> {
    const namespace = requireNamespace(input.namespace);
    const metadata: Record<string, unknown> = {};
    if (input.tags && input.tags.length > 0) metadata.tags = input.tags;
    if (input.path) metadata.path = input.path;
    metadata.createdAt = Date.now();

    const result = await this.memory.add(input.content, {
      userId: namespace,
      metadata,
      infer: this.inferOnWrite,
    });

    const persistedId = extractFirstId(result);
    return {
      id: persistedId ?? `mem0:${metadata.createdAt}`,
      content: input.content,
      namespace,
      tags: input.tags,
      path: input.path,
      createdAt: metadata.createdAt as number,
    };
  }

  async recall(input: RecallInput): Promise<MemoryRecord[]> {
    const namespace = requireNamespace(input.namespace);
    const limit = input.limit ?? 10;
    // mem0ai v3+ rejects top-level `userId` in search() — the user identifier
    // must go through `filters.user_id` (snake_case).
    const search = await this.memory.search(input.query, {
      filters: { user_id: namespace },
      limit,
    });
    const hits = normalizeHits(search);
    return hits.map((h) => toRecord(h, namespace));
  }

  async forget(input: ForgetInput): Promise<{ removed: number }> {
    if (input.id !== undefined) {
      await this.memory.delete(input.id);
      return { removed: 1 };
    }
    const namespace = requireNamespace(input.namespace);
    if (input.query !== undefined) {
      const hits = normalizeHits(
        await this.memory.search(input.query, {
          filters: { user_id: namespace },
          limit: 100,
        }),
      );
      let removed = 0;
      for (const h of hits) {
        if (h.id) {
          await this.memory.delete(h.id);
          removed += 1;
        }
      }
      return { removed };
    }
    // We deliberately don't call `memory.deleteAll(...)` here: mem0's deleteAll
    // signature has shifted across major versions (v2 wanted `{ userId }`, v3
    // requires its own filter dialect and rejects some calls outright). The
    // enumerate-and-delete fallback is slightly slower but works on every
    // version and returns an accurate count.
    const all = normalizeHits(
      typeof this.memory.getAll === "function"
        ? await this.memory.getAll({ filters: { user_id: namespace }, limit: 1000 })
        : [],
    );
    let removed = 0;
    for (const h of all) {
      if (h.id) {
        await this.memory.delete(h.id);
        removed += 1;
      }
    }
    return { removed };
  }

  async status(namespace: string): Promise<MemoryStatus> {
    let records: any[] = [];
    if (typeof this.memory.getAll === "function") {
      try {
        records = normalizeHits(
          await this.memory.getAll({ filters: { user_id: namespace }, limit: 1000 }),
        );
      } catch {
        records = [];
      }
    }
    const lastWriteAt =
      records.length === 0
        ? null
        : records.reduce<number>((acc, r) => {
            const ts = readCreatedAt(r);
            return ts > acc ? ts : acc;
          }, 0) || null;
    return {
      enabled: true,
      backend: "mem0",
      namespace,
      recordCount: records.length,
      lastWriteAt,
      embedder: this.embedderInfo,
    };
  }

  async recent(namespace: string, limit = 5): Promise<MemoryRecord[]> {
    if (typeof this.memory.getAll !== "function") return [];
    let raw: any;
    try {
      raw = await this.memory.getAll({ filters: { user_id: namespace }, limit: 1000 });
    } catch {
      return [];
    }
    const hits = normalizeHits(raw);
    return hits
      .slice()
      .sort((a, b) => readCreatedAt(b) - readCreatedAt(a))
      .slice(0, Math.max(0, limit))
      .map((h) => toRecord(h, namespace));
  }
}

/**
 * Build a Mem0MemoryProvider. Loads `mem0ai/oss` dynamically so users on the
 * `local` backend never pay for it. Applies smart-defaults for the embedder
 * when the user has not configured one explicitly.
 */
export async function createMem0Provider(args: {
  config: Mem0BackendConfig;
}): Promise<Mem0MemoryProvider> {
  const { config } = args;
  let MemoryCtor: any;
  try {
    // mem0ai is an optional peer dependency — resolved at runtime, never
    // installed unless the user opts into backend: "mem0".
    // @ts-ignore: optional peer dep not declared in this package's deps
    const mod: any = await import("mem0ai/oss");
    MemoryCtor = mod.Memory ?? mod.default?.Memory;
  } catch {
    throw new Error(
      'memory: backend "mem0" requires the "mem0ai" package. Install with: pnpm add mem0ai',
    );
  }
  if (!MemoryCtor) {
    throw new Error(
      'memory: failed to find Memory class in "mem0ai/oss" (incompatible version?)',
    );
  }

  const embedder = config.embedder ?? (await detectEmbedder());
  const memoryConfig: Record<string, unknown> = {
    historyDbPath: expandHome(config.historyDbPath),
  };
  if (embedder) memoryConfig.embedder = embedder;
  if (config.vectorStore) memoryConfig.vectorStore = config.vectorStore;
  if (config.llm) memoryConfig.llm = config.llm;

  const memory = new MemoryCtor(memoryConfig);
  return new Mem0MemoryProvider({
    memory,
    inferOnWrite: config.inferOnWrite,
    embedder: embedder ?? undefined,
  });
}

/**
 * Embedder auto-detection used when `config.memory.mem0.embedder` is not set.
 *
 * Order (matches plan):
 *   1. Ollama if http://localhost:11434/api/tags responds within 200 ms.
 *   2. OpenAI if OPENAI_API_KEY is set.
 *   3. Throw a clear error pointing the user at docs/memory.md.
 */
export async function detectEmbedder(opts?: {
  ollamaUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  hasOpenAIKey?: boolean;
}): Promise<Mem0ComponentConfig> {
  const url = opts?.ollamaUrl ?? "http://localhost:11434/api/tags";
  const f = opts?.fetchImpl ?? globalThis.fetch;
  const timeout = opts?.timeoutMs ?? 200;
  const hasOpenAIKey = opts?.hasOpenAIKey ?? Boolean(process.env.OPENAI_API_KEY);

  if (typeof f === "function") {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res = await f(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res && (res as any).ok) {
        return {
          provider: "ollama",
          config: { model: "nomic-embed-text" },
        };
      }
    } catch {
      // fall through to OpenAI / error
    }
  }

  if (hasOpenAIKey) {
    return {
      provider: "openai",
      config: { model: "text-embedding-3-small" },
    };
  }

  throw new Error(
    'memory: backend "mem0" needs an embedder. Either run Ollama locally ' +
      "(http://localhost:11434), set OPENAI_API_KEY, or configure " +
      "config.memory.mem0.embedder. See docs/memory.md.",
  );
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2));
  if (p === "~") return homedir();
  return p;
}

function requireNamespace(ns: string | undefined): string {
  if (!ns || ns.trim().length === 0) {
    throw new Error(
      "memory: namespace is required (config.memory.namespace or robot.namespace must be set)",
    );
  }
  return ns;
}

/**
 * mem0's `add` returns either an array of results, a `{ results: [...] }`
 * wrapper, or a single object depending on version. Extract the first id.
 */
function extractFirstId(result: any): string | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    return result[0]?.id ?? null;
  }
  if (Array.isArray(result.results)) {
    return result.results[0]?.id ?? null;
  }
  if (typeof result.id === "string") return result.id;
  return null;
}

interface NormalizedHit {
  id: string | null;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
  /** Top-level created_at / createdAt as returned by mem0 (string ISO or number ms). */
  rawCreatedAt?: unknown;
}

function normalizeHits(raw: any): NormalizedHit[] {
  if (!raw) return [];
  const arr: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.results)
      ? raw.results
      : Array.isArray(raw.data)
        ? raw.data
        : [];
  return arr.map((h) => ({
    id: typeof h?.id === "string" ? h.id : null,
    content:
      typeof h?.memory === "string"
        ? h.memory
        : typeof h?.content === "string"
          ? h.content
          : typeof h?.text === "string"
            ? h.text
            : "",
    score: typeof h?.score === "number" ? h.score : undefined,
    metadata:
      h?.metadata && typeof h.metadata === "object" ? (h.metadata as Record<string, unknown>) : undefined,
    rawCreatedAt: h?.created_at ?? h?.createdAt,
  }));
}

/**
 * Read a millisecond timestamp from a hit, trying (in order):
 *   1. metadata.createdAt (what we set ourselves on `add`),
 *   2. top-level `created_at` (mem0 v3 returns ISO string),
 *   3. top-level `createdAt` (older mem0).
 */
function readCreatedAt(h: NormalizedHit): number {
  const meta = h.metadata?.createdAt;
  if (typeof meta === "number") return meta;
  const raw = h.rawCreatedAt;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function toRecord(h: NormalizedHit, namespace: string): MemoryRecord {
  const tags = Array.isArray(h.metadata?.tags)
    ? (h.metadata!.tags as unknown[]).map(String)
    : undefined;
  const pathHint = typeof h.metadata?.path === "string" ? (h.metadata!.path as string) : undefined;
  return {
    id: h.id ?? `mem0:${Date.now()}`,
    content: h.content,
    namespace,
    tags,
    path: pathHint,
    createdAt: readCreatedAt(h) || Date.now(),
    score: h.score,
  };
}
