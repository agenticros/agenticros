/**
 * Unit tests for the Phase 1.g rule-based mission planner.
 *
 * These tests pin the contract for `compileGoalToMission`:
 *
 *   - Recognised verbs (find / take / measure / follow / drive / list)
 *     map to the right capability ids and extract structured inputs.
 *   - Compound "find X and drive toward it" emits a 2-step plan with
 *     the canonical template ref so the runner steers via the
 *     detected horizontal_offset.
 *   - Skill capabilities the runtime doesn't have are NOT fabricated
 *     — if `find_object` isn't in the registry, "find a chair" fails
 *     gracefully instead of pretending to run.
 *   - Failures surface a useful error + suggestions list so the
 *     agent can self-correct without an extra round-trip.
 *   - Multi-segment goals ("X and Y") compile each segment
 *     independently; segments that don't map are recorded as
 *     `unmatched_verbs` for explainability.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { compileGoalToMission } from "../planner/index.js";
import type { Capability } from "../capabilities.js";

const BASE_CAPS: Capability[] = [
  { id: "drive_base", verb: "drive", description: "drive", source: { kind: "builtin" } },
  { id: "take_snapshot", verb: "see", description: "see", source: { kind: "builtin" } },
  { id: "measure_depth", verb: "measure", description: "measure", source: { kind: "builtin" } },
  { id: "list_topics", verb: "introspect", description: "list", source: { kind: "builtin" } },
  {
    id: "find_object",
    verb: "find",
    description: "find",
    source: { kind: "skill", skillId: "find", package: "agenticros-skill-find" },
  },
  {
    id: "follow_person",
    verb: "follow",
    description: "follow",
    source: { kind: "skill", skillId: "followme", package: "agenticros-skill-followme" },
  },
];

// --- Recognition: single-verb goals ---

test("planner: 'find a chair' compiles to a single find_object step", () => {
  const res = compileGoalToMission("find a chair", BASE_CAPS);
  assert.ok(res.mission, `expected mission, got error: ${res.error}`);
  assert.equal(res.mission!.steps.length, 1);
  assert.equal(res.mission!.steps[0].capability, "find_object");
  assert.equal((res.mission!.steps[0].inputs as { target: string }).target, "chair");
  assert.equal(res.mission!.goal, "find a chair");
  assert.ok(res.mission!.name?.includes("find a chair"));
});

test("planner: 'where is the laptop' compiles to find_object with target=laptop", () => {
  const res = compileGoalToMission("Where is the laptop?", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps[0].capability, "find_object");
  assert.equal((res.mission!.steps[0].inputs as { target: string }).target, "laptop");
});

test("planner: 'look for a bottle' uses the 'look for' synonym", () => {
  const res = compileGoalToMission("Look for a bottle", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal((res.mission!.steps[0].inputs as { target: string }).target, "bottle");
});

test("planner: 'take a picture' maps to take_snapshot", () => {
  const res = compileGoalToMission("take a picture", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps.length, 1);
  assert.equal(res.mission!.steps[0].capability, "take_snapshot");
});

test("planner: 'what do you see' maps to take_snapshot", () => {
  const res = compileGoalToMission("What do you see?", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps[0].capability, "take_snapshot");
});

test("planner: 'measure depth' maps to measure_depth", () => {
  const res = compileGoalToMission("Measure depth", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps[0].capability, "measure_depth");
});

test("planner: 'how far away is the wall' maps to measure_depth", () => {
  const res = compileGoalToMission("How far away is the wall?", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps[0].capability, "measure_depth");
});

test("planner: 'follow me' maps to follow_person", () => {
  const res = compileGoalToMission("follow me", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps[0].capability, "follow_person");
});

test("planner: 'list topics' maps to list_topics", () => {
  const res = compileGoalToMission("list topics", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps[0].capability, "list_topics");
});

// --- Drive parsing ---

test("planner: 'drive forward' produces positive linear_x with default speed", () => {
  const res = compileGoalToMission("drive forward", BASE_CAPS);
  assert.ok(res.mission);
  const inputs = res.mission!.steps[0].inputs as { linear_x: number; angular_z: number };
  assert.ok(inputs.linear_x > 0, `linear_x should be positive, got ${inputs.linear_x}`);
  assert.equal(inputs.angular_z, 0);
});

test("planner: 'drive forward at 0.5 m/s' extracts the explicit speed", () => {
  const res = compileGoalToMission("drive forward at 0.5 m/s", BASE_CAPS);
  assert.ok(res.mission);
  const inputs = res.mission!.steps[0].inputs as { linear_x: number };
  assert.equal(inputs.linear_x, 0.5);
});

test("planner: 'drive backward' produces NEGATIVE linear_x", () => {
  const res = compileGoalToMission("drive backward", BASE_CAPS);
  assert.ok(res.mission);
  const inputs = res.mission!.steps[0].inputs as { linear_x: number; angular_z: number };
  assert.ok(inputs.linear_x < 0, `linear_x should be negative, got ${inputs.linear_x}`);
});

test("planner: 'turn left' produces positive angular_z", () => {
  const res = compileGoalToMission("turn left", BASE_CAPS);
  assert.ok(res.mission);
  const inputs = res.mission!.steps[0].inputs as { linear_x: number; angular_z: number };
  assert.equal(inputs.linear_x, 0);
  assert.ok(inputs.angular_z > 0);
});

test("planner: 'turn right' produces NEGATIVE angular_z", () => {
  const res = compileGoalToMission("turn right", BASE_CAPS);
  assert.ok(res.mission);
  const inputs = res.mission!.steps[0].inputs as { angular_z: number };
  assert.ok(inputs.angular_z < 0);
});

test("planner: 'stop' produces a zero-velocity drive_base step", () => {
  const res = compileGoalToMission("stop", BASE_CAPS);
  assert.ok(res.mission);
  const inputs = res.mission!.steps[0].inputs as { linear_x: number; angular_z: number };
  assert.equal(inputs.linear_x, 0);
  assert.equal(inputs.angular_z, 0);
});

test("planner: bare 'drive' (no direction) does NOT compile (avoids no-op steps)", () => {
  // A drive without direction is ambiguous — the planner must NOT
  // emit a useless zero-velocity step that's identical to "stop".
  const res = compileGoalToMission("drive", BASE_CAPS);
  assert.equal(res.mission, null);
  assert.ok(res.error);
});

// --- Compound: find then approach ---

test("planner: 'find a chair and drive toward it' compiles to a 2-step plan with template ref", () => {
  const res = compileGoalToMission("find a chair and drive toward it", BASE_CAPS);
  assert.ok(res.mission, `expected mission, got error: ${res.error}`);
  assert.equal(res.mission!.steps.length, 2);
  // Step 1: find_object with target=chair
  assert.equal(res.mission!.steps[0].id, "find");
  assert.equal(res.mission!.steps[0].capability, "find_object");
  assert.equal((res.mission!.steps[0].inputs as { target: string }).target, "chair");
  // Step 2: drive_base with templated angular_z so the runner steers
  // via the detected horizontal_offset.
  assert.equal(res.mission!.steps[1].id, "approach");
  assert.equal(res.mission!.steps[1].capability, "drive_base");
  const driveInputs = res.mission!.steps[1].inputs as { linear_x: number; angular_z: string };
  assert.ok(driveInputs.linear_x > 0, "approach should move forward");
  assert.equal(
    driveInputs.angular_z,
    "{{find.outputs.horizontal_offset}}",
    "angular_z must reference find_object's horizontal_offset output via the runner template",
  );
});

test("planner: 'find a bottle and approach it' is the same 2-step pattern (approach synonym)", () => {
  const res = compileGoalToMission("find a bottle and approach it", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps.length, 2);
  assert.equal((res.mission!.steps[0].inputs as { target: string }).target, "bottle");
  assert.equal(res.mission!.steps[1].capability, "drive_base");
});

// --- Multi-segment compounds (independent steps) ---

test("planner: 'take a picture and then measure depth' compiles to 2 independent steps", () => {
  const res = compileGoalToMission("take a picture and then measure depth", BASE_CAPS);
  assert.ok(res.mission, `expected mission, got error: ${res.error}`);
  assert.equal(res.mission!.steps.length, 2);
  assert.equal(res.mission!.steps[0].capability, "take_snapshot");
  assert.equal(res.mission!.steps[1].capability, "measure_depth");
});

test("planner: 'follow me then take a picture' compiles to 2 sequential steps", () => {
  const res = compileGoalToMission("follow me then take a picture", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.mission!.steps.length, 2);
  assert.equal(res.mission!.steps[0].capability, "follow_person");
  assert.equal(res.mission!.steps[1].capability, "take_snapshot");
});

// --- Capability availability (no fabrication) ---

test("planner: 'find a chair' fails when find_object isn't in the registry (no fabricated calls)", () => {
  const noFind = BASE_CAPS.filter((c) => c.id !== "find_object");
  const res = compileGoalToMission("find a chair", noFind);
  assert.equal(res.mission, null);
  assert.ok(res.error);
  // The planner mentions available capabilities so the agent can pivot.
  const allSuggestions = res.suggestions.join(" ");
  assert.ok(allSuggestions.includes("Available capabilities"), `expected suggestions to list capabilities; got: ${allSuggestions}`);
});

test("planner: 'follow me' fails when follow_person isn't installed", () => {
  const noFollow = BASE_CAPS.filter((c) => c.id !== "follow_person");
  const res = compileGoalToMission("follow me", noFollow);
  assert.equal(res.mission, null);
});

// --- Failure paths ---

test("planner: empty goal returns a clean error", () => {
  const res = compileGoalToMission("", BASE_CAPS);
  assert.equal(res.mission, null);
  assert.ok(res.error?.toLowerCase().includes("empty"));
  // Suggestions should still surface so the agent can recover.
  assert.ok(res.suggestions.length > 0);
});

test("planner: whitespace-only goal is treated as empty", () => {
  const res = compileGoalToMission("   \n\t  ", BASE_CAPS);
  assert.equal(res.mission, null);
  assert.ok(res.error);
});

test("planner: 'paint the wall blue' (unrecognised verb) fails gracefully with suggestions", () => {
  const res = compileGoalToMission("paint the wall blue", BASE_CAPS);
  assert.equal(res.mission, null);
  assert.ok(res.error);
  assert.ok(res.suggestions.length > 0, "must surface suggestions on failure");
});

// --- Options pass-through ---

test("planner: options.robot_id is propagated onto the compiled mission", () => {
  const res = compileGoalToMission("take a picture", BASE_CAPS, { robot_id: "robotA" });
  assert.ok(res.mission);
  assert.equal(res.mission!.robot_id, "robotA");
});

test("planner: options.mission_name overrides the default 'Goal: <goal>' label", () => {
  const res = compileGoalToMission("take a picture", BASE_CAPS, { mission_name: "Snap" });
  assert.ok(res.mission);
  assert.equal(res.mission!.name, "Snap");
});

// --- Candidates surface ---

test("planner: candidates list contains the matched capability ids in declaration order", () => {
  const res = compileGoalToMission("find a chair and drive toward it", BASE_CAPS);
  assert.ok(res.mission);
  assert.equal(res.candidates.length, 2);
  assert.equal(res.candidates[0].capability_id, "find_object");
  assert.equal(res.candidates[1].capability_id, "drive_base");
  for (const c of res.candidates) {
    assert.ok(c.confidence > 0 && c.confidence <= 1, `confidence should be in (0,1]; got ${c.confidence}`);
    assert.ok(c.rationale.length > 0);
  }
});
