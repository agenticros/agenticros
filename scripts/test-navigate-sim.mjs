#!/usr/bin/env node
/**
 * Smoke-test Nav2 against sim-amr (--nav2).
 *
 * Prerequisites (already running):
 *   agenticros up sim-amr --nav2 --headless
 *   npx agenticros skills install @agenticros/navigate-to
 *
 * Sequence:
 *   1. list topics / capabilities (sanity)
 *   2. run_mission navigate_to → {x: 2.0, y: 1.0} (clear of person at 2.5,0)
 *   3. report success / failure
 *
 * Usage (from repo root, after building MCP server):
 *   node scripts/test-navigate-sim.mjs
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const serverDist = join(repoRoot, "packages/agenticros-claude-code/dist/index.js");

const GOAL = { x: 2.0, y: 1.0, yaw: 0.0 };
const MISSION_TIMEOUT_MS = 120_000;

const child = spawn(process.execPath, [serverDist], {
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    // Sim publishes at graph root; empty namespace.
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

async function main() {
  console.log("=== navigate_to (sim-amr + Nav2) smoke ===");
  console.log(`Goal: (${GOAL.x}, ${GOAL.y}, yaw=${GOAL.yaw})`);

  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "nav-e2e", version: "0.0.1" },
  });
  await rpc("notifications/initialized", {}).catch(() => {});

  console.log("\n-- ros2_list_topics (expect /odom, /scan, /cmd_vel) --");
  const topics = await rpc("tools/call", { name: "ros2_list_topics", arguments: {} });
  const topicText = pickText(topics);
  console.log(topicText.slice(0, 800));
  for (const t of ["/odom", "/scan", "/cmd_vel"]) {
    if (!topicText.includes(t)) {
      console.warn(`WARN: expected topic ${t} not listed — is sim-amr --nav2 running?`);
    }
  }

  console.log("\n-- ros2_list_capabilities (expect navigate_to) --");
  const caps = await rpc("tools/call", {
    name: "ros2_list_capabilities",
    arguments: {},
  }).catch((e) => ({ content: [{ text: String(e) }] }));
  const capText = pickText(caps);
  console.log(capText.slice(0, 800));
  if (!capText.includes("navigate_to")) {
    console.warn(
      "WARN: navigate_to not in capabilities — install @agenticros/navigate-to and restart MCP.",
    );
  }

  console.log("\n-- run_mission navigate_to --");
  const mission = await rpc(
    "tools/call",
    {
      name: "run_mission",
      arguments: {
        steps: [
          {
            capability: "navigate_to",
            inputs: GOAL,
          },
        ],
      },
    },
    MISSION_TIMEOUT_MS,
  );
  const missionText = pickText(mission);
  console.log(missionText);

  const ok =
    /succeed|completed|status["']?\s*[:=]\s*["']?succeeded/i.test(missionText) &&
    !/fail|error|abort/i.test(missionText.split("\n").slice(-5).join("\n"));

  child.kill("SIGTERM");
  if (ok) {
    console.log("\n=== PASS ===");
    process.exit(0);
  }
  console.error("\n=== FAIL (inspect mission output above) ===");
  process.exit(1);
}

main().catch((e) => {
  console.error("Failed:", e);
  child.kill("SIGKILL");
  process.exit(1);
});
