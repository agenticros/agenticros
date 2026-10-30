import assert from "node:assert/strict";
import test from "node:test";

import { WHEEL_MIN_DUTY } from "./twist-duty.js";
import {
  NAV_VEL_REFERENCE,
  cruiseFromSlider,
  navCruiseCommand,
  navCruiseTopic,
  noteTeleopCruise,
  scaleTwistToCruise,
} from "./nav-speed.js";

test("nav cruise topic sits beside cmd_vel", () => {
  assert.equal(navCruiseTopic("/cmd_vel"), "/nav_cruise");
  assert.equal(navCruiseTopic("/robotabc/cmd_vel"), "/robotabc/nav_cruise");
});

test("slider percent and duty fraction both become a 0–1 speed", () => {
  assert.equal(cruiseFromSlider(80), 0.8);
  assert.equal(cruiseFromSlider("50"), 0.5);
  assert.equal(cruiseFromSlider(0.4), 0.4);
  assert.equal(cruiseFromSlider(0), 0);
  assert.equal(cruiseFromSlider(undefined), null);
  assert.equal(cruiseFromSlider(-1), null);
});

test("a stop does not forget the last teleop speed", () => {
  assert.equal(noteTeleopCruise(null, 0.5, 0), 0.5);
  assert.equal(noteTeleopCruise(0.5, 0, 0), 0.5);
  assert.equal(noteTeleopCruise(0.5, 0, -0.8), 0.8);
});

test("slider speeds below the motor floor are published at the floor", () => {
  assert.equal(navCruiseCommand(null), 0);
  assert.equal(navCruiseCommand(0.2), WHEEL_MIN_DUTY);
  assert.equal(navCruiseCommand(0), WHEEL_MIN_DUTY);
  assert.equal(navCruiseCommand(0.8), 0.8);
  assert.equal(navCruiseCommand(2), 1);
});

test("nav twists scale onto the slider and teleop twists do not", () => {
  assert.deepEqual(scaleTwistToCruise(0.65, 0.2, 0), { linearX: 0.65, angularZ: 0.2 });
  const slow = scaleTwistToCruise(NAV_VEL_REFERENCE, 0, WHEEL_MIN_DUTY);
  assert.ok(Math.abs(slow.linearX - WHEEL_MIN_DUTY) < 1e-9);
  const fast = scaleTwistToCruise(NAV_VEL_REFERENCE, -0.3, 1);
  assert.ok(Math.abs(fast.linearX - 1) < 1e-9);
  assert.ok(fast.angularZ < 0);
  assert.deepEqual(scaleTwistToCruise(0, 0, 0.8), { linearX: 0, angularZ: 0 });
});
