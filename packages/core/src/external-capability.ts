/**
 * External ROS-node capability executor — Phase 1 completion.
 *
 * Dispatches `implementation.kind: "external_ros_node"` capabilities via
 * the existing RosTransport action / service / topic APIs. The manifest
 * `launch` field is metadata only (operator-owned bringup) — the gateway
 * never shells out to `ros2 launch` in v1.
 */

import type { Capability, CapabilityImplementation } from "./capabilities.js";
import type { RosTransport } from "./transport/transport.js";
import { toNamespacedTopic } from "./topic-utils.js";

export interface ExecuteExternalOptions {
  /** Robot namespace for topic/action/service prefixing. */
  namespace?: string;
  /** Optional timeout for subscribe_once (ms). */
  timeoutMs?: number;
  /**
   * When aborted mid-action, call `transport.cancelActionGoal` (best-effort).
   * Subscribe waits also reject early on abort.
   */
  signal?: AbortSignal;
}

export interface ExecuteExternalResult {
  text: string;
  outputs?: Record<string, unknown>;
  isError?: boolean;
}

function isExternalImpl(
  impl: CapabilityImplementation | undefined,
): impl is Extract<CapabilityImplementation, { kind: "external_ros_node" }> {
  return impl?.kind === "external_ros_node";
}

function resolveName(name: string, namespace?: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (!namespace?.trim()) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return toNamespacedTopic(namespace, trimmed);
}

/**
 * Map navigate_to-style inputs into a Nav2 NavigateToPose goal when the
 * action type looks like NavigateToPose and inputs have x/y.
 */
export function buildExternalGoal(
  impl: Extract<CapabilityImplementation, { kind: "external_ros_node" }>,
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  // Explicit goal / request / message wins.
  if (inputs.goal && typeof inputs.goal === "object") {
    return inputs.goal as Record<string, unknown>;
  }
  if (inputs.request && typeof inputs.request === "object") {
    return inputs.request as Record<string, unknown>;
  }
  if (inputs.message && typeof inputs.message === "object") {
    return inputs.message as Record<string, unknown>;
  }

  const msgType = (impl.msg_type ?? "").toLowerCase();
  if (msgType.includes("navigatetopose") || impl.action?.includes("navigate_to_pose")) {
    const x = Number(inputs.x ?? 0) || 0;
    const y = Number(inputs.y ?? 0) || 0;
    const yaw = Number(inputs.yaw ?? 0) || 0;
    const qz = Math.sin(yaw / 2);
    const qw = Math.cos(yaw / 2);
    const frame = typeof inputs.frame_id === "string" ? inputs.frame_id : "map";
    return {
      pose: {
        header: { frame_id: frame },
        pose: {
          position: { x, y, z: 0 },
          orientation: { x: 0, y: 0, z: qz, w: qw },
        },
      },
    };
  }

  // Passthrough remaining inputs (minus robot_id).
  const { robot_id: _rid, ...rest } = inputs;
  return rest;
}

/**
 * Execute an external_ros_node capability against a connected transport.
 */
export async function executeExternalCapability(
  capability: Capability,
  inputs: Record<string, unknown>,
  transport: RosTransport,
  options: ExecuteExternalOptions = {},
): Promise<ExecuteExternalResult> {
  const impl = capability.implementation;
  if (!isExternalImpl(impl)) {
    return {
      text: `Capability "${capability.id}" is not an external_ros_node implementation.`,
      isError: true,
    };
  }

  const ns = options.namespace;
  const signal = options.signal;

  try {
    if (impl.action) {
      const action = resolveName(impl.action, ns);
      const actionType = impl.msg_type ?? "";
      if (!actionType) {
        return {
          text: `Capability "${capability.id}" external action requires implementation.msg_type.`,
          isError: true,
        };
      }
      const args = buildExternalGoal(impl, inputs);
      const goalPromise = transport.sendActionGoal({
        action,
        actionType,
        args,
      });
      let onAbort: (() => void) | undefined;
      const abortPromise = signal
        ? new Promise<never>((_, reject) => {
            const fail = () => {
              void transport.cancelActionGoal(action).catch(() => {});
              reject(new Error("Action cancelled"));
            };
            if (signal.aborted) {
              fail();
              return;
            }
            onAbort = fail;
            signal.addEventListener("abort", fail, { once: true });
          })
        : null;
      try {
        const result = abortPromise
          ? await Promise.race([goalPromise, abortPromise])
          : await goalPromise;
        const outputs = {
          success: result.result,
          ...(result.values ?? {}),
          launch_hint: impl.launch ?? null,
          package_hint: impl.package ?? null,
        };
        return {
          text: JSON.stringify(outputs),
          outputs,
          isError: !result.result,
        };
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener("abort", onAbort);
        }
      }
    }

    if (impl.service) {
      const service = resolveName(impl.service, ns);
      const serviceType = impl.msg_type ?? "";
      if (!serviceType) {
        return {
          text: `Capability "${capability.id}" external service requires implementation.msg_type.`,
          isError: true,
        };
      }
      const args = buildExternalGoal(impl, inputs);
      const result = await transport.callService({
        service,
        type: serviceType,
        args,
      });
      const outputs = {
        success: result.result,
        ...(result.values ?? {}),
        launch_hint: impl.launch ?? null,
      };
      return {
        text: JSON.stringify(outputs),
        outputs,
        isError: !result.result,
      };
    }

    if (impl.topic) {
      const topicName =
        typeof inputs.topic === "string" && inputs.topic.trim()
          ? inputs.topic.trim()
          : impl.topic;
      const topic = resolveName(topicName, ns);
      const msgType = impl.msg_type ?? "";
      // Detection / sensor skills default to subscribe_once; publishers must pass mode: "publish".
      const mode =
        typeof inputs.mode === "string"
          ? inputs.mode
          : "subscribe";
      if (mode === "subscribe" || mode === "subscribe_once") {
        const timeout =
          options.timeoutMs ??
          (typeof inputs.timeout_ms === "number"
            ? inputs.timeout_ms
            : typeof inputs.timeout === "number"
              ? inputs.timeout
              : 5000);
        const msg = await new Promise<Record<string, unknown>>((resolve, reject) => {
          let settled = false;
          let sub: { unsubscribe: () => void } | undefined;
          let onAbort: (() => void) | undefined;
          let timer: ReturnType<typeof setTimeout> | undefined;
          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            if (signal && onAbort) signal.removeEventListener("abort", onAbort);
            try {
              sub?.unsubscribe();
            } catch {
              /* ignore */
            }
            fn();
          };
          timer = setTimeout(() => {
            finish(() =>
              reject(new Error(`Timed out waiting for message on ${topic} after ${timeout}ms`)),
            );
          }, timeout);
          onAbort = () => {
            finish(() => reject(new Error("Subscribe cancelled")));
          };
          if (signal) {
            if (signal.aborted) {
              onAbort();
              return;
            }
            signal.addEventListener("abort", onAbort, { once: true });
          }
          sub = transport.subscribe(
            { topic, type: msgType || "std_msgs/msg/String" },
            (message) => {
              finish(() => resolve(message as Record<string, unknown>));
            },
          );
        });
        const outputs = { message: msg, topic };
        return { text: JSON.stringify(outputs), outputs };
      }
      if (!msgType) {
        return {
          text: `Capability "${capability.id}" external topic publish requires implementation.msg_type.`,
          isError: true,
        };
      }
      const message = buildExternalGoal(impl, inputs);
      await transport.publish({ topic, type: msgType, msg: message });
      const outputs = { published: true, topic, launch_hint: impl.launch ?? null };
      return { text: JSON.stringify(outputs), outputs };
    }

    return {
      text:
        `Capability "${capability.id}" external_ros_node has no action, service, or topic. ` +
        `Bringup hint: ${impl.launch ?? impl.package ?? "(none)"}.`,
      isError: true,
    };
  } catch (err) {
    return {
      text: err instanceof Error ? err.message : String(err),
      isError: true,
    };
  }
}
