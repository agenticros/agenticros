/**
 * Room-map catalog used by the ARC bridge.
 *
 * Same on-disk shape as `@agenticros/core` maps (`~/.agenticros/maps/index.json`).
 * `agenticros start mapping` from ARC has to create the Room and return the
 * public catalog in the bash response. Waiting for the CLI to finish the
 * RTAB-Map launch blows ARC's deadline, so the page stays at 0 maps and never
 * flips to "mapping".
 */

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const MAP_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROS_DISTROS = ["jazzy", "humble", "iron", "rolling"];

export function defaultCatalogPath(home = homedir()) {
  return join(home, ".agenticros", "maps", "index.json");
}

function emptyCatalog() {
  return { version: 1, activeId: null, maps: [] };
}

function isRobotMap(value) {
  if (!value || typeof value !== "object") return false;
  return (
    typeof value.id === "string" &&
    MAP_ID_RE.test(value.id) &&
    typeof value.label === "string" &&
    typeof value.databasePath === "string" &&
    value.databasePath.length > 0
  );
}

export function loadMapCatalog(catalogPath = defaultCatalogPath()) {
  if (!existsSync(catalogPath)) return emptyCatalog();
  try {
    const raw = JSON.parse(readFileSync(catalogPath, "utf8"));
    if (!raw || raw.version !== 1 || !Array.isArray(raw.maps)) return emptyCatalog();
    const maps = raw.maps.filter(isRobotMap);
    const activeId =
      typeof raw.activeId === "string" && maps.some((m) => m.id === raw.activeId)
        ? raw.activeId
        : (maps[0]?.id ?? null);
    return { version: 1, activeId, maps };
  } catch {
    return emptyCatalog();
  }
}

export function toPublicMapCatalog(catalog) {
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

function saveCatalog(catalog, catalogPath) {
  mkdirSync(dirname(catalogPath), { recursive: true });
  const tmp = `${catalogPath}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  renameSync(tmp, catalogPath);
}

/**
 * Create a "Room" map when the catalog is empty. Returns the public catalog
 * ARC stores, plus the active database path for the launch.
 */
export function ensureRoomCatalog(opts = {}) {
  const home = opts.home ?? homedir();
  const catalogPath = opts.catalogPath ?? defaultCatalogPath(home);
  const mapsDir = opts.mapsDir ?? join(home, ".agenticros", "maps");
  const catalog = loadMapCatalog(catalogPath);
  if (catalog.maps.length === 0) {
    const now = new Date().toISOString();
    const id = randomUUID();
    catalog.maps.push({
      id,
      label: opts.label ?? "Room",
      createdAt: now,
      updatedAt: now,
      databasePath: join(mapsDir, `${id}.db`),
    });
    catalog.activeId = id;
    saveCatalog(catalog, catalogPath);
  } else if (!catalog.activeId || !catalog.maps.some((m) => m.id === catalog.activeId)) {
    catalog.activeId = catalog.maps[0].id;
    saveCatalog(catalog, catalogPath);
  }
  const active = catalog.maps.find((m) => m.id === catalog.activeId) ?? catalog.maps[0];
  return {
    catalog: toPublicMapCatalog(catalog),
    databasePath: active.databasePath,
    label: active.label,
  };
}

/** Walk up from a file (comms.js) to `scripts/start_mapping.sh`. */
export function findStartMappingScript(fromFile) {
  let dir = dirname(fromFile);
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "scripts", "start_mapping.sh");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export function detectRosDistroName(root = "/opt/ros") {
  for (const distro of ROS_DISTROS) {
    if (existsSync(join(root, distro, "setup.bash"))) return distro;
  }
  return undefined;
}

/**
 * Start RTAB-Map + Nav2 without waiting. The script stops a previous stack
 * itself; this process must return so ARC can record the catalog.
 */
export function launchMappingStack(opts) {
  const spawnImpl = opts.spawnImpl ?? spawn;
  const logFile = opts.logFile ?? "/tmp/agenticros-mapping.log";
  const fd = openSync(logFile, "a");
  const namespace = (opts.namespace ?? "").trim().replace(/^\/+|\/+$/g, "");
  const child = spawnImpl("bash", [opts.script, opts.distro], {
    detached: true,
    stdio: ["ignore", fd, fd],
    env: {
      ...opts.env,
      AGENTICROS_MAP_DATABASE: opts.databasePath,
      AGENTICROS_KEEP_MAP: opts.keep ? "1" : "0",
      AGENTICROS_MAP_LOCALIZE: "0",
      ...(namespace ? { AGENTICROS_ROBOT_NAMESPACE: namespace } : {}),
    },
  });
  if (typeof child.unref === "function") child.unref();
  try {
    closeSync(fd);
  } catch {
    /* the child inherited the log fd */
  }
  return child.pid;
}
