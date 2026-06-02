/**
 * Unit tests for createMemory() factory and resolveMemoryNamespace().
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseConfig } from "../../config.js";
import { createMemory, resolveMemoryNamespace } from "../factory.js";

test("factory: returns null when memory.enabled is false (default)", async () => {
  const config = parseConfig({});
  const provider = await createMemory(config);
  assert.equal(provider, null);
});

test("factory: returns null when memory block omitted entirely", async () => {
  const config = parseConfig({ robot: { namespace: "robotA" } });
  const provider = await createMemory(config);
  assert.equal(provider, null);
});

test("factory: builds local provider when enabled with backend=local", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "agenticros-fac-"));
  try {
    const config = parseConfig({
      memory: {
        enabled: true,
        backend: "local",
        local: { storePath: path.join(dir, "memory.json") },
      },
    });
    const provider = await createMemory(config);
    assert.ok(provider, "provider must not be null");
    assert.equal(provider!.backend, "local");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolveMemoryNamespace: argument wins over config", () => {
  const config = parseConfig({
    robot: { namespace: "robotA" },
    memory: { enabled: true, namespace: "shared-ns" },
  });
  assert.equal(resolveMemoryNamespace(config, "explicit"), "explicit");
});

test("resolveMemoryNamespace: memory.namespace wins over robot.namespace", () => {
  const config = parseConfig({
    robot: { namespace: "robotA" },
    memory: { enabled: true, namespace: "shared-ns" },
  });
  assert.equal(resolveMemoryNamespace(config), "shared-ns");
});

test("resolveMemoryNamespace: falls back to robot.namespace", () => {
  const config = parseConfig({
    robot: { namespace: "robotA" },
    memory: { enabled: true },
  });
  assert.equal(resolveMemoryNamespace(config), "robotA");
});

test("resolveMemoryNamespace: empty robot namespace yields empty string", () => {
  const config = parseConfig({ memory: { enabled: true } });
  assert.equal(resolveMemoryNamespace(config), "");
});
