"""Gazebo sim arm + MoveIt2 move_group + FollowJointTrajectory bridge.

Examples:
  ros2 launch agenticros_sim sim_arm_moveit.launch.py
  ros2 launch agenticros_sim sim_arm_moveit.launch.py gui:=false
  agenticros up sim-arm --moveit --headless
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    sim_share = get_package_share_directory("agenticros_sim")
    moveit_share = get_package_share_directory("agenticros_arm_moveit_config")
    sim_arm = os.path.join(sim_share, "launch", "sim_arm.launch.py")
    move_group = os.path.join(moveit_share, "launch", "move_group.launch.py")

    return LaunchDescription(
        [
            DeclareLaunchArgument("gui", default_value="true"),
            DeclareLaunchArgument("use_rviz", default_value="false"),
            DeclareLaunchArgument("use_sim_time", default_value="true"),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(sim_arm),
                launch_arguments={
                    "gui": LaunchConfiguration("gui"),
                    "use_rviz": LaunchConfiguration("use_rviz"),
                    "use_sim_time": LaunchConfiguration("use_sim_time"),
                }.items(),
            ),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(move_group),
                launch_arguments={
                    "use_sim_time": LaunchConfiguration("use_sim_time"),
                }.items(),
            ),
            Node(
                package="agenticros_sim",
                executable="arm_trajectory_bridge.py",
                name="arm_trajectory_bridge",
                output="screen",
                parameters=[{"use_sim_time": LaunchConfiguration("use_sim_time")}],
            ),
        ]
    )
