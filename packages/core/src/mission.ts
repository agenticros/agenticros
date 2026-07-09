/**
 * Mission runner — Phase 1.c of the AgenticROS strategy.
 *
 * A mission is a declarative sequence of capability invocations. Each step
 * names a capability (from the registry exposed by `ros2_list_capabilities`)
 * with literal or templated inputs, where templates can reference outputs
 * from earlier steps via `{{stepId.outputs.fieldName}}`.
 *
 * The runner here is transport-agnostic — it takes a `dispatcher` callback
 * that knows how to invoke a single tool for the host adapter. Adapters
 * pass their existing tool dispatch path (handleToolCall in claude-code,
 * tool.execute() in OpenClaw, executeTool() in Gemini), and the runner
 * stays the same across all three.
 *
 * Phase 1.d adds multi-robot routing: `mission.robot_id` (optional) and
 * per-step `inputs.robot_id` are auto-injected into every dispatched
 * tool call when the binding's tool args don't already specify one. The
 * adapter-side tool handlers then resolve the robot via
 * `resolveRobotFromArgs(config, args)` and route the underlying
 * publish/subscribe/etc. through that robot's namespace.
 *
 * Precedence (highest wins):
 *   1. Tool args produced by the binding (`binding.buildArgs(inputs)`)
 *      — if it sets `robot_id`, that's final.
 *   2. Per-step `inputs.robot_id` (lets a mission mix robots step-by-step).
 *   3. Mission-level `mission.robot_id` (the default for every step).
 *   4. None — the adapter falls back to the active robot.
 *
 * Phase 1.f extends the runner with two additive capabilities:
 *   - `cancellation`: a token the runner checks BEFORE each step. The
 *     adapter holds the token in its `MissionRegistry` so a sibling
 *     tool call (`mission_cancel(mission_id)`) can flip
 *     `cancellation.cancelled` mid-run and stop the mission gracefully.
 *     Steps that have already completed keep their results; the current
 *     step finishes naturally (the runner doesn't preempt
 *     `await dispatcher(...)` because that requires per-tool cancel
 *     support — out of scope for Phase 1.f); subsequent steps are
 *     marked `"cancelled"` and skipped.
 *   - `transcript`: a callback invoked after every step with the
 *     step's `MissionStepResult`. Adapters wire this to the shared
 *     memory subsystem so a second agent can `recall(namespace=
 *     "mission:<id>")` and inspect what's run so far. The runner
 *     itself owns no I/O — the callback can be a no-op when memory
 *     is disabled.
 *
 * What's still deferred:
 *   - Parallel step execution (today: sequential only).
 *   - Per-tool cancellation (cancel TIES to step boundaries today;
 *     pause/resume also ties to step boundaries).
 *   - Retry / backoff policies.
 *
 * Shipped since the original Phase 1.f header:
 *   - Natural-language plan compilation (`compileGoalToMission` + goal arg).
 *   - Pause / resume via the same control token (`paused` flag).
 *
 * See: docs/strategy-ai-agents-plus-ros.md §4 (Phase 1.c / 1.f).
 */

import type { Capability } from "./capabilities.js";

/**
 * Cancellation / pause token consumed by `runMission`.
 *
 * Plain object (not AbortController) so it's easy to share across
 * processes via a registry without pulling Web platform shims in. The
 * runner reads `cancelled` and `paused` at each step boundary.
 */
export interface MissionCancellationToken {
  cancelled: boolean;
  /**
   * When true, the runner waits at the next step boundary until
   * `paused` is cleared or `cancelled` is set. Phase 1 pause/resume.
   */
  paused?: boolean;
  /** Optional free-text reason — bubbled up into cancelled / paused results. */
  reason?: string;
}

/** Alias — control token is the same object as the cancellation token. */
export type MissionControlToken = MissionCancellationToken;

/**
 * Per-step transcript sink. Called immediately after a step finishes
 * (including cancelled / skipped steps) so an external store sees the
 * whole timeline, not just the post-mortem `MissionResult`.
 *
 * The callback is best-effort: thrown errors are logged but never
 * propagate up — losing a transcript entry must not abort an
 * otherwise-healthy mission.
 */
export type MissionTranscriptSink = (
  entry: MissionTranscriptEntry,
) => Promise<void> | void;

/** One transcript entry per executed step. */
export interface MissionTranscriptEntry {
  /** Unique id of the running mission (assigned by the adapter, not the runner). */
  mission_id: string;
  /** Free-text mission label. */
  mission_name?: string;
  /** Adapter that ran the mission (e.g. "claude-code", "openclaw", "gemini"). */
  adapter?: string;
  /** When the step started (ms since epoch). */
  started_at: number;
  /** Mission-level robot id (empty when unset). */
  robot_id?: string;
  /** Index of this step in mission.steps (0-based). */
  step_index: number;
  /** Total steps in the mission. */
  step_total: number;
  /** Snapshot of the per-step result. */
  result: MissionStepResult;
}

/** One step in a mission. */
export interface MissionStep {
  /** Unique id within the mission, used by later steps for `{{id.outputs.x}}`. */
  id: string;
  /**
   * Capability id (e.g. `drive_base`, `find_object`). The runner looks this
   * up in the capability registry and uses a dispatch map to find the
   * underlying tool to invoke.
   */
  capability: string;
  /**
   * Inputs to the capability. Values can be literals or `{{stepId.outputs.x}}`
   * templates that resolve from prior steps' outputs.
   */
  inputs?: Record<string, unknown>;
  /**
   * Optional behaviour when this step fails. Defaults to "stop".
   *   - "stop":     halt the mission, mark it failed
   *   - "continue": record the failure and run the next step anyway
   */
  on_fail?: "stop" | "continue";
}

/** A complete mission plan. */
export interface Mission {
  /** Free-text label for logs / chat replies (e.g. "find chair and approach"). */
  name?: string;
  /**
   * Optional planning notes from the agent — surfaced in the result for
   * downstream summarisation. The runner ignores it.
   */
  goal?: string;
  /**
   * Optional default robot id for every step. Each step's tool args get
   * `robot_id` auto-injected from this when the step doesn't supply its
   * own and the binding's tool args don't already include one. Unknown
   * robot ids surface as a tool error from the adapter, not from the
   * runner. Empty/whitespace is ignored (uses the active robot).
   */
  robot_id?: string;
  steps: MissionStep[];
}

/** Result of a single step. */
export interface MissionStepResult {
  id: string;
  capability: string;
  /**
   * Final step outcome:
   *   - "ok":       tool returned cleanly, outputs (if any) parsed.
   *   - "error":    tool returned an error or the binding/build threw.
   *   - "skipped":  earlier step failed with on_fail=stop.
   *   - "cancelled": mission was cancelled (Phase 1.f) before this step ran.
   *   - "paused":   transcript-only marker emitted when the runner entered
   *                 a pause wait before this step (not a final step outcome
   *                 in `MissionResult.steps` — those use ok/error/skipped/cancelled).
   */
  status: "ok" | "error" | "skipped" | "cancelled" | "paused";
  /** Resolved inputs (with `{{...}}` templates substituted). */
  inputs: Record<string, unknown>;
  /** Outputs parsed from the tool response (may be `undefined` for fire-and-forget). */
  outputs?: Record<string, unknown>;
  /** Free-form text the tool returned (e.g. for human display). */
  message?: string;
  /** Error message when status is "error". */
  error?: string;
  /** Wall time in ms. */
  duration_ms: number;
}

/** Result of a mission run. */
export interface MissionResult {
  /**
   * Overall mission outcome:
   *   - "ok":        every step succeeded (or skipped on_fail=continue).
   *   - "error":     one or more steps errored with on_fail=stop.
   *   - "cancelled": mission was cancelled mid-run (Phase 1.f). Some
   *                  steps may have completed successfully — see steps[].
   */
  status: "ok" | "error" | "cancelled";
  /** Number of steps that ran (skipped/cancelled steps are NOT counted as run). */
  steps_run: number;
  steps_total: number;
  /** Per-step results, in declaration order. */
  steps: MissionStepResult[];
  /** Total wall time across all steps. */
  duration_ms: number;
  /** Brief one-line summary suitable for chat reply. */
  summary: string;
  /**
   * Mission-level default robot id used during this run (surfaced for
   * traceability — useful in chat replies and logs). Empty string when
   * the mission didn't pin a robot.
   */
  robot_id?: string;
  /**
   * Phase 1.f — the mission id the adapter registered before running.
   * Empty when the adapter didn't pass an id (e.g. ad-hoc dispatcher
   * tests). Use this with `mission_cancel(mission_id)` to abort a
   * mission mid-run, or `memory_recall(namespace="mission:<id>")` to
   * read the transcript later.
   */
  mission_id?: string;
  /**
   * Phase 1.f — set when the mission was cancelled. Carries the free-text
   * reason the canceller supplied (or "cancelled" when none was given).
   */
  cancellation_reason?: string;
}

/**
 * A dispatcher invokes a single MCP tool by name and returns:
 *   - `text`: the tool's text response (free-form, for human display)
 *   - `outputs`: optional structured outputs (parsed JSON when the text
 *                payload is a JSON blob). The runner uses these for
 *                `{{...}}` template resolution by later steps.
 *
 * Adapters wrap their existing tool entry points to satisfy this contract.
 */
export type MissionToolDispatcher = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<{ text: string; outputs?: Record<string, unknown>; isError?: boolean }>;

/**
 * Capability → MCP tool mapping. Each entry says "to satisfy capability X,
 * call tool Y with these arguments". The transform receives the step's
 * (already template-resolved) inputs and returns the args object the tool
 * expects.
 *
 * Why a separate map (not a field on the capability itself)?
 *   - Some capabilities map onto different tools per adapter
 *     (claude-code's `ros2_find_object` is a single tool call; the OpenClaw
 *     adapter equivalent runs in a different process).
 *   - Skill-declared capabilities will eventually carry their own
 *     implementation hint (`implementation.kind = "in_process"|"external_ros_node"`),
 *     but until that wire-up is real, mapping happens here.
 */
export interface CapabilityToolBinding {
  /** The MCP tool name to invoke. */
  tool: string;
  /** Transform the step's resolved inputs into the tool's expected arguments. */
  buildArgs: (inputs: Record<string, unknown>) => Record<string, unknown>;
  /**
   * Optional: extract structured outputs from the tool's text response
   * for `{{...}}` template references by later steps. When omitted, the
   * runner attempts to JSON-parse the text and use the result.
   */
  parseOutputs?: (text: string) => Record<string, unknown> | undefined;
}

export type CapabilityToolBindings = Record<string, CapabilityToolBinding>;

const TEMPLATE_RE = /\{\{\s*([a-zA-Z0-9_]+)\.outputs\.([a-zA-Z0-9_]+)\s*\}\}/g;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PAUSE_POLL_MS = 100;

/**
 * Wait while `token.paused` is true. Returns when resumed or cancelled.
 * Emits one transcript entry with status "paused" the first time we enter
 * the wait (so a second agent can see the mission is held).
 */
async function waitWhilePaused(
  token: MissionCancellationToken | undefined,
  emitPaused: () => void,
): Promise<"resumed" | "cancelled"> {
  if (!token?.paused || token.cancelled) {
    return token?.cancelled ? "cancelled" : "resumed";
  }
  emitPaused();
  while (token.paused && !token.cancelled) {
    await sleep(PAUSE_POLL_MS);
  }
  return token.cancelled ? "cancelled" : "resumed";
}

/**
 * Substitute `{{stepId.outputs.field}}` references in `value` using the
 * given step output map. Recurses into nested objects/arrays.
 *
 * String values containing exactly one template reference are replaced with
 * the raw value (preserving type — number stays number, etc.). Strings with
 * interpolated text get string-substituted.
 */
function resolveTemplates(
  value: unknown,
  outputs: Record<string, Record<string, unknown> | undefined>,
): unknown {
  if (typeof value === "string") {
    const matches = [...value.matchAll(TEMPLATE_RE)];
    if (matches.length === 0) return value;
    // Whole-string single template: preserve type.
    if (matches.length === 1) {
      const m = matches[0];
      if (m[0] === value.trim()) {
        const stepOuts = outputs[m[1]];
        return stepOuts ? stepOuts[m[2]] : undefined;
      }
    }
    return value.replace(TEMPLATE_RE, (_, stepId: string, field: string) => {
      const stepOuts = outputs[stepId];
      const v = stepOuts ? stepOuts[field] : undefined;
      return v === undefined ? "" : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, outputs));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveTemplates(v, outputs);
    }
    return out;
  }
  return value;
}

function tryParseJsonOutputs(text: string): Record<string, unknown> | undefined {
  // Tools often return "Summary line.\n{json}" — try parsing each line plus
  // the whole payload, returning the first JSON object we find.
  const candidates = [text, text.trim(), text.split("\n").pop() ?? ""];
  for (const c of candidates) {
    if (!c || !c.trim().startsWith("{")) continue;
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
    }
  }
  return undefined;
}

/** Phase 1.f optional behaviour bundle for `runMission`. */
export interface RunMissionOptions {
  /**
   * Stable identifier for this mission run. Adapters generate it and
   * register a cancellation token under this key, so a sibling
   * `mission_cancel(mission_id)` tool call can flip the token mid-run.
   * Surfaced in the result + every transcript entry.
   */
  mission_id?: string;
  /**
   * Cancellation token the runner checks BEFORE each step. When
   * `cancelled` is true at a step boundary, the remaining steps are
   * marked "cancelled" and the mission returns with
   * `status: "cancelled"`.
   */
  cancellation?: MissionCancellationToken;
  /**
   * Best-effort transcript sink — called after every step finishes
   * (including skipped/cancelled). Adapters wire this to the memory
   * subsystem so a downstream agent can read the timeline. Thrown
   * errors are swallowed; transcripts are not gated by the mission's
   * success.
   */
  transcript?: MissionTranscriptSink;
  /** Adapter label (e.g. "claude-code", "openclaw", "gemini") — copied into transcripts. */
  adapter?: string;
}

/**
 * Execute a mission sequentially.
 *
 * @param mission     The declarative plan.
 * @param capabilities Capability registry — used to validate that each
 *                    requested capability id is real.
 * @param bindings    Capability → tool mapping; entries missing here yield
 *                    an "unsupported capability" error for that step.
 * @param dispatcher  Adapter-supplied function that invokes a tool by name.
 * @param options     Phase 1.f options (cancellation token, transcript sink, mission id).
 *                    Omit for legacy callers.
 */
export async function runMission(
  mission: Mission,
  capabilities: Capability[],
  bindings: CapabilityToolBindings,
  dispatcher: MissionToolDispatcher,
  options?: RunMissionOptions,
): Promise<MissionResult> {
  const capIds = new Set(capabilities.map((c) => c.id));
  const stepOutputs: Record<string, Record<string, unknown> | undefined> = {};
  const results: MissionStepResult[] = [];
  const t0Mission = Date.now();
  let aborted = false;
  let cancelled = false;

  // Phase 1.f — best-effort transcript emit. Synchronous helper so the
  // mission loop stays linear; the caller's sink may itself be async
  // but we don't block the next step on it.
  const emitTranscript = (idx: number, started_at: number, result: MissionStepResult): void => {
    if (!options?.transcript) return;
    try {
      const entry: MissionTranscriptEntry = {
        mission_id: options.mission_id ?? "",
        mission_name: mission.name,
        adapter: options.adapter,
        started_at,
        robot_id: typeof mission.robot_id === "string" ? mission.robot_id : "",
        step_index: idx,
        step_total: mission.steps.length,
        result,
      };
      // Fire-and-forget — never throw out of the runner. We catch
      // synchronous throws AND attach a no-op .catch on the promise so
      // a rejected async sink doesn't surface as an unhandled rejection.
      const ret = options.transcript(entry);
      if (ret && typeof (ret as Promise<unknown>).catch === "function") {
        (ret as Promise<unknown>).catch(() => {});
      }
    } catch {
      // Transcript loss never breaks the mission.
    }
  };

  for (let idx = 0; idx < mission.steps.length; idx++) {
    const step = mission.steps[idx];
    const t0 = Date.now();

    // Phase 1.f — honour cancellation token at the step boundary. We
    // check BEFORE the step runs so that a cancel arriving while
    // step N is in-flight only affects step N+1 onward (per-tool
    // preemption is out of scope; see the module header).
    if (!cancelled && options?.cancellation?.cancelled) {
      cancelled = true;
    }

    // Pause: wait at the step boundary until resume or cancel.
    if (!cancelled && options?.cancellation?.paused) {
      const pauseOutcome = await waitWhilePaused(options.cancellation, () => {
        const pausedMarker: MissionStepResult = {
          id: step.id,
          capability: step.capability,
          status: "paused",
          inputs: {},
          message: `Paused: ${options.cancellation?.reason ?? "paused"}`,
          duration_ms: 0,
        };
        emitTranscript(idx, t0, pausedMarker);
      });
      if (pauseOutcome === "cancelled" || options.cancellation?.cancelled) {
        cancelled = true;
      }
    }

    if (cancelled) {
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status: "cancelled",
        inputs: {},
        message: `Cancelled: ${options?.cancellation?.reason ?? "cancelled"}`,
        duration_ms: 0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      continue;
    }

    if (aborted) {
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status: "skipped",
        inputs: {},
        message: "Skipped: earlier step failed and on_fail=stop.",
        duration_ms: 0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      continue;
    }

    if (!capIds.has(step.capability)) {
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status: "error",
        inputs: step.inputs ?? {},
        error: `Capability "${step.capability}" not found in registry. Use ros2_list_capabilities to see what's available.`,
        duration_ms: Date.now() - t0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      if ((step.on_fail ?? "stop") === "stop") aborted = true;
      continue;
    }

    const binding = bindings[step.capability];
    if (!binding) {
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status: "error",
        inputs: step.inputs ?? {},
        error: `Capability "${step.capability}" is registered but has no mission-runner tool binding yet. See docs/strategy-ai-agents-plus-ros.md §4 Phase 1.c.`,
        duration_ms: Date.now() - t0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      if ((step.on_fail ?? "stop") === "stop") aborted = true;
      continue;
    }

    const resolvedInputs = (resolveTemplates(step.inputs ?? {}, stepOutputs) as Record<string, unknown>) ?? {};

    let toolArgs: Record<string, unknown>;
    try {
      toolArgs = binding.buildArgs(resolvedInputs);
    } catch (err) {
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status: "error",
        inputs: resolvedInputs,
        error: `Failed to build args for tool ${binding.tool}: ${err instanceof Error ? err.message : String(err)}`,
        duration_ms: Date.now() - t0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      if ((step.on_fail ?? "stop") === "stop") aborted = true;
      continue;
    }

    // Inject robot_id when the binding didn't set one. Per-step inputs
    // take precedence over the mission-level default; empty strings
    // mean "use the active robot" so we ignore them. This is what
    // makes per-tool fleet routing work end-to-end from `run_mission`.
    if (!("robot_id" in toolArgs) || typeof toolArgs.robot_id !== "string" || toolArgs.robot_id.trim().length === 0) {
      const stepRid = typeof resolvedInputs.robot_id === "string" ? resolvedInputs.robot_id.trim() : "";
      const missionRid = typeof mission.robot_id === "string" ? mission.robot_id.trim() : "";
      const effective = stepRid || missionRid;
      if (effective) toolArgs.robot_id = effective;
    }

    try {
      const dispatched = await dispatcher(binding.tool, toolArgs);
      const outputs =
        dispatched.outputs ??
        binding.parseOutputs?.(dispatched.text) ??
        tryParseJsonOutputs(dispatched.text);
      stepOutputs[step.id] = outputs;
      const status: MissionStepResult["status"] = dispatched.isError ? "error" : "ok";
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status,
        inputs: resolvedInputs,
        outputs,
        message: dispatched.text,
        ...(dispatched.isError ? { error: dispatched.text } : {}),
        duration_ms: Date.now() - t0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      if (status === "error" && (step.on_fail ?? "stop") === "stop") aborted = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result: MissionStepResult = {
        id: step.id,
        capability: step.capability,
        status: "error",
        inputs: resolvedInputs,
        error: msg,
        duration_ms: Date.now() - t0,
      };
      results.push(result);
      emitTranscript(idx, t0, result);
      if ((step.on_fail ?? "stop") === "stop") aborted = true;
    }
  }

  // "Ran" counts steps that actually executed — skipped (on_fail=stop)
  // and cancelled (Phase 1.f) are explicitly excluded.
  const ran = results.filter((r) => r.status !== "skipped" && r.status !== "cancelled").length;
  const failed = results.filter((r) => r.status === "error").length;
  let overallStatus: MissionResult["status"] = failed === 0 ? "ok" : "error";
  if (cancelled) overallStatus = "cancelled";
  const summary = summariseMission(mission, results, overallStatus);

  return {
    status: overallStatus,
    steps_run: ran,
    steps_total: mission.steps.length,
    steps: results,
    duration_ms: Date.now() - t0Mission,
    summary,
    robot_id: typeof mission.robot_id === "string" ? mission.robot_id : "",
    ...(options?.mission_id ? { mission_id: options.mission_id } : {}),
    ...(cancelled
      ? { cancellation_reason: options?.cancellation?.reason ?? "cancelled" }
      : {}),
  };
}

function summariseMission(
  mission: Mission,
  results: MissionStepResult[],
  status: MissionResult["status"],
): string {
  const label = mission.name ?? "Mission";
  const ran = results.filter((r) => r.status !== "skipped" && r.status !== "cancelled").length;
  const cancelled = results.filter((r) => r.status === "cancelled").length;
  const failed = results.filter((r) => r.status === "error");
  if (status === "ok") {
    return `${label}: completed ${ran}/${results.length} step(s) successfully.`;
  }
  if (status === "cancelled") {
    return `${label}: cancelled after ${ran} step(s) — ${cancelled} remaining step(s) skipped.`;
  }
  const first = failed[0];
  return `${label}: failed at step "${first?.id ?? "?"}" (${first?.capability ?? "?"}): ${first?.error ?? "unknown error"}.`;
}
