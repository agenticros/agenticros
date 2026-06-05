/**
 * Cross-adapter semantic memory primitives.
 *
 * Memory is an optional, off-by-default subsystem that gives every adapter
 * (OpenClaw, Claude Code MCP, Gemini CLI) a shared way to remember facts
 * across sessions. Records are namespaced (default: robot namespace), so
 * the three adapters talking to the same robot share the same store.
 */

export interface MemoryRecord {
  /** Provider-assigned id. Used for `forget({ id })`. */
  id: string;
  /** Raw text content the agent stored. */
  content: string;
  /** Namespace this record belongs to (defaults to robot namespace at call time). */
  namespace: string;
  /** Optional tags the agent supplied at write time. */
  tags?: string[];
  /** Optional hierarchical path hint (e.g. "profile.preferences.speed"). */
  path?: string;
  /** ms since epoch when the record was created. */
  createdAt: number;
  /** Similarity / relevance score, populated only by `recall`. Higher = more relevant. */
  score?: number;
}

export interface MemoryStatus {
  /** True when a non-null provider was created from config. */
  enabled: boolean;
  /** Active backend identifier. */
  backend: "local" | "mem0";
  /** Effective namespace the adapter is using. */
  namespace: string;
  /** Number of records stored under this namespace (may be approximate for mem0). */
  recordCount: number;
  /** ms since epoch of the most recent write under this namespace, or null. */
  lastWriteAt: number | null;
  /** Embedder description for the mem0 backend, when configured. */
  embedder?: { provider: string; model?: string };
}

export interface RememberInput {
  content: string;
  namespace?: string;
  tags?: string[];
  path?: string;
}

export interface RecallInput {
  query: string;
  namespace?: string;
  limit?: number;
}

export interface ForgetInput {
  id?: string;
  query?: string;
  namespace?: string;
}

/**
 * Backend-agnostic memory provider.
 *
 * Implementations are obtained via `createMemory(config)`. The provider is
 * null when `config.memory.enabled === false`, so adapters skip registering
 * memory tools entirely.
 */
export interface MemoryProvider {
  /** Backend identifier (matches `config.memory.backend`). */
  readonly backend: "local" | "mem0";

  /** Store a new memory. Returns the persisted record (with provider-assigned id). */
  remember(input: RememberInput): Promise<MemoryRecord>;

  /** Recall up to `limit` memories ranked by relevance to `query`. */
  recall(input: RecallInput): Promise<MemoryRecord[]>;

  /**
   * Delete memories. Either:
   *  - `{ id }` — delete one record by id.
   *  - `{ query }` — delete all records in `namespace` matching the query.
   *  - `{ namespace }` only (no id, no query) — delete every record in the namespace.
   */
  forget(input: ForgetInput): Promise<{ removed: number }>;

  /** Health check: counts records, reports last-write time and embedder info if any. */
  status(namespace: string): Promise<MemoryStatus>;

  /**
   * Return up to `limit` most recently written records in the namespace.
   * Used by adapters that want to surface "recently remembered" snippets in
   * the system prompt so the LLM doesn't need a tool call for common
   * personal-context questions. Order: newest first.
   */
  recent(namespace: string, limit?: number): Promise<MemoryRecord[]>;
}
