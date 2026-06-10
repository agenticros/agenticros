/**
 * Unit tests for the Phase 1.c mission runner.
 *
 * These tests don't need a live transport — they exercise the runner with
 * a fake dispatcher that records the tool calls and returns canned
 * responses. The goal is to pin down the behaviour the LLM relies on:
 *
 *   - Steps execute in declaration order.
 *   - `{{stepId.outputs.field}}` resolves from prior step outputs.
 *   - Single-template strings preserve type (numeric outputs stay numeric).
 *   - Unknown capabilities fail with a clear, actionable message.
 *   - Capabilities without a binding fail with a clear, actionable message.
 *   - `on_fail: "continue"` skips ahead instead of aborting.
 *   - `on_fail: "stop"` (default) aborts and marks remaining steps "skipped".
 *   - Tool exceptions are caught and converted to step errors.
 *   - Tool isError flag propagates to step status.
 *   - JSON outputs are auto-parsed from the text payload when the binding
 *     doesn't supply a parseOutputs hook.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runMission,
  type CapabilityToolBindings,
  type Mission,
  type MissionToolDispatcher,
} from "../mission.js";
import type { Capability } from "../capabilities.js";

const CAPS: Capability[] = [
  {
    id: "drive_base",
    verb: "drive",
    description: "drive",
    source: { kind: "builtin" },
  },
  {
    id: "take_snapshot",
    verb: "see",
    description: "see",
    source: { kind: "builtin" },
  },
  {
    id: "find_object",
    verb: "find",
    description: "find",
    source: { kind: "skill", skillId: "find", package: "agenticros-skill-find" },
  },
  {
    id: "no_binding_cap",
    verb: "demo",
    description: "Registered but has no binding entry.",
    source: { kind: "skill", skillId: "demo", package: "agenticros-skill-demo" },
  },
];

function makeDispatcher(
  responses: Record<string, { text: string; outputs?: Record<string, unknown>; isError?: boolean } | Error>,
  log: Array<{ tool: string; args: Record<string, unknown> }>,
): MissionToolDispatcher {
  return async (tool, args) => {
    log.push({ tool, args });
    const r = responses[tool];
    if (!r) return { text: `(no response stub for ${tool})` };
    if (r instanceof Error) throw r;
    return r;
  };
}

const BINDINGS: CapabilityToolBindings = {
  drive_base: {
    tool: "ros2_publish",
    buildArgs: (inputs) => ({
      topic: "cmd_vel",
      msg_type: "geometry_msgs/Twist",
      msg: {
        linear: { x: inputs.linear_x ?? 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: inputs.angular_z ?? 0 },
      },
    }),
  },
  take_snapshot: {
    tool: "ros2_camera_snapshot",
    buildArgs: () => ({}),
  },
  find_object: {
    tool: "ros2_find_object",
    buildArgs: (inputs) => ({ target: inputs.target, timeout_s: inputs.timeout_s ?? 20 }),
  },
};

test("mission: empty mission returns ok with no steps", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({}, log);
  const result = await runMission({ steps: [] }, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "ok");
  assert.equal(result.steps_total, 0);
  assert.equal(result.steps_run, 0);
  assert.equal(log.length, 0);
});

test("mission: single-step success dispatches the right tool with the right args", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    { ros2_publish: { text: "Published." } },
    log,
  );
  const mission: Mission = {
    name: "drive forward",
    steps: [{ id: "go", capability: "drive_base", inputs: { linear_x: 0.3 } }],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "ok");
  assert.equal(result.steps_run, 1);
  assert.equal(log.length, 1);
  assert.equal(log[0].tool, "ros2_publish");
  assert.deepEqual(log[0].args, {
    topic: "cmd_vel",
    msg_type: "geometry_msgs/Twist",
    msg: { linear: { x: 0.3, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
  });
});

test("mission: template substitution preserves numeric type for whole-string refs", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    {
      ros2_find_object: {
        text: '{"found": true, "horizontal_offset": 0.42}',
      },
      ros2_publish: { text: "Published." },
    },
    log,
  );
  const mission: Mission = {
    name: "find chair then nudge",
    steps: [
      { id: "find", capability: "find_object", inputs: { target: "chair" } },
      {
        id: "nudge",
        capability: "drive_base",
        inputs: { linear_x: 0.2, angular_z: "{{find.outputs.horizontal_offset}}" },
      },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "ok", result.summary);
  assert.equal(log.length, 2);
  // The crucial assertion: angular_z is a NUMBER (0.42), not the string "0.42".
  const nudgeArgs = log[1].args;
  const msg = nudgeArgs.msg as { angular: { z: unknown } };
  assert.equal(msg.angular.z, 0.42);
  assert.equal(typeof msg.angular.z, "number");
});

test("mission: template substitution works inside string interpolation", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  // Add a capability whose buildArgs uses a string input.
  const bindings: CapabilityToolBindings = {
    ...BINDINGS,
    take_snapshot: {
      tool: "ros2_camera_snapshot",
      buildArgs: (inputs) => ({ label: inputs.label }),
    },
    find_object: {
      tool: "ros2_find_object",
      buildArgs: (inputs) => ({ target: inputs.target }),
    },
  };
  const dispatch = makeDispatcher(
    {
      ros2_find_object: { text: '{"found": true, "object": "chair"}' },
      ros2_camera_snapshot: { text: "Snapshot taken." },
    },
    log,
  );
  const mission: Mission = {
    steps: [
      { id: "find", capability: "find_object", inputs: { target: "chair" } },
      {
        id: "snap",
        capability: "take_snapshot",
        inputs: { label: "After finding a {{find.outputs.object}}." },
      },
    ],
  };
  const result = await runMission(mission, CAPS, bindings, dispatch);
  assert.equal(result.status, "ok");
  assert.equal(log[1].args.label, "After finding a chair.");
});

test("mission: unknown capability fails with actionable message", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({}, log);
  const result = await runMission(
    { steps: [{ id: "x", capability: "doesnt_exist" }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "error");
  assert.equal(result.steps[0].status, "error");
  assert.ok(result.steps[0].error?.includes("ros2_list_capabilities"));
  assert.equal(log.length, 0);
});

test("mission: registered capability without a binding fails clearly", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({}, log);
  const result = await runMission(
    { steps: [{ id: "x", capability: "no_binding_cap" }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "error");
  assert.ok(result.steps[0].error?.includes("no mission-runner tool binding"));
  assert.equal(log.length, 0);
});

test("mission: on_fail=stop (default) aborts and skips remaining steps", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    {
      ros2_find_object: { text: "Object not found.", isError: true },
      ros2_publish: { text: "Published." },
    },
    log,
  );
  const mission: Mission = {
    steps: [
      { id: "find", capability: "find_object", inputs: { target: "chair" } },
      { id: "go", capability: "drive_base", inputs: { linear_x: 0.2 } },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "error");
  assert.equal(result.steps[0].status, "error");
  assert.equal(result.steps[1].status, "skipped");
  assert.equal(result.steps_run, 1, "only one step actually ran");
  assert.equal(log.length, 1, "drive should never have been dispatched");
});

test("mission: on_fail=continue runs subsequent steps even after failure", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    {
      ros2_find_object: { text: "Object not found.", isError: true },
      ros2_publish: { text: "Published." },
    },
    log,
  );
  const mission: Mission = {
    steps: [
      { id: "find", capability: "find_object", inputs: { target: "chair" }, on_fail: "continue" },
      { id: "go", capability: "drive_base", inputs: { linear_x: 0.2 } },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "error", "overall status remains error if any step failed");
  assert.equal(result.steps[0].status, "error");
  assert.equal(result.steps[1].status, "ok");
  assert.equal(result.steps_run, 2);
  assert.equal(log.length, 2);
});

test("mission: tool exceptions are caught and surfaced as step errors", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    { ros2_publish: new Error("transport disconnected") },
    log,
  );
  const result = await runMission(
    {
      steps: [{ id: "x", capability: "drive_base", inputs: { linear_x: 0.1 } }],
    },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "error");
  assert.equal(result.steps[0].error, "transport disconnected");
});

test("mission: outputs are auto-parsed from JSON text when binding has no parseOutputs", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    {
      ros2_find_object: { text: '{"found": true, "horizontal_offset": 0.1}' },
    },
    log,
  );
  const result = await runMission(
    { steps: [{ id: "find", capability: "find_object", inputs: { target: "chair" } }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "ok");
  assert.deepEqual(result.steps[0].outputs, { found: true, horizontal_offset: 0.1 });
});

test("mission: explicit outputs from dispatcher take precedence over auto-parse", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    {
      ros2_find_object: {
        text: '{"found": true, "horizontal_offset": 0.1}',
        outputs: { found: true, horizontal_offset: 0.9, source: "explicit" },
      },
    },
    log,
  );
  const result = await runMission(
    { steps: [{ id: "find", capability: "find_object", inputs: { target: "chair" } }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.steps[0].outputs?.source, "explicit");
  assert.equal(result.steps[0].outputs?.horizontal_offset, 0.9);
});

test("mission: summary line reports success counts when all green", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  const result = await runMission(
    {
      name: "patrol",
      steps: [
        { id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } },
        { id: "b", capability: "drive_base", inputs: { linear_x: 0.0 } },
      ],
    },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "ok");
  assert.ok(result.summary.includes("patrol"));
  assert.ok(result.summary.includes("2/2"));
});

test("mission: summary line names the failed step when any step errored", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher(
    { ros2_publish: { text: "boom", isError: true } },
    log,
  );
  const result = await runMission(
    {
      name: "wave-and-go",
      steps: [{ id: "go", capability: "drive_base", inputs: { linear_x: 0.1 } }],
    },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "error");
  assert.ok(result.summary.includes('"go"'));
});

// --- Phase 1.d: multi-robot routing tests ---
//
// These pin down the robot_id injection contract that adapters depend on.
// The runner is transport-agnostic so it doesn't validate the id itself —
// it just makes sure the right id ends up in toolArgs.robot_id for every
// dispatched call, following the documented precedence:
//   1. binding.buildArgs set it    (left alone)
//   2. step.inputs.robot_id        (per-step override)
//   3. mission.robot_id            (mission-level default)
//   4. none                        (no robot_id key on toolArgs)
//
// Empty/whitespace strings at levels 2-3 are treated as "not set" so
// agents can leave them empty without accidentally pinning to "".

test("mission: mission.robot_id is injected into every dispatched tool's args", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  const result = await runMission(
    {
      name: "drive-alpha",
      robot_id: "alpha",
      steps: [
        { id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } },
        { id: "b", capability: "drive_base", inputs: { linear_x: 0.2 } },
      ],
    },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(result.status, "ok");
  assert.equal(log.length, 2);
  for (const entry of log) {
    assert.equal(entry.args.robot_id, "alpha", `every dispatched tool call must carry robot_id=alpha (got ${JSON.stringify(entry.args.robot_id)})`);
  }
  assert.equal(result.robot_id, "alpha", "result should surface the mission-level robot_id");
});

test("mission: per-step inputs.robot_id overrides mission.robot_id for that step", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  await runMission(
    {
      robot_id: "alpha",
      steps: [
        { id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } },
        { id: "b", capability: "drive_base", inputs: { linear_x: 0.2, robot_id: "beta" } },
        { id: "c", capability: "drive_base", inputs: { linear_x: 0.3 } },
      ],
    },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(log[0].args.robot_id, "alpha", "step a falls back to mission default");
  assert.equal(log[1].args.robot_id, "beta", "step b's inputs.robot_id wins");
  assert.equal(log[2].args.robot_id, "alpha", "step c falls back to mission default again");
});

test("mission: no robot_id at any level leaves toolArgs untouched", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  await runMission(
    { steps: [{ id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(log.length, 1);
  assert.ok(!("robot_id" in log[0].args), "robot_id must not be added when no level set it");
});

test("mission: empty / whitespace robot_id strings are treated as unset", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  await runMission(
    {
      robot_id: "   ",
      steps: [
        { id: "a", capability: "drive_base", inputs: { linear_x: 0.1, robot_id: "" } },
        { id: "b", capability: "drive_base", inputs: { linear_x: 0.2 } },
      ],
    },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.ok(!("robot_id" in log[0].args), "step-level empty string falls through to mission, mission's whitespace = unset");
  assert.ok(!("robot_id" in log[1].args), "no override + whitespace mission = unset");
});

test("mission: binding-supplied robot_id wins over both inputs and mission", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  // A binding that hard-codes robot_id (a rare but legal pattern — e.g. a
  // capability that targets a fixed companion robot regardless of the
  // mission default).
  const bindings: CapabilityToolBindings = {
    ...BINDINGS,
    drive_base: {
      tool: "ros2_publish",
      buildArgs: (inputs) => ({
        topic: "cmd_vel",
        robot_id: "binding-pinned",
        msg: { linear: { x: inputs.linear_x ?? 0 } },
      }),
    },
  };
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  await runMission(
    {
      robot_id: "alpha",
      steps: [{ id: "a", capability: "drive_base", inputs: { linear_x: 0.1, robot_id: "beta" } }],
    },
    CAPS,
    bindings,
    dispatch,
  );
  assert.equal(log[0].args.robot_id, "binding-pinned", "binding's robot_id must not be overwritten");
});

test("mission: result.robot_id reflects the mission-level default (empty when unset)", async () => {
  const log: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = makeDispatcher({ ros2_publish: { text: "ok" } }, log);
  const a = await runMission(
    { robot_id: "alpha", steps: [{ id: "x", capability: "drive_base", inputs: { linear_x: 0.1 } }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  const b = await runMission(
    { steps: [{ id: "x", capability: "drive_base", inputs: { linear_x: 0.1 } }] },
    CAPS,
    BINDINGS,
    dispatch,
  );
  assert.equal(a.robot_id, "alpha");
  assert.equal(b.robot_id, "");
});
