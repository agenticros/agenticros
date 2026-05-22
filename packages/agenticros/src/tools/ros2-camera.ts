import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../plugin-api.js";
import type { AgenticROSConfig } from "@agenticros/core";
import { resolveCameraSubscribeTopic } from "@agenticros/core";
import {
  ROS_MSG_COMPRESSED_IMAGE,
  ROS_MSG_IMAGE,
  cameraSnapshotFromPlainMessage,
  mimeTypeForSnapshotBase64,
  rosNumericField,
} from "@agenticros/ros-camera";
import { getTransport } from "../service.js";
import { normalizePluginToolImageBase64 } from "../plugin-image-base64.js";
import { trimJpegToLastEoi } from "../image-binary-trim.js";
import { storeCameraSnapshot } from "../camera-snapshot-cache.js";
import { describeImageBestEffort } from "../describer.js";

/** Known camera topic patterns for common setups (e.g. RealSense). */
export const REALSENSE_CAMERA_TOPICS = {
  color_compressed: "/camera/camera/color/image_raw/compressed",
  color_raw: "/camera/camera/color/image_raw",
  depth_raw: "/camera/camera/depth/image_rect_raw",
  aligned_depth: "/camera/camera/aligned_depth_to_color/image_raw",
} as const;

/**
 * Register the ros2_camera_snapshot tool with the AI agent.
 * Grabs a single frame from a ROS2 camera topic.
 * Supports CompressedImage (default) and raw Image (e.g. RealSense color/depth).
 */
export function registerCameraTool(api: OpenClawPluginApi, config: AgenticROSConfig): void {
  const describerEnabled = config.describer?.enabled === true;
  const baseDescription =
    "Capture a single image from a ROS2 camera topic. Returns a structured image block for the chat UI (plus a short text summary). " +
    "Use when the user asks what the robot sees or requests a photo. " +
    "Do not paste raw base64 or data: URLs in your reply—describe the scene from the image you receive. " +
    "The tool also embeds an HTTP snapshot link in the text (same kind of URL as teleop) for the chat UI. " +
    "Supports sensor_msgs/CompressedImage (e.g. /camera/image_raw/compressed, optional zstd) and sensor_msgs/Image (raw encodings are encoded to PNG).";
  const describerHint =
    " A `Vision description:` section is appended automatically to the result text when a vision describer is configured; " +
    "treat that paragraph as the authoritative description of what the camera sees and quote/paraphrase it in your reply.";

  api.registerTool({
    name: "ros2_camera_snapshot",
    label: "ROS2 Camera Snapshot",
    description: describerEnabled ? baseDescription + describerHint : baseDescription,
    parameters: Type.Object({
      topic: Type.Optional(
        Type.String({
          description:
            "Camera image topic. Examples: '/camera/image_raw/compressed', RealSense color '/camera/camera/color/image_raw', RealSense depth '/camera/camera/depth/image_rect_raw'. Default: '/camera/image_raw/compressed'.",
        }),
      ),
      message_type: Type.Optional(
        Type.Union(
          [
            Type.Literal("CompressedImage"),
            Type.Literal("Image"),
          ],
          {
            description:
              "Message type: 'CompressedImage' for JPEG/PNG topics (default), 'Image' for raw sensor_msgs/Image (e.g. RealSense color/depth).",
          },
        ),
      ),
      timeout: Type.Optional(Type.Number({ description: "Timeout in milliseconds (default: 10000)" })),
    }),

    async execute(_toolCallId, params) {
      const defaultTopic =
        (config.robot?.cameraTopic ?? "").trim() || "/camera/camera/color/image_raw/compressed";
      const rawTopic = (params["topic"] as string | undefined) ?? defaultTopic;
      const topic = resolveCameraSubscribeTopic(config, rawTopic);
      const rawMsgType = params["message_type"] as string | undefined;
      const messageType: "CompressedImage" | "Image" =
        rawMsgType === "Image" ? "Image" : "CompressedImage";
      const timeout = (params["timeout"] as number | undefined) ?? 10000;

      try {
        const transport = getTransport();
        const typeSel = messageType === "Image" ? ROS_MSG_IMAGE : ROS_MSG_COMPRESSED_IMAGE;

        const result = await new Promise<{
          success: boolean;
          topic: string;
          format: string;
          data: string;
          width?: unknown;
          height?: unknown;
        }>((resolve, reject) => {
          let subscription: { unsubscribe: () => void };
          let timer: ReturnType<typeof setTimeout>;
          try {
            subscription = transport.subscribe({ topic, type: typeSel }, (msg: Record<string, unknown>) => {
              try {
                clearTimeout(timer);
                subscription.unsubscribe();
                const payload = cameraSnapshotFromPlainMessage(messageType, msg);
                resolve({
                  success: true,
                  topic,
                  format: payload.formatLabel,
                  data: payload.dataBase64,
                  width: payload.width,
                  height: payload.height,
                });
              } catch (err) {
                clearTimeout(timer);
                try {
                  subscription.unsubscribe();
                } catch {
                  // ignore
                }
                reject(err instanceof Error ? err : new Error(String(err)));
              }
            });
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
            return;
          }
          timer = setTimeout(() => {
            try {
              subscription.unsubscribe();
            } catch {
              // ignore
            }
            reject(new Error(`Timeout waiting for camera frame on ${topic}`));
          }, timeout);
        });

        const rawB64 = (result.data as string) ?? "";
        let base64 = normalizePluginToolImageBase64(rawB64);
        const formatLabel = String((result.format as string) ?? "jpeg").toLowerCase();
        let mimeType = base64 ? mimeTypeForSnapshotBase64(base64, formatLabel) : "image/jpeg";

        let buf: Buffer | null = base64 ? Buffer.from(base64, "base64") : null;
        if (buf && buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
          buf = trimJpegToLastEoi(buf);
          base64 = buf.toString("base64");
          mimeType = mimeTypeForSnapshotBase64(base64, formatLabel);
        }

        const wNum =
          result.width != null ? rosNumericField(result.width, "width") : undefined;
        const hNum =
          result.height != null ? rosNumericField(result.height, "height") : undefined;
        let summary = `Captured one frame from ${topic}${wNum != null && hNum != null ? ` (${wNum}×${hNum})` : ""}.`;

        let snapshotId: string | undefined;
        const minDecodedBytes = 80;
        const decodedLen = buf ? buf.length : 0;
        if (buf && decodedLen >= minDecodedBytes) {
          try {
            snapshotId = storeCameraSnapshot(buf, mimeType);
          } catch {
            /* ignore oversized / cache errors */
          }
        }
        if (snapshotId) {
          const snapPath = `/plugins/agenticros/camera/snapshot?id=${encodeURIComponent(snapshotId)}`;
          const origin = (process.env.AGENTICROS_GATEWAY_PUBLIC_URL ?? "").trim().replace(/\/$/, "");
          const snapUrl = origin ? `${origin}${snapPath}` : snapPath;
          summary += `\n\n![camera snapshot](${snapUrl})`;
        }

        if (
          config.describer?.enabled === true &&
          base64 &&
          buf &&
          decodedLen >= minDecodedBytes
        ) {
          try {
            const described = await describeImageBestEffort({
              config,
              base64,
              mimeType,
              logger: api.logger,
            });
            if (described) {
              summary += `\n\n**Vision description** (auto-generated by ${described.model} in ${described.latencyMs}ms — quote or paraphrase this when reporting what the robot sees):\n${described.description.trim()}`;
            } else {
              summary +=
                "\n\n_(Vision description was requested but the describer endpoint did not respond — the camera image was captured successfully; see the snapshot link above. Report this to the operator if the user needs a description.)_";
            }
          } catch {
            /* describeImageBestEffort never throws; this is just defense in depth */
          }
        }

        const content: Array<
          { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
        > = [{ type: "text", text: summary }];
        if (base64 && buf && decodedLen >= minDecodedBytes) {
          content.push({ type: "image", data: base64, mimeType });
        } else if (rawB64 && (!base64 || decodedLen < minDecodedBytes)) {
          content.push({
            type: "text",
            text:
              " (Image payload was missing, not valid base64 after normalization, or too small—check topic, message_type, or transport.)",
          });
        } else if (!rawB64) {
          content.push({
            type: "text",
            text: " (No image data received—topic may be idle or transport returned empty.)",
          });
        }

        return {
          content,
          details: { success: result.success, topic, width: result.width, height: result.height },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `ros2_camera_snapshot failed: ${msg}` }],
          details: { success: false, topic: rawTopic, error: msg },
        };
      }
    },
  });
}
