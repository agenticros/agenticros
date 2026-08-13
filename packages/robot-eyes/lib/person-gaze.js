/**
 * Pure helpers for idle person-follow gaze.
 *
 * Maps a YOLO person bbox to canvas pupil targets in [-1, 1]. Does not
 * import @agenticros/object-detection — callers load that opportunistically.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const GAZE_GAIN = 1.75;
/** Aim this far down from the top of the person bbox (head, not torso). */
export const FACE_FROM_TOP = 0.22;

export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/** Same lookup as @agenticros/object-detection PersonDetector. */
export function yolov8ModelPath() {
  const fromEnv = process.env.AGENTICROS_YOLOV8_MODEL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return path.join(os.homedir(), ".agenticros", "models", "yolov8n.onnx");
}

export function yolov8ModelExists() {
  const modelPath = yolov8ModelPath();
  try {
    return fs.existsSync(modelPath) && fs.statSync(modelPath).size > 1_000_000;
  } catch {
    return false;
  }
}

/**
 * @param {Array<{ width: number, height: number }> | null | undefined} persons
 * @returns {object | null}
 */
export function pickLargestPerson(persons) {
  if (!persons || persons.length === 0) return null;
  return persons.reduce((best, p) =>
    p.width * p.height > best.width * best.height ? p : best,
  );
}

/**
 * JPEG/PNG bytes from a sensor_msgs/CompressedImage plain object (rclnodejs).
 * @param {unknown} msg
 * @returns {Buffer | null}
 */
export function jpegFromCompressed(msg) {
  if (!msg || typeof msg !== "object") return null;
  const data = /** @type {{ data?: unknown }} */ (msg).data;
  if (data == null) return null;
  if (Buffer.isBuffer(data)) return data.length > 0 ? data : null;
  if (data instanceof Uint8Array) {
    return data.byteLength > 0 ? Buffer.from(data) : null;
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(data)) {
    const view = /** @type {ArrayBufferView} */ (data);
    return view.byteLength > 0
      ? Buffer.from(view.buffer, view.byteOffset, view.byteLength)
      : null;
  }
  if (
    typeof data === "object" &&
    data !== null &&
    /** @type {{ type?: string, data?: unknown }} */ (data).type === "Buffer" &&
    Array.isArray(/** @type {{ data?: unknown }} */ (data).data)
  ) {
    const bytes = /** @type {{ data: number[] }} */ (data).data;
    return bytes.length > 0 ? Buffer.from(bytes) : null;
  }
  if (Array.isArray(data)) {
    return data.length > 0 ? Buffer.from(data) : null;
  }
  return null;
}

/**
 * @param {{ x: number, y: number, width: number, height: number, cx?: number, cy?: number }} person
 * @param {number} imgW
 * @param {number} imgH
 * @param {{ gain?: number, faceFromTop?: number }} [opts]
 * @returns {{ gazeX: number, gazeY: number } | null}
 */
export function gazeFromPerson(person, imgW, imgH, opts = {}) {
  if (!person || !(imgW > 0) || !(imgH > 0)) return null;
  const gain = opts.gain ?? GAZE_GAIN;
  const faceFromTop = opts.faceFromTop ?? FACE_FROM_TOP;
  const faceX =
    typeof person.cx === "number" ? person.cx : person.x + person.width / 2;
  const faceY = person.y + person.height * faceFromTop;
  // Camera faces the person, so image +X is the viewer's left. Negate X so the
  // display looks toward the viewer; image +Y (down) already matches canvas +Y.
  return {
    gazeX: clamp(-(faceX / imgW - 0.5) * 2 * gain, -1, 1),
    gazeY: clamp((faceY / imgH - 0.5) * 2 * gain, -1, 1),
  };
}
