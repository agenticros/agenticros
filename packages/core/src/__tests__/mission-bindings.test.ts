/**
 * Unit tests for buildMissionBindings — Phase 1 dynamic bindings.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILTIN_MISSION_BINDINGS,
  buildMissionBindings,
  defaultToolForCapability,
  externalToolName,
  isExternalToolName,
} from "../mission-bindings.js";
import type { Capability } from "../capabilities.js";

test("buildMissionBindings includes all builtins", () => {
  const bindings = buildMissionBindings([]);
  for (const id of Object.keys(BUILTIN_MISSION_BINDINGS)) {
    assert.ok(bindings[id], `missing builtin binding ${id}`);
  }
});

test("buildMissionBindings derives ros2_<id> for skill capabilities", () => {
  const caps: Capability[] = [
    {
      id: "wave_hand",
      verb: "wave",
      description: "Wave",
      source: { kind: "skill", skillId: "wave", package: "agenticros-skill-wave" },
    },
  ];
  const bindings = buildMissionBindings(caps);
  assert.equal(bindings.wave_hand.tool, "ros2_wave_hand");
  assert.deepEqual(bindings.wave_hand.buildArgs({ a: 1 }), { a: 1 });
});

test("buildMissionBindings uses external: prefix for external_ros_node", () => {
  const caps: Capability[] = [
    {
      id: "navigate_to",
      verb: "navigate",
      description: "Nav2",
      implementation: {
        kind: "external_ros_node",
        action: "navigate_to_pose",
        msg_type: "nav2_msgs/action/NavigateToPose",
      },
      source: { kind: "skill", skillId: "navigate", package: "navigate-to" },
    },
  ];
  const bindings = buildMissionBindings(caps);
  assert.equal(bindings.navigate_to.tool, externalToolName("navigate_to"));
  assert.ok(isExternalToolName(bindings.navigate_to.tool));
});

test("buildMissionBindings respects toolNameResolver", () => {
  const caps: Capability[] = [
    {
      id: "custom_cap",
      verb: "custom",
      description: "Custom",
      source: { kind: "skill", skillId: "c", package: "c" },
    },
  ];
  const bindings = buildMissionBindings(caps, {
    toolNameResolver: (cap) => (cap.id === "custom_cap" ? "my_custom_tool" : undefined),
  });
  assert.equal(bindings.custom_cap.tool, "my_custom_tool");
});

test("defaultToolForCapability prefers explicit tool field", () => {
  assert.equal(
    defaultToolForCapability({
      id: "x",
      verb: "x",
      description: "x",
      tool: "ros2_special",
    }),
    "ros2_special",
  );
});

test("extra bindings win over derived", () => {
  const caps: Capability[] = [
    {
      id: "wave_hand",
      verb: "wave",
      description: "Wave",
      source: { kind: "skill", skillId: "wave", package: "w" },
    },
  ];
  const bindings = buildMissionBindings(caps, {
    extra: {
      wave_hand: {
        tool: "override_tool",
        buildArgs: () => ({ overridden: true }),
      },
    },
  });
  assert.equal(bindings.wave_hand.tool, "override_tool");
});
