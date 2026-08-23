/**
 * Unit tests for createHiveClient() and the deny-list.
 * HTTP is mocked — CI must not start Corebrum.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseConfig } from "../../config.js";
import { createHiveClient } from "../factory.js";
import { assertHivePublishDenied, isDeniedActuationTopic } from "../deny.js";
import { HiveHttpClient } from "../client.js";
import { DEFAULT_HIVE_URL } from "../types.js";

test("factory: returns null when hive.enabled is false (default)", () => {
  const config = parseConfig({});
  assert.equal(createHiveClient(config), null);
});

test("factory: returns null when hive block omitted", () => {
  const config = parseConfig({ robot: { namespace: "robotA" } });
  assert.equal(createHiveClient(config), null);
});

test("factory: builds a client when enabled", () => {
  const config = parseConfig({ hive: { enabled: true } });
  const client = createHiveClient(config);
  assert.ok(client);
  assert.equal(client!.url, DEFAULT_HIVE_URL);
});

test("deny-list: cmd_vel and joints are denied", () => {
  assert.equal(isDeniedActuationTopic("/cmd_vel"), true);
  assert.equal(isDeniedActuationTopic("/ns/cmd_vel"), true);
  assert.equal(isDeniedActuationTopic("joint_trajectory"), true);
  assert.equal(isDeniedActuationTopic("/camera/color/image_raw"), false);
});

test("deny-list: assertHivePublishDenied always throws", () => {
  assert.throws(() => assertHivePublishDenied("/cmd_vel"), /refuses to publish/);
});

test("client: remember/recall against mocked HTTP", async () => {
  const calls: { method: string; url: string }[] = [];
  const store = new Map<string, unknown>();
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ method, url });
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

    if (url.endsWith("/api/identity") && method === "GET") {
      return json([{ key_id: "robot-1" }]);
    }
    if (url.endsWith("/api/identity") && method === "POST") {
      return json({ key_id: "robot-1" });
    }
    if (url.includes("/api/hives?") && method === "GET") {
      return json({ hives: [{ hive_id: "hive-1", name: "org-a" }] });
    }
    if (url.includes("/api/hives") && method === "POST") {
      return json({ hive_id: "hive-1", name: "org-a" });
    }
    if (url.includes("/members/") && method === "PUT") {
      return json({ success: true });
    }
    if (url.includes("/api/hives/hive-1") && method === "GET" && !url.includes("/memory")) {
      return json({ hive_id: "hive-1", name: "org-a", member_count: 2 });
    }
    if (url.includes("/memory") && method === "PUT") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { value?: unknown };
      const key = decodeURIComponent(url.split("/memory/")[1]?.split("?")[0] ?? "k");
      store.set(key, body.value);
      return json({ success: true });
    }
    if (url.includes("/memory") && method === "GET") {
      const items = [...store.entries()].map(([key, value]) => ({ key, value }));
      return json({ keys: items.map((i) => i.key), items });
    }
    if (url.includes("/api/compute-capacity")) {
      return json({ ok: true });
    }
    return json({ error: "unhandled " + method + " " + url }, 404);
  };

  const config = parseConfig({
    hive: { enabled: true, identityId: "robot-1", hiveId: "hive-1" },
  });
  const client = new HiveHttpClient(config, { hiveName: "org-a" }, { fetch: fetchMock });
  const remembered = await client.remember("pallet jack lives in aisle 4");
  assert.ok(remembered.key.startsWith("notes/"));
  const hits = await client.recall("pallet");
  assert.equal(hits.length, 1);
  assert.equal(calls.some((c) => c.method === "PUT" && c.url.includes("/api/publish")), false);
});

test("client: setRecipe uses hosted template URL, not a local yaml path", async () => {
  let submitBody: Record<string, unknown> | undefined;
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (url.endsWith("/api/identity") && method === "GET") return json([{ key_id: "robot-1" }]);
    if (url.includes("/api/hives/hive-1") && method === "GET" && !url.includes("/memory")) {
      return json({ hive_id: "hive-1", name: "org-a", member_count: 1 });
    }
    if (url.includes("/members/")) return json({ success: true });
    if (url.includes("/api/recipes/")) return json({ error: "not found" }, 404);
    if (url.endsWith("/api/submit") && method === "POST") {
      submitBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return json({ success: true, task_id: "task-9", message: "ok" });
    }
    if (url.includes("/memory") && method === "PUT") return json({ success: true });
    return json({ error: "unhandled" }, 404);
  };

  const config = parseConfig({
    hive: { enabled: true, identityId: "robot-1", hiveId: "hive-1" },
  });
  const client = new HiveHttpClient(config, {}, { fetch: fetchMock });
  const result = await client.setRecipe("detect", true, {
    robotId: "robot-1",
    cameraTopic: "/cam/compressed",
    namespace: "robot-1",
  });
  assert.equal(result.on, true);
  assert.equal(result.taskId, "task-9");
  assert.ok(typeof submitBody?.file === "string");
  assert.match(String(submitBody?.file), /^https:\/\/corebrum.com\/recipes\/agenticros-detect\.yaml$/);
  assert.equal(String(submitBody?.file).includes(".."), false);
});
