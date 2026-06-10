/**
 * Per-robot isolation tests for the follow-me + find-object skill registries.
 *
 * Phase 1.d-extend asserts that each robot keeps its own independent
 * follow-me loop instance, keyed by `robot.id`. If two robots ever share a
 * single loop, starting follow-me on one would silently steer the other
 * and `ros2_follow_me_status` would conflate state — exactly the regression
 * this suite is designed to catch.
 *
 * These tests run as pure registry checks — they construct a minimal mock
 * `RosTransport` so the loop constructors don't reach for the network, and
 * they reset the registry between tests so suites stay deterministic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ResolvedRobot, RosTransport } from "@agenticros/core";
import {
  getFollowMeDepth,
  _resetFollowMeDepthRegistry,
} from "../follow-me/depth-loop.js";
import {
  getFollowMeLocal,
  _resetFollowMeLocalRegistry,
} from "../follow-me/loop.js";
import { parseConfig } from "@agenticros/core";

/**
 * Minimal `RosTransport` stub. The follow-me loops only touch the transport
 * inside `start()` (subscribe + publish) — the constructor + registry path
 * never call into it. We provide a no-op surface so TypeScript is happy and
 * any accidental call surfaces as an obvious "TypeError: ... not a function".
 */
function stubTransport(): RosTransport {
  // The follow-me loop constructors don't touch the transport — they only
  // call into it from `start()`. We cast through `unknown` so the test
  // doesn't have to track the full RosTransport surface area; any
  // accidental method call surfaces as a clean "not a function" error.
  return {} as unknown as RosTransport;
}

function makeRobot(id: string, namespace: string): ResolvedRobot {
  return {
    id,
    name: id,
    namespace,
    cameraTopic: "",
    kind: "amr",
    sensors: { has_realsense: false, has_lidar: false, has_arm: false },
    source: "config",
  };
}

const CONFIG = parseConfig({ robot: { namespace: "robot-a" } });

test("follow-me-registry: getFollowMeDepth returns the same instance for the same robot.id", () => {
  _resetFollowMeDepthRegistry();
  const transport = stubTransport();
  const robotA = makeRobot("robot-a", "robot-a");
  const first = getFollowMeDepth(robotA, CONFIG, transport);
  const second = getFollowMeDepth(robotA, CONFIG, transport);
  assert.strictEqual(
    first,
    second,
    "two calls with the same robot.id must return the identical loop instance",
  );
  assert.equal(first.robotId, "robot-a", "instance should remember its robot.id");
});

test("follow-me-registry: getFollowMeDepth returns DIFFERENT instances for DIFFERENT robot.ids", () => {
  _resetFollowMeDepthRegistry();
  const transport = stubTransport();
  const robotA = makeRobot("robot-a", "robot-a");
  const robotB = makeRobot("robot-b", "robot-b");
  const loopA = getFollowMeDepth(robotA, CONFIG, transport);
  const loopB = getFollowMeDepth(robotB, CONFIG, transport);
  assert.notStrictEqual(loopA, loopB, "each robot must get its own independent loop");
  assert.equal(loopA.robotId, "robot-a");
  assert.equal(loopB.robotId, "robot-b");
  // And a follow-up lookup must still return each robot's own loop, not
  // the most-recently-created one.
  assert.strictEqual(getFollowMeDepth(robotA, CONFIG, transport), loopA);
  assert.strictEqual(getFollowMeDepth(robotB, CONFIG, transport), loopB);
});

test("follow-me-registry: getFollowMeLocal returns the same instance for the same robot.id", () => {
  _resetFollowMeLocalRegistry();
  const transport = stubTransport();
  const robotA = makeRobot("robot-a", "robot-a");
  const first = getFollowMeLocal(robotA, CONFIG, transport);
  const second = getFollowMeLocal(robotA, CONFIG, transport);
  assert.strictEqual(
    first,
    second,
    "two calls with the same robot.id must return the identical loop instance",
  );
  assert.equal(first.robotId, "robot-a", "instance should remember its robot.id");
});

test("follow-me-registry: getFollowMeLocal returns DIFFERENT instances for DIFFERENT robot.ids", () => {
  _resetFollowMeLocalRegistry();
  const transport = stubTransport();
  const robotA = makeRobot("robot-a", "robot-a");
  const robotB = makeRobot("robot-b", "robot-b");
  const loopA = getFollowMeLocal(robotA, CONFIG, transport);
  const loopB = getFollowMeLocal(robotB, CONFIG, transport);
  assert.notStrictEqual(loopA, loopB, "each robot must get its own independent loop");
  assert.equal(loopA.robotId, "robot-a");
  assert.equal(loopB.robotId, "robot-b");
});

test("follow-me-registry: status() defaults to disabled on a fresh per-robot instance", () => {
  _resetFollowMeDepthRegistry();
  const transport = stubTransport();
  const robot = makeRobot("robot-a", "robot-a");
  const loop = getFollowMeDepth(robot, CONFIG, transport);
  const s = loop.status();
  assert.equal(s.enabled, false, "a freshly-registered loop should not be enabled");
  assert.equal(s.tracking, false, "a freshly-registered loop should not be tracking");
});
