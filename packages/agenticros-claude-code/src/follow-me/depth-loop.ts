/**
 * Depth-only follow-me loop (no neural net).
 *
 * Subscribes only to a depth image topic (sensor_msgs/Image, 16UC1 mm or 32FC1 m),
 * picks the closest "person-like" blob in front of the robot, and drives toward
 * it using the same FollowerController as the YOLO loop.
 *
 * Why this exists: the YOLO-based local loop needs a yolov8n.onnx file and
 * onnxruntime-node, both of which can be unavailable on a freshly-flashed robot
 * (no ONNX hosted publicly anymore, no working torch on some Jetson images).
 * Depth-only follow needs only the depth stream — perfect for unblocking the
 * skill when the camera publishes depth but no person detector is wired up.
 *
 * Accuracy note: this picks the closest contiguous depth region in front of the
 * camera. It works well in uncluttered indoor space with a single person, and
 * deliberately ignores anything outside the [minPersonDepth, maxPersonDepth] band
 * so floor/ceiling/back wall don't capture the controller. It does *not*
 * recognise people semantically — if you walk behind a chair, it may follow the
 * chair. Use mode='local' (YOLO) once yolov8n.onnx is available for real
 * person re-identification.
 */

import type {
  AgenticROSConfig,
  ResolvedRobot,
  RosTransport,
  Subscription,
} from "@agenticros/core";
import { resolveCameraSubscribeTopic, toNamespacedTopic } from "@agenticros/core";
import {
  ROS_MSG_IMAGE,
  coerceRosImageDataToBuffer,
  normalizeDepthImageEncoding,
  rosBoolField,
  rosNumericField,
  rosStringField,
} from "@agenticros/ros-camera";
import { FollowerController, type Twist } from "./controller.js";

const DEFAULT_DEPTH_TOPIC = "/camera/camera/depth/image_rect_raw";
/** RealSense D435/D455 depth HFOV ≈ 87°. Used to convert image-x to lateral metres. */
const DEFAULT_DEPTH_HORIZONTAL_FOV_RAD = 1.5184;
const TICK_HZ = 8;

/** Depth band considered a person (avoids floor/ceiling/back-wall lock-on). */
const MIN_PERSON_DEPTH_M = 0.5;
const MAX_PERSON_DEPTH_M = 4.0;
/** Crop to a central band of the image so the floor and ceiling don't dominate. */
const ROI_X_LO = 0.15;
const ROI_X_HI = 0.85;
const ROI_Y_LO = 0.30;
const ROI_Y_HI = 0.95;
/** Coarse grid for blob picking (W_CELLS × H_CELLS). Cheap, fast, robust. */
const W_CELLS = 16;
const H_CELLS = 12;
/** Minimum fraction of valid in-band pixels in a cell for it to count. */
const MIN_CELL_FILL = 0.20;

export interface FollowMeDepthStatus {
  enabled: boolean;
  tracking: boolean;
  targetDistance: number;
  /** Recorded but not used (depth mode has no semantic recognition). */
  targetDescription: string | null;
  lastTarget: { x: number; z: number; cellsInBlob: number } | null;
  lastTwist: Twist;
  lastError: string | null;
  framesProcessed: number;
  detectionsSinceStart: number;
}

export interface StartOptions {
  targetDescription?: string;
}

interface LatestDepth {
  width: number;
  height: number;
  step: number;
  encoding: string;
  isBigEndian: boolean;
  data: Uint8Array;
  receivedAt: number;
}

export class FollowMeDepth {
  private readonly controller = new FollowerController();
  private enabled = false;
  private running = false;
  private targetDescription: string | null = null;
  private depthSub: Subscription | null = null;
  private latestDepth: LatestDepth | null = null;
  private tickHandle: NodeJS.Timeout | null = null;
  private lastError: string | null = null;
  private framesProcessed = 0;
  private detectionsSinceStart = 0;
  private lastTarget: { x: number; z: number; cellsInBlob: number } | null = null;
  private tracking = false;

  constructor(
    private readonly robot: ResolvedRobot,
    private readonly config: AgenticROSConfig,
    private readonly transport: RosTransport,
  ) {}

  /** Stable id of the robot this loop is bound to. Used by the registry below. */
  get robotId(): string {
    return this.robot.id;
  }

  async start(opts: StartOptions = {}): Promise<void> {
    if (this.enabled) return;
    this.lastError = null;
    this.framesProcessed = 0;
    this.detectionsSinceStart = 0;
    this.targetDescription = opts.targetDescription?.trim() || null;
    this.controller.reset();
    this.subscribeDepth();
    this.enabled = true;
    this.tickHandle = setInterval(() => this.tickSafe(), 1000 / TICK_HZ);
  }

  async stop(): Promise<void> {
    this.enabled = false;
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    this.unsubscribeDepth();
    this.controller.reset();
    this.tracking = false;
    this.lastTarget = null;
    await this.publishStop();
  }

  setTargetDistance(d: number): void {
    this.controller.setTargetDistance(d);
  }

  setTargetDescription(description: string): void {
    this.targetDescription = description.trim() || null;
  }

  status(): FollowMeDepthStatus {
    return {
      enabled: this.enabled,
      tracking: this.tracking,
      targetDistance: this.controller.config.targetDistance,
      targetDescription: this.targetDescription,
      lastTarget: this.lastTarget,
      lastTwist: this.controller.getLastTwist(),
      lastError: this.lastError,
      framesProcessed: this.framesProcessed,
      detectionsSinceStart: this.detectionsSinceStart,
    };
  }

  private subscribeDepth(): void {
    const depthTopic = resolveCameraSubscribeTopic(this.robot.namespace, DEFAULT_DEPTH_TOPIC);
    this.depthSub = this.transport.subscribe(
      { topic: depthTopic, type: ROS_MSG_IMAGE },
      (msg) => {
        try {
          const encoding = normalizeDepthImageEncoding(rosStringField(msg.encoding, "16UC1"));
          const width = rosNumericField(msg.width, "width");
          const height = rosNumericField(msg.height, "height");
          const bpp = encoding === "32FC1" ? 4 : 2;
          const step =
            msg.step != null && msg.step !== "" ? rosNumericField(msg.step, "step") : width * bpp;
          const isBigEndian = rosBoolField(msg.is_bigendian);
          const data = new Uint8Array(coerceRosImageDataToBuffer(msg.data));
          this.latestDepth = {
            width,
            height,
            step,
            encoding,
            isBigEndian,
            data,
            receivedAt: Date.now(),
          };
        } catch (err) {
          this.lastError = `depth decode: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    );
  }

  private unsubscribeDepth(): void {
    this.depthSub?.unsubscribe();
    this.depthSub = null;
    this.latestDepth = null;
  }

  private async tickSafe(): Promise<void> {
    if (this.running || !this.enabled) return;
    this.running = true;
    try {
      await this.tick();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      this.running = false;
    }
  }

  private async tick(): Promise<void> {
    const depth = this.latestDepth;
    if (!depth) return; // wait for first frame

    this.framesProcessed += 1;

    if (Date.now() - depth.receivedAt > 2000) {
      // Stale depth → null target → controller watchdog zeroes velocity.
      this.tracking = false;
      this.lastTarget = null;
      const twist = this.controller.update(null);
      await this.publishTwist(twist);
      return;
    }

    const blob = findClosestPersonBlob(depth);
    if (!blob) {
      this.tracking = false;
      this.lastTarget = null;
      const twist = this.controller.update(null);
      await this.publishTwist(twist);
      return;
    }

    // Convert centroid column to lateral metres using depth HFOV.
    const normX = blob.cx / depth.width - 0.5;
    const x = blob.z * Math.tan(normX * DEFAULT_DEPTH_HORIZONTAL_FOV_RAD);

    this.tracking = true;
    this.detectionsSinceStart += 1;
    this.lastTarget = { x, z: blob.z, cellsInBlob: blob.cellsInBlob };
    const twist = this.controller.update({ x, z: blob.z, confidence: 1.0 });
    await this.publishTwist(twist);
  }

  private async publishTwist(twist: Twist): Promise<void> {
    const topic = resolveCmdVelTopic(this.config, this.robot);
    const message = {
      linear: { x: twist.linearX, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: twist.angularZ },
    };
    try {
      await this.transport.publish({ topic, type: "geometry_msgs/msg/Twist", msg: message });
    } catch (err) {
      this.lastError = `cmd_vel publish: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  private async publishStop(): Promise<void> {
    await this.publishTwist({ linearX: 0, angularZ: 0 });
  }
}

/**
 * Coarse grid blob finder.
 *
 * Splits the central ROI of the depth image into a small grid, computes a
 * median depth per cell from pixels in the person-band [MIN_PERSON_DEPTH_M,
 * MAX_PERSON_DEPTH_M], then chooses the connected component (4-neighbour) with
 * the closest median that meets a minimum size threshold. Returns the centroid
 * in pixel space and the blob's median depth in metres.
 *
 * Trade-offs:
 *   - Cheap O(W·H) median per cell with a fixed-size sampling sort.
 *   - Coarse grid (16×12 ≈ 192 cells) ⇒ very robust to noise; sub-cell
 *     precision is not needed for a P-controller that drives at ≤0.5 m/s.
 *   - 4-connectivity gives natural "find one person blob" behaviour without a
 *     full image-level flood fill.
 */
export function findClosestPersonBlob(
  d: LatestDepth,
): { cx: number; cy: number; z: number; cellsInBlob: number } | null {
  const W = d.width;
  const H = d.height;
  const xLo = Math.floor(W * ROI_X_LO);
  const xHi = Math.floor(W * ROI_X_HI);
  const yLo = Math.floor(H * ROI_Y_LO);
  const yHi = Math.floor(H * ROI_Y_HI);
  if (xHi <= xLo || yHi <= yLo) return null;

  const cellW = (xHi - xLo) / W_CELLS;
  const cellH = (yHi - yLo) / H_CELLS;
  if (cellW < 2 || cellH < 2) return null;

  // depth[i] = median metres for cell i (-1 = "no valid pixels", Infinity = "below fill threshold")
  const cellMedian = new Float32Array(W_CELLS * H_CELLS).fill(-1);

  // Pre-allocated sample buffer reused per cell.
  const maxSamplesPerCell = Math.max(8, Math.floor(cellW * cellH));
  const sampleBuf = new Float32Array(maxSamplesPerCell);

  for (let cy = 0; cy < H_CELLS; cy++) {
    const y0 = yLo + Math.floor(cy * cellH);
    const y1 = yLo + Math.floor((cy + 1) * cellH);
    for (let cx = 0; cx < W_CELLS; cx++) {
      const x0 = xLo + Math.floor(cx * cellW);
      const x1 = xLo + Math.floor((cx + 1) * cellW);
      const inBandCount = sampleCellBand(d, x0, y0, x1, y1, sampleBuf);
      const totalCellPx = (x1 - x0) * (y1 - y0);
      if (inBandCount >= totalCellPx * MIN_CELL_FILL && inBandCount >= 4) {
        // Median via in-place partial sort (n is small enough that JS sort is fine).
        const subset = sampleBuf.subarray(0, inBandCount).slice().sort();
        cellMedian[cy * W_CELLS + cx] = subset[subset.length >> 1]!;
      }
    }
  }

  // Connected components on cells that have a valid median. Choose component with
  // smallest min-depth (a heavier component beats a singleton even if slightly farther).
  const visited = new Uint8Array(W_CELLS * H_CELLS);
  let bestZ = Infinity;
  let bestCx = -1;
  let bestCy = -1;
  let bestSize = 0;
  const stack: number[] = [];
  for (let i = 0; i < cellMedian.length; i++) {
    if (visited[i] || cellMedian[i]! < 0) continue;
    let sumX = 0;
    let sumY = 0;
    let sumWeight = 0;
    let minZInComp = Infinity;
    let compSize = 0;
    stack.length = 0;
    stack.push(i);
    while (stack.length) {
      const idx = stack.pop()!;
      if (visited[idx]) continue;
      visited[idx] = 1;
      const z = cellMedian[idx]!;
      if (z < 0) continue;
      const ix = idx % W_CELLS;
      const iy = (idx - ix) / W_CELLS;
      const px = xLo + (ix + 0.5) * cellW;
      const py = yLo + (iy + 0.5) * cellH;
      // Weight nearer cells more heavily so a few outlier cells far back don't drag the centroid.
      const w = 1 / Math.max(z, 0.2);
      sumX += px * w;
      sumY += py * w;
      sumWeight += w;
      if (z < minZInComp) minZInComp = z;
      compSize += 1;
      // 4-neighbour expansion, gated by depth continuity (≤0.5m step) so a person
      // blob doesn't fuse with a wall behind them.
      const neighbours = [idx - 1, idx + 1, idx - W_CELLS, idx + W_CELLS];
      // Don't wrap on left/right edges.
      if (ix === 0) neighbours[0] = -1;
      if (ix === W_CELLS - 1) neighbours[1] = -1;
      for (const n of neighbours) {
        if (n < 0 || n >= cellMedian.length) continue;
        if (visited[n]) continue;
        const nz = cellMedian[n]!;
        if (nz < 0) continue;
        if (Math.abs(nz - z) <= 0.5) stack.push(n);
      }
    }
    if (compSize >= 2 && minZInComp < bestZ) {
      bestZ = minZInComp;
      bestCx = sumX / sumWeight;
      bestCy = sumY / sumWeight;
      bestSize = compSize;
    }
  }

  if (!Number.isFinite(bestZ) || bestCx < 0) return null;
  return { cx: bestCx, cy: bestCy, z: bestZ, cellsInBlob: bestSize };
}

/**
 * Read pixels from rectangle [x0,y0)–[x1,y1), filter to person-depth band, fill
 * `out` with valid samples in metres. Returns the count written.
 */
function sampleCellBand(
  d: LatestDepth,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  out: Float32Array,
): number {
  let n = 0;
  const cap = out.length;
  if (d.encoding === "16UC1") {
    for (let y = y0; y < y1 && n < cap; y++) {
      for (let x = x0; x < x1 && n < cap; x++) {
        const off = y * d.step + x * 2;
        if (off + 2 > d.data.length) continue;
        const lo = d.data[off]!;
        const hi = d.data[off + 1]!;
        const v = d.isBigEndian ? (lo << 8) | hi : (hi << 8) | lo;
        if (v <= 0) continue;
        const m = v / 1000;
        if (m >= MIN_PERSON_DEPTH_M && m <= MAX_PERSON_DEPTH_M) out[n++] = m;
      }
    }
  } else if (d.encoding === "32FC1") {
    const view = new DataView(d.data.buffer, d.data.byteOffset, d.data.byteLength);
    for (let y = y0; y < y1 && n < cap; y++) {
      for (let x = x0; x < x1 && n < cap; x++) {
        const off = y * d.step + x * 4;
        if (off + 4 > d.data.length) continue;
        const m = view.getFloat32(off, !d.isBigEndian);
        if (!Number.isFinite(m) || m <= 0) continue;
        if (m >= MIN_PERSON_DEPTH_M && m <= MAX_PERSON_DEPTH_M) out[n++] = m;
      }
    }
  }
  return n;
}

function resolveCmdVelTopic(config: AgenticROSConfig, robot: ResolvedRobot): string {
  const raw = (config.teleop?.cmdVelTopic ?? "").trim() || "/cmd_vel";
  const namespaced = toNamespacedTopic(robot.namespace, raw);
  const match = namespaced.match(/^\/([^/]+)\/cmd_vel$/i);
  const segment = match?.[1] ?? "";
  if (match && !segment.toLowerCase().startsWith("robot")) {
    return `/robot${segment.replace(/-/g, "")}/cmd_vel`;
  }
  return namespaced;
}

/**
 * Per-robot registry. Each robot gets its own `FollowMeDepth` instance the
 * first time anyone asks for one — multi-robot Phase 1.d-extend.
 *
 * Keying by `robot.id` (not the namespace string) so two configs that resolve
 * to the same id share the same loop, and a config swap that *changes* the id
 * yields a fresh loop with fresh subscriptions.
 */
const instances = new Map<string, FollowMeDepth>();

export function getFollowMeDepth(
  robot: ResolvedRobot,
  config: AgenticROSConfig,
  transport: RosTransport,
): FollowMeDepth {
  let entry = instances.get(robot.id);
  if (!entry) {
    entry = new FollowMeDepth(robot, config, transport);
    instances.set(robot.id, entry);
  }
  return entry;
}

/** Test-only: clear the registry so suites can run in isolation. */
export function _resetFollowMeDepthRegistry(): void {
  instances.clear();
}
