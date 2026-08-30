#!/usr/bin/env node
/**
 * Smoke-test MoveIt2 against sim-arm (--moveit).
 *
 * Prerequisites (already running):
 *   agenticros up sim-arm --moveit --headless
 *   npx agenticros skills install @agenticros/moveit-pick
 *
 * Sequence:
 *   1. list topics (expect /joint_states, /arm/*/cmd_pos, /move_action)
 *   2. read current joint_states
 *   3. run_mission pick_object with a named-pose MoveGroup goal ("ready"),
 *      or ros2_action_goal /move_action if the skill is not installed
 *   4. assert /move_action exists and joints moved toward the ready pose
 *
 * Usage (from repo root, after building MCP server):
 *   node scripts/test-moveit-sim.mjs
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const serverDist = join(repoRoot, "packages/agenticros-claude-code/dist/index.js");

const READY = {
  shoulder_pan_joint: 0.6,
  shoulder_lift_joint: -1.0,
  elbow_joint: 1.2,
  wrist_1_joint: 0.0,
  wrist_2_joint: 0.4,
  wrist_3_joint: 0.0,
};

const ACTION_TIMEOUT_MS = 90_000;

const child = spawn(process.execPath, [serverDist], {
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    AGENTICROS_ROBOT_NAMESPACE: process.env.AGENTICROS_ROBOT_NAMESPACE ?? "",
    AGENTICROS_USE_SIM_TIME: process.env.AGENTICROS_USE_SIM_TIME ?? "1",
  },
});

child.stderr.on("data", (d) => {
  process.stderr.write(`[mcp-stderr] ${d}`);
});

let nextId = 1;
const pending = new Map();
let buf = "";

child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else res(msg.result);
    }
  }
});

function rpc(method, params = {}, timeoutMs = 30000) {
  const id = nextId++;
  return new Promise((resolveOuter, reject) => {
    const t = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(t);
        resolveOuter(v);
      },
      reject: (e) => {
        clearTimeout(t);
        reject(e);
      },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

function pickText(result) {
  return result?.content?.map((c) => c.text ?? "").join("\n") ?? "";
}

function readyGoal() {
  return {
    request: {
      group_name: "arm",
      num_planning_attempts: 5,
      allowed_planning_time: 10.0,
      max_velocity_scaling_factor: 0.3,
      max_acceleration_scaling_factor: 0.3,
      start_state: { is_diff: true },
      goal_constraints: [
        {
          name: "ready",
          joint_constraints: Object.entries(READY).map(([joint_name, position]) => ({
            joint_name,
            position,
            tolerance_above: 0.08,
            tolerance_below: 0.08,
            weight: 1.0,
          })),
        },
      ],
    },
    planning_options: {
      plan_only: false,
      look_around: false,
      replan: false,
      planning_scene_diff: {
        is_diff: true,
        robot_state: { is_diff: true },
      },
    },
  };
}

function parseJointPositions(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const msg = parsed?.message ?? parsed;
  const names = msg?.name;
  const positions = msg?.position;
  if (!Array.isArray(names) || !Array.isArray(positions)) return null;
  const out = {};
  for (let i = 0; i < names.length; i++) {
    out[names[i]] = Number(positions[i]);
  }
  return out;
}

function jointsMovedTowardReady(before, after) {
  if (!before || !after) return false;
  let moved = 0;
  for (const [name, target] of Object.entries(READY)) {
    const a = after[name];
    const b = before[name];
    if (typeof a !== "number" || typeof b !== "number") continue;
    const closer = Math.abs(a - target) + 0.05 < Math.abs(b - target);
    const delta = Math.abs(a - b);
    if (closer || delta > 0.08) moved += 1;
  }
  return moved >= 2;
}

async function main() {
  console.log("=== MoveIt2 (sim-arm --moveit) smoke ===");
  console.log("Goal: named pose 'ready' (joint constraints)");

  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "moveit-e2e", version: "0.0.1" },
  });
  await rpc("notifications/initialized", {}).catch(() => {});

  console.log("\n-- ros2_list_topics (expect /joint_states, /arm/*/cmd_pos, /move_action) --");
  const topics = await rpc("tools/call", { name: "ros2_list_topics", arguments: {} });
  const topicText = pickText(topics);
  console.log(topicText.slice(0, 1200));
  for (const t of ["/joint_states", "/arm/shoulder_pan/cmd_pos"]) {
    if (!topicText.includes(t)) {
      console.warn(`WARN: expected topic ${t} not listed — is sim-arm --moveit running?`);
    }
  }
  const hasMoveAction = topicText.includes("/move_action");
  if (!hasMoveAction) {
    console.error("FAIL: /move_action not listed. Bring up: agenticros up sim-arm --moveit --headless");
    child.kill("SIGTERM");
    process.exit(1);
  }

  console.log("\n-- ros2_subscribe_once /joint_states (before) --");
  const beforeRaw = await rpc("tools/call", {
    name: "ros2_subscribe_once",
    arguments: { topic: "/joint_states", timeout: 8 },
  });
  const beforeText = pickText(beforeRaw);
  const before = parseJointPositions(beforeText);
  console.log(before ? JSON.stringify(before) : beforeText.slice(0, 400));

  console.log("\n-- ros2_list_capabilities (pick_object optional) --");
  const caps = await rpc("tools/call", {
    name: "ros2_list_capabilities",
    arguments: {},
  }).catch((e) => ({ content: [{ text: String(e) }] }));
  const capText = pickText(caps);
  const hasPick = capText.includes("pick_object");
  if (!hasPick) {
    console.warn(
      "WARN: pick_object not in capabilities — falling back to ros2_action_goal. Install @agenticros/moveit-pick to exercise run_mission.",
    );
  }

  const goal = readyGoal();
  let actionText = "";
  if (hasPick) {
    console.log("\n-- run_mission pick_object (MoveGroup named pose) --");
    const mission = await rpc(
      "tools/call",
      {
        name: "run_mission",
        arguments: {
          steps: [{ capability: "pick_object", inputs: { goal } }],
        },
      },
      ACTION_TIMEOUT_MS,
    );
    actionText = pickText(mission);
  } else {
    console.log("\n-- ros2_action_goal /move_action --");
    const action = await rpc(
      "tools/call",
      {
        name: "ros2_action_goal",
        arguments: {
          action: "/move_action",
          actionType: "moveit_msgs/action/MoveGroup",
          goal,
        },
      },
      ACTION_TIMEOUT_MS,
    );
    actionText = pickText(action);
  }
  console.log(actionText.slice(0, 2000));

  console.log("\n-- ros2_subscribe_once /joint_states (after) --");
  const afterRaw = await rpc("tools/call", {
    name: "ros2_subscribe_once",
    arguments: { topic: "/joint_states", timeout: 8 },
  });
  const afterText = pickText(afterRaw);
  const after = parseJointPositions(afterText);
  console.log(after ? JSON.stringify(after) : afterText.slice(0, 400));

  const actionOk =
    /succeed|success["']?\s*[:=]\s*true|error_code["']?\s*[:=]\s*1/i.test(actionText) &&
    !/isError["']?\s*[:=]\s*true/i.test(actionText);
  const jointsOk = jointsMovedTowardReady(before, after);
  const ok = hasMoveAction && (actionOk || jointsOk);

  child.kill("SIGTERM");
  if (ok) {
    console.log("\n=== PASS ===");
    if (!jointsOk) console.warn("Note: action reported success but joint delta was small.");
    process.exit(0);
  }
  console.error("\n=== FAIL (inspect output above) ===");
  process.exit(1);
}

main().catch((e) => {
  console.error("Failed:", e);
  child.kill("SIGKILL");
  process.exit(1);
});
