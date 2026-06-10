/**
 * Phase 1.f — Gemini adapter test for mission transcripts.
 *
 * Pins the end-to-end wiring: when `memory.enabled` is true and we
 * `executeTool("run_mission", ...)`, every step the runner executes
 * MUST land in the configured memory provider under the canonical
 * `mission:<id>` namespace. A second agent (or the same agent
 * later) can then call `memory_recall({ namespace: "mission:<id>"
 * })` to read the full timeline.
 *
 * The test:
 *   1. Spins up a hermetic config with the local-JSON memory
 *      backend pointing at a tmp file.
 *   2. Runs a mission with one step whose capability isn't in the
 *      registry — the runner records an "error" step (no transport
 *      needed) AND emits a transcript entry for it.
 *   3. Asserts the transcript landed in memory under
 *      `mission:<id>`, with the expected tags + content.
 *
 * Mirrors the cross-adapter contract; the Claude Code and OpenClaw
 * adapters share the same wiring (see ros2-mission.ts / tools.ts).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeTool } from "../tools.js";
import { createMemory } from "@agenticros/core";
import type { AgenticROSConfig } from "@agenticros/core";

function makeMemoryConfig(storePath: string): AgenticROSConfig {
  return {
    transport: { mode: "zenoh" },
    zenoh: {
      routerEndpoint: "ws://localhost:10000",
      domainId: 0,
      keyFormat: "ros2dds",
    },
    rosbridge: { url: "ws://localhost:9090", reconnect: true, reconnectInterval: 3000 },
    local: { domainId: 0 },
    webrtc: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    robot: { name: "Test", namespace: "test_robot", cameraTopic: "" },
    safety: {
      maxLinearVelocity: 1,
      maxAngularVelocity: 1.5,
      workspaceLimits: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    },
    teleop: {
      cameraTopic: "",
      cameraTopics: [],
      cmdVelTopic: "",
      speedDefault: 0.3,
      cameraPollMs: 150,
    },
    describer: {
      enabled: false,
      url: "http://localhost:11435/v1/chat/completions",
      model: "qwen2.5vl:7b",
      maxTokens: 400,
      timeoutMs: 60000,
      maxImageDimension: 896,
    },
    memory: {
      enabled: true,
      backend: "local",
      local: { storePath },
      mem0: {
        inferOnWrite: false,
        historyDbPath: "~/.agenticros/memory-history.db",
      },
    },
    skills: {},
    skillPaths: [],
    skillPackages: [],
    robots: [],
  } as unknown as AgenticROSConfig;
}

test("gemini transcripts: run_mission writes per-step transcripts under mission:<id> namespace", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "agenticros-gemini-transcripts-"));
  const storePath = path.join(dir, "memory.json");
  try {
    const config = makeMemoryConfig(storePath);

    // Sanity check: the local provider initialises cleanly so we can
    // attribute any later failure to the adapter wiring rather than
    // the backend itself.
    const probe = await createMemory(config);
    assert.ok(probe, "local memory provider must initialise from hermetic config");

    // Run a mission with one step whose capability isn't in the
    // registry — the runner emits an "error" step result + transcript
    // entry for it. No transport / no sub-tool dispatch needed.
    const result = await executeTool(
      "run_mission",
      {
        mission: {
          name: "transcript wiring smoke test",
          steps: [
            { id: "noop", capability: "this_capability_does_not_exist" },
          ],
        },
      },
      config,
    );

    const jsonLine = result.output.split("\n").find((l) => l.trim().startsWith("{")) ?? "";
    const payload = JSON.parse(jsonLine) as {
      mission_id?: string;
      transcript_namespace?: string;
      steps: Array<{ status: string }>;
    };
    assert.ok(payload.mission_id, "run_mission must echo mission_id when memory is enabled");
    assert.equal(
      payload.transcript_namespace,
      `mission:${payload.mission_id}`,
      "compact result must surface the transcript namespace so the agent can recall",
    );

    // The transcript sink is fire-and-forget; runMission returns
    // before the on-disk write necessarily settles. Poll the file
    // directly (the local backend's atomic-rename guarantees a
    // self-consistent snapshot once memory.json exists), so we don't
    // race the writer. Creating a fresh MemoryProvider per poll
    // sidesteps the per-instance load() cache the local backend
    // keeps around (it never reloads after the first read).
    const ns = `mission:${payload.mission_id}`;
    const deadline = Date.now() + 2000;
    let recordCount = 0;
    let reader = null as Awaited<ReturnType<typeof createMemory>>;
    while (Date.now() < deadline) {
      reader = await createMemory(config);
      const status = await reader!.status(ns);
      recordCount = status.recordCount;
      if (recordCount >= 1) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(recordCount >= 1, `expected >=1 transcript entry under ${ns}, got ${recordCount}`);

    // Use a meaningful query token (the step id "noop" appears
    // verbatim inside the serialized transcript JSON) so the
    // tokenized scorer in the local backend returns hits — not the
    // hit-everything empty-query path.
    const hits = await reader!.recall({ query: "noop", namespace: ns, limit: 10 });
    assert.ok(hits.length >= 1, `recall by content should return >=1 hit, got ${hits.length}`);

    // Every recalled entry should carry the transcript tags so a
    // future filter-by-tag UI can locate them efficiently.
    const tagsSeen = new Set<string>();
    for (const h of hits) {
      for (const t of h.tags ?? []) tagsSeen.add(t);
    }
    assert.ok(tagsSeen.has("mission_transcript"), `tags should include 'mission_transcript'; got: ${[...tagsSeen].join(", ")}`);

    // And the content should be JSON-parseable, carrying the
    // mission_id back out the other side (round-trip). The sink
    // packs the per-step snapshot under `step` (not `result`) — see
    // packages/core/src/mission-transcript-sink.ts.
    const firstContent = JSON.parse(hits[0].content) as {
      mission_id: string;
      adapter?: string;
      step: { id: string; status: string; capability: string };
    };
    assert.equal(firstContent.mission_id, payload.mission_id);
    assert.equal(firstContent.adapter, "gemini", "transcript should record the originating adapter");
    assert.equal(firstContent.step.id, "noop");
    assert.equal(firstContent.step.status, "error");
    assert.equal(firstContent.step.capability, "this_capability_does_not_exist");
  } finally {
    // The transcript sink writes are fire-and-forget — give any
    // still-in-flight atomic rename (tmp → final) a moment to settle
    // before we rmdir, otherwise ENOTEMPTY trips the cleanup.
    await new Promise((r) => setTimeout(r, 250));
    await rm(dir, { recursive: true, force: true });
  }
});
