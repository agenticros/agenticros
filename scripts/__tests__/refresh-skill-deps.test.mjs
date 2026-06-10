/**
 * Unit tests for the staleness-detection logic in refresh-skill-deps.mjs.
 *
 * The pure-function pieces (file listing + diff) are what we actually care
 * about pinning down — the spawnSync layer is integration-tested by the
 * `pnpm refresh:skills` smoke run inside `pnpm deploy:plugin`.
 *
 * Why these tests matter: today there's only one staleness-detection
 * algorithm, and if it accidentally treats "target has more files than
 * source" as stale (it should NOT), or treats unrelated files in the
 * skill's @agenticros/core as missing (it should NOT), the refresh will
 * either thrash (always reinstall) or no-op (never reinstall) — both of
 * which break the contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  listFilesRecursive,
  findMissingFiles,
  checkSkillStaleness,
  discoverSkillPaths,
} from "../refresh-skill-deps.mjs";

async function writeText(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
}

test("listFilesRecursive: empty dir returns []", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "refresh-test-"));
  try {
    const empty = path.join(root, "empty");
    await mkdir(empty);
    assert.deepEqual(listFilesRecursive(empty), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("listFilesRecursive: missing dir returns [] (no throw)", () => {
  assert.deepEqual(listFilesRecursive("/no/such/dir/ever-${process.pid}"), []);
});

test("listFilesRecursive: walks subdirs and returns relative, sorted paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "refresh-test-"));
  try {
    await writeText(path.join(root, "a.js"), "a");
    await writeText(path.join(root, "sub", "b.js"), "b");
    await writeText(path.join(root, "sub", "deep", "c.js"), "c");
    const files = listFilesRecursive(root);
    assert.deepEqual(files, ["a.js", path.join("sub", "b.js"), path.join("sub", "deep", "c.js")]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("findMissingFiles: returns source files absent from target", () => {
  const source = ["a.js", "b.js", "c.js"];
  const target = ["a.js", "c.js"];
  assert.deepEqual(findMissingFiles(source, target), ["b.js"]);
});

test("findMissingFiles: target supersets are NOT treated as missing in source", () => {
  // Skills sometimes contain extra build artifacts; that's not a cascade.
  const source = ["a.js", "b.js"];
  const target = ["a.js", "b.js", "extra.js"];
  assert.deepEqual(findMissingFiles(source, target), []);
});

test("findMissingFiles: empty source ⇒ no missing files (degenerate)", () => {
  assert.deepEqual(findMissingFiles([], ["a.js"]), []);
});

test("findMissingFiles: empty target ⇒ everything in source is missing", () => {
  assert.deepEqual(findMissingFiles(["a.js", "b.js"], []), ["a.js", "b.js"]);
});

test("checkSkillStaleness: hasCoreLink=false when skill has no @agenticros/core dep", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "refresh-test-"));
  try {
    const skill = path.join(root, "skill-no-core");
    await mkdir(skill, { recursive: true });
    const result = checkSkillStaleness(skill, { sourceCoreDist: path.join(root, "core-src") });
    assert.equal(result.hasCoreLink, false);
    assert.deepEqual(result.missingFiles, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("checkSkillStaleness: detects missing files when target lacks new source files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "refresh-test-"));
  try {
    const coreSrc = path.join(root, "core", "dist");
    await writeText(path.join(coreSrc, "index.js"), "");
    await writeText(path.join(coreSrc, "capabilities.js"), "");
    await writeText(path.join(coreSrc, "mission.js"), "");

    // Skill has a stale link — only index.js, missing capabilities.js and mission.js.
    const skill = path.join(root, "skill");
    const staleDist = path.join(skill, "node_modules", "@agenticros", "core", "dist");
    await writeText(path.join(staleDist, "index.js"), "");

    const result = checkSkillStaleness(skill, { sourceCoreDist: coreSrc });
    assert.equal(result.hasCoreLink, true);
    assert.deepEqual(result.missingFiles.sort(), ["capabilities.js", "mission.js"]);
    assert.equal(result.sourceCount, 3);
    assert.equal(result.targetCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("checkSkillStaleness: returns missingFiles=[] when target is current", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "refresh-test-"));
  try {
    const coreSrc = path.join(root, "core", "dist");
    await writeText(path.join(coreSrc, "index.js"), "");
    await writeText(path.join(coreSrc, "capabilities.js"), "");

    const skill = path.join(root, "skill");
    const dist = path.join(skill, "node_modules", "@agenticros", "core", "dist");
    await writeText(path.join(dist, "index.js"), "");
    await writeText(path.join(dist, "capabilities.js"), "");

    const result = checkSkillStaleness(skill, { sourceCoreDist: coreSrc });
    assert.equal(result.hasCoreLink, true);
    assert.deepEqual(result.missingFiles, []);
    assert.equal(result.sourceCount, 2);
    assert.equal(result.targetCount, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("checkSkillStaleness: works when the skill's @agenticros/core is a symlink (real pnpm layout)", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "refresh-test-"));
  try {
    const coreSrc = path.join(root, "core", "dist");
    await writeText(path.join(coreSrc, "index.js"), "");
    await writeText(path.join(coreSrc, "mission.js"), "");

    // Mimic the pnpm virtual store layout.
    const pnpmStore = path.join(
      root,
      "skill",
      "node_modules",
      ".pnpm",
      "@agenticros+core@file+stub",
      "node_modules",
      "@agenticros",
      "core",
    );
    await writeText(path.join(pnpmStore, "dist", "index.js"), "");
    await writeText(path.join(pnpmStore, "dist", "mission.js"), "");

    const linkParent = path.join(root, "skill", "node_modules", "@agenticros");
    await mkdir(linkParent, { recursive: true });
    await symlink(pnpmStore, path.join(linkParent, "core"));

    const result = checkSkillStaleness(path.join(root, "skill"), { sourceCoreDist: coreSrc });
    assert.equal(result.hasCoreLink, true);
    assert.deepEqual(result.missingFiles, []);
    assert.equal(result.targetCount, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("discoverSkillPaths: extraSkillPaths are picked up and absolutised", () => {
  // Inject only the extraSkillPaths and isolate from env / config files by
  // clearing the relevant env vars for the duration of the call. The
  // function also reads ~/.openclaw/openclaw.json + ~/.agenticros/config.json
  // unconditionally; we accept that those may add more entries, and just
  // assert our injected path is INCLUDED, not that it's the only one.
  const original = {
    AGENTICROS_SKILL_PATHS: process.env.AGENTICROS_SKILL_PATHS,
    OPENCLAW_CONFIG: process.env.OPENCLAW_CONFIG,
    AGENTICROS_CONFIG_PATH: process.env.AGENTICROS_CONFIG_PATH,
  };
  try {
    delete process.env.AGENTICROS_SKILL_PATHS;
    // Point OpenClaw + AgenticROS config readers at nonexistent files so
    // those branches contribute nothing during the test.
    process.env.OPENCLAW_CONFIG = "/dev/null/nonexistent.json";
    process.env.AGENTICROS_CONFIG_PATH = "/dev/null/nonexistent.json";

    const paths = discoverSkillPaths({ extraSkillPaths: ["/tmp/my-skill"] });
    assert.ok(paths.includes("/tmp/my-skill"), `expected /tmp/my-skill in discovered paths; got ${paths.join(", ")}`);
  } finally {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("discoverSkillPaths: AGENTICROS_SKILL_PATHS env var splits on ':'", () => {
  const original = process.env.AGENTICROS_SKILL_PATHS;
  const originalOpen = process.env.OPENCLAW_CONFIG;
  const originalAgenticros = process.env.AGENTICROS_CONFIG_PATH;
  try {
    process.env.OPENCLAW_CONFIG = "/dev/null/nonexistent.json";
    process.env.AGENTICROS_CONFIG_PATH = "/dev/null/nonexistent.json";
    process.env.AGENTICROS_SKILL_PATHS = "/tmp/skill-a:/tmp/skill-b";

    const paths = discoverSkillPaths();
    assert.ok(paths.includes("/tmp/skill-a"));
    assert.ok(paths.includes("/tmp/skill-b"));
  } finally {
    if (original === undefined) delete process.env.AGENTICROS_SKILL_PATHS;
    else process.env.AGENTICROS_SKILL_PATHS = original;
    if (originalOpen === undefined) delete process.env.OPENCLAW_CONFIG;
    else process.env.OPENCLAW_CONFIG = originalOpen;
    if (originalAgenticros === undefined) delete process.env.AGENTICROS_CONFIG_PATH;
    else process.env.AGENTICROS_CONFIG_PATH = originalAgenticros;
  }
});
