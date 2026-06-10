/**
 * Phase 1.f — Gemini adapter tests for `mission_cancel` and the
 * mission_id round-trip from `run_mission`.
 *
 * Drives the `executeTool` entry point directly (no network) and
 * verifies:
 *   1. `mission_cancel` returns success / found:false on unknown ids
 *      (idempotent, never errors out — safe to spam from the agent).
 *   2. `mission_cancel` rejects empty / missing mission_id with
 *      success:false and a useful error message.
 *   3. `run_mission` echoes a mission_id in its compact JSON payload
 *      so a sibling `mission_cancel` call can target it.
 *   4. `mission_cancel` is in the function-declaration list.
 *
 * Mirrors the Claude Code + OpenClaw tests; together they pin the
 * cross-adapter contract for Phase 1.f.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { executeTool, GEMINI_FUNCTION_DECLARATIONS } from "../tools.js";
import type { AgenticROSConfig } from "@agenticros/core";

function makeHermeticConfig(): AgenticROSConfig {
  // Minimal config that satisfies the Zod schema with defaults. We
  // never reach the transport because mission_cancel + the empty
  // run_mission paths short-circuit before getTransport(). The
  // rosbridge mode + port 1 ensures Phase 1.g goal tests fail FAST
  // (ECONNREFUSED) when a goal compiles to a transport-bound step.
  return {
    transport: { mode: "rosbridge" },
    zenoh: {
      routerEndpoint: "ws://localhost:10000",
      domainId: 0,
      keyFormat: "ros2dds",
    },
    rosbridge: { url: "ws://127.0.0.1:1", reconnect: false, reconnectInterval: 3000 },
    local: { domainId: 0 },
    webrtc: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    robot: { name: "Test", namespace: "test_robot", cameraTopic: "" },
    safety: {
      maxLinearVelocity: 1,
      maxAngularVelocity: 1.5,
      workspaceLimits: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
    },
    teleop: {
      cameraTopic: "",
      cameraTopics: [],
      cmdVelTopic: "",
      speedDefault: 0.3,
      cameraPollMs: 150,
    },
    describer: {
      enabled: false,
      url: "http://localhost:11435/v1/chat/completions",
      model: "qwen2.5vl:7b",
      maxTokens: 400,
      timeoutMs: 60000,
      maxImageDimension: 896,
    },
    memory: {
      enabled: false,
      backend: "local",
      local: { storePath: "~/.agenticros/memory.json" },
      mem0: {
        inferOnWrite: false,
        historyDbPath: "~/.agenticros/memory-history.db",
      },
    },
    skills: {},
    skillPaths: [],
    skillPackages: [],
    robots: [],
  } as unknown as AgenticROSConfig;
}

test("gemini: GEMINI_FUNCTION_DECLARATIONS includes mission_cancel with required mission_id", () => {
  const decl = GEMINI_FUNCTION_DECLARATIONS.find((d) => d.name === "mission_cancel");
  assert.ok(decl, "mission_cancel must be in the function declaration set");
  const schema = decl!.parametersJsonSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.ok(schema?.properties?.["mission_id"], "must advertise 'mission_id'");
  assert.ok(schema?.properties?.["reason"], "must advertise optional 'reason'");
  assert.deepEqual(schema?.required, ["mission_id"]);
});

test("gemini: mission_cancel on unknown id returns success+found:false (no error, idempotent)", async () => {
  const config = makeHermeticConfig();
  const result = await executeTool(
    "mission_cancel",
    { mission_id: "mn_unknown_xyz" },
    config,
  );
  const payload = JSON.parse(result.output) as {
    success: boolean;
    mission_id: string;
    found: boolean;
    already_cancelled: boolean;
    reason: string | null;
  };
  assert.equal(payload.success, true);
  assert.equal(payload.found, false);
  assert.equal(payload.already_cancelled, false);
  assert.equal(payload.mission_id, "mn_unknown_xyz");
  assert.equal(payload.reason, null);
});

test("gemini: mission_cancel rejects empty mission_id with success:false + useful error", async () => {
  const config = makeHermeticConfig();
  const result = await executeTool("mission_cancel", { mission_id: "   " }, config);
  const payload = JSON.parse(result.output) as { success: boolean; error?: string };
  assert.equal(payload.success, false);
  assert.ok(payload.error?.toLowerCase().includes("mission_id"));
});

test("gemini: run_mission echoes a mission_id so a sibling mission_cancel can target it", async () => {
  const config = makeHermeticConfig();
  // Empty steps means we don't dispatch any sub-tool — no transport needed.
  const result = await executeTool(
    "run_mission",
    { mission: { name: "yield mission_id", steps: [] } },
    config,
  );
  // The text payload is "<summary>\n<json>" — pull the JSON line.
  const lines = result.output.split("\n");
  const jsonLine = lines.find((l) => l.trim().startsWith("{")) ?? "";
  const payload = JSON.parse(jsonLine) as {
    mission_id?: string;
    status: string;
    steps: unknown[];
  };
  assert.ok(
    typeof payload.mission_id === "string" && payload.mission_id.startsWith("mn_"),
    `run_mission compact JSON must include a mission_id; got: ${jsonLine}`,
  );
});

// --- Phase 1.g: run_mission { goal } natural-language compile path ---

test("gemini: GEMINI_FUNCTION_DECLARATIONS run_mission advertises both 'mission' AND 'goal' (Phase 1.g)", () => {
  const decl = GEMINI_FUNCTION_DECLARATIONS.find((d) => d.name === "run_mission");
  assert.ok(decl);
  const schema = decl!.parametersJsonSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.ok(schema?.properties?.["mission"], "must still accept 'mission'");
  assert.ok(schema?.properties?.["goal"], "must also accept natural-language 'goal'");
  assert.ok(schema?.properties?.["robot_id"], "must accept top-level robot_id when goal is used");
  // Neither field is individually required — the handler enforces
  // "at least one of mission/goal" at runtime.
  assert.deepEqual(schema?.required ?? [], []);
});

test("gemini: run_mission { goal: 'take a picture' } compiles + echoes planner info (Phase 1.g)", async () => {
  const config = makeHermeticConfig();
  // The compiled mission step (take_snapshot) WILL try to dispatch
  // ros2_camera_snapshot which fails fast against the bogus zenoh
  // endpoint — but the run_mission response still includes the
  // planner info + mission_id, which is what we assert here.
  const result = await executeTool("run_mission", { goal: "take a picture" }, config);
  const lines = result.output.split("\n");
  const jsonLine = lines.find((l) => l.trim().startsWith("{")) ?? "";
  const payload = JSON.parse(jsonLine) as {
    mission_id?: string;
    planner?: {
      compiled_from_goal: string;
      candidates: Array<{ capability_id: string }>;
    };
    steps?: Array<{ capability: string }>;
  };
  assert.equal(payload.planner?.compiled_from_goal, "take a picture");
  assert.equal(payload.planner?.candidates[0].capability_id, "take_snapshot");
  assert.ok(typeof payload.mission_id === "string" && payload.mission_id.startsWith("mn_"));
});

test("gemini: run_mission { goal: 'paint the wall' } surfaces a clean compile error (Phase 1.g)", async () => {
  const config = makeHermeticConfig();
  const result = await executeTool("run_mission", { goal: "paint the wall blue" }, config);
  const payload = JSON.parse(result.output) as {
    success: boolean;
    error?: string;
    suggestions?: string[];
  };
  assert.equal(payload.success, false);
  assert.ok(payload.error);
  assert.ok(Array.isArray(payload.suggestions) && payload.suggestions.length > 0);
});

test("gemini: run_mission with NEITHER mission nor goal returns a clear error (Phase 1.g)", async () => {
  const config = makeHermeticConfig();
  const result = await executeTool("run_mission", {}, config);
  assert.ok(result.output.toLowerCase().includes("mission"));
  assert.ok(result.output.toLowerCase().includes("goal"));
});
