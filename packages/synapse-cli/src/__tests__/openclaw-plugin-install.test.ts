import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSynapseOpenclawPluginInstallStatus,
  pathIsPluginDeploy,
  pathLooksLikeWorkspacePluginSource,
} from "../util/openclaw-config.js";

describe("openclaw plugin install status", () => {
  it("pathIsPluginDeploy matches deploy root and children", () => {
    const deploy = "/home/user/.synapse/plugin-deploy";
    assert.equal(pathIsPluginDeploy(deploy, deploy), true);
    assert.equal(pathIsPluginDeploy(`${deploy}/`, deploy), true);
    assert.equal(pathIsPluginDeploy(`${deploy}/dist/index.js`, deploy), true);
    assert.equal(pathIsPluginDeploy("/home/user/synapse/packages/synapse-openclaw", deploy), false);
  });

  it("pathLooksLikeWorkspacePluginSource detects packages/synapse-openclaw", () => {
    assert.equal(
      pathLooksLikeWorkspacePluginSource("/home/u/synapse/packages/synapse-openclaw"),
      true,
    );
    assert.equal(
      pathLooksLikeWorkspacePluginSource("/home/u/.synapse/plugin-deploy"),
      false,
    );
  });

  it("reports no-openclaw-config when cfg missing", () => {
    const status = getSynapseOpenclawPluginInstallStatus({
      cfg: null,
      deployDir: join(tmpdir(), "missing-deploy-xyz"),
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "no-openclaw-config");
  });

  it("reports no-deploy when manifest missing", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "synapse-deploy-"));
    const status = getSynapseOpenclawPluginInstallStatus({
      cfg: { plugins: { entries: { synapse: { enabled: true } } } },
      deployDir,
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "no-deploy");
  });

  it("ok when installs.sourcePath points at deploy dir", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "synapse-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const status = getSynapseOpenclawPluginInstallStatus({
      cfg: {
        plugins: {
          entries: { synapse: { enabled: true } },
          installs: { synapse: { sourcePath: deployDir } },
        },
      },
      deployDir,
    });
    assert.equal(status.ok, true);
  });

  it("wrong-path when linked to workspace packages/synapse-openclaw", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "synapse-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const bad = join(deployDir, "..", "synapse", "packages", "synapse");
    mkdirSync(bad, { recursive: true });
    const status = getSynapseOpenclawPluginInstallStatus({
      cfg: {
        plugins: {
          entries: { synapse: { enabled: true } },
          installs: {
            synapse: {
              sourcePath: "/Users/me/Projects/synapse/packages/synapse-openclaw",
            },
          },
        },
      },
      deployDir,
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "wrong-path");
  });

  it("ok for older layouts with enabled entry and no path field", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "synapse-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const status = getSynapseOpenclawPluginInstallStatus({
      cfg: {
        plugins: {
          entries: { synapse: { enabled: true, config: {} } },
        },
      },
      deployDir,
    });
    assert.equal(status.ok, true);
  });

  it("not-registered when plugins.entries.synapse is absent", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "synapse-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const status = getSynapseOpenclawPluginInstallStatus({
      cfg: { plugins: { entries: {} } },
      deployDir,
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "not-registered");
  });
});
