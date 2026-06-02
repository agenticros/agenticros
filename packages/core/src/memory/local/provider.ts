import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  ForgetInput,
  MemoryProvider,
  MemoryRecord,
  MemoryStatus,
  RecallInput,
  RememberInput,
} from "../types.js";

interface LocalConfig {
  storePath: string;
}

interface FileShape {
  version: 1;
  records: MemoryRecord[];
}

/**
 * Tiny JSON-on-disk memory backend. No new deps.
 *
 * Recall ranks by token-overlap score (tf-style) with a small recency bonus
 * so two equally-relevant memories are returned newest-first. This is
 * intentionally dumb — users who want true semantic search opt into mem0.
 */
export class LocalMemoryProvider implements MemoryProvider {
  readonly backend = "local" as const;
  private readonly storePath: string;
  private records: MemoryRecord[] | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(config: LocalConfig) {
    this.storePath = expandHome(config.storePath);
  }

  async remember(input: RememberInput): Promise<MemoryRecord> {
    const namespace = requireNamespace(input.namespace);
    const record: MemoryRecord = {
      id: randomUUID(),
      content: input.content,
      namespace,
      tags: input.tags && input.tags.length > 0 ? [...input.tags] : undefined,
      path: input.path,
      createdAt: Date.now(),
    };
    const records = await this.load();
    records.push(record);
    await this.persist();
    return cloneRecord(record);
  }

  async recall(input: RecallInput): Promise<MemoryRecord[]> {
    const namespace = requireNamespace(input.namespace);
    const limit = input.limit ?? 10;
    const records = await this.load();
    const queryTokens = tokenize(input.query);
    if (queryTokens.length === 0) return [];

    const now = Date.now();
    const scored = records
      .filter((r) => r.namespace === namespace)
      .map((r) => {
        const recordTokens = tokenize(r.content);
        const overlap = overlapScore(queryTokens, recordTokens);
        const ageMs = Math.max(0, now - r.createdAt);
        const recencyBonus = Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 14)); // 14-day half-life
        const score = overlap === 0 ? 0 : overlap + recencyBonus * 0.05;
        return { record: r, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => ({ ...cloneRecord(s.record), score: s.score }));
  }

  async forget(input: ForgetInput): Promise<{ removed: number }> {
    const records = await this.load();
    const before = records.length;
    let next: MemoryRecord[];

    if (input.id !== undefined) {
      next = records.filter((r) => r.id !== input.id);
    } else if (input.query !== undefined) {
      const namespace = requireNamespace(input.namespace);
      const tokens = tokenize(input.query);
      next = records.filter((r) => {
        if (r.namespace !== namespace) return true;
        const overlap = overlapScore(tokens, tokenize(r.content));
        return overlap === 0;
      });
    } else if (input.namespace !== undefined) {
      next = records.filter((r) => r.namespace !== input.namespace);
    } else {
      throw new Error(
        "forget() requires one of { id }, { query, namespace }, or { namespace }",
      );
    }

    if (next.length === before) return { removed: 0 };
    this.records = next;
    await this.persist();
    return { removed: before - next.length };
  }

  async status(namespace: string): Promise<MemoryStatus> {
    const records = await this.load();
    const inNs = records.filter((r) => r.namespace === namespace);
    const lastWriteAt =
      inNs.length === 0
        ? null
        : inNs.reduce((acc, r) => (r.createdAt > acc ? r.createdAt : acc), 0);
    return {
      enabled: true,
      backend: "local",
      namespace,
      recordCount: inNs.length,
      lastWriteAt,
    };
  }

  async recent(namespace: string, limit = 5): Promise<MemoryRecord[]> {
    const records = await this.load();
    return records
      .filter((r) => r.namespace === namespace)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, Math.max(0, limit))
      .map(cloneRecord);
  }

  private async load(): Promise<MemoryRecord[]> {
    if (this.records !== null) return this.records;
    try {
      const raw = await fs.readFile(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as FileShape;
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.version === 1 &&
        Array.isArray(parsed.records)
      ) {
        this.records = parsed.records.map(normalizeRecord);
      } else {
        this.records = [];
      }
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        this.records = [];
      } else {
        throw err;
      }
    }
    return this.records;
  }

  private async persist(): Promise<void> {
    if (this.records === null) return;
    const snapshot: FileShape = { version: 1, records: this.records };
    const text = JSON.stringify(snapshot, null, 2);
    // Serialize writes so concurrent remember/forget calls don't race.
    this.writeChain = this.writeChain.then(async () => {
      await fs.mkdir(path.dirname(this.storePath), { recursive: true });
      const tmp = `${this.storePath}.tmp`;
      await fs.writeFile(tmp, text, "utf8");
      await fs.rename(tmp, this.storePath);
    });
    await this.writeChain;
  }
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

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function overlapScore(query: string[], doc: string[]): number {
  if (query.length === 0 || doc.length === 0) return 0;
  const docSet = new Set(doc);
  let hits = 0;
  for (const t of query) if (docSet.has(t)) hits += 1;
  return hits / Math.sqrt(query.length * doc.length);
}

function cloneRecord(r: MemoryRecord): MemoryRecord {
  return {
    id: r.id,
    content: r.content,
    namespace: r.namespace,
    tags: r.tags ? [...r.tags] : undefined,
    path: r.path,
    createdAt: r.createdAt,
    score: r.score,
  };
}

function normalizeRecord(r: any): MemoryRecord {
  return {
    id: String(r.id ?? randomUUID()),
    content: String(r.content ?? ""),
    namespace: String(r.namespace ?? ""),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : undefined,
    path: typeof r.path === "string" ? r.path : undefined,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
  };
}
