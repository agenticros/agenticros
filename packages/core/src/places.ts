/**
 * Named map places — lightweight local store for "save this as kitchen"
 * / "go to the kitchen". Independent of config.memory so it works when
 * memory is off. Not full spatial memory (no embeddings / map graph).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface SavedPlace {
  name: string;
  x: number;
  y: number;
  yaw: number;
  frame: string;
  robot_id?: string;
  updated_at: string;
}

export interface PlacesStore {
  version: 1;
  places: SavedPlace[];
}

const STORE_VERSION = 1 as const;

export function defaultPlacesPath(): string {
  return join(homedir(), ".agenticros", "places.json");
}

function emptyStore(): PlacesStore {
  return { version: STORE_VERSION, places: [] };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function loadPlaces(path = defaultPlacesPath()): PlacesStore {
  if (!existsSync(path)) return emptyStore();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<PlacesStore>;
    if (!raw || raw.version !== 1 || !Array.isArray(raw.places)) return emptyStore();
    return { version: STORE_VERSION, places: raw.places.filter(isSavedPlace) };
  } catch {
    return emptyStore();
  }
}

function isSavedPlace(value: unknown): value is SavedPlace {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y)
  );
}

export function savePlaces(store: PlacesStore, path = defaultPlacesPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function listPlaces(path = defaultPlacesPath()): SavedPlace[] {
  return loadPlaces(path).places;
}

export function getPlace(name: string, path = defaultPlacesPath()): SavedPlace | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  return loadPlaces(path).places.find((p) => normalizeName(p.name) === key);
}

export function savePlace(
  place: {
    name: string;
    x: number;
    y: number;
    yaw?: number;
    frame?: string;
    robot_id?: string;
  },
  path = defaultPlacesPath(),
): SavedPlace {
  const name = place.name.trim();
  if (!name) throw new Error("save_place requires a non-empty name.");
  if (!Number.isFinite(place.x) || !Number.isFinite(place.y)) {
    throw new Error("save_place requires finite x and y.");
  }
  const record: SavedPlace = {
    name,
    x: place.x,
    y: place.y,
    yaw: Number.isFinite(place.yaw) ? (place.yaw as number) : 0,
    frame: (place.frame ?? "map").trim() || "map",
    ...(place.robot_id ? { robot_id: place.robot_id } : {}),
    updated_at: new Date().toISOString(),
  };
  const store = loadPlaces(path);
  const key = normalizeName(name);
  store.places = store.places.filter((p) => normalizeName(p.name) !== key);
  store.places.push(record);
  savePlaces(store, path);
  return record;
}

export function forgetPlace(name: string, path = defaultPlacesPath()): boolean {
  const store = loadPlaces(path);
  const key = normalizeName(name);
  const next = store.places.filter((p) => normalizeName(p.name) !== key);
  if (next.length === store.places.length) return false;
  store.places = next;
  savePlaces(store, path);
  return true;
}

/** Extract x/y/yaw from PoseWithCovarianceStamped, PoseStamped, or Pose. */
export function poseFromLocalizationMessage(msg: unknown): { x: number; y: number; yaw: number } | undefined {
  if (!msg || typeof msg !== "object") return undefined;
  const rec = msg as Record<string, unknown>;
  const poseWrapper = (rec.pose ?? rec) as Record<string, unknown>;
  const inner =
    poseWrapper && typeof poseWrapper.pose === "object"
      ? (poseWrapper.pose as Record<string, unknown>)
      : poseWrapper;
  const position = inner?.position as Record<string, unknown> | undefined;
  const orientation = inner?.orientation as Record<string, unknown> | undefined;
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    return undefined;
  }
  const x = position.x;
  const y = position.y;
  let yaw = 0;
  if (orientation && typeof orientation.z === "number" && typeof orientation.w === "number") {
    yaw = Math.atan2(2 * orientation.w * orientation.z, 1 - 2 * orientation.z * orientation.z);
  }
  return { x, y, yaw };
}
