/**
 * MissionRegistry — Phase 1.f in-process tracker for active missions.
 *
 * Each adapter (Claude Code MCP server, OpenClaw plugin, Gemini CLI)
 * keeps a module-level registry. When `run_mission` starts, the adapter
 * registers a fresh cancellation token under a unique `mission_id` and
 * returns the id in the tool response. A sibling `mission_cancel` tool
 * call then looks up the token by id and flips `cancelled = true` — the
 * mission runner picks that up at the next step boundary and stops
 * gracefully.
 *
 * Lifetime semantics:
 *  - `register()` returns the cancellation token AND a `dispose()`
 *    callback the caller is expected to invoke in a `finally` block
 *    once the mission ends (regardless of outcome). Disposal removes
 *    the entry so a subsequent cancel doesn't silently target a
 *    completed mission and the in-memory map stays small.
 *  - `cancel()` is idempotent — calling it on a missing id returns
 *    `{ found: false }`; calling it twice on the same id is a no-op
 *    after the first.
 *
 * Why in-process (not cross-process)? Cancellation is fundamentally
 * "stop the dispatcher I'm running"; that dispatcher is local to the
 * adapter process. Cross-agent coordination is Phase 4. The transcript
 * subsystem (memory) handles the "different agent reads what I did"
 * story orthogonally.
 */

import type { MissionCancellationToken } from "./mission.js";

/** One registered mission. */
export interface MissionRegistryEntry {
  mission_id: string;
  /** Adapter-supplied label for diagnostics (e.g. mission.name). */
  name?: string;
  /** ms since epoch when the mission was registered. */
  started_at: number;
  /** The token the mission runner reads each step. */
  cancellation: MissionCancellationToken;
}

/**
 * Generate a stable, URL-safe mission identifier.
 *
 * Uses `crypto.randomUUID()` when available (Node 14.17+, Bun, modern
 * browsers); falls back to a Math.random hex string with a `mns_` prefix.
 * Either way the id is opaque to downstream consumers — they just echo
 * it back to `mission_cancel` / `memory_recall`.
 */
export function generateMissionId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return `mn_${g.crypto.randomUUID()}`;
  const a = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  const b = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  const c = Date.now().toString(16);
  return `mn_${a}${b}${c}`;
}

/**
 * Compute the canonical memory namespace for a mission's transcripts.
 *
 * The convention is `mission:<id>` so a downstream agent can recall
 * every step the first agent ran via
 * `memory_recall({ namespace: "mission:<id>", query: "" })`. This lives
 * here (not in the memory module) because the adapter's transcript
 * sink uses it and we want exactly one source of truth.
 */
export function missionTranscriptNamespace(missionId: string): string {
  return `mission:${missionId}`;
}

export class MissionRegistry {
  private readonly entries = new Map<string, MissionRegistryEntry>();

  /**
   * Register a fresh mission, returning the entry (with the
   * cancellation token to hand to `runMission`) and a `dispose` hook
   * to invoke when the mission ends. The id is caller-supplied so
   * adapters can echo it in the tool response before this point.
   */
  register(missionId: string, opts?: { name?: string }): {
    entry: MissionRegistryEntry;
    dispose: () => void;
  } {
    const entry: MissionRegistryEntry = {
      mission_id: missionId,
      name: opts?.name,
      started_at: Date.now(),
      cancellation: { cancelled: false },
    };
    this.entries.set(missionId, entry);
    return {
      entry,
      dispose: () => {
        // Only remove if we're disposing the same entry — guards against
        // a race where the same id is re-registered between dispose calls
        // (unlikely but cheap to defend against).
        if (this.entries.get(missionId) === entry) this.entries.delete(missionId);
      },
    };
  }

  /**
   * Flip the cancellation token for the named mission.
   *
   * Returns `{ found: true }` when the mission existed (whether it was
   * already cancelled or not), `{ found: false }` when the id is
   * unknown (e.g. mission already finished + disposed).
   */
  cancel(missionId: string, reason?: string): { found: boolean; alreadyCancelled: boolean } {
    const entry = this.entries.get(missionId);
    if (!entry) return { found: false, alreadyCancelled: false };
    const alreadyCancelled = entry.cancellation.cancelled === true;
    entry.cancellation.cancelled = true;
    if (reason !== undefined) entry.cancellation.reason = reason;
    return { found: true, alreadyCancelled };
  }

  /** True when the named mission is currently registered. */
  has(missionId: string): boolean {
    return this.entries.has(missionId);
  }

  /**
   * Snapshot of the active mission set (for diagnostics / mission_list
   * tools down the road). Returns a shallow copy so callers can't
   * mutate internal state.
   */
  list(): MissionRegistryEntry[] {
    return [...this.entries.values()].map((e) => ({
      mission_id: e.mission_id,
      name: e.name,
      started_at: e.started_at,
      cancellation: { ...e.cancellation },
    }));
  }

  /** Test-only: drop every registered mission. */
  _clear(): void {
    this.entries.clear();
  }
}
