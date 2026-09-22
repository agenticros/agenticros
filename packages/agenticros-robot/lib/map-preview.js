/**
 * Occupancy-grid preview for ARC teleop.
 *
 * RTAB-Map publishes nav_msgs/OccupancyGrid on /map. The grid's cell (0,0)
 * sits at `origin` and Y increases with the row index. The preview image flips
 * Y so north is up, then a click in that image converts back to map meters.
 */

export const MAP_PREVIEW_MAX_EDGE = 320;

const COLOR_UNKNOWN = [96, 96, 96];
const COLOR_OCCUPIED = [20, 20, 20];
const COLOR_FREE = [240, 240, 240];

export function stripFrame(id) {
  return String(id || "").replace(/^\/+/, "");
}

export function yawFromQuat(q) {
  const x = Number(q?.x) || 0;
  const y = Number(q?.y) || 0;
  const z = Number(q?.z) || 0;
  const w = Number(q?.w) || 1;
  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  return Math.atan2(siny, cosy);
}

function num(value) {
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** @param {unknown} value occupancy cell; uint8 255 is unknown (-1). */
export function classifyOccupancy(value) {
  const v = num(value);
  if (v < 0 || v > 100) return "unknown";
  if (v >= 50) return "occupied";
  return "free";
}

export function isNavigable(value) {
  return classifyOccupancy(value) === "free";
}

/**
 * @param {object} msg nav_msgs/OccupancyGrid
 */
export function readOccupancy(msg) {
  const info = msg?.info || {};
  const originPose = info.origin || {};
  const pos = originPose.position || originPose;
  const data = msg?.data;
  return {
    width: num(info.width),
    height: num(info.height),
    resolution: num(info.resolution),
    origin: { x: num(pos.x), y: num(pos.y) },
    data,
  };
}

function cell(data, index) {
  if (data == null || typeof data.length !== "number") return -1;
  if (index < 0 || index >= data.length) return -1;
  return data[index];
}

/**
 * Downsample an occupancy grid into an RGBA image, north-up.
 * @returns {{ rgba: Buffer, width: number, height: number, scale: number, resolution: number, gridWidth: number, gridHeight: number, origin: {x:number,y:number} } | null}
 */
export function renderOccupancy(map, maxEdge = MAP_PREVIEW_MAX_EDGE) {
  const gridWidth = map?.width | 0;
  const gridHeight = map?.height | 0;
  const resolution = Number(map?.resolution);
  if (gridWidth < 1 || gridHeight < 1 || !(resolution > 0)) return null;
  const scale = Math.max(1, Math.ceil(Math.max(gridWidth, gridHeight) / maxEdge));
  const width = Math.ceil(gridWidth / scale);
  const height = Math.ceil(gridHeight / scale);
  const rgba = Buffer.alloc(width * height * 4);
  const data = map.data;

  for (let oy = 0; oy < height; oy++) {
    const srcY = gridHeight - 1 - Math.min(gridHeight - 1, oy * scale + (scale >> 1));
    for (let ox = 0; ox < width; ox++) {
      const srcX = Math.min(gridWidth - 1, ox * scale + (scale >> 1));
      const kind = classifyOccupancy(cell(data, srcY * gridWidth + srcX));
      let rgb = COLOR_FREE;
      if (kind === "unknown") rgb = COLOR_UNKNOWN;
      else if (kind === "occupied") rgb = COLOR_OCCUPIED;
      else if (kind !== "free") rgb = COLOR_UNKNOWN;
      const o = (oy * width + ox) * 4;
      rgba[o] = rgb[0];
      rgba[o + 1] = rgb[1];
      rgba[o + 2] = rgb[2];
      rgba[o + 3] = 255;
    }
  }

  return {
    rgba,
    width,
    height,
    scale,
    resolution,
    gridWidth,
    gridHeight,
    origin: map.origin || { x: 0, y: 0 },
  };
}

/**
 * Image pixel (origin top-left, Y down) → map meters.
 * `preview.resolution` is the original cell size, not the downsampled size.
 */
export function pixelToWorld(px, py, preview) {
  const scale = preview.scale || 1;
  const gx = (px + 0.5) * scale;
  const gy = preview.gridHeight - (py + 0.5) * scale;
  return {
    x: preview.origin.x + gx * preview.resolution,
    y: preview.origin.y + gy * preview.resolution,
  };
}

/** Map meters → image pixel (Y down). */
export function worldToPixel(x, y, preview) {
  const scale = preview.scale || 1;
  const gx = (x - preview.origin.x) / preview.resolution;
  const gy = (y - preview.origin.y) / preview.resolution;
  return {
    px: gx / scale - 0.5,
    py: (preview.gridHeight - gy) / scale - 0.5,
  };
}

/** Occupancy value at a map-frame point, or null if outside the grid. */
export function cellAt(map, x, y) {
  if (!map || !(map.resolution > 0)) return null;
  const gx = Math.floor((x - map.origin.x) / map.resolution);
  const gy = Math.floor((y - map.origin.y) / map.resolution);
  if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) return null;
  return cell(map.data, gy * map.width + gx);
}

/**
 * Record a tf2 TransformStamped list. Each child is stored as its pose in the parent.
 * @param {Map<string, {parent: string, x: number, y: number, yaw: number}>} edges
 */
export function rememberTransforms(edges, tfMessage) {
  const list = tfMessage?.transforms || [];
  for (const t of list) {
    const parent = stripFrame(t?.header?.frame_id);
    const child = stripFrame(t?.child_frame_id);
    if (!parent || !child || parent === child) continue;
    const tr = t.transform?.translation || {};
    const q = t.transform?.rotation || {};
    edges.set(child, {
      parent,
      x: num(tr.x),
      y: num(tr.y),
      yaw: yawFromQuat(q),
    });
  }
}

function apply2d(parent, child) {
  const c = Math.cos(parent.yaw);
  const s = Math.sin(parent.yaw);
  return {
    x: parent.x + c * child.x - s * child.y,
    y: parent.y + s * child.x + c * child.y,
    yaw: parent.yaw + child.yaw,
  };
}

/**
 * Pose of `frame` in `root` using the latest 2D TF edges (child → parent).
 * Returns null when the chain is incomplete.
 */
export function poseInFrame(edges, frame, root = "map") {
  const target = stripFrame(frame);
  const rootName = stripFrame(root);
  if (!target || target === rootName) return { x: 0, y: 0, yaw: 0 };
  const hops = [];
  let cur = target;
  const seen = new Set();
  while (cur && cur !== rootName) {
    if (seen.has(cur)) return null;
    seen.add(cur);
    const edge = edges.get(cur);
    if (!edge) return null;
    hops.push(edge);
    cur = edge.parent;
  }
  if (cur !== rootName) return null;
  let pose = { x: 0, y: 0, yaw: 0 };
  for (let i = hops.length - 1; i >= 0; i--) {
    pose = apply2d(pose, hops[i]);
  }
  return pose;
}

/** base_link, then base_footprint, in the map frame. */
export function robotPoseOnMap(edges) {
  return poseInFrame(edges, "base_link", "map") || poseInFrame(edges, "base_footprint", "map");
}
