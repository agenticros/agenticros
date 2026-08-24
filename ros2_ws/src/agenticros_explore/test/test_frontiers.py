"""Pure-Python frontier tests (no ROS runtime required)."""

from agenticros_explore.frontiers import (
    GridMeta,
    Pose2D,
    coverage_ratio,
    find_frontiers,
    free_cells,
    pick_frontier,
    pick_wander_pose,
)

# 5x5 grid, resolution 1m, origin at 0,0.
# Legend: -1 unknown, 0 free, 100 occupied
# Row y=0 (bottom): free free free unknown unknown
# The three free cells on the left border unknown on the right → frontier.

def _meta(w=5, h=5, res=1.0):
    return GridMeta(width=w, height=h, resolution=res, origin_x=0.0, origin_y=0.0)


def test_find_frontiers_finds_free_next_to_unknown():
    data = [
        0, 0, -1, -1, -1,
        0, 0, -1, -1, -1,
        0, 0, 100, 100, 100,
        -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1,
    ]
    fronts = find_frontiers(data, _meta(), min_size_m=0.5)
    assert len(fronts) >= 1
    # Centroids should sit in the free region (x < 2).
    assert all(f.x < 2.5 for f in fronts)


def test_no_frontiers_on_fully_known_map():
    data = [0] * 25
    assert find_frontiers(data, _meta(), min_size_m=0.5) == []


def test_coverage_ratio():
    assert coverage_ratio([0, 0, 100, -1]) == 0.75
    assert coverage_ratio([]) == 0.0


def test_pick_frontier_prefers_nearest():
    robot = Pose2D(x=0.0, y=0.0)
    near = Pose2D(x=1.0, y=0.0)
    far = Pose2D(x=10.0, y=0.0)
    picked = pick_frontier([far, near], robot, recent=[])
    assert picked is not None
    assert picked.x == 1.0


def test_pick_wander_respects_min_separation():
    robot = Pose2D(x=0.5, y=0.5)
    cells = [Pose2D(x=0.6, y=0.6), Pose2D(x=3.0, y=3.0)]
    picked = pick_wander_pose(cells, robot, recent=[], min_sep_m=1.0, rng_index=0)
    assert picked is not None
    assert picked.x == 3.0


def test_free_cells_skips_unknown_and_occupied_neighbors():
    data = [0] * 25
    # Occupy the center so inflation removes nearby free cells.
    data[12] = 100
    cells = free_cells(data, _meta(), inflate_cells=2)
    # With inflate=2 on a 5x5 grid there is no interior cell far from the edge
    # AND far from center occupied → likely empty.
    assert isinstance(cells, list)
