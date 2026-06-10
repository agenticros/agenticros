/**
 * Unit tests for the Phase 1.d multi-robot discovery module.
 *
 * What these tests pin down (each one corresponds to a real failure mode
 * the discovery layer has to defend against in production):
 *
 *   - Topic detection picks up `/<ns>/cmd_vel` for every namespace and
 *     also the unnamespaced `/cmd_vel` (sim default).
 *   - topicCount aggregates corroborating topics under each namespace —
 *     this is what consumers use to rank a "live" namespace over a stale
 *     one with only cmd_vel left over.
 *   - UUID→robot-no-dashes rewrite: a config entry with a UUID-style
 *     namespace ("3946b404-...") MUST match a topic
 *     "/robot3946b404.../cmd_vel" on the wire. This is the rewrite the
 *     publish path applies, so discovery has to mirror it or
 *     configured_online will always be empty for UUID deployments.
 *   - configured_online / configured_offline / unknown_detected
 *     partition correctly — every configured robot lands in exactly
 *     one bucket; every detected namespace that doesn't match any
 *     config lands in unknown_detected.
 *   - Empty inputs: no topics + legacy config = legacy robot is
 *     configured_offline (it's configured but the wire is silent).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseConfig } from "../config.js";
import {
  detectRobotsFromTopics,
  discoverRobots,
  effectiveCmdVelNamespace,
} from "../discovery.js";
import type { TopicInfo } from "../transport/types.js";

const T = (name: string, type = "geometry_msgs/msg/Twist"): TopicInfo => ({ name, type });

test("discovery: detectRobotsFromTopics finds /<ns>/cmd_vel and the unnamespaced /cmd_vel", () => {
  const topics: TopicInfo[] = [
    T("/robotA/cmd_vel"),
    T("/robotB/cmd_vel"),
    T("/cmd_vel"),
    T("/rosout", "rcl_interfaces/msg/Log"),
  ];
  const detected = detectRobotsFromTopics(topics);
  const ids = detected.map((d) => d.id).sort();
  assert.deepEqual(ids, ["", "robotA", "robotB"]);
});

test("discovery: detectRobotsFromTopics accumulates topicCount under each namespace", () => {
  const topics: TopicInfo[] = [
    T("/robotA/cmd_vel"),
    T("/robotA/odom", "nav_msgs/msg/Odometry"),
    T("/robotA/joint_states", "sensor_msgs/msg/JointState"),
    T("/robotA/camera/color/image_raw", "sensor_msgs/msg/Image"),
    T("/robotB/cmd_vel"),
    T("/robotB/odom", "nav_msgs/msg/Odometry"),
  ];
  const detected = detectRobotsFromTopics(topics);
  const A = detected.find((d) => d.id === "robotA")!;
  const B = detected.find((d) => d.id === "robotB")!;
  assert.equal(A.topicCount, 4, "robotA has 4 topics under /robotA/");
  assert.equal(B.topicCount, 2, "robotB has 2 topics under /robotB/");
});

test("discovery: detectRobotsFromTopics yields empty list for topic graph with no cmd_vel", () => {
  const topics: TopicInfo[] = [
    T("/rosout", "rcl_interfaces/msg/Log"),
    T("/tf", "tf2_msgs/msg/TFMessage"),
  ];
  assert.deepEqual(detectRobotsFromTopics(topics), []);
});

test("discovery: effectiveCmdVelNamespace mirrors the publish-path UUID rewrite", () => {
  assert.equal(
    effectiveCmdVelNamespace("3946b404-c33e-4aa3-9a8d-16deb1c5c593"),
    "robot3946b404c33e4aa39a8d16deb1c5c593",
    "UUID-shaped namespace must collapse to robot<no-dashes>",
  );
  assert.equal(
    effectiveCmdVelNamespace("robot_alpha"),
    "robot_alpha",
    "already-robot-prefixed namespace stays unchanged",
  );
  assert.equal(
    effectiveCmdVelNamespace(""),
    "",
    "empty namespace stays empty (default ns)",
  );
  assert.equal(
    effectiveCmdVelNamespace("Robot7"),
    "Robot7",
    "case-insensitive 'robot' prefix is preserved as-is",
  );
});

test("discovery: discoverRobots classifies a UUID-style configured robot as online via the topic rewrite", () => {
  // The robot's config namespace is the UUID, but on the wire it
  // publishes to /robot<no-dashes>/cmd_vel. Without the rewrite, this
  // would be misclassified as offline.
  const cfg = parseConfig({
    robot: { namespace: "3946b404-c33e-4aa3-9a8d-16deb1c5c593" },
  });
  const topics: TopicInfo[] = [
    T("/robot3946b404c33e4aa39a8d16deb1c5c593/cmd_vel"),
    T("/robot3946b404c33e4aa39a8d16deb1c5c593/odom", "nav_msgs/msg/Odometry"),
  ];
  const result = discoverRobots(topics, cfg);
  assert.equal(result.configured_online.length, 1, "UUID robot must be classified as online");
  assert.equal(result.configured_online[0]!.id, "3946b404-c33e-4aa3-9a8d-16deb1c5c593");
  assert.equal(result.configured_offline.length, 0);
  assert.equal(result.unknown_detected.length, 0);
  assert.equal(result.detected[0]!.configuredRobotId, "3946b404-c33e-4aa3-9a8d-16deb1c5c593");
});

test("discovery: discoverRobots reports configured robots as offline when nothing's on the wire", () => {
  const cfg = parseConfig({
    robot: { namespace: "robot-alpha" },
  });
  const result = discoverRobots([], cfg);
  assert.equal(result.detected.length, 0);
  assert.equal(result.configured_online.length, 0);
  assert.equal(result.configured_offline.length, 1, "single configured robot must be offline");
  assert.equal(result.configured_offline[0]!.id, "robot-alpha");
  assert.equal(result.unknown_detected.length, 0);
});

test("discovery: discoverRobots surfaces an unknown_detected entry for an on-wire robot not in config", () => {
  const cfg = parseConfig({
    robot: { namespace: "robot-alpha" },
  });
  const topics: TopicInfo[] = [
    T("/robot-alpha/cmd_vel"),
    T("/robot-beta/cmd_vel"), // not in config — must show up as unknown
    T("/robot-beta/odom", "nav_msgs/msg/Odometry"),
  ];
  const result = discoverRobots(topics, cfg);
  assert.equal(result.configured_online.length, 1);
  assert.equal(result.configured_online[0]!.id, "robot-alpha");
  assert.equal(result.unknown_detected.length, 1);
  assert.equal(result.unknown_detected[0]!.id, "robot-beta");
  assert.equal(
    result.unknown_detected[0]!.topicCount,
    2,
    "topicCount includes cmd_vel itself plus every corroborating topic under /<id>/",
  );
  assert.equal(result.unknown_detected[0]!.configuredRobotId, null);
});

test("discovery: discoverRobots partitions correctly with mixed online + offline + unknown", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", namespace: "robot-alpha", default: true },
      { id: "beta", namespace: "robot-beta" },
      { id: "gamma", namespace: "robot-gamma" }, // offline
    ],
  });
  const topics: TopicInfo[] = [
    T("/robot-alpha/cmd_vel"),
    T("/robot-beta/cmd_vel"),
    T("/robot-delta/cmd_vel"), // unknown
  ];
  const result = discoverRobots(topics, cfg);
  assert.equal(result.detected.length, 3, "three /cmd_vel topics → three detections");
  assert.deepEqual(
    result.configured_online.map((r) => r.id).sort(),
    ["alpha", "beta"],
  );
  assert.deepEqual(
    result.configured_offline.map((r) => r.id),
    ["gamma"],
    "gamma is configured but not on the wire",
  );
  assert.deepEqual(
    result.unknown_detected.map((d) => d.id),
    ["robot-delta"],
  );
  assert.equal(
    result.detected.find((d) => d.id === "robot-alpha")!.configuredRobotId,
    "alpha",
    "alpha's detected entry is annotated with its config id",
  );
  assert.equal(
    result.detected.find((d) => d.id === "robot-delta")!.configuredRobotId,
    null,
    "delta has no config match — configuredRobotId stays null",
  );
});

test("discovery: discoverRobots echoes total_topics for diagnostics", () => {
  const topics: TopicInfo[] = [
    T("/robot-alpha/cmd_vel"),
    T("/rosout", "rcl_interfaces/msg/Log"),
    T("/tf", "tf2_msgs/msg/TFMessage"),
  ];
  const cfg = parseConfig({ robot: { namespace: "robot-alpha" } });
  const result = discoverRobots(topics, cfg);
  assert.equal(result.total_topics, 3);
});

test("discovery: the unnamespaced /cmd_vel (sim default) detects as id=''", () => {
  const topics: TopicInfo[] = [T("/cmd_vel"), T("/odom", "nav_msgs/msg/Odometry")];
  const detected = detectRobotsFromTopics(topics);
  assert.equal(detected.length, 1);
  assert.equal(detected[0]!.id, "", "default-namespace robot uses id=''");
  assert.equal(detected[0]!.cmdVelTopic, "/cmd_vel");
});
