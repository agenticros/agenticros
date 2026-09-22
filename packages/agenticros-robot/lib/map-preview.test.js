import assert from "node:assert/strict";
import test from "node:test";

import {
  cellAt,
  classifyOccupancy,
  isNavigable,
  pixelToWorld,
  poseInFrame,
  readOccupancy,
  rememberTransforms,
  renderOccupancy,
  robotPoseOnMap,
  worldToPixel,
  yawFromQuat,
} from "./map-preview.js";

test("classifyOccupancy treats uint8 255 as unknown", () => {
  assert.equal(classifyOccupancy(-1), "unknown");
  assert.equal(classifyOccupancy(255), "unknown");
  assert.equal(classifyOccupancy(0), "free");
  assert.equal(classifyOccupancy(49), "free");
  assert.equal(classifyOccupancy(50), "occupied");
  assert.equal(classifyOccupancy(100), "occupied");
  assert.equal(isNavigable(0), true);
  assert.equal(isNavigable(-1), false);
  assert.equal(isNavigable(80), false);
});

test("renderOccupancy puts cell (0,0) at the bottom-left of the image", () => {
  const width = 4;
  const height = 4;
  const data = new Array(width * height).fill(0);
  data[0] = 100;
  data[(height - 1) * width] = -1;
  const preview = renderOccupancy(
    { width, height, resolution: 0.05, origin: { x: 1, y: 2 }, data },
    320,
  );
  assert.ok(preview);
  assert.equal(preview.width, 4);
  assert.equal(preview.height, 4);
  assert.equal(preview.scale, 1);
  const bottomLeft = (3 * 4 + 0) * 4;
  const topLeft = 0;
  assert.equal(preview.rgba[bottomLeft], 20);
  assert.equal(preview.rgba[topLeft], 96);
});

test("pixelToWorld and worldToPixel round-trip the cell center", () => {
  const preview = {
    scale: 1,
    resolution: 1,
    gridWidth: 4,
    gridHeight: 4,
    origin: { x: 10, y: -2 },
  };
  const world = pixelToWorld(0, 3, preview);
  assert.equal(world.x, 10.5);
  assert.equal(world.y, -1.5);
  const back = worldToPixel(world.x, world.y, preview);
  assert.ok(Math.abs(back.px - 0) < 1e-9);
  assert.ok(Math.abs(back.py - 3) < 1e-9);
});

test("cellAt reads the grid in map meters", () => {
  const map = readOccupancy({
    info: {
      resolution: 0.5,
      width: 2,
      height: 2,
      origin: { position: { x: 1, y: 1, z: 0 } },
    },
    data: [0, 100, -1, 0],
  });
  assert.equal(cellAt(map, 1.1, 1.1), 0);
  assert.equal(cellAt(map, 1.6, 1.1), 100);
  assert.equal(cellAt(map, 1.1, 1.6), -1);
  assert.equal(cellAt(map, 0, 0), null);
});

test("robotPoseOnMap chains map → odom → base_link", () => {
  const yaw = Math.PI / 2;
  const edges = new Map();
  rememberTransforms(edges, {
    transforms: [
      {
        header: { frame_id: "/map" },
        child_frame_id: "odom",
        transform: {
          translation: { x: 1, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      },
      {
        header: { frame_id: "odom" },
        child_frame_id: "base_link",
        transform: {
          translation: { x: 0, y: 2, z: 0 },
          rotation: { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) },
        },
      },
    ],
  });
  const pose = robotPoseOnMap(edges);
  assert.ok(pose);
  assert.ok(Math.abs(pose.x - 1) < 1e-9);
  assert.ok(Math.abs(pose.y - 2) < 1e-9);
  assert.ok(Math.abs(pose.yaw - yaw) < 1e-9);
  assert.equal(poseInFrame(edges, "camera_link", "map"), null);
  assert.ok(Math.abs(yawFromQuat({ x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) }) - yaw) < 1e-9);
});
