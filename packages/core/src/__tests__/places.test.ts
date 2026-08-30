import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  forgetPlace,
  getPlace,
  listPlaces,
  poseFromLocalizationMessage,
  savePlace,
} from "../places.js";

test("places: save, get (case-insensitive), list, forget", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agenticros-places-"));
  const path = join(dir, "places.json");
  try {
    const saved = savePlace({ name: "Kitchen", x: 1.2, y: 3.4, yaw: 0.5 }, path);
    assert.equal(saved.name, "Kitchen");
    assert.equal(getPlace("kitchen", path)?.x, 1.2);
    assert.equal(listPlaces(path).length, 1);
    savePlace({ name: "kitchen", x: 2, y: 4 }, path);
    assert.equal(listPlaces(path).length, 1);
    assert.equal(getPlace("KITCHEN", path)?.x, 2);
    assert.equal(forgetPlace("kitchen", path), true);
    assert.equal(listPlaces(path).length, 0);
    assert.equal(forgetPlace("kitchen", path), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("places: poseFromLocalizationMessage reads PoseWithCovarianceStamped", () => {
  const pose = poseFromLocalizationMessage({
    pose: {
      pose: {
        position: { x: 1, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    },
  });
  assert.deepEqual(pose, { x: 1, y: 2, yaw: 0 });
});
