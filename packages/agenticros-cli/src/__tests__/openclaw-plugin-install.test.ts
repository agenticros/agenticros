import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getAgenticrosOpenclawPluginInstallStatus,
  pathIsPluginDeploy,
  pathLooksLikeWorkspacePluginSource,
} from "../util/openclaw-config.js";

describe("openclaw plugin install status", () => {
  it("pathIsPluginDeploy matches deploy root and children", () => {
    const deploy = "/home/user/.agenticros/plugin-deploy";
    assert.equal(pathIsPluginDeploy(deploy, deploy), true);
    assert.equal(pathIsPluginDeploy(`${deploy}/`, deploy), true);
    assert.equal(pathIsPluginDeploy(`${deploy}/dist/index.js`, deploy), true);
    assert.equal(pathIsPluginDeploy("/home/user/agenticros/packages/agenticros", deploy), false);
  });

  it("pathLooksLikeWorkspacePluginSource detects packages/agenticros", () => {
    assert.equal(
      pathLooksLikeWorkspacePluginSource("/home/u/agenticros/packages/agenticros"),
      true,
    );
    assert.equal(
      pathLooksLikeWorkspacePluginSource("/home/u/.agenticros/plugin-deploy"),
      false,
    );
  });

  it("reports no-openclaw-config when cfg missing", () => {
    const status = getAgenticrosOpenclawPluginInstallStatus({
      cfg: null,
      deployDir: join(tmpdir(), "missing-deploy-xyz"),
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "no-openclaw-config");
  });

  it("reports no-deploy when manifest missing", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "agenticros-deploy-"));
    const status = getAgenticrosOpenclawPluginInstallStatus({
      cfg: { plugins: { entries: { agenticros: { enabled: true } } } },
      deployDir,
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "no-deploy");
  });

  it("ok when installs.sourcePath points at deploy dir", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "agenticros-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const status = getAgenticrosOpenclawPluginInstallStatus({
      cfg: {
        plugins: {
          entries: { agenticros: { enabled: true } },
          installs: { agenticros: { sourcePath: deployDir } },
        },
      },
      deployDir,
    });
    assert.equal(status.ok, true);
  });

  it("wrong-path when linked to workspace packages/agenticros", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "agenticros-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const bad = join(deployDir, "..", "agenticros", "packages", "agenticros");
    mkdirSync(bad, { recursive: true });
    const status = getAgenticrosOpenclawPluginInstallStatus({
      cfg: {
        plugins: {
          entries: { agenticros: { enabled: true } },
          installs: {
            agenticros: {
              sourcePath: "/Users/me/Projects/agenticros/packages/agenticros",
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
    const deployDir = mkdtempSync(join(tmpdir(), "agenticros-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const status = getAgenticrosOpenclawPluginInstallStatus({
      cfg: {
        plugins: {
          entries: { agenticros: { enabled: true, config: {} } },
        },
      },
      deployDir,
    });
    assert.equal(status.ok, true);
  });

  it("not-registered when plugins.entries.agenticros is absent", () => {
    const deployDir = mkdtempSync(join(tmpdir(), "agenticros-deploy-"));
    writeFileSync(join(deployDir, "openclaw.plugin.json"), "{}\n");
    const status = getAgenticrosOpenclawPluginInstallStatus({
      cfg: { plugins: { entries: {} } },
      deployDir,
    });
    assert.equal(status.ok, false);
    if (!status.ok) assert.equal(status.reason, "not-registered");
  });
});
