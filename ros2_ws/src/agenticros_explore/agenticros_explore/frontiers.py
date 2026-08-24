"""Frontier and free-space helpers for agenticros_explore.

Occupancy grid convention (nav_msgs/OccupancyGrid):
  -1 unknown, 0..100 occupancy probability. We treat < 0 as unknown,
  >= occupied_threshold as occupied, else free.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

UNKNOWN = -1
OCCUPIED_THRESHOLD = 50


@dataclass(frozen=True)
class Pose2D:
    x: float
    y: float
    yaw: float = 0.0


@dataclass(frozen=True)
class GridMeta:
    width: int
    height: int
    resolution: float
    origin_x: float
    origin_y: float


def cell_index(mx: int, my: int, width: int) -> int:
    return my * width + mx


def in_bounds(mx: int, my: int, width: int, height: int) -> bool:
    return 0 <= mx < width and 0 <= my < height


def world_to_cell(x: float, y: float, meta: GridMeta) -> Tuple[int, int]:
    mx = int((x - meta.origin_x) / meta.resolution)
    my = int((y - meta.origin_y) / meta.resolution)
    return mx, my


def cell_to_world(mx: int, my: int, meta: GridMeta) -> Tuple[float, float]:
    x = meta.origin_x + (mx + 0.5) * meta.resolution
    y = meta.origin_y + (my + 0.5) * meta.resolution
    return x, y


def is_unknown(value: int) -> bool:
    return value < 0


def is_occupied(value: int, occupied_threshold: int = OCCUPIED_THRESHOLD) -> bool:
    return value >= occupied_threshold


def is_free(value: int, occupied_threshold: int = OCCUPIED_THRESHOLD) -> bool:
    return 0 <= value < occupied_threshold


def _neighbors4(mx: int, my: int) -> Iterable[Tuple[int, int]]:
    yield mx + 1, my
    yield mx - 1, my
    yield mx, my + 1
    yield mx, my - 1


def _neighbors8(mx: int, my: int) -> Iterable[Tuple[int, int]]:
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            yield mx + dx, my + dy


def coverage_ratio(data: Sequence[int]) -> float:
    """Known cells / (known + unknown). Occupied cells count as known."""
    if not data:
        return 0.0
    known = 0
    unknown = 0
    for v in data:
        if is_unknown(v):
            unknown += 1
        else:
            known += 1
    total = known + unknown
    if total == 0:
        return 0.0
    return known / total


def find_frontiers(
    data: Sequence[int],
    meta: GridMeta,
    min_size_m: float = 0.5,
) -> List[Pose2D]:
    """Return centroids of frontier clusters (free cells adjacent to unknown)."""
    width, height = meta.width, meta.height
    if width <= 0 or height <= 0 or len(data) < width * height:
        return []

    min_cells = max(1, int(min_size_m / max(meta.resolution, 1e-6)))
    visited = [False] * (width * height)
    frontiers: List[Pose2D] = []

    def is_frontier_cell(mx: int, my: int) -> bool:
        idx = cell_index(mx, my, width)
        if not is_free(data[idx]):
            return False
        for nx, ny in _neighbors4(mx, my):
            if not in_bounds(nx, ny, width, height):
                continue
            if is_unknown(data[cell_index(nx, ny, width)]):
                return True
        return False

    for my in range(height):
        for mx in range(width):
            idx = cell_index(mx, my, width)
            if visited[idx] or not is_frontier_cell(mx, my):
                continue
            cluster: List[Tuple[int, int]] = []
            stack = [(mx, my)]
            visited[idx] = True
            while stack:
                cx, cy = stack.pop()
                cluster.append((cx, cy))
                for nx, ny in _neighbors8(cx, cy):
                    if not in_bounds(nx, ny, width, height):
                        continue
                    nidx = cell_index(nx, ny, width)
                    if visited[nidx] or not is_frontier_cell(nx, ny):
                        continue
                    visited[nidx] = True
                    stack.append((nx, ny))
            if len(cluster) < min_cells:
                continue
            sx = sum(c[0] for c in cluster) / len(cluster)
            sy = sum(c[1] for c in cluster) / len(cluster)
            x, y = cell_to_world(int(round(sx)), int(round(sy)), meta)
            frontiers.append(Pose2D(x=x, y=y, yaw=0.0))

    return frontiers


def pick_frontier(
    frontiers: Sequence[Pose2D],
    robot: Pose2D,
    recent: Sequence[Tuple[float, float]],
    avoid_radius_m: float = 0.6,
) -> Optional[Pose2D]:
    """Nearest frontier that is not too close to a recently visited goal."""

    def too_recent(p: Pose2D) -> bool:
        for rx, ry in recent:
            if (p.x - rx) ** 2 + (p.y - ry) ** 2 < avoid_radius_m ** 2:
                return True
        return False

    scored: List[Tuple[float, Pose2D]] = []
    for f in frontiers:
        if too_recent(f):
            continue
        dist = ((f.x - robot.x) ** 2 + (f.y - robot.y) ** 2) ** 0.5
        yaw = _heading(robot.x, robot.y, f.x, f.y)
        scored.append((dist, Pose2D(x=f.x, y=f.y, yaw=yaw)))
    if not scored:
        return None
    scored.sort(key=lambda item: item[0])
    return scored[0][1]


def free_cells(
    data: Sequence[int],
    meta: GridMeta,
    inflate_cells: int = 2,
    *,
    treat_unknown_as_blocked: bool = True,
) -> List[Pose2D]:
    """Free cells not adjacent (within inflate_cells) to obstacles or map edge.

    For early SLAM maps, set ``treat_unknown_as_blocked=False`` (wander) so
    free cells next to unknown are still valid goals; otherwise almost every
    free cell is rejected while the map is still mostly unknown.
    """
    width, height = meta.width, meta.height
    if width <= 0 or height <= 0 or len(data) < width * height:
        return []
    out: List[Pose2D] = []
    for my in range(inflate_cells, height - inflate_cells):
        for mx in range(inflate_cells, width - inflate_cells):
            idx = cell_index(mx, my, width)
            if not is_free(data[idx]):
                continue
            blocked = False
            for nx in range(mx - inflate_cells, mx + inflate_cells + 1):
                for ny in range(my - inflate_cells, my + inflate_cells + 1):
                    nidx = cell_index(nx, ny, width)
                    if is_occupied(data[nidx]):
                        blocked = True
                        break
                    if treat_unknown_as_blocked and is_unknown(data[nidx]):
                        blocked = True
                        break
                if blocked:
                    break
            if blocked:
                continue
            x, y = cell_to_world(mx, my, meta)
            out.append(Pose2D(x=x, y=y))
    return out


def pick_wander_pose(
    cells: Sequence[Pose2D],
    robot: Pose2D,
    recent: Sequence[Tuple[float, float]],
    min_sep_m: float = 1.0,
    rng_index: int = 0,
) -> Optional[Pose2D]:
    """Pick a free cell at least min_sep_m from the robot, cycling via rng_index."""
    candidates: List[Pose2D] = []
    for c in cells:
        dist = ((c.x - robot.x) ** 2 + (c.y - robot.y) ** 2) ** 0.5
        if dist < min_sep_m:
            continue
        skip = False
        for rx, ry in recent:
            if (c.x - rx) ** 2 + (c.y - ry) ** 2 < (min_sep_m * 0.5) ** 2:
                skip = True
                break
        if skip:
            continue
        candidates.append(c)
    if not candidates:
        return None
    chosen = candidates[rng_index % len(candidates)]
    yaw = _heading(robot.x, robot.y, chosen.x, chosen.y)
    return Pose2D(x=chosen.x, y=chosen.y, yaw=yaw)


def _heading(x0: float, y0: float, x1: float, y1: float) -> float:
    import math

    return math.atan2(y1 - y0, x1 - x0)
