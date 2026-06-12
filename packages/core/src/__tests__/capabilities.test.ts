/**
 * Unit tests for the Phase 1 capability registry.
 *
 * The four broken-link failure cascade we hit on 2026-06-10 is exactly the
 * regression class these tests are here to prevent:
 *   1. Stale @agenticros/core caches in skill repos hiding new exports.
 *   2. `sync-skill-tools.mjs` overwriting `contracts.tools` with a stale list.
 *   3. OpenClaw `tools.alsoAllow` filtering out unallowlisted plugin tools.
 *   4. The plugin-deploy `dist/` falling behind the workspace.
 *
 * The most upstream of those is "the reader produces what we promised";
 * everything else depends on that contract holding. So this file pins down:
 *   - BUILTIN_CAPABILITIES has the 6 intrinsic verbs we ship.
 *   - readSkillCapabilities() picks up the `agenticros` block from package.json.
 *   - It uses `agenticros.id` (not the package name) as the skill id.
 *   - It tags every capability with a source so dispatchers can filter.
 *   - It deduplicates within a skill so a malformed manifest can't blow up.
 *   - listAllCapabilities() merges intrinsic + skill in that order.
 *   - It tolerates non-skill packages (no `agenticros` key) silently.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseConfig } from "../config.js";
import {
  BUILTIN_CAPABILITIES,
  readSkillCapabilities,
  listAllCapabilities,
  type Capability,
} from "../capabilities.js";

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function makeSkillDir(
  root: string,
  name: string,
  pkg: Record<string, unknown>,
): Promise<string> {
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  await writeJson(path.join(dir, "package.json"), pkg);
  return dir;
}

test("BUILTIN_CAPABILITIES exposes the six intrinsic robot verbs", () => {
  const ids = BUILTIN_CAPABILITIES.map((c) => c.id).sort();
  assert.deepEqual(ids, [
    "drive_base",
    "list_topics",
    "measure_depth",
    "publish_topic",
    "subscribe_once",
    "take_snapshot",
  ]);
  for (const c of BUILTIN_CAPABILITIES) {
    assert.equal(c.source?.kind, "builtin", `${c.id} should be tagged builtin`);
    assert.ok(c.verb.length > 0, `${c.id} should have a verb`);
    assert.ok(c.description.length > 0, `${c.id} should have a description`);
  }
});

test("readSkillCapabilities: reads capabilities from the `agenticros` block", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const skillDir = await makeSkillDir(root, "skill-alpha", {
      name: "agenticros-skill-alpha",
      version: "0.0.1",
      main: "dist/index.js",
      agenticros: {
        id: "alpha",
        displayName: "Alpha",
        capabilities: [
          {
            id: "wave_hello",
            verb: "greet",
            description: "Wave the arm.",
            inputs: { duration_s: { type: "number", optional: true } },
            interruptible: true,
          },
          {
            id: "patrol_room",
            verb: "patrol",
            description: "Patrol until stopped.",
            blocks_base: true,
          },
        ],
      },
    });
    const config = parseConfig({ skillPaths: [skillDir] });
    const caps = readSkillCapabilities(config);

    assert.equal(caps.length, 2);

    const wave = caps.find((c) => c.id === "wave_hello") as Capability;
    assert.ok(wave, "wave_hello should be present");
    assert.equal(wave.verb, "greet");
    assert.equal(wave.interruptible, true);
    assert.equal(wave.source?.kind, "skill");
    if (wave.source?.kind === "skill") {
      assert.equal(wave.source.skillId, "alpha");
      assert.equal(wave.source.package, "agenticros-skill-alpha");
    }
    assert.equal(wave.implementation?.kind, "in_process", "default implementation should be in_process");

    const patrol = caps.find((c) => c.id === "patrol_room") as Capability;
    assert.equal(patrol.blocks_base, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readSkillCapabilities: uses agenticros.id (not the package name) for the skill id", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const skillDir = await makeSkillDir(root, "weird-named-repo", {
      name: "@some-org/totally-different-name",
      version: "0.0.1",
      agenticros: {
        id: "explicit-id",
        capabilities: [{ id: "do_thing", verb: "do", description: "Do." }],
      },
    });
    const caps = readSkillCapabilities(parseConfig({ skillPaths: [skillDir] }));
    assert.equal(caps.length, 1);
    assert.equal(caps[0].source?.kind, "skill");
    if (caps[0].source?.kind === "skill") {
      assert.equal(caps[0].source.skillId, "explicit-id");
      assert.equal(caps[0].source.package, "@some-org/totally-different-name");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readSkillCapabilities: silently ignores non-skill packages", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const dir = await makeSkillDir(root, "not-a-skill", {
      name: "regular-package",
      version: "0.0.1",
    });
    const caps = readSkillCapabilities(parseConfig({ skillPaths: [dir] }));
    assert.equal(caps.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readSkillCapabilities: dedupes within a skill when an id appears twice in the array", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const skillDir = await makeSkillDir(root, "skill-dupe", {
      name: "agenticros-skill-dupe",
      version: "0.0.1",
      agenticros: {
        id: "dupe",
        capabilities: [
          { id: "shared_id", verb: "first", description: "First." },
          { id: "shared_id", verb: "second", description: "Duplicate (ignored)." },
          { id: "extra", verb: "demo", description: "Unique." },
        ],
      },
    });
    const caps = readSkillCapabilities(parseConfig({ skillPaths: [skillDir] }));
    const ids = caps.map((c) => c.id).sort();
    assert.deepEqual(ids, ["extra", "shared_id"]);
    const shared = caps.find((c) => c.id === "shared_id");
    assert.equal(shared?.verb, "first", "first entry should win on duplicate id");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readSkillCapabilities: drops entries without a valid id", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const skillDir = await makeSkillDir(root, "skill-bad", {
      name: "agenticros-skill-bad",
      version: "0.0.1",
      agenticros: {
        id: "bad",
        capabilities: [
          { verb: "noid", description: "Missing id." },
          { id: "", verb: "empty", description: "Empty id." },
          { id: "ok", verb: "good", description: "Valid." },
          "not_an_object",
          null,
        ],
      },
    });
    const caps = readSkillCapabilities(parseConfig({ skillPaths: [skillDir] }));
    assert.equal(caps.length, 1);
    assert.equal(caps[0].id, "ok");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readSkillCapabilities: skips packages with an `agenticros` block that lacks an `id`", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const skillDir = await makeSkillDir(root, "skill-noid", {
      name: "agenticros-skill-noid",
      version: "0.0.1",
      agenticros: {
        capabilities: [{ id: "do_thing", verb: "do", description: "Do." }],
      },
    });
    const caps = readSkillCapabilities(parseConfig({ skillPaths: [skillDir] }));
    assert.equal(caps.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("listAllCapabilities: built-ins first, then skill caps; counts add up", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agenticros-caps-"));
  try {
    const skillDir = await makeSkillDir(root, "skill-extra", {
      name: "agenticros-skill-extra",
      version: "0.0.1",
      agenticros: {
        id: "extra",
        capabilities: [
          { id: "extra_one", verb: "demo", description: "One." },
          { id: "extra_two", verb: "demo", description: "Two." },
        ],
      },
    });
    const config = parseConfig({ skillPaths: [skillDir] });
    const caps = listAllCapabilities(config);

    assert.equal(caps.length, BUILTIN_CAPABILITIES.length + 2);
    // Built-ins are first.
    for (let i = 0; i < BUILTIN_CAPABILITIES.length; i++) {
      assert.equal(caps[i].id, BUILTIN_CAPABILITIES[i].id);
      assert.equal(caps[i].source?.kind, "builtin");
    }
    // Skill caps follow.
    const skillSlice = caps.slice(BUILTIN_CAPABILITIES.length);
    assert.deepEqual(
      skillSlice.map((c) => c.id).sort(),
      ["extra_one", "extra_two"],
    );
    for (const c of skillSlice) assert.equal(c.source?.kind, "skill");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("listAllCapabilities: empty config returns only built-ins (no crash)", () => {
  const caps = listAllCapabilities(parseConfig({}));
  assert.equal(caps.length, BUILTIN_CAPABILITIES.length);
  assert.ok(caps.every((c) => c.source?.kind === "builtin"));
});

test("readSkillCapabilities: missing skillPath does not throw", () => {
  const config = parseConfig({ skillPaths: ["/nonexistent/path/to/nowhere"] });
  const caps = readSkillCapabilities(config);
  assert.deepEqual(caps, []);
});
