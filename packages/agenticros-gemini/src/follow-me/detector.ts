/**
 * YOLOv8n person detector for the MCP-side follow-me loop.
 *
 * Loads a YOLOv8n ONNX model and runs person-only detection on a single JPEG/PNG
 * frame. Image decoded with sharp; inference via onnxruntime-node (CPU).
 *
 * Model lookup order:
 *   1. AGENTICROS_YOLOV8_MODEL env var (absolute path)
 *   2. ~/.agenticros/models/yolov8n.onnx
 * If the file is missing it is downloaded from AGENTICROS_YOLOV8_URL (or a default
 * public mirror). 6 MB, one-time.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import http from "node:http";

// Type-only imports keep `ort` / `sharp` types available at compile time
// without forcing the native packages to load when this module is imported.
// The actual runtime modules are loaded lazily in `loadDeps()` so a missing
// native dep cannot crash MCP server startup — it only fails when the user
// actually invokes a detection tool.
type OrtModule = typeof import("onnxruntime-node");
type SharpFn = (input: Buffer | Uint8Array) => import("sharp").Sharp;
import type { InferenceSession as OrtInferenceSession } from "onnxruntime-node";

let ortModule: OrtModule | null = null;
let sharpFn: SharpFn | null = null;

async function loadDeps(): Promise<{ ort: OrtModule; sharp: SharpFn }> {
  if (ortModule && sharpFn) return { ort: ortModule, sharp: sharpFn };
  try {
    const [ortMod, sharpMod] = await Promise.all([
      import("onnxruntime-node"),
      import("sharp"),
    ]);
    // Both packages are CJS; under Node ESM their default export is the real
    // module value. Fall back to the namespace if `.default` is absent.
    const ortAny = ortMod as unknown as { default?: OrtModule };
    ortModule = ortAny.default ?? (ortMod as unknown as OrtModule);
    const sharpAny = sharpMod as unknown as { default?: SharpFn };
    sharpFn = sharpAny.default ?? (sharpMod as unknown as SharpFn);
  } catch (err) {
    const hint = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Local YOLO detection requires the optional packages 'onnxruntime-node' and 'sharp'. ` +
        `Install them in this workspace (pnpm install) to enable follow-me local mode and ros2_find_object. ` +
        `Underlying error: ${hint}`,
    );
  }
  return { ort: ortModule!, sharp: sharpFn! };
}

const DEFAULT_MODEL_URL =
  "https://huggingface.co/Ultralytics/YOLOv8/resolve/main/yolov8n.onnx";

const INPUT_SIZE = 640;
const PERSON_CLASS_ID = 0;

export interface PersonDetection {
  /** Bounding box in original image pixel coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Center of the bbox (image pixels). */
  cx: number;
  cy: number;
  /** Detection confidence [0,1]. */
  confidence: number;
}

export interface DetectorOptions {
  /** Score threshold for filtering raw detections (default 0.4). */
  scoreThreshold?: number;
  /** IoU threshold for NMS (default 0.5). */
  iouThreshold?: number;
}

function resolveModelPath(): string {
  const fromEnv = process.env["AGENTICROS_YOLOV8_MODEL"];
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return path.join(os.homedir(), ".agenticros", "models", "yolov8n.onnx");
}

function downloadFile(url: string, dest: string, redirectsLeft = 5): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.partial`;
    const file = fs.createWriteStream(tmp);
    client
      .get(url, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          file.close();
          fs.unlink(tmp, () => {});
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects downloading ${url}`));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          downloadFile(next, dest, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (status !== 200) {
          file.close();
          fs.unlink(tmp, () => {});
          reject(new Error(`Download failed ${status} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          fs.renameSync(tmp, dest);
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        fs.unlink(tmp, () => {});
        reject(err);
      });
  });
}

async function ensureModel(): Promise<string> {
  const modelPath = resolveModelPath();
  if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 1_000_000) {
    return modelPath;
  }
  const url = process.env["AGENTICROS_YOLOV8_URL"] || DEFAULT_MODEL_URL;
  process.stderr.write(`[AgenticROS] follow-me: downloading YOLOv8n ONNX → ${modelPath}\n`);
  try {
    await downloadFile(url, modelPath);
  } catch (err) {
    const hint = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to download YOLOv8n model from ${url}: ${hint}. ` +
        `Set AGENTICROS_YOLOV8_MODEL to a local path or AGENTICROS_YOLOV8_URL to an accessible mirror.`,
    );
  }
  return modelPath;
}

function iou(a: PersonDetection, b: PersonDetection): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

function nms(detections: PersonDetection[], iouThreshold: number): PersonDetection[] {
  const sorted = detections.slice().sort((a, b) => b.confidence - a.confidence);
  const kept: PersonDetection[] = [];
  for (const d of sorted) {
    if (kept.every((k) => iou(d, k) < iouThreshold)) kept.push(d);
  }
  return kept;
}

export class PersonDetector {
  private session: OrtInferenceSession | null = null;
  private readonly scoreThreshold: number;
  private readonly iouThreshold: number;

  constructor(opts: DetectorOptions = {}) {
    this.scoreThreshold = opts.scoreThreshold ?? 0.4;
    this.iouThreshold = opts.iouThreshold ?? 0.5;
  }

  async load(): Promise<void> {
    if (this.session) return;
    const { ort: ortMod } = await loadDeps();
    const modelPath = await ensureModel();
    this.session = await ortMod.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
    });
  }

  /**
   * Detect people in a JPEG/PNG image buffer.
   *
   * Returns bounding boxes in the original image's pixel space.
   */
  async detect(image: Buffer | Uint8Array): Promise<{ width: number; height: number; persons: PersonDetection[] }> {
    const r = await this.detectClass(image, PERSON_CLASS_ID);
    return { width: r.width, height: r.height, persons: r.detections };
  }

  /**
   * Detect a single COCO class (0..79) in a JPEG/PNG image buffer.
   * 0=person, 67=cell phone, 56=chair, ... see find-object/coco-classes.ts.
   */
  async detectClass(
    image: Buffer | Uint8Array,
    classId: number,
  ): Promise<{ width: number; height: number; detections: PersonDetection[] }> {
    if (!this.session) await this.load();
    const session = this.session!;
    const { ort: ortMod, sharp: sharpFn } = await loadDeps();

    const src = sharpFn(image);
    const meta = await src.metadata();
    const origW = meta.width ?? 0;
    const origH = meta.height ?? 0;
    if (!origW || !origH) {
      throw new Error("Could not read image dimensions from camera frame.");
    }

    // Letterbox resize to INPUT_SIZE × INPUT_SIZE (preserve aspect ratio, pad with gray).
    const scale = Math.min(INPUT_SIZE / origW, INPUT_SIZE / origH);
    const newW = Math.round(origW * scale);
    const newH = Math.round(origH * scale);
    const padX = Math.floor((INPUT_SIZE - newW) / 2);
    const padY = Math.floor((INPUT_SIZE - newH) / 2);

    const { data, info } = await sharpFn(image)
      .resize(newW, newH, { fit: "fill" })
      .extend({
        top: padY,
        bottom: INPUT_SIZE - newH - padY,
        left: padX,
        right: INPUT_SIZE - newW - padX,
        background: { r: 114, g: 114, b: 114 },
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.width !== INPUT_SIZE || info.height !== INPUT_SIZE) {
      throw new Error(`Letterbox produced ${info.width}×${info.height}, expected ${INPUT_SIZE}²`);
    }

    // HWC uint8 → CHW float32 normalized [0,1].
    const pixels = INPUT_SIZE * INPUT_SIZE;
    const input = new Float32Array(3 * pixels);
    for (let i = 0; i < pixels; i++) {
      input[i] = data[i * 3]! / 255;
      input[pixels + i] = data[i * 3 + 1]! / 255;
      input[2 * pixels + i] = data[i * 3 + 2]! / 255;
    }

    const inputName = session.inputNames[0]!;
    const outputName = session.outputNames[0]!;
    const tensor = new ortMod.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    const out = await session.run({ [inputName]: tensor });
    const result = out[outputName]!;
    // YOLOv8 ONNX output: [1, 84, 8400] — 4 box + 80 class scores per anchor.
    const dims = result.dims;
    if (dims.length !== 3 || dims[1] !== 84) {
      throw new Error(`Unexpected YOLOv8 output shape ${dims.join("x")} — expected [1,84,N]`);
    }
    const nAnchors = dims[2]!;
    const arr = result.data as Float32Array;

    const raw: PersonDetection[] = [];
    for (let i = 0; i < nAnchors; i++) {
      const score = arr[(4 + classId) * nAnchors + i]!;
      if (score < this.scoreThreshold) continue;
      const cx = arr[0 * nAnchors + i]!;
      const cy = arr[1 * nAnchors + i]!;
      const w = arr[2 * nAnchors + i]!;
      const h = arr[3 * nAnchors + i]!;
      // Undo letterbox: subtract padding, divide by scale → original-image coordinates.
      const x = (cx - w / 2 - padX) / scale;
      const y = (cy - h / 2 - padY) / scale;
      const ww = w / scale;
      const hh = h / scale;
      raw.push({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(origW - x, ww),
        height: Math.min(origH - y, hh),
        cx: (cx - padX) / scale,
        cy: (cy - padY) / scale,
        confidence: score,
      });
    }

    const detections = nms(raw, this.iouThreshold);
    return { width: origW, height: origH, detections };
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}
