import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createAccessUnitStream,
  createAnnexBParser,
  packetizeAccessUnit,
  rtpMarker,
  rtpSequence,
} from "./h264-rtp.js";

function nal(type, size) {
  const buf = Buffer.alloc(size);
  buf[0] = type;
  return buf;
}

describe("annex-b", () => {
  it("splits NALs across chunk boundaries", () => {
    const nals = [];
    const parser = createAnnexBParser((n) => nals.push(n));
    parser.push(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x67, 0xaa]));
    parser.push(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x68, 0xbb, 0x00, 0x00, 0x01, 0x65, 0xcc]));
    assert.equal(nals.length, 2);
    assert.equal(nals[0][0], 0x67);
    assert.equal(nals[1][0], 0x68);
  });

  it("prepends cached SPS and PPS to an IDR", () => {
    const units = [];
    const stream = createAccessUnitStream((unit) => units.push(unit.map((n) => n[0] & 0x1f)));
    const start = Buffer.from([0, 0, 0, 1]);
    const aud = Buffer.concat([start, nal(9, 2)]);
    const blob = Buffer.concat([
      start, nal(7, 4),
      start, nal(8, 3),
      aud,
      start, nal(5, 8),
      start, nal(1, 6),
      aud,
      start, nal(1, 6),
      aud,
      start,
    ]);
    stream.push(blob);
    assert.deepEqual(units[0], [7, 8, 5, 1]);
    assert.deepEqual(units[1], [1]);
  });

  it("includes the last slice when the stream is flushed", () => {
    const units = [];
    const stream = createAccessUnitStream((unit) => units.push(unit.map((n) => n[0] & 0x1f)));
    const start = Buffer.from([0, 0, 0, 1]);
    stream.push(Buffer.concat([
      start, nal(9, 2),
      start, nal(7, 4),
      start, nal(8, 3),
      start, nal(5, 8),
      start, nal(5, 8),
    ]));
    assert.equal(units.length, 0);
    stream.flush();
    assert.deepEqual(units[0], [7, 8, 5, 5]);
  });

  it("sets baseline SPS constraint flags to profile-level-id 42e01f", () => {
    const units = [];
    const stream = createAccessUnitStream((unit) => units.push(unit));
    stream.push(Buffer.concat([
      Buffer.from([0, 0, 0, 1, 0x67, 0x42, 0xc0, 0x1f]),
      Buffer.from([0, 0, 0, 1, 0x09, 0x10]),
      Buffer.from([0, 0, 0, 1, 0x65, 0x88]),
      Buffer.from([0, 0, 0, 1, 0x09, 0x10]),
      Buffer.from([0, 0, 0, 1]),
    ]));
    assert.equal(units[0][0][1], 0x42);
    assert.equal(units[0][0][2], 0xe0);
    assert.equal(units[0][0][3], 0x1f);
  });
});

describe("rtp packetization", () => {
  it("sends a short access unit as single-NAL packets and marks the last", () => {
    const { packets, nextSequence } = packetizeAccessUnit(
      [nal(7, 8), nal(5, 20)],
      { payloadType: 102, sequenceNumber: 7, timestamp: 6000, ssrc: 1, maxPayload: 1200 },
    );
    assert.equal(packets.length, 2);
    assert.equal(rtpMarker(packets[0]), false);
    assert.equal(rtpMarker(packets[1]), true);
    assert.equal(rtpSequence(packets[0]), 7);
    assert.equal(rtpSequence(packets[1]), 8);
    assert.equal(packets[0][1] & 0x7f, 102);
    assert.equal(nextSequence, 9);
    assert.equal(packets[1][12] & 0x1f, 5);
  });

  it("fragments a large NAL with FU-A start and end bits", () => {
    const { packets } = packetizeAccessUnit(
      [nal(1, 50)],
      { payloadType: 102, sequenceNumber: 1, timestamp: 0, ssrc: 9, maxPayload: 20 },
    );
    assert.ok(packets.length > 1);
    const firstFu = packets[0][13];
    const lastFu = packets[packets.length - 1][13];
    assert.equal(packets[0][12] & 0x1f, 28);
    assert.equal(firstFu & 0x80, 0x80);
    assert.equal(lastFu & 0x40, 0x40);
    assert.equal(rtpMarker(packets[packets.length - 1]), true);
    assert.equal(rtpMarker(packets[0]), false);
  });
});
