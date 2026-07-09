/**
 * External capability executor tests.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExternalGoal,
  executeExternalCapability,
} from "../external-capability.js";
import type { Capability } from "../capabilities.js";
import type { RosTransport } from "../transport/transport.js";
import { safeParseCapability } from "../capability-schema.js";

test("buildExternalGoal maps x/y/yaw to NavigateToPose", () => {
  const goal = buildExternalGoal(
    {
      kind: "external_ros_node",
      action: "navigate_to_pose",
      msg_type: "nav2_msgs/action/NavigateToPose",
    },
    { x: 1, y: 2, yaw: 0 },
  );
  const pose = (goal as { pose: { pose: { position: { x: number; y: number } } } }).pose;
  assert.equal(pose.pose.position.x, 1);
  assert.equal(pose.pose.position.y, 2);
});

test("executeExternalCapability sends action goal", async () => {
  const calls: unknown[] = [];
  const transport = {
    sendActionGoal: async (opts: unknown) => {
      calls.push(opts);
      return { result: true, values: { status: "succeeded" } };
    },
  } as unknown as RosTransport;

  const cap: Capability = {
    id: "navigate_to",
    verb: "navigate",
    description: "Nav",
    implementation: {
      kind: "external_ros_node",
      action: "navigate_to_pose",
      msg_type: "nav2_msgs/action/NavigateToPose",
      launch: "navigation_launch.py",
    },
  };

  const result = await executeExternalCapability(cap, { x: 0.5, y: 0.1 }, transport, {
    namespace: "robot1",
  });
  assert.equal(result.isError, false);
  assert.equal(calls.length, 1);
  const call = calls[0] as { action: string; actionType: string };
  assert.ok(call.action.includes("navigate_to_pose"));
  assert.equal(call.actionType, "nav2_msgs/action/NavigateToPose");
});

test("safeParseCapability accepts external_ros_node", () => {
  const parsed = safeParseCapability({
    id: "navigate_to",
    verb: "navigate",
    description: "Nav2",
    implementation: {
      kind: "external_ros_node",
      action: "navigate_to_pose",
      msg_type: "nav2_msgs/action/NavigateToPose",
    },
  });
  assert.equal(parsed.ok, true);
});
