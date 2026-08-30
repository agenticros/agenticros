/**
 * Unit tests for shared safety gates (per-robot velocity, workspace
 * geofence, fail-safe stop, live binding checks).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { parseConfig } from "../config.js";
import { listRobots, resolveRobot } from "../robots.js";
import {
  attachDisconnectFailSafe,
  checkActionGoalSafety,
  checkLiveBindings,
  checkPublishSafety,
  checkTwistMessage,
  checkWorkspacePayload,
  clampTwistToLimits,
  extractWorkspacePositions,
  emergencyStopRobot,
  ESTOP_PUBLISH_COUNT,
  publishStopForBases,
  resolveSafetyForRobot,
  robotHasMobileBase,
  ZERO_TWIST,
} from "../safety.js";
import type { RosTransport } from "../transport/transport.js";

test("safety: robot overlay wins over gateway velocity limits", () => {
  const cfg = parseConfig({
    safety: { maxLinearVelocity: 1.0, maxAngularVelocity: 1.5 },
    robots: [
      {
        id: "slow",
        namespace: "slow",
        safety: { maxLinearVelocity: 0.3 },
      },
    ],
  });
  const robot = resolveRobot(cfg, "slow");
  const limits = resolveSafetyForRobot(cfg, robot);
  assert.equal(limits.maxLinearVelocity, 0.3);
  assert.equal(limits.maxAngularVelocity, 1.5);
});

test("safety: workspaceLimits is not enforced unless set", () => {
  const cfg = parseConfig({});
  const hit = checkPublishSafety(cfg, {
    message: { pose: { position: { x: 99, y: 99 } } },
  });
  assert.equal(hit.block, false);
});

test("safety: Twist over the per-robot cap is blocked", () => {
  const cfg = parseConfig({
    safety: { maxLinearVelocity: 1.0, maxAngularVelocity: 1.5 },
    robots: [{ id: "a", namespace: "a", safety: { maxLinearVelocity: 0.2 } }],
  });
  const robot = resolveRobot(cfg, "a");
  const hit = checkPublishSafety(
    cfg,
    { message: { linear: { x: 0.5, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } } },
    robot,
  );
  assert.equal(hit.block, true);
  assert.match(hit.blockReason ?? "", /0\.50 m\/s exceeds safety limit of 0\.2/);
});

test("safety: Twist within the cap passes", () => {
  const cfg = parseConfig({ safety: { maxLinearVelocity: 1.0, maxAngularVelocity: 1.5 } });
  const hit = checkTwistMessage(resolveSafetyForRobot(cfg), {
    linear: { x: 0.4, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0.2 },
  });
  assert.equal(hit.block, false);
});

test("safety: workspace AABB blocks NavigateToPose-shaped goals", () => {
  const cfg = parseConfig({
    safety: {
      maxLinearVelocity: 1,
      maxAngularVelocity: 1.5,
      workspaceLimits: { xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
    },
  });
  const hit = checkActionGoalSafety(cfg, {
    action: "/navigate_to_pose",
    goal: {
      pose: {
        header: { frame_id: "map" },
        pose: { position: { x: 5, y: 0, z: 0 } },
      },
    },
  });
  assert.equal(hit.block, true);
  assert.match(hit.blockReason ?? "", /outside workspaceLimits/);
});

test("safety: {x,y} mission inputs are fenced", () => {
  const cfg = parseConfig({
    safety: { workspaceLimits: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 } },
  });
  const hit = checkWorkspacePayload(resolveSafetyForRobot(cfg), { x: 1, y: 2 });
  assert.equal(hit.block, false);
  const miss = checkWorkspacePayload(resolveSafetyForRobot(cfg), { x: -1, y: 2 });
  assert.equal(miss.block, true);
});

test("safety: inverted workspaceLimits fail closed", () => {
  const cfg = parseConfig({
    safety: { workspaceLimits: { xMin: 5, xMax: 1, yMin: -1, yMax: 1 } },
  });
  const hit = checkWorkspacePayload(resolveSafetyForRobot(cfg), { x: 0, y: 0 });
  assert.equal(hit.block, true);
  assert.match(hit.blockReason ?? "", /Malformed workspaceLimits/);
});

test("safety: extractWorkspacePositions walks NavigateThroughPoses", () => {
  const poses = extractWorkspacePositions({
    poses: [
      { pose: { pose: { position: { x: 1, y: 2 } } } },
      { x: 3, y: 4 },
    ],
  });
  assert.deepEqual(poses, [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);
});

test("safety: clampTwistToLimits scales linear magnitude", () => {
  const clamped = clampTwistToLimits(
    { maxLinearVelocity: 0.5, maxAngularVelocity: 1.0 },
    1,
    0,
    0,
    0,
    0,
    2,
  );
  assert.ok(Math.abs(clamped.linear.x - 0.5) < 1e-9);
  assert.ok(Math.abs(clamped.angular.z - 1.0) < 1e-9);
});

test("safety: robotHasMobileBase uses profile.features, else kind !== arm", () => {
  assert.equal(
    robotHasMobileBase({
      namespace: "",
      cameraTopic: "",
      profile: { schema: "agenticros.profile.v1", features: ["base"], bindings: {} },
    }),
    true,
  );
  assert.equal(
    robotHasMobileBase({
      namespace: "",
      cameraTopic: "",
      kind: "arm",
      profile: { schema: "agenticros.profile.v1", features: ["arm"], bindings: {} },
    }),
    false,
  );
  assert.equal(robotHasMobileBase({ namespace: "", cameraTopic: "", kind: "amr" }), true);
  assert.equal(robotHasMobileBase({ namespace: "", cameraTopic: "", kind: "arm" }), false);
});

test("safety: publishStopForBases publishes zero Twist only for bases", async () => {
  const published: Array<{ topic: string; msg: unknown }> = [];
  const transport = {
    advertise: () => {},
    publish: (opts: { topic: string; msg: Record<string, unknown> }) => {
      published.push({ topic: opts.topic, msg: opts.msg });
    },
  } as unknown as RosTransport;

  await publishStopForBases(transport, [
    {
      namespace: "wh",
      cameraTopic: "",
      profile: {
        schema: "agenticros.profile.v1",
        features: ["base"],
        bindings: { cmd_vel: "/cmd_vel" },
      },
    },
    {
      namespace: "arm",
      cameraTopic: "",
      kind: "arm",
      profile: { schema: "agenticros.profile.v1", features: ["arm"], bindings: {} },
    },
  ]);

  assert.equal(published.length, 1);
  assert.equal(published[0].topic, "/wh/cmd_vel");
  assert.deepEqual(published[0].msg, {
    linear: ZERO_TWIST.linear,
    angular: ZERO_TWIST.angular,
  });
});

test("safety: emergencyStopRobot publishes zero Twist five times", () => {
  const published: Array<{ topic: string; type?: string; msg: unknown }> = [];
  const transport = {
    advertise: () => {},
    publish: (opts: { topic: string; type?: string; msg: Record<string, unknown> }) => {
      published.push({ topic: opts.topic, type: opts.type, msg: opts.msg });
    },
  } as unknown as RosTransport;

  const result = emergencyStopRobot(
    transport,
    {
      namespace: "wh",
      cameraTopic: "",
      profile: {
        schema: "agenticros.profile.v1",
        features: ["base"],
        bindings: { cmd_vel: "/cmd_vel" },
      },
    },
  );

  assert.equal(result.skipped, undefined);
  assert.equal(result.topic, "/wh/cmd_vel");
  assert.equal(published.length, ESTOP_PUBLISH_COUNT);
  for (const p of published) {
    assert.equal(p.topic, "/wh/cmd_vel");
    assert.equal(p.type, "geometry_msgs/msg/Twist");
    assert.deepEqual(p.msg, {
      linear: ZERO_TWIST.linear,
      angular: ZERO_TWIST.angular,
    });
  }
});

test("safety: emergencyStopRobot honors teleop.cmdVelTopic override", () => {
  const published: string[] = [];
  const transport = {
    publish: (opts: { topic: string }) => {
      published.push(opts.topic);
    },
  } as unknown as RosTransport;

  const result = emergencyStopRobot(
    transport,
    { namespace: "bot", cameraTopic: "", kind: "amr" },
    { teleop: { cmdVelTopic: "/custom_cmd_vel" } },
  );

  assert.equal(result.topic, "/bot/custom_cmd_vel");
  assert.equal(published.length, ESTOP_PUBLISH_COUNT);
  assert.ok(published.every((t) => t === "/bot/custom_cmd_vel"));
});

test("safety: emergencyStopRobot skips arm-only robots", () => {
  const published: string[] = [];
  const transport = {
    publish: (opts: { topic: string }) => {
      published.push(opts.topic);
    },
  } as unknown as RosTransport;

  const result = emergencyStopRobot(transport, {
    namespace: "arm",
    cameraTopic: "",
    kind: "arm",
    profile: { schema: "agenticros.profile.v1", features: ["arm"], bindings: {} },
  });

  assert.equal(result.skipped, "no_mobile_base");
  assert.equal(result.topic, undefined);
  assert.equal(published.length, 0);
});

test("safety: attachDisconnectFailSafe publishes stop on drop after connect", async () => {
  const published: string[] = [];
  const handlers: Array<(s: "connected" | "disconnected" | "connecting") => void> = [];
  let status: "connected" | "disconnected" | "connecting" = "disconnected";
  const transport = {
    getStatus: () => status,
    onConnection: (h: (s: "connected" | "disconnected" | "connecting") => void) => {
      handlers.push(h);
      return () => {};
    },
    publish: (opts: { topic: string }) => {
      published.push(opts.topic);
    },
  } as unknown as RosTransport;

  const robot = {
    namespace: "bot",
    cameraTopic: "",
    profile: {
      schema: "agenticros.profile.v1" as const,
      features: ["base"],
      bindings: { cmd_vel: "/cmd_vel" },
    },
  };
  attachDisconnectFailSafe(transport, [robot]);
  status = "connected";
  handlers[0]("connected");
  assert.equal(published.length, 0, "first connect must not stop the base");

  status = "disconnected";
  handlers[0]("disconnected");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(published.length, 1);
  assert.equal(published[0], "/bot/cmd_vel");
});

test("safety: checkLiveBindings flags missing cmd_vel red and type mismatch yellow", () => {
  const cfg = parseConfig({
    robots: [
      {
        id: "amr",
        namespace: "amr",
        profile: {
          schema: "agenticros.profile.v1",
          features: ["base", "camera"],
          bindings: {
            cmd_vel: "/cmd_vel",
            "camera.rgb": "/camera/color/image_raw/compressed",
          },
        },
      },
    ],
  });
  const robots = listRobots(cfg);
  const missing = checkLiveBindings(robots, { topics: [] });
  assert.ok(missing.some((c) => c.key === "cmd_vel" && c.severity === "red"));

  const typed = checkLiveBindings(robots, {
    topics: [
      { name: "/amr/cmd_vel", type: "std_msgs/msg/String" },
      { name: "/camera/color/image_raw/compressed", type: "sensor_msgs/msg/CompressedImage" },
    ],
  });
  const cmd = typed.find((c) => c.key === "cmd_vel");
  assert.equal(cmd?.severity, "yellow");
  const cam = typed.find((c) => c.key === "camera.rgb");
  assert.equal(cam?.severity, "green");
});
