/**
 * Unit tests for the mem0 backend. We construct Mem0MemoryProvider directly
 * with a hand-rolled fake mem0 Memory instance, so the real `mem0ai` package
 * is never loaded. This keeps the test fast and dependency-free.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { Mem0MemoryProvider } from "../mem0/provider.js";

interface FakeMem0Call {
  method: string;
  args: unknown[];
}

function createFakeMemory() {
  const calls: FakeMem0Call[] = [];
  const records: Array<{ id: string; memory: string; userId: string; metadata: any; score?: number }> = [];
  let nextId = 1;
  return {
    calls,
    records,
    async add(content: string, options: any) {
      calls.push({ method: "add", args: [content, options] });
      const id = `m${nextId++}`;
      records.push({
        id,
        memory: content,
        userId: options?.userId,
        metadata: options?.metadata,
      });
      return [{ id, memory: content }];
    },
    async search(query: string, options: any) {
      calls.push({ method: "search", args: [query, options] });
      if (options?.userId) {
        throw new Error(
          "Top-level entity parameters [userId] are not supported in search(). Use filters: { user_id: \"...\" } instead.",
        );
      }
      // Real mem0 v3 requires snake_case `user_id` inside filters.
      const userId = options?.filters?.user_id;
      if (!userId) {
        throw new Error(
          "filters must contain at least one of: user_id, agent_id, run_id.",
        );
      }
      const matches = records
        .filter((r) => r.userId === userId)
        .filter((r) => r.memory.toLowerCase().includes(query.toLowerCase()))
        .slice(0, options?.limit ?? 10)
        .map((r) => ({ id: r.id, memory: r.memory, score: 0.9, metadata: r.metadata }));
      return { results: matches };
    },
    async delete(id: string) {
      calls.push({ method: "delete", args: [id] });
      const i = records.findIndex((r) => r.id === id);
      if (i >= 0) records.splice(i, 1);
      return { success: true };
    },
    async getAll(options: any) {
      calls.push({ method: "getAll", args: [options] });
      const userId = options?.filters?.user_id ?? options?.userId;
      return records
        .filter((r) => r.userId === userId)
        .slice(0, options?.limit ?? 1000)
        .map((r) => ({ id: r.id, memory: r.memory, metadata: r.metadata }));
    },
  };
}

test("mem0: remember passes namespace as userId and infer:false by default", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: false });
  await provider.remember({ namespace: "robotA", content: "remember this", tags: ["pref"] });
  const addCall = fake.calls.find((c) => c.method === "add");
  assert.ok(addCall, "add should have been called");
  const [content, options] = addCall.args as [string, any];
  assert.equal(content, "remember this");
  assert.equal(options.userId, "robotA");
  assert.equal(options.infer, false);
  assert.deepEqual(options.metadata.tags, ["pref"]);
  assert.ok(typeof options.metadata.createdAt === "number");
});

test("mem0: inferOnWrite:true forwards infer:true to add", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: true });
  await provider.remember({ namespace: "ns", content: "hi" });
  const addCall = fake.calls.find((c) => c.method === "add")!;
  const [, options] = addCall.args as [string, any];
  assert.equal(options.infer, true);
});

test("mem0: recall scopes by namespace via filters.userId and limits results", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: false });
  await provider.remember({ namespace: "robotA", content: "kitchen rug" });
  await provider.remember({ namespace: "robotB", content: "kitchen rug" });

  const hits = await provider.recall({ namespace: "robotA", query: "kitchen", limit: 5 });
  assert.equal(hits.length, 1, "should only see records for robotA");
  assert.equal(hits[0].namespace, "robotA");

  const searchCall = fake.calls.find((c) => c.method === "search")!;
  const [, options] = searchCall.args as [string, any];
  assert.equal(options.userId, undefined, "must NOT pass top-level userId (mem0 v3+ rejects it)");
  assert.equal(options.filters.user_id, "robotA", "filters must use snake_case user_id");
  assert.equal(options.limit, 5);
});

test("mem0: forget by id calls delete(id)", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: false });
  const rec = await provider.remember({ namespace: "ns", content: "x" });
  const result = await provider.forget({ id: rec.id });
  assert.equal(result.removed, 1);
  const delCall = fake.calls.find((c) => c.method === "delete")!;
  assert.deepEqual(delCall.args, [rec.id]);
});

test("mem0: forget by query searches and deletes each match", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: false });
  await provider.remember({ namespace: "ns", content: "kitchen rug fragile" });
  await provider.remember({ namespace: "ns", content: "couch is comfortable" });

  const result = await provider.forget({ namespace: "ns", query: "kitchen" });
  assert.equal(result.removed, 1);
});

test("mem0: forget by namespace uses enumerate+delete (avoids version-fragile deleteAll)", async () => {
  const fake = createFakeMemory();
  // Add a deleteAll spy that should NOT be called.
  (fake as any).deleteAll = async () => {
    throw new Error("provider must NOT call deleteAll — mem0 v3 rejects some shapes");
  };
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: false });
  await provider.remember({ namespace: "ns", content: "a" });
  await provider.remember({ namespace: "ns", content: "b" });
  await provider.remember({ namespace: "other", content: "c" });

  const result = await provider.forget({ namespace: "ns" });
  assert.equal(result.removed, 2);
  assert.equal(fake.records.length, 1);
  assert.equal(fake.records[0].userId, "other");
});

test("mem0: status reports recordCount via getAll + embedder info", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({
    memory: fake,
    inferOnWrite: false,
    embedder: { provider: "ollama", config: { model: "nomic-embed-text" } },
  });
  await provider.remember({ namespace: "ns", content: "fact" });
  const status = await provider.status("ns");
  assert.equal(status.backend, "mem0");
  assert.equal(status.namespace, "ns");
  assert.equal(status.recordCount, 1);
  assert.deepEqual(status.embedder, { provider: "ollama", model: "nomic-embed-text" });
});

test("mem0: recent() sorts by createdAt desc and respects limit and namespace", async () => {
  const fake = createFakeMemory();
  const provider = new Mem0MemoryProvider({ memory: fake, inferOnWrite: false });

  // Stage records with explicit metadata.createdAt timestamps (newest -> oldest).
  await provider.remember({ namespace: "ns", content: "oldest" });
  await new Promise((r) => setTimeout(r, 2));
  await provider.remember({ namespace: "ns", content: "middle" });
  await new Promise((r) => setTimeout(r, 2));
  await provider.remember({ namespace: "other", content: "other-ns" });
  await new Promise((r) => setTimeout(r, 2));
  await provider.remember({ namespace: "ns", content: "newest" });

  const recent = await provider.recent("ns", 5);
  assert.equal(recent.length, 3, "should only count records in 'ns'");
  assert.equal(recent[0].content, "newest");
  assert.equal(recent[1].content, "middle");
  assert.equal(recent[2].content, "oldest");

  const limited = await provider.recent("ns", 1);
  assert.equal(limited.length, 1);
  assert.equal(limited[0].content, "newest");

  // recent() must use the documented v3 filter shape (snake_case user_id in filters).
  const getAllCall = fake.calls.find(
    (c) => c.method === "getAll" && (c.args[0] as any)?.filters?.user_id === "ns",
  );
  assert.ok(getAllCall, "recent() must filter by filters.user_id");
});
