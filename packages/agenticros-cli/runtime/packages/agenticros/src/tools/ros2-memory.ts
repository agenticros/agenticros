import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi, ToolContent } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { resolveMemoryNamespace } from "@agenticros/core";
import { getMemory } from "../memory.js";

/**
 * Register the four memory tools with the OpenClaw AI agent.
 *
 * Memory tools are only registered when `config.memory.enabled === true` and
 * the provider initialized successfully. See ../memory.ts for the provider
 * lifecycle.
 */
export function registerMemoryTools(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
): void {
  api.registerTool({
    name: "memory_remember",
    label: "Memory: remember",
    description:
      "Store a durable fact in long-term memory. Call this when the user says \"remember that ...\", \"note that ...\", \"from now on ...\", or shares a stable personal fact (preferences, names, places, routines, robot hardware like the camera/eyes the robot has). The store is shared across all AgenticROS adapters talking to this robot (OpenClaw, Claude Desktop, Claude Code, Gemini). Do NOT auto-store chat transcripts or transient state. Namespace defaults to the robot namespace.",
    parameters: Type.Object({
      content: Type.String({ description: "The fact to remember, written as a self-contained sentence." }),
      tags: Type.Optional(
        Type.Array(Type.String(), {
          description: "Optional list of tag strings for filtering later.",
        }),
      ),
      path: Type.Optional(
        Type.String({ description: "Optional hierarchical hint (e.g. 'preferences.movement.speed')." }),
      ),
      namespace: Type.Optional(Type.String({ description: "Optional namespace override; defaults to the robot namespace." })),
    }),
    async execute(_toolCallId, params) {
      const memory = getMemory();
      if (!memory) return memoryDisabled();
      const content = String((params as any).content ?? "").trim();
      if (!content) return errResult("memory_remember requires 'content'.");
      const namespace = resolveMemoryNamespace(config, (params as any).namespace as string | undefined);
      try {
        const record = await memory.remember({
          content,
          namespace,
          tags: Array.isArray((params as any).tags)
            ? ((params as any).tags as unknown[]).map(String)
            : undefined,
          path: typeof (params as any).path === "string" ? ((params as any).path as string) : undefined,
        });
        const text = JSON.stringify({
          success: true,
          id: record.id,
          namespace: record.namespace,
          backend: memory.backend,
        });
        return { content: [{ type: "text", text }], details: record };
      } catch (err) {
        return errResult(`memory_remember failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  api.registerTool({
    name: "memory_recall",
    label: "Memory: recall",
    description:
      "Semantic search of long-term memory. ALWAYS call this BEFORE answering a personal-context question, including: \"what do I have for X?\", \"what's my Y?\", \"where is the Z?\", \"what did I tell you about ...?\", \"do you remember ...?\". The store is shared across every adapter for this robot — a fact saved from Claude Desktop or Claude Code lives in the same store. Returns the top matches ranked by relevance.",
    parameters: Type.Object({
      query: Type.String({ description: "Free-text query describing what you want to recall." }),
      limit: Type.Optional(Type.Number({ description: "Max matches to return (default 5)." })),
      namespace: Type.Optional(Type.String({ description: "Optional namespace override; defaults to the robot namespace." })),
    }),
    async execute(_toolCallId, params) {
      const memory = getMemory();
      if (!memory) return memoryDisabled();
      const query = String((params as any).query ?? "").trim();
      if (!query) return errResult("memory_recall requires 'query'.");
      const namespace = resolveMemoryNamespace(config, (params as any).namespace as string | undefined);
      const limit = typeof (params as any).limit === "number" ? ((params as any).limit as number) : 5;
      try {
        const hits = await memory.recall({ query, namespace, limit });
        const text = JSON.stringify({
          success: true,
          namespace,
          backend: memory.backend,
          count: hits.length,
          results: hits,
        });
        return { content: [{ type: "text", text }], details: hits };
      } catch (err) {
        return errResult(`memory_recall failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  api.registerTool({
    name: "memory_forget",
    label: "Memory: forget",
    description:
      "Delete memories. Provide an id (delete one), a query (delete matches in the namespace), or just namespace (delete all in that namespace). Irreversible.",
    parameters: Type.Object({
      id: Type.Optional(Type.String({ description: "Record id returned by memory_remember." })),
      query: Type.Optional(
        Type.String({ description: "Free-text query; deletes every matching memory in the namespace." }),
      ),
      namespace: Type.Optional(Type.String({ description: "Namespace to delete from." })),
    }),
    async execute(_toolCallId, params) {
      const memory = getMemory();
      if (!memory) return memoryDisabled();
      const namespace = resolveMemoryNamespace(config, (params as any).namespace as string | undefined);
      try {
        const result = await memory.forget({
          id: typeof (params as any).id === "string" ? ((params as any).id as string) : undefined,
          query: typeof (params as any).query === "string" ? ((params as any).query as string) : undefined,
          namespace,
        });
        const text = JSON.stringify({ success: true, ...result, namespace, backend: memory.backend });
        return { content: [{ type: "text", text }], details: result };
      } catch (err) {
        return errResult(`memory_forget failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });

  api.registerTool({
    name: "memory_status",
    label: "Memory: status",
    description:
      "Health check for the memory subsystem: enabled state, backend, record count for the current namespace, last write timestamp, and embedder info (when applicable).",
    parameters: Type.Object({
      namespace: Type.Optional(Type.String({ description: "Optional namespace override; defaults to the robot namespace." })),
    }),
    async execute(_toolCallId, params) {
      const memory = getMemory();
      if (!memory) return memoryDisabled();
      const namespace = resolveMemoryNamespace(config, (params as any).namespace as string | undefined);
      try {
        const status = await memory.status(namespace);
        const text = JSON.stringify({ success: true, ...status });
        return { content: [{ type: "text", text }], details: status };
      } catch (err) {
        return errResult(`memory_status failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });
}

function memoryDisabled() {
  return errResult(
    "Memory is not enabled. Set memory.enabled=true in ~/.agenticros/config.json (backend: 'local' for zero deps, 'mem0' for semantic search). See docs/memory.md.",
  );
}

function errResult(text: string) {
  const content: ToolContent[] = [{ type: "text", text }];
  return { content, details: { error: text } };
}
