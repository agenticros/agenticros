import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  clamp,
  FACE_FROM_TOP,
  gazeFromPerson,
  jpegFromCompressed,
  pickLargestPerson,
  yolov8ModelExists,
  yolov8ModelPath,
} from "./person-gaze.js";

describe("person-gaze", () => {
  it("clamp bounds a value", () => {
    assert.equal(clamp(0.5, -1, 1), 0.5);
    assert.equal(clamp(-3, -1, 1), -1);
    assert.equal(clamp(3, -1, 1), 1);
  });

  it("pickLargestPerson returns null for empty input", () => {
    assert.equal(pickLargestPerson(null), null);
    assert.equal(pickLargestPerson([]), null);
  });

  it("pickLargestPerson chooses the largest bbox", () => {
    const small = { x: 0, y: 0, width: 10, height: 10 };
    const large = { x: 1, y: 1, width: 40, height: 80 };
    assert.equal(pickLargestPerson([small, large]), large);
  });

  it("gazeFromPerson looks center when the face is in the middle of the frame", () => {
    const imgW = 640;
    const imgH = 480;
    const height = 200;
    const y = imgH / 2 - height * FACE_FROM_TOP;
    const person = { x: 270, y, width: 100, height, cx: 320 };
    const gaze = gazeFromPerson(person, imgW, imgH, { gain: 1 });
    assert.ok(gaze);
    assert.ok(Math.abs(gaze.gazeX) < 0.02);
    assert.ok(Math.abs(gaze.gazeY) < 0.02);
  });

  it("gazeFromPerson looks left when the person is on the left", () => {
    const person = { x: 20, y: 100, width: 80, height: 200, cx: 60 };
    const gaze = gazeFromPerson(person, 640, 480);
    assert.ok(gaze);
    assert.ok(gaze.gazeX < 0);
  });

  it("gazeFromPerson looks up when the head is in the top of the frame", () => {
    const person = { x: 280, y: 10, width: 80, height: 120, cx: 320 };
    const gaze = gazeFromPerson(person, 640, 480);
    assert.ok(gaze);
    assert.ok(gaze.gazeY < 0);
  });

  it("gazeFromPerson saturates at ±1 with gain", () => {
    const person = { x: 0, y: 0, width: 40, height: 80, cx: 20 };
    const gaze = gazeFromPerson(person, 640, 480, { gain: 8 });
    assert.ok(gaze);
    assert.equal(gaze.gazeX, -1);
  });

  it("jpegFromCompressed reads Uint8Array, Buffer, and JSON Buffer", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff]);
    assert.deepEqual(
      jpegFromCompressed({ data: new Uint8Array(bytes) }),
      bytes,
    );
    assert.equal(jpegFromCompressed({ data: bytes }), bytes);
    assert.deepEqual(
      jpegFromCompressed({ data: { type: "Buffer", data: [0xff, 0xd8, 0xff] } }),
      bytes,
    );
    assert.equal(jpegFromCompressed({ data: [] }), null);
    assert.equal(jpegFromCompressed({}), null);
  });

  it("yolov8ModelExists is false for a missing AGENTICROS_YOLOV8_MODEL", () => {
    const prev = process.env.AGENTICROS_YOLOV8_MODEL;
    process.env.AGENTICROS_YOLOV8_MODEL = join(
      tmpdir(),
      "agenticros-no-such-yolo.onnx",
    );
    try {
      assert.equal(yolov8ModelExists(), false);
      assert.equal(
        yolov8ModelPath(),
        process.env.AGENTICROS_YOLOV8_MODEL,
      );
    } finally {
      if (prev === undefined) delete process.env.AGENTICROS_YOLOV8_MODEL;
      else process.env.AGENTICROS_YOLOV8_MODEL = prev;
    }
  });

  it("yolov8ModelExists is true for a large local file", () => {
    const dir = mkdtempSync(join(tmpdir(), "eyes-yolo-"));
    const file = join(dir, "yolov8n.onnx");
    writeFileSync(file, Buffer.alloc(1_000_001));
    const prev = process.env.AGENTICROS_YOLOV8_MODEL;
    process.env.AGENTICROS_YOLOV8_MODEL = file;
    try {
      assert.equal(yolov8ModelExists(), true);
    } finally {
      if (prev === undefined) delete process.env.AGENTICROS_YOLOV8_MODEL;
      else process.env.AGENTICROS_YOLOV8_MODEL = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
