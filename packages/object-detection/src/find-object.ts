/**
 * Rotate the robot in place until a target COCO class is detected in the
 * camera feed, then stop. Used by the ros2_find_object MCP tool.
 */

import type { AgenticROSConfig, ResolvedRobot, RosTransport } from "@agenticros/core";
import { resolveCameraSubscribeTopic, toNamespacedTopic, resolveSafetyForRobot } from "@agenticros/core";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  ROS_MSG_IMAGE,
  cameraSnapshotFromPlainMessage,
} from "@agenticros/ros-camera";
import { PersonDetector } from "./detector.js";
import { resolveCocoClassId, COCO_CLASSES } from "./coco-classes.js";

const DEFAULT_COLOR_TOPIC = "/camera/camera/color/image_raw/compressed";
const DEFAULT_ANGULAR_SPEED = 0.3; // rad/s
const DEFAULT_TIMEOUT_SEC = 30;
const DEFAULT_MIN_CONFIDENCE = 0.5;
const SNAPSHOT_TIMEOUT_MS = 3000;
// Rotation is done as discrete stop-and-look steps rather than continuous
// spin-while-sampling: at typical robot rotation speeds, a frame grabbed
// mid-turn is motion-blurred enough to crush YOLO confidence well below a
// usable threshold, even for objects that score fine in a static frame.
const STEP_DEGREES = 30;
const BURST_REPUBLISH_MS = 150; // cmd_vel watchdogs on this robot expire quickly; keep resending during a turn
const SETTLE_MS = 350; // let residual motion damp out before capturing

export interface FindObjectOptions {
  target: string;
  angularSpeed?: number;
  timeoutSeconds?: number;
  minConfidence?: number;
  clockwise?: boolean;
  /** When aborted, stop rotating and return found:false. */
  signal?: AbortSignal;
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
  robot: ResolvedRobot,
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

  const safety = resolveSafetyForRobot(config, robot);
  const maxAngular = safety.maxAngularVelocity;
  const requestedSpeed = Math.max(0.05, Math.min(maxAngular, opts.angularSpeed ?? DEFAULT_ANGULAR_SPEED));
  const clockwise = opts.clockwise ?? true;
  const angularZ = clockwise ? -requestedSpeed : requestedSpeed;
  const timeoutMs = Math.max(1000, (opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SEC) * 1000);
  const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  const detector = new PersonDetector({ scoreThreshold: minConfidence });
  await detector.load();

  const cmdVelTopic = resolveCmdVelTopic(config, robot);
  const colorTopic = resolveCameraSubscribeTopic(
    robot.namespace,
    robot.cameraTopic.trim() || DEFAULT_COLOR_TOPIC,
  );
  // robot.cameraTopic in config is often the *raw* topic (no /compressed
  // suffix) — subscribing with a hardcoded CompressedImage type against a
  // raw Image topic silently never receives a message (type mismatch), so
  // every scan times out with zero frames captured. Detect from the topic
  // name, same as the ros2_camera_snapshot tool does.
  const isCompressed = colorTopic.toLowerCase().includes("compressed");

  const startedAt = Date.now();
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

  // Burst duration to cover STEP_DEGREES at the requested angular speed.
  const stepBurstMs = ((STEP_DEGREES * Math.PI) / 180 / requestedSpeed) * 1000;

  try {
    const deadline = startedAt + timeoutMs;
    // Look once at the current heading before turning anywhere.
    let firstLook = true;
    while (Date.now() < deadline && !result) {
      if (opts.signal?.aborted) break;

      if (!firstLook) {
        const stepDeadline = Date.now() + stepBurstMs;
        while (Date.now() < stepDeadline) {
          if (opts.signal?.aborted) break;
          await publishTwist(0, angularZ);
          await sleep(Math.min(BURST_REPUBLISH_MS, Math.max(0, stepDeadline - Date.now())));
        }
        await publishTwist(0, 0);
        if (opts.signal?.aborted) break;
        await sleep(SETTLE_MS);
      }
      firstLook = false;

      const frame = await snapshotOnce(transport, colorTopic, isCompressed).catch(() => null);
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
    }
  } finally {
    await publishTwist(0, 0);
    await detector.dispose().catch(() => {});
  }

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  if (opts.signal?.aborted && !result) {
    return {
      found: false,
      target: opts.target,
      classId,
      elapsedSeconds,
      rotationDirection: clockwise ? "clockwise" : "counterclockwise",
      angularSpeed: requestedSpeed,
      error: "Cancelled",
    };
  }
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
  isCompressed: boolean,
): Promise<{ buffer: Buffer } | null> {
  const rosType = isCompressed ? ROS_MSG_COMPRESSED_IMAGE : ROS_MSG_IMAGE;
  const messageType = isCompressed ? "CompressedImage" : "Image";
  return new Promise((resolve) => {
    const sub = transport.subscribe(
      { topic, type: rosType },
      (msg: Record<string, unknown>) => {
        clearTimeout(timer);
        sub.unsubscribe();
        try {
          const payload = cameraSnapshotFromPlainMessage(messageType, msg);
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
