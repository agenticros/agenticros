import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeSkillSlug,
  normalizeTemplate,
  scaffoldSkill,
  slugToToolName,
  hashSkillSource,
} from "../util/skill-scaffold.js";
import {
  isValidSlug,
  parseMarketplaceRef,
  validateManifest,
  ManifestError,
  marketplaceRef,
  firestoreDocId,
} from "../util/skill-manifest.js";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("skill-scaffold", () => {
  it("normalizes slugs", () => {
    assert.equal(normalizeSkillSlug("Hello-World"), "hello-world");
    assert.equal(slugToToolName("hello-world"), "hello_world");
  });

  it("rejects invalid slugs", () => {
    assert.throws(() => normalizeSkillSlug("a"), /kebab-case/);
  });

  it("normalizes templates", () => {
    assert.equal(normalizeTemplate("robot"), "robot");
    assert.throws(() => normalizeTemplate("invalid"));
  });

  it("scaffolds hello template into temp dir", () => {
    const parent = mkdtempSync(join(tmpdir(), "agenticros-skill-"));
    try {
      const result = scaffoldSkill({
        slug: "test-hello",
        template: "hello",
        cwd: parent,
      });
      assert.equal(result.slug, "test-hello");
      assert.ok(existsSync(join(result.dir, "package.json")));
      assert.ok(existsSync(join(result.dir, "src", "index.ts")));
      assert.ok(existsSync(join(result.dir, "demo.md")));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("hashes source consistently", () => {
    const a = hashSkillSource("hello\nworld");
    const b = hashSkillSource("hello world");
    assert.equal(a, b);
  });
});

describe("skill-manifest", () => {
  it("validates minimal manifest", () => {
    const { block, warnings } = validateManifest({
      name: "agenticros-skill-x",
      version: "0.1.0",
      main: "dist/index.js",
      agenticros: {
        id: "test-skill",
        capabilities: [{ id: "t", verb: "run", description: "d" }],
      },
    });
    assert.equal(block.id, "test-skill");
    assert.ok(warnings.length > 0);
  });

  it("rejects missing agenticros block", () => {
    assert.throws(
      () =>
        validateManifest({
          name: "x",
          version: "0.1.0",
          main: "dist/index.js",
        }),
      ManifestError,
    );
  });

  it("parses marketplace refs", () => {
    assert.deepEqual(parseMarketplaceRef("chrismatthieu/follow-me"), {
      owner: "chrismatthieu",
      skill: "follow-me",
    });
    assert.equal(parseMarketplaceRef("bad"), null);
  });

  it("builds firestore doc ids", () => {
    assert.equal(firestoreDocId("Chris", "follow-me"), "chris__follow-me");
    assert.equal(marketplaceRef("chris", "follow-me"), "chris/follow-me");
  });

  it("validates slug shape", () => {
    assert.ok(isValidSlug("hello-world"));
    assert.ok(!isValidSlug("Hello"));
  });
});
