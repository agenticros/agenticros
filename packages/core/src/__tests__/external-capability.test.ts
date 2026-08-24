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

test("buildExternalGoal maps poses[] to NavigateThroughPoses", () => {
  const goal = buildExternalGoal(
    {
      kind: "external_ros_node",
      action: "navigate_through_poses",
      msg_type: "nav2_msgs/action/NavigateThroughPoses",
    },
    {
      poses: [
        { x: 1, y: 0, yaw: 0 },
        { x: 2, y: 1, yaw: Math.PI / 2 },
      ],
    },
  );
  const poses = (goal as { poses: Array<{ pose: { position: { x: number; y: number } } }> })
    .poses;
  assert.equal(poses.length, 2);
  assert.equal(poses[0]!.pose.position.x, 1);
  assert.equal(poses[1]!.pose.position.y, 1);
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

test("executeExternalCapability rejects NavigateToPose outside workspaceLimits", async () => {
  const cap: Capability = {
    id: "navigate_to",
    verb: "navigate",
    description: "Nav2",
    implementation: {
      kind: "external_ros_node",
      action: "navigate_to_pose",
      msg_type: "nav2_msgs/action/NavigateToPose",
    },
  };
  const transport = {
    sendActionGoal: async () => {
      throw new Error("should not send");
    },
  } as unknown as RosTransport;

  const result = await executeExternalCapability(cap, { x: 50, y: 0 }, transport, {
    workspaceCheck: {
      maxLinearVelocity: 1,
      maxAngularVelocity: 1.5,
      workspaceLimits: { xMin: -1, xMax: 1, yMin: -1, yMax: 1 },
    },
  });
  assert.equal(result.isError, true);
  assert.match(result.text, /outside workspaceLimits/);
});

test("buildExternalGoal maps database_path to LoadDatabase", () => {
  const goal = buildExternalGoal(
    {
      kind: "external_ros_node",
      service: "rtabmap/load_database",
      msg_type: "rtabmap_msgs/srv/LoadDatabase",
    },
    { database_path: "/tmp/rtabmap.db" },
  );
  assert.equal((goal as { database_path: string }).database_path, "/tmp/rtabmap.db");
  assert.equal((goal as { clear: boolean }).clear, true);
});

test("buildExternalGoal maps timeout_s onto Explore (wander action forces mode)", () => {
  const goal = buildExternalGoal(
    {
      kind: "external_ros_node",
      action: "wander",
      msg_type: "agenticros_msgs/action/Explore",
    },
    { timeout_s: 45 },
  );
  assert.equal((goal as { mode: string }).mode, "wander");
  assert.equal((goal as { timeout_s: number }).timeout_s, 45);
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
