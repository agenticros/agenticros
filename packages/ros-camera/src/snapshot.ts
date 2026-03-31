/**
 * Normalizes sensor_msgs/Image and sensor_msgs/CompressedImage plain objects (from any transport)
 * into base64 + MIME-friendly format labels for chat UIs.
 */

import { decompress as zstdDecompress } from "fzstd";
import { PNG } from "pngjs";

/** ROS 2 type string for subscribe/publish calls. */
export const ROS_MSG_IMAGE = "sensor_msgs/msg/Image";
export const ROS_MSG_COMPRESSED_IMAGE = "sensor_msgs/msg/CompressedImage";

const MAX_IMAGE_BYTES_UNWRAP_DEPTH = 3;

export interface CameraSnapshotPayload {
  /** Format key for MIME fallback: png, jpeg, webp, … */
  formatLabel: string;
  dataBase64: string;
  width?: number;
  height?: number;
}

/** Width / height / step may be plain numbers or rclnodejs ref-wrapped. */
export function rosNumericField(v: unknown, label: string): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "bigint") return Number(v);
  if (v != null && typeof v === "object" && "data" in v) {
    return rosNumericField((v as { data: unknown }).data, label);
  }
  const n = Number(v);
  if (Number.isFinite(n)) return Math.trunc(n);
  throw new Error(`Invalid ${label} in Image message (cannot coerce to integer)`);
}

/** `sensor_msgs/Image.is_bigendian` and similar flags (plain or ref-wrapped). */
export function rosBoolField(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "bigint") return v !== 0n;
  if (typeof v === "number" && Number.isFinite(v)) return v !== 0;
  if (typeof v === "object" && v !== null && "data" in v) {
    return rosBoolField((v as { data: unknown }).data);
  }
  const n = Number(v);
  return Number.isFinite(n) && n !== 0;
}

/** `sensor_msgs/Image.encoding` may be a plain string or ref-wrapped (same pattern as numeric fields). */
export function rosStringField(v: unknown, fallback: string): string {
  if (v == null || v === "") return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "data" in v) {
    return rosStringField((v as { data: unknown }).data, fallback);
  }
  if (typeof v === "bigint") return String(v);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

/**
 * Normalize depth image encodings for sampling (trim; map mono16 / case variants).
 * `mono16` uses the same uint16 layout as `16UC1` (millimeters on RealSense-class sensors).
 */
export function normalizeDepthImageEncoding(encoding: string): string {
  const t = encoding.trim();
  if (t === "") return "16UC1";
  const lower = t.toLowerCase();
  if (lower === "mono16") return "16UC1";
  if (lower === "16uc1") return "16UC1";
  if (lower === "32fc1") return "32FC1";
  return t;
}

/** Normalize `sensor_msgs/Image.data` / `CompressedImage.data` from any transport into a Buffer. */
export function coerceRosImageDataToBuffer(data: unknown, depth = 0): Buffer {
  if (data == null) {
    throw new Error("Image data is null or missing");
  }
  if (typeof data === "string") {
    try {
      const asB64 = Buffer.from(data, "base64");
      if (asB64.length > 0) return asB64;
    } catch {
      /* fall through */
    }
    return Buffer.from(data, "utf8");
  }
  if (depth < MAX_IMAGE_BYTES_UNWRAP_DEPTH && typeof data === "object" && data !== null) {
    const rec = data as Record<string, unknown>;
    if (rec["type"] === "Buffer" && Array.isArray(rec["data"])) {
      return coerceRosImageDataToBuffer(rec["data"], depth + 1);
    }
    if ("data" in rec && rec["data"] !== undefined) {
      return coerceRosImageDataToBuffer(rec["data"], depth + 1);
    }
  }
  if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  }
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (Array.isArray(data)) {
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) bytes[i] = Number(data[i]) & 0xff;
    return Buffer.from(bytes);
  }
  if (typeof data === "object" && data !== null && Symbol.iterator in data) {
    try {
      const arr = Uint8Array.from(data as Iterable<number>);
      if (arr.length > 0) return Buffer.from(arr);
    } catch {
      /* fall through */
    }
  }
  const arrayLike = tryArrayLikeBytes(data);
  if (arrayLike !== null) return arrayLike;
  const fromNumericRecord = tryDenseNumericRecordToBuffer(data);
  if (fromNumericRecord !== null) return fromNumericRecord;

  throw new Error(
    "Image data has unsupported shape after ROS decode (expected byte array, Buffer, TypedArray, ArrayBuffer, or {data: …}). " +
      `Got: ${typeof data}${data !== null && typeof data === "object" ? ` (${data.constructor?.name ?? "Object"})` : ""}`,
  );
}

function tryArrayLikeBytes(data: unknown): Buffer | null {
  if (data == null || typeof data !== "object") return null;
  const v = data as { length?: unknown };
  const len = v.length;
  if (typeof len !== "number" || !Number.isFinite(len) || len < 0 || len > 200_000_000) {
    return null;
  }
  try {
    const rec = data as Record<number, unknown>;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const el = rec[i];
      const n =
        typeof el === "number"
          ? el
          : typeof el === "bigint"
            ? Number(el)
            : typeof el === "string"
              ? Number(el)
              : Number(el);
      if (!Number.isFinite(n)) return null;
      u8[i] = n & 0xff;
    }
    return Buffer.from(u8);
  } catch {
    return null;
  }
}

function tryDenseNumericRecordToBuffer(data: unknown): Buffer | null {
  if (typeof data !== "object" || data === null) return null;
  const rec = data as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length === 0) return null;
  if (!keys.every((k) => /^\d+$/.test(k))) return null;
  const indices = keys.map((k) => Number(k)).sort((a, b) => a - b);
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i) return null;
  }
  const len = indices.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const v = rec[String(i)];
    const n = typeof v === "number" ? v : typeof v === "boolean" ? Number(v) : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n)) return null;
    u8[i] = n & 0xff;
  }
  return Buffer.from(u8);
}

function bytesPerPixelForEncoding(enc: string): number {
  const e = enc.toLowerCase().trim();
  if (e === "rgb8" || e === "rgb888" || e === "bgr8" || e === "bgr888") return 3;
  if (e === "rgba8" || e === "bgra8") return 4;
  if (e === "mono8" || e === "8uc1") return 1;
  return 0;
}

function encodeRawRosImageToPng(params: {
  width: number;
  height: number;
  step: number;
  encoding: string;
  data: Buffer;
}): Buffer {
  const { width, height, step, encoding, data } = params;
  const enc = encoding.toLowerCase().trim();
  const bpp = bytesPerPixelForEncoding(enc);
  if (bpp === 0) {
    throw new Error(
      `Unsupported sensor_msgs/Image encoding for snapshot: "${encoding}" (supported: rgb8, bgr8, rgba8, bgra8, mono8)`,
    );
  }
  if (step < width * bpp) {
    throw new Error(`Image step ${step} is smaller than width×bpp (${width}×${bpp}) for ${enc}`);
  }
  const minLen = step * (height - 1) + width * bpp;
  if (data.length < minLen) {
    throw new Error(`Image data length ${data.length} < expected minimum ${minLen} for ${width}×${height} ${enc}`);
  }

  const png = new PNG({ width, height });
  const d = png.data;

  for (let y = 0; y < height; y++) {
    const row = y * step;
    for (let x = 0; x < width; x++) {
      const i = row + x * bpp;
      const o = (y * width + x) << 2;
      if (enc === "rgb8" || enc === "rgb888") {
        d[o] = data[i];
        d[o + 1] = data[i + 1];
        d[o + 2] = data[i + 2];
        d[o + 3] = 255;
      } else if (enc === "bgr8" || enc === "bgr888") {
        d[o] = data[i + 2];
        d[o + 1] = data[i + 1];
        d[o + 2] = data[i];
        d[o + 3] = 255;
      } else if (enc === "rgba8") {
        d[o] = data[i];
        d[o + 1] = data[i + 1];
        d[o + 2] = data[i + 2];
        d[o + 3] = data[i + 3];
      } else if (enc === "bgra8") {
        d[o] = data[i + 2];
        d[o + 1] = data[i + 1];
        d[o + 2] = data[i];
        d[o + 3] = data[i + 3];
      } else if (enc === "mono8" || enc === "8uc1") {
        const v = data[i];
        d[o] = v;
        d[o + 1] = v;
        d[o + 2] = v;
        d[o + 3] = 255;
      }
    }
  }

  return PNG.sync.write(png);
}

function sniffImageMagic(buf: Buffer): { mime: string; label: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", label: "jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mime: "image/png", label: "png" };
  }
  if (buf.length >= 12 && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mime: "image/webp", label: "webp" };
  }
  return null;
}

function mimeFromSnapshotLabel(label: string): string {
  const f = label.toLowerCase();
  if (f === "png") return "image/png";
  if (f === "gif") return "image/gif";
  if (f === "webp") return "image/webp";
  return "image/jpeg";
}

function mimeHintFromCompressedRosFormat(rosFormat: string): { mime: string; label: string } | null {
  const f = rosFormat.toLowerCase();
  if (f.includes("png")) return { mime: "image/png", label: "png" };
  if (f.includes("jpeg") || f.includes("jpg")) return { mime: "image/jpeg", label: "jpeg" };
  if (f.includes("webp")) return { mime: "image/webp", label: "webp" };
  return null;
}

/**
 * Build base64 snapshot + format metadata from one plain ROS image message (already decoded by transport).
 */
export function cameraSnapshotFromPlainMessage(
  messageType: "Image" | "CompressedImage",
  msg: Record<string, unknown>,
): CameraSnapshotPayload {
  if (messageType === "Image") {
    const rawBuf = coerceRosImageDataToBuffer(msg["data"]);
    const encoding = String((msg["encoding"] as string) ?? "rgb8");
    const w = rosNumericField(msg["width"], "width");
    const h = rosNumericField(msg["height"], "height");
    const bpp = bytesPerPixelForEncoding(encoding);
    const stepDefault = w * (bpp > 0 ? bpp : 3);
    const step =
      msg["step"] !== undefined && msg["step"] !== null
        ? rosNumericField(msg["step"], "step")
        : stepDefault;
    const pngBuf = encodeRawRosImageToPng({
      width: w,
      height: h,
      step,
      encoding,
      data: rawBuf,
    });
    return {
      formatLabel: "png",
      dataBase64: pngBuf.toString("base64"),
      width: w,
      height: h,
    };
  }

  const rosFormat = String((msg["format"] as string) ?? "jpeg");
  let buf = coerceRosImageDataToBuffer(msg["data"]);
  if (rosFormat.toLowerCase().includes("zstd")) {
    try {
      buf = Buffer.from(zstdDecompress(buf));
    } catch (e) {
      throw new Error(
        `CompressedImage zstd decompress failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  const magic = sniffImageMagic(buf);
  const hinted = mimeHintFromCompressedRosFormat(rosFormat);
  const label = magic?.label ?? hinted?.label ?? "jpeg";
  return {
    formatLabel: label,
    dataBase64: buf.toString("base64"),
  };
}

/** Prefer magic bytes from decoded payload, then format label (png/jpeg/…). */
export function mimeTypeForSnapshotBase64(base64: string, formatLabel: string): string {
  const magic = sniffImageMagic(Buffer.from(base64, "base64"));
  return magic?.mime ?? mimeFromSnapshotLabel(formatLabel);
}
