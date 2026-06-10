/**
 * Mission planner — Phase 1.g of the AgenticROS strategy.
 *
 * Compiles a natural-language goal ("find a chair and drive toward
 * it", "take a picture", "follow me") into a declarative `Mission`
 * the runner can execute. The compiler is intentionally rule-based
 * (no LLM dependency) so:
 *
 *  - Phase 1 doesn't ship with a hard Ollama requirement
 *  - Tests are deterministic (same input → same plan)
 *  - Failures are explainable ("I matched verb X but had no input
 *    for Y") — agents can self-correct without an extra round-trip
 *
 * A future LLM-backed planner is intended to live behind the same
 * `compileGoalToMission` contract — Phase 2+ work. For now this
 * covers the canonical verbs in `BUILTIN_CAPABILITIES` + the
 * skill-declared `find_object` / `follow_person` that ship with
 * AgenticROS.
 *
 * The planner ONLY emits steps for capabilities present in the
 * `capabilities` argument it's handed. Skill capabilities that
 * aren't installed are silently skipped — the planner never
 * fabricates calls to non-existent tools. When nothing matches,
 * the result includes hints + the recognised verb list so the
 * agent can recover.
 *
 * See: docs/strategy-ai-agents-plus-ros.md §4 Phase 1.g.
 */

import type { Capability } from "../capabilities.js";
import type { Mission, MissionStep } from "../mission.js";

/** One candidate match the planner considered for the goal. */
export interface PlannerCandidate {
  /** Capability id we matched. */
  capability_id: string;
  /** 0..1 confidence — higher = better fit. */
  confidence: number;
  /** Human-readable explanation ("matched 'find' verb on token 'find'"). */
  rationale: string;
  /** Inputs the matcher extracted (e.g. `target: "chair"`). */
  inputs: Record<string, unknown>;
}

/** Outcome of `compileGoalToMission`. */
export interface PlannerResult {
  /** When non-null, the compiled mission ready to run. */
  mission: Mission | null;
  /** Free-text explanation on failure (otherwise undefined). */
  error?: string;
  /**
   * Verbs the planner could parse from the goal but didn't act on
   * (e.g. user asked for "navigate" which isn't bound to a runnable
   * capability today). Surfaced so the agent can pick a different
   * phrasing without re-prompting the user.
   */
  unmatched_verbs?: string[];
  /**
   * The candidate matches the planner ranked. Always present; the
   * first one wins when the planner picks a single step (multi-step
   * patterns are explicit in `mission.steps`).
   */
  candidates: PlannerCandidate[];
  /**
   * Hints surfaced to help the agent recover from a failed compile
   * (e.g. "try 'take a picture' or 'follow me'"). Empty when the
   * compile succeeds.
   */
  suggestions: string[];
}

interface CompileOptions {
  /** Optional mission name; defaults to "Goal: <goal>". */
  mission_name?: string;
  /** Optional default robot id propagated onto the mission. */
  robot_id?: string;
}

/** Canonical verb → list of synonyms / surface forms we recognise. */
const VERB_SYNONYMS: Record<string, readonly string[]> = {
  find: [
    "find",
    "locate",
    "look for",
    "search for",
    "where is",
    "where's",
    "spot",
    "detect",
    "scan for",
  ],
  see: [
    "take a picture",
    "take a snapshot",
    "take a photo",
    "take picture",
    "take snapshot",
    "take photo",
    "snap a picture",
    "snap a photo",
    "what do you see",
    "what can you see",
    "what does the camera see",
    "show me what you see",
    "show me the camera",
    "see",
  ],
  measure: [
    "measure depth",
    "measure distance",
    "how far",
    "how close",
    "depth to",
    "distance to",
  ],
  follow: [
    "follow me",
    "follow the person",
    "follow that person",
    "follow whoever",
    "follow",
    "stay with me",
  ],
  drive: [
    "drive forward",
    "drive backward",
    "drive backwards",
    "go forward",
    "go backward",
    "go backwards",
    "back up",
    "move forward",
    "move backward",
    "turn left",
    "turn right",
    "rotate left",
    "rotate right",
    "stop",
    "halt",
    "hold still",
    "hold position",
  ],
  list_topics: [
    "list topics",
    "list the topics",
    "show topics",
    "show me the topics",
    "what topics",
    "topic list",
  ],
};

/** Multi-step conjunction patterns ("X and then Y", "X then Y", "X and Y"). */
const CONJUNCTIONS = [" and then ", ", then ", ". then ", " then ", " and "];

/** Default linear speed (m/s) for "drive forward" without an explicit value. */
const DEFAULT_LINEAR_SPEED = 0.2;
/** Default angular speed (rad/s) for "turn left" without an explicit value. */
const DEFAULT_ANGULAR_SPEED = 0.5;

function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Detect the first matching verb synonym in the goal. Returns canonical verb + matched surface form. */
function detectVerb(goal: string): { verb: keyof typeof VERB_SYNONYMS; matched: string } | null {
  const g = normalise(goal);
  // Drive variants are checked before generic "go" prefixes so "go forward"
  // doesn't accidentally swallow "go find a chair".
  const ordered: Array<keyof typeof VERB_SYNONYMS> = [
    "list_topics",
    "follow",
    "measure",
    "see",
    "drive",
    "find",
  ];
  for (const verb of ordered) {
    for (const synonym of VERB_SYNONYMS[verb]) {
      // Use word boundaries so "find" doesn't match inside "finder".
      const re = new RegExp(`(^|\\b)${escapeRegex(synonym)}(\\b|$)`);
      if (re.test(g)) return { verb, matched: synonym };
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract the target object from a "find X" / "look for X" / "where is X" goal. */
function extractFindTarget(goal: string, matchedVerb: string): string | null {
  const g = normalise(goal);
  const idx = g.indexOf(matchedVerb);
  if (idx < 0) return null;
  let after = g.slice(idx + matchedVerb.length).trim();
  // Strip "a"/"an"/"the" articles.
  after = after.replace(/^(a |an |the )/, "").trim();
  // Stop at conjunctions / sentence boundaries so "find a chair and drive…"
  // captures only "chair".
  for (const conj of CONJUNCTIONS) {
    const c = after.indexOf(conj);
    if (c >= 0) {
      after = after.slice(0, c).trim();
      break;
    }
  }
  // Strip trailing punctuation.
  after = after.replace(/[.,!?;:]+$/, "").trim();
  if (after.length === 0) return null;
  return after;
}

/** Compile a "drive ..." sub-goal into linear_x / angular_z inputs. */
function compileDrive(goal: string): Record<string, unknown> {
  const g = normalise(goal);
  let linear = 0;
  let angular = 0;

  if (/(^|\b)(stop|halt|hold (still|position))\b/.test(g)) {
    return { linear_x: 0, angular_z: 0 };
  }

  // Speed extraction: "at 0.3 m/s" / "0.5 m/s" / "at half speed".
  const speedMatch = g.match(/(\d+(?:\.\d+)?)\s*(?:m\/s|meters? per second)/);
  const explicitLinearSpeed = speedMatch ? Number(speedMatch[1]) : null;

  // Linear direction.
  if (/\b(forward|forwards|ahead)\b/.test(g) || /\b(go|drive|move)\s+forward/.test(g)) {
    linear = explicitLinearSpeed ?? DEFAULT_LINEAR_SPEED;
  }
  if (/\b(backward|backwards|back\s*up|reverse)\b/.test(g)) {
    linear = -(explicitLinearSpeed ?? DEFAULT_LINEAR_SPEED);
  }

  // Angular direction.
  const angularMatch = g.match(/(\d+(?:\.\d+)?)\s*(?:rad\/s|radians? per second)/);
  const explicitAngularSpeed = angularMatch ? Number(angularMatch[1]) : null;
  if (/\b(left|counter[-\s]?clockwise)\b/.test(g)) {
    angular = explicitAngularSpeed ?? DEFAULT_ANGULAR_SPEED;
  }
  if (/\b(right|clockwise)\b/.test(g)) {
    angular = -(explicitAngularSpeed ?? DEFAULT_ANGULAR_SPEED);
  }

  return { linear_x: linear, angular_z: angular };
}

interface SubStepResult {
  step: MissionStep;
  candidate: PlannerCandidate;
}

/**
 * Try to compile one (possibly compound) goal segment into a single
 * mission step. Returns null when no recognised verb maps to a
 * provided capability.
 */
function compileSegment(
  segment: string,
  index: number,
  availableIds: Set<string>,
): SubStepResult | null {
  const detected = detectVerb(segment);
  if (!detected) return null;

  switch (detected.verb) {
    case "find": {
      if (!availableIds.has("find_object")) return null;
      const target = extractFindTarget(segment, detected.matched);
      if (!target) return null;
      return {
        step: {
          id: stepId("find", index),
          capability: "find_object",
          inputs: { target },
        },
        candidate: {
          capability_id: "find_object",
          confidence: 0.85,
          rationale: `matched verb "${detected.matched}" with target "${target}"`,
          inputs: { target },
        },
      };
    }
    case "see": {
      if (!availableIds.has("take_snapshot")) return null;
      return {
        step: { id: stepId("snap", index), capability: "take_snapshot" },
        candidate: {
          capability_id: "take_snapshot",
          confidence: 0.9,
          rationale: `matched verb "${detected.matched}"`,
          inputs: {},
        },
      };
    }
    case "measure": {
      if (!availableIds.has("measure_depth")) return null;
      return {
        step: { id: stepId("depth", index), capability: "measure_depth" },
        candidate: {
          capability_id: "measure_depth",
          confidence: 0.9,
          rationale: `matched verb "${detected.matched}"`,
          inputs: {},
        },
      };
    }
    case "follow": {
      if (!availableIds.has("follow_person")) return null;
      return {
        step: { id: stepId("follow", index), capability: "follow_person" },
        candidate: {
          capability_id: "follow_person",
          confidence: 0.9,
          rationale: `matched verb "${detected.matched}"`,
          inputs: {},
        },
      };
    }
    case "drive": {
      if (!availableIds.has("drive_base")) return null;
      const inputs = compileDrive(segment);
      // Reject a no-op drive (e.g. "drive" without direction) so we
      // don't ship a confusing "drive nothing" step.
      const lx = Number(inputs?.linear_x ?? 0);
      const az = Number(inputs?.angular_z ?? 0);
      // "stop" is a legit zero-velocity step; detect it before the no-op guard.
      const isStop = /(^|\b)(stop|halt|hold (still|position))\b/.test(normalise(segment));
      if (!isStop && lx === 0 && az === 0) return null;
      return {
        step: {
          id: stepId("drive", index),
          capability: "drive_base",
          inputs,
        },
        candidate: {
          capability_id: "drive_base",
          confidence: isStop ? 0.95 : 0.8,
          rationale: isStop
            ? `matched stop verb`
            : `matched drive verb "${detected.matched}" → linear_x=${lx}, angular_z=${az}`,
          inputs,
        },
      };
    }
    case "list_topics": {
      if (!availableIds.has("list_topics")) return null;
      return {
        step: { id: stepId("topics", index), capability: "list_topics" },
        candidate: {
          capability_id: "list_topics",
          confidence: 0.95,
          rationale: `matched verb "${detected.matched}"`,
          inputs: {},
        },
      };
    }
  }
  return null;
}

function stepId(prefix: string, index: number): string {
  return index === 0 ? prefix : `${prefix}${index + 1}`;
}

/** Split a compound goal on conjunctions ("X and Y", "X then Y") into segments. */
function splitOnConjunctions(goal: string): string[] {
  let parts = [goal];
  for (const conj of CONJUNCTIONS) {
    const out: string[] = [];
    for (const p of parts) {
      out.push(...p.split(conj));
    }
    parts = out;
  }
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Special-case the canonical compound pattern "find X and drive
 * toward it" (or "approach it", "go to it"). The second step's
 * angular_z is wired from the first step's horizontal_offset via a
 * mission-runner template, so the robot actually steers toward the
 * detected object instead of just plodding forward.
 */
function tryFindAndApproach(
  goal: string,
  availableIds: Set<string>,
): { steps: MissionStep[]; candidates: PlannerCandidate[] } | null {
  if (!availableIds.has("find_object") || !availableIds.has("drive_base")) return null;
  const g = normalise(goal);
  const findVerbs = VERB_SYNONYMS.find;
  const approachVerbs = [
    "drive toward",
    "drive to",
    "approach",
    "go toward",
    "go to it",
    "head toward",
    "move toward",
  ];
  // Pattern: <find-synonym> <target> ... <conjunction> ... <approach-synonym>
  for (const find of findVerbs) {
    const findIdx = g.indexOf(find);
    if (findIdx < 0) continue;
    const after = g.slice(findIdx + find.length);
    // Approach verb must come AFTER the find verb in the same goal.
    const approachHit = approachVerbs.find((v) => after.includes(v));
    if (!approachHit) continue;
    const conjIdx = CONJUNCTIONS.map((c) => after.indexOf(c)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    // Either an explicit conjunction or just "find X. approach it" — accept both.
    const targetSegment = conjIdx !== undefined
      ? after.slice(0, conjIdx).trim()
      : after.split(approachHit)[0].trim();
    const cleaned = targetSegment.replace(/^(a |an |the )/, "").replace(/[.,!?;:]+$/, "").trim();
    if (!cleaned) continue;
    return {
      steps: [
        {
          id: "find",
          capability: "find_object",
          inputs: { target: cleaned },
        },
        {
          id: "approach",
          capability: "drive_base",
          inputs: {
            linear_x: DEFAULT_LINEAR_SPEED,
            // Wire heading correction from find_object.outputs.horizontal_offset
            // (positive = object right of centre → turn right → negative angular_z).
            // The runner substitutes this template just before dispatch.
            angular_z: "{{find.outputs.horizontal_offset}}",
          },
        },
      ],
      candidates: [
        {
          capability_id: "find_object",
          confidence: 0.9,
          rationale: `compound goal: find "${cleaned}" → approach`,
          inputs: { target: cleaned },
        },
        {
          capability_id: "drive_base",
          confidence: 0.85,
          rationale: `approach step wired from find_object.outputs.horizontal_offset`,
          inputs: { linear_x: DEFAULT_LINEAR_SPEED, angular_z: "{{find.outputs.horizontal_offset}}" },
        },
      ],
    };
  }
  return null;
}

/** Recognised verbs the planner can handle today — surfaced in error messages. */
const RECOGNISED_VERBS_SUMMARY = [
  "find / locate / look for <object>",
  "take a picture / snapshot / what do you see",
  "measure depth / how far",
  "follow me / follow person",
  "drive forward / backward, turn left / right, stop",
  "list topics",
  "find <object> and drive toward it (multi-step)",
];

/**
 * Compile a free-text goal into a runnable `Mission`.
 *
 * Returns a structured `PlannerResult`: when `mission` is non-null
 * the caller can hand it straight to `runMission`; when it's null
 * the caller should surface `error` + `suggestions` to the agent so
 * it can self-correct.
 */
export function compileGoalToMission(
  goal: string,
  capabilities: Capability[],
  options?: CompileOptions,
): PlannerResult {
  const trimmed = (goal ?? "").trim();
  if (!trimmed) {
    return {
      mission: null,
      error: "Goal is empty. Provide a natural-language description of what the robot should do.",
      candidates: [],
      suggestions: RECOGNISED_VERBS_SUMMARY,
    };
  }

  const availableIds = new Set(capabilities.map((c) => c.id));

  // Compound find-then-approach is the showcase Phase 1.c pattern.
  // Check it first so "find a chair and drive toward it" doesn't get
  // demoted to two unrelated steps via the generic conjunction split.
  const compound = tryFindAndApproach(trimmed, availableIds);
  if (compound) {
    return {
      mission: buildMission(compound.steps, trimmed, options),
      candidates: compound.candidates,
      suggestions: [],
    };
  }

  // Generic multi-segment path: split on " and " / " then " etc and
  // compile each segment independently. Any segment that fails to
  // map to a capability is recorded as `unmatched_verbs` but does
  // NOT abort the compile — the agent can re-issue a tighter goal.
  const segments = splitOnConjunctions(trimmed);
  const steps: MissionStep[] = [];
  const candidates: PlannerCandidate[] = [];
  const unmatched: string[] = [];
  segments.forEach((segment, i) => {
    const compiled = compileSegment(segment, i, availableIds);
    if (compiled) {
      steps.push(compiled.step);
      candidates.push(compiled.candidate);
    } else {
      unmatched.push(segment);
    }
  });

  if (steps.length > 0) {
    return {
      mission: buildMission(steps, trimmed, options),
      candidates,
      ...(unmatched.length > 0 ? { unmatched_verbs: unmatched } : {}),
      suggestions: [],
    };
  }

  // Nothing matched. Build a helpful error including the recognised
  // verbs AND the verb registry the runtime has so the agent can
  // refine. We list the first 12 capability ids to keep the response
  // compact — extending the list when a registry grows is fine.
  const knownCaps = capabilities.slice(0, 12).map((c) => `${c.id} (verb: ${c.verb})`);
  return {
    mission: null,
    error:
      `Couldn't compile goal "${trimmed}" into a runnable plan. ` +
      `The planner is rule-based today and recognises the verbs below. ` +
      `Try rephrasing, or call run_mission with an explicit mission.steps[].`,
    candidates: [],
    suggestions: [
      ...RECOGNISED_VERBS_SUMMARY,
      `Available capabilities in this fleet: ${knownCaps.join(", ")}`,
    ],
    ...(unmatched.length > 0 ? { unmatched_verbs: unmatched } : {}),
  };
}

function buildMission(
  steps: MissionStep[],
  goal: string,
  options: CompileOptions | undefined,
): Mission {
  return {
    name: options?.mission_name ?? `Goal: ${goal}`,
    goal,
    ...(options?.robot_id ? { robot_id: options.robot_id } : {}),
    steps,
  };
}
