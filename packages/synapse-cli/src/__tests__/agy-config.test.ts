import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildAgyMcpServerEntry,
  generateAgySkillContent,
  AGY_MCP_ALLOW_RULE,
  agySettingsAllowsMcp,
  readAgySynapseConfig,
  upsertAgyMcpAllowRule,
  upsertAgyMcpJson,
  validateAgySynapseConfig,
  writeAgySynapseConfig,
  writeAgyMcpAllowRule,
  writeAgySkill,
} from "../util/agy-config.js";

describe("agy-config", () => {
  it("buildAgyMcpServerEntry uses this Node binary, an absolute path, and an empty namespace", () => {
    const entry = buildAgyMcpServerEntry("/opt/synapse/dist/index.js");
    assert.equal(entry["command"], process.execPath);
    assert.deepEqual(entry["args"], ["/opt/synapse/dist/index.js"]);
    const env = entry["env"] as Record<string, string>;
    assert.equal(env["SYNAPSE_ROBOT_NAMESPACE"], "");
  });

  it("upsertAgyMcpJson preserves other servers and replaces synapse", () => {
    const existing = JSON.stringify(
      {
        mcpServers: {
          other: { command: "echo", args: ["hi"] },
          synapse: {
            command: "node",
            args: ["relative/path.js"],
            env: { SYNAPSE_ROBOT_NAMESPACE: "robot123" },
          },
        },
      },
      null,
      2,
    );
    const merged = upsertAgyMcpJson(existing, buildAgyMcpServerEntry("/abs/index.js"));
    const parsed = JSON.parse(merged) as {
      mcpServers: {
        other: { command: string };
        synapse: { command: string; args: string[]; env: Record<string, string> };
      };
    };
    assert.equal(parsed.mcpServers.other.command, "echo");
    assert.deepEqual(parsed.mcpServers.synapse.args, ["/abs/index.js"]);
    assert.equal(parsed.mcpServers.synapse.env["SYNAPSE_ROBOT_NAMESPACE"], "");
    assert.equal(parsed.mcpServers.synapse.command, process.execPath);
  });

  it("writeAgySynapseConfig round-trips an empty namespace", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-agy-"));
    const path = join(dir, "mcp_config.json");
    writeFileSync(
      path,
      JSON.stringify({ mcpServers: { other: { command: "echo" } } }),
    );
    writeAgySynapseConfig(path, "/abs/index.js");
    const cfg = readAgySynapseConfig(path);
    assert.equal(cfg.command, process.execPath);
    assert.deepEqual(cfg.args, ["/abs/index.js"]);
    assert.equal(cfg.env?.["SYNAPSE_ROBOT_NAMESPACE"], "");
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      mcpServers: { other?: { command: string } };
    };
    assert.equal(raw.mcpServers.other?.command, "echo");
  });

  it("validateAgySynapseConfig flags a relative path and a pinned namespace", () => {
    const cfg = {
      configPath: "/tmp/mcp_config.json",
      exists: true,
      command: process.execPath,
      args: ["packages/synapse-claude-code/dist/index.js"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "robotabc" },
    };
    const validation = validateAgySynapseConfig(cfg, "/abs/index.js");
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((issue) => issue.severity === "red" && issue.message.includes("relative")));
    assert.ok(validation.issues.some((issue) => issue.severity === "red" && issue.message.includes("hardcoded")));
  });

  it("validateAgySynapseConfig passes for a matching absolute config", () => {
    const cfg = {
      configPath: "/tmp/mcp_config.json",
      exists: true,
      command: process.execPath,
      args: ["/abs/index.js"],
      env: { SYNAPSE_ROBOT_NAMESPACE: "" },
    };
    const validation = validateAgySynapseConfig(cfg, "/abs/index.js");
    assert.equal(validation.ok, true);
    assert.equal(validation.issues.length, 0);
  });

  it("writeAgySkill writes a short skill that points at MCP tools", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-agy-skill-"));
    const path = join(dir, "SKILL.md");
    writeAgySkill(path);
    const content = readFileSync(path, "utf8");
    assert.equal(content, generateAgySkillContent());
    assert.match(content, /^---\nname: synapse\n/);
    assert.match(content, /description: Control a ROS 2 robot/);
    assert.match(content, /ros2_estop/);
    assert.doesNotMatch(content, /ros2_list_topics/);
  });

  it("upsertAgyMcpAllowRule adds the MCP allow rule and keeps other settings", () => {
    const existing = JSON.stringify({
      permissions: {
        allow: ["command(git)"],
        deny: ["command(sudo)"],
      },
      theme: "dark",
    });
    const merged = JSON.parse(upsertAgyMcpAllowRule(existing)) as {
      theme: string;
      permissions: { allow: string[]; deny: string[] };
    };
    assert.equal(merged.theme, "dark");
    assert.deepEqual(merged.permissions.deny, ["command(sudo)"]);
    assert.deepEqual(merged.permissions.allow, ["command(git)", AGY_MCP_ALLOW_RULE]);

    const again = JSON.parse(upsertAgyMcpAllowRule(JSON.stringify(merged))) as {
      permissions: { allow: string[] };
    };
    assert.deepEqual(again.permissions.allow, ["command(git)", AGY_MCP_ALLOW_RULE]);
  });

  it("writeAgyMcpAllowRule creates settings.json that headless agy can use", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-agy-settings-"));
    const path = join(dir, "settings.json");
    assert.equal(agySettingsAllowsMcp(path), false);
    writeAgyMcpAllowRule(path);
    assert.equal(agySettingsAllowsMcp(path), true);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      permissions: { allow: string[] };
    };
    assert.deepEqual(parsed.permissions.allow, [AGY_MCP_ALLOW_RULE]);
  });
});
