import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildAgenticrosMcpYamlBlock,
  readHermesAgenticrosConfig,
  upsertAgenticrosBlock,
  validateHermesAgenticrosConfig,
} from "../util/hermes-config.js";

describe("hermes-config", () => {
  it("buildAgenticrosMcpYamlBlock uses absolute path and empty namespace", () => {
    const block = buildAgenticrosMcpYamlBlock("/opt/agenticros/dist/index.js");
    assert.match(block, /args: \["\/opt\/agenticros\/dist\/index.js"\]/);
    assert.match(block, /AGENTICROS_ROBOT_NAMESPACE: ""/);
    assert.match(block, /connect_timeout: 60/);
    assert.match(block, /timeout: 120/);
  });

  it("upsertAgenticrosBlock replaces existing agenticros section", () => {
    const existing = `llm:
  provider: openrouter

mcp_servers:
  other:
    command: "echo"
  agenticros:
    command: "node"
    args: ["relative/path.js"]
    env:
      AGENTICROS_ROBOT_NAMESPACE: "robot123"
`;
    const block = buildAgenticrosMcpYamlBlock("/abs/index.js");
    const merged = upsertAgenticrosBlock(existing, block);
    assert.match(merged, /llm:/);
    assert.match(merged, /other:/);
    assert.match(merged, /\/abs\/index.js/);
    assert.doesNotMatch(merged, /relative\/path\.js/);
    assert.match(merged, /AGENTICROS_ROBOT_NAMESPACE: ""/);
  });

  it("upsertAgenticrosBlock appends mcp_servers when missing", () => {
    const existing = "llm:\n  provider: ollama\n";
    const block = buildAgenticrosMcpYamlBlock("/abs/index.js");
    const merged = upsertAgenticrosBlock(existing, block);
    assert.match(merged, /mcp_servers:/);
    assert.match(merged, /\/abs\/index.js/);
  });

  it("readHermesAgenticrosConfig parses stdio args and env", () => {
    const dir = mkdtempSync(join(tmpdir(), "agenticros-hermes-"));
    const path = join(dir, "config.yaml");
    writeFileSync(
      path,
      `mcp_servers:
  agenticros:
    command: "node"
    args: ["/tmp/index.js"]
    env:
      AGENTICROS_ROBOT_NAMESPACE: ""
    connect_timeout: 60
    timeout: 120
`,
    );
    const cfg = readHermesAgenticrosConfig(path);
    assert.equal(cfg.command, "node");
    assert.deepEqual(cfg.args, ["/tmp/index.js"]);
    assert.equal(cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"], "");
    assert.equal(cfg.connectTimeout, 60);
    assert.equal(cfg.timeout, 120);
  });

  it("validateHermesAgenticrosConfig flags relative paths and hardcoded namespace", () => {
    const cfg = {
      configPath: "/tmp/config.yaml",
      exists: true,
      command: "node",
      args: ["packages/agenticros-claude-code/dist/index.js"],
      env: { AGENTICROS_ROBOT_NAMESPACE: "robotabc" },
    };
    const v = validateHermesAgenticrosConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => i.message.includes("relative")));
    assert.ok(v.issues.some((i) => i.message.includes("hardcoded")));
  });

  it("validateHermesAgenticrosConfig passes for correct absolute config", () => {
    const cfg = {
      configPath: "/tmp/config.yaml",
      exists: true,
      command: "node",
      args: ["/abs/index.js"],
      env: { AGENTICROS_ROBOT_NAMESPACE: "" },
    };
    const v = validateHermesAgenticrosConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, true);
    assert.equal(v.issues.length, 0);
  });
});
