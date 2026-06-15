#!/usr/bin/env node
/**
 * pack-runtime.mjs
 *
 * Pre-publish helper for the `agenticros` npm package.
 *
 * Produces `packages/agenticros-cli/runtime/`: a near-complete snapshot of the
 * monorepo source that ships inside the published tarball. After
 * `npx agenticros init`, this runtime/ tree is copied into ~/agenticros (or
 * $AGENTICROS_HOME) and treated as the user's workspace - so the layout
 * matches the live repo exactly. Contributors get live edits without ever
 * going through this script.
 *
 * What ships:
 *   - scripts/                      shell helpers, install scripts, sim entrypoints
 *   - ros2_ws/src/agenticros_*      our ROS 2 packages (msgs + Python nodes)
 *   - packages/{core,ros-camera,agenticros,agenticros-claude-code,agenticros-gemini}
 *                                   TypeScript sources for the workspace, NO dist or node_modules
 *   - packages/agenticros-claude-code/dist  (pre-built so `npx agenticros` works without colcon)
 *   - package.json / pnpm-workspace.yaml / tsconfig.base.json   monorepo manifests
 *   - patches/                      pnpm patchedDependencies (zenoh-ts, ...)
 *                                   without this `pnpm install` ENOENTs after init
 *   - docs/cli.md                   reference for the CLI (used by `agenticros logs --help`)
 *   - README.md / LICENSE           top-level docs
 *
 * What we deliberately drop:
 *   - .git/                         massive, and `agenticros init` doesn't need history
 *   - node_modules/                 reinstalled by `agenticros init`
 *   - All packages/* dist/ except agenticros-claude-code/dist
 *   - ros2_ws/build / install / log
 *   - The CLI's own source (it's already installed by npm)
 *   - .pnpm-store, .cache, .ccache, generated logs
 *
 * Invocation:
 *   node scripts/pack-runtime.mjs            # from repo root
 *   pnpm --filter agenticros pack:runtime    # via the CLI package's scripts
 */

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep as pathSep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const CLI_PKG_DIR = join(REPO_ROOT, "packages", "agenticros-cli");
const RUNTIME_DIR = join(CLI_PKG_DIR, "runtime");

const INCLUDED_PACKAGES = [
  "core",
  "ros-camera",
  "agenticros",
  "agenticros-claude-code",
  "agenticros-gemini",
];

// NOTE: .npmrc is deliberately absent here. npm pack strips .npmrc from
// every published tarball (hardcoded denylist), so bundling it is pointless.
// The CLI writes ~/agenticros/.npmrc inline at init/heal time instead.
const TOP_LEVEL_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "tsconfig.base.json",
  "LICENSE",
  "README.md",
];

const DOCS_FILES = ["cli.md", "architecture.md", "robot-setup.md", "memory.md"];

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".pnpm-store",
  ".cache",
  ".ccache",
  ".turbo",
  "build",
  "install",
  "log",
  ".tsbuildinfo",
]);

const EXCLUDED_FILE_GLOBS = [
  /^\.DS_Store$/,
  /\.tsbuildinfo$/,
  /^\.env(\.|$)/,
  /^npm-debug\.log/,
];

function logStep(message) {
  process.stdout.write(`[pack-runtime] ${message}\n`);
}

function logSubstep(message) {
  process.stdout.write(`[pack-runtime]   ${message}\n`);
}

function isExcluded(srcPath) {
  const base = srcPath.split("/").pop() ?? "";
  if (EXCLUDED_DIR_NAMES.has(base)) return true;
  for (const re of EXCLUDED_FILE_GLOBS) if (re.test(base)) return true;
  return false;
}

function copyTree(src, dest, opts = {}) {
  const { allowDist = false } = opts;
  if (!existsSync(src)) {
    logSubstep(`skip (missing): ${relative(REPO_ROOT, src)}`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    dereference: false,
    errorOnExist: false,
    force: true,
    filter: (s, _d) => {
      // On Windows, fs.cpSync hands the filter back paths with `\` separators
      // while `src` was built with `path.join` (also `\`), so split on the
      // OS separator. Splitting on `/` here used to silently fail on Windows
      // and let node_modules through, which then EPERM'd on the first
      // symlink inside `.pnpm/...` because Win32 needs elevated rights to
      // create symlinks.
      const rel = s.startsWith(src + pathSep) ? s.slice(src.length + 1) : "";
      const parts = rel.split(pathSep);
      for (const p of parts) {
        if (EXCLUDED_DIR_NAMES.has(p)) return false;
      }
      // Drop dist/ from every package except the explicitly allowed ones.
      if (!allowDist && parts.includes("dist")) return false;
      const base = parts[parts.length - 1] ?? "";
      for (const re of EXCLUDED_FILE_GLOBS) if (re.test(base)) return false;
      return true;
    },
  });
}

function reset() {
  if (existsSync(RUNTIME_DIR)) {
    logStep(`Clearing existing runtime/ at ${relative(REPO_ROOT, RUNTIME_DIR)}`);
    rmSync(RUNTIME_DIR, { recursive: true, force: true });
  }
  mkdirSync(RUNTIME_DIR, { recursive: true });
}

function copyScripts() {
  logStep("Copying scripts/");
  copyTree(join(REPO_ROOT, "scripts"), join(RUNTIME_DIR, "scripts"));
}

function copyRos2Ws() {
  logStep("Copying ros2_ws/src/agenticros_*");
  const dest = join(RUNTIME_DIR, "ros2_ws", "src");
  mkdirSync(dest, { recursive: true });
  // Only include AgenticROS packages, not arbitrary upstream sources.
  const srcRoot = join(REPO_ROOT, "ros2_ws", "src");
  if (!existsSync(srcRoot)) {
    logSubstep("skip (missing ros2_ws/src)");
    return;
  }
  for (const entry of readdirSync(srcRoot)) {
    if (!entry.startsWith("agenticros_")) {
      logSubstep(`skip non-agenticros pkg: ${entry}`);
      continue;
    }
    copyTree(join(srcRoot, entry), join(dest, entry));
  }
}

function copyPackages() {
  logStep("Copying packages/*");
  const pkgRoot = join(REPO_ROOT, "packages");
  const dest = join(RUNTIME_DIR, "packages");
  mkdirSync(dest, { recursive: true });
  for (const pkg of INCLUDED_PACKAGES) {
    const allowDist = pkg === "agenticros-claude-code";
    if (allowDist) {
      logSubstep(`${pkg} (including pre-built dist/)`);
    } else {
      logSubstep(`${pkg} (src only)`);
    }
    copyTree(join(pkgRoot, pkg), join(dest, pkg), { allowDist });
  }
}

function copyTopLevel() {
  logStep("Copying top-level manifests");
  for (const file of TOP_LEVEL_FILES) {
    const src = join(REPO_ROOT, file);
    if (existsSync(src) && statSync(src).isFile()) {
      const dest = join(RUNTIME_DIR, file);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest);
      logSubstep(file);
    }
  }
}

function copyDocs() {
  logStep("Copying selected docs/");
  const docsSrc = join(REPO_ROOT, "docs");
  const docsDest = join(RUNTIME_DIR, "docs");
  mkdirSync(docsDest, { recursive: true });
  for (const file of DOCS_FILES) {
    const src = join(docsSrc, file);
    if (existsSync(src)) {
      cpSync(src, join(docsDest, file));
      logSubstep(file);
    } else {
      logSubstep(`skip (missing): docs/${file}`);
    }
  }
}

function copyPatches() {
  // pnpm requires patches/* on disk because package.json -> pnpm.patchedDependencies
  // references "patches/<name>.patch". Without these files `pnpm install` aborts
  // with ENOENT during `agenticros init`. Bundle the whole patches/ dir verbatim.
  logStep("Copying patches/");
  copyTree(join(REPO_ROOT, "patches"), join(RUNTIME_DIR, "patches"));
}

// NOTE: We intentionally do NOT ship runtime/.npmrc here. npm strips .npmrc
// from every published tarball (hardcoded denylist alongside .gitignore), so
// any .npmrc we write into runtime/ vanishes from the user's `npx agenticros`
// install. Instead, the CLI writes ~/agenticros/.npmrc from inline content at
// init/heal time (see commands/init.ts -> writeInitNpmrcInline).

function writeBundleManifest() {
  const manifestPath = join(RUNTIME_DIR, "BUNDLE.json");
  const manifest = {
    packedAt: new Date().toISOString(),
    repo: "https://github.com/PlaiPin/agenticros",
    note: "This directory is a snapshot of the agenticros monorepo source. `agenticros init` will copy it to ~/agenticros and run pnpm install + colcon build there.",
    layout: {
      scripts: "scripts/",
      ros2_packages: "ros2_ws/src/agenticros_*",
      js_packages: "packages/*",
      mcp_prebuilt: "packages/agenticros-claude-code/dist/index.js",
    },
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  logStep(`Wrote BUNDLE.json`);
}

function reportSize() {
  try {
    const out = execSync(`du -sh ${RUNTIME_DIR}`, { encoding: "utf8" });
    const size = out.split(/\s+/)[0];
    logStep(`runtime/ size: ${size}`);
  } catch {
    // du missing — skip
  }
}

// Lazy import for readdirSync to keep the top of the file tidy.
import { readdirSync } from "node:fs";

reset();
copyScripts();
copyRos2Ws();
copyPackages();
copyTopLevel();
copyDocs();
copyPatches();
writeBundleManifest();
reportSize();
logStep("Done.");
