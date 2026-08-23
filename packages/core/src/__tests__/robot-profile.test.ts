/**
 * Unit tests for robot hardware profiles (features + bindings + verb gating).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { parseConfig } from "../config.js";
import {
  BUILTIN_CAPABILITIES,
  listAllCapabilities,
  listCapabilitiesForRobot,
  capabilityUnavailableMessage,
} from "../capabilities.js";
import { findRobotsFor } from "../find-robots-for.js";
import { listRobots, resolveRobot } from "../robots.js";
import {
  FEATURE_VOCABULARY,
  inferProfileDraft,
  resolveBinding,
  featuresSatisfied,
  missingFeatures,
  unknownFeatures,
  featuresMissingBindings,
} from "../robot-profile.js";

test("profile: parseConfig accepts robots[].profile", () => {
  const cfg = parseConfig({
    robots: [
      {
        id: "warehouse",
        namespace: "wh",
        profile: {
          schema: "agenticros.profile.v1",
          features: ["base", "camera", "depth"],
          bindings: {
            cmd_vel: "/cmd_vel",
            "camera.rgb": "/camera/color/image_raw/compressed",
          },
        },
      },
    ],
  });
  const r = resolveRobot(cfg, "warehouse");
  assert.ok(r.profile);
  assert.deepEqual(r.profile.features, ["base", "camera", "depth"]);
  assert.equal(r.profile.bindings["cmd_vel"], "/cmd_vel");
});

test("profile: parseConfig accepts robots[].safety overlay", () => {
  const cfg = parseConfig({
    safety: { maxLinearVelocity: 1.0, maxAngularVelocity: 1.5 },
    robots: [
      {
        id: "slow",
        namespace: "slow",
        safety: { maxLinearVelocity: 0.25, workspaceLimits: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 } },
      },
    ],
  });
  const r = resolveRobot(cfg, "slow");
  assert.equal(r.safety?.maxLinearVelocity, 0.25);
  assert.equal(r.safety?.workspaceLimits?.xMax, 3);
});

test("profile: absent profile stays undefined (legacy robots do not invent one)", () => {
  const cfg = parseConfig({ robots: [{ id: "alpha", namespace: "alpha-ns" }] });
  assert.equal(listRobots(cfg)[0].profile, undefined);
});

test("profile: resolveBinding uses profile then cameraTopic / cmd_vel fallbacks", () => {
  const withProfile = parseConfig({
    robots: [
      {
        id: "a",
        namespace: "ns",
        cameraTopic: "/legacy/cam",
        profile: {
          features: ["base", "camera"],
          bindings: { "camera.rgb": "/camera/profile/cam/compressed", cmd_vel: "/cmd_vel" },
        },
      },
    ],
  });
  const a = resolveRobot(withProfile, "a");
  assert.equal(resolveBinding(a, "camera.rgb"), "/camera/profile/cam/compressed");
  assert.equal(resolveBinding(a, "cmd_vel"), "/ns/cmd_vel");

  const legacy = parseConfig({
    robots: [{ id: "b", namespace: "bot", cameraTopic: "/camera/image" }],
  });
  const b = resolveRobot(legacy, "b");
  assert.equal(resolveBinding(b, "camera.rgb"), "/camera/image");
  assert.equal(resolveBinding(b, "cmd_vel"), "/bot/cmd_vel");
});

test("profile: listCapabilitiesForRobot does not filter when profile is absent", () => {
  const cfg = parseConfig({ robots: [{ id: "alpha" }] });
  const all = listAllCapabilities(cfg);
  const scoped = listCapabilitiesForRobot(cfg, "alpha");
  assert.deepEqual(
    scoped.map((c) => c.id),
    all.map((c) => c.id),
  );
});

test("profile: builtins carry requires for base/camera/depth", () => {
  const byId = Object.fromEntries(BUILTIN_CAPABILITIES.map((c) => [c.id, c]));
  assert.deepEqual(byId.drive_base.requires, ["base"]);
  assert.deepEqual(byId.take_snapshot.requires, ["camera"]);
  assert.deepEqual(byId.measure_depth.requires, ["depth"]);
  assert.equal(byId.list_topics.requires, undefined);
});

test("profile: listCapabilitiesForRobot drops verbs whose requires the body lacks", () => {
  const cfg = parseConfig({
    robots: [
      {
        id: "arm-cell",
        kind: "arm",
        profile: { features: ["arm", "camera"], bindings: { "camera.rgb": "/cam" } },
      },
    ],
  });
  const ids = listCapabilitiesForRobot(cfg, "arm-cell").map((c) => c.id);
  assert.ok(!ids.includes("drive_base"), "no base → no drive_base");
  assert.ok(!ids.includes("measure_depth"), "no depth → no measure_depth");
  assert.ok(ids.includes("take_snapshot"));
  assert.ok(ids.includes("list_topics"));
});

test("profile: capabilityUnavailableMessage names missing features", () => {
  const cfg = parseConfig({
    robots: [
      {
        id: "arm-cell",
        profile: { features: ["arm"] },
      },
    ],
  });
  const msg = capabilityUnavailableMessage(cfg, "arm-cell", "drive_base");
  assert.ok(msg);
  assert.match(msg!, /missing features: base/);
  assert.equal(capabilityUnavailableMessage(cfg, "arm-cell", "no_such"), undefined);
});

test("profile: findRobotsFor respects per-robot profile (AMR vs arm)", () => {
  const cfg = parseConfig({
    robots: [
      {
        id: "amr",
        kind: "amr",
        profile: { features: ["base", "camera"], bindings: { cmd_vel: "/cmd_vel" } },
      },
      {
        id: "arm",
        kind: "arm",
        profile: { features: ["arm"] },
      },
    ],
  });
  const drive = findRobotsFor(cfg, { capability: "drive_base" });
  assert.equal(drive.total, 1);
  assert.equal(drive.robots[0].robot.id, "amr");

  const snap = findRobotsFor(cfg, { capability: "take_snapshot" });
  assert.equal(snap.total, 1);
  assert.equal(snap.robots[0].robot.id, "amr");
});

test("profile: inferProfileDraft from kind + cameraTopic + sensors", () => {
  const draft = inferProfileDraft({
    namespace: "wh",
    cameraTopic: "/cam/compressed",
    kind: "amr",
    sensors: { has_realsense: true, has_lidar: true, has_arm: false },
  });
  assert.ok(draft.features.includes("base"));
  assert.ok(draft.features.includes("camera"));
  assert.ok(draft.features.includes("depth"));
  assert.ok(draft.features.includes("lidar"));
  assert.ok(draft.bindings["cmd_vel"]);
  assert.equal(draft.bindings["odom"], "/wh/odom");
  assert.ok(draft.bindings["camera.rgb"]);
});

test("profile: featuresSatisfied / missingFeatures / unknownFeatures", () => {
  const profile = { schema: "agenticros.profile.v1" as const, features: ["base"], bindings: {} };
  assert.equal(featuresSatisfied(profile, ["base"]), true);
  assert.equal(featuresSatisfied(profile, ["base", "camera"]), false);
  assert.deepEqual(missingFeatures(profile, ["base", "camera"]), ["camera"]);
  assert.deepEqual(unknownFeatures(["base", "flux_capacitor"]), ["flux_capacitor"]);
  assert.ok(FEATURE_VOCABULARY.includes("estop"));
});

test("profile: featuresMissingBindings flags declared features without a v1 binding", () => {
  const missing = featuresMissingBindings({
    schema: "agenticros.profile.v1",
    features: ["base", "camera"],
    bindings: { cmd_vel: "/cmd_vel" },
  });
  assert.deepEqual(missing, ["camera"]);
});
