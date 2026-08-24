"""Explore / wander action server.

Picks poses from the occupancy grid (frontiers or random free cells) and
sends Nav2 NavigateToPose. Obstacle avoidance stays in Nav2.
"""

from __future__ import annotations

import math
import time
from typing import List, Optional, Tuple

import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateToPose
from nav_msgs.msg import OccupancyGrid
from rclpy.action import ActionClient, ActionServer, CancelResponse, GoalResponse
from rclpy.action.server import ServerGoalHandle
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.duration import Duration
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from tf2_ros import Buffer, TransformException, TransformListener

from agenticros_msgs.action import Explore

from .frontiers import (
    GridMeta,
    Pose2D,
    coverage_ratio,
    find_frontiers,
    free_cells,
    pick_frontier,
    pick_wander_pose,
)


def _yaw_to_quat(yaw: float) -> Tuple[float, float, float, float]:
    return (0.0, 0.0, math.sin(yaw / 2.0), math.cos(yaw / 2.0))


class ExploreNode(Node):
    def __init__(self) -> None:
        super().__init__("agenticros_explore")
        self._cb_group = ReentrantCallbackGroup()

        self.declare_parameter("map_topic", "map")
        self.declare_parameter("navigate_action", "navigate_to_pose")
        self.declare_parameter("map_frame", "map")
        self.declare_parameter("base_frame", "base_footprint")
        self.declare_parameter("base_frame_fallback", "base_link")
        self.declare_parameter("default_explore_timeout_s", 180.0)
        self.declare_parameter("default_wander_timeout_s", 60.0)
        self.declare_parameter("goal_timeout_s", 30.0)
        self.declare_parameter("min_frontier_m", 0.5)
        self.declare_parameter("wander_min_sep_m", 1.0)
        self.declare_parameter("map_wait_s", 15.0)

        self._map_topic = str(self.get_parameter("map_topic").value)
        self._navigate_action = str(self.get_parameter("navigate_action").value)
        self._map_frame = str(self.get_parameter("map_frame").value)
        self._base_frame = str(self.get_parameter("base_frame").value)
        self._base_frame_fallback = str(self.get_parameter("base_frame_fallback").value)

        self._map: Optional[OccupancyGrid] = None
        self._busy = False
        self._recent_goals: List[Tuple[float, float]] = []
        self._wander_rng = 0

        self._tf_buffer = Buffer()
        self._tf_listener = TransformListener(self._tf_buffer, self)

        self.create_subscription(
            OccupancyGrid, self._map_topic, self._on_map, 1, callback_group=self._cb_group
        )

        self._nav_client = ActionClient(
            self,
            NavigateToPose,
            self._navigate_action,
            callback_group=self._cb_group,
        )

        self._explore_server = ActionServer(
            self,
            Explore,
            "explore",
            execute_callback=lambda gh: self._execute(gh, forced_mode="explore"),
            goal_callback=self._goal_callback,
            cancel_callback=self._cancel_callback,
            callback_group=self._cb_group,
        )
        self._wander_server = ActionServer(
            self,
            Explore,
            "wander",
            execute_callback=lambda gh: self._execute(gh, forced_mode="wander"),
            goal_callback=self._goal_callback,
            cancel_callback=self._cancel_callback,
            callback_group=self._cb_group,
        )

        self.get_logger().info(
            f"Explore node ready: map={self._map_topic} nav={self._navigate_action} "
            "actions=[explore, wander]"
        )

    def _on_map(self, msg: OccupancyGrid) -> None:
        self._map = msg

    def _goal_callback(self, _goal_request: Explore.Goal) -> GoalResponse:
        if self._busy:
            self.get_logger().warn("Rejecting explore/wander goal: already running")
            return GoalResponse.REJECT
        return GoalResponse.ACCEPT

    def _cancel_callback(self, _goal_handle: ServerGoalHandle) -> CancelResponse:
        return CancelResponse.ACCEPT

    def _grid_meta(self, grid: OccupancyGrid) -> GridMeta:
        return GridMeta(
            width=int(grid.info.width),
            height=int(grid.info.height),
            resolution=float(grid.info.resolution),
            origin_x=float(grid.info.origin.position.x),
            origin_y=float(grid.info.origin.position.y),
        )

    def _robot_pose(self) -> Optional[Pose2D]:
        for frame in (self._base_frame, self._base_frame_fallback):
            try:
                tf = self._tf_buffer.lookup_transform(
                    self._map_frame,
                    frame,
                    rclpy.time.Time(),
                    timeout=Duration(seconds=0.5),
                )
                q = tf.transform.rotation
                yaw = math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z))
                return Pose2D(
                    x=float(tf.transform.translation.x),
                    y=float(tf.transform.translation.y),
                    yaw=yaw,
                )
            except TransformException:
                continue
        return None

    def _wait_for_map(self, timeout_s: float) -> bool:
        deadline = time.monotonic() + timeout_s
        while self._map is None and time.monotonic() < deadline:
            time.sleep(0.2)
        return self._map is not None

    def _next_pose(self, mode: str, goal: Explore.Goal, robot: Pose2D) -> Optional[Pose2D]:
        grid = self._map
        if grid is None:
            return None
        meta = self._grid_meta(grid)
        data = list(grid.data)
        min_frontier = float(goal.min_frontier_m) if goal.min_frontier_m > 0 else float(
            self.get_parameter("min_frontier_m").value
        )
        if mode == "wander":
            cells = free_cells(data, meta)
            self._wander_rng += 1
            min_sep = float(self.get_parameter("wander_min_sep_m").value)
            return pick_wander_pose(cells, robot, self._recent_goals, min_sep, self._wander_rng)
        frontiers = find_frontiers(data, meta, min_size_m=min_frontier)
        return pick_frontier(frontiers, robot, self._recent_goals)

    def _send_nav_goal(self, pose: Pose2D, timeout_s: float, goal_handle: ServerGoalHandle) -> bool:
        if not self._nav_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("Nav2 navigate_to_pose action server not available")
            return False
        nav_goal = NavigateToPose.Goal()
        stamped = PoseStamped()
        stamped.header.frame_id = self._map_frame
        stamped.header.stamp = self.get_clock().now().to_msg()
        stamped.pose.position.x = pose.x
        stamped.pose.position.y = pose.y
        qx, qy, qz, qw = _yaw_to_quat(pose.yaw)
        stamped.pose.orientation.x = qx
        stamped.pose.orientation.y = qy
        stamped.pose.orientation.z = qz
        stamped.pose.orientation.w = qw
        nav_goal.pose = stamped

        send_future = self._nav_client.send_goal_async(nav_goal)
        deadline = time.monotonic() + timeout_s
        while not send_future.done():
            if goal_handle.is_cancel_requested or time.monotonic() > deadline:
                return False
            time.sleep(0.05)
        nav_handle = send_future.result()
        if nav_handle is None or not nav_handle.accepted:
            return False

        result_future = nav_handle.get_result_async()
        while not result_future.done():
            if goal_handle.is_cancel_requested:
                nav_handle.cancel_goal_async()
                return False
            if time.monotonic() > deadline:
                nav_handle.cancel_goal_async()
                return False
            time.sleep(0.05)
        result = result_future.result()
        # status 4 = STATUS_SUCCEEDED in action_msgs/GoalStatus
        status = getattr(result, "status", 0)
        return status == 4

    def _execute(self, goal_handle: ServerGoalHandle, forced_mode: str) -> Explore.Result:
        self._busy = True
        result = Explore.Result()
        try:
            return self._run(goal_handle, forced_mode, result)
        finally:
            self._busy = False
            self._recent_goals.clear()

    def _run(
        self,
        goal_handle: ServerGoalHandle,
        forced_mode: str,
        result: Explore.Result,
    ) -> Explore.Result:
        goal: Explore.Goal = goal_handle.request
        mode = (goal.mode or "").strip().lower() or forced_mode
        if mode not in ("explore", "wander"):
            mode = forced_mode

        default_timeout = float(
            self.get_parameter(
                "default_explore_timeout_s" if mode == "explore" else "default_wander_timeout_s"
            ).value
        )
        timeout_s = float(goal.timeout_s) if goal.timeout_s > 0 else default_timeout
        max_goals = int(goal.max_goals) if goal.max_goals > 0 else 10_000
        goal_timeout = float(self.get_parameter("goal_timeout_s").value)
        map_wait = float(self.get_parameter("map_wait_s").value)

        started = time.monotonic()
        goals_sent = 0
        last_coverage = 0.0

        if not self._wait_for_map(map_wait):
            result.success = False
            result.message = f"Timed out waiting for {self._map_topic}"
            result.coverage_ratio = 0.0
            result.goals_sent = 0
            goal_handle.abort()
            return result

        consecutive_fail = 0
        while True:
            elapsed = time.monotonic() - started
            if goal_handle.is_cancel_requested:
                result.success = False
                result.message = "cancelled"
                result.coverage_ratio = last_coverage
                result.goals_sent = goals_sent
                goal_handle.canceled()
                return result
            if elapsed >= timeout_s:
                result.success = True
                result.message = "timeout"
                result.coverage_ratio = last_coverage
                result.goals_sent = goals_sent
                goal_handle.succeed()
                return result
            if goals_sent >= max_goals:
                result.success = True
                result.message = "max_goals"
                result.coverage_ratio = last_coverage
                result.goals_sent = goals_sent
                goal_handle.succeed()
                return result

            grid = self._map
            if grid is not None:
                last_coverage = coverage_ratio(list(grid.data))

            robot = self._robot_pose()
            if robot is None:
                consecutive_fail += 1
                if consecutive_fail >= 5:
                    result.success = False
                    result.message = f"no TF {self._map_frame} → {self._base_frame}"
                    result.coverage_ratio = last_coverage
                    result.goals_sent = goals_sent
                    goal_handle.abort()
                    return result
                time.sleep(0.3)
                continue

            pose = self._next_pose(mode, goal, robot)
            feedback = Explore.Feedback()
            feedback.coverage_ratio = last_coverage
            feedback.goals_sent = goals_sent
            feedback.elapsed_s = elapsed

            if pose is None:
                feedback.state = "complete"
                goal_handle.publish_feedback(feedback)
                if mode == "explore":
                    result.success = True
                    result.message = "no_frontiers"
                    result.coverage_ratio = last_coverage
                    result.goals_sent = goals_sent
                    goal_handle.succeed()
                    return result
                time.sleep(0.5)
                continue

            feedback.state = f"{mode} → ({pose.x:.2f}, {pose.y:.2f})"
            goal_handle.publish_feedback(feedback)
            self.get_logger().info(feedback.state)

            ok = self._send_nav_goal(pose, goal_timeout, goal_handle)
            goals_sent += 1
            self._recent_goals.append((pose.x, pose.y))
            if len(self._recent_goals) > 8:
                self._recent_goals.pop(0)
            if goal_handle.is_cancel_requested:
                result.success = False
                result.message = "cancelled"
                result.coverage_ratio = last_coverage
                result.goals_sent = goals_sent
                goal_handle.canceled()
                return result
            if ok:
                consecutive_fail = 0
            else:
                consecutive_fail += 1
                if consecutive_fail >= 6:
                    result.success = False
                    result.message = "nav2_failed"
                    result.coverage_ratio = last_coverage
                    result.goals_sent = goals_sent
                    goal_handle.abort()
                    return result


def main(args=None) -> None:
    rclpy.init(args=args)
    node = ExploreNode()
    executor = MultiThreadedExecutor()
    executor.add_node(node)
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
