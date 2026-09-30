import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildMcpDoctorChecks, resolveMcpHosts } from "../util/mcp-setup.js";

describe("mcp-setup", () => {
  it("resolveMcpHosts defaults to all four hosts", () => {
    assert.deepEqual(resolveMcpHosts({}), ["codex", "hermes", "claude", "agy"]);
  });

  it("resolveMcpHosts honors explicit host flags", () => {
    assert.deepEqual(resolveMcpHosts({ codex: true, hermes: false, claude: false }), ["codex"]);
    assert.deepEqual(resolveMcpHosts({ hermes: true }), ["hermes"]);
    assert.deepEqual(resolveMcpHosts({ claude: true }), ["claude"]);
    assert.deepEqual(resolveMcpHosts({ agy: true }), ["agy"]);
  });

  it("resolveMcpHosts uses project scope for legacy codex setup", () => {
    assert.deepEqual(resolveMcpHosts({ codexScope: "project" }), ["codex"]);
  });

  it("buildMcpDoctorChecks filters by host", () => {
    const all = buildMcpDoctorChecks("/abs/index.js", "/repo");
    const codexOnly = buildMcpDoctorChecks("/abs/index.js", "/repo", ["codex"]);
    const agyOnly = buildMcpDoctorChecks("/abs/index.js", "/repo", ["agy"]);
    assert.ok(all.length > codexOnly.length);
    assert.ok(codexOnly.every((c) => c.id.startsWith("codex")));
    assert.ok(agyOnly.length > 0);
    assert.ok(agyOnly.every((c) => c.id.startsWith("agy")));
  });
});
