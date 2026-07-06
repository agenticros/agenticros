import assert from "node:assert/strict";
import test from "node:test";
import { parseConfig, prepareConfigForPersistence } from "../config.js";

test("prepareConfigForPersistence: omits empty robots[] when raw config had no robots key", () => {
  const raw = { robot: { namespace: "robot-alpha" } };
  const parsed = parseConfig(raw);
  const out = prepareConfigForPersistence(parsed, raw);
  assert.equal("robots" in out, false);
});

test("prepareConfigForPersistence: keeps explicit robots[] even when empty", () => {
  const raw = { robot: { namespace: "robot-alpha" }, robots: [] };
  const parsed = parseConfig(raw);
  const out = prepareConfigForPersistence(parsed, raw);
  assert.deepEqual(out.robots, []);
});

test("prepareConfigForPersistence: keeps non-empty robots[]", () => {
  const raw = {
    robots: [{ id: "alpha", namespace: "alpha-ns" }],
  };
  const parsed = parseConfig(raw);
  const out = prepareConfigForPersistence(parsed, raw);
  assert.equal(Array.isArray(out.robots) && (out.robots as unknown[]).length, 1);
});
