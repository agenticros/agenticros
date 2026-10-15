import assert from "node:assert/strict";
import { test } from "node:test";
import { colorSnapshotCandidates, selectColorSnapshotTopic } from "./src/snapshot.ts";

const raw = "/camera/camera/color/image_raw";
const jpeg = "/camera/camera/color/image_raw/compressed";

test("keeps a raw topic when the caller asks for Image", () => {
  assert.equal(
    selectColorSnapshotTopic(raw, { messageType: "Image", publishedTopics: [raw, jpeg] }),
    raw,
  );
});

test("uses the compressed sibling only when it is published", () => {
  assert.equal(selectColorSnapshotTopic(raw, { publishedTopics: [raw, jpeg] }), jpeg);
  assert.equal(selectColorSnapshotTopic(raw, { publishedTopics: [raw] }), raw);
});

test("leaves an already compressed topic alone", () => {
  assert.equal(selectColorSnapshotTopic(jpeg, { publishedTopics: [jpeg] }), jpeg);
});

test("ignores a compressed name that has no publisher", () => {
  assert.deepEqual(
    colorSnapshotCandidates(raw, { publishedTopics: [raw, jpeg], publisherTopics: [raw] }),
    [raw],
  );
});

test("tries compressed first when it has a publisher, then the raw topic", () => {
  assert.deepEqual(
    colorSnapshotCandidates(raw, { publisherTopics: [raw, jpeg] }),
    [jpeg, raw],
  );
});

test("stays on compressed when the caller asked for CompressedImage", () => {
  assert.deepEqual(
    colorSnapshotCandidates(raw, {
      messageType: "CompressedImage",
      publisherTopics: [raw, jpeg],
    }),
    [jpeg],
  );
});
