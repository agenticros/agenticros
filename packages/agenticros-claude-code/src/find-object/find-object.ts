/**
 * Rotate the robot in place until a target COCO class is detected in the
 * camera feed, then stop. Used by the ros2_find_object MCP tool.
 */

import type { AgenticROSConfig, RosTransport } from "@agenticros/core";
import { resolveCameraSubscribeTopic, toNamespacedTopic } from "@agenticros/core";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  cameraSnapshotFromPlainMessage,
} from "@agenticros/ros-camera";
import { PersonDetector } from "../follow-me/detector.js";
import { resolveCocoClassId, COCO_CLASSES } from "./coco-classes.js";

const DEFAULT_COLOR_TOPIC = "/camera/camera/color/image_raw/compressed";
const DEFAULT_ANGULAR_SPEED = 0.3; // rad/s
const DEFAULT_TIMEOUT_SEC = 30;
const DEFAULT_MIN_CONFIDENCE = 0.5;
const POLL_INTERVAL_MS = 500;
const SNAPSHOT_TIMEOUT_MS = 3000;

export interface FindObjectOptions {
  target: string;
  angularSpeed?: number;
  timeoutSeconds?: number;
  minConfidence?: number;
  clockwise?: boolean;
}

export interface FindObjectResult {
  found: boolean;
  target: string;
  classId: number;
  elapsedSeconds: number;
  rotationDirection: "clockwise" | "counterclockwise";
  angularSpeed: number;
  detection?: {
    confidence: number;
    cx: number;
    cy: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
    horizontalOffset: number;
  };
  error?: string;
}

export async function findObject(
  config: AgenticROSConfig,
  transport: RosTransport,
  opts: FindObjectOptions,
): Promise<FindObjectResult> {
  const classId = resolveCocoClassId(opts.target);
  if (classId === null) {
    return {
      found: false,
      target: opts.target,
      classId: -1,
      elapsedSeconds: 0,
      rotationDirection: "clockwise",
      angularSpeed: 0,
      error:
        `Unknown target "${opts.target}". Must be a COCO class name (e.g., "cell phone", "chair", "bottle"). ` +
        `Supported: ${COCO_CLASSES.join(", ")}.`,
    };
  }

  const safety = config.safety ?? {};
  const maxAngular = safety.maxAngularVelocity ?? 1.5;
  const requestedSpeed = Math.max(0.05, Math.min(maxAngular, opts.angularSpeed ?? DEFAULT_ANGULAR_SPEED));
  const clockwise = opts.clockwise ?? true;
  const angularZ = clockwise ? -requestedSpeed : requestedSpeed;
  const timeoutMs = Math.max(1000, (opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SEC) * 1000);
  const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  const detector = new PersonDetector({ scoreThreshold: minConfidence });
  await detector.load();

  const cmdVelTopic = resolveCmdVelTopic(config);
  const colorTopic = resolveCameraSubscribeTopic(
    config,
    (config.robot?.cameraTopic ?? "").trim() || DEFAULT_COLOR_TOPIC,
  );

  const startedAt = Date.now();
  let rotating = false;
  let result: FindObjectResult["detection"] | undefined;

  const publishTwist = async (linearX: number, angZ: number) => {
    try {
      await transport.publish({
        topic: cmdVelTopic,
        type: "geometry_msgs/msg/Twist",
        msg: { linear: { x: linearX, y: 0, z: 0 }, angular: { x: 0, y: 0, z: angZ } },
      });
    } catch {
      // best-effort; loop will retry
    }
  };

  try {
    await publishTwist(0, angularZ);
    rotating = true;

    const deadline = startedAt + timeoutMs;
    while (Date.now() < deadline && !result) {
      // Keep the rotation alive in case the robot times out cmd_vel commands.
      await publishTwist(0, angularZ);

      const frame = await snapshotOnce(transport, colorTopic).catch(() => null);
      if (frame) {
        const det = await detector.detectClass(frame.buffer, classId);
        if (det.detections.length > 0) {
          const best = det.detections.reduce((a, b) => (a.confidence > b.confidence ? a : b));
          result = {
            confidence: best.confidence,
            cx: best.cx,
            cy: best.cy,
            width: best.width,
            height: best.height,
            imageWidth: det.width,
            imageHeight: det.height,
            horizontalOffset: (best.cx - det.width / 2) / (det.width / 2),
          };
          break;
        }
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await sleep(Math.min(POLL_INTERVAL_MS, remaining));
    }
  } finally {
    if (rotating) await publishTwist(0, 0);
    await detector.dispose().catch(() => {});
  }

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  return {
    found: !!result,
    target: opts.target,
    classId,
    elapsedSeconds,
    rotationDirection: clockwise ? "clockwise" : "counterclockwise",
    angularSpeed: requestedSpeed,
    detection: result,
  };
}

async function snapshotOnce(
  transport: RosTransport,
  topic: string,
): Promise<{ buffer: Buffer } | null> {
  return new Promise((resolve) => {
    const sub = transport.subscribe(
      { topic, type: ROS_MSG_COMPRESSED_IMAGE },
      (msg: Record<string, unknown>) => {
        clearTimeout(timer);
        sub.unsubscribe();
        try {
          const payload = cameraSnapshotFromPlainMessage("CompressedImage", msg);
          resolve({ buffer: Buffer.from(payload.dataBase64, "base64") });
        } catch {
          resolve(null);
        }
      },
    );
    const timer = setTimeout(() => {
      sub.unsubscribe();
      resolve(null);
    }, SNAPSHOT_TIMEOUT_MS);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveCmdVelTopic(config: AgenticROSConfig): string {
  const raw = (config.teleop?.cmdVelTopic ?? "").trim() || "/cmd_vel";
  const namespaced = toNamespacedTopic(config, raw);
  const match = namespaced.match(/^\/([^/]+)\/cmd_vel$/i);
  const segment = match?.[1] ?? "";
  if (match && !segment.toLowerCase().startsWith("robot")) {
    return `/robot${segment.replace(/-/g, "")}/cmd_vel`;
  }
  return namespaced;
}
