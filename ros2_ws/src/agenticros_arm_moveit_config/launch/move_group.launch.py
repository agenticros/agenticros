"""Launch move_group for the AgenticROS sim arm.

Expects robot_description / joint_states / TF already on the graph
(from agenticros_sim/sim_arm.launch.py).
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import Command, LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description() -> LaunchDescription:
    moveit_share = get_package_share_directory("agenticros_arm_moveit_config")
    sim_share = get_package_share_directory("agenticros_sim")
    urdf = os.path.join(sim_share, "urdf", "agenticros_arm.urdf.xacro")
    srdf = os.path.join(moveit_share, "config", "agenticros_arm.srdf")
    kinematics = os.path.join(moveit_share, "config", "kinematics.yaml")
    joint_limits = os.path.join(moveit_share, "config", "joint_limits.yaml")
    ompl = os.path.join(moveit_share, "config", "ompl_planning.yaml")
    controllers = os.path.join(moveit_share, "config", "moveit_controllers.yaml")

    with open(srdf, "r", encoding="utf-8") as fh:
        srdf_xml = fh.read()

    robot_description = {
        "robot_description": ParameterValue(Command(["xacro ", urdf]), value_type=str),
    }
    robot_description_semantic = {"robot_description_semantic": srdf_xml}

    ompl_planning = {
        "planning_pipelines": ["ompl"],
        "ompl": {
            "planning_plugin": "ompl_interface/OMPLPlanner",
            "request_adapters": (
                "default_planner_request_adapters/AddTimeOptimalParameterization "
                "default_planner_request_adapters/FixWorkspaceBounds "
                "default_planner_request_adapters/FixStartStateBounds "
                "default_planner_request_adapters/FixStartStateCollision "
                "default_planner_request_adapters/FixStartStatePathConstraints"
            ),
            "start_state_max_bounds_error": 0.1,
        },
    }

    planning_scene_monitor = {
        "publish_planning_scene": True,
        "publish_geometry_updates": True,
        "publish_state_updates": True,
        "publish_transforms_updates": True,
    }

    return LaunchDescription(
        [
            DeclareLaunchArgument("use_sim_time", default_value="true"),
            Node(
                package="moveit_ros_move_group",
                executable="move_group",
                output="screen",
                parameters=[
                    robot_description,
                    robot_description_semantic,
                    kinematics,
                    joint_limits,
                    ompl,
                    ompl_planning,
                    controllers,
                    planning_scene_monitor,
                    {"use_sim_time": LaunchConfiguration("use_sim_time")},
                ],
            ),
        ]
    )
