/**
 * Integration test for ros2_list_capabilities via the MCP server.
 *
 * Spawns the AgenticROS MCP server stdio entrypoint (exactly the binary
 * Claude Code launches), drives the JSON-RPC handshake, and asserts:
 *
 *   1. tools/list contains ros2_list_capabilities.
 *   2. tools/call returns a well-formed payload with the expected shape.
 *   3. The 6 intrinsic verbs are all present.
 *   4. A skill-declared capability we plant via skillPaths shows up.
 *   5. The call succeeds with NO ROS transport running — proving the
 *      no-transport short-circuit in index.ts and tools.ts is wired.
 *
 * This is the regression net for the bug we hit on 2026-06-10 where the
 * outer `ensureConnected()` gate would block transport-free tools
 * unless NO_TRANSPORT_TOOL_NAMES included them. If somebody removes
 * `ros2_list_capabilities` from that set, this test will hang on
 * Zenoh connect and time out clearly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// dist/__tests__/foo.test.js -> dist/__tests__ -> dist -> packages/agenticros-claude-code
const PKG_ROOT = path.join(__dirname, "..", "..");
const MCP_ENTRY = path.join(PKG_ROOT, "dist", "index.js");

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/**
 * Minimal JSON-RPC client over a child process's stdio. Implements just
 * enough to drive an MCP `initialize` handshake plus tools/list and
 * tools/call requests.
 */
class StdioRpcClient {
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, (msg: JsonRpcResponse) => void>();

  constructor(private readonly proc: ChildProcessWithoutNullStreams) {
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => this.onChunk(chunk));
    proc.stderr.setEncoding("utf8");
    // Drain stderr silently — the server writes a banner + diagnostic logs.
    proc.stderr.on("data", () => {});
  }

  private onChunk(chunk: string): void {
    this.buffer += chunk;
    for (;;) {
      const nl = this.buffer.indexOf("\n");
      if (nl < 0) break;
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(line) as JsonRpcResponse;
      } catch {
        continue;
      }
      if (typeof msg.id === "number" && this.pending.has(msg.id)) {
        const resolver = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        resolver(msg);
      }
    }
  }

  rpc(method: string, params: Record<string, unknown>, timeoutMs = 10_000): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for ${method} (id=${id})`));
      }, timeoutMs);
      this.pending.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(`${method} failed: ${JSON.stringify(msg.error)}`));
        else resolve(msg.result ?? {});
      });
      this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  notify(method: string, params?: Record<string, unknown>): void {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) }) + "\n");
  }
}

interface McpHarness {
  client: StdioRpcClient;
  proc: ChildProcessWithoutNullStreams;
  cleanup: () => Promise<void>;
}

interface StartMcpOptions {
  /**
   * When true, point the transport at an unreachable rosbridge URL
   * so `ensureConnected()` fails in milliseconds instead of hanging
   * indefinitely waiting for rclnodejs / a real ROS daemon. Used by
   * the Phase 1.g planner tests where we care about the COMPILE
   * shape — the mission step's transport error is incidental.
   */
  failFastTransport?: boolean;
}

/**
 * Spawn the MCP server with a hermetic config + a fixture skill in
 * skillPaths so the test can assert skill capabilities round-trip.
 */
async function startMcp(options: StartMcpOptions = {}): Promise<McpHarness> {
  const tmp = await mkdtemp(path.join(tmpdir(), "agenticros-mcp-"));

  // Plant a fixture skill that declares one capability.
  const skillDir = path.join(tmp, "agenticros-skill-fixture");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "package.json"),
    JSON.stringify(
      {
        name: "agenticros-skill-fixture",
        version: "0.0.1",
        agenticros: {
          id: "fixture",
          capabilities: [
            {
              id: "fixture_verb",
              verb: "fixture",
              description: "Test-only capability planted by the MCP integration test.",
              blocks_base: false,
              interruptible: true,
            },
            // Phase 1.g — the planner needs find_object in the registry to
            // compile "find a chair…" goals. We declare it here so the
            // planner emits a real step; the actual dispatch errors out
            // (no real transport in tests) but the planner output is what
            // we want to assert against.
            {
              id: "find_object",
              verb: "find",
              description: "Test-only find_object capability for planner tests.",
              blocks_base: false,
              interruptible: true,
            },
          ],
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const configPath = path.join(tmp, "config.json");
  await writeFile(
    configPath,
    JSON.stringify(
      {
        // No transport mode = defaults to local; tool dispatches before connect()
        // so we never need a live transport for ros2_list_capabilities.
        robot: { name: "Test Robot", namespace: "" },
        skillPaths: [skillDir],
        ...(options.failFastTransport
          ? {
              transport: { mode: "rosbridge" },
              // 127.0.0.1:1 is conventionally unreachable; WebSocket creation
              // fails immediately (ECONNREFUSED), so ensureConnected() throws
              // fast instead of blocking the test.
              rosbridge: { url: "ws://127.0.0.1:1" },
            }
          : {}),
      },
      null,
      2,
    ),
    "utf8",
  );

  const proc = spawn("node", [MCP_ENTRY], {
    env: {
      ...process.env,
      AGENTICROS_CONFIG_PATH: configPath,
      // Belt-and-suspenders: even if something tries to connect later, send it
      // to a port that doesn't exist so it fails fast instead of hanging.
      AGENTICROS_ROBOT_NAMESPACE: "test_robot",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const client = new StdioRpcClient(proc);

  return {
    client,
    proc,
    cleanup: async () => {
      proc.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          proc.kill("SIGKILL");
          resolve();
        }, 2000);
        proc.on("exit", () => {
          clearTimeout(t);
          resolve();
        });
      });
      await rm(tmp, { recursive: true, force: true });
    },
  };
}

async function initialize(client: StdioRpcClient): Promise<void> {
  await client.rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "agenticros-mcp-test", version: "0.0.1" },
  });
  client.notify("notifications/initialized");
}

test("mcp: server responds to initialize handshake", async () => {
  const harness = await startMcp();
  try {
    const result = (await harness.client.rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "agenticros-mcp-test", version: "0.0.1" },
    })) as { serverInfo?: { name: string; version: string } };
    assert.equal(result.serverInfo?.name, "agenticros");
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/list contains ros2_list_capabilities", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{ name: string; description: string }>;
    };
    const names = list.tools.map((t) => t.name);
    assert.ok(
      names.includes("ros2_list_capabilities"),
      `tools/list should include ros2_list_capabilities; got: ${names.join(", ")}`,
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/call ros2_list_capabilities returns the expected shape", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "ros2_list_capabilities",
      arguments: {},
    })) as { content: Array<{ type: string; text: string }>; isError?: boolean };

    assert.notEqual(result.isError, true, "tools/call should not return isError");
    assert.ok(result.content?.[0]?.text, "tools/call must return text content");

    const payload = JSON.parse(result.content[0].text) as {
      success: boolean;
      total: number;
      intrinsic_count: number;
      skill_count: number;
      capabilities: Array<{
        id: string;
        verb: string;
        source?: { kind: string; skillId?: string };
      }>;
    };
    assert.equal(payload.success, true);
    assert.equal(payload.intrinsic_count, 6, "should report exactly 6 intrinsic verbs");
    assert.ok(payload.skill_count >= 1, "fixture skill should contribute at least one capability");
    assert.equal(payload.total, payload.intrinsic_count + payload.skill_count);

    // All 6 intrinsic verbs present.
    const intrinsicIds = payload.capabilities
      .filter((c) => c.source?.kind === "builtin")
      .map((c) => c.id)
      .sort();
    assert.deepEqual(intrinsicIds, [
      "drive_base",
      "list_topics",
      "measure_depth",
      "publish_topic",
      "subscribe_once",
      "take_snapshot",
    ]);

    // Fixture skill capability round-trips.
    const fixture = payload.capabilities.find((c) => c.id === "fixture_verb");
    assert.ok(fixture, "fixture_verb should be in the response");
    assert.equal(fixture.verb, "fixture");
    assert.equal(fixture.source?.kind, "skill");
    assert.equal(fixture.source?.skillId, "fixture");
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/list contains ros2_list_robots", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{ name: string }>;
    };
    const names = list.tools.map((t) => t.name);
    assert.ok(
      names.includes("ros2_list_robots"),
      `tools/list should include ros2_list_robots; got: ${names.join(", ")}`,
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/call ros2_list_robots returns the expected shape (legacy fallback)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "ros2_list_robots",
      arguments: {},
    })) as { content: Array<{ type: string; text: string }>; isError?: boolean };

    assert.notEqual(result.isError, true);
    const payload = JSON.parse(result.content[0].text) as {
      success: boolean;
      total: number;
      active_robot_id: string;
      robots: Array<{ id: string; name: string; namespace: string; source: string }>;
    };
    assert.equal(payload.success, true);
    // The hermetic test config sets robot.namespace via AGENTICROS_ROBOT_NAMESPACE
    // to "test_robot" — so the legacy fallback should synthesize that id.
    assert.ok(payload.total >= 1);
    const active = payload.robots.find((r) => r.id === payload.active_robot_id);
    assert.ok(active, "active_robot_id should refer to an entry in robots[]");
  } finally {
    await harness.cleanup();
  }
});

test("mcp: ros2_list_robots works WITHOUT a ROS transport (offline-safe)", async () => {
  // Sibling regression test to the ros2_list_capabilities offline check —
  // ros2_list_robots reads only local config, must never block on transport
  // connect. If somebody drops it from NO_TRANSPORT_TOOL_NAMES the outer
  // ensureConnected() gate will fire and this test will time out.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const t0 = Date.now();
    await harness.client.rpc(
      "tools/call",
      { name: "ros2_list_robots", arguments: {} },
      5000,
    );
    const elapsed = Date.now() - t0;
    assert.ok(
      elapsed < 3000,
      `tool should return in <3s without transport; took ${elapsed}ms`,
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/list contains ros2_find_robots_for (Phase 1.e)", async () => {
  // Pins the new fleet-filter tool into the MCP catalog so an agent
  // listing /tools sees the verb-aware finder alongside list/discover.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{
        name: string;
        inputSchema?: { properties?: Record<string, { type?: string }> };
      }>;
    };
    const tool = list.tools.find((t) => t.name === "ros2_find_robots_for");
    assert.ok(tool, "ros2_find_robots_for must be registered");
    // All three filter axes from the spec must be advertised so the LLM
    // can plan against them without guessing parameter names.
    const props = tool!.inputSchema?.properties ?? {};
    assert.ok(props["capability"], "must advertise 'capability' parameter");
    assert.ok(props["kind"], "must advertise 'kind' parameter");
    assert.ok(props["online"], "must advertise 'online' parameter");
    assert.equal(props["online"].type, "boolean");
  } finally {
    await harness.cleanup();
  }
});

test("mcp: ros2_find_robots_for works WITHOUT a ROS transport (offline-safe when 'online' is omitted)", async () => {
  // The fleet filter MUST stay config-only by default — agents call it
  // mid-conversation for static planning. The transport is only needed
  // for the live online check. If somebody removes it from
  // NO_TRANSPORT_TOOL_NAMES the outer ensureConnected() will block and
  // this test will time out.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const t0 = Date.now();
    const result = (await harness.client.rpc(
      "tools/call",
      { name: "ros2_find_robots_for", arguments: {} },
      5000,
    )) as { content: Array<{ type: string; text: string }>; isError?: boolean };
    const elapsed = Date.now() - t0;
    assert.ok(elapsed < 3000, `should return in <3s without transport; took ${elapsed}ms`);
    assert.notEqual(result.isError, true);
    const payload = JSON.parse(result.content[0].text) as {
      success: boolean;
      total: number;
      query: Record<string, unknown>;
      robots: Array<{ id: string; online: boolean | null }>;
    };
    assert.equal(payload.success, true);
    // No online filter → online status is null on every match.
    for (const r of payload.robots) {
      assert.equal(r.online, null, "online should be null when no online filter was applied");
    }
  } finally {
    await harness.cleanup();
  }
});

test("mcp: ros2_find_robots_for with unknown capability filters everyone out (no false positives)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "ros2_find_robots_for",
      arguments: { capability: "no_such_verb_should_never_exist" },
    })) as { content: Array<{ type: string; text: string }>; isError?: boolean };
    const payload = JSON.parse(result.content[0].text) as { success: boolean; total: number };
    assert.equal(payload.success, true);
    assert.equal(payload.total, 0);
  } finally {
    await harness.cleanup();
  }
});

test("mcp: ros2_find_robots_for kind filter is case-insensitive exact match", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    // The hermetic test config synthesizes one AMR via the legacy fallback.
    const matches = (await harness.client.rpc("tools/call", {
      name: "ros2_find_robots_for",
      arguments: { kind: "AMR" },
    })) as { content: Array<{ text: string }> };
    const payload = JSON.parse(matches.content[0].text) as { total: number };
    assert.ok(payload.total >= 1, "case-insensitive AMR should match the legacy entry");

    // A non-existent kind should match nothing.
    const none = (await harness.client.rpc("tools/call", {
      name: "ros2_find_robots_for",
      arguments: { kind: "submersible" },
    })) as { content: Array<{ text: string }> };
    const empty = JSON.parse(none.content[0].text) as { total: number };
    assert.equal(empty.total, 0);
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/list contains ros2_discover_robots (Phase 1.d discovery)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{ name: string; inputSchema?: { properties?: Record<string, unknown> } }>;
    };
    const names = list.tools.map((t) => t.name);
    assert.ok(
      names.includes("ros2_discover_robots"),
      `tools/list should include ros2_discover_robots; got: ${names.join(", ")}`,
    );
    // Discovery returns the whole fleet view — it should NOT take robot_id
    // (no per-robot scoping makes sense; it always reports everything seen).
    const tool = list.tools.find((t) => t.name === "ros2_discover_robots");
    const props = tool?.inputSchema?.properties ?? {};
    assert.ok(
      !Object.prototype.hasOwnProperty.call(props, "robot_id"),
      "ros2_discover_robots should NOT advertise robot_id — it's a fleet-wide tool",
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: tools/list contains run_mission", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{ name: string }>;
    };
    const names = list.tools.map((t) => t.name);
    assert.ok(names.includes("run_mission"), `tools/list should include run_mission; got: ${names.join(", ")}`);
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission rejects malformed input cleanly (no transport needed)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    // Missing `mission` argument entirely → tool should return isError with
    // a useful message rather than crash the server.
    const result = (await harness.client.rpc("tools/call", {
      name: "run_mission",
      arguments: {},
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.toLowerCase().includes("mission"));
  } finally {
    await harness.cleanup();
  }
});

test("mcp: ros2_list_capabilities works WITHOUT a ROS transport (offline-safe)", async () => {
  // This is the regression test for NO_TRANSPORT_TOOL_NAMES wiring. If
  // somebody drops `ros2_list_capabilities` from that set, the outer
  // `ensureConnected()` will block on a Zenoh that isn't there and this
  // call will time out. We assert it completes well under the timeout.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const t0 = Date.now();
    await harness.client.rpc(
      "tools/call",
      { name: "ros2_list_capabilities", arguments: {} },
      5000, // intentionally short — must NOT trigger transport connect path
    );
    const elapsed = Date.now() - t0;
    assert.ok(
      elapsed < 3000,
      `tool should return in <3s without transport; took ${elapsed}ms (likely waiting on transport connect)`,
    );
  } finally {
    await harness.cleanup();
  }
});

// --- Phase 1.d-extend: per-tool robot_id error path tests ---
//
// These pin down the contract that every tool that accepts robot_id
// rejects unknown ids with a clean, self-correctable error response.
// We exercise this via ros2_list_capabilities (transport-free, so it
// works in this hermetic fixture) and via run_mission's mission.robot_id
// validator. The other 8 ROS2 tools share the same resolveRobotFromArgs
// path so the contract is the same; we don't repeat for each.

test("mcp: ros2_list_capabilities with unknown robot_id returns clean tool error", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "ros2_list_capabilities",
      arguments: { robot_id: "nonexistent-robot" },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(result.isError, true, "unknown robot_id must produce isError=true");
    const text = result.content[0].text;
    assert.ok(text.includes("nonexistent-robot"), `error text should mention the bad id (got: ${text})`);
    assert.ok(
      text.toLowerCase().includes("ros2_list_robots"),
      `error text should recommend ros2_list_robots for self-correction (got: ${text})`,
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: ros2_list_capabilities with valid robot_id returns the same response (today)", async () => {
  // The hermetic config has the legacy single-robot fallback id
  // "test_robot" (derived from AGENTICROS_ROBOT_NAMESPACE). Passing it
  // should succeed and produce the same payload shape as no argument.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "ros2_list_capabilities",
      arguments: { robot_id: "test_robot" },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.notEqual(result.isError, true, "valid robot_id must not surface as error");
    const payload = JSON.parse(result.content[0].text) as { success: boolean; total: number };
    assert.equal(payload.success, true);
    assert.ok(payload.total >= 6);
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission with unknown mission.robot_id is rejected before any step runs", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "run_mission",
      arguments: {
        mission: {
          name: "should never start",
          robot_id: "no-such-robot",
          steps: [
            { id: "a", capability: "drive_base", inputs: { linear_x: 0.1 } },
          ],
        },
      },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(result.isError, true);
    const text = result.content[0].text;
    assert.ok(text.includes("no-such-robot"));
    assert.ok(
      text.toLowerCase().includes("ros2_list_robots"),
      `mission-level robot_id error should recommend ros2_list_robots (got: ${text})`,
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: every ROS2 tool advertises optional robot_id in its inputSchema", async () => {
  // Regression test that catches accidental schema regressions when
  // we add or rename tools later. Every tool that accepts robot_id
  // should expose the property; ros2_list_topics and ros2_list_robots
  // are exempt (global lookups, no per-robot routing).
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{ name: string; inputSchema?: { properties?: Record<string, unknown> } }>;
    };
    const expected = [
      "ros2_list_capabilities",
      "ros2_publish",
      "ros2_subscribe_once",
      "ros2_service_call",
      "ros2_action_goal",
      "ros2_param_get",
      "ros2_param_set",
      "ros2_camera_snapshot",
      "ros2_depth_distance",
      // Phase 1.d-extend: skill tools must also route through robot_id so
      // multi-robot deployments can target a specific robot's loop.
      "ros2_follow_me_start",
      "ros2_follow_me_stop",
      "ros2_follow_me_status",
      "ros2_follow_me_set_distance",
      "ros2_follow_me_set_target",
      "ros2_find_object",
    ];
    for (const name of expected) {
      const tool = list.tools.find((t) => t.name === name);
      assert.ok(tool, `${name} should be in tools/list`);
      const props = tool.inputSchema?.properties ?? {};
      assert.ok(
        Object.prototype.hasOwnProperty.call(props, "robot_id"),
        `${name} should advertise an optional robot_id parameter; got properties: ${Object.keys(props).join(", ")}`,
      );
    }
    // ros2_list_robots itself does NOT take robot_id.
    const listRobotsTool = list.tools.find((t) => t.name === "ros2_list_robots");
    assert.ok(listRobotsTool);
    const lrProps = listRobotsTool.inputSchema?.properties ?? {};
    assert.ok(
      !Object.prototype.hasOwnProperty.call(lrProps, "robot_id"),
      "ros2_list_robots should NOT take robot_id (it returns the full list)",
    );
  } finally {
    await harness.cleanup();
  }
});

// --- Phase 1.f: mission_cancel surface + semantics ---
//
// These tests pin the adapter contract for the cancel tool: it must
// be in the catalog, advertise mission_id/reason, work without ROS
// transport (it only mutates an in-process registry), and behave
// idempotently / safely on unknown ids.

test("mcp: tools/list contains mission_cancel (Phase 1.f)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{
        name: string;
        inputSchema?: { properties?: Record<string, { type?: string }>; required?: string[] };
      }>;
    };
    const tool = list.tools.find((t) => t.name === "mission_cancel");
    assert.ok(tool, "mission_cancel must be registered alongside run_mission");
    const props = tool!.inputSchema?.properties ?? {};
    assert.ok(props["mission_id"], "must advertise 'mission_id'");
    assert.ok(props["reason"], "must advertise optional 'reason'");
    assert.deepEqual(
      tool!.inputSchema?.required,
      ["mission_id"],
      "mission_id should be the only required field",
    );
  } finally {
    await harness.cleanup();
  }
});

test("mcp: mission_cancel works WITHOUT a ROS transport (in-process registry only)", async () => {
  // mission_cancel never talks to ROS — it just flips a token in the
  // in-process MissionRegistry. If somebody drops it from
  // NO_TRANSPORT_TOOL_NAMES the outer ensureConnected() gate fires
  // and the call hangs until the test timeout. We assert the call
  // returns fast even though no zenohd is up.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const t0 = Date.now();
    const result = (await harness.client.rpc(
      "tools/call",
      { name: "mission_cancel", arguments: { mission_id: "mn_does_not_exist" } },
      5000,
    )) as { content: Array<{ text: string }>; isError?: boolean };
    const elapsed = Date.now() - t0;
    assert.ok(elapsed < 3000, `must return in <3s without transport; took ${elapsed}ms`);
    assert.notEqual(result.isError, true);
    const payload = JSON.parse(result.content[0].text) as {
      success: boolean;
      mission_id: string;
      found: boolean;
      already_cancelled: boolean;
    };
    assert.equal(payload.success, true);
    assert.equal(payload.found, false, "unknown mission_id should report found:false");
    assert.equal(payload.already_cancelled, false);
    assert.equal(payload.mission_id, "mn_does_not_exist");
  } finally {
    await harness.cleanup();
  }
});

test("mcp: mission_cancel rejects empty / missing mission_id with a useful error", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    // Empty string
    const empty = (await harness.client.rpc("tools/call", {
      name: "mission_cancel",
      arguments: { mission_id: "   " },
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(empty.isError, true);
    assert.ok(empty.content[0].text.toLowerCase().includes("mission_id"));

    // Missing altogether
    const missing = (await harness.client.rpc("tools/call", {
      name: "mission_cancel",
      arguments: {},
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(missing.isError, true);
    assert.ok(missing.content[0].text.toLowerCase().includes("mission_id"));
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission returns a mission_id in the compact result payload (Phase 1.f)", async () => {
  // The agent needs the mission_id back so it can later call
  // mission_cancel. Even a mission that fails its only step (because
  // it dispatches a capability that needs a real transport here)
  // must still surface mission_id in its compact JSON payload — this
  // is the wire the cancel UX hangs on.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "run_mission",
      arguments: {
        mission: {
          name: "should yield a mission_id",
          steps: [
            // Step uses a capability the runner refuses (no binding for
            // a made-up capability) so we don't need any ROS transport.
            { id: "noop", capability: "fixture_verb" },
          ],
        },
      },
    }, 10_000)) as { content: Array<{ text: string }>; isError?: boolean };
    // The text payload is "<summary>\n<json>" — pull the JSON line.
    const lines = result.content[0].text.split("\n");
    const jsonLine = lines.find((l) => l.trim().startsWith("{")) ?? "";
    const payload = JSON.parse(jsonLine) as {
      mission_id?: string;
      status: string;
      steps: Array<{ status: string }>;
    };
    assert.ok(
      typeof payload.mission_id === "string" && payload.mission_id.startsWith("mn_"),
      `compact result should include a mission_id; got: ${JSON.stringify(payload)}`,
    );
  } finally {
    await harness.cleanup();
  }
});

// --- Phase 1.g: run_mission { goal } natural-language compile path ---
//
// These tests pin the adapter-level contract for the NL planner:
// run_mission must accept `goal` as an alternative to `mission`,
// surface the compiled plan + candidates in its response, and reject
// uncompilable goals with a helpful suggestions list.

test("mcp: tools/list run_mission advertises both 'mission' AND 'goal' parameters (Phase 1.g)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const list = (await harness.client.rpc("tools/list", {})) as {
      tools: Array<{
        name: string;
        inputSchema?: {
          properties?: Record<string, { type?: string }>;
          required?: string[];
        };
      }>;
    };
    const tool = list.tools.find((t) => t.name === "run_mission");
    assert.ok(tool, "run_mission must be in the catalog");
    const props = tool!.inputSchema?.properties ?? {};
    assert.ok(props["mission"], "must still accept 'mission'");
    assert.ok(props["goal"], "must also accept natural-language 'goal' (Phase 1.g)");
    assert.ok(props["robot_id"], "must accept top-level robot_id when goal is used");
    // Neither must be required individually — the handler enforces
    // "at least one of mission/goal" at runtime.
    assert.deepEqual(tool!.inputSchema?.required ?? [], []);
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission { goal } compiles + executes without an explicit mission (Phase 1.g)", async () => {
  // The planner is rule-based + deterministic; we don't need a real
  // ROS transport for this — the step uses `take_snapshot` which has
  // a binding but will fail at dispatch (no zenohd here). The point
  // of the test is the COMPILE: the response must echo planner info
  // and a mission_id even though the step itself errors.
  // failFastTransport=true points the rosbridge URL at an unreachable
  // port so ensureConnected() throws in ms instead of hanging.
  const harness = await startMcp({ failFastTransport: true });
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc(
      "tools/call",
      { name: "run_mission", arguments: { goal: "take a picture" } },
      10_000,
    )) as { content: Array<{ text: string }>; isError?: boolean };
    const text = result.content[0].text;
    const lines = text.split("\n");
    const jsonLine = lines.find((l) => l.trim().startsWith("{")) ?? "";
    if (!jsonLine) {
      throw new Error(`expected JSON line in response; got:\n${text}`);
    }
    const payload = JSON.parse(jsonLine) as {
      mission_id?: string;
      planner?: {
        compiled_from_goal: string;
        candidates: Array<{ capability_id: string }>;
      };
      steps: Array<{ capability: string }>;
    };
    assert.equal(payload.planner?.compiled_from_goal, "take a picture");
    assert.ok(payload.planner?.candidates && payload.planner.candidates.length >= 1);
    assert.equal(payload.planner!.candidates[0].capability_id, "take_snapshot");
    // The compiled plan must have actually run (or at least started).
    assert.equal(payload.steps[0].capability, "take_snapshot");
    assert.ok(typeof payload.mission_id === "string" && payload.mission_id.startsWith("mn_"));
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission { goal } compound 'find a chair and drive toward it' produces a 2-step plan (Phase 1.g)", async () => {
  const harness = await startMcp({ failFastTransport: true });
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc(
      "tools/call",
      { name: "run_mission", arguments: { goal: "find a chair and drive toward it" } },
      10_000,
    )) as { content: Array<{ text: string }>; isError?: boolean };
    const lines = result.content[0].text.split("\n");
    const jsonLine = lines.find((l) => l.trim().startsWith("{")) ?? "";
    const payload = JSON.parse(jsonLine) as {
      planner?: { candidates: Array<{ capability_id: string }> };
      steps_total?: number;
      steps: Array<{ id: string; capability: string }>;
    };
    assert.equal(payload.planner?.candidates.length, 2);
    assert.equal(payload.steps_total, 2);
    assert.equal(payload.steps[0].capability, "find_object");
    assert.equal(payload.steps[0].id, "find");
    assert.equal(payload.steps[1].capability, "drive_base");
    assert.equal(payload.steps[1].id, "approach");
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission { goal: 'paint the wall' } surfaces a clean compile error with suggestions (Phase 1.g)", async () => {
  // The planner can't map "paint" to any capability — the response
  // must isError=true with a structured payload (error + suggestions)
  // so the LLM can self-correct without an extra round-trip.
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc(
      "tools/call",
      { name: "run_mission", arguments: { goal: "paint the wall blue" } },
      10_000,
    )) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(result.isError, true);
    const payload = JSON.parse(result.content[0].text) as {
      success: boolean;
      error: string;
      suggestions: string[];
    };
    assert.equal(payload.success, false);
    assert.ok(payload.error.toLowerCase().includes("couldn't compile"));
    assert.ok(Array.isArray(payload.suggestions) && payload.suggestions.length > 0);
  } finally {
    await harness.cleanup();
  }
});

test("mcp: run_mission with NEITHER mission nor goal returns a clear error (Phase 1.g)", async () => {
  const harness = await startMcp();
  try {
    await initialize(harness.client);
    const result = (await harness.client.rpc("tools/call", {
      name: "run_mission",
      arguments: {},
    })) as { content: Array<{ text: string }>; isError?: boolean };
    assert.equal(result.isError, true);
    const text = result.content[0].text.toLowerCase();
    assert.ok(text.includes("mission") && text.includes("goal"), `error must mention both options; got: ${result.content[0].text}`);
  } finally {
    await harness.cleanup();
  }
});
