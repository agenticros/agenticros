/**
 * Transport lifecycle for the AgenticROS MCP server (Claude Code adapter).
 *
 * Thin wrapper around `@agenticros/core`'s shared `TransportPool`. The
 * pool owns the per-robot routing logic — see its docstring for the
 * full contract. This module just exposes a module-level singleton so
 * the rest of the adapter doesn't need to thread a pool reference
 * through every call site.
 *
 * Why a module-level singleton: the MCP server is one process. Two
 * pools would mean two transports — exactly what the pool is designed
 * to prevent. Tests inject their own pool via `_swapPoolForTests`.
 */

import type { AgenticROSConfig, ResolvedRobot, RosTransport } from "@agenticros/core";
import { TransportPool } from "@agenticros/core";

let pool = new TransportPool();

/**
 * Async per-robot transport accessor — the path every tool call takes
 * once it has resolved a target robot. Lazy-connects on first use.
 */
export async function getTransportForRobot(
  config: AgenticROSConfig,
  robot: ResolvedRobot,
): Promise<RosTransport> {
  return pool.acquire(config, robot);
}

/**
 * Pre-warm the active robot's transport at server start. Called from
 * `index.ts` before the first tool dispatch — keeps the legacy
 * "connect at startup" UX while routing through the pool internally.
 */
export async function connect(config: AgenticROSConfig): Promise<void> {
  await pool.connectActive(config);
}

/**
 * Drain every connection. Called on SIGINT/SIGTERM.
 */
export async function disconnect(): Promise<void> {
  await pool.disconnectAll();
}

/**
 * For tests only — replace the module singleton with a custom pool
 * (typically one constructed with a fake factory). Restores via the
 * returned undo function.
 */
export function _swapPoolForTests(replacement: TransportPool): () => void {
  const previous = pool;
  pool = replacement;
  return () => {
    pool = previous;
  };
}
