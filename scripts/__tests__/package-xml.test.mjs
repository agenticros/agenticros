/**
 * Regression tests for ROS package.xml well-formedness.
 *
 * Pins the agenticros@0.7.19 failure: `--` inside an XML comment
 * (`<!-- ... agenticros up sim-arm --moveit -->`) is rejected by Expat /
 * ament_package_xml / colcon as "not well-formed (invalid token)".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  findIllegalXmlCommentDashes,
  findPackageXmls,
  validateRosPackageXmls,
} from "../validate-ros-package-xml.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROS2_SRC = join(REPO_ROOT, "ros2_ws", "src");

test("findIllegalXmlCommentDashes: rejects -- inside a comment (0.7.19 case)", () => {
  const xml = [
    '<?xml version="1.0"?>',
    "<package format=\"3\">",
    "  <!-- Optional MoveIt2 stack (sim_arm_moveit.launch.py / agenticros up sim-arm --moveit) -->",
    "  <name>agenticros_sim</name>",
    "</package>",
    "",
  ].join("\n");
  const errors = findIllegalXmlCommentDashes(xml);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 3);
  assert.match(errors[0].excerpt, /--moveit/);
});

test("findIllegalXmlCommentDashes: allows -- outside comments", () => {
  const xml = [
    '<?xml version="1.0"?>',
    "<package format=\"3\">",
    "  <description>agenticros up sim-arm [--moveit]</description>",
    "  <!-- Optional MoveIt2 stack for sim_arm_moveit.launch.py -->",
    "</package>",
    "",
  ].join("\n");
  assert.deepEqual(findIllegalXmlCommentDashes(xml), []);
});

test("validateRosPackageXmls: reports the illegal comment with a path and line", () => {
  const root = mkdtempSync(join(tmpdir(), "pkg-xml-"));
  try {
    const pkgDir = join(root, "agenticros_sim");
    mkdirSync(pkgDir);
    writeFileSync(
      join(pkgDir, "package.xml"),
      "<!-- foo --bar -->\n<package format=\"3\"><name>x</name></package>\n",
    );
    const { files, failures } = validateRosPackageXmls(root);
    assert.equal(files.length, 1);
    assert.ok(
      failures.some((f) => f.includes("package.xml:1:") && f.includes("'--'")),
      `expected a '--' comment failure, got: ${JSON.stringify(failures)}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ros2_ws/src: every package.xml is well-formed", () => {
  const files = findPackageXmls(ROS2_SRC);
  assert.ok(files.length >= 1, `expected package.xml files under ${ROS2_SRC}`);
  const { failures } = validateRosPackageXmls(ROS2_SRC);
  assert.deepEqual(failures, [], failures.join("\n"));
});

test("ros2_ws/src/agenticros_sim/package.xml: no -- inside XML comments", () => {
  const files = findPackageXmls(ROS2_SRC);
  const sim = files.find((p) => p.endsWith(join("agenticros_sim", "package.xml")));
  assert.ok(sim, "agenticros_sim/package.xml must ship in ros2_ws/src");
  const contents = readFileSync(sim, "utf8");
  assert.deepEqual(findIllegalXmlCommentDashes(contents), []);
  // Command-line --moveit is fine in description text; just not in comments.
  assert.match(contents, /\[--moveit\]/);
});
