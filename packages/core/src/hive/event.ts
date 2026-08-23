import { HIVE_EVENT_SCHEMA, type HiveEvent, type HiveEventKind } from "./types.js";

export function makeHiveEvent(input: {
  robotId: string;
  kind: HiveEventKind;
  topic?: string;
  payload?: unknown;
  ts?: number;
}): HiveEvent {
  return {
    schema: HIVE_EVENT_SCHEMA,
    robot_id: input.robotId,
    kind: input.kind,
    topic: input.topic ?? "",
    payload: input.payload ?? {},
    ts: input.ts ?? Date.now(),
  };
}

export function isHiveEvent(value: unknown): value is HiveEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return o.schema === HIVE_EVENT_SCHEMA && typeof o.robot_id === "string" && typeof o.kind === "string";
}
