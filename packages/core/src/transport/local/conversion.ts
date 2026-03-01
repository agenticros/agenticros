/**
 * Message conversion between plain JS objects and rclnodejs typed messages.
 *
 * The RosTransport interface works with `Record<string, unknown>`, but
 * rclnodejs works with typed message class instances. This module bridges
 * the two — analogous to rosbridge_library's `dict_to_msg` / `msg_to_dict`.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Cached message classes keyed by normalized type string. */
const typeCache = new Map<string, any>();

/**
 * Resolve the rclnodejs module. Uses createRequire because rclnodejs is CJS.
 * Returns `any` — rclnodejs is an optional dependency and types may not be present.
 */
function getRclnodejs(): any {
  return require("rclnodejs");
}

/**
 * Normalize a ROS2 type string to the format rclnodejs expects.
 * Accepts: "geometry_msgs/msg/Twist", "geometry_msgs/Twist", etc.
 */
function normalizeType(typeStr: string): string {
  const parts = typeStr.split("/");
  // Already fully qualified: "pkg/msg/Type" or "pkg/srv/Type" or "pkg/action/Type"
  if (parts.length === 3) return typeStr;
  // Short form: "pkg/Type" → assume msg
  if (parts.length === 2) return `${parts[0]}/msg/${parts[1]}`;
  return typeStr;
}

/**
 * Load a ROS2 message/service/action class via rclnodejs, with caching.
 */
export function loadMessageClass(typeStr: string): any {
  const normalized = normalizeType(typeStr);
  const cached = typeCache.get(normalized);
  if (cached) return cached;

  const rclnodejs = getRclnodejs();
  const cls = rclnodejs.require(normalized);
  typeCache.set(normalized, cls);
  return cls;
}

/**
 * Convert a plain JS object to an rclnodejs message instance.
 *
 * Recursively assigns fields from `obj` onto a new message instance,
 * handling nested sub-messages (e.g. Twist.linear is a Vector3).
 */
export function toRosMessage(typeStr: string, obj: Record<string, unknown>): any {
  const MessageClass = loadMessageClass(typeStr);
  const msg = new MessageClass();
  assignFields(msg, obj);
  return msg;
}

/**
 * Recursively assign plain-object fields onto an rclnodejs message instance.
 */
function assignFields(target: any, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      // Nested sub-message — the target field should already be initialized
      // by rclnodejs with default values. Recurse into it.
      if (target[key] !== undefined && target[key] !== null && typeof target[key] === "object") {
        assignFields(target[key], value as Record<string, unknown>);
      } else {
        target[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Array field — could be primitives or nested messages.
      // For nested message arrays, each element needs recursive assignment
      // if the target has typed array elements. For now, assign directly —
      // rclnodejs handles primitive arrays and typed arrays via setter coercion.
      target[key] = value;
    } else {
      target[key] = value;
    }
  }
}

/**
 * Convert an rclnodejs message instance to a plain JS object.
 *
 * Uses `toPlainObject()` if available (rclnodejs >= 0.21), otherwise
 * falls back to manual recursive field extraction.
 */
export function fromRosMessage(msg: any): Record<string, unknown> {
  if (msg === null || msg === undefined) return {};

  // Preferred path: rclnodejs provides toPlainObject()
  if (typeof msg.toPlainObject === "function") {
    return msg.toPlainObject() as Record<string, unknown>;
  }

  // Fallback: manual extraction
  return extractFields(msg);
}

/**
 * Recursively extract fields from an rclnodejs message into a plain object.
 */
function extractFields(msg: any): Record<string, unknown> {
  if (msg === null || msg === undefined) return {};
  if (typeof msg !== "object") return {};

  const result: Record<string, unknown> = {};

  // Get enumerable own properties
  const keys = Object.keys(msg);
  for (const key of keys) {
    // Skip internal/private properties
    if (key.startsWith("_")) continue;

    const value = msg[key];
    if (typeof value === "function") continue;

    if (value === null || value === undefined) {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: any) =>
        typeof item === "object" && item !== null ? extractFields(item) : item,
      );
    } else if (typeof value === "object") {
      // Check if it looks like a typed message (has constructor beyond Object)
      if (value.constructor && value.constructor.name !== "Object") {
        result[key] = extractFields(value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Clear the type cache. Called during shutdown.
 */
export function clearTypeCache(): void {
  typeCache.clear();
}
