/**
 * Topic-utils tests — focus on the Phase 1.d dual signature where every
 * helper accepts either the full config (legacy single-robot path) or a
 * bare namespace string (per-robot routing). The string form is what
 * the per-tool `robot_id` path uses, so it has to match the config form
 * exactly for the same namespace value — that's the contract these
 * tests pin down.
 *
 * The pre-Phase-1.d behaviour (config arg) is implicitly preserved
 * because the new string-arg form delegates through the same internal
 * logic; the equivalence tests catch any future drift.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  toNamespacedTopic,
  toNamespacedTopicFull,
  resolveCameraSubscribeTopic,
} from "../topic-utils.js";
import { parseConfig } from "../config.js";

const NS = "robot-alpha";

test("topic-utils: toNamespacedTopic(string, '/cmd_vel') prefixes the namespace", () => {
  assert.equal(toNamespacedTopic(NS, "/cmd_vel"), "/robot-alpha/cmd_vel");
});

test("topic-utils: toNamespacedTopic('', topic) is a no-op", () => {
  assert.equal(toNamespacedTopic("", "/cmd_vel"), "/cmd_vel");
});

test("topic-utils: toNamespacedTopic trims namespace whitespace", () => {
  assert.equal(toNamespacedTopic("  robot-alpha  ", "/cmd_vel"), "/robot-alpha/cmd_vel");
});

test("topic-utils: toNamespacedTopic only prefixes root-level topics", () => {
  // Multi-segment paths must be left alone (the agent is being explicit).
  assert.equal(toNamespacedTopic(NS, "/some/multi/segment/path"), "/some/multi/segment/path");
  // Already-prefixed paths must be left alone.
  assert.equal(toNamespacedTopic(NS, "/robot-alpha/odom"), "/robot-alpha/odom");
});

test("topic-utils: toNamespacedTopicFull prefixes multi-segment topics too", () => {
  assert.equal(
    toNamespacedTopicFull(NS, "/camera/camera/color/image_raw/compressed"),
    "/robot-alpha/camera/camera/color/image_raw/compressed",
  );
});

test("topic-utils: toNamespacedTopicFull leaves already-prefixed topics alone", () => {
  assert.equal(
    toNamespacedTopicFull(NS, "/robot-alpha/odom"),
    "/robot-alpha/odom",
  );
});

test("topic-utils: resolveCameraSubscribeTopic keeps /camera/* unprefixed (global sensor convention)", () => {
  assert.equal(
    resolveCameraSubscribeTopic(NS, "/camera/camera/color/image_raw"),
    "/camera/camera/color/image_raw",
  );
  assert.equal(
    resolveCameraSubscribeTopic(NS, "/zed/zed/rgb/image"),
    "/zed/zed/rgb/image",
  );
});

test("topic-utils: resolveCameraSubscribeTopic does prefix non-sensor multi-segment paths", () => {
  assert.equal(
    resolveCameraSubscribeTopic(NS, "/some/other/topic"),
    "/robot-alpha/some/other/topic",
  );
});

test("topic-utils: string-arg and config-arg produce identical output for the same namespace", () => {
  // This is the equivalence guarantee that per-robot routing relies on:
  // toNamespacedTopic(config, t) === toNamespacedTopic(config.robot.namespace, t)
  const cfg = parseConfig({ robot: { namespace: NS } });
  const samples = [
    "/cmd_vel",
    "/odom",
    "/robot-alpha/cmd_vel",
    "/camera/camera/color/image_raw",
    "/zed/depth",
    "/some/multi/segment/path",
  ];
  for (const t of samples) {
    assert.equal(
      toNamespacedTopic(cfg, t),
      toNamespacedTopic(NS, t),
      `toNamespacedTopic drift on ${t}`,
    );
    assert.equal(
      toNamespacedTopicFull(cfg, t),
      toNamespacedTopicFull(NS, t),
      `toNamespacedTopicFull drift on ${t}`,
    );
    assert.equal(
      resolveCameraSubscribeTopic(cfg, t),
      resolveCameraSubscribeTopic(NS, t),
      `resolveCameraSubscribeTopic drift on ${t}`,
    );
  }
});
