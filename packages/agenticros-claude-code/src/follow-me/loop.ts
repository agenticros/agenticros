/**
 * In-process follow-me loop. Subscribes to color + depth, runs YOLOv8n person
 * detection, computes a Twist via FollowerController, and publishes cmd_vel.
 *
 * This is the `mode: 'local'` alternative to the agenticros_follow_me ROS2 node.
 */

import type {
  AgenticROSConfig,
  ResolvedRobot,
  RosTransport,
  Subscription,
} from "@agenticros/core";
import { resolveCameraSubscribeTopic, toNamespacedTopic } from "@agenticros/core";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  ROS_MSG_IMAGE,
  cameraSnapshotFromPlainMessage,
  coerceRosImageDataToBuffer,
  normalizeDepthImageEncoding,
  rosBoolField,
  rosNumericField,
  rosStringField,
} from "@agenticros/ros-camera";
import { PersonDetector, type PersonDetection } from "./detector.js";
import { FollowerController, type Twist } from "./controller.js";

const DEFAULT_COLOR_TOPIC = "/camera/camera/color/image_raw/compressed";
const DEFAULT_DEPTH_TOPIC = "/camera/camera/depth/image_rect_raw";
const DEFAULT_HORIZONTAL_FOV_RAD = 1.20428; // RealSense D435 color HFOV ≈ 69°
const TICK_HZ = 8;

export interface FollowMeLocalStatus {
  enabled: boolean;
  tracking: boolean;
  targetDistance: number;
  targetDescription: string | null;
  personCount: number;
  lastPerson: { x: number; z: number; confidence: number } | null;
  lastTwist: Twist;
  lastError: string | null;
  framesProcessed: number;
  detectionsSinceStart: number;
}

export interface StartOptions {
  targetDescription?: string;
}

interface LatestFrame {
  buffer: Buffer;
  receivedAt: number;
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

export class FollowMeLocal {
  private readonly detector = new PersonDetector();
  private readonly controller = new FollowerController();
  private enabled = false;
  private running = false;
  private targetDescription: string | null = null;
  private colorSub: Subscription | null = null;
  private depthSub: Subscription | null = null;
  private latestColor: LatestFrame | null = null;
  private latestDepth: LatestDepth | null = null;
  private tickHandle: NodeJS.Timeout | null = null;
  private lastError: string | null = null;
  private framesProcessed = 0;
  private detectionsSinceStart = 0;
  private lastPerson: { x: number; z: number; confidence: number } | null = null;
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
    await this.detector.load();
    this.subscribeFrames();
    this.enabled = true;
    this.tickHandle = setInterval(() => this.tickSafe(), 1000 / TICK_HZ);
  }

  async stop(): Promise<void> {
    this.enabled = false;
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    this.unsubscribeFrames();
    this.controller.reset();
    this.tracking = false;
    this.lastPerson = null;
    await this.publishStop();
  }

  setTargetDistance(d: number): void {
    this.controller.setTargetDistance(d);
  }

  setTargetDescription(description: string): void {
    this.targetDescription = description.trim() || null;
  }

  status(): FollowMeLocalStatus {
    return {
      enabled: this.enabled,
      tracking: this.tracking,
      targetDistance: this.controller.config.targetDistance,
      targetDescription: this.targetDescription,
      personCount: this.lastPerson ? 1 : 0,
      lastPerson: this.lastPerson,
      lastTwist: this.controller.getLastTwist(),
      lastError: this.lastError,
      framesProcessed: this.framesProcessed,
      detectionsSinceStart: this.detectionsSinceStart,
    };
  }

  private subscribeFrames(): void {
    const colorTopicRaw = this.robot.cameraTopic.trim() || DEFAULT_COLOR_TOPIC;
    const colorTopic = resolveCameraSubscribeTopic(this.robot.namespace, colorTopicRaw);
    const depthTopic = resolveCameraSubscribeTopic(this.robot.namespace, DEFAULT_DEPTH_TOPIC);
    const isCompressed = colorTopic.includes("compressed");

    this.colorSub = this.transport.subscribe(
      { topic: colorTopic, type: isCompressed ? ROS_MSG_COMPRESSED_IMAGE : ROS_MSG_IMAGE },
      (msg) => {
        try {
          const payload = cameraSnapshotFromPlainMessage(isCompressed ? "CompressedImage" : "Image", msg);
          const buf = Buffer.from(payload.dataBase64, "base64");
          this.latestColor = { buffer: buf, receivedAt: Date.now() };
        } catch (err) {
          this.lastError = `color decode: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    );

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
          this.latestDepth = { width, height, step, encoding, isBigEndian, data, receivedAt: Date.now() };
        } catch (err) {
          this.lastError = `depth decode: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    );
  }

  private unsubscribeFrames(): void {
    this.colorSub?.unsubscribe();
    this.depthSub?.unsubscribe();
    this.colorSub = null;
    this.depthSub = null;
    this.latestColor = null;
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
    const color = this.latestColor;
    if (!color) return; // wait for first frame
    if (Date.now() - color.receivedAt > 2000) {
      // stale → controller watchdog handles cmd_vel zeroing
      const twist = this.controller.update(null);
      await this.publishTwist(twist);
      this.tracking = false;
      return;
    }

    this.framesProcessed += 1;
    const det = await this.detector.detect(color.buffer);
    const persons = det.persons;
    if (persons.length === 0) {
      this.tracking = false;
      this.lastPerson = null;
      const twist = this.controller.update(null);
      await this.publishTwist(twist);
      return;
    }

    // Pick the largest bounding box (closest person). target_description is parsed but not
    // semantically matched yet — re-identification by description requires a CLIP-style model.
    const target = pickTarget(persons);
    const sample = this.projectTo3D(target, det.width, det.height);
    if (!sample) {
      this.tracking = false;
      const twist = this.controller.update(null);
      await this.publishTwist(twist);
      return;
    }

    this.tracking = true;
    this.detectionsSinceStart += 1;
    this.lastPerson = { x: sample.x, z: sample.z, confidence: target.confidence };
    const twist = this.controller.update(sample);
    await this.publishTwist(twist);
  }

  private projectTo3D(
    person: PersonDetection,
    imgW: number,
    imgH: number,
  ): { x: number; z: number; confidence: number } | null {
    const depth = this.latestDepth;
    if (!depth || Date.now() - depth.receivedAt > 2000) return null;

    // Map person centre from color-image space to depth-image space (assumes both share FOV
    // and aspect ratio; RealSense color/depth are aligned closely enough for this).
    const u = (person.cx / imgW) * depth.width;
    const v = (person.cy / imgH) * depth.height;
    const sampleHalf = Math.max(4, Math.floor(Math.min(person.width, person.height) * 0.1 *
      (depth.width / imgW) * 0.5));
    const x0 = Math.max(0, Math.floor(u - sampleHalf));
    const x1 = Math.min(depth.width, Math.floor(u + sampleHalf));
    const y0 = Math.max(0, Math.floor(v - sampleHalf));
    const y1 = Math.min(depth.height, Math.floor(v + sampleHalf));
    const samples = sampleDepthRegion(depth, x0, y0, x1, y1);
    if (samples.length === 0) return null;

    samples.sort((a, b) => a - b);
    // Use the 25th percentile to bias toward the person surface (not background bleed).
    const z = samples[Math.floor(samples.length * 0.25)] ?? samples[0]!;
    if (!Number.isFinite(z) || z <= 0) return null;

    // Lateral offset from horizontal FOV. Image-centre is 0; right is positive x.
    const normX = person.cx / imgW - 0.5;
    const x = z * Math.tan(normX * DEFAULT_HORIZONTAL_FOV_RAD);
    return { x, z, confidence: person.confidence };
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

function pickTarget(persons: PersonDetection[]): PersonDetection {
  return persons.reduce((best, p) => (p.width * p.height > best.width * best.height ? p : best));
}

function sampleDepthRegion(d: LatestDepth, x0: number, y0: number, x1: number, y1: number): number[] {
  // Reuse sampleDepthMeters by passing a custom center-fraction. Easier: inline a copy of the
  // 16UC1/32FC1 decode here for an arbitrary rect.
  const out: number[] = [];
  if (d.encoding === "16UC1") {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const off = y * d.step + x * 2;
        if (off + 2 > d.data.length) continue;
        const lo = d.data[off]!;
        const hi = d.data[off + 1]!;
        const v = d.isBigEndian ? (lo << 8) | hi : (hi << 8) | lo;
        if (v > 0) out.push(v / 1000);
      }
    }
  } else if (d.encoding === "32FC1") {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const off = y * d.step + x * 4;
        if (off + 4 > d.data.length) continue;
        const v = new DataView(d.data.buffer, d.data.byteOffset + off, 4).getFloat32(0, !d.isBigEndian);
        if (Number.isFinite(v) && v > 0) out.push(v);
      }
    }
  }
  return out;
}

function resolveCmdVelTopic(config: AgenticROSConfig, robot: ResolvedRobot): string {
  const raw = (config.teleop?.cmdVelTopic ?? "").trim() || "/cmd_vel";
  const namespaced = toNamespacedTopic(robot.namespace, raw);
  // Apply same uuid → robot<uuid-no-dashes> rewrite as ros2_publish handler.
  const match = namespaced.match(/^\/([^/]+)\/cmd_vel$/i);
  const segment = match?.[1] ?? "";
  if (match && !segment.toLowerCase().startsWith("robot")) {
    return `/robot${segment.replace(/-/g, "")}/cmd_vel`;
  }
  return namespaced;
}

/**
 * Per-robot registry. Each robot gets its own `FollowMeLocal` instance (with
 * its own YOLO detector + camera subs) the first time anyone asks for one.
 * Multi-robot Phase 1.d-extend.
 */
const instances = new Map<string, FollowMeLocal>();

export function getFollowMeLocal(
  robot: ResolvedRobot,
  config: AgenticROSConfig,
  transport: RosTransport,
): FollowMeLocal {
  let entry = instances.get(robot.id);
  if (!entry) {
    entry = new FollowMeLocal(robot, config, transport);
    instances.set(robot.id, entry);
  }
  return entry;
}

/** Test-only: clear the registry so suites can run in isolation. */
export function _resetFollowMeLocalRegistry(): void {
  instances.clear();
}
