/**
 * Gemini ros2_estop — declaration + handler against a fake transport pool.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig, TransportPool, ESTOP_PUBLISH_COUNT, ZERO_TWIST } from "@agenticros/core";
import type { AgenticROSConfig, RosTransport, TransportConfig } from "@agenticros/core";
import { executeTool, GEMINI_FUNCTION_DECLARATIONS } from "../tools.js";
import { _swapPoolForTests } from "../transport.js";

function makeFakePool(): {
  pool: TransportPool;
  published: Array<{ topic: string; msg: unknown }>;
} {
  const published: Array<{ topic: string; msg: unknown }> = [];
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
      publish: (opts: { topic: string; msg: unknown }) => {
        published.push({ topic: opts.topic, msg: opts.msg });
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

function baseConfig(): AgenticROSConfig {
  return parseConfig({
    transport: { mode: "local" },
    robot: { name: "Test", namespace: "test", cameraTopic: "" },
  });
}

test("gemini: GEMINI_FUNCTION_DECLARATIONS includes ros2_estop with robot_id", () => {
  const decl = GEMINI_FUNCTION_DECLARATIONS.find((d) => d.name === "ros2_estop");
  assert.ok(decl, "ros2_estop must be in the function declaration set");
  const schema = decl.parametersJsonSchema as {
    properties?: Record<string, unknown>;
  };
  assert.ok(schema.properties && "robot_id" in schema.properties);
});

test("gemini: ros2_estop publishes zero Twist five times", async () => {
  const { pool, published } = makeFakePool();
  const restore = _swapPoolForTests(pool);
  try {
    const result = await executeTool("ros2_estop", {}, baseConfig());
    const parsed = JSON.parse(result.output) as { success: boolean; topic?: string };
    assert.equal(parsed.success, true);
    assert.equal(parsed.topic, "/test/cmd_vel");
    assert.equal(published.length, ESTOP_PUBLISH_COUNT);
    assert.deepEqual(published[0].msg, {
      linear: ZERO_TWIST.linear,
      angular: ZERO_TWIST.angular,
    });
  } finally {
    restore();
  }
});

test("gemini: ros2_estop unknown robot_id returns an error", async () => {
  const result = await executeTool("ros2_estop", { robot_id: "no-such-bot" }, baseConfig());
  assert.match(result.output, /no-such-bot/);
  assert.match(result.output.toLowerCase(), /ros2_list_robots/);
});
