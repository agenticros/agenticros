/**
 * Unit tests for Phase 1.e `findRobotsFor`.
 *
 * What these pin down (each test corresponds to a real failure mode in
 * the multi-robot fleet UX):
 *
 *   - capability filter: matches against the global registry by default;
 *     a per-robot allowlist OVERRIDES the global registry (heterogeneous
 *     fleets); a capability absent from both filters the robot out.
 *   - kind filter: case-insensitive, exact match, no fuzzy matching
 *     (`amr` doesn't match `AMR Pro` — keeps the surface tiny).
 *   - online filter: needs onlineIds; when true keeps only online; when
 *     false keeps only offline; when omitted does not filter.
 *   - ranking: explicit per-robot capability match outscores inherited;
 *     online outscores offline; ties broken by config declaration order.
 *   - error path: query.online set + no onlineIds throws so adapters
 *     never silently skip the filter.
 *   - back-compat: a config with no robots[] still works (the legacy
 *     single robot is included with kind="amr" and all-false sensors).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseConfig } from "../config.js";
import { findRobotsFor } from "../find-robots-for.js";

function configWith(robots: unknown[]) {
  return parseConfig({ robots });
}

test("findRobotsFor: no query → returns the whole fleet in config order", () => {
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    { id: "beta", namespace: "beta-ns" },
  ]);
  const out = findRobotsFor(cfg, {});
  assert.equal(out.total, 2);
  assert.equal(out.robots[0].robot.id, "alpha");
  assert.equal(out.robots[1].robot.id, "beta");
});

test("findRobotsFor: capability matches against the global registry by default", () => {
  // `drive_base` is a built-in capability so both robots inherit it.
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    { id: "beta", namespace: "beta-ns" },
  ]);
  const out = findRobotsFor(cfg, { capability: "drive_base" });
  assert.equal(out.total, 2);
  for (const m of out.robots) {
    assert.equal(
      m.matched_capability_explicitly,
      false,
      "no per-robot allowlist means the match is inherited",
    );
  }
});

test("findRobotsFor: capability absent from global registry filters everyone out", () => {
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    { id: "beta", namespace: "beta-ns" },
  ]);
  const out = findRobotsFor(cfg, { capability: "no_such_capability" });
  assert.equal(out.total, 0);
});

test("findRobotsFor: per-robot capability allowlist OVERRIDES the global registry", () => {
  // beta declares an allowlist that includes `arm_grasp` only.
  // alpha has no allowlist → falls back to the global registry which
  // does NOT contain `arm_grasp` → alpha filtered out.
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    {
      id: "beta",
      namespace: "beta-ns",
      capabilities: ["arm_grasp"],
    },
  ]);
  const out = findRobotsFor(cfg, { capability: "arm_grasp" });
  assert.equal(out.total, 1);
  assert.equal(out.robots[0].robot.id, "beta");
  assert.equal(out.robots[0].matched_capability_explicitly, true);
});

test("findRobotsFor: per-robot allowlist also filters out global capabilities NOT in the list", () => {
  // beta's allowlist excludes `drive_base` — even though it's a builtin,
  // beta declared a tighter set. So `drive_base` only matches alpha.
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    {
      id: "beta",
      namespace: "beta-ns",
      capabilities: ["arm_grasp"],
    },
  ]);
  const out = findRobotsFor(cfg, { capability: "drive_base" });
  assert.equal(out.total, 1);
  assert.equal(out.robots[0].robot.id, "alpha");
});

test("findRobotsFor: kind filter is case-insensitive and exact-match", () => {
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns", kind: "amr" },
    { id: "beta", namespace: "beta-ns", kind: "arm" },
    { id: "gamma", namespace: "gamma-ns", kind: "drone" },
  ]);
  const amrs = findRobotsFor(cfg, { kind: "AMR" });
  assert.equal(amrs.total, 1);
  assert.equal(amrs.robots[0].robot.id, "alpha");

  const drones = findRobotsFor(cfg, { kind: "drone" });
  assert.equal(drones.total, 1);
  assert.equal(drones.robots[0].robot.id, "gamma");
});

test("findRobotsFor: kind filter rejects non-exact matches (no fuzzy)", () => {
  const cfg = configWith([{ id: "alpha", namespace: "alpha-ns", kind: "amr-pro" }]);
  // Looking for "amr" — "amr-pro" is NOT a match. Phase 1.e is exact.
  assert.equal(findRobotsFor(cfg, { kind: "amr" }).total, 0);
});

test("findRobotsFor: online=true keeps only robots in the onlineIds set", () => {
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    { id: "beta", namespace: "beta-ns" },
    { id: "gamma", namespace: "gamma-ns" },
  ]);
  const onlineIds = new Set(["alpha", "gamma"]);
  const out = findRobotsFor(cfg, { online: true }, onlineIds);
  const ids = out.robots.map((m) => m.robot.id);
  assert.deepEqual(ids, ["alpha", "gamma"]);
  assert.equal(out.robots.every((m) => m.online === true), true);
});

test("findRobotsFor: online=false keeps only robots NOT in onlineIds", () => {
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    { id: "beta", namespace: "beta-ns" },
  ]);
  const out = findRobotsFor(cfg, { online: false }, new Set(["alpha"]));
  assert.equal(out.total, 1);
  assert.equal(out.robots[0].robot.id, "beta");
  assert.equal(out.robots[0].online, false);
});

test("findRobotsFor: providing onlineIds without query.online still annotates online status", () => {
  // A common UX pattern: "show me everyone, but tell me which are online."
  const cfg = configWith([
    { id: "alpha", namespace: "alpha-ns" },
    { id: "beta", namespace: "beta-ns" },
  ]);
  const out = findRobotsFor(cfg, {}, new Set(["alpha"]));
  const alpha = out.robots.find((m) => m.robot.id === "alpha");
  const beta = out.robots.find((m) => m.robot.id === "beta");
  assert.equal(alpha?.online, true);
  assert.equal(beta?.online, false);
});

test("findRobotsFor: online filter with no onlineIds throws (caller bug guard)", () => {
  const cfg = configWith([{ id: "alpha", namespace: "alpha-ns" }]);
  assert.throws(() => findRobotsFor(cfg, { online: true }), /onlineIds was not provided/);
});

test("findRobotsFor: ranking — explicit-allowlist match beats inherited match", () => {
  const cfg = configWith([
    { id: "inherited", namespace: "inh-ns" }, // inherits drive_base from registry
    {
      id: "explicit",
      namespace: "exp-ns",
      capabilities: ["drive_base"], // explicitly declares it
    },
  ]);
  const out = findRobotsFor(cfg, { capability: "drive_base" });
  assert.equal(out.total, 2);
  assert.equal(
    out.robots[0].robot.id,
    "explicit",
    "explicit allowlist match should rank above inherited",
  );
  assert.equal(out.robots[1].robot.id, "inherited");
});

test("findRobotsFor: ranking — online beats offline when query.online is true", () => {
  const cfg = configWith([
    { id: "offline", namespace: "off-ns" },
    { id: "online", namespace: "on-ns" },
  ]);
  // We're not filtering by online (so both kept), but ranking should
  // still surface the online one first.
  const out = findRobotsFor(cfg, {}, new Set(["online"]));
  assert.equal(out.robots[0].robot.id, "online");
});

test("findRobotsFor: ranking — ties broken by config declaration order (stable)", () => {
  const cfg = configWith([
    { id: "first", namespace: "first-ns" },
    { id: "second", namespace: "second-ns" },
    { id: "third", namespace: "third-ns" },
  ]);
  const out = findRobotsFor(cfg, {});
  assert.deepEqual(
    out.robots.map((m) => m.robot.id),
    ["first", "second", "third"],
  );
});

test("findRobotsFor: back-compat — empty robots[] still returns the legacy entry", () => {
  // No robots[], just the legacy single-robot block. The resolver should
  // synthesize one match with kind=amr and all-false sensors so that
  // existing single-robot deployments work with `find_robots_for`.
  const cfg = parseConfig({
    robot: { name: "Legacy", namespace: "legacy-ns" },
  });
  const out = findRobotsFor(cfg, {});
  assert.equal(out.total, 1);
  assert.equal(out.robots[0].robot.id, "legacy-ns");
  assert.equal(out.robots[0].robot.kind, "amr");
  assert.equal(out.robots[0].robot.sensors.has_realsense, false);
});

test("findRobotsFor: combined filters — capability AND kind AND online", () => {
  const cfg = configWith([
    {
      id: "amr-online",
      namespace: "ao-ns",
      kind: "amr",
      capabilities: ["follow_person"],
    },
    {
      id: "amr-offline",
      namespace: "aoff-ns",
      kind: "amr",
      capabilities: ["follow_person"],
    },
    {
      id: "arm-online",
      namespace: "arm-ns",
      kind: "arm",
      capabilities: ["arm_grasp"],
    },
  ]);
  const out = findRobotsFor(
    cfg,
    { capability: "follow_person", kind: "amr", online: true },
    new Set(["amr-online", "arm-online"]),
  );
  assert.equal(out.total, 1);
  assert.equal(out.robots[0].robot.id, "amr-online");
});

test("findRobotsFor: result.query echoes only the filters actually applied", () => {
  const cfg = configWith([{ id: "alpha", namespace: "alpha-ns" }]);
  const out = findRobotsFor(cfg, { kind: "AMR" });
  assert.deepEqual(out.query, { kind: "amr" }, "kind is lowercased in the echo");
  assert.equal("capability" in out.query, false, "absent fields aren't included");
  assert.equal("online" in out.query, false);
});
