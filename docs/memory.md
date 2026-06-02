# Memory

AgenticROS ships an **optional**, **off-by-default** cross-adapter semantic memory subsystem. When enabled, OpenClaw, Claude Code MCP, Claude Desktop (via MCP), and Gemini CLI all expose the same four tools — `memory_remember`, `memory_recall`, `memory_forget`, `memory_status` — backed by a **shared, file-backed store**. The default namespace is the robot namespace, so every adapter talking to the same robot sees the same memories across processes, sessions, and restarts.

When disabled (the default), the memory tools are not registered at all. There are no new dependencies, no new files on disk, and no behavior change for existing users.

> **Cross-process out of the box.** With the `mem0` backend, the underlying `mem0ai/oss` package writes to `~/.mem0/vector_store.db` (SQLite + vectors) so a fact you remember from Claude Desktop is immediately recall-able from OpenClaw — and vice versa — without any extra setup or running server. With the `local` backend, the shared file is `~/.agenticros/memory.json`. See [Cross-adapter behavior](#cross-adapter-behavior) below.

---

## When to enable

Useful when:

- You use **multiple AI agents** with the same robot (e.g. OpenClaw on desktop + Claude Code on your phone via Claude Dispatch). Each agent sees what the others learned.
- You want **facts to persist across sessions** (preferences, room layouts, names, routines) without re-explaining them every conversation.
- You want the robot to **build up environment knowledge** over time ("the rug in the hallway is fragile", "the cat gets startled by fast turns").

Not necessarily worth it when:

- You only ever talk to the robot in single one-shot sessions.
- Your needs fit in a static system prompt or config file.

---

## The four tools

| Tool | Use |
|---|---|
| `memory_remember` | Store a fact: `{ content, tags?, path?, namespace? }`. Returns the persisted record id. |
| `memory_recall` | Search by free-text query: `{ query, limit?, namespace? }`. Returns ranked matches. |
| `memory_forget` | Delete: `{ id }`, `{ query, namespace }`, or `{ namespace }`. Irreversible. |
| `memory_status` | Health check: `{ enabled, backend, namespace, recordCount, lastWriteAt, embedder? }`. |

Tool descriptions in each adapter remind the agent to **store selectively** — memory is for facts the user wants remembered, not for transcribing every conversation.

---

## Namespace

By default the namespace is `config.robot.namespace`, so memories are scoped per robot. Override with `config.memory.namespace` (e.g. to share across robots, or to scope per-user). Tools also accept a one-off `namespace` argument.

| Scenario | Effective namespace |
|---|---|
| Default | `config.robot.namespace` |
| Per-user override | Set `config.memory.namespace` to the user id |
| Per-call override | Pass `namespace` in the tool args |

> Heads up: with the default, two robots **never** see each other's memories. With a shared override, all robots with that namespace do.

---

## Backends

| Backend | Deps | Search quality | Best for |
|---|---|---|---|
| `local` (default when enabled) | None | Keyword + recency | Zero-friction setup, "remember this fact" style use |
| `mem0` | `pnpm add mem0ai` + an embedder | Semantic | Production, fuzzy recall ("what did I say about the kitchen?") |

Both store data on the local filesystem. No cloud is involved unless you point `mem0`'s embedder/LLM at one.

---

## Recipes

### Recipe 1: local (zero deps)

Edit `~/.agenticros/config.json` (or use the OpenClaw config UI at `/agenticros/config`):

```json
{
  "memory": {
    "enabled": true,
    "backend": "local"
  }
}
```

Restart the gateway (OpenClaw) or just the next tool call (Claude Code MCP re-reads config on every call; Gemini reads on every invocation).

That's it. Memories live in `~/.agenticros/memory.json`.

### Recipe 2: `mem0` + OpenAI (cloud embedder)

```bash
pnpm add mem0ai
export OPENAI_API_KEY=sk-...
```

```json
{
  "memory": {
    "enabled": true,
    "backend": "mem0"
  }
}
```

The factory auto-detects the OpenAI key and configures the embedder as `text-embedding-3-small`. Operational data is written under `~/.mem0/` (persistent SQLite + vector store, shared across all processes on this host) and the operation history audit log lives at `~/.agenticros/memory-history.db`.

### Recipe 3: `mem0` + Ollama (fully local)

```bash
pnpm add mem0ai
ollama pull nomic-embed-text
```

```json
{
  "memory": {
    "enabled": true,
    "backend": "mem0",
    "mem0": {
      "embedder": {
        "provider": "ollama",
        "config": { "model": "nomic-embed-text" }
      }
    }
  }
}
```

The factory detects Ollama running at `http://localhost:11434` and uses it for embeddings. Nothing leaves the host.

---

## Cross-adapter behavior

Memories are stored on the **local filesystem** and indexed by namespace. Any process on the same host that uses the same backend, same namespace, and same store paths sees the same memories.

| Adapter | When it picks up new memories |
|---|---|
| **OpenClaw plugin** | At the start of the next chat session (the system context refetches the recently-remembered list every `before_agent_start`). For live `memory_recall` calls, immediately. |
| **Claude Code MCP** | Immediately on every tool call (config is reloaded on each call). |
| **Claude Desktop (MCP)** | Same as Claude Code — fresh tool call sees fresh data. |
| **Gemini CLI** | Each `agenticros-gemini` invocation is a fresh process; it sees everything written so far. |

Files written when memory is enabled:

- `~/.mem0/vector_store.db` — mem0's SQLite + vectors (mem0 backend only).
- `~/.mem0/config.json` — mem0 internal config (mem0 backend only).
- `~/.agenticros/memory-history.db` — mem0 operation history audit log (mem0 backend only; path configurable via `memory.mem0.historyDbPath`).
- `~/.agenticros/memory.json` — JSON store for the local backend (path configurable via `memory.local.storePath`).

To clear everything for a namespace: use the OpenClaw config UI's **Clear all in namespace** button, or call `memory_forget` from any adapter with no `id` and no `query` (just the namespace).

### Verifying cross-process sharing works

```bash
# From any adapter, e.g. Claude Desktop:
"Remember that the robot has a RealSense D435i for its eyes."

# Then, from OpenClaw chat in a browser tab:
"What do I have for eyes?"
```

OpenClaw should answer **from memory** (no `ros2_camera_snapshot`, no ROS topic query). If it instead reaches for ROS tools, that means the chat session was opened **before** the fact was stored — close the chat and start a new one so the system context can refresh.

### OpenClaw chat context injection

When the OpenClaw plugin starts each chat session and memory is enabled, the plugin injects a short **Memory** section into the system prompt:

- Instructions telling the LLM to call `memory_recall` **before** answering personal-context questions like *"what do I have for X"*, *"what's my Y"*, *"where is the Z"*.
- A snapshot of up to 10 **recently-remembered** facts (newest first), so the most common personal-context questions can be answered **without** a tool call.

The snapshot is produced via the new `MemoryProvider.recent(namespace, limit)` method on `@agenticros/core`. Both backends implement it; for the `mem0` backend it uses `memory.getAll({ filters: { user_id: namespace } })` and sorts by `created_at` desc.

---

## Smart-defaults auto-detection

When `backend === "mem0"` and you have **not** set `memory.mem0.embedder`, the factory probes:

1. Ollama at `http://localhost:11434/api/tags` (200 ms timeout). On success, embedder defaults to `{ provider: "ollama", config: { model: "nomic-embed-text" } }`.
2. Otherwise, `OPENAI_API_KEY` in the environment. On success, embedder defaults to `{ provider: "openai", config: { model: "text-embedding-3-small" } }`.
3. Otherwise, throws a single-line actionable error pointing you back here.

If you want explicit control, set `memory.mem0.embedder` and the auto-detection is bypassed.

---

## `inferOnWrite`: raw store vs LLM extraction

`mem0ai/oss` can optionally run LLM-driven fact extraction on `add` — the model rewrites your input into one or more atomic facts before storing.

| `inferOnWrite` | Behavior | Cost on write |
|---|---|---|
| `false` (default) | Content stored verbatim. Agent decides what to remember. | No LLM call |
| `true` | mem0 calls its configured `llm` to extract facts. | ~200–500 ms + tokens |

When unsure, leave it `false`. Flip it on later if recall quality on conversational text isn't enough.

```json
{
  "memory": {
    "enabled": true,
    "backend": "mem0",
    "mem0": {
      "inferOnWrite": true,
      "llm": { "provider": "openai", "config": { "model": "gpt-4o-mini" } }
    }
  }
}
```

---

## OpenClaw config UI

Visit `/agenticros/config` (e.g. `http://localhost:18790/agenticros/config` via the proxy). The Memory section has:

- **Off / Local / Mem0** radio buttons.
- For Mem0: `inferOnWrite` checkbox and an editable `historyDbPath`.
- **Test** button — calls `GET /agenticros/memory/status` and shows the parsed JSON inline.
- **Clear all in namespace** button — calls `POST /agenticros/memory/clear` after confirmation. Useful when you've been experimenting and want a clean slate.

---

## Verifying setup

From any adapter, call:

```text
memory_status({})
```

Expected response when memory is enabled:

```json
{
  "success": true,
  "enabled": true,
  "backend": "local",
  "namespace": "robot3946b404c33e4aa39a8d16deb1c5c593",
  "recordCount": 0,
  "lastWriteAt": null
}
```

If `enabled` comes back `false`, double-check `memory.enabled` in your config file. If you set `backend: "mem0"` but get an embedder error, follow the auto-detect order above.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Memory is not enabled.` returned from a memory tool | Config has `memory.enabled: false` (or no `memory` block) | Set `memory.enabled: true` and restart the consumer (gateway / MCP server) |
| `memory: backend "mem0" requires the "mem0ai" package.` | `pnpm add mem0ai` not run | Run `pnpm add mem0ai` in the workspace |
| `memory: backend "mem0" needs an embedder.` | No Ollama, no `OPENAI_API_KEY`, no explicit `embedder` | Run Ollama, set the env var, or configure `memory.mem0.embedder` |
| Memory tools missing from `tools/list` (Claude Code / Claude Desktop) | `memory.enabled` is false in `~/.agenticros/config.json` (MCP server reads that file, not OpenClaw's gateway config) | Add the `memory` block to `~/.agenticros/config.json` and restart the MCP client |
| `Tool error: Transport connection timed out after 15s. Is zenohd running?` on a memory call | Older build that routed memory tools through the Zenoh transport | Rebuild adapter (`pnpm --filter @agenticros/claude-code build`, or `pnpm --filter @agenticros/gemini build`) — memory tools no longer touch the transport |
| Memories don't follow across adapters | Different `robot.namespace` between adapters | Make sure all adapters use the same robot namespace (or override `memory.namespace`) |
| OpenClaw chat doesn't seem to know about a fact you just stored | Chat session was opened before the fact was stored | Close and reopen the chat — the `Memory` system-context block is built at `before_agent_start` and refreshes per session |
| OpenClaw chat reaches for `ros2_*` tools instead of `memory_recall` for a personal-fact question | Old build without the system-context "Memory" injection | Rebuild the plugin (`pnpm --filter agenticros build`) and restart the gateway |
| MCP server logs | — | `/tmp/agenticros-mcp.log` (Claude Code); OpenClaw gateway log under `/tmp/openclaw/` for the OpenClaw plugin |

---

## Architecture in one diagram

```
+----------------+   +-------------------+   +---------------+
|  OpenClaw      |   |  Claude Code /    |   |  Gemini CLI   |
|  plugin        |   |  Claude Desktop   |   |               |
|                |   |  (MCP / stdio)    |   |               |
+--------+-------+   +---------+---------+   +-------+-------+
         |                     |                     |
         |   memory_remember / recall / forget / status   |
         |                     |                     |
         +---------+-----------+-----------+---------+
                             |
                             v
                  +-------------------------+
                  |  @agenticros/core       |
                  |  createMemory(config)   |
                  +----------+----+---------+
                             |    |
                       +-----+    +-----+
                       v                v
                +-----------+    +-----------------+
                | Local     |    | Mem0            |
                | provider  |    | provider        |
                +-----+-----+    +--------+--------+
                      |                   |
                      v                   v
        ~/.agenticros/memory.json   ~/.mem0/vector_store.db
                                     +
                                     embedder (Ollama / OpenAI / ...)
```

No network sidecar. The mem0 backend runs in-process and writes to `~/.mem0/`. Multiple processes (OpenClaw gateway, Claude Desktop MCP server, ad-hoc `agenticros-gemini` invocations) all read and write the same files — that's how cross-adapter sharing works.
