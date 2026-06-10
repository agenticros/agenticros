/**
 * `TransportPool` — Phase 1.d shared multi-robot transport pool.
 *
 * Lives in `@agenticros/core` so every adapter (Claude Code, Gemini,
 * future ones) can route per-robot transports through the same battle-
 * tested implementation. OpenClaw's plugin uses a thinner add-on
 * because its existing service has long-lived eager-connect / poll
 * semantics that don't compose cleanly with a generic pool.
 *
 * Semantics:
 *
 *   - Pool key is `__global__` when the robot has no per-robot
 *     `transport` override in config — every robot then shares one
 *     connection (the legacy / single-transport behaviour). Opting
 *     into `config.robots[]` is NOT a breaking change for that path.
 *
 *   - Pool key is `robot.id` when the robot DOES declare an override.
 *     A distinct transport is materialised on first use and cached
 *     for subsequent tool calls.
 *
 *   - Acquires are lazy — the constructor never opens a connection.
 *     The first call to `acquire()` for a given key triggers the
 *     create + connect dance, gated by `connectWithTimeout()`.
 *
 *   - Concurrent first-acquires on the same key share one in-flight
 *     connect promise — important when an MCP server gets two
 *     near-simultaneous tool calls right after startup.
 *
 *   - Cached entries that drop to a non-`connected` state are
 *     rebuilt on the next acquire (self-heal — matches the pre-pool
 *     `connect()` behaviour).
 *
 *   - `disconnectAll()` drains every entry and is safe to call on
 *     SIGINT/SIGTERM. Errors on individual disconnects are swallowed
 *     so one misbehaving transport can't block the others from
 *     cleaning up.
 *
 * The default factory is `createTransport` from `./transport/factory`.
 * Adapter shutdowns / tests can inject a fake factory by passing one
 * to the constructor — see packages/core/src/__tests__/transport-pool.test.ts
 * for the unit-test seam.
 */

import type {
  AgenticROSConfig,
  ResolvedRobot,
  RosTransport,
  TransportConfig,
} from "./index.js";
import {
  createTransport,
  getTransportConfig,
  getTransportConfigForRobot,
  hasRobotTransportOverride,
  resolveRobot,
} from "./index.js";

const CONNECT_TIMEOUT_MS = 15_000;
export const TRANSPORT_POOL_GLOBAL_KEY = "__global__";

export type TransportFactory = (cfg: TransportConfig) => Promise<RosTransport>;

export class TransportPool {
  private readonly entries = new Map<string, RosTransport>();
  /** Promises kept while a connection is in flight, so concurrent acquires share the same connect. */
  private readonly inFlight = new Map<string, Promise<RosTransport>>();

  constructor(private readonly factory: TransportFactory = createTransport) {}

  /**
   * Acquire (lazy-connect on first call) the transport for this robot.
   * See the module docstring for the full key + caching contract.
   */
  async acquire(config: AgenticROSConfig, robot: ResolvedRobot): Promise<RosTransport> {
    const key = hasRobotTransportOverride(config, robot.id)
      ? robot.id
      : TRANSPORT_POOL_GLOBAL_KEY;
    return this.acquireByKey(key, () =>
      key === TRANSPORT_POOL_GLOBAL_KEY
        ? getTransportConfig(config)
        : getTransportConfigForRobot(config, robot.id),
    );
  }

  /**
   * Pre-warm the active robot's transport at server start — used by
   * adapters that want to pay the connect-latency tax upfront instead
   * of on the first tool call.
   */
  async connectActive(config: AgenticROSConfig): Promise<void> {
    const robot = resolveRobot(config);
    await this.acquire(config, robot);
  }

  /**
   * Disconnect every transport in the pool. Safe to call multiple
   * times. Errors on individual disconnects are swallowed.
   */
  async disconnectAll(): Promise<void> {
    const pending: Promise<unknown>[] = [];
    for (const t of this.entries.values()) {
      pending.push(
        t.disconnect().catch(() => {
          /* best-effort drain */
        }),
      );
    }
    this.entries.clear();
    this.inFlight.clear();
    await Promise.all(pending);
  }

  /** Visible for tests: how many distinct transports are alive right now. */
  get size(): number {
    return this.entries.size;
  }

  /** Visible for tests: list of pool keys currently cached. */
  keys(): string[] {
    return Array.from(this.entries.keys());
  }

  private async acquireByKey(
    key: string,
    resolveCfg: () => TransportConfig,
  ): Promise<RosTransport> {
    const cached = this.entries.get(key);
    if (cached && cached.getStatus() === "connected") return cached;

    // A second concurrent acquire on the same key joins the in-flight
    // connect rather than starting a duplicate.
    const flight = this.inFlight.get(key);
    if (flight) return flight;

    if (cached) {
      // Stale entry (e.g. router restarted under us). Drop it cleanly.
      this.entries.delete(key);
      cached.disconnect().catch(() => {});
    }

    const connectFlight = (async (): Promise<RosTransport> => {
      const cfg = resolveCfg();
      const t = await this.factory(cfg);
      await connectWithTimeout(t);
      this.entries.set(key, t);
      return t;
    })();
    this.inFlight.set(key, connectFlight);
    try {
      return await connectFlight;
    } finally {
      this.inFlight.delete(key);
    }
  }
}

async function connectWithTimeout(t: RosTransport): Promise<void> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Transport connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s. ` +
              "Is zenohd running? (e.g. ws://localhost:10000). Check config and adapter logs.",
          ),
        ),
      CONNECT_TIMEOUT_MS,
    );
  });
  await Promise.race([t.connect(), timeout]);
}
