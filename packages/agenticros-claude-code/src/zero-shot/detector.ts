/**
 * Zero-shot object detector using OWL-v2 via @huggingface/transformers.
 *
 * Accepts arbitrary text prompts at runtime ("person", "person in red shirt",
 * "stroller", "bottle on the table") and returns bounding boxes for any
 * region that matches. Truly open-vocabulary — no class list baked in.
 *
 * Model: Xenova/owlv2-base-patch16-finetuned (downloaded on first use,
 * cached under ~/.cache/huggingface). Override with AGENTICROS_OWLV2_MODEL.
 *
 * Both `@huggingface/transformers` and `sharp` are loaded lazily on first
 * use so a missing optional dep cannot crash MCP server startup — it only
 * surfaces when the user actually calls the zero-shot detector.
 */

// Type-only imports keep the types available at compile time without forcing
// the runtime modules to load when this file is imported.
type TransformersModule = typeof import("@huggingface/transformers");
type SharpFn = (input: Buffer | Uint8Array) => import("sharp").Sharp;
import type {
  ZeroShotObjectDetectionPipeline,
  RawImage as RawImageType,
} from "@huggingface/transformers";

const DEFAULT_MODEL = "Xenova/owlv2-base-patch16-finetuned";

let transformersModule: TransformersModule | null = null;
let sharpFn: SharpFn | null = null;

async function loadDeps(): Promise<{
  transformers: TransformersModule;
  sharp: SharpFn;
}> {
  if (transformersModule && sharpFn) {
    return { transformers: transformersModule, sharp: sharpFn };
  }
  try {
    const [tMod, sharpMod] = await Promise.all([
      import("@huggingface/transformers"),
      import("sharp"),
    ]);
    const tAny = tMod as unknown as { default?: TransformersModule };
    transformersModule = tAny.default ?? (tMod as unknown as TransformersModule);
    const sharpAny = sharpMod as unknown as { default?: SharpFn };
    sharpFn = sharpAny.default ?? (sharpMod as unknown as SharpFn);
  } catch (err) {
    const hint = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Zero-shot detection requires the optional packages '@huggingface/transformers' and 'sharp'. ` +
        `Install them in this workspace (pnpm install) to enable open-vocabulary detection. ` +
        `Underlying error: ${hint}`,
    );
  }
  return { transformers: transformersModule!, sharp: sharpFn! };
}

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
      const { transformers } = await loadDeps();
      process.stderr.write(
        `[AgenticROS] zero-shot: loading ${this.modelId} (first run downloads ~150 MB)…\n`,
      );
      this.detector = (await transformers.pipeline(
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

    const { transformers, sharp: sharpFnLocal } = await loadDeps();

    const decoded = await sharpFnLocal(image)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = decoded.info.width;
    const h = decoded.info.height;
    const rawImg: RawImageType = new transformers.RawImage(
      new Uint8Array(decoded.data),
      w,
      h,
      3,
    );

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
