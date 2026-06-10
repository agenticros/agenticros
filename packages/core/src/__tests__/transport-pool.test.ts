/**
 * Unit tests for `TransportPool` — Phase 1.d-pool.
 *
 * The pool exists to make per-robot transport overrides work without
 * regressing single-transport deployments. These tests pin down the
 * five invariants that matter in production:
 *
 *   1. **Legacy / single-transport stays a singleton.** When no robot
 *      has a per-robot transport override, every acquire hands back
 *      the same `__global__` entry. That's the pre-pool behaviour.
 *
 *   2. **Per-robot overrides build distinct transports.** Two robots
 *      with their own overrides get two distinct instances, keyed by
 *      `robot.id`. Cross-traffic between them is impossible.
 *
 *   3. **Acquire is lazy.** The factory is NOT invoked until the first
 *      acquire — building the pool itself doesn't open connections.
 *
 *   4. **Concurrent acquires deduplicate.** Two near-simultaneous
 *      first-acquires on the same key share one connect promise
 *      instead of double-connecting.
 *
 *   5. **`disconnectAll` drains the pool.** After draining, the pool
 *      reports `size: 0` and a subsequent acquire is allowed to build
 *      a fresh transport.
 *
 * The tests inject a fake factory so they don't depend on Zenoh, DDS,
 * or anything network-bound. Each fake transport tracks the count of
 * `connect()` / `disconnect()` calls so we can assert exactly when
 * each was invoked.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type {
  AgenticROSConfig,
  ResolvedRobot,
  RosTransport,
  TransportConfig,
} from "../index.js";
import { parseConfig } from "../index.js";

import { TransportPool } from "../transport-pool.js";

interface FakeTransport extends RosTransport {
  /** What `mode` did this fake get built for — handy to assert per-robot routing. */
  builtForMode: TransportConfig["mode"];
  connectCount: number;
  disconnectCount: number;
}

function makeFactory(): {
  factory: (cfg: TransportConfig) => Promise<FakeTransport>;
  built: FakeTransport[];
} {
  const built: FakeTransport[] = [];
  const factory = async (cfg: TransportConfig): Promise<FakeTransport> => {
    let status: "connected" | "disconnected" | "connecting" = "disconnected";
    const t: FakeTransport = {
      builtForMode: cfg.mode,
      connectCount: 0,
      disconnectCount: 0,
      getStatus: () => status,
      connect: async () => {
        status = "connected";
        t.connectCount++;
      },
      disconnect: async () => {
        status = "disconnected";
        t.disconnectCount++;
      },
      // The pool never calls anything below — provide no-op stubs so
      // TypeScript is happy without coupling these tests to the full
      // RosTransport surface area.
      onConnectionChange: () => () => {},
      publish: async () => {},
      advertise: async () => {},
      subscribe: () => ({ unsubscribe: () => {} }),
      callService: async () => ({ result: false }),
      sendActionGoal: async () => ({ result: false }),
      listTopics: async () => [],
      listServices: async () => [],
      listActions: async () => [],
    } as unknown as FakeTransport;
    built.push(t);
    return t;
  };
  return { factory, built };
}

function makeRobot(id: string, namespace: string, source: "config" | "legacy" = "config"): ResolvedRobot {
  return {
    id,
    name: id,
    namespace,
    cameraTopic: "",
    kind: "amr",
    sensors: { has_realsense: false, has_lidar: false, has_arm: false },
    source,
  };
}

function configWithRobots(robots: Array<Record<string, unknown>>, top?: Record<string, unknown>): AgenticROSConfig {
  return parseConfig({
    transport: { mode: "local" },
    ...(top ?? {}),
    robots,
  });
}

test("transport-pool: building a pool does not invoke the factory (lazy by design)", async () => {
  const { factory, built } = makeFactory();
  new TransportPool(factory);
  assert.equal(built.length, 0, "constructor must never create a transport");
});

test("transport-pool: legacy single-robot config uses the shared __global__ entry", async () => {
  const cfg = parseConfig({
    transport: { mode: "rosbridge" },
    robot: { namespace: "legacy-ns" },
  });
  const { factory, built } = makeFactory();
  const pool = new TransportPool(factory);

  const robot = makeRobot("legacy-ns", "legacy-ns", "legacy");
  const a = (await pool.acquire(cfg, robot)) as FakeTransport;
  const b = (await pool.acquire(cfg, robot)) as FakeTransport;

  assert.strictEqual(a, b, "two acquires on the same legacy robot must return the same instance");
  assert.equal(built.length, 1, "factory must run exactly once for the shared __global__ entry");
  assert.equal(pool.size, 1);
  assert.deepEqual(pool.keys(), ["__global__"]);
  assert.equal(a.connectCount, 1, "connect must fire exactly once on first acquire");
});

test("transport-pool: multi-robot config WITHOUT overrides still shares __global__", async () => {
  // The contract the pool guarantees: opting into `robots[]` is NOT a
  // breaking change for single-transport deployments. Every robot
  // continues to share one connection until SOMEONE adds an override.
  const cfg = configWithRobots([
    { id: "alpha", namespace: "alpha" },
    { id: "beta", namespace: "beta", default: true },
  ]);
  const { factory, built } = makeFactory();
  const pool = new TransportPool(factory);

  const a = await pool.acquire(cfg, makeRobot("alpha", "alpha"));
  const b = await pool.acquire(cfg, makeRobot("beta", "beta"));

  assert.strictEqual(a, b, "robots without overrides must share __global__");
  assert.equal(built.length, 1);
  assert.deepEqual(pool.keys(), ["__global__"]);
});

test("transport-pool: per-robot override materialises a distinct transport keyed by robot.id", async () => {
  const cfg = configWithRobots(
    [
      { id: "sim", namespace: "sim_robot" },
      {
        id: "field",
        namespace: "field_robot",
        transport: { mode: "zenoh", zenoh: { routerEndpoint: "ws://farm:10000" } },
      },
    ],
    { zenoh: { routerEndpoint: "ws://default:10000" } },
  );
  const { factory, built } = makeFactory();
  const pool = new TransportPool(factory);

  const sim = (await pool.acquire(cfg, makeRobot("sim", "sim_robot"))) as FakeTransport;
  const field = (await pool.acquire(cfg, makeRobot("field", "field_robot"))) as FakeTransport;

  assert.notStrictEqual(sim, field, "the override robot must NOT share the global transport");
  assert.equal(built.length, 2, "factory should have built exactly two transports");
  assert.equal(sim.builtForMode, "local", "non-override robot uses the global mode (local)");
  assert.equal(field.builtForMode, "zenoh", "override robot uses its override mode (zenoh)");
  assert.deepEqual(pool.keys().sort(), ["__global__", "field"].sort());
});

test("transport-pool: second acquire on an override robot hits the cache (no double-build)", async () => {
  const cfg = configWithRobots([
    {
      id: "field",
      namespace: "field_robot",
      transport: { mode: "zenoh" },
    },
  ]);
  const { factory, built } = makeFactory();
  const pool = new TransportPool(factory);

  const a = (await pool.acquire(cfg, makeRobot("field", "field_robot"))) as FakeTransport;
  const b = (await pool.acquire(cfg, makeRobot("field", "field_robot"))) as FakeTransport;

  assert.strictEqual(a, b);
  assert.equal(built.length, 1);
  assert.equal(a.connectCount, 1);
});

test("transport-pool: concurrent first-acquires on the same key share one in-flight connect", async () => {
  // The fake factory delays its resolution so we can verify the second
  // acquire latches onto the first instead of kicking off a duplicate.
  const cfg = configWithRobots([
    { id: "field", namespace: "field_robot", transport: { mode: "zenoh" } },
  ]);
  let resolve: (t: FakeTransport) => void = () => {};
  let firstPromise: Promise<FakeTransport> | null = null;
  let factoryCalls = 0;
  const factory = (_cfg: TransportConfig): Promise<FakeTransport> => {
    factoryCalls++;
    if (!firstPromise) {
      firstPromise = new Promise<FakeTransport>((r) => (resolve = r));
      return firstPromise;
    }
    // If something tried to build twice, fail loudly.
    return Promise.reject(new Error("factory should not be called twice"));
  };
  const pool = new TransportPool(factory);

  const robot = makeRobot("field", "field_robot");
  const aPromise = pool.acquire(cfg, robot);
  const bPromise = pool.acquire(cfg, robot);

  // Resolve the in-flight connect.
  const fake: FakeTransport = {
    builtForMode: "zenoh",
    connectCount: 0,
    disconnectCount: 0,
    getStatus: () => "connected" as const,
    connect: async () => {
      fake.connectCount++;
    },
    disconnect: async () => {
      fake.disconnectCount++;
    },
  } as unknown as FakeTransport;
  resolve(fake);

  const [a, b] = await Promise.all([aPromise, bPromise]);
  assert.strictEqual(a, b, "concurrent acquires must hand back the same instance");
  assert.equal(factoryCalls, 1, "factory must be invoked exactly once for in-flight dedupe");
});

test("transport-pool: disconnectAll drains every entry and lets the next acquire rebuild", async () => {
  const cfg = configWithRobots(
    [
      { id: "sim", namespace: "sim_robot" },
      {
        id: "field",
        namespace: "field_robot",
        transport: { mode: "zenoh" },
      },
    ],
    { zenoh: { routerEndpoint: "ws://default:10000" } },
  );
  const { factory, built } = makeFactory();
  const pool = new TransportPool(factory);

  await pool.acquire(cfg, makeRobot("sim", "sim_robot")); // __global__
  await pool.acquire(cfg, makeRobot("field", "field_robot")); // field
  assert.equal(pool.size, 2);

  await pool.disconnectAll();
  assert.equal(pool.size, 0, "disconnectAll must clear the pool");
  for (const t of built) {
    assert.equal(t.disconnectCount, 1, "every entry must have been disconnected once");
  }

  // A fresh acquire post-drain must rebuild — proving the pool isn't
  // in a wedged state after shutdown.
  await pool.acquire(cfg, makeRobot("sim", "sim_robot"));
  assert.equal(built.length, 3, "rebuild after drain creates a new transport");
  assert.deepEqual(pool.keys(), ["__global__"]);
});

test("transport-pool: a cached transport that has dropped to disconnected is replaced on next acquire", async () => {
  // Self-healing — mirrors the prior `connect()` behaviour where a
  // half-dead transport got rebuilt rather than reused.
  const cfg = configWithRobots([{ id: "alpha", namespace: "alpha" }]);
  const { factory, built } = makeFactory();
  const pool = new TransportPool(factory);
  const robot = makeRobot("alpha", "alpha");

  const first = (await pool.acquire(cfg, robot)) as FakeTransport;
  assert.equal(built.length, 1);

  // Simulate the underlying socket going down.
  await first.disconnect();
  assert.equal(first.getStatus(), "disconnected");

  const second = (await pool.acquire(cfg, robot)) as FakeTransport;
  assert.equal(built.length, 2, "stale entry must be rebuilt, not handed back");
  assert.notStrictEqual(first, second);
  assert.equal(second.getStatus(), "connected");
});
