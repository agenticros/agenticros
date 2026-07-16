import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  cmdVelTopicFromConfig,
  safetyLimitsFromConfig,
} from "../util/eyes.js";

describe("eyes config helpers", () => {
  it("uses explicit topic override", () => {
    assert.equal(
      cmdVelTopicFromConfig({ robot: { namespace: "bot" } }, "custom/cmd_vel"),
      "/custom/cmd_vel",
    );
  });

  it("prefers teleop.cmdVelTopic over namespace", () => {
    assert.equal(
      cmdVelTopicFromConfig({
        robot: { namespace: "bot" },
        teleop: { cmdVelTopic: "/my/cmd_vel" },
      }),
      "/my/cmd_vel",
    );
  });

  it("namespaces /cmd_vel from robot.namespace", () => {
    assert.equal(
      cmdVelTopicFromConfig({ robot: { namespace: "3946b404-c33e-4aa3-9a8d-16deb1c5c593" } }),
      "/3946b404-c33e-4aa3-9a8d-16deb1c5c593/cmd_vel",
    );
  });

  it("falls back to /cmd_vel with empty namespace", () => {
    assert.equal(cmdVelTopicFromConfig({}), "/cmd_vel");
  });

  it("reads safety limits with defaults", () => {
    assert.deepEqual(safetyLimitsFromConfig({}), {
      maxLinearVelocity: 1.0,
      maxAngularVelocity: 1.5,
    });
    assert.deepEqual(
      safetyLimitsFromConfig({
        safety: { maxLinearVelocity: 0.4, maxAngularVelocity: 0.8 },
      }),
      { maxLinearVelocity: 0.4, maxAngularVelocity: 0.8 },
    );
  });
});
