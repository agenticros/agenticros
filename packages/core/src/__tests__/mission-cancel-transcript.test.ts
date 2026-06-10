/**
 * Unit tests for Phase 1.f mission cancellation + transcripts.
 *
 * What these pin down (one test per behavioural contract the adapters
 * and LLMs depend on):
 *
 *   Cancellation
 *   ------------
 *   - A token flipped BEFORE the first step cancels every step (no
 *     dispatcher call).
 *   - A token flipped between steps lets the in-flight step finish,
 *     then marks the rest "cancelled".
 *   - `MissionResult.status` is "cancelled" when at least one step
 *     was preempted.
 *   - `cancellation_reason` from the token is bubbled into the result.
 *   - The `cancelled` step has `duration_ms=0` and a `message`
 *     containing the reason.
 *
 *   Transcripts
 *   -----------
 *   - The sink fires once per step (including skipped + cancelled).
 *   - Entries carry mission_id, step_index, step_total, adapter, and
 *     a clone of the MissionStepResult.
 *   - A throwing transcript sink does NOT abort the mission (best-effort
 *     contract per the runner's header).
 *   - An async transcript sink that rejects also doesn't propagate.
 *
 *   Registry
 *   --------
 *   - register() returns a usable cancellation token; cancel() flips it.
 *   - cancel() on an unknown id reports found:false (idempotent).
 *   - cancel() twice on the same id is idempotent (no throw, no double
 *     cancellation_reason override unless a new reason was supplied).
 *   - dispose() removes the entry so subsequent cancel() reports found:false.
 *   - generateMissionId() produces unique ids.
 *   - missionTranscriptNamespace(id) === "mission:<id>".
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runMission,
  type CapabilityToolBindings,
  type Mission,
  type MissionToolDispatcher,
  type MissionTranscriptEntry,
} from "../mission.js";
import {
  MissionRegistry,
  generateMissionId,
  missionTranscriptNamespace,
} from "../mission-registry.js";
import type { Capability } from "../capabilities.js";

const CAPS: Capability[] = [
  { id: "drive_base", verb: "drive", description: "drive", source: { kind: "builtin" } },
  { id: "take_snapshot", verb: "see", description: "see", source: { kind: "builtin" } },
];

const BINDINGS: CapabilityToolBindings = {
  drive_base: {
    tool: "ros2_publish",
    buildArgs: (inputs) => ({ topic: "cmd_vel", msg: inputs }),
  },
  take_snapshot: {
    tool: "ros2_camera_snapshot",
    buildArgs: () => ({}),
  },
};

function makeDispatcher(
  responses: Record<string, { text: string; outputs?: Record<string, unknown>; isError?: boolean }>,
  log: Array<{ tool: string; args: Record<string, unknown> }>,
): MissionToolDispatcher {
  return async (tool, args) => {
    log.push({ tool, args });
    return responses[tool] ?? { text: `(no stub for ${tool})` };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation
// ─────────────────────────────────────────────────────────────────────────────

test("cancellation: token flipped before run cancels every step (zero dispatcher calls)", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({}, log);
  const cancellation = { cancelled: true, reason: "user pressed stop" };
  const mission: Mission = {
    name: "drive 3x",
    steps: [
      { id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } },
      { id: "b", capability: "drive_base", inputs: { linear_x: 0.2 } },
      { id: "c", capability: "drive_base", inputs: { linear_x: 0.3 } },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch, {
    mission_id: "mn_test",
    cancellation,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.steps_run, 0, "no steps executed when cancelled up-front");
  assert.equal(log.length, 0);
  assert.equal(result.cancellation_reason, "user pressed stop");
  for (const s of result.steps) {
    assert.equal(s.status, "cancelled");
    assert.equal(s.duration_ms, 0);
    assert.ok(s.message?.includes("user pressed stop"));
  }
});

test("cancellation: token flipped mid-run preempts only remaining steps", async () => {
  // The dispatcher flips the token while step "a" is in flight. Step
  // "a" should still finish ok; "b" and "c" should be cancelled.
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const cancellation = { cancelled: false };
  const dispatch: MissionToolDispatcher = async (tool, args) => {
    log.push({ tool, args });
    if (tool === "ros2_publish" && (args as Record<string, unknown>).msg) {
      const msg = (args as Record<string, unknown>).msg as Record<string, unknown>;
      if (msg.linear_x === 0.1) cancellation.cancelled = true;
    }
    return { text: "ok" };
  };
  const mission: Mission = {
    steps: [
      { id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } },
      { id: "b", capability: "drive_base", inputs: { linear_x: 0.2 } },
      { id: "c", capability: "drive_base", inputs: { linear_x: 0.3 } },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch, {
    mission_id: "mn_test",
    cancellation,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.steps[0].status, "ok", "the in-flight step finished");
  assert.equal(result.steps[1].status, "cancelled");
  assert.equal(result.steps[2].status, "cancelled");
  assert.equal(result.steps_run, 1);
  assert.equal(log.length, 1, "only step 'a' hit the dispatcher");
});

test("cancellation: cancellation_reason defaults to 'cancelled' when token doesn't carry one", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({}, log);
  const mission: Mission = { steps: [{ id: "a", capability: "drive_base" }] };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch, {
    mission_id: "x",
    cancellation: { cancelled: true },
  });
  assert.equal(result.cancellation_reason, "cancelled");
});

test("cancellation: mission_id round-trips into MissionResult", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  const result = await runMission(
    { steps: [{ id: "a", capability: "drive_base" }] },
    CAPS,
    BINDINGS,
    dispatch,
    { mission_id: "mn_round_trip" },
  );
  assert.equal(result.mission_id, "mn_round_trip");
});

// ─────────────────────────────────────────────────────────────────────────────
// Transcripts
// ─────────────────────────────────────────────────────────────────────────────

test("transcript: sink fires once per step including ok / cancelled", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const cancellation = { cancelled: false };
  const dispatch: MissionToolDispatcher = async (tool, args) => {
    log.push({ tool, args });
    cancellation.cancelled = true;
    return { text: "ok" };
  };
  const entries: MissionTranscriptEntry[] = [];
  const transcript = (e: MissionTranscriptEntry) => {
    entries.push(e);
  };
  const mission: Mission = {
    name: "drive then snap",
    steps: [
      { id: "drive", capability: "drive_base", inputs: { linear_x: 0.1 } },
      { id: "snap", capability: "take_snapshot" },
    ],
  };
  await runMission(mission, CAPS, BINDINGS, dispatch, {
    mission_id: "mn_t",
    cancellation,
    transcript,
    adapter: "test-adapter",
  });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].step_index, 0);
  assert.equal(entries[0].step_total, 2);
  assert.equal(entries[0].mission_id, "mn_t");
  assert.equal(entries[0].adapter, "test-adapter");
  assert.equal(entries[0].mission_name, "drive then snap");
  assert.equal(entries[0].result.status, "ok");
  assert.equal(entries[1].result.status, "cancelled");
});

test("transcript: a throwing sink does NOT abort the mission (best-effort)", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  const result = await runMission(
    { steps: [{ id: "a", capability: "drive_base" }] },
    CAPS,
    BINDINGS,
    dispatch,
    {
      mission_id: "mn_t",
      transcript: () => {
        throw new Error("transcript backend exploded");
      },
    },
  );
  assert.equal(result.status, "ok", "mission must complete despite sink throw");
  assert.equal(result.steps_run, 1);
});

test("transcript: an async sink that rejects also does NOT surface as unhandled rejection", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  const result = await runMission(
    { steps: [{ id: "a", capability: "drive_base" }] },
    CAPS,
    BINDINGS,
    dispatch,
    {
      mission_id: "mn_t",
      transcript: async () => {
        throw new Error("async sink rejection");
      },
    },
  );
  assert.equal(result.status, "ok");
  // If the runner forwards the rejection up the event loop, node:test
  // will mark this whole run as failed via process.on('unhandledRejection').
  // A clean exit here is the contract.
});

// ─────────────────────────────────────────────────────────────────────────────
// MissionRegistry + helpers
// ─────────────────────────────────────────────────────────────────────────────

test("registry: register returns a fresh cancellation token; cancel flips it", () => {
  const reg = new MissionRegistry();
  const { entry, dispose } = reg.register("mn_1", { name: "test" });
  assert.equal(entry.cancellation.cancelled, false);
  const { found, alreadyCancelled } = reg.cancel("mn_1", "user request");
  assert.equal(found, true);
  assert.equal(alreadyCancelled, false);
  assert.equal(entry.cancellation.cancelled, true);
  assert.equal(entry.cancellation.reason, "user request");
  dispose();
});

test("registry: cancel on unknown id reports found:false (no throw)", () => {
  const reg = new MissionRegistry();
  const r = reg.cancel("nope");
  assert.equal(r.found, false);
});

test("registry: cancel is idempotent — second call says alreadyCancelled", () => {
  const reg = new MissionRegistry();
  const { dispose } = reg.register("mn_dup");
  const first = reg.cancel("mn_dup", "r1");
  const second = reg.cancel("mn_dup", "r2");
  assert.equal(first.alreadyCancelled, false);
  assert.equal(second.alreadyCancelled, true);
  // Second cancel may update the reason — that's a feature, not a bug
  // (e.g. "user retry — they really mean it"). Just assert no throw.
  dispose();
});

test("registry: dispose removes the entry so subsequent cancel reports found:false", () => {
  const reg = new MissionRegistry();
  const { dispose } = reg.register("mn_disp");
  dispose();
  assert.equal(reg.cancel("mn_disp").found, false);
  assert.equal(reg.has("mn_disp"), false);
});

test("registry: list returns a defensive copy (mutation doesn't bleed back)", () => {
  const reg = new MissionRegistry();
  reg.register("mn_l1", { name: "one" });
  reg.register("mn_l2", { name: "two" });
  const snapshot = reg.list();
  assert.equal(snapshot.length, 2);
  snapshot[0].cancellation.cancelled = true;
  assert.equal(reg.has("mn_l1"), true);
  // The internal entry should NOT have been mutated by tampering with
  // the snapshot's cancellation block.
  const second = reg.list().find((e) => e.mission_id === "mn_l1");
  assert.equal(second?.cancellation.cancelled, false);
});

test("registry: generateMissionId produces unique opaque ids with a stable prefix", () => {
  const ids = new Set<string>();
  for (let i = 0; i < 16; i++) ids.add(generateMissionId());
  assert.equal(ids.size, 16, "16 calls must produce 16 distinct ids");
  for (const id of ids) {
    assert.match(id, /^mn_/, `id "${id}" must carry the mn_ prefix`);
  }
});

test("registry: missionTranscriptNamespace produces the canonical 'mission:<id>' shape", () => {
  assert.equal(missionTranscriptNamespace("abc"), "mission:abc");
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end glue: registry + runner + custom sink, no memory needed
// ─────────────────────────────────────────────────────────────────────────────

test("end-to-end: register → run → cancel via registry → transcripts captured", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const reg = new MissionRegistry();
  const id = generateMissionId();
  const { entry, dispose } = reg.register(id, { name: "demo" });

  let count = 0;
  const dispatch: MissionToolDispatcher = async (tool, args) => {
    log.push({ tool, args });
    count += 1;
    // Cancel after the first step finishes — gives us a deterministic
    // mid-run cancellation without races.
    if (count === 1) reg.cancel(id, "operator stop");
    return { text: "ok" };
  };

  const transcriptEntries: MissionTranscriptEntry[] = [];
  try {
    const result = await runMission(
      {
        name: "demo",
        steps: [
          { id: "s1", capability: "drive_base", inputs: { linear_x: 0.1 } },
          { id: "s2", capability: "drive_base", inputs: { linear_x: 0.2 } },
          { id: "s3", capability: "drive_base", inputs: { linear_x: 0.3 } },
        ],
      },
      CAPS,
      BINDINGS,
      dispatch,
      {
        mission_id: id,
        cancellation: entry.cancellation,
        transcript: (e) => {
          transcriptEntries.push(e);
        },
        adapter: "e2e-test",
      },
    );
    assert.equal(result.status, "cancelled");
    assert.equal(result.mission_id, id);
    assert.equal(result.cancellation_reason, "operator stop");
    assert.equal(transcriptEntries.length, 3, "one transcript entry per step");
    assert.deepEqual(
      transcriptEntries.map((e) => e.result.status),
      ["ok", "cancelled", "cancelled"],
    );
  } finally {
    dispose();
  }
  assert.equal(reg.has(id), false, "dispose must remove the entry");
});
