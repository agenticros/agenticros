import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createMap,
  deleteMap,
  ensureActiveMap,
  loadCatalog,
  publicCatalog,
  renameMap,
  setActiveMap,
} from "../maps.js";
import { listPlaces, savePlace } from "../places.js";

test("maps: create, rename, switch, delete", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agenticros-maps-"));
  const catalogPath = join(dir, "index.json");
  const mapsDir = join(dir, "dbs");
  const placesPath = join(dir, "places.json");
  const opts = { catalogPath, mapsDir, placesPath };
  try {
    const kitchen = createMap("Kitchen", opts);
    assert.equal(kitchen.label, "Kitchen");
    assert.equal(loadCatalog(catalogPath).activeId, kitchen.id);
    assert.equal(publicCatalog(opts).maps[0]?.active, true);

    const office = createMap("Office", opts);
    assert.equal(loadCatalog(catalogPath).activeId, office.id);
    assert.throws(() => createMap("office", opts), /already exists/);
    assert.throws(() => createMap("bad/name", opts), /Map label/);

    renameMap(kitchen.id, "Living Room", opts);
    assert.equal(loadCatalog(catalogPath).maps.find((m) => m.id === kitchen.id)?.label, "Living Room");

    setActiveMap("Living Room", opts);
    assert.equal(loadCatalog(catalogPath).activeId, kitchen.id);

    savePlace({ name: "Sink", x: 1, y: 2, map_id: kitchen.id }, placesPath);
    savePlace({ name: "Desk", x: 3, y: 4, map_id: office.id }, placesPath);
    deleteMap(kitchen.id, opts);
    assert.equal(loadCatalog(catalogPath).maps.length, 1);
    assert.equal(loadCatalog(catalogPath).activeId, office.id);
    assert.equal(listPlaces(placesPath).length, 1);
    assert.equal(listPlaces(placesPath)[0]?.name, "Desk");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("maps: ensureActiveMap creates Room once", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agenticros-maps-"));
  const opts = { catalogPath: join(dir, "index.json"), mapsDir: join(dir, "dbs") };
  try {
    const first = ensureActiveMap(opts);
    const second = ensureActiveMap(opts);
    assert.equal(first.id, second.id);
    assert.equal(first.label, "Room");
    assert.equal(loadCatalog(opts.catalogPath).maps.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("maps: first map adopts a legacy rtabmap.db when present", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agenticros-maps-"));
  const legacy = join(dir, "rtabmap.db");
  const opts = {
    catalogPath: join(dir, "index.json"),
    mapsDir: join(dir, "dbs"),
    legacyDatabasePath: legacy,
  };
  try {
    await writeFile(legacy, "legacy-db");
    const map = createMap("Room", opts);
    assert.equal(existsSync(legacy), false);
    assert.equal(readFileSync(map.databasePath, "utf8"), "legacy-db");
    await writeFile(legacy, "second");
    const office = createMap("Office", opts);
    assert.equal(existsSync(legacy), true);
    assert.equal(existsSync(office.databasePath), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
