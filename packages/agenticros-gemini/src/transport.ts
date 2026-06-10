/**
 * Transport lifecycle for the AgenticROS Gemini CLI.
 *
 * Thin wrapper around `@agenticros/core`'s shared `TransportPool` —
 * same as the Claude Code adapter. The pool owns per-robot routing,
 * lazy-connect, in-flight dedupe, and self-heal semantics; this
 * module just owns a process-level singleton so the chat loop and
 * tool dispatcher don't pass pool references around.
 */

import type { AgenticROSConfig, ResolvedRobot, RosTransport } from "@agenticros/core";
import { TransportPool } from "@agenticros/core";

let pool = new TransportPool();

/**
 * Async per-robot transport accessor — call from any tool that needs
 * the ROS transport. When the resolved robot has no per-robot
 * `transport` override in config, returns the shared `__global__`
 * entry (legacy single-transport behaviour); when it DOES, returns a
 * distinct per-robot transport, lazy-connecting on first use.
 */
export async function getTransportForRobot(
  config: AgenticROSConfig,
  robot: ResolvedRobot,
): Promise<RosTransport> {
  return pool.acquire(config, robot);
}

/**
 * Pre-warm the active robot's transport at chat-loop start. Lets the
 * first tool call skip the connect-latency tax.
 */
export async function connect(config: AgenticROSConfig): Promise<void> {
  await pool.connectActive(config);
}

/**
 * Drain every connection. Call on process exit / Ctrl-C.
 */
export async function disconnect(): Promise<void> {
  await pool.disconnectAll();
}

/**
 * For tests only — replace the module singleton with a custom pool
 * (constructed with a fake factory). Returns an undo function.
 */
export function _swapPoolForTests(replacement: TransportPool): () => void {
  const previous = pool;
  pool = replacement;
  return () => {
    pool = previous;
  };
}
