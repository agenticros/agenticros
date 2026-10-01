/**
 * Named room maps. Each map is an RTAB-Map database on the robot
 * (`~/.agenticros/maps/<id>.db`) plus a row in `index.json`.
 * ARC stores the public catalog (id, label, active); the database stays local.
 */

import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { forgetPlacesForMap } from "./places.js";

export interface RobotMap {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  /** Absolute path to the RTAB-Map database. Not sent to ARC. */
  databasePath: string;
}

export interface MapCatalog {
  version: 1;
  activeId: string | null;
  maps: RobotMap[];
}

export interface PublicRobotMap {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface PublicMapCatalog {
  activeId: string | null;
  maps: PublicRobotMap[];
}

/** 1–40 chars: letters, numbers, spaces, period, underscore, hyphen. */
export const MAP_LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/;

export const MAP_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORE_VERSION = 1 as const;

export interface MapStorePaths {
  catalogPath?: string;
  mapsDir?: string;
  /** Override `~/.ros/rtabmap.db` (tests). */
  legacyDatabasePath?: string;
  /** Override `~/.agenticros/places.json` when deleting a map (tests). */
  placesPath?: string;
}

export function defaultMapsDir(): string {
  return join(homedir(), ".agenticros", "maps");
}

export function defaultCatalogPath(): string {
  return join(defaultMapsDir(), "index.json");
}

export function normalizeMapLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

export function assertMapLabel(label: string): string {
  const normalized = normalizeMapLabel(label);
  if (!MAP_LABEL_RE.test(normalized)) {
    throw new Error(
      "Map label must be 1–40 characters: letters, numbers, spaces, . _ -",
    );
  }
  return normalized;
}

function emptyCatalog(): MapCatalog {
  return { version: STORE_VERSION, activeId: null, maps: [] };
}

function isRobotMap(value: unknown): value is RobotMap {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    MAP_ID_RE.test(v.id) &&
    typeof v.label === "string" &&
    typeof v.databasePath === "string" &&
    v.databasePath.length > 0
  );
}

export function loadCatalog(catalogPath = defaultCatalogPath()): MapCatalog {
  if (!existsSync(catalogPath)) return emptyCatalog();
  try {
    const raw = JSON.parse(readFileSync(catalogPath, "utf8")) as Partial<MapCatalog>;
    if (!raw || raw.version !== 1 || !Array.isArray(raw.maps)) return emptyCatalog();
    const maps = raw.maps.filter(isRobotMap);
    const activeId =
      typeof raw.activeId === "string" && maps.some((m) => m.id === raw.activeId)
        ? raw.activeId
        : (maps[0]?.id ?? null);
    return { version: STORE_VERSION, activeId, maps };
  } catch {
    return emptyCatalog();
  }
}

export function saveCatalog(catalog: MapCatalog, catalogPath = defaultCatalogPath()): void {
  mkdirSync(dirname(catalogPath), { recursive: true });
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

export function toPublicCatalog(catalog: MapCatalog): PublicMapCatalog {
  return {
    activeId: catalog.activeId,
    maps: catalog.maps.map((m) => ({
      id: m.id,
      label: m.label,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      active: m.id === catalog.activeId,
    })),
  };
}

export function findMap(catalog: MapCatalog, idOrLabel: string): RobotMap | undefined {
  const query = idOrLabel.trim();
  if (!query) return undefined;
  return (
    catalog.maps.find((m) => m.id === query) ??
    catalog.maps.find((m) => m.label.toLowerCase() === query.toLowerCase())
  );
}

function assertUniqueLabel(catalog: MapCatalog, label: string, exceptId?: string): void {
  const key = label.toLowerCase();
  const clash = catalog.maps.find(
    (m) => m.id !== exceptId && m.label.toLowerCase() === key,
  );
  if (clash) {
    throw new Error(`A map named "${label}" already exists.`);
  }
}

function legacyDatabasePath(override?: string): string {
  return override ?? join(homedir(), ".ros", "rtabmap.db");
}

/** Move a pre-catalog `~/.ros/rtabmap.db` onto the first room map. */
function adoptLegacyDatabase(dest: string, legacy: string): void {
  if (existsSync(dest)) return;
  if (!existsSync(legacy)) return;
  mkdirSync(dirname(dest), { recursive: true });
  try {
    renameSync(legacy, dest);
  } catch {
    copyFileSync(legacy, dest);
    unlinkSync(legacy);
  }
}

function paths(opts?: MapStorePaths): { catalogPath: string; mapsDir: string } {
  return {
    catalogPath: opts?.catalogPath ?? defaultCatalogPath(),
    mapsDir: opts?.mapsDir ?? defaultMapsDir(),
  };
}

export function createMap(label: string, opts?: MapStorePaths): RobotMap {
  const { catalogPath, mapsDir } = paths(opts);
  const catalog = loadCatalog(catalogPath);
  const normalized = assertMapLabel(label);
  assertUniqueLabel(catalog, normalized);
  const now = new Date().toISOString();
  const id = randomUUID();
  const map: RobotMap = {
    id,
    label: normalized,
    createdAt: now,
    updatedAt: now,
    databasePath: join(mapsDir, `${id}.db`),
  };
  if (catalog.maps.length === 0) {
    adoptLegacyDatabase(map.databasePath, legacyDatabasePath(opts?.legacyDatabasePath));
  }
  catalog.maps.push(map);
  catalog.activeId = id;
  saveCatalog(catalog, catalogPath);
  return map;
}

export function renameMap(idOrLabel: string, label: string, opts?: MapStorePaths): RobotMap {
  const { catalogPath } = paths(opts);
  const catalog = loadCatalog(catalogPath);
  const map = findMap(catalog, idOrLabel);
  if (!map) throw new Error(`No map named "${idOrLabel}".`);
  const normalized = assertMapLabel(label);
  assertUniqueLabel(catalog, normalized, map.id);
  map.label = normalized;
  map.updatedAt = new Date().toISOString();
  saveCatalog(catalog, catalogPath);
  return map;
}

export function setActiveMap(idOrLabel: string, opts?: MapStorePaths): RobotMap {
  const { catalogPath } = paths(opts);
  const catalog = loadCatalog(catalogPath);
  const map = findMap(catalog, idOrLabel);
  if (!map) throw new Error(`No map named "${idOrLabel}".`);
  catalog.activeId = map.id;
  map.updatedAt = new Date().toISOString();
  saveCatalog(catalog, catalogPath);
  return map;
}

export function activeMap(opts?: MapStorePaths): RobotMap | undefined {
  const catalog = loadCatalog(paths(opts).catalogPath);
  if (!catalog.activeId) return catalog.maps[0];
  return catalog.maps.find((m) => m.id === catalog.activeId) ?? catalog.maps[0];
}

/** Create a "Room" map when the catalog is empty, and return the active map. */
export function ensureActiveMap(opts?: MapStorePaths & { label?: string }): RobotMap {
  const { catalogPath } = paths(opts);
  const catalog = loadCatalog(catalogPath);
  if (catalog.maps.length === 0) {
    return createMap(opts?.label ?? "Room", opts);
  }
  if (!catalog.activeId || !catalog.maps.some((m) => m.id === catalog.activeId)) {
    catalog.activeId = catalog.maps[0]!.id;
    saveCatalog(catalog, catalogPath);
  }
  return catalog.maps.find((m) => m.id === catalog.activeId) ?? catalog.maps[0]!;
}

function removeDatabase(databasePath: string): void {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${databasePath}${suffix}`;
    if (!existsSync(file)) continue;
    unlinkSync(file);
  }
}

export function deleteMap(idOrLabel: string, opts?: MapStorePaths): PublicMapCatalog {
  const { catalogPath } = paths(opts);
  const catalog = loadCatalog(catalogPath);
  const map = findMap(catalog, idOrLabel);
  if (!map) throw new Error(`No map named "${idOrLabel}".`);
  removeDatabase(map.databasePath);
  catalog.maps = catalog.maps.filter((m) => m.id !== map.id);
  if (catalog.activeId === map.id) {
    catalog.activeId = catalog.maps[0]?.id ?? null;
  }
  saveCatalog(catalog, catalogPath);
  forgetPlacesForMap(map.id, opts?.placesPath);
  return toPublicCatalog(loadCatalog(catalogPath));
}

export function publicCatalog(opts?: MapStorePaths): PublicMapCatalog {
  return toPublicCatalog(loadCatalog(paths(opts).catalogPath));
}
