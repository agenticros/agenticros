/**
 * Unit tests for the CLI's robot-config persistence layer.
 *
 * What these tests pin down (each one corresponds to a real failure mode
 * the persistence layer has to defend against in production):
 *
 *   - readRobots: explicit `robots[]` wins; falls back to a legacy
 *     `config.robot` when the array is empty; reports an empty list +
 *     `from: 'none'` when neither is set.
 *   - addRobot: legacy single-robot config is promoted into `robots[0]`
 *     on first multi-robot write, marked default so the prior behavior
 *     ("the single robot is active") is preserved.
 *   - addRobot is idempotent — re-adding the same id updates the entry
 *     in place but reports `added: false`.
 *   - setDefault: switches the default flag across entries (exactly one
 *     robot is default at a time). Throws with a self-correcting error
 *     when the id is unknown.
 *   - removeRobot: idempotent; leaves an empty array (not undefined) so
 *     the core resolver re-falls-back to legacy `config.robot`.
 *
 * The tests operate on plain config objects — never touching the
 * filesystem — so they're isolation-safe.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addRobot,
  clearTransportForRobot,
  getActiveRobotId,
  readRobots,
  removeRobot,
  setDefaultRobot,
  setTransportForRobot,
  type RobotEntry,
} from "../util/robot-config.js";

test("robot-config: readRobots falls back to legacy config.robot when robots[] is empty", () => {
  const obj = { robot: { name: "Spot", namespace: "robot-alpha", cameraTopic: "/cam" } };
  const { robots, from } = readRobots(obj);
  assert.equal(from, "legacy");
  assert.equal(robots.length, 1);
  assert.equal(robots[0].id, "robot-alpha", "id derives from namespace");
  assert.equal(robots[0].name, "Spot");
  assert.equal(robots[0].cameraTopic, "/cam");
});

test("robot-config: readRobots prefers explicit robots[] over legacy config.robot", () => {
  const obj = {
    robot: { name: "Legacy", namespace: "legacy-ns" },
    robots: [{ id: "alpha", name: "Alpha", namespace: "alpha-ns" }],
  };
  const { robots, from } = readRobots(obj);
  assert.equal(from, "explicit");
  assert.equal(robots.length, 1);
  assert.equal(robots[0].id, "alpha");
});

test("robot-config: readRobots returns empty + from='none' when nothing is configured", () => {
  const { robots, from } = readRobots({});
  assert.equal(from, "none");
  assert.deepEqual(robots, []);
});

test("robot-config: addRobot promotes legacy config.robot into robots[0] on first multi-robot write", () => {
  const obj: Record<string, unknown> = {
    robot: { name: "Legacy", namespace: "legacy-ns", cameraTopic: "/legacy/cam" },
  };
  const result = addRobot({ id: "beta", name: "Beta", namespace: "beta-ns" }, { obj });
  assert.equal(result.added, true);
  assert.equal(result.promotedLegacy, true, "legacy.robot must be promoted on first add");
  assert.equal(result.robots.length, 2);
  assert.equal(result.robots[0].id, "legacy-ns");
  assert.equal(
    (result.robots[0] as { default?: boolean }).default,
    true,
    "promoted legacy entry stays default so the prior single-robot behavior is preserved",
  );
  assert.equal(result.robots[1].id, "beta");
  assert.notEqual(
    (result.robots[1] as { default?: boolean }).default,
    true,
    "new entry isn't default unless asked",
  );
});

test("robot-config: addRobot is idempotent — re-adding the same id updates in place and reports added=false", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", name: "Old", namespace: "alpha-ns" }],
  };
  const result = addRobot({ id: "alpha", name: "New", namespace: "alpha-ns", cameraTopic: "/cam" }, { obj });
  assert.equal(result.added, false, "re-adding same id must not double-count");
  assert.equal(result.robots.length, 1);
  assert.equal(result.robots[0].name, "New", "name must be updated in place");
  assert.equal(result.robots[0].cameraTopic, "/cam");
});

test("robot-config: addRobot with setDefault=true demotes the previous default", () => {
  const obj: Record<string, unknown> = {
    robots: [
      { id: "alpha", namespace: "alpha-ns", default: true },
      { id: "beta", namespace: "beta-ns" },
    ],
  };
  const result = addRobot({ id: "gamma", namespace: "gamma-ns" }, { setDefault: true, obj });
  assert.equal(result.added, true);
  const defaults = result.robots.filter(
    (r) => (r as { default?: boolean }).default === true,
  );
  assert.equal(defaults.length, 1, "exactly one robot must be default at a time");
  assert.equal(defaults[0].id, "gamma", "gamma should be the new default");
});

test("robot-config: removeRobot leaves an empty array so legacy fallback can resume", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
    robot: { name: "Legacy", namespace: "legacy-ns" },
  };
  const result = removeRobot("alpha", obj);
  assert.equal(result.removed, true);
  assert.deepEqual(result.robots, [], "robots[] should be empty after removing the last entry");
  // And reading again should now surface the legacy fallback.
  const { from, robots } = readRobots(obj);
  assert.equal(from, "legacy");
  assert.equal(robots.length, 1);
  assert.equal(robots[0].id, "legacy-ns");
});

test("robot-config: removeRobot is idempotent and reports removed=false for unknown ids", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
  };
  const result = removeRobot("no-such-robot", obj);
  assert.equal(result.removed, false);
  assert.equal(result.robots.length, 1, "robots[] must be untouched on no-op remove");
});

test("robot-config: setDefaultRobot swaps the default flag and only ever marks one robot default", () => {
  const obj: Record<string, unknown> = {
    robots: [
      { id: "alpha", namespace: "alpha-ns", default: true },
      { id: "beta", namespace: "beta-ns" },
    ],
  };
  const { robots } = setDefaultRobot("beta", obj);
  const defaults = robots.filter((r) => (r as { default?: boolean }).default === true);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].id, "beta");
  // Alpha must have been demoted (no leftover default flag).
  const alpha = robots.find((r) => r.id === "alpha");
  assert.equal((alpha as { default?: boolean } | undefined)?.default, undefined);
});

test("robot-config: setDefaultRobot promotes legacy then sets default on the named entry", () => {
  const obj: Record<string, unknown> = {
    robot: { namespace: "legacy-ns", name: "Legacy" },
  };
  // Add a second robot first.
  addRobot({ id: "beta", namespace: "beta-ns" }, { obj });
  // Now set the legacy one (now promoted into robots[]) as default.
  const { robots, promotedLegacy } = setDefaultRobot("legacy-ns", obj);
  assert.equal(promotedLegacy, false, "legacy was already promoted by the earlier addRobot");
  const defaults = robots.filter((r) => (r as { default?: boolean }).default === true);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].id, "legacy-ns");
});

test("robot-config: setDefaultRobot throws a self-correcting error when the id is unknown", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
  };
  assert.throws(
    () => setDefaultRobot("no-such-robot", obj),
    /Unknown robot id "no-such-robot".*Known: alpha/,
  );
});

test("robot-config: getActiveRobotId picks the default-flagged entry over the first", () => {
  const obj = {
    robots: [
      { id: "alpha", namespace: "alpha-ns" },
      { id: "beta", namespace: "beta-ns", default: true },
    ],
  };
  assert.equal(getActiveRobotId(obj), "beta");
});

test("robot-config: getActiveRobotId falls back to the first robot when no default is flagged", () => {
  const obj = {
    robots: [
      { id: "alpha", namespace: "alpha-ns" },
      { id: "beta", namespace: "beta-ns" },
    ],
  };
  assert.equal(getActiveRobotId(obj), "alpha");
});

test("robot-config: getActiveRobotId falls back to legacy when robots[] is empty", () => {
  const obj = { robot: { namespace: "legacy-ns" } };
  assert.equal(getActiveRobotId(obj), "legacy-ns");
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-robot transport override (CLI persistence layer)
// ─────────────────────────────────────────────────────────────────────────────

test("robot-config: readRobots surfaces the per-robot transport override verbatim", () => {
  const obj = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        transport: { mode: "zenoh", zenoh: { routerEndpoint: "ws://farm:10000" } },
      },
    ],
  };
  const { robots } = readRobots(obj);
  assert.deepEqual(robots[0].transport, {
    mode: "zenoh",
    zenoh: { routerEndpoint: "ws://farm:10000" },
  });
});

test("robot-config: addRobot writes transport on a new entry when provided", () => {
  const obj: Record<string, unknown> = {};
  const result = addRobot(
    {
      id: "alpha",
      namespace: "alpha-ns",
      transport: { mode: "zenoh", zenoh: { routerEndpoint: "ws://farm:10000" } },
    },
    { obj },
  );
  assert.equal(result.added, true);
  assert.deepEqual((result.robots[0] as RobotEntry).transport, {
    mode: "zenoh",
    zenoh: { routerEndpoint: "ws://farm:10000" },
  });
});

test("robot-config: addRobot preserves a prior transport on update when --transport is omitted", () => {
  // This is the critical UX invariant: running `agenticros robots add alpha`
  // again (e.g. to change the display name) must NOT silently drop a
  // previously-configured per-robot transport override.
  const obj: Record<string, unknown> = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        name: "Old",
        transport: { mode: "local", local: { domainId: 5 } },
      },
    ],
  };
  const result = addRobot({ id: "alpha", name: "New", namespace: "alpha-ns" }, { obj });
  assert.equal(result.added, false);
  assert.equal((result.robots[0] as RobotEntry).name, "New");
  assert.deepEqual(
    (result.robots[0] as RobotEntry).transport,
    { mode: "local", local: { domainId: 5 } },
    "prior transport must survive a name-only update",
  );
});

test("robot-config: addRobot replaces transport on update when --transport is supplied", () => {
  const obj: Record<string, unknown> = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        transport: { mode: "local", local: { domainId: 5 } },
      },
    ],
  };
  const result = addRobot(
    {
      id: "alpha",
      namespace: "alpha-ns",
      transport: { mode: "zenoh", zenoh: { routerEndpoint: "ws://farm:10000" } },
    },
    { obj },
  );
  assert.equal(result.added, false);
  assert.deepEqual((result.robots[0] as RobotEntry).transport, {
    mode: "zenoh",
    zenoh: { routerEndpoint: "ws://farm:10000" },
  });
});

test("robot-config: setTransportForRobot applies an override to an existing robot", () => {
  const obj: Record<string, unknown> = {
    robots: [
      { id: "alpha", namespace: "alpha-ns" },
      { id: "beta", namespace: "beta-ns" },
    ],
  };
  const { robots, promotedLegacy } = setTransportForRobot(
    "beta",
    { mode: "zenoh", zenoh: { routerEndpoint: "ws://farm:10000" } },
    obj,
  );
  assert.equal(promotedLegacy, false);
  const beta = robots.find((r) => r.id === "beta")!;
  assert.deepEqual(beta.transport, {
    mode: "zenoh",
    zenoh: { routerEndpoint: "ws://farm:10000" },
  });
  // Alpha must be untouched.
  const alpha = robots.find((r) => r.id === "alpha")!;
  assert.equal(alpha.transport, undefined);
});

test("robot-config: setTransportForRobot promotes legacy first, then targets the promoted entry", () => {
  const obj: Record<string, unknown> = {
    robot: { namespace: "legacy-ns", name: "Legacy" },
  };
  const { robots, promotedLegacy } = setTransportForRobot(
    "legacy-ns",
    { mode: "rosbridge", rosbridge: { url: "ws://10.0.0.5:9090" } },
    obj,
  );
  assert.equal(promotedLegacy, true);
  assert.equal(robots.length, 1);
  assert.equal(robots[0].id, "legacy-ns");
  assert.deepEqual(robots[0].transport, {
    mode: "rosbridge",
    rosbridge: { url: "ws://10.0.0.5:9090" },
  });
});

test("robot-config: setTransportForRobot throws a self-correcting error on unknown id", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
  };
  assert.throws(
    () => setTransportForRobot("no-such-robot", { mode: "zenoh" }, obj),
    /Unknown robot id "no-such-robot".*Known: alpha/,
  );
});

test("robot-config: clearTransportForRobot removes a previously-set override", () => {
  const obj: Record<string, unknown> = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        transport: { mode: "local", local: { domainId: 5 } },
      },
    ],
  };
  const { cleared, robots } = clearTransportForRobot("alpha", obj);
  assert.equal(cleared, true);
  assert.equal((robots[0] as RobotEntry).transport, undefined);
});

test("robot-config: clearTransportForRobot is idempotent (cleared=false when no prior override)", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
  };
  const { cleared } = clearTransportForRobot("alpha", obj);
  assert.equal(cleared, false);
});

test("robot-config: clearTransportForRobot throws on unknown id", () => {
  const obj: Record<string, unknown> = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
  };
  assert.throws(
    () => clearTransportForRobot("no-such-robot", obj),
    /Unknown robot id "no-such-robot"/,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.e — kind / sensors / capabilities on RobotEntry
// ─────────────────────────────────────────────────────────────────────────────

test("robot-config: readRobots surfaces kind / sensors / capabilities verbatim", () => {
  const obj = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        kind: "arm",
        sensors: { has_realsense: true, has_arm: true },
        capabilities: ["arm_grasp", "drive_base"],
      },
    ],
  };
  const { robots } = readRobots(obj);
  assert.equal(robots[0].kind, "arm");
  assert.deepEqual(robots[0].sensors, { has_realsense: true, has_arm: true });
  assert.deepEqual(robots[0].capabilities, ["arm_grasp", "drive_base"]);
});

test("robot-config: addRobot writes kind / sensors / capabilities on a new entry", () => {
  const obj: Record<string, unknown> = {};
  const result = addRobot(
    {
      id: "alpha",
      namespace: "alpha-ns",
      kind: "drone",
      sensors: { has_lidar: true },
      capabilities: ["fly_to", "take_snapshot"],
    },
    { obj },
  );
  assert.equal(result.added, true);
  const written = result.robots[0] as RobotEntry;
  assert.equal(written.kind, "drone");
  assert.deepEqual(written.sensors, { has_lidar: true });
  assert.deepEqual(written.capabilities, ["fly_to", "take_snapshot"]);
});

test("robot-config: addRobot preserves prior kind / sensors / capabilities on a name-only update", () => {
  // Same preserve-on-update invariant as `transport`: a follow-up
  // `add` without these flags must NOT clobber what's already there.
  const obj: Record<string, unknown> = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        kind: "drone",
        sensors: { has_lidar: true },
        capabilities: ["fly_to"],
      },
    ],
  };
  const result = addRobot({ id: "alpha", name: "Renamed", namespace: "alpha-ns" }, { obj });
  const r = result.robots[0] as RobotEntry;
  assert.equal(r.name, "Renamed");
  assert.equal(r.kind, "drone", "prior kind must survive name-only update");
  assert.deepEqual(r.sensors, { has_lidar: true });
  assert.deepEqual(r.capabilities, ["fly_to"]);
});

test("robot-config: addRobot replaces capabilities with [] (caller-driven clear)", () => {
  // Empty array means "clear the allowlist" — the CLI relies on this
  // when the user passes --capabilities='' to revert a robot to the
  // gateway-wide registry without removing the whole entry.
  const obj: Record<string, unknown> = {
    robots: [
      {
        id: "alpha",
        namespace: "alpha-ns",
        capabilities: ["arm_grasp"],
      },
    ],
  };
  const result = addRobot({ id: "alpha", namespace: "alpha-ns", capabilities: [] }, { obj });
  const r = result.robots[0] as RobotEntry;
  assert.deepEqual(r.capabilities, []);
});
