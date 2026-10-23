/**
 * Annex-B H.264 → RTP (RFC 6184), packetization-mode 1.
 * Single NAL packets when they fit, FU-A otherwise.
 * Constrained Baseline is selected by the encoder; this only packetizes.
 */

const RTP_HEADER = 12;
const DEFAULT_MAX_PAYLOAD = 1200;

/**
 * @param {Buffer} chunk
 * @returns {number} index of the next start code, or -1
 */
function findStartCode(chunk, from) {
  for (let i = from; i < chunk.length - 3; i++) {
    if (chunk[i] === 0 && chunk[i + 1] === 0) {
      if (chunk[i + 2] === 1) return i;
      if (chunk[i + 2] === 0 && chunk[i + 3] === 1) return i;
    }
  }
  return -1;
}

function startCodeLength(chunk, at) {
  if (chunk[at + 2] === 1) return 3;
  return 4;
}

/**
 * Incremental Annex-B splitter. Emits each NAL without its start code.
 * @param {(nal: Buffer) => void} onNal
 */
export function createAnnexBParser(onNal) {
  let buf = Buffer.alloc(0);
  return {
    push(chunk) {
      if (!chunk || chunk.length === 0) return;
      buf = buf.length === 0 ? Buffer.from(chunk) : Buffer.concat([buf, chunk]);
      let start = findStartCode(buf, 0);
      if (start < 0) {
        if (buf.length > 4) buf = buf.subarray(buf.length - 4);
        return;
      }
      if (start > 0) buf = buf.subarray(start);
      for (;;) {
        const header = startCodeLength(buf, 0);
        const next = findStartCode(buf, header);
        if (next < 0) break;
        const nal = buf.subarray(header, next);
        if (nal.length > 0) onNal(Buffer.from(nal));
        buf = buf.subarray(next);
      }
    },
    // The last NAL has no following start code yet. After the encoder goes
    // idle it is complete, and leaving it out sends a short frame.
    flush() {
      const start = findStartCode(buf, 0);
      if (start < 0) return;
      const header = startCodeLength(buf, start);
      const nal = buf.subarray(start + header);
      buf = Buffer.alloc(0);
      if (nal.length > 0) onNal(Buffer.from(nal));
    },
  };
}

/**
 * Groups NALs into access units. SPS/PPS are cached and prepended to each IDR.
 * AUD (9) and SEI (6) are dropped.
 * @param {(nals: Buffer[]) => void} onUnit
 */
export function createAccessUnitStream(onUnit) {
  let sps = null;
  let pps = null;
  let pending = [];
  // x264 sliced-threads emits several slice NALs per frame. An access-unit
  // delimiter wraps them. Sending each slice with its own RTP timestamp makes
  // the browser paint one band and fill the rest of the frame with green.
  const finish = () => {
    if (pending.length === 0) return;
    const hasIdr = pending.some((nal) => (nal[0] & 0x1f) === 5);
    const unit = [];
    if (hasIdr && sps) unit.push(sps);
    if (hasIdr && pps) unit.push(pps);
    unit.push(...pending);
    pending = [];
    onUnit(unit);
  };
  const parser = createAnnexBParser((nal) => {
    if (nal.length === 0) return;
    const type = nal[0] & 0x1f;
    if (type === 9) {
      finish();
      return;
    }
    if (type === 7) {
      // x264's Constrained Baseline SPS is 42c0. Chrome negotiated
      // profile-level-id=42e01f (constraint flags 0xE0). Same pictures;
      // the extra constraint bit is what the browser agreed to.
      if (nal.length >= 4 && nal[1] === 0x42) nal[2] = 0xe0;
      sps = nal;
      return;
    }
    if (type === 8) {
      pps = nal;
      return;
    }
    if (type === 6) return;
    if (type === 1 || type === 5) pending.push(nal);
  });
  return {
    push(chunk) {
      parser.push(chunk);
    },
    // The next frame's delimiter is what normally closes this one. Flush so
    // the last slice is included instead of being sent later by itself.
    flush() {
      parser.flush();
      finish();
    },
  };
}

export function rtpHeader({ marker, payloadType, sequenceNumber, timestamp, ssrc }) {
  const header = Buffer.alloc(RTP_HEADER);
  header[0] = 0x80;
  header[1] = (marker ? 0x80 : 0) | (payloadType & 0x7f);
  header.writeUInt16BE(sequenceNumber & 0xffff, 2);
  header.writeUInt32BE(timestamp >>> 0, 4);
  header.writeUInt32BE(ssrc >>> 0, 8);
  return header;
}

function singleNal(nal, meta) {
  return Buffer.concat([
    rtpHeader({ ...meta, marker: true }),
    nal,
  ]);
}

function fuaPackets(nal, meta, maxPayload) {
  const nalType = nal[0] & 0x1f;
  const nri = nal[0] & 0x60;
  const indicator = nri | 28;
  const body = nal.subarray(1);
  const packets = [];
  let offset = 0;
  let seq = meta.sequenceNumber;
  while (offset < body.length) {
    const room = maxPayload - 2;
    const slice = body.subarray(offset, offset + room);
    const start = offset === 0;
    const end = offset + slice.length >= body.length;
    let fuHeader = nalType;
    if (start) fuHeader |= 0x80;
    if (end) fuHeader |= 0x40;
    packets.push(Buffer.concat([
      rtpHeader({
        marker: end,
        payloadType: meta.payloadType,
        sequenceNumber: seq,
        timestamp: meta.timestamp,
        ssrc: meta.ssrc,
      }),
      Buffer.from([indicator, fuHeader]),
      slice,
    ]));
    seq = (seq + 1) & 0xffff;
    offset += slice.length;
  }
  return { packets, nextSequence: seq };
}

/**
 * @param {Buffer[]} nals
 * @param {{ payloadType: number, sequenceNumber: number, timestamp: number, ssrc: number, maxPayload?: number }} meta
 * @returns {{ packets: Buffer[], nextSequence: number }}
 */
export function packetizeAccessUnit(nals, meta) {
  const maxPayload = meta.maxPayload ?? DEFAULT_MAX_PAYLOAD;
  const packets = [];
  let seq = meta.sequenceNumber & 0xffff;
  nals.forEach((nal, index) => {
    const last = index === nals.length - 1;
    if (nal.length <= maxPayload) {
      const header = rtpHeader({
        marker: last,
        payloadType: meta.payloadType,
        sequenceNumber: seq,
        timestamp: meta.timestamp,
        ssrc: meta.ssrc,
      });
      packets.push(Buffer.concat([header, nal]));
      seq = (seq + 1) & 0xffff;
      return;
    }
    const fragmented = fuaPackets(nal, {
      payloadType: meta.payloadType,
      sequenceNumber: seq,
      timestamp: meta.timestamp,
      ssrc: meta.ssrc,
    }, maxPayload);
    if (!last && fragmented.packets.length > 0) {
      const finalPacket = fragmented.packets[fragmented.packets.length - 1];
      finalPacket[1] &= 0x7f;
    }
    packets.push(...fragmented.packets);
    seq = fragmented.nextSequence;
  });
  if (packets.length === 0) return { packets, nextSequence: seq };
  return { packets, nextSequence: seq };
}

/** Marker bit of an RTP packet we built. */
export function rtpMarker(packet) {
  return (packet[1] & 0x80) !== 0;
}

export function rtpSequence(packet) {
  return packet.readUInt16BE(2);
}
