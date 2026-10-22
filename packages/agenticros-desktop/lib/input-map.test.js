import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BTN_LEFT,
  BTN_MIDDLE,
  BTN_RIGHT,
  MOD_ALT,
  MOD_CONTROL,
  MOD_SHIFT,
  MOD_SUPER,
  browserButtonToEvdev,
  buildUsKeymap,
  domCodeToEvdev,
  modifierMask,
  parseInputMessage,
  pointerToAbsolute,
  wheelToAxes,
} from "./input-map.js";

describe("dom code to evdev", () => {
  it("maps US letters and modifiers to linux keycodes", () => {
    assert.equal(domCodeToEvdev("KeyA"), 30);
    assert.equal(domCodeToEvdev("KeyQ"), 16);
    assert.equal(domCodeToEvdev("Enter"), 28);
    assert.equal(domCodeToEvdev("ShiftLeft"), 42);
    assert.equal(domCodeToEvdev("MetaLeft"), 125);
    assert.equal(domCodeToEvdev("NotAKey"), null);
  });

  it("builds a modifier mask from depressed evdev codes", () => {
    assert.equal(modifierMask([42, 29, 125]), MOD_SHIFT | MOD_CONTROL | MOD_SUPER);
    assert.equal(modifierMask([56]), MOD_ALT);
    assert.equal(modifierMask([30]), 0);
  });

  it("writes an XKB keymap whose KeyA keycode is evdev+8", () => {
    const keymap = buildUsKeymap();
    assert.match(keymap, /xkb_keymap \{/);
    assert.match(keymap, /<AC01> = 38;/);
    assert.match(keymap, /key <AC01> \{ type="TWO_LEVEL", symbols\[ a, A \] \};/);
    assert.match(keymap, /modifier_map Shift \{ <LFSH>, <RTSH> \};/);
  });
});

describe("pointer mapping", () => {
  it("maps normalized coordinates into the motion_absolute extent box", () => {
    assert.deepEqual(pointerToAbsolute(0, 0, 1280, 720), {
      x: 0,
      y: 0,
      xExtent: 1280,
      yExtent: 720,
    });
    assert.deepEqual(pointerToAbsolute(1, 1, 1280, 720), {
      x: 1279,
      y: 719,
      xExtent: 1280,
      yExtent: 720,
    });
    assert.deepEqual(pointerToAbsolute(0.5, 0.25, 100, 40), {
      x: 50,
      y: 10,
      xExtent: 100,
      yExtent: 40,
    });
  });

  it("clamps out-of-range positions", () => {
    const point = pointerToAbsolute(-2, 4, 10, 10);
    assert.equal(point.x, 0);
    assert.equal(point.y, 9);
  });

  it("maps mouse buttons and wheel notches", () => {
    assert.equal(browserButtonToEvdev(0), BTN_LEFT);
    assert.equal(browserButtonToEvdev(1), BTN_MIDDLE);
    assert.equal(browserButtonToEvdev(2), BTN_RIGHT);
    assert.deepEqual(wheelToAxes(0, 100), [{ axis: 0, value: 10 * 256 }]);
    assert.deepEqual(wheelToAxes(-4, 0), [{ axis: 1, value: -10 * 256 }]);
  });
});

describe("input messages", () => {
  it("accepts pointer and key payloads and rejects anything else", () => {
    assert.deepEqual(parseInputMessage('{"type":"pointer","action":"move","x":0.2,"y":0.4}'), {
      type: "pointer",
      action: "move",
      x: 0.2,
      y: 0.4,
      button: 0,
      dx: 0,
      dy: 0,
    });
    assert.deepEqual(parseInputMessage(Buffer.from('{"type":"key","action":"down","code":"KeyA"}')), {
      type: "key",
      action: "down",
      code: "KeyA",
    });
    assert.equal(parseInputMessage('{"type":"twist"}'), null);
    assert.equal(parseInputMessage("not-json"), null);
    assert.equal(parseInputMessage('{"type":"key","action":"down"}'), null);
  });
});
