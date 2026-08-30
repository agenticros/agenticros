/**
 * MCP ros2_estop — schema + handler against a fake transport pool.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig, TransportPool, ESTOP_PUBLISH_COUNT, ZERO_TWIST } from "@agenticros/core";
import type { AgenticROSConfig, RosTransport, TransportConfig } from "@agenticros/core";
import { handleToolCall, TOOLS } from "../tools.js";
import { _swapPoolForTests } from "../transport.js";

function makeFakePool(): {
  pool: TransportPool;
  published: Array<{ topic: string; type?: string; msg: unknown }>;
} {
  const published: Array<{ topic: string; type?: string; msg: unknown }> = [];
  const pool = new TransportPool(async (_cfg: TransportConfig): Promise<RosTransport> => {
    let status: "connected" | "disconnected" | "connecting" = "disconnected";
    return {
      getStatus: () => status,
      connect: async () => {
        status = "connected";
      },
      disconnect: async () => {
        status = "disconnected";
      },
      onConnection: () => () => {},
      publish: (opts: { topic: string; type?: string; msg: unknown }) => {
        published.push({ topic: opts.topic, type: opts.type, msg: opts.msg });
      },
      advertise: () => {},
      subscribe: () => ({ unsubscribe: () => {} }),
      callService: async () => ({ result: false }),
      sendActionGoal: async () => ({ result: false }),
      listTopics: async () => [],
      listServices: async () => [],
      listActions: async () => [],
    } as unknown as RosTransport;
  });
  return { pool, published };
}

function baseConfig(overrides: Record<string, unknown> = {}): AgenticROSConfig {
  return parseConfig({
    transport: { mode: "local" },
    robot: { name: "Test", namespace: "test", cameraTopic: "" },
    ...overrides,
  });
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  const first = result.content[0];
  return first?.type === "text" ? (first.text ?? "") : "";
}

test("mcp: TOOLS includes ros2_estop with optional robot_id", () => {
  const tool = TOOLS.find((t) => t.name === "ros2_estop");
  assert.ok(tool, "ros2_estop must be in TOOLS");
  const props = tool.inputSchema?.properties ?? {};
  assert.ok(
    Object.prototype.hasOwnProperty.call(props, "robot_id"),
    "ros2_estop should advertise optional robot_id",
  );
});

test("mcp: ros2_estop publishes zero Twist five times on cmd_vel", async () => {
  const { pool, published } = makeFakePool();
  const restore = _swapPoolForTests(pool);
  try {
    const result = await handleToolCall("ros2_estop", {}, baseConfig());
    assert.equal(result.isError, undefined);
    const text = textOf(result);
    assert.match(text, /Emergency stop activated/);
    assert.match(text, /\/test\/cmd_vel/);
    assert.equal(published.length, ESTOP_PUBLISH_COUNT);
    for (const p of published) {
      assert.equal(p.topic, "/test/cmd_vel");
      assert.deepEqual(p.msg, {
        linear: ZERO_TWIST.linear,
        angular: ZERO_TWIST.angular,
      });
    }
  } finally {
    restore();
  }
});

test("mcp: ros2_estop unknown robot_id is an error mentioning ros2_list_robots", async () => {
  const result = await handleToolCall("ros2_estop", { robot_id: "no-such-bot" }, baseConfig());
  assert.equal(result.isError, true);
  const text = textOf(result).toLowerCase();
  assert.ok(text.includes("no-such-bot"));
  assert.ok(text.includes("ros2_list_robots"));
});

test("mcp: ros2_estop on an arm-only robot skips publish", async () => {
  const { pool, published } = makeFakePool();
  const restore = _swapPoolForTests(pool);
  try {
    const cfg = parseConfig({
      transport: { mode: "local" },
      robots: [
        {
          id: "arm1",
          namespace: "arm",
          kind: "arm",
          default: true,
          profile: {
            schema: "agenticros.profile.v1",
            features: ["arm"],
            bindings: {},
          },
        },
      ],
    });
    const result = await handleToolCall("ros2_estop", { robot_id: "arm1" }, cfg);
    assert.equal(result.isError, undefined);
    assert.match(textOf(result), /no_mobile_base/);
    assert.equal(published.length, 0);
  } finally {
    restore();
  }
});
