/**
 * Unit tests for the local JSON-on-disk memory backend.
 *
 * Run via `pnpm --filter @agenticros/core test` (after build).
 * Uses Node's built-in node:test runner — no extra deps.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { LocalMemoryProvider } from "../local/provider.js";

async function withTempStore<T>(
  fn: (provider: LocalMemoryProvider, dir: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "agenticros-mem-test-"));
  const storePath = path.join(dir, "memory.json");
  const provider = new LocalMemoryProvider({ storePath });
  try {
    return await fn(provider, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("local: remember then recall returns the record", async () => {
  await withTempStore(async (provider) => {
    const stored = await provider.remember({
      namespace: "robotA",
      content: "The kitchen rug is fragile",
      tags: ["preference"],
    });
    assert.ok(stored.id);
    assert.equal(stored.namespace, "robotA");

    const hits = await provider.recall({ namespace: "robotA", query: "kitchen rug" });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].content, "The kitchen rug is fragile");
    assert.ok((hits[0].score ?? 0) > 0);
  });
});

test("local: namespace isolation — robotB cannot see robotA memories", async () => {
  await withTempStore(async (provider) => {
    await provider.remember({ namespace: "robotA", content: "kitchen rug fragile" });
    await provider.remember({ namespace: "robotB", content: "garage door is loud" });

    const aHits = await provider.recall({ namespace: "robotA", query: "kitchen" });
    const bHits = await provider.recall({ namespace: "robotB", query: "kitchen" });
    assert.equal(aHits.length, 1);
    assert.equal(bHits.length, 0);
  });
});

test("local: recall ranks by overlap with recency tie-break", async () => {
  await withTempStore(async (provider) => {
    const older = await provider.remember({
      namespace: "ns",
      content: "the cat is on the mat",
    });
    // Backdate older record by 30 days by writing the file directly.
    // Easier: just stagger creation and assert order.
    await new Promise((r) => setTimeout(r, 10));
    const newer = await provider.remember({
      namespace: "ns",
      content: "the cat is on the mat",
    });

    const hits = await provider.recall({ namespace: "ns", query: "cat mat" });
    assert.equal(hits.length, 2);
    assert.equal(hits[0].id, newer.id, "newer record should rank first when scores tie");
    assert.equal(hits[1].id, older.id);
  });
});

test("local: forget by id deletes exactly one record", async () => {
  await withTempStore(async (provider) => {
    const a = await provider.remember({ namespace: "ns", content: "fact one" });
    const b = await provider.remember({ namespace: "ns", content: "fact two" });

    const result = await provider.forget({ id: a.id });
    assert.equal(result.removed, 1);

    const status = await provider.status("ns");
    assert.equal(status.recordCount, 1);

    const hits = await provider.recall({ namespace: "ns", query: "fact" });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, b.id);
  });
});

test("local: forget by query removes only matching records in namespace", async () => {
  await withTempStore(async (provider) => {
    await provider.remember({ namespace: "ns", content: "kitchen rug fragile" });
    await provider.remember({ namespace: "ns", content: "couch is comfortable" });
    await provider.remember({ namespace: "other", content: "kitchen rug fragile" });

    const result = await provider.forget({ namespace: "ns", query: "kitchen" });
    assert.equal(result.removed, 1);

    const nsHits = await provider.recall({ namespace: "ns", query: "kitchen" });
    const otherHits = await provider.recall({ namespace: "other", query: "kitchen" });
    assert.equal(nsHits.length, 0);
    assert.equal(otherHits.length, 1, "other-namespace record must survive");
  });
});

test("local: forget by namespace removes everything in that namespace", async () => {
  await withTempStore(async (provider) => {
    await provider.remember({ namespace: "ns", content: "a" });
    await provider.remember({ namespace: "ns", content: "b" });
    await provider.remember({ namespace: "other", content: "c" });

    const result = await provider.forget({ namespace: "ns" });
    assert.equal(result.removed, 2);

    assert.equal((await provider.status("ns")).recordCount, 0);
    assert.equal((await provider.status("other")).recordCount, 1);
  });
});

test("local: forget without any selector throws", async () => {
  await withTempStore(async (provider) => {
    await assert.rejects(() => provider.forget({}), /requires one of/);
  });
});

test("local: status reports correct count and lastWriteAt", async () => {
  await withTempStore(async (provider) => {
    const before = Date.now();
    await provider.remember({ namespace: "ns", content: "hello" });
    const status = await provider.status("ns");
    assert.equal(status.backend, "local");
    assert.equal(status.namespace, "ns");
    assert.equal(status.recordCount, 1);
    assert.ok(status.lastWriteAt !== null && status.lastWriteAt >= before);
  });
});

test("local: persists across instances (data on disk)", async () => {
  await withTempStore(async (provider, dir) => {
    const storePath = path.join(dir, "memory.json");
    await provider.remember({ namespace: "ns", content: "persistent fact" });

    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.records.length, 1);

    // New provider over the same file should see the record.
    const reopened = new LocalMemoryProvider({ storePath });
    const hits = await reopened.recall({ namespace: "ns", query: "persistent" });
    assert.equal(hits.length, 1);
  });
});

test("local: requires namespace", async () => {
  await withTempStore(async (provider) => {
    await assert.rejects(
      () => provider.remember({ content: "no namespace" }),
      /namespace is required/,
    );
  });
});

test("local: recent() returns most-recent first, scoped by namespace, capped at limit", async () => {
  await withTempStore(async (provider) => {
    // Stagger createdAt by 1ms via tiny sleeps so ordering is deterministic.
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await provider.remember({ namespace: "ns", content: "fact 1 (oldest)" });
    await sleep(2);
    await provider.remember({ namespace: "ns", content: "fact 2" });
    await sleep(2);
    await provider.remember({ namespace: "other", content: "from other ns" });
    await sleep(2);
    await provider.remember({ namespace: "ns", content: "fact 3 (newest)" });

    const recent = await provider.recent("ns", 5);
    assert.equal(recent.length, 3, "should only count records in 'ns'");
    assert.equal(recent[0].content, "fact 3 (newest)");
    assert.equal(recent[1].content, "fact 2");
    assert.equal(recent[2].content, "fact 1 (oldest)");

    const limited = await provider.recent("ns", 2);
    assert.equal(limited.length, 2);
    assert.equal(limited[0].content, "fact 3 (newest)");
    assert.equal(limited[1].content, "fact 2");

    const emptyNs = await provider.recent("nobody", 5);
    assert.equal(emptyNs.length, 0);
  });
});
