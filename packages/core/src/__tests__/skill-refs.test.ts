/**
 * Unit tests for skillRefs parsing and discoverable capability merge.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSkillRef,
  parseConfig,
  listCapabilitiesWithDiscoverable,
  listAllCapabilities,
} from "../index.js";

test("parseSkillRef: owner/skill and @pin", () => {
  assert.deepEqual(parseSkillRef("agenticros/navigate-to"), {
    kind: "marketplace",
    marketplaceRef: "agenticros/navigate-to",
    owner: "agenticros",
    skill: "navigate-to",
    gitRef: "main",
  });
  assert.equal(parseSkillRef("agenticros/start-slam@v0.1.0")?.gitRef, "v0.1.0");
  assert.equal(parseSkillRef("nope"), null);
  assert.equal(parseSkillRef(""), null);
});

test("parseSkillRef: npm scoped package", () => {
  assert.deepEqual(parseSkillRef("@agenticros-skills/navigate-to"), {
    kind: "npm",
    npmPackage: "@agenticros-skills/navigate-to",
    npmVersion: undefined,
  });
  assert.deepEqual(parseSkillRef("@agenticros-skills/find@^0.2.0"), {
    kind: "npm",
    npmPackage: "@agenticros-skills/find",
    npmVersion: "^0.2.0",
  });
});

test("parseConfig: skillRefs defaults to []", () => {
  const cfg = parseConfig({});
  assert.deepEqual(cfg.skillRefs, []);
  const cfg2 = parseConfig({ skillRefs: ["agenticros/detect-humans"] });
  assert.deepEqual(cfg2.skillRefs, ["agenticros/detect-humans"]);
});

test("listCapabilitiesWithDiscoverable: soft-fail offline keeps installed", async () => {
  const cfg = parseConfig({});
  const caps = await listCapabilitiesWithDiscoverable(cfg, {
    apiBase: "http://127.0.0.1:9", // nothing listening
    softFail: true,
  });
  const baseline = listAllCapabilities(cfg);
  assert.equal(caps.length, baseline.length);
  assert.ok(caps.every((c) => c.installed !== false || c.discoverable !== true));
});

test("listCapabilitiesWithDiscoverable: merges marketplace caps when fetch works", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        skills: [
          {
            marketplaceRef: "agenticros/detect-humans",
            visibility: "public",
            capabilities: [
              {
                id: "detect_humans",
                verb: "detect",
                description: "Read detections",
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const cfg = parseConfig({});
    const caps = await listCapabilitiesWithDiscoverable(cfg, { softFail: false });
    const det = caps.find((c) => c.id === "detect_humans");
    assert.ok(det);
    assert.equal(det!.discoverable, true);
    assert.equal(det!.installed, false);
    assert.equal(det!.install_ref, "agenticros/detect-humans");
    assert.ok(caps.some((c) => c.id === "drive_base" && c.installed === true));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
