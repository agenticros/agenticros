import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildSynapseMcpYamlBlock,
  readHermesSynapseConfig,
  upsertSynapseBlock,
  validateHermesSynapseConfig,
} from "../util/hermes-config.js";

describe("hermes-config", () => {
  it("buildSynapseMcpYamlBlock uses absolute path and empty namespace", () => {
    const block = buildSynapseMcpYamlBlock("/opt/synapse/dist/index.js");
    assert.match(block, /args: \["\/opt\/synapse\/dist\/index.js"\]/);
    assert.match(block, /SYNAPSE_ROBOT_NAMESPACE: ""/);
    assert.match(block, /connect_timeout: 60/);
    assert.match(block, /timeout: 120/);
  });

  it("upsertSynapseBlock replaces existing synapse section", () => {
    const existing = `llm:
  provider: openrouter

mcp_servers:
  other:
    command: "echo"
  synapse:
    command: "node"
    args: ["relative/path.js"]
    env:
      SYNAPSE_ROBOT_NAMESPACE: "robot123"
`;
    const block = buildSynapseMcpYamlBlock("/abs/index.js");
    const merged = upsertSynapseBlock(existing, block);
    assert.match(merged, /llm:/);
    assert.match(merged, /other:/);
    assert.match(merged, /\/abs\/index.js/);
    assert.doesNotMatch(merged, /relative\/path\.js/);
    assert.match(merged, /SYNAPSE_ROBOT_NAMESPACE: ""/);
  });

  it("upsertSynapseBlock appends mcp_servers when missing", () => {
    const existing = "llm:\n  provider: ollama\n";
    const block = buildSynapseMcpYamlBlock("/abs/index.js");
    const merged = upsertSynapseBlock(existing, block);
    assert.match(merged, /mcp_servers:/);
    assert.match(merged, /\/abs\/index.js/);
  });

  it("readHermesSynapseConfig parses stdio args and env", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-hermes-"));
    const path = join(dir, "config.yaml");
    writeFileSync(
      path,
      `mcp_servers:
  synapse:
    command: "node"
    args: ["/tmp/index.js"]
    env:
      SYNAPSE_ROBOT_NAMESPACE: ""
    connect_timeout: 60
    timeout: 120
`,
    );
    const cfg = readHermesSynapseConfig(path);
    assert.equal(cfg.command, "node");
    assert.deepEqual(cfg.args, ["/tmp/index.js"]);
    assert.equal(cfg.env?.["SYNAPSE_ROBOT_NAMESPACE"], "");
    assert.equal(cfg.connectTimeout, 60);
    assert.equal(cfg.timeout, 120);
  });

  it("validateHermesSynapseConfig flags relative paths and hardcoded namespace", () => {
    const cfg = {
      configPath: "/tmp/config.yaml",
      exists: true,
      command: "node",
      args: ["packages/synapse-claude-code/dist/index.js"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "robotabc" },
    };
    const v = validateHermesSynapseConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => i.message.includes("relative")));
    assert.ok(v.issues.some((i) => i.message.includes("hardcoded")));
  });

  it("validateHermesSynapseConfig passes for correct absolute config", () => {
    const cfg = {
      configPath: "/tmp/config.yaml",
      exists: true,
      command: "node",
      args: ["/abs/index.js"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "" },
    };
    const v = validateHermesSynapseConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, true);
    assert.equal(v.issues.length, 0);
  });
});
