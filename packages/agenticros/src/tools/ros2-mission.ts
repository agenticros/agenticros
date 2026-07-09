/**
 * Tool: run_mission — Phase 1.c of the AgenticROS strategy.
 *
 * Executes a multi-step mission by chaining capabilities. Each step
 * names a capability (from `ros2_list_capabilities`); the runner maps
 * the capability to a previously-registered OpenClaw tool, calls that
 * tool's execute() with the step's resolved inputs, and feeds the
 * structured output into later steps via `{{stepId.outputs.field}}`
 * template references.
 *
 * The transport-agnostic runner itself lives in @agenticros/core; this
 * file just provides the OpenClaw-flavoured tool wrapper plus the
 * capability → tool-name binding map (which mirrors the one in
 * packages/agenticros-claude-code/src/tools.ts so all adapters agree on
 * what `drive_base`, `find_object`, etc. actually do).
 *
 * Mirrored across all three adapters — see
 * docs/strategy-ai-agents-plus-ros.md §4 Phase 1.c.
 */

import { Type } from "@sinclair/typebox";
import type { AgentTool, OpenClawPluginApi } from "../plugin-api.js";
import type {
  AgenticROSConfig,
  Mission,
  MissionToolDispatcher,
} from "@agenticros/core";
import {
  listAllCapabilities,
  runMission,
  generateMissionId,
  createMemoryTranscriptSink,
  missionTranscriptNamespace,
  compileGoalToMission,
  buildMissionBindings,
  isExternalToolName,
  capabilityIdFromExternalTool,
  executeExternalCapability,
} from "@agenticros/core";
import { resolveRobotForTool } from "./_robot-helpers.js";
import { getMissionRegistry } from "../mission-registry.js";
import { getMemory } from "../memory.js";
import { getTransportForRobot } from "../service.js";

/**
 * Snapshot of the registered tools, keyed by tool name. Built in
 * `tools/index.ts` as each tool is registered, then passed in so this
 * tool can dispatch sub-tool calls by name.
 */
export type ToolRegistry = Map<string, AgentTool>;

export function registerMissionTool(
  api: OpenClawPluginApi,
  config: AgenticROSConfig,
  registry: ToolRegistry,
): void {
  api.registerTool({
    name: "run_mission",
    label: "ROS2 Run Mission",
    description:
      "Execute a multi-step mission by chaining capabilities (the verbs returned by ros2_list_capabilities). " +
      "PASS EITHER a natural-language `goal` (recommended for simple verbs like 'find a chair', " +
      "'take a picture', 'follow me', 'find a chair and drive toward it') OR an explicit `mission.steps[]` " +
      "plan when you need precise control. Steps run sequentially; each step's outputs are available to " +
      "later steps via {{stepId.outputs.fieldName}} template references. " +
      "Default on_fail behaviour is 'stop' (abort on first error). Returns a per-step result list, a " +
      "summary line, a mission_id you can pass to mission_cancel to abort mid-run, and (when a goal was " +
      "provided) the compiled plan + candidate match list so you can see what the planner did. " +
      "When memory is enabled, every step is also written to the shared memory under namespace " +
      "mission:<mission_id> so a second agent can recall the timeline via memory_recall. " +
      "Bindings are built from the capability registry (builtins + skill-declared). " +
      "Pass mission.robot_id (or top-level robot_id with goal) to target every step at one robot. " +
      "Use mission_pause / mission_resume / mission_cancel with the returned mission_id.",
    parameters: Type.Object({
      goal: Type.Optional(
        Type.String({
          description:
            "Natural-language goal — the local planner compiles it into a mission against the capability registry. " +
            "Examples: 'find a chair', 'find a chair and drive toward it', 'take a picture', 'follow me', " +
            "'measure depth', 'drive forward at 0.3 m/s', 'turn left', 'stop'. " +
            "Either goal or mission must be provided; mission wins if both are set.",
        }),
      ),
      robot_id: Type.Optional(
        Type.String({
          description:
            "Optional robot id (from ros2_list_robots) — used when 'goal' is provided to scope every compiled step to one robot.",
        }),
      ),
      mission: Type.Optional(
        Type.Object({
          name: Type.Optional(Type.String()),
          goal: Type.Optional(Type.String()),
          robot_id: Type.Optional(
            Type.String({
              description:
                "Default robot id (from ros2_list_robots) injected into every step's tool args. Per-step inputs.robot_id overrides this for individual steps.",
            }),
          ),
          steps: Type.Array(
            Type.Object({
              id: Type.String(),
              capability: Type.String(),
              inputs: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
              on_fail: Type.Optional(Type.Union([Type.Literal("stop"), Type.Literal("continue")])),
            }),
          ),
        }),
      ),
    }),

    async execute(toolCallId, params, signal) {
      const caps = listAllCapabilities(config);
      const missionBindings = buildMissionBindings(caps, {
        toolNameResolver: (cap) => {
          const preferred = `ros2_${cap.id}`;
          if (registry.has(preferred)) return preferred;
          return undefined;
        },
      });
      const missionRaw = params["mission"];
      const goalRaw = params["goal"];
      const topLevelRobotId = typeof params["robot_id"] === "string" ? (params["robot_id"] as string) : undefined;

      // Phase 1.g — accept either an explicit mission OR a
      // natural-language goal. The planner is deterministic + rule-based,
      // so an agent can preview the compile via the same call. We surface
      // candidates/suggestions in details so a failed compile is actionable.
      let mission: Mission;
      let plannerInfo:
        | { compiled_from_goal: string; candidates: unknown[]; unmatched_verbs?: string[] }
        | undefined;
      if (missionRaw && typeof missionRaw === "object" && !Array.isArray(missionRaw)) {
        mission = missionRaw as Mission;
        if (!Array.isArray(mission.steps)) {
          const text = "mission.steps must be an array of step objects.";
          return { content: [{ type: "text", text }], details: { success: false, error: text } };
        }
      } else if (typeof goalRaw === "string" && goalRaw.trim().length > 0) {
        const planned = compileGoalToMission(goalRaw, caps, { robot_id: topLevelRobotId });
        if (!planned.mission) {
          const details = {
            success: false,
            error: planned.error,
            goal: goalRaw,
            suggestions: planned.suggestions,
            ...(planned.unmatched_verbs ? { unmatched_verbs: planned.unmatched_verbs } : {}),
          };
          return { content: [{ type: "text", text: JSON.stringify(details) }], details };
        }
        mission = planned.mission;
        plannerInfo = {
          compiled_from_goal: goalRaw,
          candidates: planned.candidates,
          ...(planned.unmatched_verbs ? { unmatched_verbs: planned.unmatched_verbs } : {}),
        };
      } else {
        const text =
          'run_mission requires either "mission" (object with steps[]) or "goal" (natural-language string). Pass at least one.';
        return { content: [{ type: "text", text }], details: { success: false, error: text } };
      }

      // Validate mission.robot_id up-front so the agent gets a single
      // clean error (with known ids) instead of one per step.
      if (typeof mission.robot_id === "string" && mission.robot_id.trim().length > 0) {
        const resolved = resolveRobotForTool(config, { robot_id: mission.robot_id });
        if ("error" in resolved) return resolved.error;
      }

      const dispatcher: MissionToolDispatcher = async (toolName, toolArgs) => {
        if (isExternalToolName(toolName)) {
          const capId = capabilityIdFromExternalTool(toolName);
          const cap = caps.find((c) => c.id === capId);
          if (!cap) {
            return { text: `Unknown external capability "${capId}".`, isError: true };
          }
          const resolved = resolveRobotForTool(config, toolArgs);
          if ("error" in resolved) {
            const errText = resolved.error.content.map((c) => ("text" in c ? c.text : "")).join("\n");
            return { text: errText, isError: true };
          }
          const transport = await getTransportForRobot(config, resolved.robot);
          const ext = await executeExternalCapability(cap, toolArgs, transport, {
            namespace: resolved.robot.namespace,
          });
          return { text: ext.text, outputs: ext.outputs, isError: ext.isError };
        }
        const tool = registry.get(toolName);
        if (!tool) {
          return {
            text: `Tool "${toolName}" is not registered with this OpenClaw plugin instance.`,
            isError: true,
          };
        }
        const res = await tool.execute(toolCallId, toolArgs, signal);
        const text = res.content
          .map((c) => (c.type === "text" ? c.text : `[image: ${c.mimeType}]`))
          .join("\n");
        // Tool results don't carry an isError flag in the OpenClaw shape;
        // surface details if it's an object so the runner can pick it up
        // as structured outputs.
        const outputs =
          res.details && typeof res.details === "object" && !Array.isArray(res.details)
            ? (res.details as Record<string, unknown>)
            : undefined;
        return { text, outputs };
      };

      // Phase 1.f — generate + register a mission_id, wire transcripts.
      // mission_cancel uses the registry to find this entry mid-run.
      // The transcript sink is only attached when memory is enabled
      // (initMemory() populated getMemory()); otherwise it stays a
      // no-op so opt-in deployments aren't affected.
      const missionId = generateMissionId();
      const missionRegistry = getMissionRegistry();
      const { entry: regEntry, dispose: disposeRegistry } = missionRegistry.register(
        missionId,
        { name: mission.name },
      );
      const memory = getMemory();
      const transcript = memory ? createMemoryTranscriptSink(memory, missionId) : undefined;

      let result;
      try {
        result = await runMission(mission, caps, missionBindings, dispatcher, {
          mission_id: missionId,
          cancellation: regEntry.cancellation,
          transcript,
          adapter: "openclaw",
        });
      } finally {
        disposeRegistry();
      }
      const compact = {
        status: result.status,
        mission_id: result.mission_id,
        ...(result.cancellation_reason ? { cancellation_reason: result.cancellation_reason } : {}),
        ...(transcript ? { transcript_namespace: missionTranscriptNamespace(missionId) } : {}),
        ...(plannerInfo ? { planner: plannerInfo } : {}),
        steps_run: result.steps_run,
        steps_total: result.steps_total,
        duration_ms: result.duration_ms,
        summary: result.summary,
        steps: result.steps.map((s) => ({
          id: s.id,
          capability: s.capability,
          status: s.status,
          inputs: s.inputs,
          outputs: s.outputs,
          ...(s.error ? { error: s.error } : {}),
          duration_ms: s.duration_ms,
        })),
      };
      return {
        content: [{ type: "text", text: `${result.summary}\n${JSON.stringify(compact)}` }],
        details: compact,
      };
    },
  });
}
