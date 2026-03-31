/**
 * Message conversion between plain JS objects and rclnodejs typed messages.
 *
 * The RosTransport interface works with `Record<string, unknown>`, but
 * rclnodejs works with typed message class instances. This module bridges
 * the two — analogous to rosbridge_library's `dict_to_msg` / `msg_to_dict`.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Cached message classes keyed by normalized type string. */
const typeCache = new Map<string, any>();

/**
 * Resolve the rclnodejs module. Uses createRequire because rclnodejs is CJS.
 * Returns `any` — rclnodejs is an optional dependency and types may not be present.
 */
function getRclnodejs(): any {
  return require("rclnodejs");
}

/**
 * Normalize a ROS2 type string to the format rclnodejs expects.
 * Accepts: "geometry_msgs/msg/Twist", "geometry_msgs/Twist", etc.
 */
function normalizeType(typeStr: string): string {
  const parts = typeStr.split("/");
  // Already fully qualified: "pkg/msg/Type" or "pkg/srv/Type" or "pkg/action/Type"
  if (parts.length === 3) return typeStr;
  // Short form: "pkg/Type" → assume msg
  if (parts.length === 2) return `${parts[0]}/msg/${parts[1]}`;
  return typeStr;
}

/**
 * Load a ROS2 message/service/action class via rclnodejs, with caching.
 */
export function loadMessageClass(typeStr: string): any {
  const normalized = normalizeType(typeStr);
  const cached = typeCache.get(normalized);
  if (cached) return cached;

  const rclnodejs = getRclnodejs();
  const cls = rclnodejs.require(normalized);
  typeCache.set(normalized, cls);
  return cls;
}

/**
 * Convert a plain JS object to an rclnodejs message instance.
 *
 * Recursively assigns fields from `obj` onto a new message instance,
 * handling nested sub-messages (e.g. Twist.linear is a Vector3).
 */
export function toRosMessage(typeStr: string, obj: Record<string, unknown>): any {
  const MessageClass = loadMessageClass(typeStr);
  const msg = new MessageClass();
  assignFields(msg, obj);
  return msg;
}

/**
 * Recursively assign plain-object fields onto an rclnodejs message instance.
 */
function assignFields(target: any, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      // Nested sub-message — the target field should already be initialized
      // by rclnodejs with default values. Recurse into it.
      if (target[key] !== undefined && target[key] !== null && typeof target[key] === "object") {
        assignFields(target[key], value as Record<string, unknown>);
      } else {
        target[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Array field — could be primitives or nested messages.
      // For nested message arrays, each element needs recursive assignment
      // if the target has typed array elements. For now, assign directly —
      // rclnodejs handles primitive arrays and typed arrays via setter coercion.
      target[key] = value;
    } else {
      target[key] = value;
    }
  }
}

/**
 * True for message shapes whose `data` must stay as raw bytes.
 * rclnodejs `toPlainObject()` often expands or mis-serializes `uint8[]` / sequences
 * (e.g. sensor_msgs Image / CompressedImage), which breaks camera snapshot and similar tools.
 *
 * Use `in` / typeof — fields may be accessors on the prototype (not own properties).
 */
function isSensorImageLikeForExtraction(msg: any): boolean {
  if (msg == null || typeof msg !== "object") return false;
  if (!("data" in msg)) return false;
  // sensor_msgs/msg/Image — PointCloud2 has width/height/data but no `encoding`.
  // Width/height may be ref-wrapped in rclnodejs; only require presence + string encoding.
  if (typeof msg.encoding === "string" && "width" in msg && "height" in msg) {
    return true;
  }
  // sensor_msgs/msg/CompressedImage — `format` + `data`; no top-level `encoding` (unlike Image).
  if (typeof msg.format === "string" && !(typeof msg.encoding === "string")) {
    return true;
  }
  return false;
}

/** std_msgs/Header — read by name; stamp may be a nested ROS object. */
function copyHeaderField(header: any): Record<string, unknown> {
  if (header == null || typeof header !== "object") return {};
  const out: Record<string, unknown> = {};
  if ("frame_id" in header) out.frame_id = header.frame_id;
  if ("stamp" in header && header.stamp != null && typeof header.stamp === "object") {
    const s = header.stamp;
    const stamp: { sec?: number; nanosec?: number } = {};
    if (typeof s.sec === "number" || typeof s.sec === "bigint") stamp.sec = Number(s.sec);
    if (typeof s.nanosec === "number" || typeof s.nanosec === "bigint") {
      stamp.nanosec = Number(s.nanosec);
    }
    out.stamp = stamp;
  }
  return out;
}

/** rclnodejs / ref-array `uint8[]` — numeric `.length` and indexed elements. */
function tryBufferFromArrayLike(value: unknown): Buffer | null {
  if (value == null || typeof value !== "object") return null;
  const v = value as Record<string, unknown> & { length?: unknown };
  const len = v.length;
  if (typeof len !== "number" || !Number.isFinite(len) || len < 0 || len > 200_000_000) {
    return null;
  }
  try {
    const anyVal = value as Record<number, unknown>;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const el = anyVal[i];
      const n = typeof el === "number" ? el : Number(el);
      if (!Number.isFinite(n)) return null;
      u8[i] = n & 0xff;
    }
    return Buffer.from(u8);
  } catch {
    return null;
  }
}

function tryBufferFromIterable(value: unknown): Buffer | null {
  if (value == null || typeof value !== "object") return null;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return Buffer.from(value);
  if (typeof (value as any)[Symbol.iterator] !== "function") return null;
  try {
    const arr = Uint8Array.from(value as Iterable<number>);
    if (arr.length === 0) return null;
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

/** Unwrap `data` for Image / CompressedImage (Buffer, views, JSON Buffer, nested `{ data }`). */
function coerceSensorImageDataField(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  }
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (rec["type"] === "Buffer" && Array.isArray(rec["data"])) {
      return coerceSensorImageDataField(rec["data"], depth + 1);
    }
    if ("data" in rec && rec["data"] !== undefined) {
      return coerceSensorImageDataField(rec["data"], depth + 1);
    }
  }
  const fromIterable = tryBufferFromIterable(value);
  if (fromIterable !== null) return fromIterable;
  const fromArrayLike = tryBufferFromArrayLike(value);
  if (fromArrayLike !== null) return fromArrayLike;
  return value;
}

/**
 * Copy one field value from an rclnodejs message for plain-object consumers.
 * Preserves byte blobs; recurses into typical nested ROS structs (not full generic graph).
 */
function copyValueForPlainTransport(value: any): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "function") return undefined;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  }
  if (Array.isArray(value)) {
    return value.map((item: any) =>
      typeof item === "object" && item !== null ? copyValueForPlainTransport(item) : item,
    );
  }
  if (typeof value === "object") {
    if (value.constructor && value.constructor.name !== "Object") {
      return extractFields(value);
    }
    return value;
  }
  return value;
}

/**
 * rclnodejs often exposes Image/CompressedImage fields via prototype getters, so
 * `Object.keys(msg)` is empty and `extractFields` produced `{}`. Read the known
 * sensor_msgs field names explicitly.
 */
function extractSensorImageToPlain(msg: any): Record<string, unknown> {
  const keys = [
    "header",
    "format",
    "encoding",
    "height",
    "width",
    "is_bigendian",
    "step",
    "data",
  ] as const;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (!(key in msg)) continue;
    const value = msg[key];
    if (typeof value === "function") continue;
    if (key === "header") {
      result.header = copyHeaderField(value);
    } else if (key === "data") {
      result.data = coerceSensorImageDataField(value);
    } else {
      result[key] = copyValueForPlainTransport(value);
    }
  }
  return result;
}

/**
 * Convert an rclnodejs message instance to a plain JS object.
 *
 * Uses `toPlainObject()` if available (rclnodejs >= 0.21), otherwise
 * falls back to manual recursive field extraction.
 */
export function fromRosMessage(msg: any, rosTypeHint?: string): Record<string, unknown> {
  if (msg === null || msg === undefined) return {};

  const hinted = rosTypeHint ? normalizeType(rosTypeHint) : "";
  if (
    hinted === "sensor_msgs/msg/Image" ||
    hinted === "sensor_msgs/msg/CompressedImage"
  ) {
    return extractSensorImageToPlain(msg);
  }

  if (isSensorImageLikeForExtraction(msg)) {
    return extractSensorImageToPlain(msg);
  }

  // Preferred path: rclnodejs provides toPlainObject()
  if (typeof msg.toPlainObject === "function") {
    return msg.toPlainObject() as Record<string, unknown>;
  }

  // Fallback: manual extraction
  return extractFields(msg);
}

/**
 * Recursively extract fields from an rclnodejs message into a plain object.
 */
function extractFields(msg: any): Record<string, unknown> {
  if (msg === null || msg === undefined) return {};
  if (typeof msg !== "object") return {};

  const result: Record<string, unknown> = {};

  // Get enumerable own properties
  const keys = Object.keys(msg);
  for (const key of keys) {
    // Skip internal/private properties
    if (key.startsWith("_")) continue;

    const value = msg[key];
    if (typeof value === "function") continue;

    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
      // Keep raw byte blobs intact (sensor_msgs Image/CompressedImage `data`, etc.).
      result[key] = Buffer.from(value);
    } else if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      result[key] = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: any) =>
        typeof item === "object" && item !== null ? extractFields(item) : item,
      );
    } else if (typeof value === "object") {
      // Check if it looks like a typed message (has constructor beyond Object)
      if (value.constructor && value.constructor.name !== "Object") {
        result[key] = extractFields(value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Clear the type cache. Called during shutdown.
 */
export function clearTypeCache(): void {
  typeCache.clear();
}
