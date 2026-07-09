/**
 * Heartbeat + fleet-config unit tests.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectRobotsFromTopics,
  discoverRobots,
} from "../discovery.js";
import {
  isHeartbeatFresh,
  mergeRobotHeartbeats,
  onlineIdsFromHeartbeats,
  parseRobotInfoMessage,
  DEFAULT_HEARTBEAT_STALENESS_MS,
} from "../heartbeat.js";
import { applyFleetOverride, loadFleetFile } from "../fleet-config.js";
import { listRobots } from "../robots.js";
import { parseConfig } from "../config.js";

test("parseRobotInfoMessage extracts fields", () => {
  const hb = parseRobotInfoMessage("/bot1/agenticros/robot_info", {
    id: "kitchen",
    name: "Kitchen Bot",
    kind: "amr",
    robot_namespace: "bot1",
    capability_ids: ["drive_base", "follow_person"],
    has_realsense: true,
    has_lidar: false,
    has_arm: false,
    stamp: { sec: 1_700_000_000, nanosec: 0 },
  });
  assert.equal(hb.id, "kitchen");
  assert.equal(hb.sensors.has_realsense, true);
  assert.equal(hb.stamp_ms, 1_700_000_000_000);
  assert.deepEqual(hb.capability_ids, ["drive_base", "follow_person"]);
});

test("isHeartbeatFresh respects 5s window", () => {
  const now = 1_000_000;
  const fresh = parseRobotInfoMessage("/n/agenticros/robot_info", {
    id: "a",
    robot_namespace: "n",
    stamp: { sec: Math.floor((now - 2000) / 1000), nanosec: 0 },
  });
  // Fix stamp_ms manually for precise control
  fresh.stamp_ms = now - 2000;
  assert.equal(isHeartbeatFresh(fresh, { nowMs: now }), true);

  const stale = { ...fresh, stamp_ms: now - DEFAULT_HEARTBEAT_STALENESS_MS - 1 };
  assert.equal(isHeartbeatFresh(stale, { nowMs: now }), false);
});

test("onlineIdsFromHeartbeats maps to configured ids", () => {
  const now = Date.now();
  const hb = parseRobotInfoMessage("/robotabc/agenticros/robot_info", {
    id: "wire-id",
    robot_namespace: "robotabc",
    stamp: { sec: Math.floor(now / 1000), nanosec: 0 },
  });
  hb.stamp_ms = now;
  const map = new Map([["robotabc", "configured-kitchen"]]);
  const online = onlineIdsFromHeartbeats([hb], {
    nowMs: now,
    configuredIdByNamespace: map,
  });
  assert.ok(online.has("configured-kitchen"));
});

test("mergeRobotHeartbeats keeps freshest per namespace", () => {
  const now = Date.now();
  const older = parseRobotInfoMessage("/robotn/agenticros/robot_info", {
    id: "a",
    robot_namespace: "robotn",
    name: "old",
  });
  older.stamp_ms = now - 1000;
  const newer = parseRobotInfoMessage("/robotn/agenticros/robot_info", {
    id: "a",
    robot_namespace: "robotn",
    name: "new",
  });
  newer.stamp_ms = now;
  const merged = mergeRobotHeartbeats([older, newer], { nowMs: now });
  assert.equal(merged.get("robotn")?.name, "new");
});

test("detectRobotsFromTopics includes robot_info-only namespaces", () => {
  const detected = detectRobotsFromTopics([
    { name: "/arm1/agenticros/robot_info", type: "agenticros_msgs/msg/RobotInfo" },
  ]);
  assert.equal(detected.length, 1);
  assert.equal(detected[0]!.id, "arm1");
});

test("discoverRobots treats robot_info topic as online signal", () => {
  // Isolate from a real ~/.agenticros/fleet.json on the developer machine.
  const prev = process.env.AGENTICROS_FLEET_PATH;
  process.env.AGENTICROS_FLEET_PATH = join(tmpdir(), "no-fleet-for-discover-test.json");
  try {
    // Namespace must already be the on-wire form (or UUID) so
    // effectiveCmdVelNamespace matches the topic segment.
    const cfg = parseConfig({
      robots: [{ id: "arm1", namespace: "robotarm1", kind: "arm" }],
    });
    const result = discoverRobots(
      [{ name: "/robotarm1/agenticros/robot_info", type: "agenticros_msgs/msg/RobotInfo" }],
      cfg,
    );
    assert.equal(result.configured_online.length, 1);
    assert.equal(result.configured_online[0]!.id, "arm1");
  } finally {
    if (prev === undefined) delete process.env.AGENTICROS_FLEET_PATH;
    else process.env.AGENTICROS_FLEET_PATH = prev;
  }
});

test("loadFleetFile + applyFleetOverride wins over config.robots", () => {
  const dir = mkdtempSync(join(tmpdir(), "agenticros-fleet-"));
  const path = join(dir, "fleet.json");
  try {
    writeFileSync(
      path,
      JSON.stringify([{ id: "fleet-bot", namespace: "fleetns", kind: "amr", name: "From Fleet" }]),
    );
    const loaded = loadFleetFile(path);
    assert.equal(loaded.used, true);
    assert.equal(loaded.robots[0]!.id, "fleet-bot");

    const cfg = parseConfig({
      robots: [{ id: "config-bot", namespace: "configns" }],
    });
    const overridden = applyFleetOverride(cfg, path);
    const robots = listRobots(overridden);
    // listRobots also applies fleet from default path — pass overridden
    // config that already has fleet robots embedded:
    assert.equal(overridden.robots?.[0]?.id, "fleet-bot");
    assert.equal(robots[0]!.id, "fleet-bot");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadFleetFile missing file is unused", () => {
  const result = loadFleetFile(join(tmpdir(), "no-such-agenticros-fleet-xyz.json"));
  assert.equal(result.used, false);
  assert.equal(result.robots.length, 0);
});
