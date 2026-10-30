import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildSynapseMcpTomlBlock,
  readCodexSynapseConfig,
  upsertSynapseBlock,
  validateCodexSynapseConfig,
} from "../util/codex-config.js";

describe("codex-config", () => {
  it("buildSynapseMcpTomlBlock uses absolute path and empty namespace", () => {
    const block = buildSynapseMcpTomlBlock("/opt/synapse/dist/index.js");
    assert.match(block, /node \/opt\/synapse\/dist\/index.js/);
    assert.match(block, /SYNAPSE_ROBOT_NAMESPACE = ""/);
    assert.match(block, /startup_timeout_sec = 30/);
  });

  it("upsertSynapseBlock replaces existing synapse section", () => {
    const existing = `[mcp_servers.other]
command = "echo"

[mcp_servers.synapse]
command = "node"
args = ["relative/path.js"]

[mcp_servers.synapse.env]
SYNAPSE_ROBOT_NAMESPACE = "robot123"
`;
    const block = buildSynapseMcpTomlBlock("/abs/index.js");
    const merged = upsertSynapseBlock(existing, block);
    assert.match(merged, /\[mcp_servers.other\]/);
    assert.match(merged, /\/abs\/index.js/);
    assert.doesNotMatch(merged, /relative\/path\.js/);
    assert.match(merged, /SYNAPSE_ROBOT_NAMESPACE = ""/);
  });

  it("readCodexSynapseConfig parses sh -c args", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-codex-"));
    const path = join(dir, "config.toml");
    writeFileSync(
      path,
      `[mcp_servers.synapse]
command = "sh"
args = ["-c", "node /tmp/index.js 2>>/tmp/synapse-mcp.log"]
enabled = true

[mcp_servers.synapse.env]
SYNAPSE_ROBOT_NAMESPACE = ""
`,
    );
    const cfg = readCodexSynapseConfig(path);
    assert.equal(cfg.command, "sh");
    assert.deepEqual(cfg.args, ["-c", "node /tmp/index.js 2>>/tmp/synapse-mcp.log"]);
    assert.equal(cfg.env?.["SYNAPSE_ROBOT_NAMESPACE"], "");
    assert.equal(cfg.enabled, true);
  });

  it("validateCodexSynapseConfig flags relative paths and hardcoded namespace", () => {
    const cfg = {
      configPath: "/tmp/config.toml",
      exists: true,
      command: "sh",
      args: ["-c", "node packages/synapse-claude-code/dist/index.js"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "robotabc" },
    };
    const v = validateCodexSynapseConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => i.message.includes("relative")));
    assert.ok(v.issues.some((i) => i.message.includes("hardcoded")));
  });

  it("validateCodexSynapseConfig passes for correct absolute config", () => {
    const cfg = {
      configPath: "/tmp/config.toml",
      exists: true,
      command: "sh",
      args: ["-c", "node /abs/index.js 2>>/tmp/synapse-mcp.log"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "" },
      enabled: true,
    };
    const v = validateCodexSynapseConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, true);
    assert.equal(v.issues.length, 0);
  });
});
