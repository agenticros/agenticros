import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildAgenticrosMcpTomlBlock,
  readCodexAgenticrosConfig,
  upsertAgenticrosBlock,
  validateCodexAgenticrosConfig,
} from "../util/codex-config.js";

describe("codex-config", () => {
  it("buildAgenticrosMcpTomlBlock uses absolute path and empty namespace", () => {
    const block = buildAgenticrosMcpTomlBlock("/opt/agenticros/dist/index.js");
    assert.match(block, /node \/opt\/agenticros\/dist\/index.js/);
    assert.match(block, /AGENTICROS_ROBOT_NAMESPACE = ""/);
    assert.match(block, /startup_timeout_sec = 30/);
  });

  it("upsertAgenticrosBlock replaces existing agenticros section", () => {
    const existing = `[mcp_servers.other]
command = "echo"

[mcp_servers.agenticros]
command = "node"
args = ["relative/path.js"]

[mcp_servers.agenticros.env]
AGENTICROS_ROBOT_NAMESPACE = "robot123"
`;
    const block = buildAgenticrosMcpTomlBlock("/abs/index.js");
    const merged = upsertAgenticrosBlock(existing, block);
    assert.match(merged, /\[mcp_servers.other\]/);
    assert.match(merged, /\/abs\/index.js/);
    assert.doesNotMatch(merged, /relative\/path\.js/);
    assert.match(merged, /AGENTICROS_ROBOT_NAMESPACE = ""/);
  });

  it("readCodexAgenticrosConfig parses sh -c args", () => {
    const dir = mkdtempSync(join(tmpdir(), "agenticros-codex-"));
    const path = join(dir, "config.toml");
    writeFileSync(
      path,
      `[mcp_servers.agenticros]
command = "sh"
args = ["-c", "node /tmp/index.js 2>>/tmp/agenticros-mcp.log"]
enabled = true

[mcp_servers.agenticros.env]
AGENTICROS_ROBOT_NAMESPACE = ""
`,
    );
    const cfg = readCodexAgenticrosConfig(path);
    assert.equal(cfg.command, "sh");
    assert.deepEqual(cfg.args, ["-c", "node /tmp/index.js 2>>/tmp/agenticros-mcp.log"]);
    assert.equal(cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"], "");
    assert.equal(cfg.enabled, true);
  });

  it("validateCodexAgenticrosConfig flags relative paths and hardcoded namespace", () => {
    const cfg = {
      configPath: "/tmp/config.toml",
      exists: true,
      command: "sh",
      args: ["-c", "node packages/agenticros-claude-code/dist/index.js"],
      env: { AGENTICROS_ROBOT_NAMESPACE: "robotabc" },
    };
    const v = validateCodexAgenticrosConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => i.message.includes("relative")));
    assert.ok(v.issues.some((i) => i.message.includes("hardcoded")));
  });

  it("validateCodexAgenticrosConfig passes for correct absolute config", () => {
    const cfg = {
      configPath: "/tmp/config.toml",
      exists: true,
      command: "sh",
      args: ["-c", "node /abs/index.js 2>>/tmp/agenticros-mcp.log"],
      env: { AGENTICROS_ROBOT_NAMESPACE: "" },
      enabled: true,
    };
    const v = validateCodexAgenticrosConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, true);
    assert.equal(v.issues.length, 0);
  });
});
