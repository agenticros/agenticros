import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  currentNodeModuleAbi,
  nativeAddonsNeedRebuild,
  readWorkspaceNodeAbi,
  writeWorkspaceNodeAbi,
} from "../util/workspace.js";

describe("workspace Node ABI stamp", () => {
  it("round-trips the current NODE_MODULE_VERSION", () => {
    const dir = mkdtempSync(join(tmpdir(), "agenticros-abi-"));
    mkdirSync(join(dir, "node_modules"));
    try {
      writeWorkspaceNodeAbi(dir);
      assert.equal(readWorkspaceNodeAbi(dir), currentNodeModuleAbi());
      assert.equal(nativeAddonsNeedRebuild(dir), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("needs rebuild when the stamp is from a different Node ABI", () => {
    const dir = mkdtempSync(join(tmpdir(), "agenticros-abi-"));
    mkdirSync(join(dir, "node_modules"));
    try {
      writeWorkspaceNodeAbi(dir, "127");
      assert.equal(readWorkspaceNodeAbi(dir), "127");
      if (currentNodeModuleAbi() === "127") {
        assert.equal(nativeAddonsNeedRebuild(dir), false);
      } else {
        assert.equal(nativeAddonsNeedRebuild(dir), true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
