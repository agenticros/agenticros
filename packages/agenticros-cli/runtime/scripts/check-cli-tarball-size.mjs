#!/usr/bin/env node
/**
 * Tarball-size gate for the `agenticros` npm package.
 *
 * Runs `npm pack --dry-run --json` inside packages/agenticros-cli/, parses the
 * JSON metadata, prints a human summary, and exits non-zero if the unpacked
 * tarball would exceed MAX_UNPACKED_MB. Used as part of the prepublishOnly
 * pipeline so accidental fat dependencies don't slip into a release.
 */

import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_UNPACKED_MB = 20;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PKG_DIR = resolve(__dirname, "..", "packages", "agenticros-cli");

const out = execSync("npm pack --dry-run --json", {
  cwd: CLI_PKG_DIR,
  encoding: "utf8",
});

const arr = JSON.parse(out);
const meta = arr[0];
const unpackedMb = (meta.unpackedSize / 1_048_576).toFixed(2);
const packagedMb = (meta.size / 1_048_576).toFixed(2);

process.stdout.write(
  `[size-check] ${meta.filename}  tarball ${packagedMb} MB  unpacked ${unpackedMb} MB  files ${meta.entryCount}\n`,
);

if (meta.unpackedSize > MAX_UNPACKED_MB * 1_048_576) {
  process.stderr.write(
    `[size-check] FAIL: unpacked size exceeds ${MAX_UNPACKED_MB} MB limit.\n` +
      "[size-check] Inspect runtime/ - is something too big bundled in by mistake?\n",
  );
  process.exit(1);
}
process.stdout.write(`[size-check] OK\n`);
