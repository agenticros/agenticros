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
import { upsertAgenticrosMcpJson, buildAgenticrosMcpServerEntry } from "../util/claude-config.js";

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
    assert.equal(next.split(EMBODIMENT_BEGIN).length, 2);
  });

  it("writes the block into an existing instruction file", () => {
    const dir = mkdtempSync(join(tmpdir(), "agenticros-embodiment-"));
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
    assert.ok(parsed.permissions.allow.includes("mcp__agenticros__*"));
  });

  it("mcp shell uses the Zenoh wrapper when it exists", () => {
    const wrapper = join(mkdtempSync(join(tmpdir(), "agenticros-wrapper-")), "with-ros.sh");
    writeFileSync(wrapper, "#!/bin/sh\n");
    const previous = process.env["AGENTICROS_ROS_WRAPPER"];
    process.env["AGENTICROS_ROS_WRAPPER"] = wrapper;
    try {
      const line = mcpShellLine("/opt/agenticros/mcp.js");
      assert.match(line, new RegExp(wrapper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(line, /node \/opt\/agenticros\/mcp\.js/);
      assert.match(line, /rmw_zenoh_cpp|2>>\/tmp\/agenticros-mcp\.log/);
    } finally {
      if (previous === undefined) delete process.env["AGENTICROS_ROS_WRAPPER"];
      else process.env["AGENTICROS_ROS_WRAPPER"] = previous;
    }
  });

  it("cursor mcp json keeps other servers", () => {
    const entry = buildAgenticrosMcpServerEntry("/opt/agenticros/mcp.js", "");
    const merged = upsertAgenticrosMcpJson(
      JSON.stringify({ mcpServers: { other: { command: "echo" } } }),
      entry,
    );
    const parsed = JSON.parse(merged) as { mcpServers: Record<string, { command?: string }> };
    assert.equal(parsed.mcpServers["other"]?.command, "echo");
    assert.ok(parsed.mcpServers["agenticros"]);
  });
});
