"""
Gazebo + TurtleBot3 for **Mode A (local DDS)**.

Runs the standard TurtleBot3 world so topics (`/cmd_vel`, `/scan`, etc.) are on the
local ROS 2 domain. Use with AgenticROS **transport: local** and the same
**ROS_DOMAIN_ID** as set here (default `0`). No rosbridge required if OpenClaw runs
on this machine with LocalTransport.
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "ros_domain_id",
                default_value="0",
                description="ROS_DOMAIN_ID; must match AgenticROS local transport domainId",
            ),
            SetEnvironmentVariable(
                name="ROS_DOMAIN_ID",
                value=LaunchConfiguration("ros_domain_id"),
            ),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(
                    PathJoinSubstitution(
                        [
                            FindPackageShare("agenticros_bringup"),
                            "launch",
                            "gazebo_turtlebot3.launch.py",
                        ]
                    )
                ),
            ),
        ]
    )
