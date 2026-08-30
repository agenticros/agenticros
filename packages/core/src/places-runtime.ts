/**
 * Runtime helpers for named-place tools (pose snapshot + Nav2 dispatch).
 */

import type { AgenticROSConfig } from "./config.js";
import { listCapabilitiesForRobot, type Capability } from "./capabilities.js";
import { executeExternalCapability } from "./external-capability.js";
import { getPlace, poseFromLocalizationMessage, savePlace, type SavedPlace } from "./places.js";
import { resolveSafetyForRobot } from "./safety.js";
import { toNamespacedTopicFull } from "./topic-utils.js";
import type { RosTransport } from "./transport/transport.js";
import type { ResolvedRobot } from "./robots.js";

const POSE_CANDIDATES = [
  { topic: "/amcl_pose", type: "geometry_msgs/msg/PoseWithCovarianceStamped" },
  { topic: "/pose", type: "geometry_msgs/msg/PoseWithCovarianceStamped" },
];

export async function readCurrentMapPose(
  transport: RosTransport,
  namespace = "",
  timeoutMs = 2500,
): Promise<{ x: number; y: number; yaw: number } | undefined> {
  for (const cand of POSE_CANDIDATES) {
    const topic = toNamespacedTopicFull(namespace, cand.topic);
    const pose = await new Promise<{ x: number; y: number; yaw: number } | undefined>((resolve) => {
      const timer = setTimeout(() => {
        try {
          sub.unsubscribe();
        } catch {
          /* ignore */
        }
        resolve(undefined);
      }, timeoutMs);
      const sub = transport.subscribe({ topic, type: cand.type }, (msg) => {
        clearTimeout(timer);
        try {
          sub.unsubscribe();
        } catch {
          /* ignore */
        }
        resolve(poseFromLocalizationMessage(msg));
      });
    });
    if (pose) return pose;
  }
  return undefined;
}

export async function savePlaceFromArgs(
  args: Record<string, unknown>,
  opts: { robot: ResolvedRobot; transport?: RosTransport },
): Promise<SavedPlace> {
  const name = String(args["name"] ?? "").trim();
  if (!name) throw new Error("ros2_save_place requires 'name'.");
  let x = typeof args["x"] === "number" ? args["x"] : Number.NaN;
  let y = typeof args["y"] === "number" ? args["y"] : Number.NaN;
  let yaw = typeof args["yaw"] === "number" ? args["yaw"] : 0;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    if (!opts.transport) {
      throw new Error("Pass x and y, or connect to ROS so the current localization pose can be read.");
    }
    const pose = await readCurrentMapPose(opts.transport, opts.robot.namespace);
    if (!pose) {
      throw new Error(
        "Could not read /amcl_pose (or /pose). Pass x and y, or localize first (AMCL / RTAB-Map).",
      );
    }
    x = pose.x;
    y = pose.y;
    yaw = Number.isFinite(args["yaw"] as number) ? (args["yaw"] as number) : pose.yaw;
  }
  return savePlace({
    name,
    x,
    y,
    yaw,
    frame: typeof args["frame"] === "string" ? args["frame"] : "map",
    robot_id: opts.robot.id,
  });
}

export function findNavigateToCapability(config: AgenticROSConfig, robotId?: string): Capability | undefined {
  return listCapabilitiesForRobot(config, robotId).find((c) => c.id === "navigate_to");
}

export async function executeNavigateToPlace(
  config: AgenticROSConfig,
  robot: ResolvedRobot,
  name: string,
  transport: RosTransport,
  signal?: AbortSignal,
): Promise<{ text: string; isError?: boolean; place?: SavedPlace }> {
  const place = getPlace(name);
  if (!place) {
    return {
      text: `Unknown place "${name}". Use ros2_list_places or ros2_save_place first.`,
      isError: true,
    };
  }
  const cap = findNavigateToCapability(config, robot.id);
  if (!cap || cap.implementation?.kind !== "external_ros_node") {
    return {
      text:
        "navigate_to is not installed. Run `agenticros skills install --bundle mapping` " +
        "(or `agenticros skills install @agenticros/navigate-to`) and restart the agent.",
      isError: true,
    };
  }
  const result = await executeExternalCapability(
    cap,
    { x: place.x, y: place.y, yaw: place.yaw, frame_id: place.frame },
    transport,
    {
      namespace: robot.namespace,
      signal,
      workspaceCheck: resolveSafetyForRobot(config, robot),
    },
  );
  return { ...result, place };
}
