#!/usr/bin/env node
/**
 * Validate ROS 2 package.xml manifests.
 *
 * XML 1.0 §2.5: comments cannot contain the string `--`. colcon /
 * ament_package_xml parse manifests with Expat, which rejects that as
 * "not well-formed (invalid token)". That shipped in agenticros@0.7.19
 * (`<!-- ... agenticros up sim-arm --moveit -->`) and broke
 * `npx agenticros init` after the JS workspace had already built.
 *
 * `--moveit` in READMEs, Python, JS, or `<description>` text is fine.
 * Only XML comments are restricted.
 *
 * Usage:
 *   node scripts/validate-ros-package-xml.mjs [srcRoot ...]
 *
 * Default srcRoot is <repo>/ros2_ws/src. Exits 1 if any manifest fails.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

/**
 * Find `<!-- ... -->` comments whose interior contains `--`.
 * Returns `{ line, excerpt }[]` (1-based line of the comment start).
 */
export function findIllegalXmlCommentDashes(contents) {
  const errors = [];
  const re = /<!--([\s\S]*?)-->/g;
  let m;
  while ((m = re.exec(contents)) !== null) {
    if (!m[1].includes("--")) continue;
    const line = contents.slice(0, m.index).split("\n").length;
    errors.push({
      line,
      excerpt: m[0].replace(/\s+/g, " ").trim().slice(0, 120),
    });
  }
  return errors;
}

/** Immediate child directories of `srcRoot` that contain a package.xml. */
export function findPackageXmls(srcRoot) {
  if (!existsSync(srcRoot)) return [];
  const out = [];
  for (const entry of readdirSync(srcRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const p = join(srcRoot, entry.name, "package.xml");
    if (existsSync(p)) out.push(p);
  }
  return out.sort();
}

/**
 * Parse `path` with Python's xml.etree.ElementTree when python3 is on PATH.
 * Returns an error string, or null if parse succeeded / python3 is missing.
 */
export function parsePackageXmlWithPython(path) {
  const probe = spawnSync("python3", ["-c", "import xml.etree.ElementTree"], {
    encoding: "utf8",
  });
  if (probe.status !== 0) return null;
  const r = spawnSync(
    "python3",
    ["-c", "import sys, xml.etree.ElementTree as ET; ET.parse(sys.argv[1])", path],
    { encoding: "utf8" },
  );
  if (r.status === 0) return null;
  const detail = (r.stderr || r.stdout || "").trim() || `exit ${r.status}`;
  return detail;
}

/**
 * Validate every package.xml under `srcRoot`.
 * @returns {{ files: string[], failures: string[] }}
 */
export function validateRosPackageXmls(srcRoot) {
  const files = findPackageXmls(srcRoot);
  const failures = [];
  for (const path of files) {
    const contents = readFileSync(path, "utf8");
    for (const e of findIllegalXmlCommentDashes(contents)) {
      failures.push(
        `${path}:${e.line}: XML comment contains '--' (illegal in XML 1.0): ${e.excerpt}`,
      );
    }
    const pyErr = parsePackageXmlWithPython(path);
    if (pyErr) {
      failures.push(`${path}: xml.etree.ElementTree parse failed: ${pyErr}`);
    }
  }
  return { files, failures };
}

/** Validate one or more trees; print results and exit 1 on failure. */
export function validateRosPackageXmlsOrExit(srcRoots) {
  const roots = srcRoots.length > 0 ? srcRoots : [join(REPO_ROOT, "ros2_ws", "src")];
  let failed = false;
  let total = 0;
  for (const raw of roots) {
    const srcRoot = resolve(raw);
    const { files, failures } = validateRosPackageXmls(srcRoot);
    total += files.length;
    if (files.length === 0) {
      process.stderr.write(`[package-xml] no package.xml under ${srcRoot}\n`);
      failed = true;
      continue;
    }
    for (const f of failures) {
      process.stderr.write(`[package-xml] ${f}\n`);
      failed = true;
    }
    if (failures.length === 0) {
      process.stdout.write(`[package-xml] OK: ${files.length} manifest(s) in ${srcRoot}\n`);
    }
  }
  if (failed) {
    process.stderr.write(
      `[package-xml] ${total} manifest(s) checked; fix illegal XML comments ` +
        `(no '--' inside <!-- -->) before publishing.\n`,
    );
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  validateRosPackageXmlsOrExit(process.argv.slice(2));
}
