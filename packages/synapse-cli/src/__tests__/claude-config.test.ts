import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildSynapseMcpServerEntry,
  readClaudeSynapseConfig,
  upsertSynapseMcpJson,
  validateClaudeSynapseConfig,
} from "../util/claude-config.js";

describe("claude-config", () => {
  it("buildSynapseMcpServerEntry uses sh -c wrapper and empty namespace", () => {
    const entry = buildSynapseMcpServerEntry("/opt/synapse/dist/index.js");
    assert.equal(entry["type"], "stdio");
    assert.equal(entry["command"], "sh");
    assert.deepEqual(entry["args"], [
      "-c",
      "node /opt/synapse/dist/index.js 2>>/tmp/synapse-mcp.log",
    ]);
    assert.deepEqual(entry["env"], { SYNAPSE_ROBOT_NAMESPACE: "" });
  });

  it("upsertSynapseMcpJson preserves other servers", () => {
    const existing = JSON.stringify({
      mcpServers: {
        other: { type: "stdio", command: "echo" },
        synapse: { type: "stdio", command: "node", args: ["old.js"] },
      },
    });
    const entry = buildSynapseMcpServerEntry("/abs/index.js");
    const merged = upsertSynapseMcpJson(existing, entry);
    const parsed = JSON.parse(merged) as { mcpServers: Record<string, unknown> };
    assert.ok(parsed.mcpServers.other);
    assert.match(JSON.stringify(parsed.mcpServers.synapse), /\/abs\/index.js/);
  });

  it("readClaudeSynapseConfig parses sh -c args", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-claude-"));
    const path = join(dir, ".mcp.json");
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: {
          synapse: {
            type: "stdio",
            command: "sh",
            args: ["-c", "node /tmp/index.js 2>>/tmp/synapse-mcp.log"],
            env: { SYNAPSE_ROBOT_NAMESPACE: "" },
          },
        },
      }),
    );
    const cfg = readClaudeSynapseConfig(path, "project");
    assert.equal(cfg.command, "sh");
    assert.deepEqual(cfg.args, ["-c", "node /tmp/index.js 2>>/tmp/synapse-mcp.log"]);
    assert.equal(cfg.env?.["SYNAPSE_ROBOT_NAMESPACE"], "");
  });

  it("validateClaudeSynapseConfig flags relative paths and hardcoded namespace", () => {
    const cfg = {
      configPath: "/tmp/.mcp.json",
      exists: true,
      target: "project" as const,
      command: "sh",
      args: ["-c", "node packages/synapse-claude-code/dist/index.js"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "robotabc" },
    };
    const v = validateClaudeSynapseConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => i.message.includes("relative")));
    assert.ok(v.issues.some((i) => i.message.includes("hardcoded")));
  });

  it("validateClaudeSynapseConfig passes for correct absolute config", () => {
    const cfg = {
      configPath: "/tmp/.mcp.json",
      exists: true,
      target: "project" as const,
      command: "sh",
      args: ["-c", "node /abs/index.js 2>>/tmp/synapse-mcp.log"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "" },
    };
    const v = validateClaudeSynapseConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, true);
    assert.equal(v.issues.length, 0);
  });
});
