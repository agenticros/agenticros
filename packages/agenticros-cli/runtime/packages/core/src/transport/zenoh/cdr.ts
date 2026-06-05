/**
 * CDR encode/decode for ROS 2 messages over Zenoh (rmw_zenoh uses CDR payloads).
 * Supports geometry_msgs/msg/Twist, sensor_msgs/msg/Image, sensor_msgs/msg/CompressedImage.
 */

import { CdrReader, CdrWriter } from "@foxglove/cdr";
import { parse } from "@foxglove/rosmsg";
import { MessageReader } from "@foxglove/rosmsg2-serialization";

/** Normalize type string to "pkg/msg/Type" form. Handles short names (e.g. "Image") and combined forms. */
function normalizeType(typeStr: string): string {
  const s = typeStr.trim();
  if (s.includes("CompressedImage")) return "sensor_msgs/msg/CompressedImage";
  if (s === "Image" || s.endsWith("/Image") || (s.includes("sensor_msgs") && s.includes("Image"))) {
    return "sensor_msgs/msg/Image";
  }
  const parts = s.split("/");
  if (parts.length === 3) return s;
  if (parts.length === 2) return `${parts[0]}/msg/${parts[1]}`;
  return s;
}

/** Read std_msgs/Header from current reader offset (used by Image and CompressedImage). */
function readStdMsgsHeader(reader: CdrReader): Record<string, unknown> {
  const sec = reader.int32();
  const nanosec = reader.uint32();
  const frame_id = reader.string();
  return {
    stamp: { sec, nanosec },
    frame_id,
  };
}

/**
 * `CdrReader` already skips the 4-byte encapsulation header (initial offset 4).
 * CDR2 **appendable** messages (typical for `sensor_msgs` from CycloneDDS / zenoh-bridge-ros2dds)
 * include a 4-byte **DHEADER** next; without consuming it, `CompressedImage` / `Image` decode misaligns
 * and the teleop camera sees no valid frames (timeouts → 503).
 */
function createBodyReader(data: Uint8Array): CdrReader {
  const reader = new CdrReader(new DataView(data.buffer, data.byteOffset, data.byteLength));
  if (reader.usesDelimiterHeader && !reader.usesMemberHeader) {
    reader.dHeader();
  }
  return reader;
}

/** Embedded defs so Zenoh samples decode like rviz/ros2 bag (CDR1 / CDR2 / delimited / PL_CDR2). */
const COMPRESSED_IMAGE_MSG_DEF = `
std_msgs/msg/Header header
string format
uint8[] data

================================================================================
MSG: std_msgs/msg/Header
builtin_interfaces/msg/Time stamp
string frame_id

================================================================================
MSG: builtin_interfaces/msg/Time
int32 sec
uint32 nanosec
`;

let compressedImageReader: MessageReader | null = null;

function decodeCompressedImageWithFoxglove(data: Uint8Array): Record<string, unknown> {
  if (!compressedImageReader) {
    compressedImageReader = new MessageReader(parse(COMPRESSED_IMAGE_MSG_DEF, { ros2: true }));
  }
  const msg = compressedImageReader.readMessage<Record<string, unknown>>(data);
  return {
    header: msg["header"],
    format: msg["format"],
    data: msg["data"],
  };
}

function decodeCompressedImageManual(data: Uint8Array): Record<string, unknown> {
  const reader = createBodyReader(data);
  const header = readStdMsgsHeader(reader);
  const format = reader.string();
  const dataLen = reader.sequenceLength();
  const payload = reader.uint8Array(dataLen);
  return {
    header,
    format,
    data: Array.from(payload),
  };
}

/**
 * Encode a ROS 2 message to CDR (little-endian) for the given type.
 * Supports: geometry_msgs/msg/Twist.
 */
export function encodeCdr(typeStr: string, msg: Record<string, unknown>): Uint8Array {
  const type = normalizeType(typeStr);

  if (type === "geometry_msgs/msg/Twist") {
    const linear = (msg["linear"] as Record<string, unknown>) ?? {};
    const angular = (msg["angular"] as Record<string, unknown>) ?? {};
    // Standard ROS 2 Twist order: linear.x, linear.y, linear.z, angular.x, angular.y, angular.z (CDR LE, 4-byte encapsulation + 6 float64).
    const buf = new ArrayBuffer(4 + 6 * 8);
    const view = new DataView(buf);
    view.setUint32(0, 0x100, true);
    const vals = [
      Number(linear["x"] ?? 0),
      Number(linear["y"] ?? 0),
      Number(linear["z"] ?? 0),
      Number(angular["x"] ?? 0),
      Number(angular["y"] ?? 0),
      Number(angular["z"] ?? 0),
    ];
    for (let i = 0; i < 6; i++) view.setFloat64(4 + i * 8, vals[i], true);
    return new Uint8Array(buf);
  }

  throw new Error(`Zenoh CDR encode not implemented for type: ${typeStr}`);
}

/**
 * Decode a CDR payload to a plain object for the given type.
 * Supports: geometry_msgs/msg/Twist.
 */
export function decodeCdr(typeStr: string, data: Uint8Array): Record<string, unknown> {
  const type = normalizeType(typeStr);

  if (type === "geometry_msgs/msg/Twist") {
    const reader = createBodyReader(data);
    const linear = {
      x: reader.float64(),
      y: reader.float64(),
      z: reader.float64(),
    };
    const angular = {
      x: reader.float64(),
      y: reader.float64(),
      z: reader.float64(),
    };
    return { linear, angular };
  }

  if (type === "sensor_msgs/msg/CompressedImage") {
    try {
      return decodeCompressedImageWithFoxglove(data);
    } catch {
      return decodeCompressedImageManual(data);
    }
  }

  if (type === "sensor_msgs/msg/Image") {
    const reader = createBodyReader(data);
    const header = readStdMsgsHeader(reader);
    const height = reader.uint32();
    const width = reader.uint32();
    const encoding = reader.string();
    const is_bigendian = reader.uint8();
    const step = reader.uint32();
    const dataLen = reader.sequenceLength();
    const payload = reader.uint8Array(dataLen);
    return {
      header,
      height,
      width,
      encoding,
      is_bigendian,
      step,
      data: Array.from(payload),
    };
  }

  throw new Error(`Zenoh CDR decode not implemented for type: ${typeStr}`);
}

/** Check if we can encode/decode the given type. */
export function isCdrTypeSupported(typeStr: string): boolean {
  const type = normalizeType(typeStr);
  return (
    type === "geometry_msgs/msg/Twist" ||
    type === "sensor_msgs/msg/Image" ||
    type === "sensor_msgs/msg/CompressedImage"
  );
}
