#!/usr/bin/env python3
"""FollowJointTrajectory → /arm/<joint>/cmd_pos (std_msgs/Float64).

MoveIt move_group talks FollowJointTrajectory. The Gazebo arm only
accepts per-joint position setpoints. This node is the MVP bridge —
not ros2_control.
"""

from __future__ import annotations

import time
from typing import Dict, List

import rclpy
from rclpy.action import ActionServer, CancelResponse, GoalResponse
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from control_msgs.action import FollowJointTrajectory
from sensor_msgs.msg import JointState
from std_msgs.msg import Float64
from trajectory_msgs.msg import JointTrajectoryPoint

JOINT_TOPICS = {
    "shoulder_pan_joint": "/arm/shoulder_pan/cmd_pos",
    "shoulder_lift_joint": "/arm/shoulder_lift/cmd_pos",
    "elbow_joint": "/arm/elbow/cmd_pos",
    "wrist_1_joint": "/arm/wrist_1/cmd_pos",
    "wrist_2_joint": "/arm/wrist_2/cmd_pos",
    "wrist_3_joint": "/arm/wrist_3/cmd_pos",
}


class ArmTrajectoryBridge(Node):
    def __init__(self) -> None:
        super().__init__("arm_trajectory_bridge")
        self._cb = ReentrantCallbackGroup()
        self._pubs = {
            name: self.create_publisher(Float64, topic, 10)
            for name, topic in JOINT_TOPICS.items()
        }
        self._positions: Dict[str, float] = {name: 0.0 for name in JOINT_TOPICS}
        self.create_subscription(
            JointState,
            "/joint_states",
            self._on_joint_state,
            10,
            callback_group=self._cb,
        )
        self._server = ActionServer(
            self,
            FollowJointTrajectory,
            "/arm_controller/follow_joint_trajectory",
            execute_callback=self._execute,
            goal_callback=self._goal,
            cancel_callback=self._cancel,
            callback_group=self._cb,
        )
        self.get_logger().info("arm_trajectory_bridge ready on /arm_controller/follow_joint_trajectory")

    def _on_joint_state(self, msg: JointState) -> None:
        for name, pos in zip(msg.name, msg.position):
            if name in self._positions:
                self._positions[name] = float(pos)

    def _goal(self, _goal_request: FollowJointTrajectory.Goal) -> GoalResponse:
        return GoalResponse.ACCEPT

    def _cancel(self, _goal_handle) -> CancelResponse:
        return CancelResponse.ACCEPT

    def _publish(self, names: List[str], positions: List[float]) -> None:
        for name, pos in zip(names, positions):
            pub = self._pubs.get(name)
            if pub is None:
                continue
            msg = Float64()
            msg.data = float(pos)
            pub.publish(msg)

    async def _execute(self, goal_handle):
        traj = goal_handle.request.trajectory
        names = list(traj.joint_names)
        points: List[JointTrajectoryPoint] = list(traj.points)
        result = FollowJointTrajectory.Result()
        if not points:
            goal_handle.succeed()
            result.error_code = FollowJointTrajectory.Result.SUCCESSFUL
            return result

        start = time.monotonic()
        last = {n: self._positions.get(n, 0.0) for n in names}
        for point in points:
            if goal_handle.is_cancel_requested:
                goal_handle.canceled()
                result.error_code = FollowJointTrajectory.Result.SUCCESSFUL
                return result
            target = list(point.positions)
            stamp = point.time_from_start.sec + point.time_from_start.nanosec * 1e-9
            while True:
                elapsed = time.monotonic() - start
                if elapsed >= stamp:
                    break
                time.sleep(0.02)
                if goal_handle.is_cancel_requested:
                    goal_handle.canceled()
                    result.error_code = FollowJointTrajectory.Result.SUCCESSFUL
                    return result
            self._publish(names, target)
            for n, p in zip(names, target):
                last[n] = p
            fb = FollowJointTrajectory.Feedback()
            fb.joint_names = names
            fb.desired = point
            fb.actual = JointTrajectoryPoint(positions=[last.get(n, 0.0) for n in names])
            goal_handle.publish_feedback(fb)

        time.sleep(0.1)
        goal_handle.succeed()
        result.error_code = FollowJointTrajectory.Result.SUCCESSFUL
        return result


def main() -> None:
    rclpy.init()
    node = ArmTrajectoryBridge()
    executor = MultiThreadedExecutor()
    executor.add_node(node)
    try:
        executor.spin()
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
