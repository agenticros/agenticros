/**
 * Unit tests for the Phase 1.d multi-robot resolver.
 *
 * What these tests pin down (each one corresponds to a real failure mode
 * the resolver has to defend against in production):
 *
 *   - Backwards compat: existing single-robot configs (no `robots`
 *     array) must yield a synthesized one-entry list so older configs
 *     don't break and the chat agent doesn't see "no robots configured".
 *   - Synthesized fallback id derives from namespace when non-empty,
 *     defaults to "default" otherwise — important because the active id
 *     is what tool calls will key off in the next iteration.
 *   - Explicit `robots: []` takes precedence over the legacy single
 *     robot when non-empty.
 *   - `default: true` flag wins regardless of position. First-entry wins
 *     when no default flag.
 *   - `resolveRobot(robotId)` returns the matching entry, OR a
 *     descriptive error containing the known ids — the error text shape
 *     matters because the LLM uses it to self-correct.
 *   - `resolveRobot()` with no id returns the active robot, matching
 *     getActiveRobotId().
 *   - Edge: an explicit override on getActiveRobotId returns it
 *     verbatim (even if the id doesn't exist — discovery happens at
 *     resolveRobot time, not here).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseConfig } from "../config.js";
import {
  listRobots,
  resolveRobot,
  getActiveRobotId,
  getTransportConfigForRobot,
  hasRobotTransportOverride,
  type ResolvedRobot,
} from "../robots.js";

test("robots: empty config yields one synthesized 'default' entry (legacy fallback)", () => {
  const cfg = parseConfig({});
  const robots = listRobots(cfg);
  assert.equal(robots.length, 1);
  assert.equal(robots[0].id, "default");
  assert.equal(robots[0].name, "Robot");
  assert.equal(robots[0].namespace, "");
  assert.equal(robots[0].source, "legacy");
});

test("robots: legacy single-robot config synthesizes id from namespace", () => {
  const cfg = parseConfig({
    robot: { name: "Spot", namespace: "robot-spot-1", cameraTopic: "/cam" },
  });
  const robots = listRobots(cfg);
  assert.equal(robots.length, 1);
  assert.equal(robots[0].id, "robot-spot-1");
  assert.equal(robots[0].name, "Spot");
  assert.equal(robots[0].namespace, "robot-spot-1");
  assert.equal(robots[0].cameraTopic, "/cam");
  assert.equal(robots[0].source, "legacy");
});

test("robots: explicit robots[] array overrides the legacy single-robot fallback", () => {
  const cfg = parseConfig({
    robot: { name: "Ignored", namespace: "ignored-ns" },
    robots: [
      { id: "alpha", name: "Alpha", namespace: "ns-alpha" },
      { id: "beta", name: "Beta", namespace: "ns-beta" },
    ],
  });
  const robots = listRobots(cfg);
  assert.equal(robots.length, 2);
  assert.deepEqual(
    robots.map((r) => r.id),
    ["alpha", "beta"],
  );
  for (const r of robots) assert.equal(r.source, "config");
});

test("robots: getActiveRobotId returns first entry when no default flag is set", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta" },
    ],
  });
  assert.equal(getActiveRobotId(cfg), "alpha");
});

test("robots: getActiveRobotId picks the default-flagged entry regardless of position", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta", default: true },
      { id: "gamma", name: "Gamma" },
    ],
  });
  assert.equal(getActiveRobotId(cfg), "beta");
});

test("robots: getActiveRobotId honours explicit override", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta", default: true },
    ],
  });
  assert.equal(getActiveRobotId(cfg, "alpha"), "alpha");
});

test("robots: getActiveRobotId trims whitespace from the override", () => {
  const cfg = parseConfig({
    robots: [{ id: "alpha", name: "Alpha" }],
  });
  assert.equal(getActiveRobotId(cfg, "  alpha  "), "alpha");
});

test("robots: getActiveRobotId ignores empty-string overrides (falls through to default rules)", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta", default: true },
    ],
  });
  assert.equal(getActiveRobotId(cfg, ""), "beta");
  assert.equal(getActiveRobotId(cfg, "   "), "beta");
});

test("robots: resolveRobot() with no id returns the active robot", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta", default: true },
    ],
  });
  const r = resolveRobot(cfg);
  assert.equal(r.id, "beta");
  assert.equal(r.name, "Beta");
});

test("robots: resolveRobot(id) returns the matching entry", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha", namespace: "ns-a" },
      { id: "beta", name: "Beta", namespace: "ns-b" },
    ],
  });
  const r: ResolvedRobot = resolveRobot(cfg, "beta");
  assert.equal(r.id, "beta");
  assert.equal(r.namespace, "ns-b");
});

test("robots: resolveRobot(unknown id) throws with known ids listed in the error message", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta" },
    ],
  });
  assert.throws(
    () => resolveRobot(cfg, "gamma"),
    (err: Error) => {
      assert.ok(
        err.message.includes("gamma"),
        `error should mention the unknown id (got: ${err.message})`,
      );
      assert.ok(
        err.message.includes("alpha") && err.message.includes("beta"),
        `error should list known ids (got: ${err.message})`,
      );
      assert.ok(
        err.message.toLowerCase().includes("ros2_list_robots"),
        `error should hint at ros2_list_robots for self-correction (got: ${err.message})`,
      );
      return true;
    },
  );
});

test("robots: resolveRobot trims whitespace from id arg", () => {
  const cfg = parseConfig({
    robots: [{ id: "alpha", name: "Alpha" }],
  });
  assert.equal(resolveRobot(cfg, "  alpha  ").id, "alpha");
});

test("robots: source tag distinguishes config vs legacy entries", () => {
  const cfgLegacy = parseConfig({ robot: { namespace: "ns" } });
  const cfgExplicit = parseConfig({ robots: [{ id: "x" }] });
  assert.equal(listRobots(cfgLegacy)[0].source, "legacy");
  assert.equal(listRobots(cfgExplicit)[0].source, "config");
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.d-resolve: per-robot transport override tests.
//
// These pin down a contract that matters for the multi-host fleet story —
// once adopted by adapters, a single host can simultaneously drive a local
// sim (mode: "local") AND a remote real robot reached via a router
// (mode: "zenoh" / "rosbridge"). The resolver alone doesn't materialise
// transports — it surfaces the right TransportConfig per robot id so an
// adapter pool can call `createTransport` on it.
// ─────────────────────────────────────────────────────────────────────────────

test("transport-override: schema accepts a per-robot override and round-trips", () => {
  const cfg = parseConfig({
    robots: [
      {
        id: "sim",
        namespace: "sim_robot",
        transport: { mode: "local", local: { domainId: 7 } },
      },
    ],
  });
  // Parsed shape preserves the override discriminant + sub-section.
  const raw = cfg.robots[0]?.transport;
  assert.ok(raw, "override must survive parseConfig");
  assert.equal(raw!.mode, "local");
  // Discriminant-narrowed access.
  if (raw!.mode === "local") {
    assert.equal(raw!.local?.domainId, 7);
  }
});

test("transport-override: schema rejects a sub-section that doesn't match the mode", () => {
  // A `mode: "zenoh"` override with a `local: {...}` sub-section is a
  // typo we want to catch at parse time — otherwise the override would
  // silently fall back to the global zenoh config and the user's
  // intent would be lost.
  assert.throws(() =>
    parseConfig({
      robots: [
        {
          id: "sim",
          transport: { mode: "zenoh", local: { domainId: 1 } } as unknown as Record<string, unknown>,
        },
      ],
    }),
  );
});

test("transport-override: getTransportConfigForRobot returns the override when set", () => {
  const cfg = parseConfig({
    transport: { mode: "rosbridge" },
    rosbridge: { url: "ws://default:9090" },
    robots: [
      { id: "real", namespace: "real" },
      {
        id: "sim",
        namespace: "sim_robot",
        transport: { mode: "local", local: { domainId: 7 } },
      },
    ],
  });
  const t = getTransportConfigForRobot(cfg, "sim");
  assert.equal(t.mode, "local");
  if (t.mode === "local") {
    assert.equal(t.local?.domainId, 7, "override domainId must win");
  }
});

test("transport-override: getTransportConfigForRobot falls back to the global transport when no override", () => {
  const cfg = parseConfig({
    transport: { mode: "zenoh" },
    zenoh: { routerEndpoint: "ws://global:10000" },
    robots: [{ id: "real", namespace: "real" }],
  });
  const t = getTransportConfigForRobot(cfg, "real");
  assert.equal(t.mode, "zenoh");
  if (t.mode === "zenoh") {
    assert.equal(t.zenoh.routerEndpoint, "ws://global:10000");
  }
});

test("transport-override: sub-section omitted in override inherits from top-level config", () => {
  // The user wants `sim` to use zenoh BUT didn't repeat the
  // routerEndpoint inside the override. The resolver must use the
  // top-level zenoh config so they don't have to duplicate it.
  const cfg = parseConfig({
    transport: { mode: "rosbridge" }, // global mode is different — irrelevant here
    zenoh: { routerEndpoint: "ws://shared:10000", domainId: 3 },
    robots: [
      {
        id: "sim",
        namespace: "sim_robot",
        transport: { mode: "zenoh" }, // no `zenoh: {...}` sub-section
      },
    ],
  });
  const t = getTransportConfigForRobot(cfg, "sim");
  assert.equal(t.mode, "zenoh");
  if (t.mode === "zenoh") {
    assert.equal(t.zenoh.routerEndpoint, "ws://shared:10000");
    assert.equal(t.zenoh.domainId, 3);
  }
});

test("transport-override: partial sub-section in override merges over top-level (per-field precedence)", () => {
  // The override only customises routerEndpoint — domainId should
  // continue to come from the top-level config. This is the most
  // common real-world shape (override just the endpoint, keep
  // everything else).
  const cfg = parseConfig({
    transport: { mode: "rosbridge" },
    zenoh: { routerEndpoint: "ws://shared:10000", domainId: 3 },
    robots: [
      {
        id: "field",
        namespace: "field_robot",
        transport: {
          mode: "zenoh",
          zenoh: { routerEndpoint: "ws://field-router:10000" },
        },
      },
    ],
  });
  const t = getTransportConfigForRobot(cfg, "field");
  assert.equal(t.mode, "zenoh");
  if (t.mode === "zenoh") {
    assert.equal(t.zenoh.routerEndpoint, "ws://field-router:10000", "override wins per-field");
    assert.equal(t.zenoh.domainId, 3, "non-overridden fields inherit from global");
  }
});

test("transport-override: legacy single-robot config still returns the global transport", () => {
  // Backwards compat: when robots[] is empty, there's no override
  // possible — fast path returns the global transport unmodified.
  const cfg = parseConfig({
    transport: { mode: "rosbridge" },
    rosbridge: { url: "ws://default:9090" },
    robot: { namespace: "legacy" },
  });
  const t = getTransportConfigForRobot(cfg, "legacy");
  assert.equal(t.mode, "rosbridge");
  if (t.mode === "rosbridge") {
    assert.equal(t.rosbridge.url, "ws://default:9090");
  }
});

test("transport-override: getTransportConfigForRobot() without id uses the active robot", () => {
  const cfg = parseConfig({
    transport: { mode: "local" },
    robots: [
      { id: "alpha", namespace: "alpha" },
      {
        id: "beta",
        namespace: "beta",
        default: true,
        transport: { mode: "zenoh", zenoh: { routerEndpoint: "ws://beta:10000" } },
      },
    ],
  });
  const t = getTransportConfigForRobot(cfg); // no id ⇒ active = beta
  assert.equal(t.mode, "zenoh");
});

test("transport-override: getTransportConfigForRobot throws on unknown robot_id (same contract as resolveRobot)", () => {
  const cfg = parseConfig({
    robots: [{ id: "alpha", namespace: "alpha" }],
  });
  assert.throws(
    () => getTransportConfigForRobot(cfg, "gamma"),
    /Unknown robot_id "gamma"/,
  );
});

test("transport-override: hasRobotTransportOverride() reflects presence", () => {
  const cfg = parseConfig({
    robots: [
      { id: "alpha", namespace: "alpha" },
      {
        id: "beta",
        namespace: "beta",
        transport: { mode: "local" },
      },
    ],
  });
  assert.equal(hasRobotTransportOverride(cfg, "alpha"), false);
  assert.equal(hasRobotTransportOverride(cfg, "beta"), true);
});

test("transport-override: hasRobotTransportOverride() returns false (not throws) for unknown ids", () => {
  // Robust against arbitrary tool args — adapters often want a cheap
  // "should I take the pool path?" check before validating robot ids.
  const cfg = parseConfig({
    robots: [{ id: "alpha", namespace: "alpha" }],
  });
  assert.equal(hasRobotTransportOverride(cfg, "no-such"), false);
});

test("transport-override: ResolvedRobot is unchanged by overrides (transport is read via the helper, not the resolved record)", () => {
  // Intentional design choice — ResolvedRobot stays lean. Tools that
  // care about transport call getTransportConfigForRobot explicitly.
  // This test guards that surface from accidental coupling.
  const cfg = parseConfig({
    robots: [
      {
        id: "sim",
        namespace: "sim",
        transport: { mode: "local", local: { domainId: 7 } },
      },
    ],
  });
  const r = resolveRobot(cfg, "sim");
  assert.equal(r.id, "sim");
  assert.equal((r as ResolvedRobot & { transport?: unknown }).transport, undefined);
});
