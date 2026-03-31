/**
 * Sample distance (meters) from a ROS2 depth image topic.
 * Same logic as OpenClaw and Claude Code adapters.
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
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
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

export async function getDepthDistance(
  transport: RosTransport,
  topic: string,
  timeoutMs = 5000,
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
