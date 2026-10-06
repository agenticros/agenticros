import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  detectRosDistroName,
  ensureRoomCatalog,
  findStartMappingScript,
  launchMappingStack,
  loadMapCatalog,
} from "./map-catalog.js";

test("ensureRoomCatalog creates Room when the catalog is empty", () => {
  const home = mkdtempSync(join(tmpdir(), "agenticros-maps-"));
  const catalogPath = join(home, "maps", "index.json");
  const first = ensureRoomCatalog({ home, catalogPath, mapsDir: join(home, "maps") });
  assert.equal(first.catalog.maps.length, 1);
  assert.equal(first.catalog.maps[0].label, "Room");
  assert.equal(first.catalog.maps[0].active, true);
  assert.equal(first.catalog.activeId, first.catalog.maps[0].id);
  assert.equal("databasePath" in first.catalog.maps[0], false);
  assert.ok(first.databasePath.endsWith(`${first.catalog.activeId}.db`));

  const onDisk = loadMapCatalog(catalogPath);
  assert.equal(onDisk.maps[0].databasePath, first.databasePath);

  const again = ensureRoomCatalog({ home, catalogPath, mapsDir: join(home, "maps") });
  assert.equal(again.catalog.maps.length, 1);
  assert.equal(again.catalog.activeId, first.catalog.activeId);
});

test("ensureRoomCatalog repairs a missing active id", () => {
  const home = mkdtempSync(join(tmpdir(), "agenticros-maps-"));
  const catalogPath = join(home, "maps", "index.json");
  mkdirSync(join(home, "maps"), { recursive: true });
  writeFileSync(
    catalogPath,
    JSON.stringify({
      version: 1,
      activeId: null,
      maps: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          label: "Kitchen",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          databasePath: join(home, "maps", "11111111-1111-4111-8111-111111111111.db"),
        },
      ],
    }),
  );
  const result = ensureRoomCatalog({ home, catalogPath, mapsDir: join(home, "maps") });
  assert.equal(result.label, "Kitchen");
  assert.equal(result.catalog.activeId, "11111111-1111-4111-8111-111111111111");
  assert.equal(loadMapCatalog(catalogPath).activeId, "11111111-1111-4111-8111-111111111111");
});

test("findStartMappingScript walks up to scripts/", () => {
  const root = mkdtempSync(join(tmpdir(), "agenticros-repo-"));
  const script = join(root, "scripts", "start_mapping.sh");
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(script, "#!/bin/bash\n");
  const from = join(root, "packages", "agenticros-robot", "comms.js");
  mkdirSync(join(root, "packages", "agenticros-robot"), { recursive: true });
  assert.equal(findStartMappingScript(from), script);
});

test("detectRosDistroName prefers jazzy", () => {
  const root = mkdtempSync(join(tmpdir(), "agenticros-ros-"));
  mkdirSync(join(root, "humble"), { recursive: true });
  writeFileSync(join(root, "humble", "setup.bash"), "");
  mkdirSync(join(root, "jazzy"), { recursive: true });
  writeFileSync(join(root, "jazzy", "setup.bash"), "");
  assert.equal(detectRosDistroName(root), "jazzy");
  assert.equal(detectRosDistroName(join(root, "missing")), undefined);
});

test("launchMappingStack detaches start_mapping.sh with the room database", () => {
  const calls = [];
  const pid = launchMappingStack({
    script: "/tmp/start_mapping.sh",
    distro: "jazzy",
    databasePath: "/tmp/room.db",
    keep: false,
    namespace: "/robot",
    logFile: join(mkdtempSync(join(tmpdir(), "agenticros-log-")), "mapping.log"),
    env: { PATH: "/usr/bin" },
    spawnImpl(command, args, opts) {
      calls.push({ command, args, opts });
      return { pid: 42, unref() {} };
    },
  });
  assert.equal(pid, 42);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ["/tmp/start_mapping.sh", "jazzy"]);
  assert.equal(calls[0].opts.detached, true);
  assert.equal(calls[0].opts.env.AGENTICROS_MAP_DATABASE, "/tmp/room.db");
  assert.equal(calls[0].opts.env.AGENTICROS_KEEP_MAP, "0");
  assert.equal(calls[0].opts.env.AGENTICROS_MAP_LOCALIZE, "0");
  assert.equal(calls[0].opts.env.AGENTICROS_ROBOT_NAMESPACE, "robot");
  assert.equal(calls[0].opts.env.PATH, "/usr/bin");
});
