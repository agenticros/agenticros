/**
 * Unit tests for doctor --live binding matching (no transport).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { checkLiveBindings } from "../util/live-bindings.js";
import type { RobotEntry } from "../util/robot-config.js";

function robot(partial: Partial<RobotEntry> & Pick<RobotEntry, "id">): RobotEntry {
  return {
    namespace: "",
    ...partial,
  };
}

test("live-bindings: missing cmd_vel is red, camera type ok is green", () => {
  const amr = robot({
    id: "amr",
    namespace: "amr",
    profile: {
      schema: "agenticros.profile.v1",
      features: ["base", "camera"],
      bindings: {
        cmd_vel: "/cmd_vel",
        "camera.rgb": "/camera/color/image_raw/compressed",
      },
    },
  });
  const missing = checkLiveBindings([amr], { topics: [] });
  assert.ok(missing.some((c) => c.key === "cmd_vel" && c.severity === "red"));

  const typed = checkLiveBindings([amr], {
    topics: [
      { name: "/amr/cmd_vel", type: "geometry_msgs/msg/Twist" },
      { name: "/camera/color/image_raw/compressed", type: "sensor_msgs/msg/CompressedImage" },
    ],
  });
  assert.equal(typed.find((c) => c.key === "cmd_vel")?.severity, "green");
  assert.equal(typed.find((c) => c.key === "camera.rgb")?.severity, "green");
});
