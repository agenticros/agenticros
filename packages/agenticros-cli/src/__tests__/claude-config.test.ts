import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildAgenticrosMcpServerEntry,
  readClaudeAgenticrosConfig,
  upsertAgenticrosMcpJson,
  validateClaudeAgenticrosConfig,
} from "../util/claude-config.js";

describe("claude-config", () => {
  it("buildAgenticrosMcpServerEntry uses sh -c wrapper and empty namespace", () => {
    const entry = buildAgenticrosMcpServerEntry("/opt/agenticros/dist/index.js");
    assert.equal(entry["type"], "stdio");
    assert.equal(entry["command"], "sh");
    assert.deepEqual(entry["args"], [
      "-c",
      "node /opt/agenticros/dist/index.js 2>>/tmp/agenticros-mcp.log",
    ]);
    assert.deepEqual(entry["env"], { AGENTICROS_ROBOT_NAMESPACE: "" });
  });

  it("upsertAgenticrosMcpJson preserves other servers", () => {
    const existing = JSON.stringify({
      mcpServers: {
        other: { type: "stdio", command: "echo" },
        agenticros: { type: "stdio", command: "node", args: ["old.js"] },
      },
    });
    const entry = buildAgenticrosMcpServerEntry("/abs/index.js");
    const merged = upsertAgenticrosMcpJson(existing, entry);
    const parsed = JSON.parse(merged) as { mcpServers: Record<string, unknown> };
    assert.ok(parsed.mcpServers.other);
    assert.match(JSON.stringify(parsed.mcpServers.agenticros), /\/abs\/index.js/);
  });

  it("readClaudeAgenticrosConfig parses sh -c args", () => {
    const dir = mkdtempSync(join(tmpdir(), "agenticros-claude-"));
    const path = join(dir, ".mcp.json");
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: {
          agenticros: {
            type: "stdio",
            command: "sh",
            args: ["-c", "node /tmp/index.js 2>>/tmp/agenticros-mcp.log"],
            env: { AGENTICROS_ROBOT_NAMESPACE: "" },
          },
        },
      }),
    );
    const cfg = readClaudeAgenticrosConfig(path, "project");
    assert.equal(cfg.command, "sh");
    assert.deepEqual(cfg.args, ["-c", "node /tmp/index.js 2>>/tmp/agenticros-mcp.log"]);
    assert.equal(cfg.env?.["AGENTICROS_ROBOT_NAMESPACE"], "");
  });

  it("validateClaudeAgenticrosConfig flags relative paths and hardcoded namespace", () => {
    const cfg = {
      configPath: "/tmp/.mcp.json",
      exists: true,
      target: "project" as const,
      command: "sh",
      args: ["-c", "node packages/agenticros-claude-code/dist/index.js"],
      env: { AGENTICROS_ROBOT_NAMESPACE: "robotabc" },
    };
    const v = validateClaudeAgenticrosConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, false);
    assert.ok(v.issues.some((i) => i.message.includes("relative")));
    assert.ok(v.issues.some((i) => i.message.includes("hardcoded")));
  });

  it("validateClaudeAgenticrosConfig passes for correct absolute config", () => {
    const cfg = {
      configPath: "/tmp/.mcp.json",
      exists: true,
      target: "project" as const,
      command: "sh",
      args: ["-c", "node /abs/index.js 2>>/tmp/agenticros-mcp.log"],
      env: { AGENTICROS_ROBOT_NAMESPACE: "" },
    };
    const v = validateClaudeAgenticrosConfig(cfg, "/abs/index.js");
    assert.equal(v.ok, true);
    assert.equal(v.issues.length, 0);
  });
});
