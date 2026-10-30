import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { defaultRealRobotConfig } from "../util/default-robot-config.js";
import {
  EMBODIMENT_BEGIN,
  EMBODIMENT_END,
  cursorRuleContent,
  upsertEmbodiment,
  writeEmbodimentFile,
} from "../util/embodiment.js";
import { mcpShellLine } from "../util/mcp-launch.js";
import { upsertClaudeMcpAllowRule } from "../util/claude-config.js";
import { upsertSynapseMcpJson, buildSynapseMcpServerEntry } from "../util/claude-config.js";
import { writeCodexSynapseConfig } from "../util/codex-config.js";

describe("embodiment", () => {
  it("init --yes config is a real robot on local ROS", () => {
    const cfg = defaultRealRobotConfig();
    assert.equal(cfg.transport.mode, "local");
    assert.equal(cfg.robot.namespace, "");
    assert.equal(cfg.robot.cameraTopic, "/camera/camera/color/image_raw");
  });

  it("replaces only the sentinel block", () => {
    const existing = `Keep this note.\n\n${EMBODIMENT_BEGIN}\nold\n${EMBODIMENT_END}\n\nAnd this.`;
    const next = upsertEmbodiment(existing);
    assert.match(next, /Keep this note/);
    assert.match(next, /And this/);
    assert.match(next, /ros2_camera_snapshot/);
    assert.match(next, /ros2_install_skill/);
    assert.match(next, /ros2_create_skill/);
    assert.equal(next.split(EMBODIMENT_BEGIN).length, 2);
  });

  it("writes the block into an existing instruction file", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-embodiment-"));
    const path = join(dir, "CLAUDE.md");
    writeFileSync(path, "# Mine\n");
    writeEmbodimentFile(path);
    writeEmbodimentFile(path);
    const text = readFileSync(path, "utf8");
    assert.match(text, /^# Mine/);
    assert.equal(text.split(EMBODIMENT_BEGIN).length, 2);
    assert.match(text, new RegExp(EMBODIMENT_END));
  });

  it("cursor rule always applies", () => {
    const rule = cursorRuleContent();
    assert.match(rule, /alwaysApply: true/);
    assert.match(rule, /ros2_estop/);
  });

  it("claude allow rule keeps other permissions", () => {
    const merged = upsertClaudeMcpAllowRule(
      JSON.stringify({ permissions: { allow: ["Bash(ls)"], deny: ["Bash(rm)"] } }),
    );
    const parsed = JSON.parse(merged) as { permissions: { allow: string[]; deny: string[] } };
    assert.deepEqual(parsed.permissions.deny, ["Bash(rm)"]);
    assert.ok(parsed.permissions.allow.includes("Bash(ls)"));
    assert.ok(parsed.permissions.allow.includes("mcp__synapse__*"));
  });

  it("mcp shell uses the Zenoh wrapper when it exists", () => {
    const wrapper = join(mkdtempSync(join(tmpdir(), "synapse-wrapper-")), "with-ros.sh");
    writeFileSync(wrapper, "#!/bin/sh\n");
    const previous = process.env["SYNAPSE_ROS_WRAPPER"];
    process.env["SYNAPSE_ROS_WRAPPER"] = wrapper;
    try {
      const line = mcpShellLine("/opt/synapse/mcp.js");
      assert.match(line, new RegExp(wrapper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(line, /node \/opt\/synapse\/mcp\.js/);
      assert.match(line, /rmw_zenoh_cpp|2>>\/tmp\/synapse-mcp\.log/);
    } finally {
      if (previous === undefined) delete process.env["SYNAPSE_ROS_WRAPPER"];
      else process.env["SYNAPSE_ROS_WRAPPER"] = previous;
    }
  });

  it("grok toml keeps other sections and writes the instruction", () => {
    const dir = mkdtempSync(join(tmpdir(), "synapse-grok-"));
    const toml = join(dir, "config.toml");
    writeFileSync(toml, "[marketplace]\ndefault_skills_installs_purged = true\n");
    writeCodexSynapseConfig(toml, "/opt/synapse/mcp.js", { namespace: "" });
    const text = readFileSync(toml, "utf8");
    assert.match(text, /\[marketplace\]/);
    assert.match(text, /default_skills_installs_purged = true/);
    assert.match(text, /\[mcp_servers\.synapse\]/);
    assert.match(text, /node \/opt\/synapse\/mcp\.js/);
    const agents = join(dir, "AGENTS.md");
    writeEmbodimentFile(agents);
    const instructions = readFileSync(agents, "utf8");
    assert.match(instructions, new RegExp(EMBODIMENT_BEGIN));
    assert.match(instructions, new RegExp(EMBODIMENT_END));
  });

  it("cursor mcp json keeps other servers", () => {
    const entry = buildSynapseMcpServerEntry("/opt/synapse/mcp.js", "");
    const merged = upsertSynapseMcpJson(
      JSON.stringify({ mcpServers: { other: { command: "echo" } } }),
      entry,
    );
    const parsed = JSON.parse(merged) as { mcpServers: Record<string, { command?: string }> };
    assert.equal(parsed.mcpServers["other"]?.command, "echo");
    assert.ok(parsed.mcpServers["synapse"]);
  });
});
