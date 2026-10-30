import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildGrokDoctorChecks, buildMcpDoctorChecks, resolveMcpHosts } from "../util/mcp-setup.js";

describe("mcp-setup", () => {
  it("resolveMcpHosts defaults to all four hosts", () => {
    assert.deepEqual(resolveMcpHosts({}), ["codex", "hermes", "claude", "agy"]);
  });

  it("resolveMcpHosts honors explicit host flags", () => {
    assert.deepEqual(resolveMcpHosts({ codex: true, hermes: false, claude: false }), ["codex"]);
    assert.deepEqual(resolveMcpHosts({ hermes: true }), ["hermes"]);
    assert.deepEqual(resolveMcpHosts({ claude: true }), ["claude"]);
    assert.deepEqual(resolveMcpHosts({ agy: true }), ["agy"]);
    assert.deepEqual(resolveMcpHosts({ cursor: true }), ["cursor"]);
    assert.deepEqual(resolveMcpHosts({ grok: true }), ["grok"]);
    assert.deepEqual(resolveMcpHosts({ openclaw: true }), ["openclaw"]);
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
    const grokOnly = buildMcpDoctorChecks("/abs/index.js", "/repo", ["grok"]);
    assert.ok(grokOnly.length > 0);
    assert.ok(grokOnly.every((c) => c.id.startsWith("grok")));
  });

  it("buildGrokDoctorChecks flags a relative MCP path", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-grok-doctor-"));
    const configPath = join(dir, "config.toml");
    const instructionPath = join(dir, "AGENTS.md");
    writeFileSync(
      configPath,
      '[mcp_servers.synapse]\ncommand = "sh"\nargs = ["-c", "node packages/mcp.js"]\n',
    );
    writeFileSync(instructionPath, "<!-- synapse-embodiment -->\nbody\n<!-- /synapse-embodiment -->\n");
    const checks = buildGrokDoctorChecks("/opt/synapse/mcp.js", { configPath, instructionPath });
    const config = checks.find((c) => c.id === "grok-config");
    const instructions = checks.find((c) => c.id === "grok-instructions");
    assert.equal(config?.severity, "red");
    assert.equal(instructions?.severity, "green");
  });
});
