"""Launch the agenticros_explore action servers (explore + wander)."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("map_topic", default_value="map"),
            DeclareLaunchArgument("navigate_action", default_value="navigate_to_pose"),
            DeclareLaunchArgument("map_frame", default_value="map"),
            DeclareLaunchArgument("base_frame", default_value="base_footprint"),
            DeclareLaunchArgument("use_sim_time", default_value="false"),
            Node(
                package="agenticros_explore",
                executable="explore_node",
                name="agenticros_explore",
                output="screen",
                parameters=[
                    {
                        "map_topic": LaunchConfiguration("map_topic"),
                        "navigate_action": LaunchConfiguration("navigate_action"),
                        "map_frame": LaunchConfiguration("map_frame"),
                        "base_frame": LaunchConfiguration("base_frame"),
                        "use_sim_time": LaunchConfiguration("use_sim_time"),
                    }
                ],
            ),
        ]
    )
