import assert from "node:assert/strict";
import test from "node:test";

import { toOpenOptions } from "./firmata-serialport.js";

test("toOpenOptions maps firmata-io v8 constructor args to serialport v10+ options", () => {
  assert.deepEqual(toOpenOptions("/dev/ttyACM0", { baudRate: 57600, highWaterMark: 256 }), {
    path: "/dev/ttyACM0",
    baudRate: 57600,
    highWaterMark: 256,
  });
});

test("toOpenOptions defaults baudRate to Firmata's 57600", () => {
  assert.deepEqual(toOpenOptions("/dev/ttyUSB0"), {
    path: "/dev/ttyUSB0",
    baudRate: 57600,
  });
});

test("toOpenOptions passes through a serialport v10+ options object", () => {
  const opts = { path: "/dev/ttyACM0", baudRate: 115200 };
  assert.equal(toOpenOptions(opts), opts);
});
