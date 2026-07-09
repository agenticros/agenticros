/**
 * Pause / resume tests for runMission + MissionRegistry.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { runMission, type CapabilityToolBindings, type Mission } from "../mission.js";
import { MissionRegistry } from "../mission-registry.js";
import type { Capability } from "../capabilities.js";

const CAPS: Capability[] = [
  { id: "drive_base", verb: "drive", description: "Drive", source: { kind: "builtin" } },
  { id: "list_topics", verb: "list", description: "List", source: { kind: "builtin" } },
];

const BINDINGS: CapabilityToolBindings = {
  drive_base: {
    tool: "ros2_publish",
    buildArgs: (inputs) => ({ topic: "cmd_vel", msg: inputs }),
  },
  list_topics: {
    tool: "ros2_list_topics",
    buildArgs: () => ({}),
  },
};

test("pause blocks next step until resume", async () => {
  const token = { cancelled: false, paused: true, reason: "human in aisle" };
  const calls: string[] = [];
  const mission: Mission = {
    name: "pause-test",
    steps: [
      { id: "a", capability: "list_topics" },
      { id: "b", capability: "drive_base", inputs: { linear_x: 0.1 } },
    ],
  };

  const runPromise = runMission(mission, CAPS, BINDINGS, async (tool) => {
    calls.push(tool);
    return { text: JSON.stringify({ ok: true }) };
  }, { cancellation: token, mission_id: "mn_pause" });

  // First step should not run while paused — wait a bit then resume.
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(calls.length, 0, "no tools while paused before first step");
  token.paused = false;

  const result = await runPromise;
  assert.equal(result.status, "ok");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls, ["ros2_list_topics", "ros2_publish"]);
});

test("cancel while paused aborts remaining steps", async () => {
  const token = { cancelled: false, paused: true };
  const mission: Mission = {
    steps: [
      { id: "a", capability: "list_topics" },
      { id: "b", capability: "drive_base" },
    ],
  };

  const runPromise = runMission(mission, CAPS, BINDINGS, async () => ({ text: "{}" }), {
    cancellation: token,
  });

  await new Promise((r) => setTimeout(r, 80));
  token.cancelled = true;
  token.paused = false;

  const result = await runPromise;
  assert.equal(result.status, "cancelled");
  assert.ok(result.steps.every((s) => s.status === "cancelled"));
});

test("MissionRegistry pause/resume/cancel", () => {
  const reg = new MissionRegistry();
  const { entry, dispose } = reg.register("mn_1", { name: "t" });
  assert.equal(entry.cancellation.paused, false);

  const p1 = reg.pause("mn_1", "wait");
  assert.equal(p1.found, true);
  assert.equal(p1.alreadyPaused, false);
  assert.equal(entry.cancellation.paused, true);
  assert.equal(entry.cancellation.reason, "wait");

  const p2 = reg.pause("mn_1");
  assert.equal(p2.alreadyPaused, true);

  const r1 = reg.resume("mn_1");
  assert.equal(r1.found, true);
  assert.equal(r1.wasPaused, true);
  assert.equal(entry.cancellation.paused, false);

  assert.equal(reg.pause("missing").found, false);
  assert.equal(reg.resume("missing").found, false);

  reg.pause("mn_1");
  reg.cancel("mn_1", "abort");
  assert.equal(entry.cancellation.cancelled, true);
  assert.equal(entry.cancellation.paused, false);

  dispose();
});
