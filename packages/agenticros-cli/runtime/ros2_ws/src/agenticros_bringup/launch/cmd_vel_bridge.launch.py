"""Relay namespaced cmd_vel to the topic TurtleBot3 Gazebo uses (/cmd_vel).

Uses the **agenticros_bringup** `cmd_vel_relay` node (rclpy only—no topic_tools).

This launch does **not** start Gazebo or RViz—only the relay. Start simulation (and optional
RViz) in **another terminal** first, e.g.::

  ros2 launch agenticros_bringup mode_a_gazebo_rviz.launch.py robot_namespace:=YOUR_NS

Or use a single launch that includes sim + relay::

  ros2 launch agenticros_bringup mode_a_gazebo.launch.py robot_namespace:=YOUR_NS

Example (relay only, sim already running)::

  ros2 launch agenticros_bringup cmd_vel_bridge.launch.py \\
    src_cmd_vel:=/robot3946b404c33e4aa39a8d16deb1c5c593/cmd_vel
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, LogInfo
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription(
        [
            LogInfo(
                msg=(
                    "cmd_vel_bridge: starting relay only (no Gazebo/RViz). "
                    "Use mode_a_gazebo.launch.py, turtlebot3_gazebo_rviz.launch.py, "
                    "or run this after sim is up in another terminal."
                )
            ),
            DeclareLaunchArgument(
                "src_cmd_vel",
                description="Incoming topic (from AgenticROS), e.g. /robot.../cmd_vel",
            ),
            DeclareLaunchArgument(
                "dst_cmd_vel",
                default_value="/cmd_vel",
                description="Topic the simulator / base listens on (TurtleBot3 Gazebo: /cmd_vel)",
            ),
            Node(
                package="agenticros_bringup",
                executable="cmd_vel_relay",
                name="agenticros_cmd_vel_bridge",
                output="screen",
                parameters=[
                    {
                        "input_topic": LaunchConfiguration("src_cmd_vel"),
                        "output_topic": LaunchConfiguration("dst_cmd_vel"),
                    },
                ],
            ),
        ]
    )
