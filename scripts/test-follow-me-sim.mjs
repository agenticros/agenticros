#!/usr/bin/env node
/**
 * Drive ros2_follow_me_start (mode=depth) against the AMR sim.
 *
 * Sequence:
 *   1. start follow-me in depth mode
 *   2. poll status every 1.5s for 15s, capturing detection events
 *   3. stop follow-me
 *   4. send a zero cmd_vel just in case
 *
 * Reports: did the depth loop see a target, what distance/lateral did it pick,
 * how many cmd_vel commands were issued.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const serverDist = join(repoRoot, "packages/agenticros-claude-code/dist/index.js");

const child = spawn(process.execPath, [serverDist], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env },
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
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  }
});

function rpc(method, params = {}, timeoutMs = 15000) {
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
  console.log("=== follow_me (depth) E2E ===");

  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "fm-e2e", version: "0.0.1" },
  });
  await rpc("notifications/initialized", {}).catch(() => {});

  console.log("\n-- start follow_me mode=depth --");
  const start = await rpc("tools/call", {
    name: "ros2_follow_me_start",
    arguments: { mode: "depth", targetDistance: 1.5 },
  });
  console.log(pickText(start));

  console.log("\n-- poll status for 15s --");
  const polls = [];
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const s = await rpc("tools/call", { name: "ros2_follow_me_status", arguments: {} });
    const text = pickText(s);
    polls.push({ t: (i + 1) * 1.5, text });
    console.log(`t+${((i + 1) * 1.5).toFixed(1)}s :: ${text.replace(/\s+/g, " ").slice(0, 200)}`);
  }

  console.log("\n-- stop follow_me --");
  const stop = await rpc("tools/call", {
    name: "ros2_follow_me_stop",
    arguments: {},
  });
  console.log(pickText(stop));

  console.log("\n-- safety zero-twist --");
  await rpc("tools/call", {
    name: "ros2_publish",
    arguments: {
      topic: "/cmd_vel",
      type: "geometry_msgs/msg/Twist",
      message: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
    },
  });

  child.kill("SIGTERM");
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error("Failed:", e);
  child.kill("SIGKILL");
  process.exit(1);
});
