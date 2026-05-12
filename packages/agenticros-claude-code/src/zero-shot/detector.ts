/**
 * Zero-shot object detector using OWL-v2 via @huggingface/transformers.
 *
 * Accepts arbitrary text prompts at runtime ("person", "person in red shirt",
 * "stroller", "bottle on the table") and returns bounding boxes for any
 * region that matches. Truly open-vocabulary — no class list baked in.
 *
 * Model: Xenova/owlv2-base-patch16-finetuned (downloaded on first use,
 * cached under ~/.cache/huggingface). Override with AGENTICROS_OWLV2_MODEL.
 */

import sharp from "sharp";
import {
  pipeline,
  RawImage,
  type ZeroShotObjectDetectionPipeline,
} from "@huggingface/transformers";

const DEFAULT_MODEL = "Xenova/owlv2-base-patch16-finetuned";

export interface ZeroShotDetection {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export interface ZeroShotDetectOptions {
  threshold?: number;
  topK?: number;
}

export class ZeroShotDetector {
  private detector: ZeroShotObjectDetectionPipeline | null = null;
  private loading: Promise<void> | null = null;
  private readonly modelId: string;

  constructor(modelId?: string) {
    this.modelId =
      modelId ??
      (process.env["AGENTICROS_OWLV2_MODEL"]?.trim() || DEFAULT_MODEL);
  }

  async load(): Promise<void> {
    if (this.detector) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      process.stderr.write(
        `[AgenticROS] zero-shot: loading ${this.modelId} (first run downloads ~150 MB)…\n`,
      );
      this.detector = (await pipeline(
        "zero-shot-object-detection",
        this.modelId,
        { dtype: "q8" },
      )) as unknown as ZeroShotObjectDetectionPipeline;
      process.stderr.write(`[AgenticROS] zero-shot: model ready\n`);
    })();
    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  async detectByText(
    image: Buffer | Uint8Array,
    prompts: string[],
    opts: ZeroShotDetectOptions = {},
  ): Promise<{ width: number; height: number; detections: ZeroShotDetection[] }> {
    if (!this.detector) await this.load();
    if (prompts.length === 0) return { width: 0, height: 0, detections: [] };

    const decoded = await sharp(image)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = decoded.info.width;
    const h = decoded.info.height;
    const rawImg = new RawImage(new Uint8Array(decoded.data), w, h, 3);

    const pipelineOpts: { threshold: number; top_k?: number } = {
      threshold: opts.threshold ?? 0.1,
    };
    if (opts.topK != null) pipelineOpts.top_k = opts.topK;
    const out = await this.detector!(rawImg, prompts, pipelineOpts);

    // Single-image input → Array<{label, score, box}>; the pipeline returns the
    // batched form only for batched input. Normalize defensively.
    const raw = Array.isArray(out) && Array.isArray((out as unknown[])[0])
      ? (out as unknown[][])[0]!
      : (out as unknown[]);

    const detections: ZeroShotDetection[] = (raw as Array<{
      label: string;
      score: number;
      box: { xmin: number; ymin: number; xmax: number; ymax: number };
    }>).map((d) => {
      const width = d.box.xmax - d.box.xmin;
      const height = d.box.ymax - d.box.ymin;
      return {
        label: d.label,
        confidence: d.score,
        x: d.box.xmin,
        y: d.box.ymin,
        width,
        height,
        cx: d.box.xmin + width / 2,
        cy: d.box.ymin + height / 2,
      };
    });

    return { width: w, height: h, detections };
  }

  async dispose(): Promise<void> {
    if (this.detector) {
      await this.detector.dispose();
      this.detector = null;
    }
  }
}
