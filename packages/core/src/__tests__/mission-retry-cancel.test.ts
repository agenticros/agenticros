/**
 * Mission runner v2 — retries / backoff + mid-step cancel for interruptible caps.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  runMission,
  MissionStepAbortedError,
  type CapabilityToolBindings,
  type Mission,
  type MissionToolDispatcher,
} from "../mission.js";
import type { Capability } from "../capabilities.js";

const CAPS: Capability[] = [
  { id: "drive_base", verb: "drive", description: "drive", source: { kind: "builtin" } },
  {
    id: "find_object",
    verb: "find",
    description: "find",
    interruptible: true,
    source: { kind: "builtin" },
  },
  {
    id: "take_snapshot",
    verb: "see",
    description: "see",
    interruptible: false,
    source: { kind: "builtin" },
  },
];

const BINDINGS: CapabilityToolBindings = {
  drive_base: {
    tool: "ros2_publish",
    buildArgs: (inputs) => ({ topic: "cmd_vel", msg: inputs }),
  },
  find_object: {
    tool: "ros2_find_object",
    buildArgs: (inputs) => inputs,
  },
  take_snapshot: {
    tool: "ros2_camera_snapshot",
    buildArgs: () => ({}),
  },
};

test("retry: retries failed step then succeeds", async () => {
  let calls = 0;
  const dispatch: MissionToolDispatcher = async () => {
    calls += 1;
    if (calls < 3) return { text: "transient", isError: true };
    return { text: "ok", outputs: { done: true } };
  };
  const mission: Mission = {
    name: "retry-drive",
    steps: [
      {
        id: "a",
        capability: "drive_base",
        inputs: { linear_x: 0.1 },
        retry: { max_attempts: 3, backoff_ms: 1 },
      },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "ok");
  assert.equal(calls, 3);
  assert.equal(result.steps[0]!.attempts, 3);
  assert.equal(result.steps[0]!.status, "ok");
});

test("retry: exhausts attempts then on_fail=stop", async () => {
  let calls = 0;
  const dispatch: MissionToolDispatcher = async () => {
    calls += 1;
    return { text: "always fail", isError: true };
  };
  const mission: Mission = {
    name: "retry-fail",
    steps: [
      {
        id: "a",
        capability: "drive_base",
        retry: { max_attempts: 2, backoff_ms: 1 },
      },
      { id: "b", capability: "take_snapshot" },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch);
  assert.equal(result.status, "error");
  assert.equal(calls, 2);
  assert.equal(result.steps[0]!.status, "error");
  assert.equal(result.steps[0]!.attempts, 2);
  assert.equal(result.steps[1]!.status, "skipped");
});

test("mid-step cancel: interruptible step aborts via signal", async () => {
  const cancellation = { cancelled: false, reason: "stop find" };
  const dispatch: MissionToolDispatcher = async (_tool, _args, ctx) => {
    // Flip cancel shortly after start; runner polls and aborts.
    setTimeout(() => {
      cancellation.cancelled = true;
    }, 30);
    await new Promise<void>((resolve, reject) => {
      const t = setInterval(() => {
        if (ctx?.signal?.aborted) {
          clearInterval(t);
          reject(new MissionStepAbortedError("find aborted"));
        }
      }, 10);
      setTimeout(() => {
        clearInterval(t);
        resolve();
      }, 5000);
    });
    return { text: "should not finish" };
  };
  const mission: Mission = {
    name: "find-cancel",
    steps: [
      { id: "find", capability: "find_object", inputs: { target: "chair" } },
      { id: "snap", capability: "take_snapshot" },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch, {
    mission_id: "mn_mid",
    cancellation,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.steps[0]!.status, "cancelled");
  assert.equal(result.steps[1]!.status, "cancelled");
});

test("mid-step cancel: non-interruptible finishes current step", async () => {
  const cancellation = { cancelled: false, reason: "stop later" };
  let snapStarted = false;
  const dispatch: MissionToolDispatcher = async (tool) => {
    if (tool === "ros2_camera_snapshot") {
      snapStarted = true;
      setTimeout(() => {
        cancellation.cancelled = true;
      }, 20);
      await new Promise((r) => setTimeout(r, 80));
      return { text: "snap ok", outputs: { ok: true } };
    }
    return { text: "ok" };
  };
  const mission: Mission = {
    name: "snap-then-cancel",
    steps: [
      { id: "snap", capability: "take_snapshot" },
      { id: "drive", capability: "drive_base", inputs: { linear_x: 0.1 } },
    ],
  };
  const result = await runMission(mission, CAPS, BINDINGS, dispatch, {
    mission_id: "mn_nonint",
    cancellation,
  });
  assert.ok(snapStarted);
  assert.equal(result.steps[0]!.status, "ok");
  assert.equal(result.status, "cancelled");
  assert.equal(result.steps[1]!.status, "cancelled");
});
