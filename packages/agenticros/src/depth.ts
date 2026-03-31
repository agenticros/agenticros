/**
 * Sample distance (meters) from a ROS2 depth image topic (e.g. RealSense).
 * Supports 16UC1 (depth in mm) and 32FC1 (depth in m).
 */

import type { RosTransport } from "@agenticros/core";
import {
  ROS_MSG_IMAGE,
  coerceRosImageDataToBuffer,
  normalizeDepthImageEncoding,
  rosBoolField,
  rosNumericField,
  rosStringField,
} from "@agenticros/ros-camera";
const DEFAULT_TIMEOUT_MS = 5000;

function depthImageDataBytes(data: unknown): Uint8Array {
  try {
    return new Uint8Array(coerceRosImageDataToBuffer(data));
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    const kind =
      data == null
        ? "null"
        : `${typeof data}${typeof data === "object" && data !== null ? ` (${(data as object).constructor?.name ?? "Object"})` : ""}`;
    throw new Error(`Depth image bytes: ${hint} (data field: ${kind})`);
  }
}

function bytesPerPixelForDepthEncoding(encoding: string): number {
  return normalizeDepthImageEncoding(encoding) === "32FC1" ? 4 : 2;
}

/**
 * Sample center region of a depth image and return median distance in meters.
 * - 16UC1: values in mm (RealSense typical) → divide by 1000
 * - 32FC1: values in m → use as-is
 * Invalid/zero pixels are skipped.
 */
export function sampleDepthMeters(
  width: number,
  height: number,
  step: number,
  encoding: string,
  data: Uint8Array,
  centerFraction = 0.3,
  isBigEndian = false,
): number[] {
  const enc = normalizeDepthImageEncoding(encoding);
  const values: number[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const halfW = Math.max(1, Math.floor((width * centerFraction) / 2));
  const halfH = Math.max(1, Math.floor((height * centerFraction) / 2));
  const x0 = Math.max(0, Math.floor(cx - halfW));
  const x1 = Math.min(width, Math.floor(cx + halfW));
  const y0 = Math.max(0, Math.floor(cy - halfH));
  const y1 = Math.min(height, Math.floor(cy + halfH));

  if (enc === "16UC1") {
    // 2 bytes per pixel, row stride = step
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const off = y * step + x * 2;
        if (off + 2 > data.length) continue;
        const lo = data[off];
        const hi = data[off + 1];
        const v = isBigEndian ? (lo << 8) | hi : (hi << 8) | lo;
        if (v > 0) values.push(v / 1000); // mm -> m
      }
    }
  } else if (enc === "32FC1") {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const off = y * step + x * 4;
        if (off + 4 > data.length) continue;
        const v = new DataView(data.buffer, data.byteOffset + off, 4).getFloat32(0, !isBigEndian);
        if (Number.isFinite(v) && v > 0) values.push(v);
      }
    }
  } else {
    throw new Error(
      `Unsupported depth encoding: "${encoding}" (interpreted as "${enc}"). Use 16UC1/mono16 (mm) or 32FC1 (m).`,
    );
  }
  return values;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return NaN;
  const m = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[m];
  return (sorted[m - 1] + sorted[m]) / 2;
}

/** Sample a vertical band (x0..x1) of the depth image; returns distances in meters. */
function sampleBand(
  width: number,
  height: number,
  step: number,
  encoding: string,
  data: Uint8Array,
  x0: number,
  x1: number,
  heightFraction = 0.5,
  isBigEndian = false,
): number[] {
  const enc = normalizeDepthImageEncoding(encoding);
  const values: number[] = [];
  const cy = height / 2;
  const halfH = Math.max(1, Math.floor((height * heightFraction) / 2));
  const y0 = Math.max(0, Math.floor(cy - halfH));
  const y1 = Math.min(height, Math.floor(cy + halfH));
  const ix0 = Math.max(0, Math.floor(x0));
  const ix1 = Math.min(width, Math.floor(x1));

  if (enc === "16UC1") {
    for (let y = y0; y < y1; y++) {
      for (let x = ix0; x < ix1; x++) {
        const off = y * step + x * 2;
        if (off + 2 > data.length) continue;
        const lo = data[off];
        const hi = data[off + 1];
        const v = isBigEndian ? (lo << 8) | hi : (hi << 8) | lo;
        if (v > 0) values.push(v / 1000);
      }
    }
  } else if (enc === "32FC1") {
    for (let y = y0; y < y1; y++) {
      for (let x = ix0; x < ix1; x++) {
        const off = y * step + x * 4;
        if (off + 4 > data.length) continue;
        const v = new DataView(data.buffer, data.byteOffset + off, 4).getFloat32(0, !isBigEndian);
        if (Number.isFinite(v) && v > 0) values.push(v);
      }
    }
  }
  return values;
}

export interface DepthSectorsResult {
  left_m: number;
  center_m: number;
  right_m: number;
  valid: boolean;
  topic: string;
}

/**
 * Sample left, center, and right thirds of a depth image; return median distance per sector.
 * Used by Follow Me to turn toward the person when not using Ollama.
 */
export async function getDepthSectors(
  transport: RosTransport,
  topic: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<DepthSectorsResult> {
  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const sub = transport.subscribe(
      { topic, type: ROS_MSG_IMAGE },
      (msg: Record<string, unknown>) => {
        clearTimeout(timer);
        sub.unsubscribe();
        resolve(msg);
      },
    );
    const timer = setTimeout(() => {
      sub.unsubscribe();
      reject(
        new Error(
          `Depth sectors timeout on ${topic} (${timeoutMs}ms). No sensor_msgs/Image received—check topic and that it publishes raw depth (not CompressedImage only). With Zenoh, check the gateway log for CDR decode warnings.`,
        ),
      );
    }, timeoutMs);
  });

  const encoding = normalizeDepthImageEncoding(rosStringField(result.encoding, "16UC1"));
  const bpp = bytesPerPixelForDepthEncoding(encoding);
  const width = rosNumericField(result.width, "width");
  const height = rosNumericField(result.height, "height");
  const step =
    result.step != null && result.step !== ""
      ? rosNumericField(result.step, "step")
      : width * bpp;
  const isBigEndian = rosBoolField(result.is_bigendian);
  const data = depthImageDataBytes(result.data);

  const third = width / 3;
  const leftV = sampleBand(width, height, step, encoding, data, 0, third, 0.5, isBigEndian);
  const centerV = sampleBand(width, height, step, encoding, data, third, 2 * third, 0.5, isBigEndian);
  const rightV = sampleBand(width, height, step, encoding, data, 2 * third, width, 0.5, isBigEndian);

  const left_m = median(leftV.slice().sort((a, b) => a - b));
  const center_m = median(centerV.slice().sort((a, b) => a - b));
  const right_m = median(rightV.slice().sort((a, b) => a - b));

  const round = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : NaN);
  const valid = leftV.length > 0 || centerV.length > 0 || rightV.length > 0;

  return {
    left_m: round(left_m),
    center_m: round(center_m),
    right_m: round(right_m),
    valid,
    topic,
  };
}

export interface DepthSampleResult {
  distance_m: number;
  valid: boolean;
  topic: string;
  encoding: string;
  width: number;
  height: number;
  sample_count: number;
  min_m: number;
  max_m: number;
}

/**
 * Subscribe to a depth topic, get one message, sample center region, return median distance in meters.
 */
export async function getDepthDistance(
  transport: RosTransport,
  topic: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<DepthSampleResult> {
  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const sub = transport.subscribe(
      { topic, type: ROS_MSG_IMAGE },
      (msg: Record<string, unknown>) => {
        clearTimeout(timer);
        sub.unsubscribe();
        resolve(msg);
      },
    );
    const timer = setTimeout(() => {
      sub.unsubscribe();
      reject(
        new Error(
          `Depth snapshot timeout on ${topic} (${timeoutMs}ms). No sensor_msgs/Image received—check topic and that it publishes raw depth (not CompressedImage only). With Zenoh, check the gateway log for CDR decode warnings.`,
        ),
      );
    }, timeoutMs);
  });

  const encoding = normalizeDepthImageEncoding(rosStringField(result.encoding, "16UC1"));
  const bpp = bytesPerPixelForDepthEncoding(encoding);
  const width = rosNumericField(result.width, "width");
  const height = rosNumericField(result.height, "height");
  const step =
    result.step != null && result.step !== ""
      ? rosNumericField(result.step, "step")
      : width * bpp;
  const isBigEndian = rosBoolField(result.is_bigendian);
  const data = depthImageDataBytes(result.data);

  const values = sampleDepthMeters(width, height, step, encoding, data, 0.3, isBigEndian);
  const sorted = values.slice().sort((a, b) => a - b);
  const distance_m = median(sorted);
  const min_m = sorted.length ? sorted[0] : NaN;
  const max_m = sorted.length ? sorted[sorted.length - 1] : NaN;

  return {
    distance_m: Math.round(distance_m * 1000) / 1000,
    valid: sorted.length > 0 && Number.isFinite(distance_m),
    topic,
    encoding,
    width,
    height,
    sample_count: sorted.length,
    min_m: Math.round(min_m * 1000) / 1000,
    max_m: Math.round(max_m * 1000) / 1000,
  };
}
