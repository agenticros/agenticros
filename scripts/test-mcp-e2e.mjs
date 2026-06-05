#!/usr/bin/env node
/**
 * Spin up the @agenticros/claude-code MCP server as a child process and exercise
 * a real JSON-RPC session over stdio. Used for end-to-end testing of the MCP
 * tools against a live sim (or real robot).
 *
 * Usage:
 *   node scripts/test-mcp-e2e.mjs
 *
 * Honours AGENTICROS_CONFIG_PATH if set; otherwise uses ~/.agenticros/config.json.
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
child.on("exit", (code, sig) => {
  process.stderr.write(`[mcp] exited code=${code} sig=${sig}\n`);
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
    } catch (e) {
      process.stderr.write(`[mcp] non-json line: ${line}\n`);
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.code}: ${msg.error.message}`));
      else resolve(msg.result);
    }
  }
});

function rpc(method, params = {}, timeoutMs = 20000) {
  const id = nextId++;
  const payload = { jsonrpc: "2.0", id, method, params };
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
    child.stdin.write(JSON.stringify(payload) + "\n");
  });
}

function summarise(content, max = 4000) {
  if (!Array.isArray(content)) return JSON.stringify(content).slice(0, max);
  return content
    .map((c) => {
      if (c.type === "text") {
        const t = c.text ?? "";
        return t.length > max ? `${t.slice(0, max)} … (+${t.length - max} chars)` : t;
      }
      if (c.type === "image") return `[image base64 len=${(c.data ?? "").length} mime=${c.mimeType}]`;
      return `[${c.type}]`;
    })
    .join("\n");
}

async function callTool(name, args = {}, timeoutMs = 20000) {
  const t0 = Date.now();
  try {
    const result = await rpc("tools/call", { name, arguments: args }, timeoutMs);
    const ms = Date.now() - t0;
    const ok = result?.isError ? "ERR" : "ok ";
    console.log(`[${ok}] (${ms.toString().padStart(5)}ms) ${name}`);
    console.log(`        ${summarise(result?.content)}`);
    return result;
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[ERR] (${ms.toString().padStart(5)}ms) ${name}  ${e.message}`);
    return null;
  }
}

async function main() {
  console.log("=== MCP E2E harness ===");

  console.log("\n-- initialize --");
  const init = await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "agenticros-e2e", version: "0.0.1" },
  });
  console.log(`server: ${init.serverInfo?.name} v${init.serverInfo?.version}`);
  await rpc("notifications/initialized", {}).catch(() => {});

  console.log("\n-- tools/list --");
  const tl = await rpc("tools/list", {});
  console.log(`  ${tl.tools?.length ?? 0} tools advertised`);
  for (const t of tl.tools ?? []) {
    console.log(`    - ${t.name}`);
  }

  console.log("\n-- ros2_list_topics --");
  await callTool("ros2_list_topics", {}, 30000);

  console.log("\n-- ros2_publish /cmd_vel (linear.x=0.2) --");
  await callTool(
    "ros2_publish",
    {
      topic: "/cmd_vel",
      type: "geometry_msgs/msg/Twist",
      message: { linear: { x: 0.2, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
    },
    10000,
  );

  console.log("\n-- ros2_subscribe_once /imu/data --");
  await callTool(
    "ros2_subscribe_once",
    { topic: "/imu/data", type: "sensor_msgs/msg/Imu", timeoutMs: 5000 },
    10000,
  );

  console.log("\n-- ros2_subscribe_once /scan --");
  await callTool(
    "ros2_subscribe_once",
    { topic: "/scan", type: "sensor_msgs/msg/LaserScan", timeoutMs: 5000 },
    10000,
  );

  console.log("\n-- ros2_camera_snapshot (RGB) --");
  await callTool("ros2_camera_snapshot", {}, 15000);

  console.log("\n-- ros2_depth_distance --");
  await callTool("ros2_depth_distance", {}, 15000);

  console.log("\n-- stop --");
  await callTool(
    "ros2_publish",
    {
      topic: "/cmd_vel",
      type: "geometry_msgs/msg/Twist",
      message: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
    },
    5000,
  );

  console.log("\n=== Done ===");
  child.kill("SIGTERM");
}

main().catch((e) => {
  console.error("Harness failed:", e);
  child.kill("SIGKILL");
  process.exit(1);
});
