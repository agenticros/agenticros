/**
 * Memory-backed mission transcript sink — Phase 1.f wiring.
 *
 * `createMemoryTranscriptSink(memory, missionId)` returns a
 * `MissionTranscriptSink` the adapter hands to `runMission`. Each
 * step's `MissionTranscriptEntry` is serialised to JSON and persisted
 * via the shared `MemoryProvider` under the canonical
 * `mission:<id>` namespace.
 *
 * Why JSON content (and not the structured `MemoryRecord` fields):
 * `MemoryProvider.remember` only takes `content: string` (plus
 * optional tags/path). We pack the full step snapshot into `content`
 * so a downstream agent can `JSON.parse(record.content)` after
 * `memory_recall(namespace="mission:<id>")`. Tags are used as
 * coarse-grained filters (e.g. "step:ok" vs "step:error") for
 * future status queries.
 *
 * The returned sink is best-effort by contract — `runMission` already
 * swallows thrown errors, but we also defensively catch the await so a
 * mem0 outage never propagates back into the run loop.
 */

import type { MemoryProvider } from "./memory/index.js";
import type { MissionTranscriptSink, MissionTranscriptEntry } from "./mission.js";
import { missionTranscriptNamespace } from "./mission-registry.js";

/**
 * Build a transcript sink that writes each step's entry to memory.
 *
 * @param memory      Active memory provider (caller has already
 *                    confirmed `config.memory.enabled === true`).
 * @param missionId   Mission identifier. Surfaced as the namespace
 *                    and also embedded in the content for grep-ability.
 */
export function createMemoryTranscriptSink(
  memory: MemoryProvider,
  missionId: string,
): MissionTranscriptSink {
  const namespace = missionTranscriptNamespace(missionId);
  return async (entry: MissionTranscriptEntry): Promise<void> => {
    try {
      const content = JSON.stringify({
        // Echo mission_id in the payload too — recall() returns the
        // content blob; mission_id in the namespace might be lost if
        // the caller scopes their recall differently.
        mission_id: entry.mission_id || missionId,
        mission_name: entry.mission_name,
        adapter: entry.adapter,
        robot_id: entry.robot_id,
        started_at: entry.started_at,
        step_index: entry.step_index,
        step_total: entry.step_total,
        step: {
          id: entry.result.id,
          capability: entry.result.capability,
          status: entry.result.status,
          inputs: entry.result.inputs,
          outputs: entry.result.outputs,
          message: entry.result.message,
          error: entry.result.error,
          duration_ms: entry.result.duration_ms,
        },
      });
      // Tags are deliberately stable + greppable so a future
      // `memory_recall(tags=…)` can filter to "every cancelled step"
      // or "every step that touched capability=drive_base".
      await memory.remember({
        namespace,
        content,
        tags: [
          "mission_transcript",
          `step:${entry.result.status}`,
          `capability:${entry.result.capability}`,
        ],
        path: `${missionId}/${String(entry.step_index).padStart(3, "0")}-${entry.result.id}`,
      });
    } catch {
      // Best-effort: transcript loss must NEVER abort the mission.
    }
  };
}
