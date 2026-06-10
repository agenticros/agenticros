/**
 * Unit tests for the memory-backed mission transcript sink.
 *
 * Pins down the cross-adapter resume story: a mission run by agent A
 * leaves a JSON trail under namespace `mission:<id>` that agent B can
 * read via memory_recall. The sink itself is a thin shim, so we test:
 *
 *   - One sink call → exactly one memory.remember() call.
 *   - Namespace is `mission:<missionId>` (canonical via
 *     missionTranscriptNamespace).
 *   - content is JSON-parseable and contains every transcript field
 *     the LLM cares about (mission_id, step.{id, capability, status,
 *     inputs, outputs}).
 *   - tags include `mission_transcript`, `step:<status>`, and
 *     `capability:<id>` (used for future recall filters).
 *   - path is sortable (zero-padded step_index) so a recall sorted by
 *     path returns the steps in execution order.
 *   - A throwing memory.remember() does NOT propagate (best-effort
 *     contract — transcript loss must never abort a mission).
 *   - An async-rejecting memory.remember() doesn't propagate either.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createMemoryTranscriptSink } from "../mission-transcript-sink.js";
import { missionTranscriptNamespace } from "../mission-registry.js";
import type { MissionTranscriptEntry } from "../mission.js";
import type { MemoryProvider, MemoryRecord } from "../memory/index.js";

interface RememberCall {
  namespace: string;
  content: string;
  tags?: string[];
  path?: string;
}

function makeFakeMemory(opts?: {
  rememberImpl?: (call: RememberCall) => void | Promise<void>;
}): { memory: MemoryProvider; calls: RememberCall[] } {
  const calls: RememberCall[] = [];
  const memory: MemoryProvider = {
    backend: "local",
    async remember(input) {
      const call: RememberCall = {
        namespace: input.namespace ?? "",
        content: input.content,
        tags: input.tags,
        path: input.path,
      };
      calls.push(call);
      if (opts?.rememberImpl) await opts.rememberImpl(call);
      return {
        id: `rec_${calls.length}`,
        content: input.content,
        namespace: call.namespace,
        createdAt: Date.now(),
      } satisfies MemoryRecord;
    },
    async recall() {
      return [];
    },
    async forget() {
      return { removed: 0 };
    },
    async status() {
      return { enabled: true, backend: "local", namespace: "", recordCount: 0, lastWriteAt: null };
    },
    async recent() {
      return [];
    },
  };
  return { memory, calls };
}

function makeEntry(opts: Partial<MissionTranscriptEntry> & {
  step: { id: string; capability: string; status: "ok" | "error" | "skipped" | "cancelled"; outputs?: Record<string, unknown> };
  step_index: number;
}): MissionTranscriptEntry {
  return {
    mission_id: opts.mission_id ?? "mn_default",
    mission_name: opts.mission_name,
    adapter: opts.adapter,
    started_at: opts.started_at ?? 1700000000000,
    robot_id: opts.robot_id ?? "",
    step_index: opts.step_index,
    step_total: opts.step_total ?? 3,
    result: {
      id: opts.step.id,
      capability: opts.step.capability,
      status: opts.step.status,
      inputs: { foo: "bar" },
      outputs: opts.step.outputs,
      duration_ms: 42,
    },
  };
}

test("sink: writes one memory.remember per entry, under mission:<id> namespace", async () => {
  const { memory, calls } = makeFakeMemory();
  const sink = createMemoryTranscriptSink(memory, "mn_alpha");
  await sink(makeEntry({ step: { id: "s1", capability: "drive_base", status: "ok" }, step_index: 0 }));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].namespace, missionTranscriptNamespace("mn_alpha"));
});

test("sink: content is JSON-parseable and carries the full step snapshot", async () => {
  const { memory, calls } = makeFakeMemory();
  const sink = createMemoryTranscriptSink(memory, "mn_beta");
  await sink(
    makeEntry({
      mission_id: "mn_beta",
      mission_name: "demo",
      adapter: "claude-code",
      step: {
        id: "find",
        capability: "find_object",
        status: "ok",
        outputs: { found: true, horizontal_offset: 0.12 },
      },
      step_index: 1,
      step_total: 3,
    }),
  );
  const payload = JSON.parse(calls[0].content) as {
    mission_id: string;
    mission_name: string;
    adapter: string;
    step_index: number;
    step_total: number;
    step: {
      id: string;
      capability: string;
      status: string;
      inputs: Record<string, unknown>;
      outputs: Record<string, unknown>;
    };
  };
  assert.equal(payload.mission_id, "mn_beta");
  assert.equal(payload.mission_name, "demo");
  assert.equal(payload.adapter, "claude-code");
  assert.equal(payload.step_index, 1);
  assert.equal(payload.step_total, 3);
  assert.equal(payload.step.id, "find");
  assert.equal(payload.step.capability, "find_object");
  assert.equal(payload.step.status, "ok");
  assert.deepEqual(payload.step.outputs, { found: true, horizontal_offset: 0.12 });
});

test("sink: tags include mission_transcript + step:<status> + capability:<id>", async () => {
  const { memory, calls } = makeFakeMemory();
  const sink = createMemoryTranscriptSink(memory, "mn_g");
  await sink(makeEntry({ step: { id: "drive", capability: "drive_base", status: "ok" }, step_index: 0 }));
  await sink(makeEntry({ step: { id: "bad", capability: "find_object", status: "error" }, step_index: 1 }));
  assert.deepEqual(new Set(calls[0].tags), new Set(["mission_transcript", "step:ok", "capability:drive_base"]));
  assert.deepEqual(new Set(calls[1].tags), new Set(["mission_transcript", "step:error", "capability:find_object"]));
});

test("sink: path uses zero-padded step_index so recall sort-by-path stays in execution order", async () => {
  const { memory, calls } = makeFakeMemory();
  const sink = createMemoryTranscriptSink(memory, "mn_p");
  await sink(makeEntry({ step: { id: "s1", capability: "drive_base", status: "ok" }, step_index: 0 }));
  await sink(makeEntry({ step: { id: "s11", capability: "drive_base", status: "ok" }, step_index: 10 }));
  // Lexicographic sort of the two paths must put step 0 before step 10.
  assert.equal(calls[0].path, "mn_p/000-s1");
  assert.equal(calls[1].path, "mn_p/010-s11");
  const sorted = [...calls].map((c) => c.path!).sort();
  assert.deepEqual(sorted, ["mn_p/000-s1", "mn_p/010-s11"]);
});

test("sink: synchronous throws inside memory.remember don't propagate (best-effort)", async () => {
  const { memory } = makeFakeMemory({
    rememberImpl: () => {
      throw new Error("boom");
    },
  });
  const sink = createMemoryTranscriptSink(memory, "mn_z");
  // Must not throw.
  await sink(makeEntry({ step: { id: "s1", capability: "drive_base", status: "ok" }, step_index: 0 }));
});

test("sink: async rejections inside memory.remember don't propagate", async () => {
  const { memory } = makeFakeMemory({
    rememberImpl: async () => {
      throw new Error("async boom");
    },
  });
  const sink = createMemoryTranscriptSink(memory, "mn_zz");
  await sink(makeEntry({ step: { id: "s1", capability: "drive_base", status: "ok" }, step_index: 0 }));
});
