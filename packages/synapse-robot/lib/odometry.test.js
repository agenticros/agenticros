import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TPR,
  DEFAULT_WHEEL_BETWEEN_MM,
  DEFAULT_WHEEL_DIAMETER_MM,
  applyCmdVel,
  applyTicks,
  createOdomState,
  createOdometry,
  integrate,
  isDifferentialWheelCount,
  loadKinematics,
  parseOdomCli,
  quaternionFromEuler,
  resolveOdomSetup,
  resolveTicksPerRevolution,
  shouldEnableOdom,
} from "./odometry.js";

test("loadKinematics converts ARC mm to meters", () => {
  const k = loadKinematics({ wheelDiameter: 64, wheelBetween: 135, wheelCount: 2 });
  assert.equal(k.wheelRadiusM, 64 / 2000);
  assert.equal(k.wheelTrackM, 0.135);
  assert.equal(k.valid, true);
  assert.equal(k.differential, true);
  assert.equal(k.ticksPerRevolution, DEFAULT_TPR);
});

test("loadKinematics uses defaults only when --odom force is set", () => {
  const empty = loadKinematics({});
  assert.equal(empty.valid, false);
  assert.equal(empty.wheelRadiusM, 0);

  const forced = loadKinematics({}, { force: true });
  assert.equal(forced.valid, true);
  assert.equal(forced.wheelDiameterMm, DEFAULT_WHEEL_DIAMETER_MM);
  assert.equal(forced.wheelBetweenMm, DEFAULT_WHEEL_BETWEEN_MM);
});

test("loadKinematics prefers --tpr then ARC ticksPerRevolution", () => {
  assert.equal(resolveTicksPerRevolution(700, 400), 700);
  assert.equal(resolveTicksPerRevolution(undefined, 400), 400);
  assert.equal(resolveTicksPerRevolution(undefined, undefined), DEFAULT_TPR);
  const k = loadKinematics({ ticksPerRevolution: 400 }, { tpr: 900 });
  assert.equal(k.ticksPerRevolution, 900);
});

test("isDifferentialWheelCount accepts 0/2/4 and rejects others", () => {
  assert.equal(isDifferentialWheelCount(0), true);
  assert.equal(isDifferentialWheelCount(undefined), true);
  assert.equal(isDifferentialWheelCount(2), true);
  assert.equal(isDifferentialWheelCount(4), true);
  assert.equal(isDifferentialWheelCount(3), false);
  assert.equal(isDifferentialWheelCount(6), false);
});

test("shouldEnableOdom: ARC geometry, --odom, --no-odom", () => {
  assert.equal(shouldEnableOdom({ wheelDiameter: 64, wheelBetween: 135 }), true);
  assert.equal(shouldEnableOdom({ wheelDiameter: 0, wheelBetween: 0 }), false);
  assert.equal(shouldEnableOdom({ odom: true, wheelDiameter: 0, wheelBetween: 0 }), true);
  assert.equal(
    shouldEnableOdom({ noOdom: true, odom: true, wheelDiameter: 64, wheelBetween: 135 }),
    false,
  );
});

test("parseOdomCli enables encoders only when --encoderpins is present", () => {
  const auto = parseOdomCli(["node", "motors.js"]);
  assert.equal(auto.encoderEnabled, false);
  assert.equal(auto.encoderPins, undefined);

  const enc = parseOdomCli(["node", "motors.js", "--encoderpins", "13,2,12,11", "--tpr", "400"]);
  assert.equal(enc.encoderEnabled, true);
  assert.deepEqual(enc.encoderPins, [13, 2, 12, 11]);
  assert.equal(enc.tpr, 400);
});

test("resolveOdomSetup: encoder mode requires -e and differential wheelCount", () => {
  const enc = resolveOdomSetup({
    config: { wheelDiameter: 64, wheelBetween: 135, wheelCount: 2 },
    argv: ["node", "x", "--encoderpins", "13,2,12,11"],
  });
  assert.equal(enc.enabled, true);
  assert.equal(enc.mode, "encoder");

  const warns = [];
  const odd = resolveOdomSetup({
    config: { wheelDiameter: 64, wheelBetween: 135, wheelCount: 3 },
    argv: ["node", "x", "--encoderpins", "13,2,12,11"],
    log: { warn: (m) => warns.push(m) },
  });
  assert.equal(odd.enabled, true);
  assert.equal(odd.mode, "cmd_vel");
  assert.ok(warns.length > 0);

  const off = resolveOdomSetup({
    config: { wheelDiameter: 64, wheelBetween: 135 },
    argv: ["node", "x", "--no-odom"],
  });
  assert.equal(off.enabled, false);
});

test("dead-reckon straight line: 0.2 m/s for 1 s → x ≈ 0.2", () => {
  const k = loadKinematics({ wheelDiameter: 64, wheelBetween: 135 });
  const state = createOdomState();
  applyCmdVel(state, 0.2, 0);
  integrate(state, k, "cmd_vel", 0);
  integrate(state, k, "cmd_vel", 1e9);
  assert.ok(Math.abs(state.x - 0.2) < 1e-9);
  assert.ok(Math.abs(state.y) < 1e-9);
  assert.ok(Math.abs(state.th) < 1e-9);
  assert.ok(Math.abs(state.vx - 0.2) < 1e-9);
});

test("dead-reckon in-place turn: π rad/s for 1 s → th ≈ π", () => {
  const k = loadKinematics({ wheelDiameter: 64, wheelBetween: 135 });
  const state = createOdomState();
  applyCmdVel(state, 0, Math.PI);
  integrate(state, k, "cmd_vel", 0);
  integrate(state, k, "cmd_vel", 1e9);
  assert.ok(Math.abs(state.th - Math.PI) < 1e-9);
  assert.ok(Math.abs(state.x) < 1e-9);
  assert.ok(Math.abs(state.y) < 1e-9);
});

test("encoder ticks: one revolution both wheels advances 2πr", () => {
  const k = loadKinematics({ wheelDiameter: 64, wheelBetween: 135 }, { tpr: 100 });
  const state = createOdomState();
  applyTicks(state, 100, 100);
  integrate(state, k, "encoder", 0);
  integrate(state, k, "encoder", 1e9);
  const expected = 2 * Math.PI * k.wheelRadiusM;
  assert.ok(Math.abs(state.x - expected) < 1e-9);
  assert.ok(Math.abs(state.y) < 1e-9);
  assert.ok(Math.abs(state.th) < 1e-9);
});

test("encoder ticks: opposite wheels rotate in place", () => {
  const k = loadKinematics({ wheelDiameter: 64, wheelBetween: 135 }, { tpr: 100 });
  const state = createOdomState();
  applyTicks(state, -100, 100);
  integrate(state, k, "encoder", 0);
  integrate(state, k, "encoder", 1e9);
  const arc = 2 * Math.PI * k.wheelRadiusM;
  const expectedTh = (arc - -arc) / k.wheelTrackM;
  assert.ok(Math.abs(state.th - expectedTh) < 1e-9);
  assert.ok(Math.abs(state.x) < 1e-6);
  assert.ok(Math.abs(state.y) < 1e-6);
});

test("quaternionFromEuler yaw-only is unit length", () => {
  const q = quaternionFromEuler(0, 0, Math.PI / 2);
  const norm = Math.hypot(q.x, q.y, q.z, q.w);
  assert.ok(Math.abs(norm - 1) < 1e-9);
  assert.ok(Math.abs(q.z - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(q.w - Math.SQRT1_2) < 1e-9);
});

test("createOdometry.tick integrates without a ROS node", () => {
  const k = loadKinematics({ wheelDiameter: 64, wheelBetween: 135 });
  const odom = createOdometry({
    odomTopic: "/odom",
    kinematics: k,
    mode: "cmd_vel",
  });
  odom.setCmdVel(0.1, 0);
  odom.tick(0);
  odom.tick(5e8);
  assert.ok(Math.abs(odom.getState().x - 0.05) < 1e-9);
});
