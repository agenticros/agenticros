import assert from "node:assert/strict";
import test from "node:test";

import { WHEEL_MIN_DUTY, twistToWheelDuty } from "./twist-duty.js";

test("a stop stays stopped", () => {
  assert.deepEqual(twistToWheelDuty(0, 0), { left: 0, right: 0 });
  assert.deepEqual(twistToWheelDuty(0.01, 0), { left: 0, right: 0 });
});

test("a Nav2 crawl is lifted to the duty that starts the TT motors", () => {
  const duty = twistToWheelDuty(0.1, 0);
  assert.equal(duty.left, WHEEL_MIN_DUTY);
  assert.equal(duty.right, WHEEL_MIN_DUTY);
});

test("teleop-speed commands are not amplified", () => {
  const duty = twistToWheelDuty(0.5, 0);
  assert.equal(duty.left, 0.5);
  assert.equal(duty.right, 0.5);
});

test("a turn keeps its left/right ratio when lifted", () => {
  const duty = twistToWheelDuty(0.12, 0.04);
  assert.ok(Math.abs(duty.left) >= WHEEL_MIN_DUTY - 0.001 || Math.abs(duty.right) >= WHEEL_MIN_DUTY - 0.001);
  const peak = Math.max(Math.abs(duty.left), Math.abs(duty.right));
  assert.ok(Math.abs(peak - WHEEL_MIN_DUTY) < 0.02);
  assert.notEqual(duty.left, duty.right);
});

test("wheel commands stay inside the PWM range", () => {
  const duty = twistToWheelDuty(2, 2);
  assert.ok(duty.left >= -1 && duty.left <= 1);
  assert.ok(duty.right >= -1 && duty.right <= 1);
});
